// Wrapper que decide entre Firestore e VPS API pras coleções do módulo manutenção.
//
// Env flag: VITE_USE_VPS_MANUTENCAO
//   - "true"  → usa VPS API (backend Node em srv1464919.hstgr.cloud)
//   - "false" ou vazio → usa Firestore (comportamento antigo)
//
// Coleções cobertas: manutencoes, ordens_servico, lancamentos_os, tipos_manutencao_custom
//
// Interface é drop-in pras chamadas mais usadas em Manutencao.jsx:
//   - listAll(colecao) → equivale getDocs(collection(db, colecao))
//   - watch(colecao, callback) → equivale onSnapshot (VPS faz polling 20s)
//   - save(colecao, id, dados) → setDoc merge
//   - insert(colecao, dados) → addDoc (retorna {id})
//   - patch(colecao, id, campos) → updateDoc
//   - remove(colecao, id) → deleteDoc

import {
  collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { api } from "./pontualApi";

const USE_VPS = String(import.meta.env.VITE_USE_VPS_MANUTENCAO || "").toLowerCase() === "true";

// Nomes de coleção Firestore → nome de recurso REST do backend
const REST_MAP = {
  manutencoes:             "manutencoes",
  ordens_servico:          "ordens-servico",
  lancamentos_os:          "lancamentos-os",
  tipos_manutencao_custom: "tipos-manutencao",
  veiculos:                "veiculos",
};

function restResource(colecao) {
  const r = REST_MAP[colecao];
  if (!r) throw new Error(`Coleção não mapeada pro VPS: ${colecao}`);
  return r;
}

// ─── listAll ─────────────────────────────────────────────────
export async function listAll(colecao) {
  if (USE_VPS) {
    const rows = await api.list(restResource(colecao));
    return rows.map(r => ({ id: r.legacy_id || r.id, ...r }));
  }
  const snap = await getDocs(collection(db, colecao));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── watch (real-time) ──────────────────────────────────────
// VPS não tem WebSocket ainda — usa polling de 20s
// Retorna função unsubscribe compatível com onSnapshot
export function watch(colecao, callback, intervaloMs = 20_000) {
  if (USE_VPS) {
    let ativo = true;
    const carregar = async () => {
      if (!ativo) return;
      try {
        const rows = await listAll(colecao);
        // Formato compatível com Firestore snapshot
        const snap = {
          docs: rows.map(r => ({ id: r.id, data: () => r })),
          size: rows.length,
        };
        callback(snap);
      } catch (e) { console.warn(`[watch ${colecao}]`, e.message); }
    };
    carregar();
    const timer = setInterval(carregar, intervaloMs);
    return () => { ativo = false; clearInterval(timer); };
  }
  return onSnapshot(collection(db, colecao), callback);
}

// ─── save (setDoc merge) ─────────────────────────────────────
export async function save(colecao, id, dados) {
  if (USE_VPS) {
    // Backend usa POST com legacy_id/numero pra upsert
    const payload = { ...dados, id };
    return await api.create(restResource(colecao), payload);
  }
  return await setDoc(doc(db, colecao, id), dados, { merge: true });
}

// ─── insert (addDoc — id auto) ──────────────────────────────
export async function insert(colecao, dados) {
  if (USE_VPS) {
    const created = await api.create(restResource(colecao), dados);
    return { id: created.legacy_id || created.id };
  }
  const ref = await addDoc(collection(db, colecao), dados);
  return { id: ref.id };
}

// ─── patch (updateDoc parcial) ──────────────────────────────
export async function patch(colecao, id, campos) {
  if (USE_VPS) {
    return await api.update(restResource(colecao), id, campos);
  }
  return await updateDoc(doc(db, colecao, id), campos);
}

// ─── remove (deleteDoc) ──────────────────────────────────────
export async function remove(colecao, id) {
  if (USE_VPS) {
    return await api.remove(restResource(colecao), id);
  }
  return await deleteDoc(doc(db, colecao, id));
}

// Info de debug
export function dataSourceInfo() {
  return { mode: USE_VPS ? "vps" : "firestore" };
}
