// Design tokens Pontual — estilo TMS corporativo
// Uso: import { COLORS, SPACING, TYPO } from '../theme/tokens';

export const COLORS = {
  // Neutros — fundos e bordas
  bg:            "#f4f6f8",   // fundo geral (cinza-azulado muito claro)
  bgCard:        "#ffffff",
  bgHeader:      "#1a3a5c",   // navy Pontual — só em headers/nav
  bgHover:       "#f8fafc",
  bgAlt:         "#fafbfc",   // linha zebrada
  border:        "#e2e8f0",
  borderHeavy:   "#cbd5e1",

  // Tipografia
  text:          "#0f172a",   // texto principal
  textMuted:     "#64748b",   // secundário
  textLight:     "#94a3b8",   // terciário / labels
  textInvert:    "#ffffff",

  // Ações (sóbrias — nada de neon)
  primary:       "#1a3a5c",
  primaryHover:  "#264a72",
  primaryLight:  "#eef2f7",
  accent:        "#0f766e",   // teal secundário — só em destaques positivos

  // Estados semânticos (sóbrios, não brand)
  success:       "#0f766e",
  successBg:     "#ecfdf5",
  warning:       "#b45309",
  warningBg:     "#fffbeb",
  danger:        "#b91c1c",
  dangerBg:      "#fef2f2",
  info:          "#0369a1",
  infoBg:        "#f0f9ff",
};

// Espaçamento em múltiplos de 4 — reduz mistura visual
export const SPACING = {
  xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
};

export const RADIUS = {
  sm: 4, md: 6, lg: 8, xl: 12, full: 999,
};

export const TYPO = {
  family:      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  familyMono:  "'JetBrains Mono', 'Menlo', 'Consolas', monospace",
  // Escala tipográfica pequena (TMS = denso)
  xxs: "0.68rem",   // legendas
  xs:  "0.72rem",
  sm:  "0.78rem",   // corpo pequeno
  md:  "0.84rem",   // corpo padrão
  lg:  "0.96rem",   // subtítulos
  xl:  "1.15rem",   // títulos
  xxl: "1.5rem",    // valores grandes
  xxxl:"2rem",      // números hero (KPI)
  w400: 400, w500: 500, w600: 600, w700: 700, w800: 800,
};

export const SHADOW = {
  none: "none",
  sm:   "0 1px 2px rgba(15,23,42,0.04), 0 0 0 1px rgba(15,23,42,0.03)",
  md:   "0 1px 3px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.04)",
};

export const TRANSITION = "all .15s ease";
