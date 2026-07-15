import { useState, useRef, useEffect } from "react";
import { buscarLocais } from "../services/locais";
import { Search, Loader2, MapPin, Star } from "lucide-react";
import { COLORS, SPACING, TYPO, RADIUS } from "../theme/tokens";

/**
 * Campo de busca de endereço com autocomplete Nominatim (OpenStreetMap).
 * Ao selecionar, chama onSelect com { lat, lng, display, endereco }.
 *
 * Props:
 *   placeholder    — texto do input
 *   onSelect       — (resultado) => void
 *   initialValue   — string inicial (opcional)
 *   style          — estilo extra do container
 */
export default function BuscaEndereco({ placeholder = "Digite endereço, cidade ou local...", onSelect, initialValue = "", style = {} }) {
  const [query, setQuery]         = useState(initialValue);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState("");
  const [aberto, setAberto]       = useState(false);
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => {
    const onClickFora = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  function digitar(v) {
    setQuery(v);
    setErro("");
    clearTimeout(timerRef.current);
    if (v.trim().length < 2) { setResultados([]); return; }
    setLoading(true);
    // Debounce 400ms
    timerRef.current = setTimeout(async () => {
      try {
        const r = await buscarLocais(v);
        setResultados(r);
        setAberto(true);
      } catch (e) {
        setErro(e.message || String(e));
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function escolher(r) {
    setQuery(r.display);
    setResultados([]);
    setAberto(false);
    onSelect?.(r);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <div style={{ position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: COLORS.textLight, pointerEvents: "none" }} />
        <input
          type="text"
          value={query}
          onChange={e => digitar(e.target.value)}
          onFocus={() => resultados.length > 0 && setAberto(true)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: `${SPACING.sm}px ${SPACING.sm}px ${SPACING.sm}px 32px`,
            border: `1px solid ${COLORS.borderHeavy}`, borderRadius: RADIUS.md,
            fontSize: TYPO.sm, fontFamily: TYPO.family, color: COLORS.text,
            background: COLORS.bgCard, outline: "none",
          }}
        />
        {loading && <Loader2 size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: COLORS.textLight, animation: "spin 1s linear infinite" }} />}
      </div>

      {erro && <div style={{ fontSize: TYPO.xxs, color: COLORS.danger, marginTop: 4 }}>{erro}</div>}

      {aberto && resultados.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.md, marginTop: 4, maxHeight: 320, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
        }}>
          {resultados.map((r, i) => (
            <button key={i} type="button" onClick={() => escolher(r)} style={{
              display: "flex", alignItems: "flex-start", gap: SPACING.sm,
              width: "100%", padding: SPACING.sm,
              background: r.favorito ? "#f0fdf4" : "transparent",
              border: "none", borderBottom: i < resultados.length - 1 ? `1px solid ${COLORS.border}` : "none",
              textAlign: "left", cursor: "pointer", fontFamily: TYPO.family,
            }}
            onMouseEnter={e => e.currentTarget.style.background = COLORS.primaryLight}
            onMouseLeave={e => e.currentTarget.style.background = r.favorito ? "#f0fdf4" : "transparent"}>
              {r.favorito
                ? <Star size={14} color="#0f766e" fill="#0f766e" style={{ flexShrink: 0, marginTop: 2 }} />
                : <MapPin size={14} color={COLORS.primary} style={{ flexShrink: 0, marginTop: 2 }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: TYPO.sm, color: COLORS.text, fontWeight: TYPO.w600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.favorito ? (r.nome || r.display) : (r.endereco?.logradouro || r.display.split(",")[0])}
                </div>
                <div style={{ fontSize: TYPO.xxs, color: COLORS.textMuted, marginTop: 2 }}>
                  {r.favorito
                    ? [r.tipo?.toUpperCase(), r.apelido, r.endereco?.cidade, r.endereco?.uf].filter(Boolean).join(" · ")
                    : [r.endereco?.bairro, r.endereco?.cidade, r.endereco?.uf].filter(Boolean).join(" · ")
                  }
                </div>
                <div style={{ fontSize: TYPO.xxs, color: COLORS.textLight, marginTop: 2, fontFamily: TYPO.familyMono }}>
                  {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
