import { useEffect, useState } from "react";
import { list as dsList } from "../services/genericDataSource";

// Map<placaNormalizada, oc> — OC mais recente por caminhão nas últimas 48h.
export function useOcsAtivas() {
  const [ocsPorPlaca, setOcs] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    async function load() {
      try {
        const desde = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
        const rows = await dsList("ordens_carregamento", { orderBy: "criadoEm", order: "desc", limit: 500 });
        const map = new Map();
        rows
          .filter(oc => (oc.criadoEm || "") >= desde)
          .forEach(oc => {
            const placa = (oc.cavaloPlaca || "").trim().toUpperCase();
            if (!placa) return;
            if (!map.has(placa)) map.set(placa, oc);
          });
        if (!cancelado) setOcs(map);
      } catch (e) {
        console.warn("[useOcsAtivas]", e.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    load();
    return () => { cancelado = true; };
  }, []);

  return { ocsPorPlaca, loading };
}
