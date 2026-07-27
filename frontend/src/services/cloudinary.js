// Migração 2026-07-23: Cloudinary substituído por upload local no VPS.
// Interface mantida (cloudinaryConfigured, uploadArquivo) pra não quebrar callers.
// Backend: POST /api/uploads (multipart) → salva em /var/pontual/uploads/, retorna URL.

import { auth } from "../firebase/config";

const VPS_BASE = import.meta.env?.VITE_PONTUAL_API_URL || "";

export function cloudinaryConfigured() {
  return true; // Sempre disponível (backend local)
}

export async function uploadArquivo(file, { folder = "geral" } = {}) {
  if (!file) throw new Error("Nenhum arquivo selecionado.");

  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  if (!token) throw new Error("Não autenticado.");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const resp = await fetch(`${VPS_BASE}/api/uploads?folder=${encodeURIComponent(folder)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data?.error || `Upload falhou (HTTP ${resp.status})`);
    }
    // Interface idêntica ao antigo Cloudinary
    return {
      url: data.url,
      publicId: data.publicId,
      tipo: data.tipo,
      tamanho: data.tamanho,
      nome: data.nome,
      uploadedAt: data.uploadedAt,
    };
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === "AbortError") throw new Error("Timeout — arquivo grande demais ou internet lenta.");
    throw e;
  }
}
