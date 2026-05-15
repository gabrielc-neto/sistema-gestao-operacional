import { useEffect, useState, useCallback, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";

const callPosicoes = httpsCallable(functions, "sascarPosicoes");

export function useSascarPosicoes({ intervalMs = 30_000 } = {}) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastFetch, setLast]  = useState(null);
  const timer = useRef(null);

  const fetchOnce = useCallback(async () => {
    try {
      setError(null);
      const res = await callPosicoes({});
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
    const onVisible = () => { if (!document.hidden) fetchOnce(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchOnce, intervalMs]);

  return { data, loading, error, lastFetch, refetch: fetchOnce };
}
