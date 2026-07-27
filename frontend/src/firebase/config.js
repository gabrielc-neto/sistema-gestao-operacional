import { initializeApp } from "firebase/app";
import { getAuth as getFirebaseAuth } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { auth as vpsAuth } from "../services/authVPS";

// Migração 2026-07-23: Firebase Auth eliminado. JWT próprio (VPS) sempre.
const USE_VPS_AUTH = true;

const firebaseConfig = {
  apiKey: "AIzaSyBUZdqVSvcoHhnSYNK1edtpbJ1_xfQ-DTU",
  authDomain: "pontual-logistica.firebaseapp.com",
  projectId: "pontual-logistica",
  storageBucket: "pontual-logistica.firebasestorage.app",
  messagingSenderId: "814273518229",
  appId: "1:814273518229:web:dba7d5869edfb055d6999c",
  measurementId: "G-3XYB5FR8SH"
};

const app = initializeApp(firebaseConfig);

// Auth: JWT próprio (VPS) OU Firebase Auth conforme flag.
// vpsAuth expõe `auth.currentUser` com `getIdToken()` — compat com resto do código.
export const auth = USE_VPS_AUTH ? vpsAuth : getFirebaseAuth(app);
// Cache em memória (sem IndexedDB persistente) — evita OSs "fantasma" no browser do usuário
// quando conexão cai. Cada nova sessão vê o estado real do servidor.
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});
export const storage = getStorage(app);
export const functions = getFunctions(app, "southamerica-east1");

// Liga ao emulator local APENAS em modo dev (vite dev) E quando o flag estiver setado.
// Build de produção (`npm run build`) tem import.meta.env.DEV=false, então NUNCA conecta no emulator.
if (import.meta.env?.DEV && import.meta.env?.VITE_USE_FUNCTIONS_EMULATOR === "true") {
  // Roteia as Functions pelo proxy do Vite (mesma origem) → emulator em 127.0.0.1:5001.
  // Funciona em localhost, IP da rede e Cloudflare Tunnel sem expor a porta 5001.
  const port = Number(window.location.port) || (window.location.protocol === "https:" ? 443 : 80);
  connectFunctionsEmulator(functions, window.location.hostname, port);

  console.log(`[firebase] Functions emulator via proxy: ${window.location.origin}/pontual-logistica/...`);
}

export default app;
