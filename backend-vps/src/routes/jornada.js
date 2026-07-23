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
    const eventos = await obterEventosTempoDirecao({ ...creds(), dataInicio, dataFim, quantidade: 3000 });
    return { eventos, totalEventos: eventos.length };
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
        const eventos = await obterEventosTempoDirecao({ ...creds(), dataInicio: di, dataFim: df, quantidade: 3000 });
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
