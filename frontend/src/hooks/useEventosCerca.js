import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit, where } from "firebase/firestore";
import { db } from "../firebase/config";

// Snapshot dos eventos de cerca (ENTRADA/SAIDA) das últimas N horas.
// timestamp é serverTimestamp; criadoEmMs é número (fallback se timestamp ainda null).
export function useEventosCerca({ horasAtras = 12, limite = 100 } = {}) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const desdeMs = Date.now() - horasAtras * 3600_000;
    const q = query(
      collection(db, "cercas_eventos"),
      where("criadoEmMs", ">=", desdeMs),
      orderBy("criadoEmMs", "desc"),
      limit(limite)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEventos(lista);
        setLoading(false);
      },
      (err) => {
        console.warn("[useEventosCerca]", err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [horasAtras, limite]);

  return { eventos, loading };
}
