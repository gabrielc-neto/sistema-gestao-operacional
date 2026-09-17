// Migração 2026-07-23: só JWT próprio. Firebase Auth removido.
import jwt from "jsonwebtoken";
import { q1 } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("[auth-middleware] JWT_SECRET ausente ou < 32 chars — defina env var forte antes do boot");
}

// Middleware: exige Authorization: Bearer <jwt>
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) return res.status(401).json({ error: "missing_token" });
  const token = match[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.uid) return res.status(401).json({ error: "invalid_token" });
    req.user = {
      uid: decoded.uid,
      id: decoded.uid,
      email: decoded.email,
      is_super_admin: !!decoded.sa,
      _source: "jwt",
    };
    return next();
  } catch (e) {
    return res.status(401).json({ error: "invalid_token", detail: e.message });
  }
}

// Cache leve pra evitar 2 queries por request em user restrito. TTL 60s.
const _cargoCache = new Map(); // uid → { at, cargo }
const CARGO_TTL_MS = 60_000;

async function fetchCargoDoUsuario(uid) {
  const hit = _cargoCache.get(uid);
  if (hit && Date.now() - hit.at < CARGO_TTL_MS) return hit.cargo;
  const user = await q1(`SELECT cargo_id FROM usuarios_auth WHERE id = $1`, [uid]);
  if (!user?.cargo_id) { _cargoCache.set(uid, { at: Date.now(), cargo: null }); return null; }
  const cargo = await q1(`SELECT data FROM documents WHERE collection='cargos' AND id = $1`, [user.cargo_id]);
  const c = cargo?.data || null;
  _cargoCache.set(uid, { at: Date.now(), cargo: c });
  return c;
}

// Middleware factory: bloqueia SÓ usuários com cargo `menu_restrito=true` que não têm a permissão.
// Users sem menu_restrito e super admins passam livre — evita regressão.
// Uso: r.use(requireMenuRestrito("frota.ver"))
export function requireMenuRestrito(...perms) {
  return async (req, res, next) => {
    try {
      if (!req.user?.uid) return res.status(401).json({ error: "missing_auth" });
      if (req.user.is_super_admin) return next();
      const cargo = await fetchCargoDoUsuario(req.user.uid);
      if (!cargo || !cargo.menu_restrito) return next(); // cargo normal / sem cargo → passa
      const cargoPerms = Array.isArray(cargo.permissoes) ? cargo.permissoes : [];
      const ok = perms.some(p => cargoPerms.includes(p));
      if (!ok) return res.status(403).json({ error: "forbidden", need: perms });
      return next();
    } catch (e) {
      console.error("[requireMenuRestrito] erro:", e);
      return res.status(500).json({ error: "auth_check_failed" });
    }
  };
}

// Middleware opcional: passa se tiver token, mas não bloqueia
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) return next();
  try {
    const decoded = jwt.verify(match[1], JWT_SECRET);
    if (decoded?.uid) {
      req.user = { uid: decoded.uid, id: decoded.uid, email: decoded.email, is_super_admin: !!decoded.sa };
    }
  } catch { /* ignora */ }
  next();
}
