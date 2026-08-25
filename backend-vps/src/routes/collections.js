// Endpoint genérico REST pra qualquer coleção Firestore.
// Rotas: /api/collections/:nome
//        /api/collections/:nome/:id
//
// Modelo: tabela `documents` (collection, id, data JSONB).
// Substitui setDoc/addDoc/updateDoc/deleteDoc do Firestore de forma drop-in.
//
// Filtros:  ?where.placa=ABC&where.status=ativo → WHERE data->>'placa'='ABC' AND ...
// Ordenar:  ?orderBy=nome&order=asc
// Limite:   ?limit=100
import { Router } from "express";
import { q, q1, pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";
import { randomUUID } from "node:crypto";

const r = Router();
r.use(requireAuth);

// Lista coleções permitidas (whitelist pra segurança)
const COLECOES = new Set([
  "motoristas", "veiculos", "cargos", "setores", "usuarios", "permissoes_catalogo",
  "cercas_eletronicas", "cercas_eventos",
  "checklists_mensais",
  "compras_setor", "propostas_compra", "requisicoes_compra",
  "estoque_itens", "estoque_movimentacoes",
  "ferias",
  "itens_manutencao",
  "multas",
  "ordens_carregamento",
  "atrelamentos",
  "pneus", "pneu_compras", "pneu_inspecoes", "pneu_recapagens", "pneu_movimentacoes",
  "sascar_posicoes",
  "cta_abastecimentos", "abastecimentos_cta",
  "vistorias",
  "motoristas_classificacao", "motoristas_desligados",
  "config", "system",
  // Aliases defensivos pra builds antigos cacheados que ainda chamam via /collections/*
  // (rotas dedicadas: /api/manutencoes, /api/ordens-servico, /api/lancamentos-os, /api/tipos-manutencao)
  "manutencoes", "ordens_servico", "lancamentos_os", "tipos_manutencao_custom",
]);

function validCol(nome) {
  if (!COLECOES.has(nome)) throw Object.assign(new Error(`colecao_nao_permitida:${nome}`), { status: 400 });
  return nome;
}

// GET /api/collections/:nome
r.get("/:nome", asyncH(async (req, res) => {
  const nome = validCol(req.params.nome);
  const { orderBy: ob, order = "asc", limit = 5000 } = req.query;

  // Filtros: ?where.placa=ABC → data->>'placa' = 'ABC'
  const wh = [], params = [nome];
  for (const [key, val] of Object.entries(req.query)) {
    if (!key.startsWith("where.")) continue;
    const campo = key.slice(6);
    params.push(String(val));
    wh.push(`data->>'${campo.replace(/'/g, "")}' = $${params.length}`);
  }

  const orderSql = ob
    ? `ORDER BY data->>'${String(ob).replace(/'/g, "")}' ${order.toUpperCase() === "DESC" ? "DESC" : "ASC"}`
    : `ORDER BY id`;

  params.push(Math.min(Number(limit) || 5000, 20000));

  const sql = `SELECT id, data, created_at, updated_at FROM documents
               WHERE collection = $1 ${wh.length ? "AND " + wh.join(" AND ") : ""}
               ${orderSql} LIMIT $${params.length}`;
  const rows = await q(sql, params);
  // Retorna no formato firestore-like: [{ id, ...data }]
  const docs = rows.map(r => ({ id: r.id, ...r.data, createdAt: r.data.createdAt || r.created_at, updatedAt: r.data.updatedAt || r.updated_at }));
  res.json({ rows: docs, count: docs.length });
}));

// GET /api/collections/:nome/:id
r.get("/:nome/:id", asyncH(async (req, res) => {
  const nome = validCol(req.params.nome);
  const row = await q1(`SELECT id, data FROM documents WHERE collection = $1 AND id = $2`, [nome, req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ id: row.id, ...row.data });
}));

// POST /api/collections/:nome — upsert por id (equivale setDoc merge OU addDoc)
r.post("/:nome", asyncH(async (req, res) => {
  const nome = validCol(req.params.nome);
  const b = req.body || {};
  const id = b.id || randomUUID();
  const { id: _ignore, ...data } = b;

  // jsonb_deep_merge: preserva sub-objetos (documentos.cnh, endereco, contato…)
  // que o `||` nativo do PG apagava (merge era raso, só top-level).
  const row = await q1(
    `INSERT INTO documents (collection, id, data) VALUES ($1, $2, $3)
     ON CONFLICT (collection, id) DO UPDATE SET data = jsonb_deep_merge(documents.data, EXCLUDED.data)
     RETURNING id, data`,
    [nome, id, JSON.stringify(data)]
  );
  res.status(201).json({ id: row.id, ...row.data });
}));

// PATCH /api/collections/:nome/:id — merge parcial (updateDoc)
r.patch("/:nome/:id", asyncH(async (req, res) => {
  const nome = validCol(req.params.nome);
  const b = req.body || {};
  const row = await q1(
    `UPDATE documents SET data = jsonb_deep_merge(data, $3::jsonb)
     WHERE collection = $1 AND id = $2
     RETURNING id, data`,
    [nome, req.params.id, JSON.stringify(b)]
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ id: row.id, ...row.data });
}));

// PUT /api/collections/:nome/:id — substitui completo (setDoc sem merge)
r.put("/:nome/:id", asyncH(async (req, res) => {
  const nome = validCol(req.params.nome);
  const b = req.body || {};
  const { id: _ignore, ...data } = b;
  const row = await q1(
    `INSERT INTO documents (collection, id, data) VALUES ($1, $2, $3)
     ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data
     RETURNING id, data`,
    [nome, req.params.id, JSON.stringify(data)]
  );
  res.json({ id: row.id, ...row.data });
}));

// DELETE /api/collections/:nome/:id
r.delete("/:nome/:id", asyncH(async (req, res) => {
  const nome = validCol(req.params.nome);
  const row = await q1(`DELETE FROM documents WHERE collection = $1 AND id = $2 RETURNING id`, [nome, req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

// GET /api/collections — lista tudo com contagem (debug/admin)
r.get("/", asyncH(async (req, res) => {
  const rows = await q(`SELECT collection, count(*) as qtd FROM documents GROUP BY collection ORDER BY collection`);
  res.json({ collections: rows });
}));

export default r;
