import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

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
export const db   = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "southamerica-east1");

// Liga ao emulator local APENAS em modo dev (vite dev) E quando o flag estiver setado.
// Build de produção (`npm run build`) tem import.meta.env.DEV=false, então NUNCA conecta no emulator.
if (import.meta.env?.DEV && import.meta.env?.VITE_USE_FUNCTIONS_EMULATOR === "true") {
  // No PC usa localhost; no celular usa o IP da rede do servidor (mesmo host onde Vite responde)
  const isLoopback = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const emuHost = isLoopback ? "127.0.0.1" : window.location.hostname;
  connectFunctionsEmulator(functions, emuHost, 5001);

  console.log(`[firebase] Functions emulator: ${emuHost}:5001`);
}

export default app;
