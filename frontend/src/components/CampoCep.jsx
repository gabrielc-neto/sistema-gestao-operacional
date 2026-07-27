import { useState } from "react";
import { Loader2, MapPin, AlertCircle } from "lucide-react";
import { consultarCep as brasilApiCep } from "../services/brasilapi";
import { consultarCep as viaCep } from "../services/viacep";
import { COLORS, SPACING, TYPO, RADIUS } from "../theme/tokens";

/**
 * Input de CEP com auto-preenchimento (BrasilAPI, fallback ViaCEP).
 * Ao encontrar CEP válido, chama onEncontrou({ cep, logradouro, bairro, cidade, uf, ddd, ibge }).
 *
 * Props:
 *   value        — string CEP atual
 *   onChange     — (valor) => void  (chamado a cada digitação, mantém formato "00000-000")
 *   onEncontrou  — (endereco) => void  chamado quando CEP é resolvido
 *   autoBuscar   — bool (default true): dispara busca ao completar 8 dígitos
 *   disabled     — bool
 *   label        — string opcional (label acima do input)
 */
export default function CampoCep({
  value = "",
  onChange,
  onEncontrou,
  autoBuscar = true,
  disabled = false,
  label = "CEP",
  style = {},
}) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState("");

  function formatar(v) {
    const d = String(v || "").replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  async function buscar(cep) {
    const digits = String(cep).replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoading(true);
    setErro("");
    try {
      // BrasilAPI v2 traz coordenada quando disponível
      const r = await brasilApiCep(digits);
      onEncontrou?.({
        cep:        r.cep,
        logradouro: r.street || "",
        bairro:     r.neighborhood || "",
        cidade:     r.city || "",
        uf:         r.state || "",
        lat:        r.location?.coordinates?.latitude ?? null,
        lng:        r.location?.coordinates?.longitude ?? null,
        fonte:      "brasilapi",
      });
    } catch (e1) {
      // Fallback ViaCEP
      try {
        const r = await viaCep(digits);
        onEncontrou?.({
          cep:        r.cep,
          logradouro: r.logradouro || "",
          bairro:     r.bairro || "",
          cidade:     r.localidade || "",
          uf:         r.uf || "",
          ddd:        r.ddd || "",
          ibge:       r.ibge || "",
          lat:        null,
          lng:        null,
          fonte:      "viacep",
        });
      } catch (e2) {
        setErro(e2.message || "CEP não encontrado");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const v = formatar(e.target.value);
    onChange?.(v);
    if (autoBuscar && v.replace(/\D/g, "").length === 8) buscar(v);
  }

  const inputStyle = {
    padding: `${SPACING.sm}px ${SPACING.md}px`,
    border: `1px solid ${erro ? COLORS.danger : COLORS.border}`,
    borderRadius: RADIUS.md,
    fontSize: TYPO.md,
    width: "100%",
    outline: "none",
    background: disabled ? COLORS.bgAlt : COLORS.bgCard,
  };

  return (
    <div style={style}>
      {label && <label style={{ fontSize: TYPO.sm, color: COLORS.textMuted, display: "block", marginBottom: 4 }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={() => autoBuscar && value.replace(/\D/g, "").length === 8 && buscar(value)}
          placeholder="00000-000"
          disabled={disabled}
          style={inputStyle}
        />
        {loading && (
          <Loader2 size={16} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", animation: "spin 1s linear infinite", color: COLORS.textMuted }} />
        )}
        {!loading && !erro && value.replace(/\D/g, "").length === 8 && (
          <MapPin size={16} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: COLORS.success }} />
        )}
      </div>
      {erro && (
        <div style={{ marginTop: 4, fontSize: TYPO.sm, color: COLORS.danger, display: "flex", alignItems: "center", gap: 4 }}>
          <AlertCircle size={12} /> {erro}
        </div>
      )}
    </div>
  );
}
