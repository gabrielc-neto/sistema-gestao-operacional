// Rotas CRUD pra veículos (frota). Placa como identificador principal.
import { Router } from "express";
import { q, q1 } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";

const r = Router();
r.use(requireAuth);

const CAMPOS = ["placa","empresa","tipo","marca","modelo","cor","ano_fab","ano_mod","chassi","renavam","tara",
                "capacidade","eixos","combustivel","status","c1","c2","c3","motorista_id","motorista_nome",
                "odometro_km","odometro_data","crlv_vencimento","civ_vencimento","cipp_vencimento"];
const JSON_CAMPOS = ["bloqueio","extras"];

// GET /api/veiculos?status=ativo
r.get("/", asyncH(async (req, res) => {
  const { status, tipo, placa } = req.query;
  const wh = [], params = [];
  if (status) { params.push(status); wh.push(`status = $${params.length}`); }
  if (tipo)   { params.push(tipo);   wh.push(`tipo = $${params.length}`); }
  if (placa)  { params.push(placa);  wh.push(`placa = $${params.length}`); }
  const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
  const rows = await q(`SELECT * FROM veiculos ${where} ORDER BY placa`, params);
  res.json({ rows, count: rows.length });
}));

// GET /api/veiculos/:id (id pode ser UUID, legacy_id ou placa)
r.get("/:id", asyncH(async (req, res) => {
  const row = await q1(`SELECT * FROM veiculos WHERE id::text = $1 OR legacy_id = $1 OR placa = $1`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(row);
}));

// POST /api/veiculos — upsert por placa (compatível com setDoc merge Firestore)
r.post("/", asyncH(async (req, res) => {
  const b = req.body || {};
  const placa = String(b.placa || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!placa) return res.status(400).json({ error: "placa_obrigatoria" });

  // Monta INSERT ... ON CONFLICT (placa) DO UPDATE dinâmico
  const cols = ["legacy_id", "placa"];
  const vals = [b.id || placa, placa];
  for (const c of CAMPOS) if (c in b && c !== "placa") { cols.push(c); vals.push(b[c] ?? null); }
  for (const c of JSON_CAMPOS) if (c in b) { cols.push(c); vals.push(JSON.stringify(b[c] || {})); }

  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const updates = cols.filter(c => c !== "placa" && c !== "legacy_id").map(c => `${c}=EXCLUDED.${c}`).join(", ");

  const row = await q1(
    `INSERT INTO veiculos (${cols.join(", ")}) VALUES (${placeholders})
     ON CONFLICT (placa) DO UPDATE SET ${updates}
     RETURNING *`,
    vals
  );
  res.status(201).json(row);
}));

// PATCH /api/veiculos/:id
r.patch("/:id", asyncH(async (req, res) => {
  const b = req.body || {};
  const sets = [], params = [];
  for (const c of CAMPOS) if (c in b) { params.push(b[c]); sets.push(`${c}=$${params.length}`); }
  for (const c of JSON_CAMPOS) if (c in b) { params.push(JSON.stringify(b[c])); sets.push(`${c}=$${params.length}`); }
  if (!sets.length) return res.status(400).json({ error: "sem_campos_pra_atualizar" });
  params.push(req.params.id);
  const row = await q1(
    `UPDATE veiculos SET ${sets.join(", ")}
       WHERE id::text = $${params.length} OR legacy_id = $${params.length} OR placa = $${params.length}
       RETURNING *`,
    params
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(row);
}));

r.delete("/:id", asyncH(async (req, res) => {
  const row = await q1(`DELETE FROM veiculos WHERE id::text = $1 OR legacy_id = $1 OR placa = $1 RETURNING id`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

export default r;
