// Rota SASCAR — substitui Firebase Function `sascarPosicoes`.
// Puxa posições via SOAP e persiste no PostgreSQL (tabela documents.sascar_posicoes).
// Chama-se via POST /api/sascar/posicoes.
// Cronjob (src/cron.js) também chama automaticamente a cada 5 min.
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";
import { q, q1 } from "../db.js";
import { cached, getCache, setCache } from "../integracoes/cache.js";
import {
  obterVeiculos,
  obterPacotePosicoesMotorista,
  ultimaPorVeiculo,
} from "../integracoes/sascar/soap.js";
import { cercasContendoPonto } from "../integracoes/sascar/geofence.js";

const r = Router();

const USUARIO = process.env.SASCAR_USUARIO || "";
const SENHA   = process.env.SASCAR_SENHA   || "";

function statusFromPacote(p) {
  // Nomes compatíveis com Firebase Function original (frontend depende disso)
  if (!p) return "SEM_DADOS";
  const ig = Number(p.ignicao);
  const vel = Number(p.velocidade);
  if (ig === 1 && vel > 0) return "EM_MOVIMENTO";
  if (ig === 1)            return "PARADO_LIGADO";
  return "ESTACIONADO";
}

// Núcleo — consulta SASCAR + persiste no PG. Reutilizado pela rota HTTP e pelo cron.
export async function atualizarPosicoesSascar() {
  if (!USUARIO || !SENHA) {
    return { erro: "SASCAR_USUARIO/SENHA não configurados no .env do VPS", posicoes: [] };
  }

  // 1) Consome fila SASCAR (rate limit 1req/60s → sleep 65s)
  const pacotes = [];
  for (let i = 0; i < 4; i++) {
    try {
      const lote = await obterPacotePosicoesMotorista({ usuario: USUARIO, senha: SENHA, quantidade: 3000 });
      pacotes.push(...lote);
      if (lote.length < 3000) break;
      if (i < 3) await new Promise(r => setTimeout(r, 65_000));
    } catch (e) {
      console.warn(`[sascar] loop iter=${i} falhou: ${e?.message}`);
      break;
    }
  }
  console.log(`[sascar] consumidos ${pacotes.length} pacotes da fila SASCAR`);

  // 1.1) Macros — persiste todo pacote que veio com codigoMacro > 0.
  // Cada macro vira 1 doc em `documents.sascar_macros` com id único = idPacote.
  let macrosGravadas = 0;
  for (const p of pacotes) {
    if (!Number(p.codigoMacro) || Number(p.codigoMacro) <= 0) continue;
    const docId = String(p.idPacote);
    try {
      const r = await q1(
        `INSERT INTO documents (collection, id, data) VALUES ('sascar_macros', $1, $2)
         ON CONFLICT (collection, id) DO NOTHING RETURNING id`,
        [docId, JSON.stringify({
          idPacote:         p.idPacote,
          idVeiculo:        p.idVeiculo,
          codigoMacro:      p.codigoMacro,
          conteudoMensagem: p.conteudoMensagem || "",
          idMacro:          p.idMacro,
          idMacroLayout:    p.idMacroLayout,
          idMotorista:      p.idMotorista,
          nomeMotorista:    p.nomeMotorista || "",
          dataPosicao:      p.dataPosicao,
          latitude:         p.latitude,
          longitude:        p.longitude,
          uf:               p.uf,
          cidade:           p.cidade,
          rua:              p.rua,
          criadoEm:         new Date().toISOString(),
        })]
      );
      if (r) macrosGravadas++;
    } catch (e) { console.warn(`[sascar-macro] falha: ${e.message}`); }
  }
  if (macrosGravadas > 0) console.log(`[sascar] macros gravadas: ${macrosGravadas}`);

  // 2) Lista de veículos + cercas cadastradas
  const veiculos = await obterVeiculos({ usuario: USUARIO, senha: SENHA, quantidade: 1000, idVeiculo: 0 });
  const cercasRows = await q(`SELECT id, data FROM documents WHERE collection = 'cercas_eletronicas'`);
  const cercas = cercasRows.map(r => ({ id: r.id, ...r.data }));
  const cercaPorId = new Map(cercas.map(c => [c.id, c]));

  // 3) Última posição por veículo
  const novas = new Map();
  for (const p of ultimaPorVeiculo(pacotes)) novas.set(p.idVeiculo, p);

  // 4) Estado anterior persistido
  const persistRows = await q(`SELECT id, data FROM documents WHERE collection = 'sascar_posicoes'`);
  const persistidas = new Map();
  for (const r of persistRows) {
    if (r.data?.ultimaPosicao) persistidas.set(r.data.idVeiculo, r.data.ultimaPosicao);
  }

  let writes = 0, eventos = 0;
  const nowIso = new Date().toISOString();

  for (const [id, nova] of novas) {
    const v = veiculos.find(x => x.idVeiculo === id);
    if (!v) continue;
    const anterior = persistidas.get(id);
    if (anterior && Number(nova.idPacote) <= Number(anterior.idPacote)) continue;

    // Detecta transições cerca
    const lat = Number(nova.latitude), lng = Number(nova.longitude);
    const dentroDe = Number.isFinite(lat) && Number.isFinite(lng)
      ? cercasContendoPonto(lat, lng, cercas)
      : [];
    const dentroAntes = Array.isArray(anterior?.dentroDe) ? anterior.dentroDe : [];

    if (anterior) {
      const setAntes = new Set(dentroAntes);
      const setAgora = new Set(dentroDe);
      // ENTRADA
      for (const cid of dentroDe) {
        if (setAntes.has(cid)) continue;
        const c = cercaPorId.get(cid); if (!c) continue;
        await q1(
          `INSERT INTO documents (collection, id, data) VALUES ('cercas_eventos', $1, $2)
           ON CONFLICT (collection, id) DO NOTHING RETURNING id`,
          [`${id}_${cid}_${nova.idPacote}_E`, JSON.stringify({
            tipo: "ENTRADA", idVeiculo: id, placa: v.placa,
            cercaId: cid, cercaNome: c.nome || "", cercaTipo: c.tipo || "",
            latitude: lat, longitude: lng,
            idPacote: nova.idPacote ?? null, dataPosicao: nova.dataPosicao ?? null,
            criadoEm: nowIso,
          })]
        );
        eventos++;
      }
      // SAIDA
      for (const cid of dentroAntes) {
        if (setAgora.has(cid)) continue;
        const c = cercaPorId.get(cid); if (!c) continue;
        await q1(
          `INSERT INTO documents (collection, id, data) VALUES ('cercas_eventos', $1, $2)
           ON CONFLICT (collection, id) DO NOTHING RETURNING id`,
          [`${id}_${cid}_${nova.idPacote}_S`, JSON.stringify({
            tipo: "SAIDA", idVeiculo: id, placa: v.placa,
            cercaId: cid, cercaNome: c.nome || "", cercaTipo: c.tipo || "",
            latitude: lat, longitude: lng,
            idPacote: nova.idPacote ?? null, dataPosicao: nova.dataPosicao ?? null,
            criadoEm: nowIso,
          })]
        );
        eventos++;
      }
    }

    const enriched = {
      ...nova, placa: v.placa,
      statusTexto: statusFromPacote(nova),
      bloqueioArmado: nova.bloqueio === 1,
      motoristaLogado: (nova.idMotorista && nova.idMotorista !== 0 && nova.nomeMotorista) ? nova.nomeMotorista.trim() : null,
      dentroDe,
    };
    await q1(
      `INSERT INTO documents (collection, id, data) VALUES ('sascar_posicoes', $1, $2)
       ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data
       RETURNING id`,
      [String(id), JSON.stringify({
        idVeiculo: id, placa: v.placa,
        idEquipamentoDesc: v.idEquipamentoDesc ?? null,
        ultimaPosicao: enriched,
        atualizadoEm: nowIso,
      })]
    );
    persistidas.set(id, enriched);
    writes++;
  }

  // 5) Resultado final: 1 por veículo
  // Recalcula statusTexto sempre (evita servir valores velhos de banco antigo)
  const resultado = veiculos.map(v => {
    const p = persistidas.get(v.idVeiculo);
    if (p) return { ...p, statusTexto: statusFromPacote(p) };
    return { idVeiculo: v.idVeiculo, placa: v.placa, statusTexto: "SEM_DADOS", motoristaLogado: null, latitude: null, longitude: null, dataPosicao: null };
  });
  console.log(`[sascar] writes=${writes} eventos=${eventos}`);
  return { posicoes: resultado, total: resultado.length, gravadosNoBanco: writes, eventosCerca: eventos };
}

// POST /api/sascar/posicoes — SEMPRE serve cache do cron. Nunca chama SOAP daqui.
// SOAP roda só no cron (src/cron.js) pra respeitar rate limit SASCAR (1req/60s).
// Se cache vazio (primeiro boot), força 1 chamada e popula.
r.post("/posicoes", requireAuth, asyncH(async (req, res) => {
  const hit = getCache("sascar-posicoes");
  if (hit) {
    return res.json({ ...hit.data, cache: { age: hit.age, fresh: false, source: "cron" } });
  }
  // Sem cache (primeiro boot). Popula 1 vez.
  const data = await atualizarPosicoesSascar();
  setCache("sascar-posicoes", data);
  res.json({ ...data, cache: { age: 0, fresh: true, source: "bootstrap" } });
}));

// GET /api/sascar/veiculos — só lista (sem persistir)
r.get("/veiculos", requireAuth, asyncH(async (req, res) => {
  if (!USUARIO || !SENHA) return res.status(503).json({ error: "SASCAR não configurado" });
  const veiculos = await obterVeiculos({ usuario: USUARIO, senha: SENHA, quantidade: 1000, idVeiculo: 0 });
  res.json({ veiculos, total: veiculos.length });
}));

export default r;
