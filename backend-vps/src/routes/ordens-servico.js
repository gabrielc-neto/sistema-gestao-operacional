// Rotas CRUD pra tabela `ordens_servico` (OS).
import { Router } from "express";
import { q, q1 } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";

const r = Router();
r.use(requireAuth);

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
  res.json({ rows, count: rows.length });
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
  res.json(row);
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

  const row = await q1(
    `INSERT INTO ordens_servico
       (legacy_id, numero, placa, status, solicitante, responsavel, descricao_problema, descricao_servico,
        km_abertura, km_conclusao, data_abertura, data_conclusao, itens, fotos, assinaturas, custo_total, obs)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (legacy_id) DO UPDATE SET
       placa=EXCLUDED.placa, status=EXCLUDED.status, solicitante=EXCLUDED.solicitante,
       responsavel=EXCLUDED.responsavel, descricao_problema=EXCLUDED.descricao_problema,
       descricao_servico=EXCLUDED.descricao_servico, km_abertura=EXCLUDED.km_abertura,
       km_conclusao=EXCLUDED.km_conclusao, data_conclusao=EXCLUDED.data_conclusao,
       itens=EXCLUDED.itens, fotos=EXCLUDED.fotos, assinaturas=EXCLUDED.assinaturas,
       custo_total=EXCLUDED.custo_total, obs=EXCLUDED.obs
     RETURNING *`,
    [b.id || numero, numero, b.placa, b.status || "aberta", b.solicitante || null, b.responsavel || null,
     b.descricao_problema || null, b.descricao_servico || null,
     b.km_abertura || null, b.km_conclusao || null,
     b.data_abertura || new Date().toISOString(), b.data_conclusao || null,
     JSON.stringify(b.itens || []), JSON.stringify(b.fotos || []),
     JSON.stringify(b.assinaturas || {}), Number(b.custo_total) || 0, b.obs || null]
  );
  res.status(201).json(row);
}));

// PATCH /api/ordens-servico/:id
r.patch("/:id", asyncH(async (req, res) => {
  const b = req.body || {};
  const scalars = ["placa","status","solicitante","responsavel","descricao_problema","descricao_servico",
                   "km_abertura","km_conclusao","data_conclusao","custo_total","obs"];
  const jsonFields = ["itens","fotos","assinaturas"];
  const sets = [], params = [];
  for (const c of scalars)   if (c in b) { params.push(b[c]); sets.push(`${c}=$${params.length}`); }
  for (const c of jsonFields) if (c in b) { params.push(JSON.stringify(b[c])); sets.push(`${c}=$${params.length}`); }
  if (!sets.length) return res.status(400).json({ error: "sem_campos_pra_atualizar" });
  params.push(req.params.id);
  const row = await q1(
    `UPDATE ordens_servico SET ${sets.join(", ")}
       WHERE id::text = $${params.length} OR legacy_id = $${params.length} OR numero = $${params.length}
       RETURNING *`,
    params
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(row);
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
