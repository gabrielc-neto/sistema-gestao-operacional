// Utilitários do módulo de Compras (propostas de gastos + valores comprados).
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";

// ---------- Dinheiro ----------
export function fmtBRL(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtBRLcurto(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1_000_000) return "R$ " + (v / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (Math.abs(v) >= 1_000) return "R$ " + (v / 1_000).toFixed(1).replace(".", ",") + "k";
  return fmtBRL(v);
}

// "80000" (digitado) -> "800,00"  (máscara de campo)
export function maskMoeda(str) {
  const digits = String(str || "").replace(/\D/g, "");
  if (!digits) return "";
  const n = parseInt(digits, 10);
  return (n / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "1.234,56" (mascarado) -> 1234.56 (número)
export function parseMoeda(str) {
  if (typeof str === "number") return str;
  const digits = String(str || "").replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

// ---------- Status da proposta ----------
// Só fica "aprovada" quando Diretoria E Superintendência aprovam.
// Se qualquer uma reprovar, vira "reprovada".
export function statusProposta(data) {
  const dir = data?.aprovacao?.diretoria?.status || "pendente";
  const sup = data?.aprovacao?.superintendencia?.status || "pendente";
  if (dir === "reprovado" || sup === "reprovado") return "reprovada";
  if (dir === "aprovado" && sup === "aprovado") return "aprovada";
  if (dir === "aprovado" || sup === "aprovado") return "em_analise";
  return "pendente";
}

export const STATUS_META = {
  pendente:   { label: "Pendente",     cor: "var(--warning)", bg: "var(--warning-bg)" },
  em_analise: { label: "Em análise",   cor: "var(--tech)",    bg: "var(--tech-bg, rgba(14,165,196,.12))" },
  aprovada:   { label: "Aprovada",     cor: "var(--success)", bg: "var(--success-bg)" },
  reprovada:  { label: "Reprovada",    cor: "var(--danger)",  bg: "var(--danger-bg)" },
};

// ---------- Token de convite ----------
export function novoToken() {
  const a = new Uint8Array(20);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function linkConvite(propostaId, token) {
  const base = window.location.origin;
  return `${base}/proposta-convite/${propostaId}?token=${token}`;
}

// ---------- Anexos (Firebase Storage) ----------
export async function uploadAnexo(propostaId, file) {
  const safe = String(file.name || "arquivo").replace(/[^\w.-]+/g, "_");
  const path = `propostas_compra/${propostaId}/${Date.now()}_${safe}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || "application/octet-stream" });
  const url = await getDownloadURL(r);
  return { nome: file.name, url, path, tipo: file.type || "", tamanho: file.size || 0 };
}

export function tamanhoLegivel(bytes) {
  const b = Number(bytes) || 0;
  if (b >= 1_048_576) return (b / 1_048_576).toFixed(1) + " MB";
  if (b >= 1024) return (b / 1024).toFixed(0) + " KB";
  return b + " B";
}
