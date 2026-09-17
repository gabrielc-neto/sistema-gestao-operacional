// Rotas CRUD pra tabela `lancamentos_os` (lançamentos de NF/serviço vinculados a OS).
//
// Frontend usa camelCase (osId, osNumero, tipoLancamento, valorTotal, servicoFeito, dataHora).
// Banco PG usa snake_case (os_id, os_numero, tipo_lancamento, valor_total, servico_feito, data_emissao).
// Mapeamos nas duas pontas — mesmo padrão de ordens-servico.js (fix 005 e 013).
import { Router } from "express";
import { q, q1 } from "../db.js";
import { requireAuth, requireMenuRestrito } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";

const r = Router();
r.use(requireAuth);
r.use(requireMenuRestrito("manutencao.ver"));

// snake_case (PG) → camelCase (frontend)
function toCamel(row) {
  if (!row) return row;
  return {
    ...row,
    osId:            row.os_id,
    osNumero:        row.os_numero,
    tipoLancamento:  row.tipo_lancamento,
    valorTotal:      row.valor_total,
    servicoFeito:    row.servico_feito,
    dataHora:        row.data_emissao,
    dataEmissao:     row.data_emissao,
    dataPagamento:   row.data_pagamento,
    nfNumero:        row.nf_numero,
    nfSerie:         row.nf_serie,
    nfChave:         row.nf_chave,
    editadoEm:       row.editado_em,
    createdAt:       row.created_at,
    criadoEm:        row.created_at, // alias camelCase p/ compat com frontend legado
  };
}

// camelCase (body) → valor. Aceita tanto nome camelCase quanto snake pra retrocompatibilidade
function pick(body, camel, snake) {
  if (camel in body) return body[camel];
  if (snake in body) return body[snake];
  return undefined;
}

// Se osId chegar como "OS-00009" (numero legível) em vez de UUID, resolver pra id real.
// Evita "invalid input syntax for type uuid" quando frontend passa numero da OS.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function resolverOsId(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (UUID_RE.test(s)) return s;
  const row = await q1(
    `SELECT id FROM ordens_servico WHERE numero = $1 OR legacy_id = $1 LIMIT 1`,
    [s]
  );
  return row?.id || null;
}

// GET /api/lancamentos-os?os_id=...&fornecedor=...&limit=200
r.get("/", asyncH(async (req, res) => {
  const { os_id, os_numero, fornecedor, placa, limit = 500 } = req.query;
  const wh = [], params = [];
  if (os_id)      { params.push(os_id);      wh.push(`os_id::text = $${params.length}`); }
  if (os_numero)  { params.push(os_numero);  wh.push(`os_numero = $${params.length}`); }
  if (fornecedor) { params.push(`%${fornecedor}%`); wh.push(`fornecedor ILIKE $${params.length}`); }
  if (placa)      { params.push(placa);      wh.push(`placa = $${params.length}`); }
  const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
  params.push(Math.min(Number(limit) || 500, 1000));
  const rows = await q(`SELECT * FROM lancamentos_os ${where} ORDER BY data_emissao DESC NULLS LAST, created_at DESC LIMIT $${params.length}`, params);
  res.json({ rows: rows.map(toCamel), count: rows.length });
}));

