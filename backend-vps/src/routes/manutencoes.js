// Rotas CRUD pra tabela `manutencoes` (vencimentos e registros por veículo+tipo).
// Formato de payload equivalente ao Firestore anterior pra facilitar migração.
import { Router } from "express";
import { q, q1 } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";

const r = Router();
r.use(requireAuth);

// GET /api/manutencoes?placa=XYZ&tipo=oleo
r.get("/", asyncH(async (req, res) => {
  const { placa, tipo, venc_ate } = req.query;
  const wh = [], params = [];
  if (placa)    { params.push(placa);    wh.push(`placa = $${params.length}`); }
  if (tipo)     { params.push(tipo);     wh.push(`tipo = $${params.length}`); }
  if (venc_ate) { params.push(venc_ate); wh.push(`venc <= $${params.length}`); }
  const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
  const rows = await q(`SELECT * FROM manutencoes ${where} ORDER BY venc NULLS LAST, placa`, params);
  res.json({ rows, count: rows.length });
}));

// GET /api/manutencoes/:id
r.get("/:id", asyncH(async (req, res) => {
  const row = await q1(`SELECT * FROM manutencoes WHERE id::text = $1 OR legacy_id = $1`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(row);
}));

// POST /api/manutencoes  {placa, tipo, label, grupo, venc, ...}
r.post("/", asyncH(async (req, res) => {
  const b = req.body || {};
  if (!b.placa || !b.tipo || !b.label) {
    return res.status(400).json({ error: "campos_obrigatorios", detail: "placa, tipo, label" });
  }
  const legacyId = b.id || `${b.placa}__${b.tipo}`;
  const row = await q1(
    `INSERT INTO manutencoes
       (legacy_id, placa, tipo, label, grupo, venc, data_realiz, agendamento, local, numero_doc, km_atual, km_prox, resp, obs, anexos)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (legacy_id) DO UPDATE SET
       placa=EXCLUDED.placa, tipo=EXCLUDED.tipo, label=EXCLUDED.label, grupo=EXCLUDED.grupo,
       venc=EXCLUDED.venc, data_realiz=EXCLUDED.data_realiz, agendamento=EXCLUDED.agendamento,
       local=EXCLUDED.local, numero_doc=EXCLUDED.numero_doc, km_atual=EXCLUDED.km_atual,
       km_prox=EXCLUDED.km_prox, resp=EXCLUDED.resp, obs=EXCLUDED.obs, anexos=EXCLUDED.anexos
     RETURNING *`,
    [legacyId, b.placa, b.tipo, b.label, b.grupo || null, b.venc || null, b.data_realiz || null,
     b.agendamento || null, b.local || null, b.numero_doc || null, b.km_atual || null, b.km_prox || null,
     b.resp || null, b.obs || null, JSON.stringify(b.anexos || [])]
  );
  res.status(201).json(row);
}));

// PATCH /api/manutencoes/:id  — merge parcial
r.patch("/:id", asyncH(async (req, res) => {
  const b = req.body || {};
  const campos = ["placa","tipo","label","grupo","venc","data_realiz","agendamento","local","numero_doc","km_atual","km_prox","resp","obs"];
  const sets = [], params = [];
  for (const c of campos) if (c in b) { params.push(b[c]); sets.push(`${c}=$${params.length}`); }
  if ("anexos" in b) { params.push(JSON.stringify(b.anexos)); sets.push(`anexos=$${params.length}`); }
  if (!sets.length) return res.status(400).json({ error: "sem_campos_pra_atualizar" });
  params.push(req.params.id);
  const row = await q1(
    `UPDATE manutencoes SET ${sets.join(", ")} WHERE id::text = $${params.length} OR legacy_id = $${params.length} RETURNING *`,
    params
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(row);
}));

// DELETE /api/manutencoes/:id
r.delete("/:id", asyncH(async (req, res) => {
  const row = await q1(`DELETE FROM manutencoes WHERE id::text = $1 OR legacy_id = $1 RETURNING id`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

export default r;
