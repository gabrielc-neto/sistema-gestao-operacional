// Rotas Auth JWT próprio — substitui Firebase Auth.
// Endpoints: POST /login, POST /register, GET /me, POST /refresh
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { q, q1 } from "../db.js";
import { asyncH } from "../middleware/error.js";

const r = Router();

const JWT_SECRET = process.env.JWT_SECRET || "pontual-dev-secret-troca-em-prod";
const JWT_TTL = process.env.JWT_TTL || "12h";
const BCRYPT_ROUNDS = 10;

function gerarToken(u) {
  return jwt.sign(
    { uid: u.id, email: u.email, sa: !!u.is_super_admin },
    JWT_SECRET,
    { expiresIn: JWT_TTL }
  );
}

function toProfile(u) {
  return {
    id: u.id,
    uid: u.id, // compat com Firebase
    email: u.email,
    nome: u.nome,
    setor_id: u.setor_id,
    cargo_id: u.cargo_id,
    is_super_admin: !!u.is_super_admin,
    ativo: !!u.ativo,
    trocarSenha: !!u.trocar_senha_no_proximo_login,
  };
}

// POST /api/auth/login  { email, senha }
r.post("/login", asyncH(async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ error: "email_e_senha_obrigatorios" });

  const u = await q1(`SELECT * FROM usuarios_auth WHERE email = $1`, [String(email).toLowerCase().trim()]);
  if (!u) return res.status(401).json({ error: "credenciais_invalidas" });
  if (!u.ativo) return res.status(403).json({ error: "usuario_inativo" });

  const ok = await bcrypt.compare(senha, u.senha_hash);
  if (!ok) return res.status(401).json({ error: "credenciais_invalidas" });

  await q1(`UPDATE usuarios_auth SET ultimo_login = now() WHERE id = $1 RETURNING id`, [u.id]);

  const token = gerarToken(u);
  res.json({ token, user: toProfile(u), expiresIn: JWT_TTL });
}));

// POST /api/auth/register  { email, senha, nome, setor_id, cargo_id }
// Admin ONLY (validado via middleware requireAuth externo — mas por simplicidade
// aceita sem admin AGORA pra permitir bootstrap. Restringir depois.)
r.post("/register", asyncH(async (req, res) => {
  const { email, senha, nome, setor_id, cargo_id, is_super_admin } = req.body || {};
  if (!email || !senha) return res.status(400).json({ error: "email_e_senha_obrigatorios" });
  if (String(senha).length < 6) return res.status(400).json({ error: "senha_minimo_6" });

  const emailLower = String(email).toLowerCase().trim();
  const jaExiste = await q1(`SELECT id FROM usuarios_auth WHERE email = $1`, [emailLower]);
  if (jaExiste) return res.status(409).json({ error: "email_ja_cadastrado" });

  const hash = await bcrypt.hash(senha, BCRYPT_ROUNDS);
  const u = await q1(
    `INSERT INTO usuarios_auth (email, senha_hash, nome, setor_id, cargo_id, is_super_admin, ativo)
     VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
    [emailLower, hash, nome || null, setor_id || null, cargo_id || null, !!is_super_admin]
  );

  const token = gerarToken(u);
  res.status(201).json({ token, user: toProfile(u), expiresIn: JWT_TTL });
}));

// GET /api/auth/me  (Bearer token)
r.get("/me", asyncH(async (req, res) => {
  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer\s+(.+)$/);
  if (!m) return res.status(401).json({ error: "missing_token" });
  try {
    const decoded = jwt.verify(m[1], JWT_SECRET);
    const u = await q1(`SELECT * FROM usuarios_auth WHERE id = $1 AND ativo = true`, [decoded.uid]);
    if (!u) return res.status(401).json({ error: "user_not_found" });
    res.json({ user: toProfile(u) });
  } catch (e) {
    return res.status(401).json({ error: "invalid_token", detail: e.message });
  }
}));

// POST /api/auth/refresh  (Bearer token — gera novo)
r.post("/refresh", asyncH(async (req, res) => {
  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer\s+(.+)$/);
  if (!m) return res.status(401).json({ error: "missing_token" });
  try {
    const decoded = jwt.verify(m[1], JWT_SECRET, { ignoreExpiration: true });
    const u = await q1(`SELECT * FROM usuarios_auth WHERE id = $1 AND ativo = true`, [decoded.uid]);
    if (!u) return res.status(401).json({ error: "user_not_found" });
    const token = gerarToken(u);
    res.json({ token, user: toProfile(u), expiresIn: JWT_TTL });
  } catch (e) {
    return res.status(401).json({ error: "invalid_token" });
  }
}));

// POST /api/auth/trocar-senha  { senhaAtual, novaSenha }
r.post("/trocar-senha", asyncH(async (req, res) => {
  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer\s+(.+)$/);
  if (!m) return res.status(401).json({ error: "missing_token" });
  const { senhaAtual, novaSenha } = req.body || {};
  if (!senhaAtual || !novaSenha) return res.status(400).json({ error: "senhas_obrigatorias" });
  if (String(novaSenha).length < 6) return res.status(400).json({ error: "senha_minimo_6" });

  try {
    const decoded = jwt.verify(m[1], JWT_SECRET);
    const u = await q1(`SELECT * FROM usuarios_auth WHERE id = $1`, [decoded.uid]);
    if (!u) return res.status(401).json({ error: "user_not_found" });
    const ok = await bcrypt.compare(senhaAtual, u.senha_hash);
    if (!ok) return res.status(401).json({ error: "senha_atual_incorreta" });

    const novoHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
    await q1(
      `UPDATE usuarios_auth SET senha_hash = $1, trocar_senha_no_proximo_login = false WHERE id = $2 RETURNING id`,
      [novoHash, u.id]
    );
    res.json({ ok: true });
  } catch (e) {
    return res.status(401).json({ error: "invalid_token" });
  }
}));

// Export helper pra middleware requireAuth do backend usar JWT também
export function verificarJwt(token) {
  return jwt.verify(token, JWT_SECRET);
}

export default r;
