import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { consultarCnpj } from "../services/brasilapi";
import { COLORS, SPACING, TYPO, RADIUS } from "../theme/tokens";

/**
 * Input de CNPJ com botão de busca (BrasilAPI).
 * Ao encontrar CNPJ válido, chama onEncontrou({ razaoSocial, nomeFantasia, situacao, endereco, ... }).
 *
 * Props:
 *   value        — string CNPJ atual
 *   onChange     — (valor formatado) => void
 *   onEncontrou  — (dados) => void   dispara com o resultado normalizado
 *   autoBuscar   — bool (default true): busca ao completar 14 dígitos ou onBlur
 *   disabled     — bool
 *   label        — string (default "CNPJ")
 */
export default function CampoCnpj({
  value = "",
  onChange,
  onEncontrou,
  autoBuscar = true,
  disabled = false,
  label = "CNPJ",
  style = {},
}) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState("");
  const [ok, setOk]           = useState(false);

  function formatar(v) {
    const d = String(v || "").replace(/\D/g, "").slice(0, 14);
    if (d.length <= 2)  return d;
    if (d.length <= 5)  return `${d.slice(0,2)}.${d.slice(2)}`;
    if (d.length <= 8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  }

  async function buscar() {
    const digits = String(value).replace(/\D/g, "");
    if (digits.length !== 14) { setErro("CNPJ incompleto"); return; }
    setLoading(true); setErro(""); setOk(false);
    try {
      const r = await consultarCnpj(digits);
      onEncontrou?.({
        cnpj:            r.cnpj,
        razaoSocial:     r.razao_social || "",
        nomeFantasia:    r.nome_fantasia || "",
        situacao:        r.descricao_situacao_cadastral || r.situacao_cadastral || "",
        naturezaJuridica:r.natureza_juridica || "",
        atividadePrincipal: r.cnae_fiscal_descricao || "",
        capitalSocial:   r.capital_social ?? null,
        dataAbertura:    r.data_inicio_atividade || "",
        endereco: {
          logradouro: r.logradouro || "",
          numero:     r.numero || "",
          complemento:r.complemento || "",
          bairro:     r.bairro || "",
          cidade:     r.municipio || "",
          uf:         r.uf || "",
          cep:        r.cep || "",
        },
        telefone: r.ddd_telefone_1 || "",
        email:    r.email || "",
        socios:   Array.isArray(r.qsa) ? r.qsa.map(s => ({ nome: s.nome_socio, cargo: s.qualificacao_socio })) : [],
        fonte:    "brasilapi",
      });
      setOk(true);
    } catch (e) {
      setErro(e.status === 404 ? "CNPJ não encontrado" : (e.message || "Falha na consulta"));
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const v = formatar(e.target.value);
    setOk(false); setErro("");
    onChange?.(v);
    if (autoBuscar && v.replace(/\D/g, "").length === 14) buscar();
  }

  const inputStyle = {
    padding: `${SPACING.sm}px ${SPACING.md}px`,
    paddingRight: 34,
    border: `1px solid ${erro ? COLORS.danger : ok ? COLORS.success : COLORS.border}`,
    borderRadius: RADIUS.md,
    fontSize: TYPO.md,
    width: "100%",
    outline: "none",
    background: disabled ? COLORS.bgAlt : COLORS.bgCard,
  };

  return (
    <div style={style}>
      {label && <label style={{ fontSize: TYPO.sm, color: COLORS.textMuted, display: "block", marginBottom: 4 }}>{label}</label>}
      <div style={{ display: "flex", gap: SPACING.xs }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onBlur={() => autoBuscar && value.replace(/\D/g, "").length === 14 && !ok && buscar()}
            placeholder="00.000.000/0000-00"
            disabled={disabled}
            style={inputStyle}
          />
          {loading && <Loader2 size={16} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", animation: "spin 1s linear infinite", color: COLORS.textMuted }} />}
          {!loading && ok && <CheckCircle2 size={16} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: COLORS.success }} />}
        </div>
        <button
          type="button"
          onClick={buscar}
          disabled={disabled || loading || value.replace(/\D/g, "").length !== 14}
          title="Consultar CNPJ na Receita"
          style={{
            padding: `${SPACING.sm}px ${SPACING.md}px`,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADIUS.md,
            background: COLORS.primaryLight,
            color: COLORS.primary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: TYPO.sm,
          }}
        >
          <Search size={14} /> Buscar
        </button>
      </div>
      {erro && (
        <div style={{ marginTop: 4, fontSize: TYPO.sm, color: COLORS.danger, display: "flex", alignItems: "center", gap: 4 }}>
          <AlertCircle size={12} /> {erro}
        </div>
      )}
    </div>
  );
}
