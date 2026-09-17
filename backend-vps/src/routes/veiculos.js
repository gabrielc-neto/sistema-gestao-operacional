// Rotas CRUD pra veículos (frota). Placa como identificador principal.
import { Router } from "express";
import { q, q1 } from "../db.js";
import { requireAuth, requireMenuRestrito } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";

const r = Router();
r.use(requireAuth);
r.use(requireMenuRestrito("frota.ver"));

const CAMPOS = ["placa","empresa","tipo","marca","modelo","cor","ano_fab","ano_mod","chassi","renavam","tara",
                "capacidade","eixos","combustivel","status","c1","c2","c3","motorista_id","motorista_nome",
                "odometro_km","odometro_data","crlv_vencimento","civ_vencimento","cipp_vencimento"];
const JSON_CAMPOS = ["bloqueio","extras"];

// Spread do JSONB `extras` no topo do objeto — permite frontend ler v.documentosAplicaveis diretamente
function enriquecer(row) {
  if (!row) return row;
  const { extras, ...rest } = row;
  const merged = { ...(extras || {}), ...rest };
  // UI lê `v.motorista`, banco grava `motorista_nome`. Alias garante leitura pós-save.
  merged.motorista = rest.motorista_nome ?? extras?.motorista ?? null;
  return merged;
}

// GET /api/veiculos?status=ativo
r.get("/", asyncH(async (req, res) => {
  const { status, tipo, placa } = req.query;
  const wh = [], params = [];
  if (status) { params.push(status); wh.push(`status = $${params.length}`); }
  if (tipo)   { params.push(tipo);   wh.push(`tipo = $${params.length}`); }
  if (placa)  { params.push(placa);  wh.push(`placa = $${params.length}`); }
  const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
  const rows = await q(`SELECT * FROM veiculos ${where} ORDER BY placa`, params);
  res.json({ rows: rows.map(enriquecer), count: rows.length });
}));

// GET /api/veiculos/:id (id pode ser UUID, legacy_id ou placa)
r.get("/:id", asyncH(async (req, res) => {
  const row = await q1(`SELECT * FROM veiculos WHERE id::text = $1 OR legacy_id = $1 OR placa = $1`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(enriquecer(row));
}));

// Campos internos que NUNCA devem virar extras (id do banco, aliases, timestamps).
const NAO_EXTRAS = new Set([
  "id", "legacy_id", "created_at", "updated_at", "createdAt", "updatedAt",
  "motorista", // alias de leitura gerado por enriquecer()
]);

// Separa o body em: colunas mapeadas + JSON_CAMPOS + resto (extras dinâmicos).
// Qualquer campo que o frontend enviar e não estiver em CAMPOS/JSON_CAMPOS vai
// pra dentro de `extras` — sem whitelist estreito que apagava dados silenciosamente.
function separarCampos(b) {
  const conhecidos = new Set([...CAMPOS, ...JSON_CAMPOS]);
  const extras = {};
  for (const [k, v] of Object.entries(b)) {
    if (conhecidos.has(k) || NAO_EXTRAS.has(k)) continue;
    extras[k] = v;
  }
  return extras;
}

// POST /api/veiculos — upsert por placa (compatível com setDoc merge Firestore)
r.post("/", asyncH(async (req, res) => {
  const b = req.body || {};
  const placa = String(b.placa || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!placa) return res.status(400).json({ error: "placa_obrigatoria" });

  // Monta INSERT ... ON CONFLICT (placa) DO UPDATE dinâmico
  const cols = ["legacy_id", "placa"];
  const vals = [b.id || placa, placa];
  for (const c of CAMPOS) if (c in b && c !== "placa") { cols.push(c); vals.push(b[c] ?? null); }

  // JSON_CAMPOS: bloqueio substitui, extras faz deep-merge com o body inteiro (top-level dinâmico + extras explícito)
  const extrasDinamicos = separarCampos(b);
  const extrasFinal = { ...extrasDinamicos, ...(b.extras || {}) };
  if ("bloqueio" in b) { cols.push("bloqueio"); vals.push(JSON.stringify(b.bloqueio || {})); }
  if (Object.keys(extrasFinal).length) { cols.push("extras"); vals.push(JSON.stringify(extrasFinal)); }

  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  // Para `extras` usa jsonb_deep_merge — nunca sobrescreve dados salvos com objeto parcial.
  const updates = cols.filter(c => c !== "placa" && c !== "legacy_id").map(c =>
    c === "extras"
      ? `extras = jsonb_deep_merge(COALESCE(veiculos.extras, '{}'::jsonb), EXCLUDED.extras)`
      : `${c}=EXCLUDED.${c}`
  ).join(", ");

  const row = await q1(
    `INSERT INTO veiculos (${cols.join(", ")}) VALUES (${placeholders})
     ON CONFLICT (placa) DO UPDATE SET ${updates}
     RETURNING *`,
    vals
  );
  res.status(201).json(enriquecer(row));
}));

// PATCH /api/veiculos/:id
r.patch("/:id", asyncH(async (req, res) => {
  const b = req.body || {};
  const sets = [], params = [];
  for (const c of CAMPOS) if (c in b) { params.push(b[c]); sets.push(`${c}=$${params.length}`); }
  if ("bloqueio" in b) { params.push(JSON.stringify(b.bloqueio)); sets.push(`bloqueio=$${params.length}`); }

  // Qualquer campo não-mapeado vai pra `extras` (deep-merge, preserva sub-objetos).
  // Ex: documentosAplicaveis, ipem, aet, licenca_paranas, e qualquer novo doc futuro.
  const extrasDinamicos = separarCampos(b);
  const extrasPatch = { ...extrasDinamicos, ...(b.extras || {}) };
  if (Object.keys(extrasPatch).length) {
    params.push(JSON.stringify(extrasPatch));
    sets.push(`extras = jsonb_deep_merge(COALESCE(extras,'{}'::jsonb), $${params.length}::jsonb)`);
  }

  if (!sets.length) return res.status(400).json({ error: "sem_campos_pra_atualizar" });
  params.push(req.params.id);
  const row = await q1(
    `UPDATE veiculos SET ${sets.join(", ")}
       WHERE id::text = $${params.length} OR legacy_id = $${params.length} OR placa = $${params.length}
       RETURNING *`,
    params
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(enriquecer(row));
}));

r.delete("/:id", asyncH(async (req, res) => {
  const row = await q1(`DELETE FROM veiculos WHERE id::text = $1 OR legacy_id = $1 OR placa = $1 RETURNING id`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

export default r;
