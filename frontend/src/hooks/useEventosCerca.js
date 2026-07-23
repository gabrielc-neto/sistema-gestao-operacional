import { useEffect, useState } from "react";
import { watch as dsWatch } from "../services/genericDataSource";

// Eventos de cerca (ENTRADA/SAIDA) das últimas N horas.
// timestamp é ISO (backend VPS) ou serverTimestamp (Firestore legado).
// criadoEmMs é número em milis.
export function useEventosCerca({ horasAtras = 12, limite = 100 } = {}) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const desdeMs = Date.now() - horasAtras * 3600_000;
    const unsub = dsWatch("cercas_eventos", snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e => {
          const ms = Number(e.criadoEmMs) || (e.criadoEm ? Date.parse(e.criadoEm) : 0);
          return ms >= desdeMs;
        })
        .sort((a, b) => (Number(b.criadoEmMs) || Date.parse(b.criadoEm || 0)) - (Number(a.criadoEmMs) || Date.parse(a.criadoEm || 0)))
        .slice(0, limite);
      setEventos(lista);
      setLoading(false);
    });
    return () => unsub();
  }, [horasAtras, limite]);

  return { eventos, loading };
}
