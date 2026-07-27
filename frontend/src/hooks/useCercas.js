import { useEffect, useState } from "react";
import { watch as dsWatch } from "../services/genericDataSource";

// Live snapshot da coleção cercas_eletronicas (Firestore ou VPS via wrapper)
export function useCercas() {
  const [cercas, setCercas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = dsWatch("cercas_eletronicas", snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setCercas(lista);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { cercas, loading };
}
