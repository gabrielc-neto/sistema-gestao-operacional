import { httpsCallable } from "firebase/functions";
import { functions } from "./config";

const isDev =
  import.meta.env?.DEV && import.meta.env?.VITE_USE_FUNCTIONS_EMULATOR === "true";

const REGION = "southamerica-east1";
const PROJECT_ID = "pontual-logistica";

/**
 * Chama uma Firebase Callable Function.
 * Em dev: fetch direto pelo proxy do Vite (evita incompatibilidade do SDK v12 com firebase-functions v6).
 * Em prod: httpsCallable normal.
 */
export async function callFunction(name, params) {
  if (isDev) {
    // Path relativo — o proxy do Vite (vite.config.js) reencaminha pra 127.0.0.1:5001.
    // Funciona em localhost, LAN e via túnel público (Cloudflare/localtunnel) sem expor a 5001.
    const url = `/${PROJECT_ID}/${REGION}/${name}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dev-bypass": "true",
      },
      body: JSON.stringify({ data: params ?? null }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error?.message || `HTTP ${res.status}`);
    }
    // firebase-functions v6 retorna { result: ... }; versões antigas retornam { data: ... }
    return { data: json.result ?? json.data };
  }

  return httpsCallable(functions, name)(params);
}
