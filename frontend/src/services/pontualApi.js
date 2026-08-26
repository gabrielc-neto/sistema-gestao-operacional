// Cliente HTTP pro backend Pontual VPS.
// Envia token JWT proprio (authVPS) — nao Firebase.
// Migracao 2026-07-23: sistema mudou de Firebase Auth pra JWT proprio,
// mas esta funcao continuou lendo Firebase.getIdToken() (bug silencioso
// ate Wesley perder form de OS-00024 em 2026-08-26).
//
// Base URL configurável via VITE_PONTUAL_API_URL.
// Default aponta pra http://srv1464919.hstgr.cloud (VPS Hostinger).
//
// Uso:
//   import { api } from "@/services/pontualApi";
//   const rows = await api.list("manutencoes", { placa: "ABC-1234" });
//   await api.create("manutencoes", { placa, tipo, ... });

import { getToken as getVpsToken } from "./authVPS";

// Vazio = URL relativa (mesma origem HTTPS). Evita mixed content.
const BASE = import.meta.env.VITE_PONTUAL_API_URL ?? "";

async function getToken() {
  return getVpsToken();
}

// Backup de submissoes perigosas (POST/PATCH/DELETE) em localStorage.
// Se 401 (token expirado) o payload fica preservado ate o user relogar e
// clicar "Reenviar" no banner (componente RecuperarPendente). TTL 24h.
const KEY_PENDING = "pontual_pending_writes";

function loadPending() {
  try { return JSON.parse(localStorage.getItem(KEY_PENDING) || "[]"); }
  catch { return []; }
}
function savePending(arr) {
  try {
    // Descarta itens >24h
    const agora = Date.now();
    const filtrado = arr.filter(it => (agora - (it.at || 0)) < 24 * 3600 * 1000);
    localStorage.setItem(KEY_PENDING, JSON.stringify(filtrado));
  } catch {}
}
export function listarPendentes() { return loadPending(); }
export function descartarPendente(id) {
  savePending(loadPending().filter(it => it.id !== id));
}

async function request(path, opts = {}) {
  const token = await getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };
  const method = (opts.method || "GET").toUpperCase();
  const ehEscrita = method !== "GET" && method !== "HEAD";
  const resp = await fetch(`${BASE}${path}`, { ...opts, headers });
  const isJson = (resp.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await resp.json().catch(() => ({})) : await resp.text();
  if (!resp.ok) {
    // Salva payload de escrita quando token expirou — user relogar e reenviar
    if (resp.status === 401 && ehEscrita && opts.body) {
      const pend = loadPending();
      pend.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: Date.now(),
        path, method,
        body: opts.body,       // string JSON
        contentType: headers["Content-Type"],
      });
      savePending(pend);
    }
    const msgBase = (body && body.message) || (body && body.error) || `HTTP ${resp.status}`;
    const msg = resp.status === 401
      ? `Sessao expirada. Seus dados foram salvos localmente — faca login novamente e clique "Reenviar" no banner amarelo pra concluir.`
      : msgBase;
    const err = new Error(msg); err.status = resp.status; err.body = body;
    throw err;
  }
  return body;
}

// Reenvia 1 pendente com token atual. Devolve {ok, err}. Chamado pelo banner.
export async function reenviarPendente(id) {
  const pend = loadPending();
  const it = pend.find(p => p.id === id);
  if (!it) return { ok: false, err: "Pendente nao encontrado" };
  try {
    await request(it.path, { method: it.method, body: it.body });
    descartarPendente(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

// ─── API genérica ─────────────────────────────────────────────
// Recurso pode ser: manutencoes, ordens-servico, lancamentos-os, tipos-manutencao
export const api = {
  async list(recurso, query = {}) {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== ""));
    const suffix = qs.toString() ? `?${qs}` : "";
    const r = await request(`/api/${recurso}${suffix}`);
    return r.rows || [];
  },

  async get(recurso, id) {
    return await request(`/api/${recurso}/${encodeURIComponent(id)}`);
  },

  async create(recurso, payload) {
    return await request(`/api/${recurso}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(recurso, id, patch) {
    return await request(`/api/${recurso}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async remove(recurso, id) {
    return await request(`/api/${recurso}/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

// ─── Upload de anexos — substitui services/cloudinary.js ───────
export async function uploadArquivoVPS(file, { folder = "manutencao" } = {}) {
  const token = await getToken();
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const resp = await fetch(`${BASE}/api/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!resp.ok) throw new Error(`upload falhou (HTTP ${resp.status})`);
  const data = await resp.json();
  // Compatível com formato antigo (cloudinary): {url, publicId, tipo, tamanho, nome, uploadedAt}
  return data;
}

// ─── Helpers de Auth JWT (admin de usuários) ──────────────────
export const authApi = {
  listUsers: async () => (await request("/api/auth/users")).rows || [],
  createUser: (payload) => request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id, patch) => request(`/api/auth/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteUser: (id) => request(`/api/auth/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  resetSenha: (id, novaSenha) => request(`/api/auth/users/${encodeURIComponent(id)}/reset-senha`, {
    method: "POST", body: JSON.stringify({ novaSenha }),
  }),
};

// ─── Helpers específicos do módulo manutenção ─────────────────
export const manutApi = {
  listar:  (filtros) => api.list("manutencoes", filtros),
  salvar:  (payload) => api.create("manutencoes", payload),
  atualizar: (id, patch) => api.update("manutencoes", id, patch),
  excluir: (id) => api.remove("manutencoes", id),
};

export const osApi = {
  listar: (filtros) => api.list("ordens-servico", filtros),
  proximoNumero: async () => (await request("/api/ordens-servico/proximo-numero")).numero,
  salvar: (payload) => api.create("ordens-servico", payload),
  atualizar: (id, patch) => api.update("ordens-servico", id, patch),
  excluir: (id) => api.remove("ordens-servico", id),
};

export const lancosApi = {
  listar: (filtros) => api.list("lancamentos-os", filtros),
  salvar: (payload) => api.create("lancamentos-os", payload),
  atualizar: (id, patch) => api.update("lancamentos-os", id, patch),
  excluir: (id) => api.remove("lancamentos-os", id),
};

export const tiposApi = {
  listar: () => api.list("tipos-manutencao"),
  salvar: (payload) => api.create("tipos-manutencao", payload),
  atualizar: (id, patch) => api.update("tipos-manutencao", id, patch),
  excluir: (id) => api.remove("tipos-manutencao", id),
};
