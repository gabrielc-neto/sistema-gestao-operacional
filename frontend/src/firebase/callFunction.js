// Migração 2026-07-23: sempre bate no VPS. Firebase Functions foi eliminada.
// Mantém interface `callFunction(name, params)` compatível com Firebase Callable
// (retorna { data: ... }) pra não quebrar o código existente.

import { auth } from "./config";

const VPS_BASE = import.meta.env?.VITE_PONTUAL_API_URL || "";

// Mapa: nome da função → { method, path } no backend VPS
const VPS_MAP = {
  sascarPosicoes:      { method: "POST", path: "/api/sascar/posicoes" },
  sascarVeiculos:      { method: "GET",  path: "/api/sascar/veiculos" },
  jornadaDia:          { method: "POST", path: "/api/jornada/dia" },
  jornadaPeriodo:      { method: "POST", path: "/api/jornada/periodo" },
  intranetGate:        { method: "POST", path: "/api/intranet-gate" },
};

export async function callFunction(name, params) {
  const map = VPS_MAP[name];
  if (!map) {
    throw new Error(`Função não mapeada no VPS: ${name}. Adicione em src/firebase/callFunction.js`);
  }

  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${VPS_BASE}${map.path}`;
  const opts = { method: map.method, headers };
  if (map.method !== "GET") opts.body = JSON.stringify(params ?? {});

  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
  }
  return { data: body };
}
