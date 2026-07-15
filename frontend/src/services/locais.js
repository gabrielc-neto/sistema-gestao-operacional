// Locais favoritos — cadastro de origens/destinos recorrentes
// (Pátio Pontual, clientes, postos frequentes, filiais)
//
// Fluxo:
//   1. Usuário digita "Pontual" → busca primeiro em `locais_favoritos` no Firestore
//   2. Se não achar, cai pra Nominatim (OSM)
//   3. Ao selecionar, retorna { lat, lng, display, favorito, tipo }

import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { buscarEndereco } from "./geocoding";
import locaisFixos from "../data/locais-fixos.json";

let cacheLocais = null;

async function carregarLocais() {
  if (cacheLocais) return cacheLocais;
  // 1) Locais fixos embarcados (Pontual, filiais institucionais) — sempre disponíveis
  const fixos = (locaisFixos?.locais || []).map(l => ({ ...l, fixo: true }));
  // 2) Locais cadastrados no Firestore
  let dinamicos = [];
  try {
    const snap = await getDocs(collection(db, "locais_favoritos"));
    dinamicos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("locais_favoritos:", e);
  }
  cacheLocais = [...fixos, ...dinamicos];
  return cacheLocais;
}

function limparCache() { cacheLocais = null; }

function normalizar(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * Busca combinada: locais favoritos + Nominatim.
 * Locais aparecem primeiro (destaque como "⭐").
 */
export async function buscarLocais(query) {
  const q = (query || "").trim();
  if (q.length < 2) return [];
  const nq = normalizar(q);
  const locais = await carregarLocais();

  // Match nos locais favoritos por nome, apelido, endereço, cidade, cnpj
  const matches = locais.filter(l => {
    const hay = normalizar([l.nome, l.apelido, l.endereco, l.cidade, l.uf, l.cnpj, l.tipo].filter(Boolean).join(" "));
    return hay.includes(nq);
  }).map(l => ({
    lat: Number(l.lat),
    lng: Number(l.lng),
    display: `${l.nome}${l.cidade ? " · " + l.cidade + "/" + (l.uf||"") : ""}`,
    favorito: true,
    tipo: l.tipo || "local",
    endereco: {
      logradouro: l.endereco || "",
      cidade: l.cidade || "",
      uf: l.uf || "",
      cep: l.cep || "",
    },
    localId: l.id,
    nome: l.nome,
    apelido: l.apelido,
  }));

  // Se já achou nos favoritos, retorna só eles (não polui com OSM)
  if (matches.length >= 3) return matches;

  // Complementa com OSM (menor peso)
  try {
    const osm = await buscarEndereco(q);
    return [...matches, ...osm.map(r => ({ ...r, favorito: false, tipo: "osm" }))];
  } catch (e) {
    return matches;
  }
}

export async function listarLocais() {
  const l = await carregarLocais();
  return l.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
}

export async function criarLocal(dados) {
  await addDoc(collection(db, "locais_favoritos"), {
    ...dados,
    criadoEm: serverTimestamp(),
  });
  limparCache();
}

export async function atualizarLocal(id, dados) {
  await updateDoc(doc(db, "locais_favoritos", id), {
    ...dados,
    atualizadoEm: serverTimestamp(),
  });
  limparCache();
}

export async function apagarLocal(id) {
  await deleteDoc(doc(db, "locais_favoritos", id));
  limparCache();
}

export const TIPOS_LOCAL = [
  { id: "patio",       label: "Pátio Pontual",     color: "#0f766e" },
  { id: "filial",      label: "Filial",            color: "#1a3a5c" },
  { id: "cliente",     label: "Cliente",           color: "#b45309" },
  { id: "posto",       label: "Posto",             color: "#4338ca" },
  { id: "usina",       label: "Usina",             color: "#0369a1" },
  { id: "distribuidor",label: "Distribuidor",      color: "#7c3aed" },
  { id: "outro",       label: "Outro",             color: "#64748b" },
];
