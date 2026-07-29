// Rotas /api/jornada/dia e /api/jornada/periodo — substituem Firebase Functions jornadaDia/jornadaPeriodo.
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";
import { q } from "../db.js";
import { cached } from "../integracoes/cache.js";
import {
  obterEventosTempoDirecao,
  obterMotoristas,
} from "../integracoes/sascar/soap.js";
import {
  calcularJornadas,
  diasNoPeriodo,
  agregarJornadasPorMotorista,
  rangeUtcParaDiaLocal,
} from "../integracoes/sascar/jornada.js";

const r = Router();

const USUARIO = process.env.SASCAR_USUARIO || "";
const SENHA   = process.env.SASCAR_SENHA   || "";

function creds() {
  if (!USUARIO || !SENHA) throw Object.assign(new Error("SASCAR_USUARIO/SENHA não configurados"), { status: 503 });
  return { usuario: USUARIO, senha: SENHA };
}

// POST /api/jornada/dia  { data: "YYYY-MM-DD" }
r.post("/dia", requireAuth, asyncH(async (req, res) => {
  const data = String(req.body?.data || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return res.status(400).json({ error: "data inválida (use YYYY-MM-DD)" });

  const { dataInicio, dataFim } = rangeUtcParaDiaLocal(data);
  const hojeBRT = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split("T")[0];
  const ttl = data === hojeBRT ? 30_000 : 5 * 60_000;

  const { data: cacheData, age, fresh } = await cached(`jornada-eventos:${data}`, ttl, async () => {
    // 1) Tenta SASCAR primeiro (dados frescos)
    let eventos = [];
    let fonte = "sascar";
    try {
      eventos = await obterEventosTempoDirecao({ ...creds(), dataInicio, dataFim, quantidade: 3000 });
    } catch (e) {
      console.warn(`[jornada] SASCAR falhou pra ${data}: ${e.message.slice(0, 120)}`);
    }

    // 2) Fallback: se SASCAR retornou vazio, busca no banco (histórico persistido)
    if (eventos.length === 0) {
      try {
        const row = await q(`SELECT data FROM documents WHERE collection = 'sascar_jornada_eventos' AND id = $1`, [data]);
        if (row.length > 0 && Array.isArray(row[0].data?.eventos)) {
          eventos = row[0].data.eventos;
          fonte = "banco";
        }
      } catch (e) { console.warn(`[jornada] leitura banco falhou: ${e.message}`); }
    } else {
      // 3) Se SASCAR retornou dados, PERSISTE no banco (pra ter histórico depois que sumir da SASCAR)
      try {
        await q(
          `INSERT INTO documents (collection, id, data) VALUES ('sascar_jornada_eventos', $1, $2)
           ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data`,
          [data, JSON.stringify({ eventos, salvoEm: new Date().toISOString(), totalEventos: eventos.length })]
        );
      } catch (e) { console.warn(`[jornada] persistência banco falhou: ${e.message}`); }
    }

    return { eventos, totalEventos: eventos.length, fonte };
  });

  // Classificação motorista (interno/px) — sempre fresca
  const classificacao = {};
  try {
    const rows = await q(`SELECT id, data FROM documents WHERE collection = 'motoristas_classificacao'`);
    for (const r of rows) classificacao[r.id] = r.data?.tipoContrato || "interno";
  } catch { /* ok */ }

  const jornadas = calcularJornadas(cacheData.eventos, data, classificacao);

  // Roster + desligados
  let naoIniciaram = [], totalCadastro = 0;
  try {
    const { data: roster } = await cached("motoristas-roster", 30 * 60_000, async () => {
      const lista = await obterMotoristas({ ...creds(), quantidade: 1000 });
      return lista.filter(m => m.idMotorista && !m.generico);
    });
    const desligados = new Set();
    try {
      const rowsD = await q(`SELECT id FROM documents WHERE collection = 'motoristas_desligados'`);
      for (const r of rowsD) desligados.add(Number(r.id));
    } catch { /* ok */ }
    const ativos = roster.filter(m => !desligados.has(m.idMotorista));
    totalCadastro = ativos.length;
    const idsComEvento = new Set(jornadas.map(j => j.idMotorista));
    naoIniciaram = ativos
      .filter(m => !idsComEvento.has(m.idMotorista))
      .map(m => ({ idMotorista: m.idMotorista, nome: m.nome, tipoMotorista: m.tipoMotorista }))
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  } catch (e) { console.error("[jornada] roster falhou:", e.message); }

  res.json({
    data, jornadas, naoIniciaram, totalCadastro,
    totalEventos: cacheData.totalEventos,
    fonte: cacheData.fonte,
    dataInicio, dataFim, cache: { age, fresh },
  });
}));

// POST /api/jornada/periodo  { dataInicio, dataFim }
r.post("/periodo", requireAuth, asyncH(async (req, res) => {
  const dataInicio = String(req.body?.dataInicio || "").trim();
  const dataFim = String(req.body?.dataFim || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
    return res.status(400).json({ error: "dataInicio/dataFim inválidos" });
  }
  if (dataFim < dataInicio) return res.status(400).json({ error: "dataFim < dataInicio" });
  const dias = diasNoPeriodo(dataInicio, dataFim);
  if (dias.length > 31) return res.status(400).json({ error: "Máx 31 dias" });

  const { data: payload, age, fresh } = await cached(`jornadaPer:${dataInicio}:${dataFim}`, 10 * 60_000, async () => {
    const porDia = [];
    let totalEventos = 0;
    for (const dia of dias) {
      const { dataInicio: di, dataFim: df } = rangeUtcParaDiaLocal(dia);
      const { data: pj } = await cached(`jornada:${dia}`, 5 * 60_000, async () => {
        let eventos = [];
        try {
          eventos = await obterEventosTempoDirecao({ ...creds(), dataInicio: di, dataFim: df, quantidade: 3000 });
        } catch (e) { console.warn(`[jornada/periodo] SASCAR falhou ${dia}: ${e.message.slice(0,120)}`); }

        if (eventos.length === 0) {
          try {
            const row = await q(`SELECT data FROM documents WHERE collection='sascar_jornada_eventos' AND id=$1`, [dia]);
            if (row.length > 0 && Array.isArray(row[0].data?.eventos)) eventos = row[0].data.eventos;
          } catch { /* ok */ }
        } else {
          try {
            await q(
              `INSERT INTO documents (collection, id, data) VALUES ('sascar_jornada_eventos', $1, $2)
               ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data`,
              [dia, JSON.stringify({ eventos, salvoEm: new Date().toISOString(), totalEventos: eventos.length })]
            );
          } catch { /* ok */ }
        }
        return { jornadas: calcularJornadas(eventos, dia), totalEventos: eventos.length };
      });
      porDia.push({ data: dia, jornadas: pj.jornadas });
      totalEventos += pj.totalEventos || 0;
    }
    const jornadasAgregadas = agregarJornadasPorMotorista(porDia.map(d => d.jornadas));
    return { dias, porDia, jornadasAgregadas, totalEventos };
  });

  res.json({ dataInicio, dataFim, ...payload, cache: { age, fresh } });
}));

export default r;
