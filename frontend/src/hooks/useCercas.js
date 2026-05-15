import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";

// Live snapshot da collection cercas_eletronicas
export function useCercas() {
  const [cercas, setCercas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "cercas_eletronicas"), orderBy("nome"));
    const unsub = onSnapshot(q, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCercas(lista);
      setLoading(false);
    }, err => {
      console.warn("[useCercas]", err.message);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { cercas, loading };
}
