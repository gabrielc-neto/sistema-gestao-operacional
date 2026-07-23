// Wrapper Firestore/VPS pra coleção `veiculos` (frota).
// Flag independente: VITE_USE_VPS_FROTA
//   "true"  → VPS API
//   "false" ou vazio → Firestore

import {
  collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { api } from "./pontualApi";

const USE_VPS = String(import.meta.env.VITE_USE_VPS_FROTA || "").toLowerCase() === "true";

export async function listVeiculos() {
  if (USE_VPS) {
    const rows = await api.list("veiculos");
    return rows.map(r => ({ id: r.legacy_id || r.id, ...r }));
  }
  const snap = await getDocs(query(collection(db, "veiculos"), orderBy("placa")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function watchVeiculos(callback, intervaloMs = 20_000) {
  if (USE_VPS) {
    let ativo = true;
    const carregar = async () => {
      if (!ativo) return;
      try {
        const rows = await listVeiculos();
        callback({ docs: rows.map(r => ({ id: r.id, data: () => r })), size: rows.length });
      } catch (e) { console.warn("[watchVeiculos]", e.message); }
    };
    carregar();
    const timer = setInterval(carregar, intervaloMs);
    return () => { ativo = false; clearInterval(timer); };
  }
  return onSnapshot(query(collection(db, "veiculos"), orderBy("placa")), callback);
}

export async function saveVeiculo(id, dados) {
  if (USE_VPS) return await api.create("veiculos", { ...dados, id });
  return await setDoc(doc(db, "veiculos", id), dados, { merge: true });
}

export async function patchVeiculo(id, campos) {
  if (USE_VPS) return await api.update("veiculos", id, campos);
  return await updateDoc(doc(db, "veiculos", id), campos);
}

export async function removeVeiculo(id) {
  if (USE_VPS) return await api.remove("veiculos", id);
  return await deleteDoc(doc(db, "veiculos", id));
}

export function frotaSourceInfo() {
  return { mode: USE_VPS ? "vps" : "firestore" };
}
