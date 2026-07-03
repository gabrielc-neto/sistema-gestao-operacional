import { useEffect, useState, useCallback, useRef } from "react";
import { callFunction } from "../firebase/callFunction";

/**
 * Puxa o odômetro atual de todos os veículos via callable `sascarPosicoes`.
 * Retorna um map { PLACA_NORMALIZADA: { odometro, dataPosicao, velocidade } }
 * + helpers pra consultar por placa e forçar refetch.
 *
 * A callable já tem cache de 30s no backend, então rehit é barato.
 */
export function useOdometrosSascar() {
  const [porPlaca, setPorPlaca] = useState({});
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);
  const [ultima,  setUltima]    = useState(null);
  const inflight = useRef(false);

  const normPlaca = (p) => String(p || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  const buscar = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      setError(null);
      const { data } = await callFunction("sascarPosicoes", {});
      const map = {};
      for (const p of (data?.posicoes || [])) {
        const key = normPlaca(p.placa);
        if (!key) continue;
        map[key] = {
          odometro:    Number(p.odometro) || null,
          dataPosicao: p.dataPosicao || null,
          velocidade:  Number(p.velocidade) || 0,
          cidade:      p.cidade || "",
          uf:          p.uf || "",
        };
      }
      setPorPlaca(map);
      setUltima(new Date());
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  }, []);

  useEffect(() => { buscar(); }, [buscar]);

  const odometroDe = useCallback((placa) => {
    const key = normPlaca(placa);
    return porPlaca[key]?.odometro ?? null;
  }, [porPlaca]);

  const dadosDe = useCallback((placa) => {
    const key = normPlaca(placa);
    return porPlaca[key] || null;
  }, [porPlaca]);

  return { porPlaca, odometroDe, dadosDe, loading, error, ultima, refetch: buscar };
}
