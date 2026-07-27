import { COLORS, SPACING, TYPO, RADIUS, SHADOW, TRANSITION } from "./tokens";

// ============================================================
// PageHeader — barra superior TMS estilo com breadcrumb + ações
// ============================================================
export function PageHeader({ title, subtitle, breadcrumb, actions, meta }) {
  return (
    <div style={{
      background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}`,
      padding: `${SPACING.md}px ${SPACING.xl}px`, display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: SPACING.md, flexWrap: "wrap",
    }}>
      <div>
        {breadcrumb && (
          <div style={{ fontSize: TYPO.xs, color: COLORS.textLight, marginBottom: SPACING.xs, letterSpacing: ".02em" }}>
            {breadcrumb}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "baseline", gap: SPACING.md }}>
          <h1 style={{ margin: 0, fontSize: TYPO.xl, color: COLORS.text, fontWeight: TYPO.w700, letterSpacing: "-.01em" }}>{title}</h1>
          {subtitle && <span style={{ fontSize: TYPO.sm, color: COLORS.textMuted }}>{subtitle}</span>}
        </div>
        {meta && <div style={{ fontSize: TYPO.xs, color: COLORS.textLight, marginTop: SPACING.xs }}>{meta}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: SPACING.sm, alignItems: "center" }}>{actions}</div>}
    </div>
  );
}

// ============================================================
// KpiCard — cards de indicadores estilo TMS (sóbrio, denso)
// ============================================================
export function KpiCard({ label, value, delta, tone = "neutral", icon, sub, hint }) {
  const tones = {
    neutral:  { border: COLORS.border,           accent: COLORS.text,     bg: COLORS.bgCard },
    primary:  { border: COLORS.border,           accent: COLORS.primary,  bg: COLORS.bgCard },
    success:  { border: COLORS.border,           accent: COLORS.success,  bg: COLORS.bgCard },
    warning:  { border: COLORS.border,           accent: COLORS.warning,  bg: COLORS.bgCard },
    danger:   { border: COLORS.border,           accent: COLORS.danger,   bg: COLORS.bgCard },
  };
  const t = tones[tone] || tones.neutral;
  const deltaColor = delta > 0 ? COLORS.danger : delta < 0 ? COLORS.success : COLORS.textLight;
  return (
    <div style={{
      background: t.bg, border: `1px solid ${t.border}`, borderRadius: RADIUS.md,
      padding: SPACING.md, boxShadow: SHADOW.sm, transition: TRANSITION,
      display: "flex", flexDirection: "column", gap: SPACING.xs, minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm }}>
        <div style={{
          fontSize: TYPO.xxs, textTransform: "uppercase", letterSpacing: ".06em",
          color: COLORS.textMuted, fontWeight: TYPO.w600,
        }}>{label}</div>
        {icon && <div style={{ color: COLORS.textLight }}>{icon}</div>}
      </div>
      <div style={{
        fontSize: TYPO.xxl, fontWeight: TYPO.w700, color: t.accent, lineHeight: 1.1,
        fontFamily: typeof value === "string" && /^R\$|\d/.test(value) ? TYPO.family : TYPO.family,
        letterSpacing: "-.01em",
      }}>{value}</div>
      {(sub || delta != null) && (
        <div style={{ fontSize: TYPO.xs, color: COLORS.textMuted, display: "flex", gap: SPACING.sm, alignItems: "center" }}>
          {delta != null && (
            <span style={{ color: deltaColor, fontWeight: TYPO.w600 }}>
              {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {sub}
        </div>
      )}
      {hint && <div style={{ fontSize: TYPO.xxs, color: COLORS.textLight }}>{hint}</div>}
    </div>
  );
}

// ============================================================
// Btn — botão único com variantes
// ============================================================
export function Btn({ variant = "primary", size = "md", icon, children, style = {}, ...rest }) {
  const variants = {
    primary:   { bg: COLORS.primary,      color: COLORS.textInvert, border: COLORS.primary },
    secondary: { bg: COLORS.bgCard,       color: COLORS.text,       border: COLORS.borderHeavy },
    ghost:     { bg: "transparent",       color: COLORS.textMuted,  border: "transparent" },
    danger:    { bg: COLORS.bgCard,       color: COLORS.danger,     border: "#fca5a5" },
  };
  const sizes = {
    sm: { padY: 4,  padX: 10, font: TYPO.xs },
    md: { padY: 7,  padX: 14, font: TYPO.sm },
    lg: { padY: 10, padX: 18, font: TYPO.md },
  };
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  return (
    <button {...rest} style={{
      background: v.bg, color: v.color, border: `1px solid ${v.border}`,
      borderRadius: RADIUS.md, padding: `${s.padY}px ${s.padX}px`,
      fontSize: s.font, fontWeight: TYPO.w600, fontFamily: TYPO.family,
      cursor: rest.disabled ? "not-allowed" : "pointer", opacity: rest.disabled ? 0.5 : 1,
      display: "inline-flex", alignItems: "center", gap: SPACING.xs,
      transition: TRANSITION, whiteSpace: "nowrap",
      ...style,
    }}>
      {icon}{children}
    </button>
  );
}

// ============================================================
// DataTable — tabela TMS com zebra, hover, header sticky
// ============================================================
export function DataTable({ columns, rows, keyFn = (r, i) => i, empty = "Nenhum registro", minWidth = 700, onRowClick }) {
  return (
    <div style={{ overflowX: "auto", background: COLORS.bgCard, borderRadius: RADIUS.md, border: `1px solid ${COLORS.border}`, boxShadow: SHADOW.sm }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth, fontSize: TYPO.sm }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{
                textAlign: col.align || "left", padding: `${SPACING.sm}px ${SPACING.md}px`,
                fontSize: TYPO.xxs, textTransform: "uppercase", letterSpacing: ".06em",
                color: COLORS.textMuted, fontWeight: TYPO.w700,
                background: COLORS.bgAlt, borderBottom: `1px solid ${COLORS.border}`,
                position: "sticky", top: 0, whiteSpace: "nowrap",
                width: col.width, minWidth: col.minWidth,
              }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: SPACING.xxl, textAlign: "center", color: COLORS.textLight, fontSize: TYPO.sm }}>{empty}</td></tr>
          ) : rows.map((r, i) => (
            <tr key={keyFn(r, i)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              style={{
                background: i % 2 === 0 ? COLORS.bgCard : COLORS.bgAlt,
                borderBottom: `1px solid ${COLORS.border}`,
                cursor: onRowClick ? "pointer" : "default",
                transition: TRANSITION,
              }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.primaryLight}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? COLORS.bgCard : COLORS.bgAlt}
            >
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: `${SPACING.sm}px ${SPACING.md}px`, color: COLORS.text,
                  textAlign: col.align || "left", verticalAlign: "top",
                  whiteSpace: col.wrap ? "normal" : "nowrap",
                  maxWidth: col.maxWidth,
                }}>{col.render ? col.render(r) : r[col.key] ?? "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Tag — chip pequeno para status/badges
// ============================================================
export function Tag({ children, tone = "neutral", size = "sm" }) {
  const tones = {
    neutral: { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
    primary: { bg: COLORS.primaryLight, color: COLORS.primary, border: "#c7d7e8" },
    success: { bg: COLORS.successBg, color: COLORS.success, border: "#a7f3d0" },
    warning: { bg: COLORS.warningBg, color: COLORS.warning, border: "#fde68a" },
    danger:  { bg: COLORS.dangerBg,  color: COLORS.danger,  border: "#fecaca" },
    info:    { bg: COLORS.infoBg,    color: COLORS.info,    border: "#bae6fd" },
  };
  const t = tones[tone] || tones.neutral;
  const pad = size === "sm" ? "2px 6px" : "3px 10px";
  return (
    <span style={{
      display: "inline-block", background: t.bg, color: t.color,
      border: `1px solid ${t.border}`, borderRadius: RADIUS.sm, padding: pad,
      fontSize: TYPO.xxs, fontWeight: TYPO.w600, textTransform: "uppercase",
      letterSpacing: ".04em", fontFamily: TYPO.family, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

// ============================================================
// FilterBar — barra de filtros densa (TMS style)
// ============================================================
export function FilterBar({ children, actions }) {
  return (
    <div style={{
      background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md,
      padding: SPACING.md, boxShadow: SHADOW.sm, marginBottom: SPACING.md,
      display: "flex", gap: SPACING.sm, flexWrap: "wrap", alignItems: "flex-end",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: SPACING.sm, flex: 1, minWidth: 0 }}>
        {children}
      </div>
      {actions && <div style={{ display: "flex", gap: SPACING.xs, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

// ============================================================
// Field — label + input padronizado
// ============================================================
export function Field({ label, hint, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: SPACING.xs, minWidth: 0 }}>
      <span style={{
        fontSize: TYPO.xxs, color: COLORS.textMuted, fontWeight: TYPO.w600,
        textTransform: "uppercase", letterSpacing: ".06em",
      }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: TYPO.xxs, color: COLORS.textLight }}>{hint}</span>}
    </label>
  );
}

export const inputStyle = {
  padding: `${SPACING.xs}px ${SPACING.sm}px`,
  border: `1px solid ${COLORS.borderHeavy}`,
  borderRadius: RADIUS.md,
  fontSize: TYPO.sm,
  fontFamily: TYPO.family,
  color: COLORS.text,
  background: COLORS.bgCard,
  outline: "none",
  transition: TRANSITION,
  width: "100%",
  height: 32,
};

// ============================================================
// Section — bloco de conteúdo com título opcional
// ============================================================
export function Section({ title, subtitle, actions, children, dense }) {
  return (
    <section style={{
      background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md,
      boxShadow: SHADOW.sm, marginBottom: SPACING.md, overflow: "hidden",
    }}>
      {(title || actions) && (
        <div style={{
          padding: `${SPACING.sm}px ${SPACING.md}px`, borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.bgAlt, display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: SPACING.md,
        }}>
          <div>
            {title && <div style={{ fontSize: TYPO.sm, fontWeight: TYPO.w700, color: COLORS.text }}>{title}</div>}
            {subtitle && <div style={{ fontSize: TYPO.xxs, color: COLORS.textLight, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {actions && <div style={{ display: "flex", gap: SPACING.xs }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: dense ? 0 : SPACING.md }}>
        {children}
      </div>
    </section>
  );
}
