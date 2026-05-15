import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";

// Retorna Map<placaNormalizada, oc> com a OC mais recente de cada caminhão
// nas últimas 48h. Sem campo de status no modelo, usamos "mais recente" como proxy.
export function useOcsAtivas() {
  const [ocsPorPlaca, setOcs] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    async function load() {
      try {
        const desde = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
        const q = query(
          collection(db, "ordens_carregamento"),
          where("criadoEm", ">=", desde),
          orderBy("criadoEm", "desc"),
        );
        const snap = await getDocs(q);
        const map = new Map();
        snap.forEach(doc => {
          const oc = { id: doc.id, ...doc.data() };
          const placa = (oc.cavaloPlaca || "").trim().toUpperCase();
          if (!placa) return;
          // já está ordenado desc — primeira que aparece é a mais recente
          if (!map.has(placa)) map.set(placa, oc);
        });
        if (!cancelado) setOcs(map);
      } catch (e) {
        console.warn("[useOcsAtivas] falha:", e.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    load();
    return () => { cancelado = true; };
  }, []);

  return { ocsPorPlaca, loading };
}
