import { useEffect, useState, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";

const callJornadaDia = httpsCallable(functions, "jornadaDia");
const callJornadaPeriodo = httpsCallable(functions, "jornadaPeriodo");

/**
 * Busca jornadas. Se dataInicio === dataFim → chama jornadaDia (mais rápido).
 * Se diferente → chama jornadaPeriodo (agrega N dias).
 */
export function useJornada(dataInicio, dataFim) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastFetch, setLast]  = useState(null);

  const fetchOnce = useCallback(async () => {
    if (!dataInicio) return;
    const fim = dataFim || dataInicio;
    setLoading(true);
    try {
      setError(null);
      if (fim === dataInicio) {
        const res = await callJornadaDia({ data: dataInicio });
        // Normaliza formato: jornadaDia retorna { jornadas } direto
        setPayload({
          jornadas: res.data.jornadas || [],
          jornadasAgregadas: null,  // só 1 dia, não tem agregado
          porDia: [{ data: dataInicio, jornadas: res.data.jornadas || [] }],
          naoIniciaram: res.data.naoIniciaram || [],
          totalCadastro: res.data.totalCadastro || 0,
          totalEventos: res.data.totalEventos,
          cache: res.data.cache,
          dataInicio,
          dataFim: fim,
          dias: [dataInicio],
        });
      } else {
        const res = await callJornadaPeriodo({ dataInicio, dataFim: fim });
        setPayload(res.data);
      }
      setLast(new Date());
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  // Auto-refresh em tempo real: a cada 60s SE for dia atual (não tem sentido pra dias passados).
  // Pausa quando aba fica oculta (Page Visibility API).
  useEffect(() => {
    if (!dataInicio) return;
    const ehHoje = (() => {
      // sv-SE retorna YYYY-MM-DD; timeZone fixo em São Paulo evita depender do fuso do navegador
      const hojeBRT = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      return hojeBRT === dataInicio && (dataFim === dataInicio || !dataFim);
    })();
    if (!ehHoje) return;

    const intervalo = setInterval(() => {
      if (document.hidden) return; // não bate quando aba está oculta
      fetchOnce();
    }, 60_000);

    // Refresh imediato quando aba volta a ficar visível
    const onVisible = () => { if (!document.hidden) fetchOnce(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [dataInicio, dataFim, fetchOnce]);

  // Pra exibição: se for período > 1 dia, mostra agregado por motorista (some os dias)
  // Se for 1 dia só, mostra a lista normal
  const ehPeriodo = payload && payload.dias && payload.dias.length > 1;
  const linhas = ehPeriodo ? (payload.jornadasAgregadas || []) : (payload?.jornadas || []);

  return {
    linhas,
    porDia: payload?.porDia || [],
    dias: payload?.dias || [],
    ehPeriodo,
    naoIniciaram: payload?.naoIniciaram || [],
    totalCadastro: payload?.totalCadastro || 0,
    totalEventos: payload?.totalEventos || 0,
    cache: payload?.cache || null,
    loading,
    error,
    lastFetch,
    refetch: fetchOnce,
  };
}
