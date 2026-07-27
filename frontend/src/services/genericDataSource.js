// Wrapper genérico plug-and-play — substitui QUALQUER chamada Firestore por REST /api/collections/*
// Uso: import { list, watch, save, insert, patch, remove } from "@/services/genericDataSource";
//
// Feature flag global VITE_USE_VPS_TUDO — se true, TODAS coleções vão pro VPS
// Feature flag por coleção VITE_USE_VPS_<COLECAO> — override individual
//
// Filosofia: apenas ADICIONA modo VPS. Firestore original continua no fallback.

import {
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, orderBy, limit as fbLimit,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { api } from "./pontualApi";

// Migração 2026-07-23: VPS 100% (sem fallback Firestore). Flag mantida por segurança
// mas não é mais consultada — usar branch VPS sempre.
function shouldUseVps() { return true; }

// list(colecao, {where: {campo:valor}, orderBy: 'campo', order: 'asc', limit: 100})
export async function list(colecao, opts = {}) {
  if (shouldUseVps()) {
    const params = { orderBy: opts.orderBy, order: opts.order, limit: opts.limit };
    if (opts.where) for (const [k, v] of Object.entries(opts.where)) params[`where.${k}`] = v;
    const rows = await api.list(`collections/${colecao}`, params);
    return rows;
  }
  // Firestore fallback
  const parts = [collection(db, colecao)];
  if (opts.where) for (const [k, v] of Object.entries(opts.where)) parts.push(where(k, "==", v));
  if (opts.orderBy) parts.push(orderBy(opts.orderBy, opts.order === "desc" ? "desc" : "asc"));
  if (opts.limit) parts.push(fbLimit(opts.limit));
  const snap = await getDocs(query(...parts));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// get(colecao, id)
export async function get(colecao, id) {
  if (shouldUseVps()) {
    try { return await api.get(`collections/${colecao}`, id); }
    catch (e) { if (e.status === 404) return null; throw e; }
  }
  const snap = await getDoc(doc(db, colecao, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// watch(colecao, callback) — real-time no Firestore, polling 20s no VPS
export function watch(colecao, callback, opts = {}) {
  if (shouldUseVps()) {
    let ativo = true;
    const carregar = async () => {
      if (!ativo) return;
      try {
        const rows = await list(colecao, opts);
        callback({ docs: rows.map(r => ({ id: r.id, data: () => r })), size: rows.length });
      } catch (e) { console.warn(`[watch ${colecao}]`, e.message); }
    };
    carregar();
    const timer = setInterval(carregar, opts.intervaloMs || 20_000);
    return () => { ativo = false; clearInterval(timer); };
  }
  const parts = [collection(db, colecao)];
  if (opts.orderBy) parts.push(orderBy(opts.orderBy, opts.order === "desc" ? "desc" : "asc"));
  return onSnapshot(query(...parts), callback);
}

// save(colecao, id, dados) — setDoc merge
export async function save(colecao, id, dados) {
  if (shouldUseVps()) {
    return await api.create(`collections/${colecao}`, { id, ...dados });
  }
  return await setDoc(doc(db, colecao, id), dados, { merge: true });
}

// insert(colecao, dados) — addDoc (id auto)
export async function insert(colecao, dados) {
  if (shouldUseVps()) {
    const r = await api.create(`collections/${colecao}`, dados);
    return { id: r.id };
  }
  const ref = await addDoc(collection(db, colecao), dados);
  return { id: ref.id };
}

// patch(colecao, id, campos)
export async function patch(colecao, id, campos) {
  if (shouldUseVps()) {
    return await api.update(`collections/${colecao}`, id, campos);
  }
  return await updateDoc(doc(db, colecao, id), campos);
}

// remove(colecao, id)
export async function remove(colecao, id) {
  if (shouldUseVps()) {
    return await api.remove(`collections/${colecao}`, id);
  }
  return await deleteDoc(doc(db, colecao, id));
}
