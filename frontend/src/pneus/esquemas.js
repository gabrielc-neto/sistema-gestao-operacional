// Esquemas de posição de pneu por tipo de veículo.
// Cada string é o rótulo curto da posição no mapa (ex: "1DE" = 1º eixo, direção esquerda).
//
// Convenção Pontual:
//   1D E/D   = 1º eixo (direção), esquerdo/direito                (pneus simples)
//   2E/3E    = 2º/3º eixo (tração/reboque), com -int/-ext         (pneus geminados)
//   Sobressalente conta como posição separada quando existe.

export const ESQUEMAS = {
  cavalo_toco: {
    label: "Cavalo toco (4x2)",
    posicoes: ["1DE", "1DD", "2DE-int", "2DE-ext", "2DD-int", "2DD-ext"],
    eixos: [
      { nome: "1º eixo (direção)",  posicoes: ["1DE", "1DD"] },
      { nome: "2º eixo (tração)",   posicoes: ["2DE-int", "2DE-ext", "2DD-int", "2DD-ext"] },
    ],
  },
  cavalo_trucado: {
    label: "Cavalo trucado (6x2 / 6x4)",
    posicoes: ["1DE", "1DD", "2DE-int", "2DE-ext", "2DD-int", "2DD-ext", "3DE-int", "3DE-ext", "3DD-int", "3DD-ext"],
    eixos: [
      { nome: "1º eixo (direção)",  posicoes: ["1DE", "1DD"] },
      { nome: "2º eixo (tração)",   posicoes: ["2DE-int", "2DE-ext", "2DD-int", "2DD-ext"] },
      { nome: "3º eixo (tração)",   posicoes: ["3DE-int", "3DE-ext", "3DD-int", "3DD-ext"] },
    ],
  },
  carreta_simples: {
    label: "Carreta simples (2 eixos)",
    posicoes: ["1DE-int", "1DE-ext", "1DD-int", "1DD-ext", "2DE-int", "2DE-ext", "2DD-int", "2DD-ext"],
    eixos: [
      { nome: "1º eixo", posicoes: ["1DE-int", "1DE-ext", "1DD-int", "1DD-ext"] },
      { nome: "2º eixo", posicoes: ["2DE-int", "2DE-ext", "2DD-int", "2DD-ext"] },
    ],
  },
  carreta_3eixos: {
    label: "Carreta 3 eixos",
    posicoes: ["1DE-int","1DE-ext","1DD-int","1DD-ext","2DE-int","2DE-ext","2DD-int","2DD-ext","3DE-int","3DE-ext","3DD-int","3DD-ext"],
    eixos: [
      { nome: "1º eixo", posicoes: ["1DE-int","1DE-ext","1DD-int","1DD-ext"] },
      { nome: "2º eixo", posicoes: ["2DE-int","2DE-ext","2DD-int","2DD-ext"] },
      { nome: "3º eixo", posicoes: ["3DE-int","3DE-ext","3DD-int","3DD-ext"] },
    ],
  },
  bitrem: {
    label: "Bitrem (12 pneus)",
    posicoes: [
      "A1DE-int","A1DE-ext","A1DD-int","A1DD-ext",
      "A2DE-int","A2DE-ext","A2DD-int","A2DD-ext",
      "B1DE-int","B1DE-ext","B1DD-int","B1DD-ext",
    ],
    eixos: [
      { nome: "Carreta A — 1º",  posicoes: ["A1DE-int","A1DE-ext","A1DD-int","A1DD-ext"] },
      { nome: "Carreta A — 2º",  posicoes: ["A2DE-int","A2DE-ext","A2DD-int","A2DD-ext"] },
      { nome: "Carreta B — 1º",  posicoes: ["B1DE-int","B1DE-ext","B1DD-int","B1DD-ext"] },
    ],
  },
  rodotrem: {
    label: "Rodotrem (24 pneus)",
    posicoes: [
      "A1DE-int","A1DE-ext","A1DD-int","A1DD-ext",
      "A2DE-int","A2DE-ext","A2DD-int","A2DD-ext",
      "A3DE-int","A3DE-ext","A3DD-int","A3DD-ext",
      "B1DE-int","B1DE-ext","B1DD-int","B1DD-ext",
      "B2DE-int","B2DE-ext","B2DD-int","B2DD-ext",
      "B3DE-int","B3DE-ext","B3DD-int","B3DD-ext",
    ],
    eixos: [
      { nome: "Carreta A — 1º", posicoes: ["A1DE-int","A1DE-ext","A1DD-int","A1DD-ext"] },
      { nome: "Carreta A — 2º", posicoes: ["A2DE-int","A2DE-ext","A2DD-int","A2DD-ext"] },
      { nome: "Carreta A — 3º", posicoes: ["A3DE-int","A3DE-ext","A3DD-int","A3DD-ext"] },
      { nome: "Carreta B — 1º", posicoes: ["B1DE-int","B1DE-ext","B1DD-int","B1DD-ext"] },
      { nome: "Carreta B — 2º", posicoes: ["B2DE-int","B2DE-ext","B2DD-int","B2DD-ext"] },
      { nome: "Carreta B — 3º", posicoes: ["B3DE-int","B3DE-ext","B3DD-int","B3DD-ext"] },
    ],
  },
};

