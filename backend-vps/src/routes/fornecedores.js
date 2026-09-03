// Rotas CRUD pra tabela `fornecedores` (usinas/distribuidoras de combustivel).
// Padrao seguido de ordens-servico.js: camelCase no body, snake_case no PG, toCamel/pick.
import { Router } from "express";
import { randomUUID } from "crypto";
import { q, q1 } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";

const r = Router();
r.use(requireAuth);

function toCamel(row) {
  if (!row) return row;
  return {
    ...row,
    razaoSocial:       row.razao_social,
    nomeFantasia:      row.nome_fantasia,
    inscricaoEstadual: row.inscricao_estadual,
    registroAnp:       row.registro_anp,
    bancoAgencia:      row.banco_agencia,
    bancoConta:        row.banco_conta,
    bancoCnpj:         row.banco_cnpj,
    criadoPor:         row.criado_por,
    criadoEm:          row.criado_em,
    atualizadoPor:     row.atualizado_por,
    atualizadoEm:      row.atualizado_em,
  };
}

function pick(body, camel, snake) {
  if (camel in body) return body[camel];
  if (snake in body) return body[snake];
  return undefined;
}

// GET /api/fornecedores?ativo=true&busca=coopcana
r.get("/", asyncH(async (req, res) => {
  const { ativo, busca, limit = 500 } = req.query;
  const wh = [], params = [];
  if (ativo != null) { params.push(String(ativo) === "true"); wh.push(`ativo = $${params.length}`); }
  if (busca) {
    params.push(`%${busca}%`);
    wh.push(`(razao_social ILIKE $${params.length} OR nome_fantasia ILIKE $${params.length} OR cnpj ILIKE $${params.length})`);
  }
  const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
  params.push(Math.min(Number(limit) || 500, 1000));
  const rows = await q(
    `SELECT * FROM fornecedores ${where} ORDER BY razao_social ASC LIMIT $${params.length}`,
    params
  );
  res.json({ rows: rows.map(toCamel), count: rows.length });
}));

// GET /api/fornecedores/por-cnpj/:cnpj
r.get("/por-cnpj/:cnpj", asyncH(async (req, res) => {
  const cnpjNorm = String(req.params.cnpj).replace(/\D/g, "");
  const row = await q1(
    `SELECT * FROM fornecedores WHERE regexp_replace(cnpj, '\\D', '', 'g') = $1`,
    [cnpjNorm]
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(toCamel(row));
}));

// GET /api/fornecedores/:id
r.get("/:id", asyncH(async (req, res) => {
  const row = await q1(`SELECT * FROM fornecedores WHERE id = $1`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(toCamel(row));
}));

// POST /api/fornecedores
r.post("/", asyncH(async (req, res) => {
  const b = req.body || {};
  const razaoSocial = pick(b, "razaoSocial", "razao_social");
  const cnpj = b.cnpj;
  if (!razaoSocial || !cnpj) {
    return res.status(400).json({ error: "campos_obrigatorios", detail: "razaoSocial, cnpj" });
  }
  const id = b.id || randomUUID();
  const row = await q1(`
    INSERT INTO fornecedores
      (id, razao_social, nome_fantasia, cnpj, inscricao_estadual, registro_anp,
       endereco, numero, bairro, complemento, cidade, uf, cep, telefone, email,
       banco, banco_agencia, banco_conta, banco_cnpj, ativo, criado_por)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
       $16, $17, $18, $19, COALESCE($20, TRUE), $21)
    ON CONFLICT (cnpj) DO UPDATE SET
      razao_social       = EXCLUDED.razao_social,
      nome_fantasia      = EXCLUDED.nome_fantasia,
      inscricao_estadual = EXCLUDED.inscricao_estadual,
      registro_anp       = EXCLUDED.registro_anp,
      endereco           = EXCLUDED.endereco,
      numero             = EXCLUDED.numero,
      bairro             = EXCLUDED.bairro,
      complemento        = EXCLUDED.complemento,
      cidade             = EXCLUDED.cidade,
      uf                 = EXCLUDED.uf,
      cep                = EXCLUDED.cep,
      telefone           = EXCLUDED.telefone,
      email              = EXCLUDED.email,
      banco              = EXCLUDED.banco,
      banco_agencia      = EXCLUDED.banco_agencia,
      banco_conta        = EXCLUDED.banco_conta,
      banco_cnpj         = EXCLUDED.banco_cnpj,
      atualizado_por     = EXCLUDED.criado_por,
      atualizado_em      = NOW()
    RETURNING *
  `, [
    id, razaoSocial, pick(b, "nomeFantasia", "nome_fantasia") || null, cnpj,
    pick(b, "inscricaoEstadual", "inscricao_estadual") || null,
    pick(b, "registroAnp", "registro_anp") || null,
    b.endereco || null, b.numero || null, b.bairro || null, b.complemento || null,
    b.cidade || null, b.uf || null, b.cep || null, b.telefone || null, b.email || null,
    b.banco || null,
    pick(b, "bancoAgencia", "banco_agencia") || null,
    pick(b, "bancoConta", "banco_conta") || null,
    pick(b, "bancoCnpj", "banco_cnpj") || null,
    b.ativo, req.user?.nome || req.user?.email || "sistema"
  ]);
  res.status(201).json(toCamel(row));
}));

// PUT /api/fornecedores/:id
r.put("/:id", asyncH(async (req, res) => {
  const b = req.body || {};
  const existe = await q1(`SELECT id FROM fornecedores WHERE id = $1`, [req.params.id]);
  if (!existe) return res.status(404).json({ error: "not_found" });

  const row = await q1(`
    UPDATE fornecedores SET
      razao_social       = COALESCE($2, razao_social),
      nome_fantasia      = $3,
      inscricao_estadual = $4,
      registro_anp       = $5,
      endereco           = $6, numero  = $7, bairro = $8, complemento = $9,
      cidade             = $10, uf     = $11, cep   = $12,
      telefone           = $13, email  = $14,
      banco              = $15, banco_agencia = $16, banco_conta = $17, banco_cnpj = $18,
      ativo              = COALESCE($19, ativo),
      atualizado_por     = $20,
      atualizado_em      = NOW()
    WHERE id = $1
    RETURNING *
  `, [
    req.params.id,
    pick(b, "razaoSocial", "razao_social"),
    pick(b, "nomeFantasia", "nome_fantasia") || null,
    pick(b, "inscricaoEstadual", "inscricao_estadual") || null,
    pick(b, "registroAnp", "registro_anp") || null,
    b.endereco || null, b.numero || null, b.bairro || null, b.complemento || null,
    b.cidade || null, b.uf || null, b.cep || null,
    b.telefone || null, b.email || null,
    b.banco || null,
    pick(b, "bancoAgencia", "banco_agencia") || null,
    pick(b, "bancoConta", "banco_conta") || null,
    pick(b, "bancoCnpj", "banco_cnpj") || null,
    b.ativo,
    req.user?.nome || req.user?.email || "sistema"
  ]);
  res.json(toCamel(row));
}));

// DELETE /api/fornecedores/:id (soft delete → seta ativo=false)
r.delete("/:id", asyncH(async (req, res) => {
  const row = await q1(
    `UPDATE fornecedores SET ativo = FALSE, atualizado_em = NOW(),
                             atualizado_por = $2
     WHERE id = $1 RETURNING id`,
    [req.params.id, req.user?.nome || req.user?.email || "sistema"]
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

export default r;
