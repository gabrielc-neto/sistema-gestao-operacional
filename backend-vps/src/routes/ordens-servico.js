// Rotas CRUD pra tabela `ordens_servico` (OS).
//
// Frontend usa camelCase (motoristaNome, tipoServico, dataHora, hodometro, fornecedor, fornecedorCnpj).
// Banco PG usa snake_case (motorista_nome, tipo_servico, data_abertura, hodometro, fornecedor, fornecedor_cnpj).
// Mapeamos nas duas pontas: aceita camelCase no body, retorna camelCase nas rows.
import { Router } from "express";
import { q, q1 } from "../db.js";
import { requireAuth, requireMenuRestrito } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";

const r = Router();
r.use(requireAuth);
r.use(requireMenuRestrito("manutencao.ver"));

// snake_case (PG) → camelCase (frontend) para os aliases usados na app
function toCamel(row) {
  if (!row) return row;
  return {
    ...row,
    dataHora:       row.data_abertura,
    dataConclusao:  row.data_conclusao,
    tipoServico:    row.tipo_servico,
    motoristaId:    row.motorista_id,
    motoristaNome:  row.motorista_nome,
    fornecedorCnpj: row.fornecedor_cnpj,
    kmAbertura:     row.km_abertura,
    kmConclusao:    row.km_conclusao,
    hodometroSaida: row.km_conclusao,
    custoTotal:     row.custo_total,
    descricaoProblema: row.descricao_problema,
    descricaoServico:  row.descricao_servico,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

// camelCase (body do frontend) → valor pra coluna snake_case, com fallback pro nome PG
function pick(body, camel, snake) {
  if (camel in body) return body[camel];
  if (snake in body) return body[snake];
  return undefined;
}

// GET /api/ordens-servico?placa=XYZ&status=aberta&limit=50
r.get("/", asyncH(async (req, res) => {
  const { placa, status, limit = 500 } = req.query;
  const wh = [], params = [];
  if (placa)  { params.push(placa);  wh.push(`placa = $${params.length}`); }
  if (status) { params.push(status); wh.push(`status = $${params.length}`); }
  const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
  params.push(Math.min(Number(limit) || 500, 1000));
  const rows = await q(
    `SELECT * FROM ordens_servico ${where} ORDER BY data_abertura DESC LIMIT $${params.length}`,
    params
  );
  res.json({ rows: rows.map(toCamel), count: rows.length });
}));

// GET /api/ordens-servico/proximo-numero
r.get("/proximo-numero", asyncH(async (req, res) => {
  const row = await q1(`SELECT MAX(CAST(regexp_replace(numero, '\\D', '', 'g') AS INTEGER)) AS maior FROM ordens_servico`);
  const proximo = (row?.maior || 0) + 1;
  res.json({ numero: `OS-${String(proximo).padStart(5, "0")}` });
}));

// GET /api/ordens-servico/:id
r.get("/:id", asyncH(async (req, res) => {
  const row = await q1(`SELECT * FROM ordens_servico WHERE id::text = $1 OR legacy_id = $1 OR numero = $1`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(toCamel(row));
}));

// POST /api/ordens-servico
r.post("/", asyncH(async (req, res) => {
  const b = req.body || {};
  if (!b.placa) return res.status(400).json({ error: "campos_obrigatorios", detail: "placa" });

  // Se não veio número, gera automático
  let numero = b.numero;
  if (!numero) {
    const row = await q1(`SELECT MAX(CAST(regexp_replace(numero, '\\D', '', 'g') AS INTEGER)) AS maior FROM ordens_servico`);
    numero = `OS-${String((row?.maior || 0) + 1).padStart(5, "0")}`;
  }

  // Mapeia body camelCase → colunas snake_case
  const tipoServico    = pick(b, "tipoServico",    "tipo_servico");
  const motoristaId    = pick(b, "motoristaId",    "motorista_id");
  const motoristaNome  = pick(b, "motoristaNome",  "motorista_nome");
  const fornecedor     = pick(b, "fornecedor",     "fornecedor");
  const fornecedorCnpj = pick(b, "fornecedorCnpj", "fornecedor_cnpj");
  const hodometro      = pick(b, "hodometro",      "hodometro") ?? pick(b, "kmAbertura", "km_abertura");
  const dataAbertura   = pick(b, "dataHora",       "data_abertura") ?? new Date().toISOString();

  const row = await q1(
    `INSERT INTO ordens_servico
       (legacy_id, numero, placa, status, solicitante, responsavel, descricao_problema, descricao_servico,
        km_abertura, km_conclusao, data_abertura, data_conclusao, itens, fotos, assinaturas, custo_total, obs,
        motorista_id, motorista_nome, tipo_servico, hodometro, fornecedor, fornecedor_cnpj)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
     ON CONFLICT (legacy_id) DO UPDATE SET
       placa=EXCLUDED.placa, status=EXCLUDED.status, solicitante=EXCLUDED.solicitante,
       responsavel=EXCLUDED.responsavel, descricao_problema=EXCLUDED.descricao_problema,
       descricao_servico=EXCLUDED.descricao_servico, km_abertura=EXCLUDED.km_abertura,
       km_conclusao=EXCLUDED.km_conclusao, data_conclusao=EXCLUDED.data_conclusao,
       itens=EXCLUDED.itens, fotos=EXCLUDED.fotos, assinaturas=EXCLUDED.assinaturas,
       custo_total=EXCLUDED.custo_total, obs=EXCLUDED.obs,
       motorista_id=EXCLUDED.motorista_id, motorista_nome=EXCLUDED.motorista_nome,
       tipo_servico=EXCLUDED.tipo_servico, hodometro=EXCLUDED.hodometro,
       fornecedor=EXCLUDED.fornecedor, fornecedor_cnpj=EXCLUDED.fornecedor_cnpj
     RETURNING *`,
    [b.id || numero, numero, b.placa, b.status || "aberta", b.solicitante || null, b.responsavel || null,
     b.descricao_problema || null, b.descricao_servico || null,
     hodometro ?? null, b.km_conclusao || null,
     dataAbertura, b.data_conclusao || null,
     JSON.stringify(b.itens || []), JSON.stringify(b.fotos || []),
     JSON.stringify(b.assinaturas || {}), Number(b.custo_total) || 0, b.obs || null,
     motoristaId || null, motoristaNome || null, tipoServico || null,
     hodometro ?? null, fornecedor || null, fornecedorCnpj || null]
  );
  res.status(201).json(toCamel(row));
}));

// PATCH /api/ordens-servico/:id
r.patch("/:id", asyncH(async (req, res) => {
  const b = req.body || {};
  const scalarsSnake = ["placa","status","solicitante","responsavel","descricao_problema","descricao_servico",
                        "km_abertura","km_conclusao","data_conclusao","custo_total","obs",
                        "motorista_id","motorista_nome","tipo_servico","hodometro","fornecedor","fornecedor_cnpj"];
  const jsonFields = ["itens","fotos","assinaturas"];

  // Mapeia camelCase→snake se veio do frontend
  const camelToSnake = {
    tipoServico: "tipo_servico", motoristaId: "motorista_id", motoristaNome: "motorista_nome",
    fornecedorCnpj: "fornecedor_cnpj", kmAbertura: "km_abertura", kmConclusao: "km_conclusao",
    dataHora: "data_abertura", dataConclusao: "data_conclusao",
    descricaoProblema: "descricao_problema", descricaoServico: "descricao_servico",
    custoTotal: "custo_total",
  };
  const merged = { ...b };
  for (const [camel, snake] of Object.entries(camelToSnake)) {
    if (camel in b && !(snake in b)) merged[snake] = b[camel];
  }

  const sets = [], params = [];
  for (const c of scalarsSnake)   if (c in merged) { params.push(merged[c]); sets.push(`${c}=$${params.length}`); }
  for (const c of jsonFields)     if (c in merged) { params.push(JSON.stringify(merged[c])); sets.push(`${c}=$${params.length}`); }
  if (!sets.length) return res.status(400).json({ error: "sem_campos_pra_atualizar" });
  params.push(req.params.id);
  const row = await q1(
    `UPDATE ordens_servico SET ${sets.join(", ")}
       WHERE id::text = $${params.length} OR legacy_id = $${params.length} OR numero = $${params.length}
       RETURNING *`,
    params
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(toCamel(row));
}));

// DELETE /api/ordens-servico/:id
r.delete("/:id", asyncH(async (req, res) => {
  const row = await q1(
    `DELETE FROM ordens_servico WHERE id::text = $1 OR legacy_id = $1 OR numero = $1 RETURNING id`,
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

export default r;
