// Cliente HTTP JWT reutilizavel pro backend VPS (Postgres via Express).
// Reutiliza o token salvo pelo authVPS em localStorage.

const BASE       = import.meta.env?.VITE_PONTUAL_API_URL || "";
const KEY_TOKEN  = "pontual_auth_token";

function token() {
  try { return localStorage.getItem(KEY_TOKEN); } catch { return null; }
}

async function req(path, opts = {}) {
  const t = token();
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json")
    ? await res.json().catch(() => ({}))
    : await res.text();
  if (!res.ok) {
    const err = new Error(typeof body === "object" ? body?.error || `HTTP ${res.status}` : `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export function apiGet(path)          { return req(path); }
export function apiPost(path, data)   { return req(path, { method: "POST",   body: JSON.stringify(data) }); }
export function apiPut(path, data)    { return req(path, { method: "PUT",    body: JSON.stringify(data) }); }
export function apiDelete(path)       { return req(path, { method: "DELETE" }); }

// Upload multipart (FormData). NÃO seta Content-Type — o browser cuida com boundary.
export async function apiUpload(path, formData) {
  const t = token();
  const headers = {};
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: formData, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}
