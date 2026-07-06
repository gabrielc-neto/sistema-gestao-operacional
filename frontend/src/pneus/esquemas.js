// Esquemas de posição de pneu por tipo de veículo.
// Cada string é o rótulo curto da posição no mapa (ex: "1DE" = 1º eixo, direção esquerda).
//
// Convenção Pontual:
//   1D E/D   = 1º eixo (direção), esquerdo/direito                (pneus simples)
//   2E/3E    = 2º/3º eixo (tração/reboque), com -int/-ext         (pneus geminados)
//   Sobressalente conta como posição separada quando existe.

// Nomenclatura Pontual (batida com a ficha nº 1470 em papel):
//   Cavalo — TEE/TEI/TDI/TDE no 1º eixo (direção), depois 2°EEE/EEI/EDI/EDE, etc.
//   T = Traseira do padrão da ficha (1º eixo do cavalo), 2°/3°/TRK = eixos seguintes
//   E = Esquerdo · D = Direito · E = Externo · I = Interno
export const ESQUEMAS = {
  cavalo_toco: {
    label: "Cavalo toco (4x2)",
    posicoes: ["TEE","TEI","TDI","TDE","2°EEE","2°EEI","2°EDI","2°EDE"],
    eixos: [
      { nome: "1º eixo — Direção", posicoes: ["TEE","TEI","TDI","TDE"] },
      { nome: "2º eixo — Tração",  posicoes: ["2°EEE","2°EEI","2°EDI","2°EDE"] },
    ],
    temEstepe: true,
    estepeLado: "esquerda",
  },
  cavalo_trucado: {
    label: "Cavalo trucado (6x2 / 6x4)",
    posicoes: ["TEE","TEI","TDI","TDE","2°EEE","2°EEI","2°EDI","2°EDE","3°EEE","3°EEI","3°EDI","3°EDE"],
    eixos: [
      { nome: "1º eixo — Direção", posicoes: ["TEE","TEI","TDI","TDE"] },
      { nome: "2º eixo — Tração",  posicoes: ["2°EEE","2°EEI","2°EDI","2°EDE"] },
      { nome: "3º eixo — Tração",  posicoes: ["3°EEE","3°EEI","3°EDI","3°EDE"] },
    ],
    temEstepe: true,
    estepeLado: "esquerda",
  },
  cavalo_4eixos: {
    label: "Cavalo 8x2 / 8x4 (com truque)",
    posicoes: ["TEE","TEI","TDI","TDE","2°EEE","2°EEI","2°EDI","2°EDE","3°EEE","3°EEI","3°EDI","3°EDE","TRKEE","TRKEI","TRKDI","TRKDE"],
    eixos: [
      { nome: "1º eixo — Direção", posicoes: ["TEE","TEI","TDI","TDE"] },
      { nome: "2º eixo — Tração",  posicoes: ["2°EEE","2°EEI","2°EDI","2°EDE"] },
      { nome: "3º eixo — Tração",  posicoes: ["3°EEE","3°EEI","3°EDI","3°EDE"] },
      { nome: "4º eixo — Truque",  posicoes: ["TRKEE","TRKEI","TRKDI","TRKDE"] },
    ],
    temEstepe: true,
    estepeLado: "esquerda",
  },
  carreta_simples: {
    label: "Carreta simples (2 eixos)",
    posicoes: ["1°EEE","1°EEI","1°EDI","1°EDE","2°EEE","2°EEI","2°EDI","2°EDE"],
    eixos: [
      { nome: "1º eixo", posicoes: ["1°EEE","1°EEI","1°EDI","1°EDE"] },
      { nome: "2º eixo", posicoes: ["2°EEE","2°EEI","2°EDI","2°EDE"] },
    ],
    temEstepe: true,
    estepeLado: "direita",
  },
  carreta_3eixos: {
    label: "Carreta 3 eixos",
    posicoes: ["1°EEE","1°EEI","1°EDI","1°EDE","2°EEE","2°EEI","2°EDI","2°EDE","3°EEE","3°EEI","3°EDI","3°EDE"],
    eixos: [
      { nome: "1º eixo", posicoes: ["1°EEE","1°EEI","1°EDI","1°EDE"] },
      { nome: "2º eixo", posicoes: ["2°EEE","2°EEI","2°EDI","2°EDE"] },
      { nome: "3º eixo", posicoes: ["3°EEE","3°EEI","3°EDI","3°EDE"] },
    ],
    temEstepe: true,
    estepeLado: "direita",
  },
  dolly: {
    label: "Dolly (1 eixo)",
    posicoes: ["1°EEE","1°EEI","1°EDI","1°EDE"],
    eixos: [
      { nome: "1º eixo", posicoes: ["1°EEE","1°EEI","1°EDI","1°EDE"] },
    ],
    temEstepe: false,
  },
  dolly_2eixos: {
    label: "Dolly (2 eixos)",
    posicoes: ["1°EEE","1°EEI","1°EDI","1°EDE","2°EEE","2°EEI","2°EDI","2°EDE"],
    eixos: [
      { nome: "1º eixo", posicoes: ["1°EEE","1°EEI","1°EDI","1°EDE"] },
      { nome: "2º eixo", posicoes: ["2°EEE","2°EEI","2°EDI","2°EDE"] },
    ],
    temEstepe: false,
  },
};

// Heurística pra sugerir esquema a partir do cadastro atual do veículo.
export function sugerirEsquema(veiculo) {
  if (!veiculo) return null;
  const tipo = String(veiculo.tipo || "").toLowerCase();
  const conj = String(veiculo.tipo_conjunto || "").toLowerCase();
  const eixos = Number(veiculo.total_eixos);
  if (tipo === "carreta") {
    if (conj.includes("dolly") && eixos === 2) return "dolly_2eixos";
    if (conj.includes("dolly"))                return "dolly";
    if (eixos === 3 || conj.includes("3 eixos") || conj.includes("três eixos")) return "carreta_3eixos";
    return "carreta_simples";
  }
  if (conj.includes("truque") || eixos === 4) return "cavalo_4eixos";
  if (conj.includes("truck") || conj.includes("trucado") || eixos === 3) return "cavalo_trucado";
  if (conj.includes("toco")  || eixos === 2) return "cavalo_toco";
  return "cavalo_trucado";
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