// GET /api/lancamentos-os/:id
r.get("/:id", asyncH(async (req, res) => {
  const row = await q1(`SELECT * FROM lancamentos_os WHERE id::text = $1 OR legacy_id = $1 OR numero = $1`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(toCamel(row));
}));

// POST /api/lancamentos-os
r.post("/", asyncH(async (req, res) => {
  const b = req.body || {};
  if (!b.numero) return res.status(400).json({ error: "campos_obrigatorios", detail: "numero" });

  // Mapeia body camelCase → colunas snake_case
  const osId            = pick(b, "osId",            "os_id");
  const osNumero        = pick(b, "osNumero",        "os_numero");
  const tipoLancamento  = pick(b, "tipoLancamento",  "tipo_lancamento");
  const valorTotal      = pick(b, "valorTotal",      "valor_total");
  const servicoFeito    = pick(b, "servicoFeito",    "servico_feito");
  const dataEmissao     = pick(b, "dataHora",        "data_emissao") ?? pick(b, "dataEmissao", "data_emissao");
  const dataPagamento   = pick(b, "dataPagamento",   "data_pagamento");
  const nfNumero        = pick(b, "nfNumero",        "nf_numero");
  const nfSerie         = pick(b, "nfSerie",         "nf_serie");
  const nfChave         = pick(b, "nfChave",         "nf_chave");
  const hodometro       = pick(b, "hodometro",       "hodometro");
  const placa           = pick(b, "placa",           "placa");
  const fornecedor      = pick(b, "fornecedor",      "fornecedor");
  const cnpj            = pick(b, "cnpj",            "cnpj");
  const obs             = pick(b, "obs",             "obs");

  // Resolve osId (aceita UUID direto OU numero 'OS-XXXXX' que é resolvido pro UUID real)
  const osIdResolvido = await resolverOsId(osId);
  // Se osNumero não veio mas osId original era numero, reaproveita
  const osNumeroFinal = osNumero || (osId && !UUID_RE.test(String(osId)) ? String(osId) : null);

  const row = await q1(
    `INSERT INTO lancamentos_os
       (legacy_id, numero, os_id, os_numero, fornecedor, cnpj, nf_numero, nf_serie, nf_chave,
        valor_total, itens, anexos, data_emissao, data_pagamento, obs,
        tipo_lancamento, placa, hodometro, servico_feito)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     ON CONFLICT (legacy_id) DO UPDATE SET
       numero=EXCLUDED.numero, os_id=EXCLUDED.os_id, os_numero=EXCLUDED.os_numero,
       fornecedor=EXCLUDED.fornecedor, cnpj=EXCLUDED.cnpj, nf_numero=EXCLUDED.nf_numero,
       nf_serie=EXCLUDED.nf_serie, nf_chave=EXCLUDED.nf_chave, valor_total=EXCLUDED.valor_total,
       itens=EXCLUDED.itens, anexos=EXCLUDED.anexos, data_emissao=EXCLUDED.data_emissao,
       data_pagamento=EXCLUDED.data_pagamento, obs=EXCLUDED.obs,
       tipo_lancamento=EXCLUDED.tipo_lancamento, placa=EXCLUDED.placa,
       hodometro=EXCLUDED.hodometro, servico_feito=EXCLUDED.servico_feito,
       editado_em=now()
     RETURNING *`,
    [b.id || b.numero, b.numero, osIdResolvido, osNumeroFinal,
     fornecedor || null, cnpj || null, nfNumero || null, nfSerie || null, nfChave || null,
     Number(valorTotal) || 0, JSON.stringify(b.itens || []), JSON.stringify(b.anexos || []),
     dataEmissao || null, dataPagamento || null, obs || null,
     tipoLancamento || null, placa || null, hodometro ?? null, servicoFeito || null]
  );
  res.status(201).json(toCamel(row));
}));

// PATCH /api/lancamentos-os/:id
r.patch("/:id", asyncH(async (req, res) => {
  const b = req.body || {};
  const scalarsSnake = ["numero","os_id","os_numero","fornecedor","cnpj","nf_numero","nf_serie","nf_chave",
                        "valor_total","data_emissao","data_pagamento","obs",
                        "tipo_lancamento","placa","hodometro","servico_feito"];
  const jsonFields = ["itens","anexos"];

  // camelCase → snake_case
  const camelToSnake = {
    osId: "os_id", osNumero: "os_numero",
    tipoLancamento: "tipo_lancamento", valorTotal: "valor_total",
    servicoFeito: "servico_feito", dataHora: "data_emissao",
    dataEmissao: "data_emissao", dataPagamento: "data_pagamento",
    nfNumero: "nf_numero", nfSerie: "nf_serie", nfChave: "nf_chave",
  };
  const merged = { ...b };
  for (const [camel, snake] of Object.entries(camelToSnake)) {
    if (camel in b && !(snake in b)) merged[snake] = b[camel];
  }

  // Se veio os_id como "OS-XXXXX" (numero), resolver pra UUID real e mover pra os_numero
  if ("os_id" in merged && merged.os_id != null && !UUID_RE.test(String(merged.os_id))) {
    const numeroBruto = String(merged.os_id);
    merged.os_id = await resolverOsId(numeroBruto);
    if (!("os_numero" in merged)) merged.os_numero = numeroBruto;
  }

  const sets = [], params = [];
  for (const c of scalarsSnake) if (c in merged) { params.push(merged[c]); sets.push(`${c}=$${params.length}`); }
  for (const c of jsonFields)   if (c in merged) { params.push(JSON.stringify(merged[c])); sets.push(`${c}=$${params.length}`); }
  sets.push(`editado_em=now()`);
  if (!sets.length) return res.status(400).json({ error: "sem_campos_pra_atualizar" });
  params.push(req.params.id);
  const row = await q1(
    `UPDATE lancamentos_os SET ${sets.join(", ")}
       WHERE id::text = $${params.length} OR legacy_id = $${params.length} OR numero = $${params.length}
       RETURNING *`,
    params
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(toCamel(row));
}));

// DELETE /api/lancamentos-os/:id
r.delete("/:id", asyncH(async (req, res) => {
  const row = await q1(
    `DELETE FROM lancamentos_os WHERE id::text = $1 OR legacy_id = $1 OR numero = $1 RETURNING id`,
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

export default r;
