// Locais favoritos — cadastro de origens/destinos recorrentes
// (Pátio Pontual, clientes, postos frequentes, filiais)
//
// Fluxo de busca (em cascata, deduplicado por CNPJ/coord):
//   1. `locais-fixos.json` — pontos institucionais embarcados
//   2. `locais_favoritos` — cadastros manuais no Firestore
//   3. Postos minerados de `abastecimentos_cta` — qualquer posto onde já
//      houve abastecimento traz coord da telemetria e nome/CNPJ do CTA
//   4. Nominatim (OSM) — fallback pra endereço/POI que nunca foi usado

import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { buscarEndereco } from "./geocoding";
import locaisFixos from "../data/locais-fixos.json";

let cacheLocais = null;
let cachePostosCta = null;
let cachePostosCtaTs = 0;
const TTL_POSTOS_MS = 5 * 60 * 1000; // 5 min

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

// Extrai postos únicos de abastecimentos_cta com coord da telemetria.
// Chave preferida: CNPJ. Fallback: nome normalizado.
// Calcula coord mediana entre todas as telemetrias válidas → mais estável.
export async function carregarPostosCta() {
  const agora = Date.now();
  if (cachePostosCta && (agora - cachePostosCtaTs) < TTL_POSTOS_MS) return cachePostosCta;
  const agrupado = new Map();
  try {
    const snap = await getDocs(collection(db, "abastecimentos_cta"));
    snap.forEach(d => {
      const a = d.data();
      const posto = a.posto || {};
      const tel = a.telemetria || {};
      const nome = String(posto.nome || "").trim();
      if (!nome) return;
      const lat = Number(tel.latitude);
      const lng = Number(tel.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const chave = posto.cnpj || nome.toLowerCase();
      const bucket = agrupado.get(chave) || {
        nome, cnpj: posto.cnpj || "", uf: posto.uf || "",
        comercial: !!posto.comercial, lats: [], lngs: [], abastecimentos: 0,
      };
      bucket.lats.push(lat);
      bucket.lngs.push(lng);
      bucket.abastecimentos += 1;
      // Mantém metadata mais recente (o último write vence)
      bucket.nome = nome;
      bucket.uf = posto.uf || bucket.uf;
      bucket.cnpj = posto.cnpj || bucket.cnpj;
      bucket.comercial = !!posto.comercial;
      agrupado.set(chave, bucket);
    });
  } catch (e) {
    console.warn("carregarPostosCta:", e);
  }
  const mediana = arr => {
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  cachePostosCta = [...agrupado.values()].map(b => ({
    nome: b.nome,
    cnpj: b.cnpj,
    uf: b.uf,
    lat: mediana(b.lats),
    lng: mediana(b.lngs),
    abastecimentos: b.abastecimentos,
    tipo: b.comercial ? "posto" : "patio",
    origem: "cta",
  }));
  cachePostosCtaTs = agora;
  return cachePostosCta;
}

function limparCache() { cacheLocais = null; cachePostosCta = null; cachePostosCtaTs = 0; }

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

  // 1+2) Locais fixos + favoritos
  const locais = await carregarLocais();
  const matchesFavoritos = locais.filter(l => {
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

  // 3) Postos minerados do CTA — inclui qualquer lugar onde já houve abastecimento
  let matchesCta = [];
  try {
    const postos = await carregarPostosCta();
    // Descarta postos que já batem com um local favorito (mesmo CNPJ ou nome próximo)
    const cnpjsFavoritos = new Set(matchesFavoritos.map(m => (locais.find(l => l.id === m.localId)?.cnpj || "").replace(/\D/g, "")).filter(Boolean));
    matchesCta = postos
      .filter(p => normalizar([p.nome, p.uf, p.cnpj].filter(Boolean).join(" ")).includes(nq))
      .filter(p => !p.cnpj || !cnpjsFavoritos.has(String(p.cnpj).replace(/\D/g, "")))
      .sort((a, b) => b.abastecimentos - a.abastecimentos)
      .slice(0, 8)
      .map(p => ({
        lat: p.lat,
        lng: p.lng,
        display: `${p.nome}${p.uf ? " · " + p.uf : ""}  ·  ${p.abastecimentos}x`,
        favorito: false,
        tipo: p.tipo,
        origem: "cta",
        cnpj: p.cnpj,
        nome: p.nome,
        endereco: { cidade: "", uf: p.uf || "", logradouro: "", cep: "" },
      }));
  } catch (e) { /* silencia */ }

  const combinado = [...matchesFavoritos, ...matchesCta];
  // Se já temos massa crítica, evita chamar Nominatim
  if (combinado.length >= 5) return combinado;

  // 4) Complementa com OSM (menor peso)
  try {
    const osm = await buscarEndereco(q);
    return [...combinado, ...osm.map(r => ({ ...r, favorito: false, tipo: "osm" }))];
  } catch (e) {
    return combinado;
  }
}

// Lista consolidada de postos únicos vistos no CTA — útil pra tela de administração
// de locais ("importar postos do CTA como favoritos").
export async function listarPostosCta() {
  const postos = await carregarPostosCta();
  return postos.sort((a, b) => b.abastecimentos - a.abastecimentos);
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