// Heurística pra sugerir esquema a partir do cadastro atual do veículo.
// veiculo.tipo_conjunto ou veiculo.total_eixos podem indicar. Se não bater, cai no cavalo_trucado ou carreta_simples.
export function sugerirEsquema(veiculo) {
  if (!veiculo) return null;
  const tipo = String(veiculo.tipo || "").toLowerCase();
  const conj = String(veiculo.tipo_conjunto || "").toLowerCase();
  const eixos = Number(veiculo.total_eixos);
  if (tipo === "carreta") {
    if (eixos === 3 || conj.includes("3 eixos")) return "carreta_3eixos";
    return "carreta_simples";
  }
  if (conj.includes("rodotrem")) return "rodotrem";
  if (conj.includes("bitrem"))   return "bitrem";
  if (conj.includes("truck")   || conj.includes("trucado") || eixos === 3) return "cavalo_trucado";
  if (conj.includes("toco")    || eixos === 2) return "cavalo_toco";
  // default seguro
  return tipo === "carreta" ? "carreta_simples" : "cavalo_trucado";
}

export function posicoesDoEsquema(esquemaId) {
  return ESQUEMAS[esquemaId]?.posicoes || [];
}
export function eixosDoEsquema(esquemaId) {
  return ESQUEMAS[esquemaId]?.eixos || [];
}

// Vida útil — quantas vidas contando: nova + N recapagens
export const VIDAS = [
  { id: "novo",         label: "Novo" },
  { id: "recapado_1",   label: "Recapado 1ª vida" },
  { id: "recapado_2",   label: "Recapado 2ª vida" },
  { id: "recapado_3",   label: "Recapado 3ª vida" },
];
export const STATUS_PNEU = [
  { id: "estoque",   label: "Em estoque",   cor: "#059669", bg: "#d1fae5" },
  { id: "em_uso",    label: "Em uso",       cor: "#1d4ed8", bg: "#dbeafe" },
  { id: "recapagem", label: "Em recapagem", cor: "#b45309", bg: "#fef3c7" },
  { id: "sucata",    label: "Sucata",       cor: "#64748b", bg: "#f1f5f9" },
];
export const MOTIVOS_REMOCAO = [
  "Desgaste natural",
  "Estouro",
  "Dano por objeto na pista",
  "Bolha / calombo",
  "Rachadura no flanco",
  "Descalibragem crônica",
  "Fim de vida (após N recapagens)",
  "Outro",
];
export const ESTADO_INSPECAO = [
  { id: "ok",         label: "OK",              cor: "#059669" },
  { id: "atencao",    label: "Atenção",         cor: "#b45309" },
  { id: "critico",    label: "Crítico",         cor: "#dc2626" },
];

// Sulco crítico (mm) — abaixo disso, alerta
export const SULCO_ALERTA  = 4; // amarelo
export const SULCO_CRITICO = 3; // vermelho — legal exige troca antes disso
