// Rotas CRUD pra tabela `lancamentos_os` (NF-e de peças/serviços vinculadas a OS).
import { Router } from "express";
import { q, q1 } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";

const r = Router();
r.use(requireAuth);

// GET /api/lancamentos-os?os_id=...&fornecedor=...&limit=200
r.get("/", asyncH(async (req, res) => {
  const { os_id, os_numero, fornecedor, limit = 500 } = req.query;
  const wh = [], params = [];
  if (os_id)      { params.push(os_id);      wh.push(`os_id::text = $${params.length}`); }
  if (os_numero)  { params.push(os_numero);  wh.push(`os_numero = $${params.length}`); }
  if (fornecedor) { params.push(`%${fornecedor}%`); wh.push(`fornecedor ILIKE $${params.length}`); }
  const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
  params.push(Math.min(Number(limit) || 500, 1000));
  const rows = await q(`SELECT * FROM lancamentos_os ${where} ORDER BY data_emissao DESC NULLS LAST LIMIT $${params.length}`, params);
  res.json({ rows, count: rows.length });
}));

// GET /api/lancamentos-os/:id
r.get("/:id", asyncH(async (req, res) => {
  const row = await q1(`SELECT * FROM lancamentos_os WHERE id::text = $1 OR legacy_id = $1 OR numero = $1`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(row);
}));

// POST /api/lancamentos-os
r.post("/", asyncH(async (req, res) => {
  const b = req.body || {};
  if (!b.numero) return res.status(400).json({ error: "campos_obrigatorios", detail: "numero" });
  const row = await q1(
    `INSERT INTO lancamentos_os
       (legacy_id, numero, os_id, os_numero, fornecedor, cnpj, nf_numero, nf_serie, nf_chave,
        valor_total, itens, anexos, data_emissao, data_pagamento, obs)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (legacy_id) DO UPDATE SET
       numero=EXCLUDED.numero, os_id=EXCLUDED.os_id, os_numero=EXCLUDED.os_numero,
       fornecedor=EXCLUDED.fornecedor, cnpj=EXCLUDED.cnpj, nf_numero=EXCLUDED.nf_numero,
       nf_serie=EXCLUDED.nf_serie, nf_chave=EXCLUDED.nf_chave, valor_total=EXCLUDED.valor_total,
       itens=EXCLUDED.itens, anexos=EXCLUDED.anexos, data_emissao=EXCLUDED.data_emissao,
       data_pagamento=EXCLUDED.data_pagamento, obs=EXCLUDED.obs, editado_em=now()
     RETURNING *`,
    [b.id || b.numero, b.numero, b.os_id || null, b.os_numero || null,
     b.fornecedor || null, b.cnpj || null, b.nf_numero || null, b.nf_serie || null, b.nf_chave || null,
     Number(b.valor_total) || 0, JSON.stringify(b.itens || []), JSON.stringify(b.anexos || []),
     b.data_emissao || null, b.data_pagamento || null, b.obs || null]
  );
  res.status(201).json(row);
}));

// PATCH /api/lancamentos-os/:id
r.patch("/:id", asyncH(async (req, res) => {
  const b = req.body || {};
  const scalars = ["numero","os_id","os_numero","fornecedor","cnpj","nf_numero","nf_serie","nf_chave",
                   "valor_total","data_emissao","data_pagamento","obs"];
  const jsonFields = ["itens","anexos"];
  const sets = [], params = [];
  for (const c of scalars)    if (c in b) { params.push(b[c]); sets.push(`${c}=$${params.length}`); }
  for (const c of jsonFields) if (c in b) { params.push(JSON.stringify(b[c])); sets.push(`${c}=$${params.length}`); }
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
  res.json(row);
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
