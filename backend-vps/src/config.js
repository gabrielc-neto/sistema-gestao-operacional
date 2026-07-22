// Config central do backend. Lê .env.
import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "production",

  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "pontual",
    user: process.env.DB_USER || "pontual_app",
    password: process.env.DB_PASS || "",
    max: parseInt(process.env.DB_POOL_MAX || "20", 10),
    idleTimeoutMillis: 30_000,
  },

  uploadsDir: process.env.UPLOAD_DIR || "/var/pontual/uploads",
  uploadsBaseUrl: process.env.UPLOADS_BASE_URL || "/uploads",
  uploadsMaxBytes: parseInt(process.env.UPLOADS_MAX_BYTES || String(15 * 1024 * 1024), 10),

  // Firebase Admin — usa serviceAccountKey em GOOGLE_APPLICATION_CREDENTIALS
  // ou caminho explícito em FIREBASE_SERVICE_ACCOUNT
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS || "",

  cors: {
    origins: (process.env.CORS_ORIGINS || "http://localhost:5175,https://logistica.pontualpetroleo.com.br,https://srv1464919.hstgr.cloud").split(","),
  },

  auth: {
    // Sprint 1: usa Firebase Auth (backend só valida idToken via firebase-admin)
    // Sprint 2: vira JWT próprio
    mode: process.env.AUTH_MODE || "firebase",
  },
};
