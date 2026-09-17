// Rotas CRUD pra tabela `tipos_manutencao_custom` (tipos custom da usuária).
import { Router } from "express";
import { q, q1 } from "../db.js";
import { requireAuth, requireMenuRestrito } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";

const r = Router();
r.use(requireAuth);
r.use(requireMenuRestrito("manutencao.ver"));

r.get("/", asyncH(async (req, res) => {
  const rows = await q(`SELECT * FROM tipos_manutencao_custom WHERE ativo = true ORDER BY grupo, label`);
  res.json({ rows, count: rows.length });
}));

r.post("/", asyncH(async (req, res) => {
  const b = req.body || {};
  if (!b.slug || !b.label) return res.status(400).json({ error: "campos_obrigatorios", detail: "slug, label" });
  const row = await q1(
    `INSERT INTO tipos_manutencao_custom (legacy_id, slug, label, grupo, km_intervalo, dias_intervalo, ativo)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (slug) DO UPDATE SET
       label=EXCLUDED.label, grupo=EXCLUDED.grupo, km_intervalo=EXCLUDED.km_intervalo,
       dias_intervalo=EXCLUDED.dias_intervalo, ativo=EXCLUDED.ativo
     RETURNING *`,
    [b.id || b.slug, b.slug, b.label, b.grupo || null, b.km_intervalo || null, b.dias_intervalo || null, b.ativo !== false]
  );
  res.status(201).json(row);
}));

r.patch("/:id", asyncH(async (req, res) => {
  const b = req.body || {};
  const campos = ["label","grupo","km_intervalo","dias_intervalo","ativo"];
  const sets = [], params = [];
  for (const c of campos) if (c in b) { params.push(b[c]); sets.push(`${c}=$${params.length}`); }
  if (!sets.length) return res.status(400).json({ error: "sem_campos_pra_atualizar" });
  params.push(req.params.id);
  const row = await q1(
    `UPDATE tipos_manutencao_custom SET ${sets.join(", ")}
       WHERE id::text = $${params.length} OR legacy_id = $${params.length} OR slug = $${params.length}
       RETURNING *`,
    params
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(row);
}));

r.delete("/:id", asyncH(async (req, res) => {
  // Soft delete — apenas marca ativo=false
  const row = await q1(
    `UPDATE tipos_manutencao_custom SET ativo = false
       WHERE id::text = $1 OR legacy_id = $1 OR slug = $1
       RETURNING id`,
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

export default r;
