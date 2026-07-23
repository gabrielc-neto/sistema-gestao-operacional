import { httpsCallable } from "firebase/functions";
import { functions, auth } from "./config";

const isDev =
  import.meta.env?.DEV && import.meta.env?.VITE_USE_FUNCTIONS_EMULATOR === "true";

// Se VITE_USE_VPS_SASCAR=true, roteia funções SASCAR/jornada/CTA pro backend VPS.
// Outras Firebase functions (intranetGate etc) continuam Firebase.
const USE_VPS_SASCAR = String(import.meta.env?.VITE_USE_VPS_SASCAR || "").toLowerCase() === "true";
const VPS_BASE = import.meta.env?.VITE_PONTUAL_API_URL || "";

// Mapa: nome da Firebase Callable → endpoint REST do VPS (relativo)
const VPS_MAP = {
  sascarPosicoes: { method: "POST", path: "/api/sascar/posicoes" },
  sascarVeiculos: { method: "GET",  path: "/api/sascar/veiculos" },
  jornadaDia:     { method: "POST", path: "/api/jornada/dia" },
  jornadaPeriodo: { method: "POST", path: "/api/jornada/periodo" },
  // CTA sincronização pode ser adicionada aqui quando frontend chamar
};

async function chamarVPS(nome, params) {
  const map = VPS_MAP[nome];
  if (!map) throw new Error(`VPS não implementa: ${nome}`);
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${VPS_BASE}${map.path}`;
  const opts = { method: map.method, headers };
  if (map.method === "POST") opts.body = JSON.stringify(params ?? {});
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
  // Formato Firebase Callable espera { data: ... }
  return { data: body };
}

const REGION = "southamerica-east1";
const PROJECT_ID = "pontual-logistica";

/**
 * Chama uma Firebase Callable Function.
 * Em dev: fetch direto pelo proxy do Vite (evita incompatibilidade do SDK v12 com firebase-functions v6).
 * Em prod: httpsCallable normal.
 */
export async function callFunction(name, params) {
  // VPS override — se flag ativa e função mapeada, usa REST
  if (USE_VPS_SASCAR && VPS_MAP[name]) {
    return await chamarVPS(name, params);
  }
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
