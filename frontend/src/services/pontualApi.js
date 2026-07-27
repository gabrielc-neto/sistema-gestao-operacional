// Cliente HTTP pro backend Pontual VPS.
// Substitui chamadas Firestore por REST + envia token Firebase Auth.
//
// Base URL configurável via VITE_PONTUAL_API_URL.
// Default aponta pra http://srv1464919.hstgr.cloud (VPS Hostinger).
//
// Uso:
//   import { api } from "@/services/pontualApi";
//   const rows = await api.list("manutencoes", { placa: "ABC-1234" });
//   await api.create("manutencoes", { placa, tipo, ... });

import { auth } from "../firebase/config";
import { usandoSupabase } from "./supabase";
import * as sb from "./supabaseData";

const BASE = import.meta.env.VITE_PONTUAL_API_URL || "http://srv1464919.hstgr.cloud";

async function getToken() {
  const user = auth?.currentUser;
  if (!user) return null;
  try { return await user.getIdToken(); } catch { return null; }
}

async function request(path, opts = {}) {
  const token = await getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };
  const resp = await fetch(`${BASE}${path}`, { ...opts, headers });
  const isJson = (resp.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await resp.json().catch(() => ({})) : await resp.text();
  if (!resp.ok) {
    const msg = (body && body.message) || (body && body.error) || `HTTP ${resp.status}`;
    const err = new Error(msg); err.status = resp.status; err.body = body;
    throw err;
  }
  return body;
}

// ─── API genérica ─────────────────────────────────────────────
// Recurso pode ser: manutencoes, ordens-servico, lancamentos-os, tipos-manutencao
// e collections/<nome> (as coleções herdadas do Firestore).
//
// ESTE OBJETO É O PONTO ÚNICO DE TROCA DE BACKEND. Todas as fontes de dados
// (genericDataSource, frotaDataSource, manutencaoDataSource) passam por aqui, e
// as 30+ telas passam por elas. Por isso o Supabase entra AQUI, e não tela a
// tela: com a chave virada, o app inteiro muda de banco sem que nenhuma página
// saiba da diferença.
//
// O contrato preservado, em detalhe, é o da API da VPS:
//   list   → [{ id, ...data }]      (documento achatado, não { id, data })
//   get    → { id, ...data } ou erro 404 com .status
//   create → upsert com MERGE do JSON já existente
//   update → merge parcial (nunca substitui o documento inteiro)
export const api = {
  async list(recurso, query = {}) {
    if (usandoSupabase()) return await sb.list(recurso, query);
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== ""));
    const suffix = qs.toString() ? `?${qs}` : "";
    const r = await request(`/api/${recurso}${suffix}`);
    return r.rows || [];
  },

  async get(recurso, id) {
    if (usandoSupabase()) return await sb.get(recurso, id);
    return await request(`/api/${recurso}/${encodeURIComponent(id)}`);
  },

  async create(recurso, payload) {
    if (usandoSupabase()) return await sb.create(recurso, payload);
    return await request(`/api/${recurso}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(recurso, id, patch) {
    if (usandoSupabase()) return await sb.update(recurso, id, patch);
    return await request(`/api/${recurso}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async remove(recurso, id) {
    if (usandoSupabase()) return await sb.remove(recurso, id);
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
