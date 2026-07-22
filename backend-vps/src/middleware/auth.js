// Middleware de autenticação — Sprint 1 usa Firebase Auth (backend valida idToken).
// Sprint 2 migra pra JWT próprio (basta trocar a implementação aqui).
import admin from "firebase-admin";
import { readFileSync, existsSync } from "node:fs";
import { config } from "../config.js";

// Inicializa Firebase Admin se ainda não foi
if (!admin.apps.length) {
  const sa = config.firebaseServiceAccount;
  if (sa && existsSync(sa)) {
    const credential = admin.credential.cert(JSON.parse(readFileSync(sa, "utf8")));
    admin.initializeApp({ credential });
    console.log("[auth] Firebase Admin inicializado com serviceAccountKey");
  } else {
    console.warn("[auth] FIREBASE_SERVICE_ACCOUNT não configurado — auth em modo permissivo (dev)");
  }
}

// Middleware: exige Authorization: Bearer <idToken>
export async function requireAuth(req, res, next) {
  // Modo permissivo se Firebase Admin não inicializou (dev local sem credenciais)
  if (!admin.apps.length) {
    req.user = { uid: "dev", email: "dev@local", modo: "permissivo" };
    return next();
  }

  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) return res.status(401).json({ error: "missing_token" });

  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      claims: decoded,
    };
    next();
  } catch (e) {
    console.warn("[auth] token inválido:", e.message);
    return res.status(401).json({ error: "invalid_token", detail: e.message });
  }
}

// Middleware opcional: passa se tiver token, mas não bloqueia
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match || !admin.apps.length) return next();
  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name };
  } catch { /* ignora */ }
  next();
}
