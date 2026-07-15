import { useEffect, useState, useCallback, useRef } from "react";
import { callFunction } from "../firebase/callFunction";

// Polling padrão 2 min — reduz pressão no Firestore (free tier 50k reads/dia).
// SASCAR atualiza posição a cada ~30-60s no lado dele; 2min do frontend é OK operacionalmente.
export function useSascarPosicoes({ intervalMs = 120_000 } = {}) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastFetch, setLast]  = useState(null);
  const timer = useRef(null);

  const fetchOnce = useCallback(async () => {
    try {
      setError(null);
      const res = await callFunction("sascarPosicoes", {});
      setData(res.data);
      setLast(new Date());
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnce();
    timer.current = setInterval(fetchOnce, intervalMs);
    // Só refaz ao voltar a aba se passou mais de 60s desde o último fetch
    const onVisible = () => {
      if (document.hidden) return;
      const last = timer.lastMs || 0;
      if (Date.now() - last > 60_000) { fetchOnce(); timer.lastMs = Date.now(); }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchOnce, intervalMs]);

  return { data, loading, error, lastFetch, refetch: fetchOnce };
}
