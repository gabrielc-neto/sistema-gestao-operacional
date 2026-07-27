// Migração 2026-07-23: só JWT próprio. Firebase Auth removido.
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "pontual-dev-secret-troca-em-prod";

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
