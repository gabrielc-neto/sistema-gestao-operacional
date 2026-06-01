import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

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

export const auth = getAuth(app);
// Persistência offline multi-tab: 2ª carga em diante vem do IndexedDB local (instantâneo),
// sincroniza em background. Funciona em todas as páginas que leem do `db`.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const storage = getStorage(app);
export const functions = getFunctions(app, "southamerica-east1");

// Liga ao emulator local APENAS em modo dev (vite dev) E quando o flag estiver setado.
// Build de produção (`npm run build`) tem import.meta.env.DEV=false, então NUNCA conecta no emulator.
if (import.meta.env?.DEV && import.meta.env?.VITE_USE_FUNCTIONS_EMULATOR === "true") {
  // Roteia as Functions pela MESMA origem da página em vez de apontar direto pra host:5001.
  // O proxy do Vite (vite.config.js) encaminha /pontual-logistica/* pro emulator em 127.0.0.1:5001.
  // Assim funciona igual em localhost, IP da rede E via Cloudflare Tunnel (HTTPS, sem porta 5001
  // exposta e sem mixed-content). connectFunctionsEmulator forçaria http://host:5001 e quebraria fora.
  functions.emulatorOrigin = window.location.origin;

  console.log(`[firebase] Functions via proxy: ${window.location.origin}/pontual-logistica/...`);
}

export default app;
