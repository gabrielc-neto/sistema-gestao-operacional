import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { uploadArquivo } from "../services/cloudinary"; // cloudinary.js agora bate no VPS
import { usuarioPontual } from "../utils/format";
import {
  listAll as dsListAll,
  watch as dsWatch,
  save as dsSave,
  insert as dsInsert,
  patch as dsPatch,
  remove as dsRemove,
} from "../services/manutencaoDataSource";
import {
  list as gdsList,
  watch as gdsWatch,
  patch as gdsPatch,
  insert as gdsInsert,
  remove as gdsRemove,
} from "../services/genericDataSource";
import { patchVeiculo, listVeiculos, watchVeiculos } from "../services/frotaDataSource";
import { useAuth } from "../contexts/AuthContext";
import { useRBAC } from "../rbac/RBACContext";
import { useOdometrosSascar } from "../hooks/useOdometrosSascar";
import LogoPontual from "../components/LogoPontual";

import PadAssinatura from "../components/PadAssinatura";
import { gerarPdfOS, visualizarPdfOS } from "../utils/pdfOS";
import AbaConjuntoVencimentos from "../manutencao/AbaConjuntoVencimentos";
import AbaControleRotina from "../manutencao/AbaControleRotina";
import AbaEstoque from "../manutencao/AbaEstoque";
import AbaRequisicoes from "../manutencao/AbaRequisicoes";
import AbaIndicadores from "../manutencao/AbaIndicadores";
// AbaMultas + AbaTimeline + AbaVistoria: arquivos mantidos em /manutencao/ pra reativar futuramente
import AbaPreditiva from "../manutencao/AbaPreditiva";
import ChecklistMensalPanel from "./ChecklistMensalPanel";
import {
  LayoutDashboard, Truck, ListChecks, AlertTriangle, FilePlus2,
  FileText, Receipt, Settings, TrendingUp, FileDown, Eye, Layers, Droplet, Gauge, SprayCan, Package,
  ClipboardCheck, Store, Camera, Circle, AlertCircle, CheckCircle2, Lightbulb, Award, Trash2,
  AlertOctagon, ShoppingCart as ShoppingCartIco, Clock, CheckSquare, Brain, Printer,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";

// ── Catálogo de tipos de manutenção ───────────────────────────────────────
const TIPOS = [
  // Documentação
  { id:"civ",              label:"CIV",                   grupo:"Documentação", desc:"Certificado de Inspeção Veicular — vistoria obrigatória anual",              campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"cipp",             label:"CIPP",                  grupo:"Documentação", desc:"Certificado de Inspeção para Produtos Perigosos — veículos que transportam cargas perigosas (MOPP)", campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"crlv",             label:"CRLV",                  grupo:"Documentação", desc:"Certificado de Registro e Licenciamento do Veículo",                         campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"tacografo",        label:"Tacógrafo",             grupo:"Documentação", desc:"Calibração, certificação e próximo vencimento do tacógrafo (INMETRO)",      campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"extintor",         label:"Extintor",              grupo:"Documentação", desc:"Validade e recarga do extintor de incêndio (cabine e carreta)",            campos:["data_realiz","venc","local","resp","obs"] },
  { id:"rntrc",            label:"RNTRC",                 grupo:"Documentação", desc:"Registro Nacional de Transportadores Rodoviários de Cargas (ANTT)",          campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"licenca_parana",   label:"Licença Paraná",        grupo:"Documentação", desc:"Licença especial de trânsito no estado do Paraná (bitrem)",                 campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"licenca_federal",  label:"Licença Federal-DNIT",  grupo:"Documentação", desc:"Licença Federal DNIT para bitrens em rodovias federais",                   campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"aet",              label:"AET",                   grupo:"Documentação", desc:"Autorização Especial de Trânsito — cargas especiais/indivisíveis (DER/DNIT)", campos:["data_realiz","venc","numero_doc","local","resp","obs"] },
  { id:"ipem",             label:"IPEM",                  grupo:"Documentação", desc:"Aferição do tanque pelo Instituto de Pesos e Medidas — após vencer, informe a data agendada da nova inspeção", campos:["data_realiz","venc","agendamento","local","numero_doc","resp","obs"] },
  { id:"cnh_venc",         label:"Validade CNH",          grupo:"Motorista",    desc:"Vencimento da CNH do motorista",                                           campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"aso",              label:"ASO",                   grupo:"Motorista",    desc:"Atestado de Saúde Ocupacional — exame médico periódico obrigatório",       campos:["data_realiz","venc","local","resp","obs"] },
  { id:"toxicologico",     label:"Exame Toxicológico",    grupo:"Motorista",    desc:"Exame toxicológico obrigatório para motoristas profissionais (Lei 13.103/2015) — validade 2,5 anos", campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"mopp",             label:"MOPP",                  grupo:"Motorista",    desc:"Movimentação Operacional de Produtos Perigosos — certificação do motorista", campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"nr20",             label:"NR-20",                 grupo:"Motorista",    desc:"Certificação NR-20 — Segurança e Saúde no Trabalho com Inflamáveis",        campos:["data_realiz","venc","local","resp","obs"] },
  { id:"nr35",             label:"NR-35",                 grupo:"Motorista",    desc:"Certificação NR-35 — Trabalho em Altura",                                   campos:["data_realiz","venc","local","resp","obs"] },
  // Mecânica
  { id:"oleo",             label:"Troca de Óleo",         grupo:"Mecânica",     desc:"Troca do óleo do motor e filtros",                                          campos:["data_realiz","venc","km_atual","km_prox","local","resp","obs"] },
  { id:"bateria",          label:"Bateria",               grupo:"Mecânica",     desc:"Troca ou verificação da bateria",                                           campos:["data_realiz","venc","local","resp","obs"] },
  { id:"engraxe",          label:"Engraxe Geral",         grupo:"Mecânica",     desc:"Engraxe geral de quinta-roda, rolamentos e articulações",                  campos:["data_realiz","venc","km_atual","km_prox","local","resp","obs"] },
  { id:"pneus",            label:"Pneus",                 grupo:"Mecânica",     desc:"Troca, recapagem ou rodízio de pneus",                                      campos:["data_realiz","venc","km_atual","km_prox","local","resp","obs"] },
  { id:"freios",           label:"Freios",                grupo:"Mecânica",     desc:"Verificação e ajuste do sistema de freios (lonas, discos, cilindros)",      campos:["data_realiz","venc","km_atual","km_prox","local","resp","obs"] },
  { id:"suspensao",        label:"Suspensão",             grupo:"Mecânica",     desc:"Revisão e manutenção da suspensão e amortecedores",                        campos:["data_realiz","venc","km_atual","km_prox","local","resp","obs"] },
  { id:"alinhamento",      label:"Alinhamento",           grupo:"Mecânica",     desc:"Alinhamento e balanceamento de rodas",                                      campos:["data_realiz","venc","km_atual","km_prox","local","resp","obs"] },
  { id:"arrefecimento",    label:"Arrefecimento",         grupo:"Mecânica",     desc:"Revisão do sistema de arrefecimento — radiador, fluido e mangueiras",      campos:["data_realiz","venc","km_atual","km_prox","local","resp","obs"] },
  { id:"embreagem",        label:"Embreagem",             grupo:"Mecânica",     desc:"Troca ou ajuste da embreagem",                                              campos:["data_realiz","venc","km_atual","km_prox","local","resp","obs"] },
  { id:"diferencial",      label:"Diferencial / Câmbio",  grupo:"Mecânica",     desc:"Revisão e troca de óleo do diferencial e caixa de câmbio",                 campos:["data_realiz","venc","km_atual","km_prox","local","resp","obs"] },
  { id:"preventiva",       label:"Preventiva",            grupo:"Mecânica",     desc:"Manutenção preventiva geral programada por KM ou período",                  campos:["data_realiz","venc","km_atual","km_prox","local","resp","obs"] },
  { id:"lavagem",          label:"Lavagem",               grupo:"Mecânica",     desc:"Lavagem do veículo — intervalo padrão 35 dias, alerta 5 dias antes",         campos:["data_realiz","venc","local","resp","obs"] },
  { id:"lubrificacao",     label:"Lubrificação",          grupo:"Mecânica",     desc:"Lubrificação/engraxamento — intervalo padrão 35 dias, alerta 5 dias antes",  campos:["data_realiz","venc","local","resp","obs"] },
  { id:"calibragem",       label:"Calibragem de Pneus",   grupo:"Mecânica",     desc:"Calibragem de pneus — intervalo padrão 10 dias, alerta 2 dias antes",        campos:["data_realiz","venc","local","resp","obs"] },
];

const CAMPO_LABEL = {
  data_realiz: "Data da Realização / Inspeção",
  venc:        "Validade / Próximo Vencimento",
  agendamento: "Agendamento da Nova Inspeção",
  local:       "Local / Oficina",
  numero_doc:  "Número do Documento",
  km_atual:    "KM na Realização",
  km_prox:     "Próxima manutenção (KM)",
  resp:        "Responsável",
  obs:         "Observações",
};

const EMPTY_FORM = { data_realiz:"", venc:"", agendamento:"", local:"", numero_doc:"", km_atual:"", km_prox:"", resp:"", obs:"" };

// Abertura de OS — form vazio (bloqueia o veículo, NÃO tem custo)
const EMPTY_OS = { tipoServico: "", placa: "", motoristaId: "", hodometro: "", obs: "", fornecedor: "", fornecedorCnpj: "" };
const EMPTY_CONCLUSAO = { kmSaida: "", mecanico: "", oficina: "", servicoExecutado: "", fornecedor: "", fornecedorCnpj: "", assinaturaMotorista: null, garantiaDias: "90" };

// Lançamento de NF — registro de nota fiscal/custo (NÃO bloqueia o veículo)
// Sugestões iniciais do "Tipo de lançamento" (campo é cadastrável — aceita novos)
const TIPO_LANCAMENTO_SUGEST = [
  "Estoque", "Peças", "Manutenção", "Pneus", "Socorro", "Lavagem",
  "Sistema", "Contrato", "Documentação", "Elétrico", "Motor", "Inspeção"
];
// Cabeçalho do lançamento (os serviços/peças ficam na lista `itens`)
const EMPTY_LANC = {
  osId:           "",
  osNumero:       "",
  tipoLancamento: "",
  placa:          "",
  fornecedor:     "",
  hodometro:      "",
  servicoFeito:   "",
};
// Um item (serviço ou peça) dentro do lançamento
const EMPTY_ITEM = { tipoItem: "", item: "", quantidade: "", valorUnitario: "" };

// normaliza nome de item pra comparar/deduplicar no catálogo
function normNome(s) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// opções de um catálogo (sugestões + cadastrados), deduplicadas
function opcoesCatalogo(itensCatalogo, tipo, defaults = []) {
  const todos = [...defaults, ...itensCatalogo.filter(i => i.tipo === tipo).map(i => i.nome)];
  const vistos = new Set();
  return todos.filter(n => {
    const k = normNome(n);
    if (!k || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

// converte string de input numérico em número seguro
function numOS(v) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// total de um lançamento = soma dos itens (com fallback pro formato antigo de 1 item)
function somaItens(lanc) {
  if (Array.isArray(lanc?.itens)) {
    return lanc.itens.reduce((s, it) => s + (Number(it.valorTotal) || numOS(it.quantidade) * numOS(it.valorUnitario)), 0);
  }
  return numOS(lanc?.quantidade) * numOS(lanc?.valorUnitario); // lançamentos antigos
}


// formata valor em Real
function fmtBRL(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// máscara de moeda no formato 000,00 (digita centavos: "80000" → "800,00")
function maskMoeda(v) {
  const digits = String(v ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toFixed(2).replace(".", ",");
}


const GRUPO_COLOR = {
  "Documentação": { bg:"#dbeafe", color:"#1d4ed8", border:"#93c5fd" },
  "Motorista":    { bg:"var(--warning-bg)", color:"#92400e", border:"#fcd34d" },
  "Mecânica":     { bg:"#d1fae5", color:"#065f46", border:"#6ee7b7" },
};

// ── Status ────────────────────────────────────────────────────────────────
// Assinatura tolerante: aceita string (venc só) ou registro inteiro (para checar agendamento)
// Aceita (vencStr) ou (rec) ou (rec, ctx={odometroAtual}).
// Se ctx.odometroAtual e rec.km_prox setados, cruza: vence pelo que vier primeiro.
// KM_ALERTA_LIMITE = 1000 km faltando pra próxima manutenção → 'alerta' por KM.
function calcStatus(vencStrOuRec, ctx = {}) {
  const isObj = vencStrOuRec && typeof vencStrOuRec === "object";
  const vencStr = isObj ? vencStrOuRec.venc : vencStrOuRec;
  const agendamento = isObj ? vencStrOuRec.agendamento : null;
  const kmProx = isObj ? Number(vencStrOuRec.km_prox) : null;
  const odometroAtual = Number(ctx?.odometroAtual);

  // 1) Cheque por KM (se dado disponível) — vence quando odômetro passar do km_prox
  let statusKm = null;
  if (Number.isFinite(kmProx) && kmProx > 0 && Number.isFinite(odometroAtual) && odometroAtual > 0) {
    const faltamKm = kmProx - odometroAtual;
    if (faltamKm <= 0) statusKm = "vencido";
    else if (faltamKm <= 1000) statusKm = "alerta";
    else statusKm = "ok";
  }

  // 2) Cheque por data
  let statusData = "sem_data";
  if (vencStr) {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const venc = new Date(vencStr + "T00:00:00");
    const diff = Math.ceil((venc - hoje) / 86400000);
    if (diff < 0) {
      if (agendamento) {
        const dag = new Date(agendamento + "T00:00:00");
        const diffAg = Math.ceil((dag - hoje) / 86400000);
        if (diffAg >= 0) statusData = "agendado";
        else statusData = "vencido";
      } else {
        statusData = "vencido";
      }
    } else if (diff <= 30) statusData = "alerta";
    else statusData = "ok";
  }

  // 3) Combina — vence pelo mais crítico
  const ORDER = { vencido: 0, alerta: 1, agendado: 2, ok: 3, sem_data: 4 };
  if (statusKm === null) return statusData;
  return ORDER[statusKm] < ORDER[statusData] ? statusKm : statusData;
}

const STATUS_ORDER = { vencido: 0, alerta: 1, agendado: 2, ok: 3, sem_data: 4 };

const STATUS_META = {
  vencido:  { label:"Vencido",      bg:"var(--danger-bg)", color:"var(--danger)", rowBg:"var(--danger-bg)" },
  alerta:   { label:"Alerta",       bg:"#fef9c3", color:"#a16207", rowBg:"var(--warning-bg)" },
  agendado: { label:"Agendado",     bg:"#dbeafe", color:"#1d4ed8", rowBg:"#eff6ff" },
  ok:       { label:"OK",           bg:"var(--success-bg)", color:"var(--success)", rowBg:"#f0fdf4" },
  sem_data: { label:"Sem registro", bg:"var(--surface-2)", color:"var(--text-subtle)", rowBg:"var(--surface-2)" },
};

function fmtDate(str) {
  if (!str) return "—";
  // Aceita "YYYY-MM-DD" (frontend antigo) ou ISO "YYYY-MM-DDTHH:mm:ss.sssZ" (PostgreSQL/JSONB).
  const s = String(str).slice(0, 10); // pega só YYYY-MM-DD
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

// ── Ordens de Serviço — janela de edição e status ──────────────────────────
const OS_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h após a abertura

// status efetivo da OS (OS antigas sem campo `status` contam como abertas)
function osStatus(os) {
  return os?.status === "finalizada" ? "finalizada" : "aberta";
}

// instante de criação da OS (fallback pra OS antigas)
function osCriadoEm(os) {
  return os?.criadoEm || os?.dataHora || null;
}

// Aging OS — quantos dias a OS está aberta (ordenação + cor visual)
// Retorna { dias, cor, bg, texto, urgencia }. urgencia: 'critico'|'atencao'|'normal'
function osAging(os) {
  const base = osCriadoEm(os);
  if (!base) return { dias: null, cor: "var(--text-subtle)", bg: "var(--surface-2)", texto: "—", urgencia: "normal" };
  const ms = typeof base === "object" && base.toMillis ? base.toMillis() : Date.parse(base);
  if (!Number.isFinite(ms)) return { dias: null, cor: "var(--text-subtle)", bg: "var(--surface-2)", texto: "—", urgencia: "normal" };
  const dias = Math.floor((Date.now() - ms) / 86400000);
  if (dias >= 14) return { dias, cor: "var(--danger)", bg: "var(--danger-bg)", texto: `${dias}d`, urgencia: "critico" };
  if (dias >= 7)  return { dias, cor: "var(--warning)", bg: "var(--warning-bg)", texto: `${dias}d`, urgencia: "atencao" };
  if (dias >= 1)  return { dias, cor: "var(--success)", bg: "var(--success-bg)", texto: `${dias}d`, urgencia: "normal" };
  return { dias, cor: "var(--success)", bg: "var(--success-bg)", texto: `hoje`, urgencia: "normal" };
}

// OS só é editável enquanto aberta E dentro das 24h da abertura
function osEditavel(os) {
  if (osStatus(os) === "finalizada") return false;
  const base = osCriadoEm(os);
  if (!base) return false;
  const t = new Date(base).getTime();
  if (!Number.isFinite(t)) return false;
  return (Date.now() - t) <= OS_EDIT_WINDOW_MS;
}

// limite de edição em ISO (pra exibir "edição até ...")
function osLimiteEdicao(os) {
  const base = osCriadoEm(os);
  if (!base) return null;
  const t = new Date(base).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t + OS_EDIT_WINDOW_MS).toISOString();
}

// ── Dashboard de Custos da aba Lançamento ─────────────────────────────────
const PERIODOS_LANC = [
  { key: "mes",       label: "Este mês" },
  { key: "mes_ant",   label: "Mês passado" },
  { key: "ano",       label: "Este ano" },
  { key: "tudo",      label: "Tudo" },
  { key: "custom",    label: "Personalizado" },
];

// Paleta cíclica para colorir categorias do ranking
const PALETA_CAT = ["#1d4ed8","#15803d","#b45309","#dc2626","#7c3aed","#0891b2","#db2777","#65a30d","#c2410c","#0284c7","#9333ea","#059669"];

function inicioPeriodo(key, agora, customIni) {
  const y = agora.getFullYear();
  const m = agora.getMonth();
  if (key === "mes")      return new Date(y, m, 1).getTime();
  if (key === "mes_ant")  return new Date(y, m - 1, 1).getTime();
  if (key === "ano")      return new Date(y, 0, 1).getTime();
  if (key === "custom" && customIni) {
    const t = new Date(`${customIni}T00:00:00`).getTime();
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function fimPeriodo(key, agora, customFim) {
  const y = agora.getFullYear();
  const m = agora.getMonth();
  if (key === "mes_ant") return new Date(y, m, 1).getTime() - 1;
  if (key === "custom" && customFim) {
    const t = new Date(`${customFim}T23:59:59`).getTime();
    return Number.isFinite(t) ? t : agora.getTime();
  }
  return agora.getTime();
}
function fmtBRLcurto(n) {
  const v = Number(n) || 0;
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1000)    return `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return (v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function nomeMes(m) {
  return ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][m];
}

function DashboardCustos({ lancamentos, fmtBRLfn }) {
  const [periodo, setPeriodo] = useState("ano");
  const [customIni, setCustomIni] = useState("");
  const [customFim, setCustomFim] = useState("");

  const { filtrados, totalGeral, ranking, mediaMes, seriesPorCategoria } = useMemo(() => {
    const agora = new Date();
    const ini = inicioPeriodo(periodo, agora, customIni);
    const fim = fimPeriodo(periodo, agora, customFim);

    const filtrados = (lancamentos || []).filter(l => {
      const t = new Date(l.criadoEm || l.dataHora).getTime();
      return Number.isFinite(t) && t >= ini && t <= fim;
    });

    const totalGeral = filtrados.reduce((s, l) => s + (Number(l.valorTotal) || 0), 0);

    // Agrupa lançamentos por categoria, guardando total + registros para a série mensal
    const porCategoria = {};
    for (const l of filtrados) {
      const cat = (l.tipoLancamento || "Sem categoria").trim() || "Sem categoria";
      if (!porCategoria[cat]) porCategoria[cat] = { total: 0, registros: [] };
      porCategoria[cat].total += (Number(l.valorTotal) || 0);
      porCategoria[cat].registros.push(l);
    }
    const ranking = Object.entries(porCategoria)
      .map(([nome, d]) => ({ nome, valor: d.total, pct: totalGeral > 0 ? (d.total / totalGeral) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor);

    let mesesNoPeriodo;
    if (periodo === "mes" || periodo === "mes_ant") mesesNoPeriodo = 1;
    else if (periodo === "ano") mesesNoPeriodo = agora.getMonth() + 1;
    else if (filtrados.length === 0) mesesNoPeriodo = 1;
    else {
      const ts = filtrados.map(l => new Date(l.criadoEm || l.dataHora).getTime()).filter(Number.isFinite);
      const minT = Math.min(...ts);
      const dM = (agora.getTime() - minT) / (1000 * 60 * 60 * 24 * 30.4);
      mesesNoPeriodo = Math.max(1, Math.round(dM));
    }
    const mediaMes = totalGeral / mesesNoPeriodo;

    // Template de meses do eixo X — varia conforme o período selecionado
    const monthsTemplate = [];
    if (periodo === "ano") {
      // Este ano = jan do ano corrente até o mês atual (evita 6 meses vazios)
      for (let m = 0; m <= agora.getMonth(); m++) {
        const d = new Date(agora.getFullYear(), m, 1);
        monthsTemplate.push({
          key: `${d.getFullYear()}-${d.getMonth()}`,
          label: nomeMes(d.getMonth()),
          ano: d.getFullYear(),
          mesIdx: d.getMonth(),
        });
      }
    } else {
      const N_MESES = periodo === "mes" || periodo === "mes_ant" ? 1 : 12;
      for (let i = N_MESES - 1; i >= 0; i--) {
        const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
        monthsTemplate.push({
          key: `${d.getFullYear()}-${d.getMonth()}`,
          label: nomeMes(d.getMonth()),
          ano: d.getFullYear(),
          mesIdx: d.getMonth(),
        });
      }
    }

    // Uma série mensal POR CATEGORIA — cada categoria vira seu próprio gráfico
    const seriesPorCategoria = ranking.map((r, i) => {
      const cor = PALETA_CAT[i % PALETA_CAT.length];
      const mesesSerie = monthsTemplate.map(m => ({ ...m, valor: 0 }));
      for (const l of (porCategoria[r.nome]?.registros || [])) {
        const t = new Date(l.criadoEm || l.dataHora);
        if (!Number.isFinite(t.getTime())) continue;
        const k = `${t.getFullYear()}-${t.getMonth()}`;
        const slot = mesesSerie.find(x => x.key === k);
        if (slot) slot.valor += (Number(l.valorTotal) || 0);
      }
      const maxMes = Math.max(1, ...mesesSerie.map(m => m.valor));
      const qtdLanc = (porCategoria[r.nome]?.registros || []).length;
      return { ...r, cor, mesesSerie, maxMes, qtdLanc };
    });

    return { filtrados, totalGeral, ranking, mediaMes, seriesPorCategoria };
  }, [lancamentos, periodo, customIni, customFim]);

  return (
    <div style={{ background: "var(--card-bg)", borderRadius: 14, padding: "1rem 1.25rem", marginBottom: "1rem", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(15,23,42,.05), 0 8px 24px -16px rgba(15,23,42,.10)" }}>
      {/* Cabeçalho do dashboard */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--text)", fontSize: "1rem", fontWeight: 700 }} className="manut-display">Dashboard de custos</h2>
          <p style={{ margin: "2px 0 0 0", fontSize: ".75rem", color: "var(--text-muted)" }}>
            {filtrados.length} lançamento{filtrados.length === 1 ? "" : "s"} no período selecionado
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 8, padding: 6, background: "var(--surface-2)", borderRadius: 12, flexWrap: "wrap" }}>
            {PERIODOS_LANC.map(p => (
              <button key={p.key} type="button" onClick={() => setPeriodo(p.key)}
                style={{ padding: "7px 16px", borderRadius: 8, border: "none", fontSize: ".82rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  background: periodo === p.key ? "var(--text)" : "transparent",
                  color: periodo === p.key ? "#fff" : "var(--text-muted)",
                }}>
                {p.label}
              </button>
            ))}
          </div>
          {periodo === "custom" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".74rem", fontWeight: 600, color: "var(--text-muted)" }}>
                De:
                <input type="date" value={customIni} onChange={e => setCustomIni(e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", fontSize: ".78rem", fontFamily: "inherit" }}
                />
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".74rem", fontWeight: 600, color: "var(--text-muted)" }}>
                Até:
                <input type="date" value={customFim} onChange={e => setCustomFim(e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", fontSize: ".78rem", fontFamily: "inherit" }}
                />
              </label>
              {(customIni || customFim) && (
                <button type="button" onClick={() => { setCustomIni(""); setCustomFim(""); }}
                  style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "transparent", fontSize: ".72rem", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}>
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPIs principais */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "linear-gradient(135deg, #1a3a5c, #234775)", color: "#fff" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 700, opacity: .75, textTransform: "uppercase", letterSpacing: ".04em" }}>Total gasto</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 4, lineHeight: 1 }} className="manut-display">{fmtBRLfn(totalGeral)}</div>
        </div>
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: ".04em" }}>Categorias</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0c4a6e", marginTop: 4, lineHeight: 1 }} className="manut-display">{ranking.length}</div>
        </div>
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #86efac" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: ".04em" }}>Média / mês</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#14532d", marginTop: 4, lineHeight: 1 }} className="manut-display">{fmtBRLcurto(mediaMes)}</div>
        </div>
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--warning-bg)", border: "1px solid #fcd34d" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--warning)", textTransform: "uppercase", letterSpacing: ".04em" }}>Lançamentos</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#78350f", marginTop: 4, lineHeight: 1 }} className="manut-display">{filtrados.length}</div>
        </div>
      </div>

      {/* Ranking por categoria — barras horizontais */}
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: ".82rem", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: ".04em" }}>Gastos por categoria</h3>
        {ranking.length === 0 ? (
          <p style={{ fontSize: ".82rem", color: "var(--text-subtle)", padding: "1.5rem", textAlign: "center" }}>Nenhum lançamento no período.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ranking.map((r, i) => {
              const cor = PALETA_CAT[i % PALETA_CAT.length];
              return (
                <div key={r.nome} style={{ padding: "6px 8px", borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, fontSize: ".82rem" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, color: "var(--text)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: cor }} />
                      {r.nome}
                    </span>
                    <span style={{ fontWeight: 700, color: cor }} className="manut-display">
                      {fmtBRLfn(r.valor)} <span style={{ color: "var(--text-subtle)", fontWeight: 600, fontSize: ".72rem" }}>· {r.pct.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div style={{ height: 8, background: "var(--surface-2)", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.max(2, r.pct)}%`, background: cor, transition: "width .3s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gráfico agrupado: meses no eixo X, categorias lado a lado dentro de cada mês */}
      <div style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: ".82rem", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: ".04em" }}>
          Evolução mês a mês — categorias lado a lado
        </h3>
        {seriesPorCategoria.length === 0 ? (
          <p style={{ fontSize: ".82rem", color: "var(--text-subtle)", padding: "1.5rem", textAlign: "center" }}>Nenhum lançamento no período.</p>
        ) : (
          <GraficoAgrupado series={seriesPorCategoria} fmtBRLfn={fmtBRLfn} />
        )}
      </div>
    </div>
  );
}

// Gráfico de barras AGRUPADAS — eixo X = meses, dentro de cada mês uma barra por categoria
function GraficoAgrupado({ series, fmtBRLfn }) {
  if (!series.length) return null;
  // Eixo X usa os meses da primeira categoria (todas têm o mesmo template de meses)
  const meses = series[0].mesesSerie;
  const nMeses = meses.length;
  const nCats  = series.length;

  // Valor máximo entre TODAS as categorias × meses (escala única)
  let maxVal = 1;
  for (const cat of series) {
    for (const m of cat.mesesSerie) {
      if (m.valor > maxVal) maxVal = m.valor;
    }
  }

  // Largura do gráfico escala com o número de meses (1 mês = compacto, 12 = mais largo)
  // Card pai também usa cardMaxWidth pra acompanhar
  const cardMaxWidth = Math.min(620, 220 + nMeses * 34);
  const W = Math.min(560, 140 + nMeses * 36);
  const H = 360, padL = 44, padR = 8, padT = 12, padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const groupW = innerW / nMeses;            // largura disponível para cada mês
  const gapEntreMeses = groupW * 0.18;       // 18% do grupo é espaço entre meses
  const groupInner    = groupW - gapEntreMeses;
  const barW = Math.max(4, groupInner / nCats);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", background: "var(--card-bg)", boxShadow: "0 1px 3px rgba(15,23,42,.05)", width: "100%", maxWidth: cardMaxWidth, boxSizing: "border-box" }}>
      {/* Legenda — uma chip por categoria */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        {series.map(cat => (
          <div key={cat.nome} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 20, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: cat.cor }} />
            <span style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--text)" }}>{cat.nome}</span>
            <span style={{ fontSize: ".78rem", color: cat.cor, fontWeight: 800 }} className="manut-display">{fmtBRLfn(cat.valor)}</span>
          </div>
        ))}
      </div>

      <div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "auto" }}>
          {/* Grade horizontal + rótulos do eixo Y */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = padT + innerH * (1 - p);
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border)" strokeWidth="1" />
                <text x={padL - 6} y={y + 4} fontSize="12" fill="var(--text-subtle)" textAnchor="end" fontFamily="Manrope, sans-serif">
                  {fmtBRLcurto(maxVal * p).replace("R$ ", "")}
                </text>
              </g>
            );
          })}

          {/* Para cada mês: desenha N barras lado a lado, uma por categoria */}
          {meses.map((m, mi) => {
            const groupX = padL + mi * groupW + gapEntreMeses / 2;
            return (
              <g key={m.key}>
                {series.map((cat, ci) => {
                  const valor = cat.mesesSerie[mi]?.valor || 0;
                  const h = (valor / maxVal) * innerH;
                  const x = groupX + ci * barW;
                  const y = padT + innerH - h;
                  return (
                    <g key={cat.nome}>
                      {h > 0 ? (
                        <rect x={x + 1} y={y} width={Math.max(2, barW - 2)} height={h} fill={cat.cor} rx="2">
                          <title>{`${cat.nome} · ${m.label}/${String(m.ano).slice(2)}: ${fmtBRLfn(valor)}`}</title>
                        </rect>
                      ) : (
                        <rect x={x + 1} y={padT + innerH - 1} width={Math.max(2, barW - 2)} height={1} fill="var(--border)" />
                      )}
                    </g>
                  );
                })}
                {/* Rótulo do mês embaixo do grupo */}
                <text x={groupX + (groupInner) / 2} y={padT + innerH + 16} fontSize="12" fill="var(--text-muted)" textAnchor="middle" fontWeight="600" fontFamily="Manrope, sans-serif">
                  {m.label.slice(0, 3)}
                </text>
                {(m.mesIdx === 0 || mi === 0) && (
                  <text x={groupX + (groupInner) / 2} y={padT + innerH + 32} fontSize="11" fill="var(--text-subtle)" textAnchor="middle" fontFamily="Manrope, sans-serif">
                    {m.ano}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Ícones SVG inline (estilo lucide) ──────────────────────────────────────
const Sv = ({ size = 16, color = "currentColor", style, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
    {children}
  </svg>
);
const Ico = {
  Truck:  (p) => <Sv {...p}><path d="M5 18H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11"/><path d="M15 18H9"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M14 9h4l4 4v5h-2"/></Sv>,
  Wrench: (p) => <Sv {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/></Sv>,
  Search: (p) => <Sv {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Sv>,
  Plus:   (p) => <Sv {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Sv>,
  Dash:   (p) => <Sv {...p}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></Sv>,
  Menu:   (p) => <Sv {...p}><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></Sv>,
  Alert:  (p) => <Sv {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Sv>,
  Clip:   (p) => <Sv {...p}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></Sv>,
  Settings:(p) => <Sv {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Sv>,
};

// ── Campo de busca + seleção, com botão "Cadastrar" ao lado ─────────────────
function SearchSelect({ value, onChange, options, onAdd, placeholder }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const v = value || "";
  const filtro = v.trim().toLowerCase();
  const filtradas = (options || []).filter(o => (o || "").toLowerCase().includes(filtro));
  const existeExato = (options || []).some(o => (o || "").trim().toLowerCase() === filtro);
  const podeCadastrar = !!onAdd && !!v.trim() && !existeExato;

  useEffect(() => {
    function onDoc(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function cadastrar() {
    const nm = v.trim();
    if (!nm) return;
    onChange(nm);
    onAdd(nm);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          style={{ ...s.fieldInput, flex: 1 }}
          value={v}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {onAdd && (
          <button
            type="button"
            onClick={cadastrar}
            disabled={!podeCadastrar}
            title={existeExato ? "Já cadastrado" : (!v.trim() ? "Digite um nome" : "Cadastrar este nome")}
            style={{ whiteSpace:"nowrap", padding:"8px 14px", border:"none", borderRadius:6, fontWeight:700, fontSize:".82rem", cursor: podeCadastrar ? "pointer" : "default", background: podeCadastrar ? "var(--success-bg)" : "var(--border)", color: podeCadastrar ? "var(--success)" : "var(--text-subtle)" }}
          >
            + Cadastrar
          </button>
        )}
      </div>
      {open && filtradas.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:60, background:"var(--card-bg)", border:"1px solid var(--border-strong)", borderRadius:6, marginTop:2, maxHeight:220, overflowY:"auto", boxShadow:"0 6px 16px rgba(0,0,0,.14)" }}>
          {filtradas.map(o => (
            <div
              key={o}
              onMouseDown={e => { e.preventDefault(); onChange(o); setOpen(false); }}
              style={{ padding:"8px 12px", cursor:"pointer", fontSize:".88rem", color:"var(--text-subtle)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--card-bg)")}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dashboard Analytics — visão executiva com gráficos recharts ───────────
const CORES_STATUS = { normal: "#16a34a", atencao: "#f59e0b", critico: "#dc2626" };

function DashboardAnalytics({ lancamentos: lancamentosRaw, fmtBRLfn }) {
  const agoraAno = new Date().getFullYear();

  // Filtro de período (aplica antes de tudo)
  const [periodo, setPeriodo] = useState("ano");
  const [customIni, setCustomIni] = useState("");
  const [customFim, setCustomFim] = useState("");

  const lancamentos = useMemo(() => {
    const agora = new Date();
    const ini = inicioPeriodo(periodo, agora, customIni);
    const fim = fimPeriodo(periodo, agora, customFim);
    return (lancamentosRaw || []).filter(l => {
      const t = new Date(l.criadoEm || l.dataHora).getTime();
      return Number.isFinite(t) && t >= ini && t <= fim;
    });
  }, [lancamentosRaw, periodo, customIni, customFim]);

  // Anos disponíveis a partir dos dados brutos (sem filtro — o seletor precisa ver todos)
  const anosDisponiveis = useMemo(() => {
    const set = new Set([agoraAno]);
    for (const l of (lancamentosRaw || [])) {
      const t = new Date(l.criadoEm || l.dataHora);
      if (Number.isFinite(t.getTime())) set.add(t.getFullYear());
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [lancamentosRaw, agoraAno]);

  const [anoBarras, setAnoBarras] = useState(agoraAno);
  const [anoLinhas, setAnoLinhas] = useState(agoraAno);

  const {
    totalGeral, totalVeiculos, mediaVeiculo, mediaMes,
    dadosPizzaCategoria, dadosBarrasMensal, top10Veiculos,
    dadosStatusFrota, dadosLinhaAcumulado,
  } = useMemo(() => {
    const list = lancamentos || [];
    // Total geral (todos os lançamentos, sem filtro de período)
    const totalGeral = list.reduce((s, l) => s + (Number(l.valorTotal) || 0), 0);

    // Distribuição por categoria (pizza)
    const porCategoria = {};
    for (const l of list) {
      const cat = (l.tipoLancamento || "Sem categoria").trim() || "Sem categoria";
      porCategoria[cat] = (porCategoria[cat] || 0) + (Number(l.valorTotal) || 0);
    }
    const dadosPizzaCategoria = Object.entries(porCategoria)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Evolução mensal do ano selecionado (barras)
    const mesesAnoBarras = Array.from({ length: 12 }, (_, i) => ({ mes: nomeMes(i), valor: 0 }));
    for (const l of list) {
      const t = new Date(l.criadoEm || l.dataHora);
      if (!Number.isFinite(t.getTime())) continue;
      if (t.getFullYear() !== anoBarras) continue;
      mesesAnoBarras[t.getMonth()].valor += (Number(l.valorTotal) || 0);
    }
    const dadosBarrasMensal = mesesAnoBarras;

    // Top 10 veículos com maior custo (todos os anos)
    const porPlaca = {};
    for (const l of list) {
      const p = (l.placa || "Sem placa").trim() || "Sem placa";
      porPlaca[p] = (porPlaca[p] || 0) + (Number(l.valorTotal) || 0);
    }
    const top10Veiculos = Object.entries(porPlaca)
      .map(([placa, valor]) => ({ placa, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    // Status da frota — classificação por custo médio mensal por veículo
    // normal < 500, atenção 500-2000, crítico > 2000
    const mesesDecorridos = new Date().getMonth() + 1; // do ano corrente
    let sN = 0, sA = 0, sC = 0;
    for (const [, valor] of Object.entries(porPlaca)) {
      const medMes = valor / Math.max(1, mesesDecorridos);
      if (medMes >= 2000) sC++;
      else if (medMes >= 500) sA++;
      else sN++;
    }
    const dadosStatusFrota = [
      { name: "Normal", value: sN, cor: CORES_STATUS.normal },
      { name: "Atenção", value: sA, cor: CORES_STATUS.atencao },
      { name: "Crítico", value: sC, cor: CORES_STATUS.critico },
    ].filter(x => x.value > 0);

    // Custo anual acumulado (linhas) — soma cumulativa mês a mês
    let acc = 0;
    const dadosLinhaAcumulado = Array.from({ length: 12 }, (_, i) => {
      const valorMes = list.reduce((s, l) => {
        const t = new Date(l.criadoEm || l.dataHora);
        if (!Number.isFinite(t.getTime())) return s;
        if (t.getFullYear() !== anoLinhas || t.getMonth() !== i) return s;
        return s + (Number(l.valorTotal) || 0);
      }, 0);
      acc += valorMes;
      return { mes: nomeMes(i), valor: acc };
    });

    const totalVeiculos = Object.keys(porPlaca).length;
    const mediaVeiculo = totalVeiculos > 0 ? totalGeral / totalVeiculos : 0;
    const mesesTotais = Math.max(1, mesesDecorridos);
    const mediaMes = totalGeral / mesesTotais;

    return {
      totalGeral, totalVeiculos, mediaVeiculo, mediaMes,
      dadosPizzaCategoria, dadosBarrasMensal, top10Veiculos,
      dadosStatusFrota, dadosLinhaAcumulado,
    };
  }, [lancamentos, anoBarras, anoLinhas]);

  const fmt = fmtBRLfn || ((n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

  // ── Estilos base ──────────────────────────────────────────────
  const cardStyle = { background: "var(--card-bg)", borderRadius: 14, padding: "1rem 1.25rem", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(15,23,42,.05), 0 8px 24px -16px rgba(15,23,42,.10)" };
  const chartTitle = { margin: "0 0 12px", color: "var(--text)", fontSize: "0.95rem", fontWeight: 700 };
  const kpiValor = { fontSize: "1.35rem", fontWeight: 800, lineHeight: 1.1 };
  const kpiLabel = { fontSize: ".72rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, opacity: 0.85, marginBottom: 6 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* TOOLBAR DE PERÍODO */}
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--text)", fontSize: "1rem", fontWeight: 700 }}>Dashboard analytics</h2>
          <p style={{ margin: "3px 0 0", fontSize: ".75rem", color: "var(--text-muted)" }}>
            {lancamentos.length} lançamento{lancamentos.length === 1 ? "" : "s"} no período selecionado
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 6, padding: 6, background: "var(--surface-2)", borderRadius: 10, flexWrap: "wrap" }}>
            {PERIODOS_LANC.map(p => (
              <button key={p.key} type="button" onClick={() => setPeriodo(p.key)}
                style={{ padding: "6px 14px", borderRadius: 7, border: "none", fontSize: ".8rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  background: periodo === p.key ? "var(--text)" : "transparent",
                  color: periodo === p.key ? "#fff" : "var(--text-muted)",
                }}>
                {p.label}
              </button>
            ))}
          </div>
          {periodo === "custom" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".72rem", fontWeight: 600, color: "var(--text-muted)" }}>
                De: <input type="date" value={customIni} onChange={e => setCustomIni(e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", fontSize: ".78rem", fontFamily: "inherit" }} />
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".72rem", fontWeight: 600, color: "var(--text-muted)" }}>
                Até: <input type="date" value={customFim} onChange={e => setCustomFim(e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", fontSize: ".78rem", fontFamily: "inherit" }} />
              </label>
              {(customIni || customFim) && (
                <button type="button" onClick={() => { setCustomIni(""); setCustomFim(""); }}
                  style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "transparent", fontSize: ".7rem", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}>
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div style={{ ...cardStyle, background: "linear-gradient(135deg, #1a3a5c, #234775)", color: "#fff", border: "none" }}>
          <div style={kpiLabel}>Total geral</div>
          <div style={kpiValor}>{fmt(totalGeral)}</div>
          <div style={{ fontSize: ".72rem", opacity: 0.8, marginTop: 4 }}>{lancamentos?.length || 0} lançamentos</div>
        </div>
        <div style={{ ...cardStyle, background: "#e0f2fe" }}>
          <div style={{ ...kpiLabel, color: "#0369a1" }}>Média / mês</div>
          <div style={{ ...kpiValor, color: "#0c4a6e" }}>{fmt(mediaMes)}</div>
          <div style={{ fontSize: ".72rem", color: "#0369a1", marginTop: 4 }}>{new Date().getMonth() + 1} meses no ano</div>
        </div>
        <div style={{ ...cardStyle, background: "var(--success-bg)" }}>
          <div style={{ ...kpiLabel, color: "#166534" }}>Veículos ativos</div>
          <div style={{ ...kpiValor, color: "#14532d" }}>{totalVeiculos}</div>
          <div style={{ fontSize: ".72rem", color: "#166534", marginTop: 4 }}>com lançamentos</div>
        </div>
        <div style={{ ...cardStyle, background: "var(--warning-bg)" }}>
          <div style={{ ...kpiLabel, color: "#92400e" }}>Custo médio / veículo</div>
          <div style={{ ...kpiValor, color: "#78350f" }}>{fmt(mediaVeiculo)}</div>
          <div style={{ fontSize: ".72rem", color: "#92400e", marginTop: 4 }}>acumulado</div>
        </div>
      </div>

      {/* Row: Pizza Categoria + Pizza Status */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 12 }}>
        <div style={cardStyle}>
          <h3 style={chartTitle}>Distribuição por categoria</h3>
          {dadosPizzaCategoria.length === 0 ? (
            <p style={{ color: "var(--text-subtle)", fontSize: ".85rem", margin: "20px 0" }}>Sem lançamentos ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={dadosPizzaCategoria} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} labelLine={false}
                  label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""}>
                  {dadosPizzaCategoria.map((_, i) => (
                    <Cell key={i} fill={PALETA_CAT[i % PALETA_CAT.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: ".78rem" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={chartTitle}>Status da frota <span style={{ fontSize: ".72rem", color: "var(--text-subtle)", fontWeight: 500 }}>· faixa de custo médio mensal</span></h3>
          {dadosStatusFrota.length === 0 ? (
            <p style={{ color: "var(--text-subtle)", fontSize: ".85rem", margin: "20px 0" }}>Sem lançamentos ainda.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={dadosStatusFrota} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} labelLine={false}
                    label={({ value }) => value}>
                    {dadosStatusFrota.map((d, i) => <Cell key={i} fill={d.cor} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} veículo${v === 1 ? "" : "s"}`, n]} />
                  <Legend verticalAlign="bottom" height={30} iconSize={10} wrapperStyle={{ fontSize: ".78rem" }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, fontSize: ".68rem", color: "var(--text-muted)", marginTop: 4 }}>
                <span>● Normal &lt; R$ 500/mês</span>
                <span>● Atenção R$ 500-2k</span>
                <span>● Crítico &gt; R$ 2k</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Barras: Evolução mensal com seletor de ano */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <h3 style={{ ...chartTitle, margin: 0 }}>Evolução de custos mensais</h3>
          <SeletorAno anos={anosDisponiveis} valor={anoBarras} onChange={setAnoBarras} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dadosBarrasMensal} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => fmtBRLcurto(v)} tick={{ fontSize: 12 }} width={80} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Bar dataKey="valor" fill="var(--text)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Linhas: Custo anual acumulado com seletor de ano */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <h3 style={{ ...chartTitle, margin: 0 }}>Custo anual acumulado</h3>
          <SeletorAno anos={anosDisponiveis} valor={anoLinhas} onChange={setAnoLinhas} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dadosLinhaAcumulado} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => fmtBRLcurto(v)} tick={{ fontSize: 12 }} width={80} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Line type="monotone" dataKey="valor" stroke="var(--success)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 veículos */}
      <div style={cardStyle}>
        <h3 style={chartTitle}>Top 10 veículos com maior custo</h3>
        {top10Veiculos.length === 0 ? (
          <p style={{ color: "var(--text-subtle)", fontSize: ".85rem", margin: "20px 0" }}>Sem lançamentos ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, top10Veiculos.length * 36)}>
            <BarChart data={top10Veiculos} layout="vertical" margin={{ top: 6, right: 30, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => fmtBRLcurto(v)} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="placa" tick={{ fontSize: 12, fontWeight: 600 }} width={100} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="valor" fill="var(--danger)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function NavTab({ icon: Icon, label, active, onClick, accent, badge }) {
  const style = {
    display: "flex", width: "100%", alignItems: "center", gap: 10,
    padding: "9px 12px", border: "none", background: "transparent",
    cursor: "pointer", fontSize: ".84rem", fontWeight: active ? 700 : 600,
    color: active ? "var(--accent)" : "var(--text-muted)",
    fontFamily: "inherit", textAlign: "left", whiteSpace: "nowrap",
    borderLeft: "3px solid " + (active ? "var(--accent)" : "transparent"),
    transition: "background .15s, color .15s",
  };
  const iconColor = active ? "var(--accent)" : (accent || "var(--text-muted)");
  return (
    <button type="button" className="manut-snav-item" style={style} onClick={onClick}>
      {Icon && <Icon size={17} strokeWidth={2.1} color={iconColor} style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {badge && (
        <span style={{ background: active ? "var(--accent)" : badge.color, color: "#fff",
          borderRadius: 20, fontSize: ".62rem", fontWeight: 800, padding: "1px 7px", minWidth: 18, textAlign: "center" }}>
          {badge.text}
        </span>
      )}
    </button>
  );
}

function SeletorAno({ anos, valor, onChange }) {
  return (
    <div style={{ display: "inline-flex", gap: 4, padding: 4, background: "var(--surface-2)", borderRadius: 10 }}>
      {anos.map(a => (
        <button key={a} type="button" onClick={() => onChange(a)}
          style={{
            padding: "6px 14px", borderRadius: 6, border: "none", fontSize: ".78rem", fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            background: valor === a ? "var(--accent)" : "transparent",
            color: valor === a ? "#fff" : "var(--text-muted)",
          }}>
          {a}
        </button>
      ))}
    </div>
  );
}

// ── Componente ─────────────────────────────────────────────────────────────
export default function Manutencao() {
  const { profile } = useAuth();
  const { temPermissao, isSuperAdmin } = useRBAC();
  const { odometroDe, dadosDe, loading: sascarLoading, ultima: sascarUltima, refetch: refetchSascar } = useOdometrosSascar();
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  const abaInicialUrl = searchParams.get("aba"); // ?aba=os vem do Dashboard "Ver todas"
  const canDelete   = ["master","admin"].includes(profile?.role);

  // Permissões granulares por aba (retrocompat: quem NÃO tem nenhuma sub-perm vê tudo)
  const SUB_ABAS = ["dashboard","por_veiculo","por_tipo","alertas","os_abertura","os_lancamento","nf","cadastros"];
  const usaSubPerms = SUB_ABAS.some(k => temPermissao(`manutencao.${k}`));
  const podeVerAba = (sub) => !usaSubPerms || temPermissao(`manutencao.${sub}`);

  const [registros,      setRegistros]      = useState({});
  const [todosRegistros, setTodosRegistros] = useState([]);
  const [legacy,         setLegacy]         = useState([]);
  const [veiculos,       setVeiculos]       = useState([]);
  // Doc selecionado no split view da aba "Por Veículo" — chave: `${placa}__${tipoId}`
  const [docSelKey, setDocSelKey]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  // Default de aba: URL (?aba=X) tem prioridade se for válida + tiver permissão
  const ABAS_VALIDAS = ["dashboard","veiculo","tipo","alertas","conjunto","lavagem","lubrificacao","calibragem","estoque","requisicoes","fornecedores","cpk","preditiva","indicadores","os","os_lanc","lancamento","cadastros"];
  const SUB_PORARBA = { dashboard:"dashboard", veiculo:"por_veiculo", tipo:"por_tipo", alertas:"alertas", conjunto:"conjunto", lavagem:"lavagem", lubrificacao:"lubrificacao", calibragem:"calibragem", estoque:"estoque", os:"os_abertura", os_lanc:"os_lancamento", lancamento:"nf", cadastros:"cadastros" };
  const primeiraAba = (
    (abaInicialUrl && ABAS_VALIDAS.includes(abaInicialUrl) && podeVerAba(SUB_PORARBA[abaInicialUrl])) ? abaInicialUrl :
    podeVerAba("por_veiculo")    ? "veiculo" :
    podeVerAba("dashboard")      ? "dashboard" :
    podeVerAba("por_tipo")       ? "tipo" :
    podeVerAba("alertas")        ? "alertas" :
    podeVerAba("conjunto")       ? "conjunto" :
    podeVerAba("lavagem")        ? "lavagem" :
    podeVerAba("lubrificacao")   ? "lubrificacao" :
    podeVerAba("calibragem")     ? "calibragem" :
    podeVerAba("estoque")        ? "estoque" :
    podeVerAba("os_abertura")    ? "os" :
    podeVerAba("os_lancamento")  ? "os_lanc" :
    podeVerAba("nf")             ? "lancamento" :
    podeVerAba("cadastros")      ? "cadastros" : "veiculo"
  );
  const [aba,            setAba]            = useState(primeiraAba);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [placa,          setPlaca]          = useState("");  const [busca,          setBusca]          = useState("");
  const [filtroSt,       setFiltroSt]       = useState("todos");
  const [filtroTipo,     setFiltroTipo]     = useState("civ");
  const [filtroStTipo,   setFiltroStTipo]   = useState("todos");
  const [modal,          setModal]          = useState(null);
  const [modalDocs,      setModalDocs]      = useState(null); // { veiculo, selecionados:Set, sobrescrever:bool }
  const [salvandoDocs,   setSalvandoDocs]   = useState(false);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [anexos,         setAnexos]         = useState([]); // anexos do registro aberto no modal
  const [uploadando,     setUploadando]     = useState(false);
  const [erroAnexo,      setErroAnexo]      = useState("");
  const fileInputRef                          = useRef(null);
  const [salvando,       setSalvando]       = useState(false);
  const [erro,           setErro]           = useState("");
  // Ordens de Serviço
  const [motoristas,     setMotoristas]     = useState([]);
  const [ordensServico,  setOrdensServico]  = useState([]);
  const [formOS, setFormOS] = useState({ ...EMPTY_OS });
  const [salvandoOS,     setSalvandoOS]     = useState(false);
  const salvandoOSRef                       = useRef(false);
  const [erroOS,         setErroOS]         = useState("");
  // edição / finalização de OS
  const [editOS,         setEditOS]         = useState(null); // { os } sendo editada
  const [fotosOsModal,   setFotosOsModal]   = useState(null); // OS com galeria de fotos aberta
  const [fotosUploading, setFotosUploading] = useState(false);
  const [fotosErro,      setFotosErro]      = useState("");
  const [formEditOS,     setFormEditOS]     = useState({ ...EMPTY_OS });
  const [salvandoEdit,   setSalvandoEdit]   = useState(false);
  const salvandoEditRef                     = useRef(false);
  const [erroEdit,       setErroEdit]       = useState("");
  // eslint-disable-next-line no-unused-vars -- WIP: usado pelo fluxo finalizar OS, em standby
  const [acaoOS,         setAcaoOS]         = useState(null); // id da OS em ação (finalizar)
  // Conclusão de OS (Lançamento de OS — registra KM saída, mecânico, oficina, serviço executado)
  const [concluindoOS,    setConcluindoOS]    = useState(null);
  const [formConclusao,   setFormConclusao]   = useState({ ...EMPTY_CONCLUSAO });
  const [erroConclusao,   setErroConclusao]   = useState("");
  const [salvandoConclusao, setSalvandoConclusao] = useState(false);
  const salvandoConclusaoRef                = useRef(false);
  const [conclusaoItens,  setConclusaoItens]  = useState([]);                    // itens (servico/peca) do serviço executado
  const [itemDraftConcl,  setItemDraftConcl]  = useState({ ...EMPTY_ITEM });     // item sendo digitado
  // Lançamento de NF (registro de nota fiscal/custo — NÃO bloqueia veículo)
  const [lancamentos,     setLancamentos]     = useState([]);
  const [formLanc,        setFormLanc]        = useState({ ...EMPTY_LANC });
  const [abastecimentos,  setAbastecimentos]  = useState([]); // pra CPK sub-aba Combustível
  const [subCpk,          setSubCpk]          = useState("total"); // total | pneu | manutencao | combustivel

  // Resolve o odômetro SASCAR de uma placa.
  // Se placa é carreta (sem rastreador), acha o cavalo que tem ela atrelada
  // (procura em QUALQUER campo do cavalo — c1/c2/c3 mais comum, mas também
  // carreta1/carreta2/carreta3, cavalo, atrelado_a, etc). Normaliza tudo
  // (remove hífen/espaços/pontuação) pra bater com o formato salvo.
  const CAMPOS_CARRETA = ["c1", "c2", "c3", "carreta1", "carreta2", "carreta3", "carreta"];
  // Remove sufixo "-N" que a SASCAR anexa (ex: "BBE9593-3" -> "BBE9593")
  // e depois qualquer não-alfanumérico. Precisa bater com o hook useOdometrosSascar.
  const normPlaca = (p) => String(p || "")
    .trim()
    .toUpperCase()
    .replace(/[-\s]\d+$/, "")
    .replace(/[^A-Z0-9]/g, "");

  const resolverKmSascar = useCallback((placa) => {
    if (!placa) return null;
    const alvoN = normPlaca(placa);
    if (!alvoN) return null;
    // 1) Tenta direto (a placa em si tem rastreador?)
    let km = odometroDe(alvoN);
    if (km != null && km > 0) return { km, fonte: alvoN, dados: dadosDe(alvoN) };

    // 2) A placa é uma carreta: acha qual cavalo (veiculos.tipo !== 'carreta')
    // tem essa placa como carreta atrelada
    const cavalo = veiculos.find(v => {
      if (v.tipo === "carreta") return false;
      return CAMPOS_CARRETA.some(k => normPlaca(v[k]) === alvoN);
    });
    if (cavalo) {
      km = odometroDe(cavalo.placa);
      if (km != null && km > 0) return { km, fonte: `via cavalo ${cavalo.placa}`, dados: dadosDe(cavalo.placa) };
      // Cavalo encontrado mas sem posição SASCAR — mesmo assim informa a fonte
      return { km: null, fonte: `cavalo ${cavalo.placa} sem posição SASCAR`, dados: null };
    }

    // 3) Debug: log detalhado no console pra diagnosticar
    console.warn("[SASCAR] Placa sem match:", {
      alvo: alvoN,
      placaOriginal: placa,
      totalVeiculos: veiculos.length,
      cavalosComCarretas: veiculos
        .filter(v => v.tipo !== "carreta" && CAMPOS_CARRETA.some(k => v[k]))
        .map(v => ({ placa: v.placa, ...Object.fromEntries(CAMPOS_CARRETA.filter(k => v[k]).map(k => [k, v[k]])) }))
        .slice(0, 5),
    });
    return null;
  }, [odometroDe, dadosDe, veiculos]);

  // Ao trocar a placa: refetch da SASCAR (backend tem cache 30s, seguro).
  // O effect abaixo (que reage a resolverKmSascar) vai preencher assim que
  // o hook atualizar o state.
  useEffect(() => {
    if (!formOS.placa) return;
    refetchSascar();
  }, [formOS.placa]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fecha a sidebar (mobile) ao trocar de aba
  useEffect(() => { setSidebarOpen(false); }, [aba]);

  // Ao abrir modal Concluir OS, força refetch SASCAR pra ter KM mais fresco possível
  useEffect(() => {
    if (concluindoOS?.placa) refetchSascar();
  }, [concluindoOS?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-preenche kmSaida com odômetro atual SASCAR sempre que resolver
  // retornar novo valor (mudança de placa ou refetch completar)
  useEffect(() => {
    if (!concluindoOS?.placa) return;
    const r = resolverKmSascar(concluindoOS.placa);
    if (r?.km) setFormConclusao(f => ({ ...f, kmSaida: String(r.km) }));
  }, [concluindoOS?.id, resolverKmSascar]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!formLanc.placa) return;
    refetchSascar();
  }, [formLanc.placa]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preenche/atualiza hodômetro sempre que resolver retornar novo km
  // (dispara na mudança de placa E quando o refetch da SASCAR completar).
  useEffect(() => {
    if (!formOS.placa) return;
    const r = resolverKmSascar(formOS.placa);
    if (r?.km) setFormOS(f => ({ ...f, hodometro: String(r.km) }));
  }, [formOS.placa, resolverKmSascar]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!formLanc.placa) return;
    const r = resolverKmSascar(formLanc.placa);
    if (r?.km) setFormLanc(f => ({ ...f, hodometro: String(r.km) }));
  }, [formLanc.placa, resolverKmSascar]); // eslint-disable-line react-hooks/exhaustive-deps

  async function puxarOdometroSascar(campo) {
    await refetchSascar();
    const placa = campo === "os" ? formOS.placa : formLanc.placa;
    const r = resolverKmSascar(placa);
    if (!r) {
      alert(`Placa ${placa} não tem posição SASCAR e não achei cavalo atrelado a ela. Confere no cadastro da Frota se a carreta está preenchida em algum cavalo (campos c1/c2/c3).`);
      return;
    }
    if (r.km == null) {
      alert(`Achei o ${r.fonte}, mas ele também está sem posição SASCAR no momento.`);
      return;
    }
    if (campo === "os")   setFormOS(f => ({ ...f, hodometro: String(r.km) }));
    if (campo === "lanc") setFormLanc(f => ({ ...f, hodometro: String(r.km) }));
  }

  const [lancItens,       setLancItens]       = useState([]);                 // itens do lançamento sendo criado
  const [itemDraft,       setItemDraft]       = useState({ ...EMPTY_ITEM });  // item em digitação
  const [salvandoLanc,    setSalvandoLanc]    = useState(false);
  const salvandoLancRef                       = useRef(false);
  const [erroLanc,        setErroLanc]        = useState("");
  const [editLanc,        setEditLanc]        = useState(null);
  const [formEditLanc,    setFormEditLanc]    = useState({ ...EMPTY_LANC });
  const [lancItensEdit,   setLancItensEdit]   = useState([]);
  const [itemDraftEdit,   setItemDraftEdit]   = useState({ ...EMPTY_ITEM });
  const [salvandoEditLanc, setSalvandoEditLanc] = useState(false);
  const salvandoEditLancRef                     = useRef(false);
  const [erroEditLanc,    setErroEditLanc]    = useState("");
  const [anexosLanc,      setAnexosLanc]      = useState([]);
  const [uploadandoLanc,  setUploadandoLanc]  = useState(false);
  const [erroAnexoLanc,   setErroAnexoLanc]   = useState("");
  const fileInputLancRef                       = useRef(null);
  // catálogo de serviços e peças (cadastro inline)
  const [itensCatalogo,   setItensCatalogo]   = useState([]);
  // tela de Cadastros (gerenciar catálogo)
  const [novoCat,         setNovoCat]         = useState({ tipo_lancamento: "", servico: "", peca: "", fornecedor: "" });
  const [novoCatCnpj,     setNovoCatCnpj]     = useState(""); // CNPJ do novo fornecedor (só a seção fornecedor usa)
  const [editItemCat,     setEditItemCat]     = useState(null); // { id, nome, cnpj }
  // tipos de manutenção personalizados (criados pelo usuário, gravados no Firestore)
  const [tiposCustom,     setTiposCustom]     = useState([]);
  const [novoTipo,        setNovoTipo]        = useState({ label: "", grupo: "Mecânica", desc: "", campos: ["data_realiz","venc","local","resp","obs"] });
  const [editTipo,        setEditTipo]        = useState(null); // { id, label, grupo, desc, campos }
  const [salvandoTipo,    setSalvandoTipo]    = useState(false);
  const [erroTipo,        setErroTipo]        = useState("");

  async function carregarTudo() {
    setLoading(true);
    try {
      // queries em paralelo, cada uma com try local pra não derrubar as outras
      // Coleções migradas pra VPS usam dsListAll (retorna array já formatado)
      // Coleções ainda no Firestore usam getDocs
      const [listaM, listaV, listaMot, listaOS, listaLanc, listaCat, listaTC] = await Promise.all([
        dsListAll("manutencoes").catch(e => { console.warn("manutencoes:", e); return null; }),
        listVeiculos().catch(e => { console.warn("veiculos:", e); return null; }),
        gdsList("motoristas").catch(e => { console.warn("motoristas:", e); return null; }),
        dsListAll("ordens_servico").catch(e => { console.warn("ordens_servico:", e); return null; }),
        dsListAll("lancamentos_os").catch(e => { console.warn("lancamentos_os:", e); return null; }),
        gdsList("itens_manutencao").catch(e => { console.warn("itens_manutencao:", e); return null; }),
        dsListAll("tipos_manutencao_custom").catch(e => { console.warn("tipos_manutencao_custom:", e); return null; }),
      ]);

      // tipos personalizados — schema: { label, grupo, desc, campos[], criadoEm, criadoPor }
      const tcs = listaTC || [];
      tcs.sort((a, b) => (a.label || "").localeCompare(b.label || ""));
      setTiposCustom(tcs);

      // motoristas: filtra ativos e ordena por nome localmente
      const mots = listaMot || [];
      const motsAtivos = mots
        .filter(m => {
          const st = (m.status || "").toString().toLowerCase().trim();
          return st === "ativo" || st === "" || st === "ativa"; // tolerante
        })
        .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setMotoristas(motsAtivos);

      // ordens de serviço: ordena por criadoEm desc localmente
      const oss = listaOS || [];
      oss.sort((a, b) => (b.criadoEm || b.created_at || "").localeCompare(a.criadoEm || a.created_at || ""));
      setOrdensServico(oss);

      // lançamentos de OS (registro de serviço/custo): ordena por criadoEm desc
      const lancs = listaLanc || [];
      lancs.sort((a, b) => (b.criadoEm || b.created_at || "").localeCompare(a.criadoEm || a.created_at || ""));
      setLancamentos(lancs);

      // catálogo de serviços/peças: ordena por nome
      const cat = listaCat || [];
      cat.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setItensCatalogo(cat);

      if (!listaM || !listaV) return;
      const normP = (p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const map = {};
      const leg = [];
      const todos = [];
      listaM.forEach(data => {
        if (data.tipo) {
          map[`${normP(data.placa)}__${data.tipo}`] = data;
          todos.push(data);
        } else {
          leg.push(data);
        }
      });
      setRegistros(map);
      setTodosRegistros(todos);
      setLegacy(leg);
      const vs = (listaV || [])
        .filter(v => v.status !== "inativo")
        .sort((a,b) => (a.placa||"").localeCompare(b.placa||""));
      setVeiculos(vs);
      if (vs.length > 0 && (!placa || !vs.find(v => v.placa === placa))) setPlaca(vs[0].placa);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Carga em tempo real (onSnapshot) — qualquer alteração em outra tela ou máquina
  // aparece aqui automaticamente. Cleanup no unmount desconecta todos os listeners.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setLoading(true);
    const normPloc = (p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const carregados = { m: false, v: false, mot: false, os: false, lanc: false, cat: false, tc: false };
    const marcaCarregado = (k) => {
      carregados[k] = true;
      if (Object.values(carregados).every(Boolean)) setLoading(false);
    };

    const unsubs = [
      // manutencoes → registros + legacy + todosRegistros
      dsWatch("manutencoes", snap => {
        const map = {}, leg = [], todos = [];
        snap.docs.forEach(d => {
          const data = { id: d.id, ...d.data() };
          if (data.tipo) {
            map[`${normPloc(data.placa)}__${data.tipo}`] = data;
            todos.push(data);
          } else {
            leg.push(data);
          }
        });
        setRegistros(map);
        setTodosRegistros(todos);
        setLegacy(leg);
        marcaCarregado("m");
      }),

      // veículos → veiculos (só ativos, ordenado por placa)
      watchVeiculos(snap => {
        const vs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(v => v.status !== "inativo")
          .sort((a, b) => (a.placa || "").localeCompare(b.placa || ""));
        setVeiculos(vs);
        // fixa primeira placa se ainda não estava selecionada
        setPlaca(prev => (vs.length > 0 && (!prev || !vs.find(v => v.placa === prev))) ? vs[0].placa : prev);
        marcaCarregado("v");
      }),

      // motoristas → só ativos
      gdsWatch("motoristas", snap => {
        const mots = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const motsAtivos = mots
          .filter(m => {
            const st = (m.status || "").toString().toLowerCase().trim();
            return st === "ativo" || st === "" || st === "ativa";
          })
          .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        setMotoristas(motsAtivos);
        marcaCarregado("mot");
      }),

      // ordens_servico
      dsWatch("ordens_servico", snap => {
        const oss = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        oss.sort((a, b) => (b.criadoEm || b.created_at || "").localeCompare(a.criadoEm || a.created_at || ""));
        setOrdensServico(oss);
        marcaCarregado("os");
      }),

      // lancamentos_os
      dsWatch("lancamentos_os", snap => {
        const lancs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        lancs.sort((a, b) => (b.criadoEm || b.created_at || "").localeCompare(a.criadoEm || a.created_at || ""));
        setLancamentos(lancs);
        marcaCarregado("lanc");
      }),

      // abastecimentos_cta — usado no CPK Combustível
      gdsWatch("abastecimentos_cta", snap => {
        setAbastecimentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),

      // itens_manutencao (catálogo)
      gdsWatch("itens_manutencao", snap => {
        const cat = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        cat.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        setItensCatalogo(cat);
        marcaCarregado("cat");
      }),

      // tipos_manutencao_custom
      dsWatch("tipos_manutencao_custom", snap => {
        const tcs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        tcs.sort((a, b) => (a.label || "").localeCompare(b.label || ""));
        setTiposCustom(tcs);
        marcaCarregado("tc");
      }),
    ];
    return () => unsubs.forEach(u => { try { u(); } catch {} });
  }, []);

  const normP = (p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const alertaCount = useMemo(() => {
    const ctxFor = (r) => ({ odometroAtual: Number(odometroDe?.(normP(r.placa))?.km) || null });
    const novosPend  = Object.values(registros).filter(r => ["vencido","alerta"].includes(calcStatus(r, ctxFor(r)))).length;
    const legadoPend = legacy.filter(r => ["vencido","alerta"].includes(calcStatus(r, ctxFor(r)))).length;
    return novosPend + legadoPend;
  }, [registros, legacy, odometroDe]);

  // Catálogo final = built-in + personalizados (Firestore). Custom já vem com id próprio.
  const TIPOS_TODOS = useMemo(() => {
    const customMapped = tiposCustom.map(c => ({
      id: c.id,
      label: c.label || "(sem nome)",
      grupo: c.grupo || "Mecânica",
      desc: c.desc || "",
      campos: Array.isArray(c.campos) && c.campos.length ? c.campos : ["data_realiz","venc","local","resp","obs"],
      _custom: true,
    }));
    return [...TIPOS, ...customMapped];
  }, [tiposCustom]);

  // ── Aba Por Veículo ───────────────────────────────────────────────────
  const veiculoSelecionado = useMemo(() =>
    veiculos.find(v => v.placa === placa) || null,
  [veiculos, placa]);

  const conjuntoComStatus = useMemo(() => {
    if (!veiculoSelecionado) return [];
    const isCarreta = veiculoSelecionado.tipo === "carreta";
    const is9eixos  = String(veiculoSelecionado.total_eixos) === "9";

    // Lista customizada por placa: se presente, filtra só os escolhidos. Senão, cai no padrão da frota.
    const aplicaveis = Array.isArray(veiculoSelecionado.documentosAplicaveis)
      ? new Set(veiculoSelecionado.documentosAplicaveis)
      : null;

    const tiposVeiculo = TIPOS_TODOS.filter(t => {
      // Tipos personalizados ignoram as regras de "tipo de veículo" — entram só se a placa marcou
      if (t._custom) {
        return aplicaveis ? aplicaveis.has(t.id) : false;
      }
      // Padrão por tipo de veículo (mantém regra is9eixos como hard rule)
      let padrao;
      if (isCarreta) {
        if (t.grupo !== "Documentação") padrao = false;
        else if (["calibragem","tacografo","rntrc"].includes(t.id)) padrao = false;
        else if (t.id === "licenca_parana" || t.id === "licenca_federal") padrao = is9eixos;
        else padrao = true;
      } else {
        if (t.grupo === "Motorista") padrao = false;
        else if (t.id === "licenca_parana" || t.id === "licenca_federal") padrao = is9eixos;
        else padrao = true;
      }
      // Se há lista custom, intersecciona com o padrão (não pode exibir o que o tipo de veículo não permite)
      if (aplicaveis) return padrao && aplicaveis.has(t.id);
      return padrao;
    });

    const p = normP(placa);
    const odometroDaPlaca = Number(odometroDe?.(p)?.km) || null;
    const tiposStatus = tiposVeiculo.map(t => {
      const rec = registros[`${p}__${t.id}`] || null;
      return { ...t, record: rec, status: calcStatus(rec, { odometroAtual: odometroDaPlaca }) };
    });
    const grps = {};
    tiposStatus.forEach(t => {
      if (!grps[t.grupo]) grps[t.grupo] = [];
      grps[t.grupo].push(t);
    });
    const tipoLabel = isCarreta ? "Carreta" : "Cavalo";
    return [{ placa: p, label: `${tipoLabel} — ${p}`, tiposStatus, grupos: grps }];
  }, [veiculoSelecionado, placa, registros, TIPOS_TODOS]);

  const summaryStatus = useMemo(() => {
    const all = conjuntoComStatus.flatMap(s => s.tiposStatus);
    return {
      ok:     all.filter(t => t.status === "ok").length,
      vencido:all.filter(t => t.status === "vencido").length,
      alerta: all.filter(t => t.status === "alerta").length,
      semReg: all.filter(t => t.status === "sem_data").length,
    };
  }, [conjuntoComStatus]);

  // ── Aba Por Tipo ──────────────────────────────────────────────────────
  const listaPorTipo = useMemo(() => {
    return todosRegistros
      .filter(r => r.tipo === filtroTipo)
      .map(r => ({ ...r, _status: calcStatus(r, { odometroAtual: Number(odometroDe?.(normP(r.placa))?.km) || null }) }))
      .filter(r => filtroStTipo === "todos" || r._status === filtroStTipo)
      .sort((a,b) => (STATUS_ORDER[a._status]||3) - (STATUS_ORDER[b._status]||3) || (a.venc||"").localeCompare(b.venc||""));
  }, [todosRegistros, filtroTipo, filtroStTipo, odometroDe]);

  // ── Aba Alertas ───────────────────────────────────────────────────────
  // Mapa placa-normalizada → Set de tipos aplicáveis (só pra placas que customizaram a lista)
  const aplicaveisPorPlaca = useMemo(() => {
    const m = new Map();
    veiculos.forEach(v => {
      if (Array.isArray(v.documentosAplicaveis)) {
        m.set(normP(v.placa), new Set(v.documentosAplicaveis));
      }
    });
    return m;
  }, [veiculos]);

  const listaAlertas = useMemo(() => {
    const tudo = [
      ...Object.values(registros).map(r => ({ ...r, _label: r.label || r.tipo })),
      ...legacy.map(r => ({ ...r, _label: r.item || "—" })),
    ];
    return tudo
      .map(r => ({ ...r, _status: calcStatus(r, { odometroAtual: Number(odometroDe?.(normP(r.placa))?.km) || null }) }))
      .filter(r => {
        // Oculta alerta de tipo que a placa removeu da lista aplicável
        if (r.tipo) {
          const set = aplicaveisPorPlaca.get(normP(r.placa));
          if (set && !set.has(r.tipo)) return false;
        }
        const q = busca.toLowerCase();
        const matchB = (r.placa||"").toLowerCase().includes(q) || (r._label||"").toLowerCase().includes(q);
        const matchS = filtroSt === "todos" || r._status === filtroSt;
        return matchB && matchS;
      })
      .sort((a,b) => (STATUS_ORDER[a._status]||3) - (STATUS_ORDER[b._status]||3) || (a.venc||"").localeCompare(b.venc||""));
  }, [registros, legacy, busca, filtroSt, aplicaveisPorPlaca]);

  // ── Modal ─────────────────────────────────────────────────────────────
  function abrirModal(veiculoPlaca, tipo) {
    const pNorm = normP(veiculoPlaca);
    const rec = registros[`${pNorm}__${tipo.id}`];
    setModal({ placa: pNorm, tipo, record: rec || null });
    setForm(rec ? {
      data_realiz: rec.data_realiz || "",
      venc:        rec.venc        || "",
      agendamento: rec.agendamento || "",
      local:       rec.local       || "",
      numero_doc:  rec.numero_doc  || "",
      km_atual:    rec.km_atual    || "",
      km_prox:     rec.km_prox     || "",
      resp:        rec.resp        || "",
      obs:         rec.obs         || "",
    } : { ...EMPTY_FORM });
    setAnexos(Array.isArray(rec?.anexos) ? rec.anexos : []);
    setErroAnexo("");
    setErro("");
  }

  function fecharModal() { setModal(null); setErro(""); setAnexos([]); setErroAnexo(""); }

  // ── Modal: documentos aplicáveis por placa ───────────────────────────
  function abrirModalDocs() {
    if (!veiculoSelecionado) return;
    const atuais = Array.isArray(veiculoSelecionado.documentosAplicaveis)
      ? veiculoSelecionado.documentosAplicaveis
      : null;
    // Se ainda não customizou, pré-selecciona o padrão atual (o que já aparece pra esse veículo)
    const padraoIds = conjuntoComStatus[0]?.tiposStatus.map(t => t.id) || [];
    const iniciais = atuais ? atuais : padraoIds;
    setModalDocs({
      veiculo: veiculoSelecionado,
      selecionados: new Set(iniciais),
      sobrescrever: !!atuais, // true se já tinha custom; false se vai criar a 1ª vez
    });
  }
  function fecharModalDocs() { setModalDocs(null); }

  function toggleDocAplicavel(id) {
    setModalDocs(m => {
      if (!m) return m;
      const ns = new Set(m.selecionados);
      if (ns.has(id)) ns.delete(id); else ns.add(id);
      return { ...m, selecionados: ns };
    });
  }
  function marcarTodosDocs() {
    // Só Documentação e Mecânica — Motorista é por pessoa, não por placa
    setModalDocs(m => m ? { ...m, selecionados: new Set(TIPOS_TODOS.filter(t => t.grupo !== "Motorista").map(t => t.id)) } : m);
  }
  function restaurarPadraoDocs() {
    // Volta para o padrão da frota (remove a customização salva)
    setModalDocs(m => m ? { ...m, selecionados: new Set(), sobrescrever: false, restaurar: true } : m);
  }
  // ── CRUD: tipos de manutenção personalizados ──────────────────────────
  function toggleCampoEm(form, setForm, campo) {
    const atuais = Array.isArray(form.campos) ? form.campos : [];
    const ns = atuais.includes(campo) ? atuais.filter(c => c !== campo) : [...atuais, campo];
    setForm({ ...form, campos: ns });
  }

  async function salvarNovoTipo() {
    const label = (novoTipo.label || "").trim();
    if (!label) { setErroTipo("Informe o nome do tipo."); return; }
    if (!novoTipo.grupo || !["Documentação","Mecânica"].includes(novoTipo.grupo)) {
      setErroTipo("Selecione um grupo válido."); return;
    }
    if (!Array.isArray(novoTipo.campos) || novoTipo.campos.length === 0) {
      setErroTipo("Marque pelo menos um campo."); return;
    }
    setSalvandoTipo(true); setErroTipo("");
    try {
      await dsInsert("tipos_manutencao_custom", {
        slug: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40),
        label,
        grupo: novoTipo.grupo,
        desc: (novoTipo.desc || "").trim(),
        campos: novoTipo.campos,
        criadoEm: new Date().toISOString(),
        criadoPor: quemSou(),
      });
      setNovoTipo({ label:"", grupo:"Mecânica", desc:"", campos:["data_realiz","venc","local","resp","obs"] });
      await carregarTudo();
    } catch (e) {
      console.error("salvarNovoTipo:", e);
      setErroTipo("Erro ao salvar: " + (e?.message || e));
    } finally {
      setSalvandoTipo(false);
    }
  }

  async function salvarEditTipo() {
    if (!editTipo?.id) return;
    const label = (editTipo.label || "").trim();
    if (!label) { setErroTipo("Informe o nome do tipo."); return; }
    setSalvandoTipo(true); setErroTipo("");
    try {
      await dsPatch("tipos_manutencao_custom", editTipo.id, {
        label,
        grupo: editTipo.grupo,
        desc: (editTipo.desc || "").trim(),
        campos: Array.isArray(editTipo.campos) && editTipo.campos.length
          ? editTipo.campos
          : ["data_realiz","venc","local","resp","obs"],
      });
      setEditTipo(null);
      await carregarTudo();
    } catch (e) {
      console.error("salvarEditTipo:", e);
      setErroTipo("Erro ao salvar: " + (e?.message || e));
    } finally {
      setSalvandoTipo(false);
    }
  }

  async function excluirTipoCustom(t) {
    if (!confirm(`Excluir tipo "${t.label}"?\n\nRegistros já lançados com esse tipo permanecem no histórico, mas o tipo some das opções novas.`)) return;
    try {
      await dsRemove("tipos_manutencao_custom", t.id);
      await carregarTudo();
    } catch (e) {
      console.error("excluirTipoCustom:", e);
      alert("Erro ao excluir: " + (e?.message || e));
    }
  }

  async function salvarDocsAplicaveis() {
    if (!modalDocs?.veiculo?.id) return;
    setSalvandoDocs(true);
    try {
      if (modalDocs.restaurar) {
        await patchVeiculo(modalDocs.veiculo.id, { documentosAplicaveis: null });
      } else {
        await patchVeiculo(modalDocs.veiculo.id, { documentosAplicaveis: Array.from(modalDocs.selecionados) });
      }
      await carregarTudo();
      setModalDocs(null);
    } catch (e) {
      console.error("salvarDocsAplicaveis:", e);
      alert("Erro ao salvar configuração: " + (e?.message || e));
    } finally {
      setSalvandoDocs(false);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.venc) { setErro("Informe a data de validade/vencimento."); return; }
    setSalvando(true); setErro("");
    try {
      // usa o ID original do registro se existir (evita duplicar doc no Firestore)
      const docId = modal.record?.id || `${modal.placa}__${modal.tipo.id}`;
      const payload = {
        placa:       modal.placa,
        tipo:        modal.tipo.id,
        label:       modal.tipo.label,
        grupo:       modal.tipo.grupo,
        venc:        form.venc,
        data_realiz: form.data_realiz || null,
        agendamento: form.agendamento || null,
        local:       form.local.trim()       || null,
        numero_doc:  form.numero_doc.trim()  || null,
        km_atual:    form.km_atual.trim()    || null,
        km_prox:     form.km_prox.trim()     || null,
        resp:        form.resp.trim()        || null,
        obs:         form.obs.trim()         || null,
        anexos:      Array.isArray(anexos) ? anexos : [],
        updatedAt:   new Date().toISOString(),
      };
      if (!modal.record) payload.createdAt = new Date().toISOString();
      await dsSave("manutencoes", docId, payload);
      await carregarTudo();
      fecharModal();
    } catch(e) {
      console.error(e);
      setErro("Erro ao salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(docId, label) {
    if (!window.confirm(`Excluir registro de "${label}"?`)) return;
    try {
      // Anexos ficam órfãos no Cloudinary (sem API secret no browser não dá pra deletar)
      await dsRemove("manutencoes", docId);
      await carregarTudo();
    } catch {
      alert("Erro ao excluir.");
    }
  }

  // ── Anexos: upload e delete no Firebase Storage ──────────────────────
  const ANEXO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  const ANEXO_TIPOS_OK = ["application/pdf","image/jpeg","image/png","image/webp"];

  async function uploadAnexos(fileList) {
    if (!modal) return;
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setErroAnexo(""); setUploadando(true);
    const novos = [];
    try {
      for (const file of files) {
        if (!ANEXO_TIPOS_OK.includes(file.type)) {
          setErroAnexo(`Tipo não suportado (${file.name}). Use PDF, JPG, PNG ou WEBP.`);
          continue;
        }
        if (file.size > ANEXO_MAX_BYTES) {
          setErroAnexo(`${file.name}: arquivo maior que 10 MB.`);
          continue;
        }
        const meta = await uploadArquivo(file, { folder: `manutencoes/${modal.placa}/${modal.tipo.id}` });
        novos.push({
          nome: file.name,
          url: meta.url,
          path: meta.publicId,
          contentType: file.type,
          tamanho: file.size,
          criadoEm: new Date().toISOString(),
          criadoPor: quemSou(),
        });
      }
      if (novos.length > 0) {
        const atualizado = [...anexos, ...novos];
        setAnexos(atualizado);
        // Persiste imediato: se modal.record existe, atualiza Firestore agora; senão fica pendente até user clicar Salvar
        if (modal.record?.id) {
          await dsPatch("manutencoes", modal.record.id, { anexos: atualizado, updatedAt: new Date().toISOString() });
          // atualiza registros local sem refazer fetch completo
          setRegistros(prev => {
            const key = `${modal.placa}__${modal.tipo.id}`;
            return prev[key] ? { ...prev, [key]: { ...prev[key], anexos: atualizado } } : prev;
          });
        }
      }
    } catch (e) {
      console.error("uploadAnexos:", e);
      setErroAnexo("Erro no upload: " + (e?.message || e));
    } finally {
      setUploadando(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Imprimir anexo direto — abre em janela nova + dispara print. Funciona
  // pra PDF (visor nativo do browser) e imagens (envolve em <img>).
  function imprimirAnexo(a) {
    if (!a?.url) return;
    const isImg = (a.contentType || "").startsWith("image/");
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      alert("Popup bloqueado. Libere popups pra este site OU use Abrir + Ctrl+P.");
      return;
    }
    if (isImg) {
      w.document.write(`
        <!doctype html><html><head><title>${a.nome}</title>
        <style>body{margin:0;padding:20px;background:#fff;text-align:center;font-family:sans-serif}img{max-width:100%;height:auto}@media print{body{padding:0}}</style>
        </head><body onload="setTimeout(()=>window.print(),400)">
        <img src="${a.url}" alt="${a.nome}" />
        </body></html>
      `);
      w.document.close();
    } else {
      // PDF ou outro tipo — abre direto e chama print. Alguns browsers exigem
      // que o PDF renderize primeiro; delay de 800ms é o pratico.
      w.location.href = a.url;
      setTimeout(() => { try { w.print(); } catch {} }, 1200);
    }
  }

  async function removerAnexo(idx) {
    const a = anexos[idx];
    if (!a) return;
    if (!window.confirm(`Excluir anexo "${a.nome}"?`)) return;
    setErroAnexo("");
    try {
      const atualizado = anexos.filter((_, i) => i !== idx);
      setAnexos(atualizado);
      if (modal?.record?.id) {
        await dsPatch("manutencoes", modal.record.id, { anexos: atualizado, updatedAt: new Date().toISOString() });
        setRegistros(prev => {
          const key = `${modal.placa}__${modal.tipo.id}`;
          return prev[key] ? { ...prev, [key]: { ...prev[key], anexos: atualizado } } : prev;
        });
      }
    } catch (e) {
      console.error("removerAnexo:", e);
      setErroAnexo("Erro ao excluir anexo: " + (e?.message || e));
    }
  }

  function fmtTamanho(b) {
    const n = Number(b) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Anexos do Lançamento de NF ─────────────────────────────────────
  async function uploadAnexosLanc(fileList) {
    if (!editLanc) return;
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setErroAnexoLanc(""); setUploadandoLanc(true);
    const novos = [];
    try {
      for (const file of files) {
        if (!ANEXO_TIPOS_OK.includes(file.type)) {
          setErroAnexoLanc(`Tipo não suportado (${file.name}). Use PDF, JPG, PNG ou WEBP.`);
          continue;
        }
        if (file.size > ANEXO_MAX_BYTES) {
          setErroAnexoLanc(`${file.name}: arquivo maior que 10 MB.`);
          continue;
        }
        const meta = await uploadArquivo(file, { folder: `lancamentos_os/${editLanc.id}` });
        novos.push({
          nome: file.name, url: meta.url, path: meta.publicId,
          contentType: file.type, tamanho: file.size,
          criadoEm: new Date().toISOString(), criadoPor: quemSou(),
        });
      }
      if (novos.length > 0) {
        const atualizado = [...anexosLanc, ...novos];
        setAnexosLanc(atualizado);
        // Persiste imediato — Firestore + lista local
        await dsPatch("lancamentos_os", editLanc.id, { anexos: atualizado, editadoEm: new Date().toISOString() });
        setLancamentos(prev => prev.map(x => x.id === editLanc.id ? { ...x, anexos: atualizado } : x));
      }
    } catch (e) {
      console.error("uploadAnexosLanc:", e);
      setErroAnexoLanc("Erro no upload: " + (e?.message || e));
    } finally {
      setUploadandoLanc(false);
      if (fileInputLancRef.current) fileInputLancRef.current.value = "";
    }
  }

  async function removerAnexoLanc(idx) {
    const a = anexosLanc[idx];
    if (!a) return;
    if (!window.confirm(`Excluir anexo "${a.nome}"?`)) return;
    setErroAnexoLanc("");
    try {
      const atualizado = anexosLanc.filter((_, i) => i !== idx);
      setAnexosLanc(atualizado);
      if (editLanc?.id) {
        await dsPatch("lancamentos_os", editLanc.id, { anexos: atualizado, editadoEm: new Date().toISOString() });
        setLancamentos(prev => prev.map(x => x.id === editLanc.id ? { ...x, anexos: atualizado } : x));
      }
    } catch (e) {
      console.error("removerAnexoLanc:", e);
      setErroAnexoLanc("Erro ao excluir anexo: " + (e?.message || e));
    }
  }

  // ── Ordens de Serviço ──────────────────────────────────────────────────
  function proximoNumeroOS() {
    let maior = 0;
    for (const os of ordensServico) {
      const n = parseInt(String(os.numero || "").replace(/\D/g, ""), 10);
      if (Number.isFinite(n) && n > maior) maior = n;
    }
    return `OS-${String(maior + 1).padStart(5, "0")}`;
  }

  const quemSou = () => usuarioPontual(profile);

  // atualiza o bloqueio de um veículo no estado local (sem refazer fetch)
  function patchVeiculoLocal(veiculoId, bloqueio) {
    setVeiculos(prev => prev.map(v => (v.id === veiculoId ? { ...v, bloqueio } : v)));
  }

  // localiza o veículo de uma OS (por veiculoId salvo ou pela placa normalizada)
  function veiculoDaOS(os) {
    return veiculos.find(v => v.id === os.veiculoId)
      || veiculos.find(v => normP(v.placa) === normP(os.placa))
      || null;
  }

  // bloqueia o veículo por causa de uma OS aberta (não sobrescreve bloqueio manual prévio)
  async function bloquearVeiculoPorOS(veiculo, os) {
    if (!veiculo) return;
    if (veiculo.bloqueio?.ativo) return; // já bloqueado (manual ou outra OS) — mantém
    const bloqueio = {
      ativo: true,
      motivo: "Manutenção",
      descricao: `OS ${os.numero} — ${os.tipoServico}`,
      origem: "os",
      osId: os.id,
      osNumero: os.numero,
      bloqueadoPor: quemSou(),
      bloqueadoEm: new Date().toISOString(),
    };
    await patchVeiculo(veiculo.id, { bloqueio });
    patchVeiculoLocal(veiculo.id, bloqueio);
  }

  // libera o veículo se a OS que estava bloqueando foi finalizada e não há outra OS aberta nele
  async function liberarVeiculoSePossivel(veiculo, osFinalizadaId) {
    if (!veiculo) return;
    if (veiculo.bloqueio?.origem !== "os") return; // bloqueio manual/documento — não mexe
    const outraAberta = ordensServico.some(o =>
      o.id !== osFinalizadaId &&
      osStatus(o) === "aberta" &&
      (o.veiculoId === veiculo.id || normP(o.placa) === normP(veiculo.placa))
    );
    if (outraAberta) return;
    const bloqueio = {
      ativo: false,
      origem: "os",
      motivoAnterior: veiculo.bloqueio?.motivo || "Manutenção",
      desbloqueadoPor: quemSou(),
      desbloqueadoEm: new Date().toISOString(),
    };
    await patchVeiculo(veiculo.id, { bloqueio });
    patchVeiculoLocal(veiculo.id, bloqueio);
  }

  async function salvarOS(e) {
    e.preventDefault();
    // Guard sincrono ANTES de qualquer coisa — atomic check-and-set.
    if (salvandoOSRef.current) return;
    salvandoOSRef.current = true;
    setErroOS("");
    const placa = (formOS.placa || "").trim().toUpperCase();
    if (!formOS.tipoServico) { setErroOS("Selecione o tipo de serviço."); salvandoOSRef.current = false; return; }
    if (!placa)              { setErroOS("Informe a placa.");             salvandoOSRef.current = false; return; }
    if (!formOS.motoristaId) { setErroOS("Selecione o motorista.");       salvandoOSRef.current = false; return; }

    setSalvandoOS(true);
    try {
      const mot = motoristas.find(m => m.id === formOS.motoristaId);
      const veiculo = veiculos.find(v => normP(v.placa) === normP(placa)) || null;
      const agora = new Date();
      const fornecedorNome = (formOS.fornecedor || "").trim();
      const fornecedorCnpj = (formOS.fornecedorCnpj || "").trim();
      if (fornecedorNome) {
        // Salva/atualiza no catálogo (com CNPJ, se informado)
        await garantirItemCatalogo("fornecedor", fornecedorNome, { cnpj: fornecedorCnpj });
      }
      const payload = {
        numero:        proximoNumeroOS(),
        dataHora:      agora.toISOString(),
        tipoServico:   formOS.tipoServico,
        placa,
        veiculoId:     veiculo?.id || null,
        motoristaId:   formOS.motoristaId,
        motoristaNome: mot?.nome || "",
        hodometro:     numOS(formOS.hodometro),
        obs:           (formOS.obs || "").trim(),
        fornecedor:    fornecedorNome,
        fornecedorCnpj,
        status:        "aberta",
        criadoPor:     usuarioPontual(profile),
        criadoEm:      agora.toISOString(),
      };
      const ref = await dsInsert("ordens_servico", payload);
      const osCriada = { id: ref.id, ...payload };
      // Não fazer optimistic push: onSnapshot já traz a OS nova.
      // Optimistic aqui duplicava porque o snapshot chegava antes do await resolver.
      setFormOS({ ...EMPTY_OS });

      // bloqueia o veículo automaticamente (não derruba a OS se falhar por permissão)
      if (veiculo) {
        try {
          await bloquearVeiculoPorOS(veiculo, osCriada);
        } catch (e2) {
          console.warn("Falha ao bloquear veículo da OS:", e2);
          setErroOS("OS criada, mas não foi possível bloquear o veículo automaticamente (permissão de frota). Bloqueie manualmente na tela Frota se necessário.");
        }
      } else {
        setErroOS("OS criada. A placa informada não está na frota ativa — nenhum veículo foi bloqueado.");
      }
    } catch (e) {
      setErroOS("Erro ao salvar: " + e.message);
    } finally {
      setSalvandoOS(false);
      salvandoOSRef.current = false;
    }
  }

  // finaliza a OS e libera o veículo (se não houver outra OS aberta nele)
  // eslint-disable-next-line no-unused-vars -- WIP: fluxo finalizar OS em standby, religar quando liberar pros usuários
  async function finalizarOS(os) {
    if (osStatus(os) === "finalizada") return;
    if (!window.confirm(`Finalizar ${os.numero}?\nIsso libera o veículo ${os.placa} no sistema.`)) return;
    setAcaoOS(os.id);
    try {
      const agora = new Date().toISOString();
      await dsPatch("ordens_servico", os.id, {
        status: "finalizada",
        finalizadaEm: agora,
        finalizadaPor: quemSou(),
      });
      setOrdensServico(prev => prev.map(o =>
        o.id === os.id ? { ...o, status: "finalizada", finalizadaEm: agora, finalizadaPor: quemSou() } : o
      ));
      const veiculo = veiculoDaOS(os);
      if (veiculo) {
        try { await liberarVeiculoSePossivel(veiculo, os.id); }
        catch (e2) {
          console.warn("Falha ao liberar veículo:", e2);
          alert("OS finalizada, mas não foi possível liberar o veículo automaticamente (permissão de frota). Libere manualmente na tela Frota.");
        }
      }
    } catch (e) {
      alert("Erro ao finalizar: " + e.message);
    } finally {
      setAcaoOS(null);
    }
  }

  // Upload de foto pra OS (Firebase Storage — 5GB grátis)
  // Comprime a 1600px lado máximo antes de subir (economiza banda + storage)
  async function comprimirImagem(file, maxLado = 1600, qualidade = 0.82) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("comprimir falhou")), "image/jpeg", qualidade);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("carregar imagem falhou")); };
      img.src = url;
    });
  }

  async function uploadFotosOS(os, fileList) {
    if (!os?.id) return;
    const files = Array.from(fileList || []).filter(f => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setFotosErro(""); setFotosUploading(true);
    try {
      const novasFotos = [...(os.fotos || [])];
      for (const file of files) {
        const blob = await comprimirImagem(file);
        const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/\.[^.]+$/, ".jpg");
        const arquivoJpg = new File([blob], safe, { type: "image/jpeg" });
        const meta = await uploadArquivo(arquivoJpg, { folder: `os-fotos/${os.id}` });
        novasFotos.push({
          nome: file.name,
          url: meta.url, path: meta.publicId,
          tamanho: blob.size,
          criadoEm: new Date().toISOString(),
          criadoPor: usuarioPontual(profile),
        });
      }
      await dsPatch("ordens_servico", os.id, { fotos: novasFotos, updatedAt: new Date().toISOString() });
      const osAtualizada = { ...os, fotos: novasFotos };
      setOrdensServico(prev => prev.map(o => o.id === os.id ? osAtualizada : o));
      setFotosOsModal(osAtualizada);
    } catch (e) {
      console.error("uploadFotosOS:", e);
      setFotosErro("Erro no upload: " + (e?.message || e));
    } finally {
      setFotosUploading(false);
    }
  }

  async function removerFotoOS(os, idx) {
    if (!os?.id) return;
    const foto = os.fotos?.[idx];
    if (!foto) return;
    if (!window.confirm(`Remover foto "${foto.nome}"?`)) return;
    try {
      const novasFotos = os.fotos.filter((_, i) => i !== idx);
      await dsPatch("ordens_servico", os.id, { fotos: novasFotos, updatedAt: new Date().toISOString() });
      const osAtualizada = { ...os, fotos: novasFotos };
      setOrdensServico(prev => prev.map(o => o.id === os.id ? osAtualizada : o));
      setFotosOsModal(osAtualizada);
    } catch (e) {
      console.error("removerFotoOS:", e);
      setFotosErro("Erro ao remover: " + (e?.message || e));
    }
  }

  function abrirConclusaoOS(os) {
    if (osStatus(os) === "finalizada") return;
    setConcluindoOS(os);
    setFormConclusao({
      kmSaida: "",
      mecanico: "",
      oficina: "",
      servicoExecutado: os.tipoServico || "",
      fornecedor: os.fornecedor || "",
      fornecedorCnpj: os.fornecedorCnpj || cnpjDoFornecedor(os.fornecedor || ""),
    });
    setConclusaoItens([]);
    setItemDraftConcl({ ...EMPTY_ITEM });
    setErroConclusao("");
  }

  function fecharConclusaoOS() {
    setConcluindoOS(null);
    setErroConclusao("");
    setConclusaoItens([]);
    setItemDraftConcl({ ...EMPTY_ITEM });
  }

  function adicionarItemConclusao() {
    const item = (itemDraftConcl.item || "").trim();
    if (!itemDraftConcl.tipoItem) { setErroConclusao("No item: escolha Serviço ou Peça."); return; }
    if (!item) { setErroConclusao(`No item: informe o ${itemDraftConcl.tipoItem === "peca" ? "nome da peça" : "serviço"}.`); return; }
    const quantidade = numOS(itemDraftConcl.quantidade) || 1;
    const valorUnitario = numOS(itemDraftConcl.valorUnitario);
    garantirItemCatalogo(itemDraftConcl.tipoItem, item);
    setConclusaoItens(prev => [...prev, { tipoItem: itemDraftConcl.tipoItem, item, quantidade, valorUnitario, valorTotal: quantidade * valorUnitario }]);
    setItemDraftConcl({ ...EMPTY_ITEM });
    setErroConclusao("");
  }

  function removerItemConclusao(idx) {
    setConclusaoItens(prev => prev.filter((_, i) => i !== idx));
  }

  async function salvarConclusaoOS(e) {
    e.preventDefault();
    if (salvandoConclusaoRef.current) return;
    if (!concluindoOS) return;
    const os = concluindoOS;
    const kmSaidaStr = String(formConclusao.kmSaida || "").replace(/\D/g, "");
    if (!kmSaidaStr) { setErroConclusao("Informe o KM de saída."); return; }
    if (os.hodometro != null && Number(kmSaidaStr) < Number(os.hodometro)) {
      setErroConclusao(`KM de saída (${kmSaidaStr}) não pode ser menor que o KM de entrada (${os.hodometro}).`);
      return;
    }
    if (!formConclusao.servicoExecutado.trim()) {
      setErroConclusao("Descreva o serviço executado.");
      return;
    }
    salvandoConclusaoRef.current = true;
    setSalvandoConclusao(true);
    try {
      const fornecedorNome = (formConclusao.fornecedor || "").trim();
      const fornecedorCnpj = (formConclusao.fornecedorCnpj || "").trim();
      if (fornecedorNome) {
        await garantirItemCatalogo("fornecedor", fornecedorNome, { cnpj: fornecedorCnpj });
      }
      const itens = conclusaoItens.map(it => ({
        tipoItem: it.tipoItem,
        item: it.item,
        quantidade: numOS(it.quantidade),
        valorUnitario: numOS(it.valorUnitario),
        valorTotal: numOS(it.quantidade) * numOS(it.valorUnitario),
      }));
      const valorTotal = itens.reduce((s, it) => s + it.valorTotal, 0);
      const agora = new Date().toISOString();
      const dados = {
        status: "finalizada",
        finalizadaEm: agora,
        finalizadaPor: quemSou(),
        kmSaida: Number(kmSaidaStr),
        mecanico: formConclusao.mecanico.trim(),
        oficina: formConclusao.oficina.trim(),
        servicoExecutado: formConclusao.servicoExecutado.trim(),
        fornecedor: fornecedorNome,
        fornecedorCnpj,
        itens,
        valorTotal,
        assinaturaMotorista: formConclusao.assinaturaMotorista || null,
        garantiaDias: Number(formConclusao.garantiaDias) || 90,
      };
      await dsPatch("ordens_servico", os.id, dados);
      setOrdensServico(prev => prev.map(o => o.id === os.id ? { ...o, ...dados } : o));
      const veiculo = veiculoDaOS(os);
      if (veiculo) {
        try { await liberarVeiculoSePossivel(veiculo, os.id); }
        catch (e2) {
          console.warn("Falha ao liberar veículo:", e2);
          alert("OS finalizada, mas não foi possível liberar o veículo automaticamente. Libere manualmente na tela Frota.");
        }
      }
      fecharConclusaoOS();
    } catch (e) {
      setErroConclusao("Erro ao salvar: " + e.message);
    } finally {
      setSalvandoConclusao(false);
      salvandoConclusaoRef.current = false;
    }
  }

  function abrirEditOS(os) {
    if (!osEditavel(os)) return;
    setEditOS(os);
    setFormEditOS({
      tipoServico: os.tipoServico || "",
      placa:       os.placa || "",
      motoristaId: os.motoristaId || "",
      hodometro:   os.hodometro != null ? String(os.hodometro) : "",
      obs:         os.obs || "",
    });
    setErroEdit("");
  }

  function fecharEditOS() { setEditOS(null); setErroEdit(""); }

  async function salvarEditOS(e) {
    e.preventDefault();
    if (salvandoEditRef.current) return;
    if (!editOS) return;
    // trava de segurança — passou das 24h ou já finalizada
    if (!osEditavel(editOS)) { setErroEdit("Esta OS não pode mais ser editada (passou de 24h ou já finalizada)."); return; }
    setErroEdit("");
    const placa = (formEditOS.placa || "").trim().toUpperCase();
    if (!formEditOS.tipoServico) { setErroEdit("Selecione o tipo de serviço."); return; }
    if (!placa)                  { setErroEdit("Informe a placa.");             return; }
    if (!formEditOS.motoristaId) { setErroEdit("Selecione o motorista.");       return; }

    salvandoEditRef.current = true;
    setSalvandoEdit(true);
    try {
      const mot = motoristas.find(m => m.id === formEditOS.motoristaId);
      const veiculoNovo = veiculos.find(v => normP(v.placa) === normP(placa)) || null;
      const placaMudou = normP(placa) !== normP(editOS.placa);

      const updates = {
        tipoServico:   formEditOS.tipoServico,
        placa,
        veiculoId:     veiculoNovo?.id || null,
        motoristaId:   formEditOS.motoristaId,
        motoristaNome: mot?.nome || "",
        hodometro:     numOS(formEditOS.hodometro),
        obs:           (formEditOS.obs || "").trim(),
        editadoEm:     new Date().toISOString(),
        editadoPor:    quemSou(),
      };
      await dsPatch("ordens_servico", editOS.id, updates);
      const osAtualizada = { ...editOS, ...updates };
      setOrdensServico(prev => prev.map(o => (o.id === editOS.id ? osAtualizada : o)));

      // se a placa mudou, transfere o bloqueio: libera o antigo, bloqueia o novo
      if (placaMudou) {
        try {
          const veiculoAntigo = veiculoDaOS(editOS);
          if (veiculoAntigo && veiculoAntigo.id !== veiculoNovo?.id) {
            // exclui esta própria OS do recálculo do veículo antigo
            await liberarVeiculoSePossivel(veiculoAntigo, editOS.id);
          }
          if (veiculoNovo) await bloquearVeiculoPorOS(veiculoNovo, osAtualizada);
        } catch (e2) {
          console.warn("Falha ao transferir bloqueio na edição:", e2);
        }
      }
      fecharEditOS();
    } catch (e) {
      setErroEdit("Erro ao salvar: " + e.message);
    } finally {
      setSalvandoEdit(false);
      salvandoEditRef.current = false;
    }
  }

  async function excluirOS(os) {
    if (!canDelete) return;
    if (!window.confirm(`Excluir ${os.numero}?`)) return;
    try {
      await dsRemove("ordens_servico", os.id);
      setOrdensServico(prev => prev.filter(x => x.id !== os.id));
      // se essa OS estava bloqueando o veículo, libera (se não houver outra OS aberta nele)
      if (osStatus(os) === "aberta") {
        const veiculo = veiculoDaOS(os);
        if (veiculo) {
          try { await liberarVeiculoSePossivel(veiculo, os.id); }
          catch (e2) { console.warn("Falha ao liberar veículo ao excluir OS:", e2); }
        }
      }
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  }

  function fmtDateTimeBR(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  }

  // ── Lançamento de NF (registro de nota fiscal/custo — NÃO bloqueia veículo) ──
  function proximoNumeroLanc() {
    let maior = 0;
    for (const l of lancamentos) {
      const n = parseInt(String(l.numero || "").replace(/\D/g, ""), 10);
      if (Number.isFinite(n) && n > maior) maior = n;
    }
    return `LANC-${String(maior + 1).padStart(5, "0")}`;
  }

  // cadastra item no catálogo se ainda não existir. Extra pode ter { cnpj }.
  // Se item já existe mas não tinha CNPJ e agora foi fornecido, atualiza no doc.
  async function garantirItemCatalogo(tipoItem, nome, extra = {}) {
    const nm = (nome || "").trim();
    if (!nm || !tipoItem) return;
    const cnpj = (extra.cnpj || "").trim();
    const existente = itensCatalogo.find(i => i.tipo === tipoItem && normNome(i.nome) === normNome(nm));
    if (existente) {
      // Atualiza CNPJ se antes vazio e agora veio preenchido
      if (cnpj && !existente.cnpj) {
        try {
          await gdsPatch("itens_manutencao", existente.id, { cnpj });
          setItensCatalogo(prev => prev.map(i => i.id === existente.id ? { ...i, cnpj } : i));
        } catch (e) { console.warn("Falha ao atualizar CNPJ do fornecedor:", e); }
      }
      return;
    }
    try {
      const payload = { tipo: tipoItem, nome: nm, criadoEm: new Date().toISOString(), criadoPor: quemSou() };
      if (cnpj) payload.cnpj = cnpj;
      const ref = await gdsInsert("itens_manutencao", payload);
      setItensCatalogo(prev => [...prev, { id: ref.id, ...payload }].sort((a, b) => (a.nome || "").localeCompare(b.nome || "")));
    } catch (e) {
      console.warn("Falha ao cadastrar item no catálogo:", e);
    }
  }

  // Retorna o CNPJ salvo pra um fornecedor pelo nome (ou "" se não tiver).
  function cnpjDoFornecedor(nome) {
    const nm = (nome || "").trim();
    if (!nm) return "";
    const f = itensCatalogo.find(i => i.tipo === "fornecedor" && normNome(i.nome) === normNome(nm));
    return f?.cnpj || "";
  }

  // Auto-preenche CNPJ do fornecedor ao selecionar um do catálogo
  // (posicionado depois de itensCatalogo + cnpjDoFornecedor pra evitar TDZ)
  useEffect(() => {
    if (!formOS.fornecedor) return;
    const cnpj = cnpjDoFornecedor(formOS.fornecedor);
    if (cnpj && cnpj !== formOS.fornecedorCnpj) {
      setFormOS(f => ({ ...f, fornecedorCnpj: cnpj }));
    }
  }, [formOS.fornecedor, itensCatalogo]); // eslint-disable-line react-hooks/exhaustive-deps

  // adiciona item ao catálogo pela tela de Cadastros (avisa se duplicado)
  async function addItemCat(tipo) {
    const nm = (novoCat[tipo] || "").trim();
    if (!nm) return;
    if (itensCatalogo.some(i => i.tipo === tipo && normNome(i.nome) === normNome(nm))) {
      alert("Esse item já está cadastrado.");
      return;
    }
    try {
      const payload = { tipo, nome: nm, criadoEm: new Date().toISOString(), criadoPor: quemSou() };
      if (tipo === "fornecedor" && novoCatCnpj.trim()) payload.cnpj = novoCatCnpj.trim();
      const ref = await gdsInsert("itens_manutencao", payload);
      setItensCatalogo(prev => [...prev, { id: ref.id, ...payload }].sort((a, b) => (a.nome || "").localeCompare(b.nome || "")));
      setNovoCat(prev => ({ ...prev, [tipo]: "" }));
      if (tipo === "fornecedor") setNovoCatCnpj("");
    } catch (e) {
      alert("Erro ao cadastrar: " + e.message);
    }
  }

  async function renomearItemCat() {
    if (!editItemCat) return;
    const nm = (editItemCat.nome || "").trim();
    if (!nm) return;
    const cnpj = (editItemCat.cnpj || "").trim();
    try {
      const patch = { nome: nm, editadoEm: new Date().toISOString(), editadoPor: quemSou() };
      if (cnpj !== undefined) patch.cnpj = cnpj;
      await gdsPatch("itens_manutencao", editItemCat.id, patch);
      setItensCatalogo(prev => prev.map(i => (i.id === editItemCat.id ? { ...i, nome: nm, cnpj } : i)).sort((a, b) => (a.nome || "").localeCompare(b.nome || "")));
      setEditItemCat(null);
    } catch (e) {
      alert("Erro ao renomear: " + e.message);
    }
  }

  async function excluirItemCat(item) {
    if (!canDelete) return;
    if (!window.confirm(`Excluir "${item.nome}" do catálogo?`)) return;
    try {
      await gdsRemove("itens_manutencao", item.id);
      setItensCatalogo(prev => prev.filter(i => i.id !== item.id));
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  }

  // adiciona o item em digitação à lista do lançamento (criação)
  function addItemLanc() {
    const item = (itemDraft.item || "").trim();
    if (!itemDraft.tipoItem) { setErroLanc("No item: escolha Serviço ou Peça."); return; }
    if (!item)               { setErroLanc(`No item: informe o ${itemDraft.tipoItem === "peca" ? "nome da peça" : "serviço"}.`); return; }
    const quantidade = numOS(itemDraft.quantidade) || 1;
    const valorUnitario = numOS(itemDraft.valorUnitario);
    garantirItemCatalogo(itemDraft.tipoItem, item);
    setLancItens(prev => [...prev, { tipoItem: itemDraft.tipoItem, item, quantidade, valorUnitario, valorTotal: quantidade * valorUnitario }]);
    setItemDraft({ ...EMPTY_ITEM });
    setErroLanc("");
  }
  function removerItemLanc(idx) {
    setLancItens(prev => prev.filter((_, i) => i !== idx));
  }

  async function salvarLanc(e) {
    e.preventDefault();
    if (salvandoLancRef.current) return;
    salvandoLancRef.current = true;
    setErroLanc("");
    const placa = (formLanc.placa || "").trim().toUpperCase();
    const tipoLancamento = (formLanc.tipoLancamento || "").trim();
    if (!tipoLancamento)        { setErroLanc("Informe o tipo de lançamento (ex: Elétrico, Motor, Inspeção)."); salvandoLancRef.current = false; return; }
    if (!placa)                 { setErroLanc("Selecione a placa."); salvandoLancRef.current = false; return; }
    if (lancItens.length === 0) { setErroLanc("Adicione pelo menos um serviço/peça."); salvandoLancRef.current = false; return; }

    setSalvandoLanc(true);
    try {
      await garantirItemCatalogo("tipo_lancamento", tipoLancamento);
      await garantirItemCatalogo("fornecedor", (formLanc.fornecedor || "").trim());
      const agora = new Date();
      const itens = lancItens;
      const valorTotal = itens.reduce((sum, it) => sum + (Number(it.valorTotal) || 0), 0);
      const payload = {
        numero:         proximoNumeroLanc(),
        dataHora:       agora.toISOString(),
        osId:           formLanc.osId || "",
        osNumero:       formLanc.osNumero || "",
        tipoLancamento,
        placa,
        fornecedor:     (formLanc.fornecedor || "").trim(),
        hodometro:      numOS(formLanc.hodometro),
        itens,
        valorTotal,
        servicoFeito:   (formLanc.servicoFeito || "").trim(),
        criadoPor:      usuarioPontual(profile),
        criadoEm:       agora.toISOString(),
      };
      const ref = await dsInsert("lancamentos_os", payload);
      setLancamentos(prev => [{ id: ref.id, ...payload }, ...prev]);
      setFormLanc({ ...EMPTY_LANC });
      setLancItens([]);
      setItemDraft({ ...EMPTY_ITEM });
    } catch (e) {
      setErroLanc("Erro ao salvar: " + e.message);
    } finally {
      setSalvandoLanc(false);
      salvandoLancRef.current = false;
    }
  }

  function abrirEditLanc(l) {
    setEditLanc(l);
    setFormEditLanc({
      osId:           l.osId || "",
      osNumero:       l.osNumero || "",
      tipoLancamento: l.tipoLancamento || "",
      placa:          l.placa || "",
      fornecedor:     l.fornecedor || "",
      hodometro:      l.hodometro != null ? String(l.hodometro) : "",
      servicoFeito:   l.servicoFeito || "",
    });
    const itens = Array.isArray(l.itens) && l.itens.length
      ? l.itens.map(it => ({ tipoItem: it.tipoItem || "", item: it.item || "", quantidade: numOS(it.quantidade) || 1, valorUnitario: numOS(it.valorUnitario), valorTotal: Number(it.valorTotal) || numOS(it.quantidade) * numOS(it.valorUnitario) }))
      : (l.item ? [{ tipoItem: l.tipoItem || "", item: l.item, quantidade: numOS(l.quantidade) || 1, valorUnitario: numOS(l.valorUnitario), valorTotal: Number(l.valorTotal) || numOS(l.quantidade) * numOS(l.valorUnitario) }] : []);
    setLancItensEdit(itens);
    setItemDraftEdit({ ...EMPTY_ITEM });
    setAnexosLanc(Array.isArray(l.anexos) ? l.anexos : []);
    setErroAnexoLanc("");
    setErroEditLanc("");
  }

  function fecharEditLanc() { setEditLanc(null); setErroEditLanc(""); setAnexosLanc([]); setErroAnexoLanc(""); }

  function addItemEditLanc() {
    const item = (itemDraftEdit.item || "").trim();
    if (!itemDraftEdit.tipoItem) { setErroEditLanc("No item: escolha Serviço ou Peça."); return; }
    if (!item)                   { setErroEditLanc(`No item: informe o ${itemDraftEdit.tipoItem === "peca" ? "nome da peça" : "serviço"}.`); return; }
    const quantidade = numOS(itemDraftEdit.quantidade) || 1;
    const valorUnitario = numOS(itemDraftEdit.valorUnitario);
    garantirItemCatalogo(itemDraftEdit.tipoItem, item);
    setLancItensEdit(prev => [...prev, { tipoItem: itemDraftEdit.tipoItem, item, quantidade, valorUnitario, valorTotal: quantidade * valorUnitario }]);
    setItemDraftEdit({ ...EMPTY_ITEM });
    setErroEditLanc("");
  }
  function removerItemEditLanc(idx) {
    setLancItensEdit(prev => prev.filter((_, i) => i !== idx));
  }

  async function salvarEditLanc(e) {
    e.preventDefault();
    if (salvandoEditLancRef.current) return;
    if (!editLanc) return;
    setErroEditLanc("");
    const placa = (formEditLanc.placa || "").trim().toUpperCase();
    const tipoLancamento = (formEditLanc.tipoLancamento || "").trim();
    if (!tipoLancamento)            { setErroEditLanc("Informe o tipo de lançamento."); return; }
    if (!placa)                     { setErroEditLanc("Selecione a placa."); return; }
    if (lancItensEdit.length === 0) { setErroEditLanc("Adicione pelo menos um serviço/peça."); return; }

    salvandoEditLancRef.current = true;
    setSalvandoEditLanc(true);
    try {
      await garantirItemCatalogo("tipo_lancamento", tipoLancamento);
      await garantirItemCatalogo("fornecedor", (formEditLanc.fornecedor || "").trim());
      const itens = lancItensEdit;
      const valorTotal = itens.reduce((sum, it) => sum + (Number(it.valorTotal) || 0), 0);
      const updates = {
        osId:         formEditLanc.osId || "",
        osNumero:     formEditLanc.osNumero || "",
        tipoLancamento,
        placa,
        fornecedor:   (formEditLanc.fornecedor || "").trim(),
        hodometro:    numOS(formEditLanc.hodometro),
        itens,
        valorTotal,
        servicoFeito: (formEditLanc.servicoFeito || "").trim(),
        anexos:       Array.isArray(anexosLanc) ? anexosLanc : [],
        editadoEm:    new Date().toISOString(),
        editadoPor:   quemSou(),
      };
      await dsPatch("lancamentos_os", editLanc.id, updates);
      setLancamentos(prev => prev.map(x => (x.id === editLanc.id ? { ...x, ...updates } : x)));
      fecharEditLanc();
    } catch (e) {
      setErroEditLanc("Erro ao salvar: " + e.message);
    } finally {
      setSalvandoEditLanc(false);
      salvandoEditLancRef.current = false;
    }
  }

  async function excluirLanc(l) {
    if (!canDelete) return;
    if (!window.confirm(`Excluir o lançamento ${l.numero}?`)) return;
    try {
      // Anexos ficam órfãos no Cloudinary (sem API secret no browser não dá pra deletar)
      await dsRemove("lancamentos_os", l.id);
      setLancamentos(prev => prev.filter(x => x.id !== l.id));
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  }

  const thOS = { textAlign: "left", padding: "0.7rem 0.9rem", fontSize: ".72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" };
  const tdOS = { padding: "0.7rem 0.9rem", verticalAlign: "top", color: "var(--text-subtle)" };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap} className="manut-page-root">

      <style>{`
        .manut-page-root { font-family: "Manrope", system-ui, -apple-system, sans-serif; }
        .manut-page-root .manut-display { font-family: "Space Grotesk", "Manrope", system-ui, sans-serif; letter-spacing: -.01em; }
        .manut-header-btn { transition: transform .15s, background .15s; display:inline-flex; align-items:center; gap:8px; }
        .manut-header-btn:hover { transform: translateY(-1px); }

        /* item de navegação da sidebar */
        .manut-snav-item:hover { background: var(--surface-2); }

        /* cards KPI — faixa superior de acento + hover */
        .manut-kpis > button:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(15,23,42,.22); border-color: var(--border-strong); }
        .manut-kpis > button::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 14px 14px 0 0; }
        .manut-kpis > button:nth-child(1)::before { background: var(--danger); }
        .manut-kpis > button:nth-child(2)::before { background: var(--success); }
        .manut-kpis > button:nth-child(3)::before { background: var(--accent); }
        .manut-kpis > button:nth-child(4)::before { background: var(--chart-6); }

        /* Responsivo: sidebar sempre visível, afina em telas menores */
        @media (max-width: 1200px) {
          .manut-sidebar { width: 218px !important; }
          .manut-kpis { margin-left: 230px !important; }
          .manut-page-root main { margin-left: 230px !important; }
        }
        @media (max-width: 720px) {
          .manut-kpis { grid-template-columns: repeat(2, 1fr) !important; padding: 12px 12px 2px !important; }
        }
        @media (max-width: 768px) {
          .manut-sidebar-toggle { display: inline-flex !important; }
          .manut-sidebar { transform: translateX(-100%) !important; transition: transform .25s ease !important; z-index: 99999 !important; }
          .manut-sidebar.is-open { transform: translateX(0) !important; }
          .manut-sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 99998; }
          .manut-sidebar-overlay.is-open { display: block; }
          .manut-kpis { margin-left: 0 !important; padding: 12px !important; }
          .manut-page-root main { margin-left: 0 !important; padding: 12px !important; }
        }
      `}</style>
      {/* HEADER */}
      <header style={s.header} className="pg-header">
        <div className="pg-logo"><LogoPontual height={36} variant="white" /></div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <h1 style={s.headerTitle} className="manut-display">MANUTENÇÃO</h1>
          {alertaCount > 0 && (
            <span style={s.alertaBadge}>
              <Ico.Alert size={11} /> {alertaCount} pendente{alertaCount>1?"s":""}
            </span>
          )}
        </div>
        <div className="pg-header-actions">
          <button className="manut-sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} style={{ display:"none", width:36, height:36, border:"1px solid var(--border)", borderRadius:8, background:"var(--card-bg)", color:"var(--text)", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <button style={s.backBtn} className="manut-header-btn" onClick={() => navigate("/dashboard")}>
            <Ico.Dash size={16} />
            <span className="hide-mobile">Dashboard</span>
          </button>
        </div>
      </header>

      {/* NAVBAR LATERAL ESQUERDA — agrupada por função + guard RBAC */}
      <div className={"manut-sidebar-overlay" + (sidebarOpen ? " is-open" : "")} onClick={() => setSidebarOpen(false)} />
      <aside className={"manut-navgroups manut-sidebar" + (sidebarOpen ? " is-open" : "")} style={s.navGroups}>
        <div style={s.sidebarTitle} className="manut-sidebar-title">Manutenção</div>

        {podeVerAba("dashboard") && (
          <div style={s.navGroup}>
            <span style={s.navGroupLabel}>Visão</span>
            <NavTab icon={LayoutDashboard} label="Dashboard" active={aba==="dashboard"} onClick={() => setAba("dashboard")} accent="#0891b2" />
          </div>
        )}

        {(podeVerAba("por_veiculo") || podeVerAba("por_tipo") || podeVerAba("alertas") || podeVerAba("conjunto") || podeVerAba("lavagem") || podeVerAba("lubrificacao") || podeVerAba("calibragem")) && (
          <div style={s.navGroup}>
            <span style={s.navGroupLabel}>Manutenção</span>
            {podeVerAba("por_veiculo") && (
              <NavTab icon={Truck} label="Por Veículo" active={aba==="veiculo"} onClick={() => setAba("veiculo")} accent="#2563eb" />
            )}
            {podeVerAba("por_tipo") && (
              <NavTab icon={ListChecks} label="Por Tipo" active={aba==="tipo"} onClick={() => setAba("tipo")} accent="#2563eb" />
            )}
            {podeVerAba("alertas") && (
              <NavTab icon={AlertTriangle} label="Alertas" active={aba==="alertas"} onClick={() => setAba("alertas")} accent="#dc2626"
                badge={alertaCount > 0 ? { text: alertaCount, color: "#dc2626" } : null} />
            )}
            {podeVerAba("conjunto") && (
              <NavTab icon={Layers} label="Conjunto" active={aba==="conjunto"} onClick={() => setAba("conjunto")} accent="#7c3aed" />
            )}
            {podeVerAba("lavagem") && (
              <NavTab icon={Droplet} label="Lavagem" active={aba==="lavagem"} onClick={() => setAba("lavagem")} accent="#0891b2" />
            )}
            {podeVerAba("lubrificacao") && (
              <NavTab icon={SprayCan} label="Lubrificação" active={aba==="lubrificacao"} onClick={() => setAba("lubrificacao")} accent="#059669" />
            )}
            {podeVerAba("calibragem") && (
              <NavTab icon={Gauge} label="Calibragem" active={aba==="calibragem"} onClick={() => setAba("calibragem")} accent="#dc2626" />
            )}
          </div>
        )}

        {podeVerAba("estoque") && (
          <div style={s.navGroup}>
            <span style={s.navGroupLabel}>Insumos</span>
            <NavTab icon={Package} label="Estoque" active={aba==="estoque"} onClick={() => setAba("estoque")} accent="#0f172a" />
            <NavTab icon={Store} label="Fornecedores" active={aba==="fornecedores"} onClick={() => setAba("fornecedores")} accent="#0f172a" />
            <NavTab icon={ShoppingCartIco} label="Requisições" active={aba==="requisicoes"} onClick={() => setAba("requisicoes")} accent="#4338ca" />
          </div>
        )}

        {(podeVerAba("os_abertura") || podeVerAba("os_lancamento")) && (
          <div style={s.navGroup}>
            <span style={s.navGroupLabel}>Ordens de Serviço</span>
            {podeVerAba("os_abertura") && (
              <NavTab icon={FilePlus2} label="Abertura" active={aba==="os"} onClick={() => setAba("os")} accent="#16a34a"
                badge={ordensServico.length > 0 ? { text: ordensServico.length, color: "#16a34a" } : null} />
            )}
            {podeVerAba("os_lancamento") && (
              <NavTab icon={FileText} label="Lançamento" active={aba==="os_lanc"} onClick={() => setAba("os_lanc")} accent="#16a34a" />
            )}
          </div>
        )}

        <div style={s.navGroup}>
          <span style={s.navGroupLabel}>Preventiva</span>
          <NavTab icon={ClipboardCheck} label="Checklist Mensal" active={aba==="checklist"} onClick={() => setAba("checklist")} accent="#0891b2" />
        </div>

        {podeVerAba("nf") && (
          <div style={s.navGroup}>
            <span style={s.navGroupLabel}>Financeiro</span>
            <NavTab icon={Receipt} label="Lançamento de NF" active={aba==="lancamento"} onClick={() => setAba("lancamento")} accent="#4338ca"
              badge={lancamentos.length > 0 ? { text: lancamentos.length, color: "#4338ca" } : null} />
            <NavTab icon={TrendingUp} label="CPK" active={aba==="cpk"} onClick={() => setAba("cpk")} accent="#4338ca" />
            <NavTab icon={Brain} label="Preditiva" active={aba==="preditiva"} onClick={() => setAba("preditiva")} accent="#7c3aed" />
            <NavTab icon={LayoutDashboard} label="Indicadores" active={aba==="indicadores"} onClick={() => setAba("indicadores")} accent="#0891b2" />
          </div>
        )}

        {podeVerAba("cadastros") && (
          <div style={s.navGroup}>
            <span style={s.navGroupLabel}>Config</span>
            <NavTab icon={Settings} label="Cadastros" active={aba==="cadastros"} onClick={() => setAba("cadastros")} accent="#64748b"
              badge={itensCatalogo.length > 0 ? { text: itensCatalogo.length, color: "#64748b" } : null} />
          </div>
        )}
      </aside>

      {/* KPIs — resumo clicável (service desk) */}
      <div style={s.kpisRow} className="manut-kpis">
        <button type="button" style={s.kpi} onClick={() => podeVerAba("alertas") && setAba("alertas")} disabled={!podeVerAba("alertas")}>
          <span style={s.kpiTop}>
            <span style={{ ...s.kpiIco, background:"var(--danger-bg)", color:"var(--danger)" }}><AlertTriangle size={16} /></span>
            <span style={s.kpiLabel}>Alertas pendentes</span>
          </span>
          <span style={s.kpiValor}>{alertaCount}</span>
        </button>
        <button type="button" style={s.kpi} onClick={() => podeVerAba("os_abertura") && setAba("os")} disabled={!podeVerAba("os_abertura")}>
          <span style={s.kpiTop}>
            <span style={{ ...s.kpiIco, background:"var(--success-bg)", color:"var(--success)" }}><FilePlus2 size={16} /></span>
            <span style={s.kpiLabel}>OS abertas</span>
          </span>
          <span style={s.kpiValor}>{ordensServico.length}</span>
        </button>
        <button type="button" style={s.kpi} onClick={() => podeVerAba("dashboard") && setAba("dashboard")} disabled={!podeVerAba("dashboard")}>
          <span style={s.kpiTop}>
            <span style={{ ...s.kpiIco, background:"var(--accent-soft)", color:"var(--accent)" }}><Truck size={16} /></span>
            <span style={s.kpiLabel}>Veículos</span>
          </span>
          <span style={s.kpiValor}>{veiculos.length}</span>
        </button>
        <button type="button" style={s.kpi} onClick={() => podeVerAba("nf") && setAba("lancamento")} disabled={!podeVerAba("nf")}>
          <span style={s.kpiTop}>
            <span style={{ ...s.kpiIco, background:"var(--info-bg)", color:"var(--info)" }}><Receipt size={16} /></span>
            <span style={s.kpiLabel}>Lançamentos NF</span>
          </span>
          <span style={s.kpiValor}>{lancamentos.length}</span>
        </button>
      </div>

      {/* ── ABA: DASHBOARD ANALYTICS ─────────────────────────────────── */}
      {aba === "dashboard" && podeVerAba("dashboard") && (
        <main style={s.main} className="pg-body">
          <DashboardAnalytics lancamentos={lancamentos} fmtBRLfn={fmtBRL} />
        </main>
      )}

      {/* ── ABA: POR VEÍCULO ──────────────────────────────────────────── */}
      {aba === "veiculo" && podeVerAba("por_veiculo") && (
        <main style={{ ...s.main, maxWidth: "none", marginLeft: 262, padding: "16px 20px" }} className="pg-body">
          <div style={s.veiculoRow}>
            <label style={s.veiculoLabel}>Veículo</label>
            <select style={s.veiculoSelect} value={placa} onChange={e => setPlaca(e.target.value)}>
              <optgroup label="── Cavalos">
                {veiculos.filter(v => v.tipo !== "carreta").map(v => (
                  <option key={v.id} value={v.placa}>
                    {v.placa}{v.modelo ? ` — ${v.modelo}` : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label="── Carretas">
                {veiculos.filter(v => v.tipo === "carreta").map(v => (
                  <option key={v.id} value={v.placa}>{v.placa}</option>
                ))}
              </optgroup>
            </select>
            {placa && (
                <div style={s.resumoPills}>
                  {summaryStatus.vencido > 0 && <span style={{ ...s.rPill, background:"var(--danger-bg)", color:"var(--danger)" }}>{summaryStatus.vencido} vencido{summaryStatus.vencido>1?"s":""}</span>}
                  {summaryStatus.alerta  > 0 && <span style={{ ...s.rPill, background:"#fef9c3", color:"#a16207" }}>{summaryStatus.alerta} alerta{summaryStatus.alerta>1?"s":""}</span>}
                  {summaryStatus.ok      > 0 && <span style={{ ...s.rPill, background:"var(--success-bg)", color:"var(--success)" }}>{summaryStatus.ok} ok</span>}
                  {summaryStatus.semReg  > 0 && <span style={{ ...s.rPill, background:"var(--surface-2)", color:"var(--text-subtle)" }}>{summaryStatus.semReg} sem reg.</span>}
                </div>
            )}
            {placa && veiculoSelecionado && (
              <button
                type="button"
                onClick={abrirModalDocs}
                title={Array.isArray(veiculoSelecionado.documentosAplicaveis) ? "Editar quais documentos aplicam a essa placa" : "Personalizar quais documentos aplicam a essa placa"}
                style={{ marginLeft:"auto", padding:"8px 14px", background:"var(--surface-2)", color:"var(--text)", border:"1px solid var(--border)", borderRadius:8, fontSize:".82rem", fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6, fontFamily:"inherit" }}
              >
                ⚙ Documentos aplicáveis
                {Array.isArray(veiculoSelecionado.documentosAplicaveis) && (
                  <span style={{ background:"var(--accent)", color:"#fff", borderRadius:20, fontSize:".7rem", fontWeight:800, padding:"2px 8px" }}>
                    customizado
                  </span>
                )}
              </button>
            )}
          </div>

          {loading ? (
            <p style={s.info}>Carregando...</p>
          ) : (
            (() => {
              // Split: lista de docs (esquerda) + detalhe do doc selecionado (direita)
              const allItens = conjuntoComStatus.flatMap(secao =>
                Object.entries(secao.grupos).flatMap(([grupo, tipos]) =>
                  tipos.map(t => ({ ...t, secaoPlaca: secao.placa, secaoLabel: secao.label, grupo }))
                )
              );
              const key = (it) => `${it.secaoPlaca}__${it.id}`;
              const selected = allItens.find(it => key(it) === docSelKey) || allItens[0];
              const sel = selected;

              return (
                <div style={{ display:"flex", gap:12, alignItems:"stretch", minHeight:400 }}>
                  {/* LISTA ESQUERDA */}
                  <div style={{ width:280, flexShrink:0, background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:10, overflow:"auto", maxHeight:"70vh" }}>
                    {conjuntoComStatus.map(secao => (
                      <div key={secao.placa}>
                        <div style={{ padding:"8px 12px", fontWeight:700, fontSize:".78rem", color:"var(--text)", background:"var(--surface-2)", borderBottom:"1px solid var(--border)", position:"sticky", top:0 }}>
                          {secao.label}
                        </div>
                        {Object.entries(secao.grupos).map(([grupo, tipos]) => (
                          <div key={grupo}>
                            {tipos.map(t => {
                              const sm = STATUS_META[t.status];
                              const it = { ...t, secaoPlaca: secao.placa };
                              const ativo = key(it) === (sel ? key(sel) : null);
                              return (
                                <div
                                  key={key(it)}
                                  onClick={() => setDocSelKey(key(it))}
                                  style={{
                                    padding:"10px 12px", borderBottom:"1px solid var(--border)",
                                    cursor:"pointer",
                                    background: ativo ? "#eef4ff" : "transparent",
                                    borderLeft: ativo ? "3px solid var(--text)" : "3px solid transparent",
                                    display:"flex", justifyContent:"space-between", alignItems:"center", gap:8,
                                  }}
                                >
                                  <span style={{ fontSize:".85rem", fontWeight: ativo ? 700 : 500, color:"var(--text)" }}>{t.label}</span>
                                  <span style={{ ...s.sPill, background: sm.bg, color: sm.color, fontSize:".68rem" }}>{sm.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* DETALHE DIREITA */}
                  <div style={{ flex:1, background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:10, padding:20, minHeight:"70vh" }}>
                    {!sel ? (
                      <p style={s.info}>Selecione um documento à esquerda.</p>
                    ) : (
                      <>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:14, paddingBottom:14, borderBottom:"1px solid var(--border)" }}>
                          <div>
                            <div style={{ fontSize:".75rem", color:"var(--text-muted)", fontWeight:700, textTransform:"uppercase", marginBottom:4 }}>
                              {sel.secaoLabel} · {sel.grupo}
                            </div>
                            <div style={{ fontSize:"1.3rem", fontWeight:800, color:"var(--text)" }}>{sel.label}</div>
                            <div style={{ fontSize:".85rem", color:"var(--text-muted)", marginTop:4 }}>{sel.desc}</div>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"end", gap:8 }}>
                            <span style={{ ...s.sPill, background: STATUS_META[sel.status].bg, color: STATUS_META[sel.status].color, fontSize:".8rem", padding:"5px 12px" }}>
                              {STATUS_META[sel.status].label}
                            </span>
                            <button
                              style={{ padding:"8px 16px", background:"var(--text)", color:"#fff", border:"none", borderRadius:8, fontSize:".85rem", fontWeight:700, cursor:"pointer" }}
                              onClick={() => abrirModal(sel.secaoPlaca, sel)}
                            >
                              {sel.record ? "Editar" : "Preencher"}
                            </button>
                          </div>
                        </div>
                        {sel.record ? (
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:14 }}>
                            {sel.record.data_realiz && (
                              <div><div style={s.fieldLbl}>Realização</div><div style={s.fieldVal}>{fmtDate(sel.record.data_realiz)}</div></div>
                            )}
                            {sel.record.venc && (
                              <div><div style={s.fieldLbl}>Vencimento</div><div style={{ ...s.fieldVal, fontWeight:700 }}>{fmtDate(sel.record.venc)}</div></div>
                            )}
                            {sel.record.local && (
                              <div><div style={s.fieldLbl}>Local</div><div style={s.fieldVal}>{sel.record.local}</div></div>
                            )}
                            {sel.record.numero_doc && (
                              <div><div style={s.fieldLbl}>Nº do Documento</div><div style={s.fieldVal}>{sel.record.numero_doc}</div></div>
                            )}
                            {sel.record.resp && (
                              <div><div style={s.fieldLbl}>Responsável</div><div style={s.fieldVal}>{sel.record.resp}</div></div>
                            )}
                            {sel.record.agendamento && (
                              <div><div style={s.fieldLbl}>Agendamento</div><div style={s.fieldVal}>{fmtDate(sel.record.agendamento)}</div></div>
                            )}
                            {sel.record.obs && (
                              <div style={{ gridColumn:"1/-1" }}><div style={s.fieldLbl}>Observações</div><div style={s.fieldVal}>{sel.record.obs}</div></div>
                            )}
                          </div>
                        ) : (
                          <p style={{ ...s.info, marginTop:30 }}>Sem registro para este documento. Clique em "Preencher" acima.</p>
                        )}

                        {/* ANEXOS — visualização inline no split (grande, ocupa toda largura) */}
                        {sel.record && Array.isArray(sel.record.anexos) && sel.record.anexos.length > 0 && (
                          <div style={{ marginTop:24, paddingTop:20, borderTop:"1px solid var(--border)" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                              <div style={s.fieldLbl}>Anexos ({sel.record.anexos.length})</div>
                              <span style={{ fontSize:".72rem", color:"var(--text-muted)" }}>Clique no anexo para abrir em tela cheia</span>
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                              {sel.record.anexos.map((a, i) => {
                                const isImg = /^image\//.test(a.tipo || "") || /\.(jpg|jpeg|png|webp|gif)$/i.test(a.nome || "");
                                const isPdf = /pdf/i.test(a.tipo || "") || /\.pdf$/i.test(a.nome || "");
                                return (
                                  <div key={i} style={{ border:"1px solid var(--border)", borderRadius:10, overflow:"hidden", background:"var(--surface-2)" }}>
                                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"var(--card-bg)", borderBottom:"1px solid var(--border)" }}>
                                      <span style={{ fontSize:".9rem", color:"var(--text)", fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={a.nome}>
                                        {a.nome || "arquivo"}
                                      </span>
                                      <a href={a.url} target="_blank" rel="noreferrer"
                                         style={{ padding:"6px 12px", background:"var(--text)", color:"#fff", borderRadius:6, fontSize:".78rem", fontWeight:700, textDecoration:"none", flexShrink:0, marginLeft:12 }}>
                                        Abrir em tela cheia
                                      </a>
                                    </div>
                                    {isImg ? (
                                      <a href={a.url} target="_blank" rel="noreferrer" style={{ display:"block" }}>
                                        <img src={a.url} alt={a.nome} style={{ width:"100%", maxHeight:800, objectFit:"contain", display:"block", background:"var(--card-bg)" }} />
                                      </a>
                                    ) : isPdf ? (
                                      <iframe src={a.url} title={a.nome} style={{ width:"100%", height:700, border:"none", display:"block", background:"var(--card-bg)" }} />
                                    ) : (
                                      <div style={{ padding:40, textAlign:"center", color:"var(--text-muted)", fontSize:".9rem" }}>
                                        Arquivo não visualizável — clique em "Abrir em tela cheia"
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </main>
      )}

      {/* ── ABA: POR TIPO ─────────────────────────────────────────────── */}
      {aba === "tipo" && podeVerAba("por_tipo") && (
        <>
          <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:10 }}>
            {["Documentação","Motorista","Mecânica"].map(grupo => {
              const gc = GRUPO_COLOR[grupo];
              const tiposGrupo = TIPOS_TODOS.filter(t => t.grupo === grupo);
              return (
                <div key={grupo} style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:".7rem", fontWeight:700, color: gc.color, background: gc.bg, border:`1px solid ${gc.border}`, borderRadius:6, padding:"2px 8px", whiteSpace:"nowrap" }}>
                    {grupo}
                  </span>
                  {tiposGrupo.map(t => {
                    const count = todosRegistros.filter(r => r.tipo === t.id).length;
                    const ativo = filtroTipo === t.id;
                    return (
                      <button
                        key={t.id}
                        style={{ ...s.filtroBtn, ...(ativo ? s.filtroBtnAtivo : {}), fontSize:".78rem" }}
                        onClick={() => { setFiltroTipo(t.id); setFiltroStTipo("todos"); }}
                      >
                        {t.label}{count > 0 ? ` (${count})` : ""}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {/* Filtro de status */}
            <div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:4, borderTop:"1px dashed var(--border)", flexWrap:"wrap" }}>
              <span style={{ fontSize:".7rem", fontWeight:700, color:"var(--text-muted)", whiteSpace:"nowrap" }}>Status:</span>
              {[
                { val:"todos",    label:"Todos" },
                { val:"vencido",  label:"Vencido" },
                { val:"alerta",   label:"Alerta" },
                { val:"agendado", label:"Agendado" },
                { val:"ok",       label:"OK" },
                { val:"sem_data", label:"Sem registro" },
              ].map(({ val, label }) => {
                const ativo = filtroStTipo === val;
                const sm = STATUS_META[val];
                return (
                  <button
                    key={val}
                    style={{
                      ...s.filtroBtn,
                      ...(ativo ? { background: sm?.bg || "var(--text)", color: sm?.color || "#fff", borderColor: "transparent" } : {}),
                      fontSize:".78rem",
                    }}
                    onClick={() => setFiltroStTipo(val)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <main style={s.main} className="pg-body">
            {loading ? (
              <p style={s.info}>Carregando...</p>
            ) : listaPorTipo.length === 0 ? (
              <p style={s.info}>Nenhum registro encontrado para este tipo.</p>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr style={s.theadRow}>
                      {["Placa / Motorista","Realização","Validade","Local","Responsável","Status",""].map(col => (
                        <th key={col} style={s.th}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listaPorTipo.map(r => {
                      const sm   = STATUS_META[r._status] || STATUS_META.ok;
                      const tipo = TIPOS_TODOS.find(t => t.id === r.tipo) || { id: r.tipo, label: r.tipo, desc:"", campos:["data_realiz","venc","local","resp","obs"] };
                      const ident = r.placa || r.motorista || "—";
                      return (
                        <tr key={r.id} style={{ ...s.tr, background: sm.rowBg }}>
                          <td style={{ ...s.td, fontWeight:700, color:"var(--text)" }}>
                            {r.placa && <div>{r.placa}</div>}
                            {r.motorista && <div style={{ fontSize:".78rem", color:"var(--text-muted)", fontWeight:400 }}>{r.motorista}</div>}
                            {!r.placa && !r.motorista && "—"}
                          </td>
                          <td style={s.td}>{fmtDate(r.data_realiz)}</td>
                          <td style={{ ...s.td, fontWeight:600 }}>{fmtDate(r.venc)}</td>
                          <td style={s.td}>{r.local || "—"}</td>
                          <td style={s.td}>{r.resp || "—"}</td>
                          <td style={s.td}>
                            <span style={{ ...s.statusBadge, background:sm.bg, color:sm.color }}>{sm.label}</span>
                          </td>
                          <td style={s.td}>
                            <button style={s.editBtn} onClick={() => abrirModal(ident, tipo)}>Editar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </>
      )}

      {/* ── ABA: ALERTAS ──────────────────────────────────────────────── */}
      {aba === "alertas" && podeVerAba("alertas") && (
        <>
          <div style={s.toolbar} className="pg-toolbar">
            <div style={{ position:"relative", flex:1, minWidth:160 }}>
              <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--text-subtle)", display:"inline-flex", pointerEvents:"none" }}>
                <Ico.Search size={16} />
              </span>
              <input
                style={{ ...s.inputBusca, paddingLeft:38 }}
                placeholder="Buscar por placa ou tipo..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
            <div style={s.filtros}>
              {["todos","vencido","alerta","agendado","ok"].map(f => (
                <button key={f}
                  style={{ ...s.filtroBtn, ...(filtroSt===f ? s.filtroBtnAtivo : {}) }}
                  onClick={() => setFiltroSt(f)}
                >
                  {f === "todos" ? "Todos" : STATUS_META[f]?.label || f}
                </button>
              ))}
            </div>
          </div>
          <main style={s.main} className="pg-body">
            {loading ? (
              <p style={s.info}>Carregando...</p>
            ) : listaAlertas.length === 0 ? (
              <p style={s.info}>Nenhum registro encontrado.</p>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr style={s.theadRow}>
                      {["Placa","Tipo","Realização","Validade","Local","Responsável","Status",""].map(col => (
                        <th key={col} style={s.th}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listaAlertas.map(r => {
                      const sm   = STATUS_META[r._status] || STATUS_META.ok;
                      const tipo = TIPOS_TODOS.find(t => t.id === r.tipo) || { id: r.tipo||"outro", label: r._label, desc:"", campos:["data_realiz","venc","local","resp","obs"] };
                      return (
                        <tr key={r.id} style={{ ...s.tr, background: sm.rowBg }}>
                          <td style={{ ...s.td, fontWeight:700, color:"var(--text)" }}>{r.placa}</td>
                          <td style={s.td}>
                            <div style={{ fontWeight:600 }}>{r._label}</div>
                            {r.grupo && <div style={{ fontSize:".72rem", color:"var(--text-subtle)", marginTop:2 }}>{r.grupo}</div>}
                          </td>
                          <td style={s.td}>{fmtDate(r.data_realiz || r.ult)}</td>
                          <td style={{ ...s.td, fontWeight:600 }}>{fmtDate(r.venc)}</td>
                          <td style={s.td}>{r.local || "—"}</td>
                          <td style={s.td}>{r.resp || "—"}</td>
                          <td style={s.td}>
                            <span style={{ ...s.statusBadge, background:sm.bg, color:sm.color }}>{sm.label}</span>
                          </td>
                          <td style={s.td}>
                            <button style={s.editBtn} onClick={() => abrirModal(r.placa, tipo)}>Editar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </>
      )}

      {/* ── ABA: CONJUNTO (cavalo + carretas atreladas) ──────────────── */}
      {aba === "conjunto" && podeVerAba("conjunto") && (
        <main style={s.main} className="pg-body">
          <AbaConjuntoVencimentos
            veiculos={veiculos}
            registros={registros}
            legacy={legacy}
            TIPOS={TIPOS}
            calcStatus={calcStatus}
            motoristas={motoristas}
            onEditar={(placa, tipo) => abrirModal(placa, tipo)}
          />
        </main>
      )}

      {/* ── ABA: LAVAGEM (só) ──────────────────────────────────────── */}
      {aba === "lavagem" && podeVerAba("lavagem") && (
        <main style={s.main} className="pg-body">
          <AbaControleRotina
            tipoId="lavagem"
            titulo="Lavagem"
            subtitulo="Controle de lavagem dos veículos — intervalo padrão 35 dias, alerta 5 dias antes"
            cor="var(--tech)"
            Icone={Droplet}
            veiculos={veiculos}
            registros={registros}
            TIPOS={TIPOS}
            calcStatus={calcStatus}
            onEditar={(placa, tipo) => abrirModal(placa, tipo)}
          />
        </main>
      )}

      {/* ── ABA: LUBRIFICAÇÃO (só) ─────────────────────────────────── */}
      {aba === "lubrificacao" && podeVerAba("lubrificacao") && (
        <main style={s.main} className="pg-body">
          <AbaControleRotina
            tipoId="lubrificacao"
            titulo="Lubrificação"
            subtitulo="Controle de lubrificação/engraxamento — intervalo padrão 35 dias, alerta 5 dias antes"
            cor="#059669"
            Icone={SprayCan}
            veiculos={veiculos}
            registros={registros}
            TIPOS={TIPOS}
            calcStatus={calcStatus}
            onEditar={(placa, tipo) => abrirModal(placa, tipo)}
          />
        </main>
      )}

      {/* ── ABA: CALIBRAGEM (só) ───────────────────────────────────── */}
      {aba === "calibragem" && podeVerAba("calibragem") && (
        <main style={s.main} className="pg-body">
          <AbaControleRotina
            tipoId="calibragem"
            titulo="Calibragem de Pneus"
            subtitulo="Controle de calibragem — intervalo padrão 10 dias, alerta 2 dias antes"
            cor="var(--danger)"
            Icone={Gauge}
            veiculos={veiculos}
            registros={registros}
            TIPOS={TIPOS}
            calcStatus={calcStatus}
            onEditar={(placa, tipo) => abrirModal(placa, tipo)}
          />
        </main>
      )}

      {/* ── ABA: ESTOQUE (entrada/saída de itens) ──────────────────── */}
      {aba === "estoque" && podeVerAba("estoque") && (
        <main style={s.main} className="pg-body">
          <AbaEstoque
            veiculos={veiculos}
            quemSou={() => usuarioPontual(profile)}
          />
        </main>
      )}

      {/* ── ABA: FORNECEDORES — ranking por preço médio, quantidade e categorias ── */}
      {aba === "fornecedores" && podeVerAba("estoque") && (
        <main style={s.main} className="pg-body">
          {(() => {
            // Agrega dados de OS finalizadas + lançamentos por fornecedor
            const stats = new Map(); // fornecedor → { osCount, valorTotal, servicos: {tipo→{n,total}}, ultimoUso, placas }
            function bump(nome, valor, servico, placa, data) {
              if (!nome) return;
              const key = nome.trim();
              if (!key) return;
              const cur = stats.get(key) || { fornecedor: key, osCount: 0, valorTotal: 0, servicos: {}, ultimoUso: null, placas: new Set() };
              cur.osCount += 1;
              cur.valorTotal += Number(valor) || 0;
              if (servico) {
                cur.servicos[servico] = cur.servicos[servico] || { n: 0, total: 0 };
                cur.servicos[servico].n += 1;
                cur.servicos[servico].total += Number(valor) || 0;
              }
              if (placa) cur.placas.add(placa);
              if (data) {
                const ts = typeof data === "object" && data.toMillis ? data.toMillis() : Date.parse(data);
                if (Number.isFinite(ts) && (!cur.ultimoUso || ts > cur.ultimoUso)) cur.ultimoUso = ts;
              }
              stats.set(key, cur);
            }
            ordensServico.forEach(os => {
              if (osStatus(os) === "finalizada") bump(os.fornecedor, os.valorTotal, os.tipoServico, os.placa, os.criadoEm || os.dataHora);
            });
            (lancamentos || []).forEach(l => bump(l.fornecedor, l.valorTotal || l.valor, l.tipoLancamento, l.placa, l.data || l.criadoEm));

            const lista = [...stats.values()]
              .map(x => ({
                ...x,
                placasCount: x.placas.size,
                ticketMedio: x.osCount > 0 ? x.valorTotal / x.osCount : 0,
                servicoTop: Object.entries(x.servicos).sort((a, b) => b[1].total - a[1].total)[0]?.[0] || "—",
              }))
              .sort((a, b) => b.valorTotal - a.valorTotal);

            const totalGasto = lista.reduce((s, x) => s + x.valorTotal, 0);
            const totalOS = lista.reduce((s, x) => s + x.osCount, 0);
            const mediaGeral = totalOS > 0 ? totalGasto / totalOS : 0;

            // Comparativo por serviço — quem é o mais barato pra cada tipo
            const porServico = new Map();
            lista.forEach(f => {
              Object.entries(f.servicos).forEach(([serv, dados]) => {
                if (dados.n === 0) return;
                const ticket = dados.total / dados.n;
                const cur = porServico.get(serv) || [];
                cur.push({ fornecedor: f.fornecedor, ticket, n: dados.n, total: dados.total });
                porServico.set(serv, cur);
              });
            });
            const rankingPorServico = [...porServico.entries()]
              .filter(([, arr]) => arr.length >= 2)
              .map(([serv, arr]) => {
                const sorted = [...arr].sort((a, b) => a.ticket - b.ticket);
                return { servico: serv, opcoes: sorted, maisBarato: sorted[0], maisCaro: sorted[sorted.length-1] };
              })
              .sort((a, b) => (b.maisCaro.ticket - b.maisBarato.ticket) - (a.maisCaro.ticket - a.maisBarato.ticket));

            return (
              <>
                {/* KPIs topo */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:16 }}>
                  <div style={{ background:"var(--card-bg)", borderRadius:12, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
                    <div style={{ fontSize:".72rem", color:"var(--text-muted)", fontWeight:600 }}>Fornecedores ativos</div>
                    <div style={{ fontSize:"1.7rem", fontWeight:800, color:"var(--text)" }}>{lista.length}</div>
                  </div>
                  <div style={{ background:"var(--card-bg)", borderRadius:12, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
                    <div style={{ fontSize:".72rem", color:"var(--text-muted)", fontWeight:600 }}>Total gasto histórico</div>
                    <div style={{ fontSize:"1.7rem", fontWeight:800, color:"var(--text)" }}>{fmtBRL(totalGasto)}</div>
                  </div>
                  <div style={{ background:"var(--card-bg)", borderRadius:12, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
                    <div style={{ fontSize:".72rem", color:"var(--text-muted)", fontWeight:600 }}>Total de OS</div>
                    <div style={{ fontSize:"1.7rem", fontWeight:800, color:"var(--text)" }}>{totalOS}</div>
                  </div>
                  <div style={{ background:"var(--card-bg)", borderRadius:12, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
                    <div style={{ fontSize:".72rem", color:"var(--text-muted)", fontWeight:600 }}>Ticket médio geral</div>
                    <div style={{ fontSize:"1.7rem", fontWeight:800, color:"var(--text)" }}>{fmtBRL(mediaGeral)}</div>
                  </div>
                </div>

                {/* Ranking geral por valor total gasto */}
                <div style={{ background:"var(--card-bg)", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.06)", marginBottom:16 }}>
                  <div style={{ padding:"0.85rem 1rem", borderBottom:"1px solid var(--border)" }}>
                    <h2 style={{ margin:0, color:"var(--text)", fontSize:".98rem" }}>Ranking de fornecedores por gasto</h2>
                    <p style={{ margin:"4px 0 0 0", fontSize:".75rem", color:"var(--text-muted)" }}>Ordenado do maior pro menor · ticket médio destaca quem tá acima/abaixo da média geral</p>
                  </div>
                  <div style={{ overflowX:"auto" }} className="table-wrap">
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".88rem" }}>
                      <thead>
                        <tr style={{ background:"var(--surface-2)", borderBottom:"1px solid var(--border)" }}>
                          <th style={thOS}>#</th>
                          <th style={thOS}>Fornecedor</th>
                          <th style={thOS}>OS</th>
                          <th style={thOS}>Placas atendidas</th>
                          <th style={thOS}>Total gasto</th>
                          <th style={thOS}>Ticket médio</th>
                          <th style={thOS}>vs média geral</th>
                          <th style={thOS}>Serviço + comum</th>
                          <th style={thOS}>Último uso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lista.length === 0 ? (
                          <tr><td colSpan={9} style={{ padding:"2rem", textAlign:"center", color:"var(--text-subtle)" }}>Nenhuma OS finalizada com fornecedor cadastrado.</td></tr>
                        ) : lista.map((f, i) => {
                          const delta = mediaGeral > 0 ? ((f.ticketMedio - mediaGeral) / mediaGeral) * 100 : 0;
                          const acima = delta > 5;
                          const abaixo = delta < -5;
                          return (
                            <tr key={f.fornecedor} style={{ borderBottom:"1px solid var(--surface-2)" }}>
                              <td style={tdOS}>{i+1}</td>
                              <td style={{ ...tdOS, fontWeight:600 }}>{f.fornecedor}</td>
                              <td style={tdOS}>{f.osCount}</td>
                              <td style={tdOS}>{f.placasCount}</td>
                              <td style={{ ...tdOS, fontWeight:700, color:"var(--text)" }}>{fmtBRL(f.valorTotal)}</td>
                              <td style={tdOS}>{fmtBRL(f.ticketMedio)}</td>
                              <td style={tdOS}>
                                <span style={{ background: acima ? "var(--danger-bg)" : abaixo ? "var(--success-bg)" : "var(--surface-2)", color: acima ? "var(--danger)" : abaixo ? "var(--success)" : "var(--text-muted)", fontSize:".78rem", fontWeight:700, padding:"3px 8px", borderRadius:999 }}>
                                  {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                                </span>
                              </td>
                              <td style={tdOS}>{f.servicoTop}</td>
                              <td style={tdOS}>{f.ultimoUso ? new Date(f.ultimoUso).toLocaleDateString("pt-BR") : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Comparativo por serviço — quem cobra mais barato pra cada tipo */}
                <div style={{ background:"var(--card-bg)", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
                  <div style={{ padding:"0.85rem 1rem", borderBottom:"1px solid var(--border)" }}>
                    <h2 style={{ margin:0, color:"var(--text)", fontSize:".98rem" }}>Comparativo por serviço — quem cobra mais barato</h2>
                    <p style={{ margin:"4px 0 0 0", fontSize:".75rem", color:"var(--text-muted)" }}>Só aparecem serviços com 2+ fornecedores. Ordenado pela maior diferença de preço.</p>
                  </div>
                  <div style={{ overflowX:"auto" }} className="table-wrap">
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".88rem" }}>
                      <thead>
                        <tr style={{ background:"var(--surface-2)", borderBottom:"1px solid var(--border)" }}>
                          <th style={thOS}>Serviço</th>
                          <th style={thOS}>Mais barato</th>
                          <th style={thOS}>Ticket barato</th>
                          <th style={thOS}>Mais caro</th>
                          <th style={thOS}>Ticket caro</th>
                          <th style={thOS}>Diferença</th>
                          <th style={thOS}>Economia se trocar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankingPorServico.length === 0 ? (
                          <tr><td colSpan={7} style={{ padding:"2rem", textAlign:"center", color:"var(--text-subtle)" }}>Sem serviço com 2+ fornecedores pra comparar.</td></tr>
                        ) : rankingPorServico.map(r => {
                          const diff = r.maisCaro.ticket - r.maisBarato.ticket;
                          const pctDiff = r.maisBarato.ticket > 0 ? (diff / r.maisBarato.ticket) * 100 : 0;
                          const economia = (r.maisCaro.ticket - r.maisBarato.ticket) * r.maisCaro.n;
                          return (
                            <tr key={r.servico} style={{ borderBottom:"1px solid var(--surface-2)" }}>
                              <td style={{ ...tdOS, fontWeight:600 }}>{r.servico}</td>
                              <td style={{ ...tdOS, color:"var(--success)", fontWeight:600 }}>
                                <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}><Award size={13} /> {r.maisBarato.fornecedor}</span>
                              </td>
                              <td style={tdOS}>{fmtBRL(r.maisBarato.ticket)}</td>
                              <td style={{ ...tdOS, color:"var(--danger)", fontWeight:600 }}>
                                <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}><TrendingUp size={13} /> {r.maisCaro.fornecedor}</span>
                              </td>
                              <td style={tdOS}>{fmtBRL(r.maisCaro.ticket)}</td>
                              <td style={tdOS}>
                                <span style={{ background:"var(--warning-bg)", color:"var(--warning)", fontSize:".78rem", fontWeight:700, padding:"3px 8px", borderRadius:999 }}>
                                  +{pctDiff.toFixed(0)}%
                                </span>
                              </td>
                              <td style={{ ...tdOS, fontWeight:700, color:"var(--success)" }}>{fmtBRL(economia)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </main>
      )}

      {/* ── ABA: REQUISIÇÕES de compra ─────────────────────────────── */}
      {aba === "requisicoes" && (
        <main style={s.main} className="pg-body">
          <AbaRequisicoes itensCatalogo={itensCatalogo} quemSou={quemSou} podeAprovar={isSuperAdmin || temPermissao?.("requisicoes.aprovar")} />
        </main>
      )}

      {/* ── ABA: INDICADORES — Preventiva x Corretiva + Disponibilidade ── */}
      {aba === "indicadores" && (
        <main style={s.main} className="pg-body">
          <AbaIndicadores veiculos={veiculos} ordensServico={ordensServico} lancamentos={lancamentos} />
        </main>
      )}

      {/* ── ABA: PREDITIVA — previsão baseada em histórico ─────────── */}
      {aba === "preditiva" && (
        <main style={s.main} className="pg-body">
          <AbaPreditiva veiculos={veiculos} ordensServico={ordensServico} odometroDe={odometroDe} />
        </main>
      )}

      {/* ── ABA: CPK — Custo Por KM rodado (últimos 12 meses) ────────── */}
      {aba === "cpk" && podeVerAba("nf") && (
        <main style={s.main} className="pg-body">
          {(() => {
            const AGORA = Date.now();
            const DOZE_MESES = 12 * 30 * 86400000;
            const CORTE = AGORA - DOZE_MESES;

            function parseData(x) {
              if (!x) return null;
              if (typeof x === "object" && typeof x.toMillis === "function") return x.toMillis();
              const ms = Date.parse(x);
              return Number.isFinite(ms) ? ms : null;
            }

            // Classifica um serviço como "pneu" quando texto contém "pneu"
            const ehPneu = (txt) => /pneu/i.test(String(txt || ""));

            // Agrega por placa E por categoria (total, pneu, manutencao, combustivel)
            const porPlaca = new Map();
            function bump(placa, valor, hodometro, data, categoria) {
              if (!placa) return;
              const p = String(placa).toUpperCase().trim();
              const ts = parseData(data);
              if (!ts || ts < CORTE) return;
              const cur = porPlaca.get(p) || {
                total: { gasto: 0, entradas: 0 },
                pneu: { gasto: 0, entradas: 0 },
                manutencao: { gasto: 0, entradas: 0 },
                combustivel: { gasto: 0, entradas: 0 },
                hodMin: Infinity, hodMax: 0,
              };
              const v = Number(valor) || 0;
              cur.total.gasto += v; cur.total.entradas += 1;
              cur[categoria].gasto += v; cur[categoria].entradas += 1;
              const km = Number(hodometro);
              if (Number.isFinite(km) && km > 0) {
                cur.hodMin = Math.min(cur.hodMin, km);
                cur.hodMax = Math.max(cur.hodMax, km);
              }
              porPlaca.set(p, cur);
            }

            ordensServico.forEach(os => {
              if (osStatus(os) !== "finalizada") return;
              const cat = ehPneu(os.tipoServico) ? "pneu" : "manutencao";
              bump(os.placa, os.valorTotal, os.hodometroSaida ?? os.hodometro, os.criadoEm || os.dataHora, cat);
            });
            (lancamentos || []).forEach(l => {
              const cat = ehPneu(l.tipoLancamento || l.tipoServico) ? "pneu" : "manutencao";
              bump(l.placa, l.valorTotal || l.valor, l.hodometro, l.data || l.criadoEm, cat);
            });
            (abastecimentos || []).forEach(a => {
              bump(a.placa, a.valor || a.valorTotal, a.hodometro, a.dataAbastecimento || a.data || a.criadoEm, "combustivel");
            });

            // Enriquecer com odômetro atual SASCAR — usa como hodMax se for maior
            // Pega gasto/entradas da sub-aba selecionada (total | pneu | manutencao | combustivel)
            const linhas = [];
            for (const [placa, d] of porPlaca) {
              const kmSascar = Number(odometroDe?.(placa)?.km) || null;
              const hodMax = Math.max(d.hodMax, kmSascar || 0);
              const kmRodado = d.hodMin !== Infinity && hodMax > d.hodMin ? hodMax - d.hodMin : 0;
              const subDados = d[subCpk] || d.total;
              const cpk = kmRodado > 0 ? subDados.gasto / kmRodado : null;
              linhas.push({
                placa,
                gasto: subDados.gasto,
                entradas: subDados.entradas,
                kmMin: d.hodMin === Infinity ? null : d.hodMin,
                kmMax: hodMax || null,
                kmRodado,
                cpk,
              });
            }
            // Filtra veículos que não têm gasto na categoria selecionada
            const linhasComGasto = linhas.filter(l => l.gasto > 0);
            linhasComGasto.sort((a, b) => (b.cpk ?? -1) - (a.cpk ?? -1));

            const totalGasto = linhasComGasto.reduce((s, x) => s + x.gasto, 0);
            const totalKm = linhasComGasto.reduce((s, x) => s + x.kmRodado, 0);
            const mediaGeralCpk = totalKm > 0 ? totalGasto / totalKm : 0;
            const comCpk = linhasComGasto.filter(l => l.cpk != null);
            const topCpk = comCpk[0]?.cpk || 0;
            const bottomCpk = comCpk[comCpk.length - 1]?.cpk || 0;

            const SUB_LABEL = { total: "Total geral", pneu: "Pneu", manutencao: "Manutenção", combustivel: "Combustível" };
            const SUB_COR = { total: "#1a3a5c", pneu: "#0f172a", manutencao: "#7c3aed", combustivel: "#0891b2" };

            return (
              <>
                {/* Sub-tabs — categoria do CPK */}
                <div style={{ display:"flex", gap:4, background:"var(--surface-2)", padding:4, borderRadius:10, marginBottom:16, alignSelf:"flex-start", flexWrap:"wrap" }}>
                  {["total","pneu","manutencao","combustivel"].map(k => (
                    <button
                      key={k}
                      onClick={() => setSubCpk(k)}
                      style={{
                        padding:"8px 16px", borderRadius:8, border:"none",
                        background: subCpk === k ? "var(--card-bg)" : "transparent",
                        color: subCpk === k ? SUB_COR[k] : "var(--text-muted)",
                        boxShadow: subCpk === k ? "0 1px 3px rgba(15,23,42,.1)" : "none",
                        fontWeight:700, fontSize:".84rem", cursor:"pointer", fontFamily:"inherit",
                      }}
                    >
                      {SUB_LABEL[k]}
                    </button>
                  ))}
                </div>

                {/* KPIs topo */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:16 }}>
                  <div style={{ background:"var(--card-bg)", borderRadius:12, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
                    <div style={{ fontSize:".72rem", color:"var(--text-muted)", fontWeight:600 }}>Média CPK {SUB_LABEL[subCpk].toLowerCase()}</div>
                    <div style={{ fontSize:"1.7rem", fontWeight:800, color: SUB_COR[subCpk] }}>{mediaGeralCpk > 0 ? fmtBRL(mediaGeralCpk) + "/km" : "—"}</div>
                  </div>
                  <div style={{ background:"var(--card-bg)", borderRadius:12, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
                    <div style={{ fontSize:".72rem", color:"var(--text-muted)", fontWeight:600 }}>Total gasto 12m</div>
                    <div style={{ fontSize:"1.7rem", fontWeight:800, color:"var(--text)" }}>{fmtBRL(totalGasto)}</div>
                  </div>
                  <div style={{ background:"var(--card-bg)", borderRadius:12, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
                    <div style={{ fontSize:".72rem", color:"var(--text-muted)", fontWeight:600 }}>Total km rodados</div>
                    <div style={{ fontSize:"1.7rem", fontWeight:800, color:"var(--text)" }}>{totalKm.toLocaleString("pt-BR")}</div>
                  </div>
                  <div style={{ background:"var(--card-bg)", borderRadius:12, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
                    <div style={{ fontSize:".72rem", color:"var(--text-muted)", fontWeight:600 }}>Mais caro / mais barato</div>
                    <div style={{ fontSize:"1rem", fontWeight:800, color:"var(--text)" }}>
                      <span style={{ color:"var(--danger)" }}>{fmtBRL(topCpk)}</span>
                      {" / "}
                      <span style={{ color:"var(--success)" }}>{fmtBRL(bottomCpk)}</span>
                    </div>
                    <div style={{ fontSize:".7rem", color:"var(--text-subtle)", marginTop:2 }}>Δ {topCpk && bottomCpk ? ((topCpk / bottomCpk - 1) * 100).toFixed(0) : 0}% de diferença</div>
                  </div>
                </div>

                <div style={{ background:"var(--card-bg)", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.06)", marginBottom:16 }}>
                  <div style={{ padding:"0.85rem 1rem", borderBottom:"1px solid var(--border)" }}>
                    <h2 style={{ margin:0, color:"var(--text)", fontSize:".98rem" }}>CPK {SUB_LABEL[subCpk]} — últimos 12 meses</h2>
                    <p style={{ margin:"4px 0 0 0", fontSize:".75rem", color:"var(--text-muted)" }}>
                      {subCpk === "pneu"        && "Gastos de OS/lançamentos com serviço contendo \"pneu\" no nome."}
                      {subCpk === "combustivel" && "Gastos vindos da coleção cta_abastecimentos (CTA Smart)."}
                      {subCpk === "manutencao"  && "OS e lançamentos que NÃO são de pneu. Cobre óleo, freio, revisão, embreagem, etc."}
                      {subCpk === "total"       && "Soma de TUDO: manutenção + pneu + combustível."}
                      {" "}Cruza com KM rodado (min-max hodômetros + SASCAR atual). Ordenado do mais caro pro mais barato.
                    </p>
                  </div>
                  <div style={{ overflowX:"auto" }} className="table-wrap">
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".88rem" }}>
                      <thead>
                        <tr style={{ background:"var(--surface-2)", borderBottom:"1px solid var(--border)" }}>
                          <th style={thOS}>#</th>
                          <th style={thOS}>Placa</th>
                          <th style={thOS}>Gastos 12m</th>
                          <th style={thOS}>KM inicial</th>
                          <th style={thOS}>KM final</th>
                          <th style={thOS}>KM rodado</th>
                          <th style={thOS}>Entradas</th>
                          <th style={thOS}>CPK</th>
                          <th style={thOS}>vs média</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhasComGasto.length === 0 ? (
                          <tr><td colSpan={9} style={{ padding:"2rem", textAlign:"center", color:"var(--text-subtle)" }}>Sem dados de {SUB_LABEL[subCpk].toLowerCase()} nos últimos 12 meses.</td></tr>
                        ) : linhasComGasto.map((l, i) => {
                          const delta = mediaGeralCpk > 0 && l.cpk != null ? ((l.cpk - mediaGeralCpk) / mediaGeralCpk) * 100 : null;
                          const critico = delta != null && delta > 20;
                          const bom = delta != null && delta < -20;
                          return (
                            <tr key={l.placa} style={{ borderBottom:"1px solid var(--surface-2)" }}>
                              <td style={tdOS}>{i+1}</td>
                              <td style={{ ...tdOS, fontWeight:700 }}>{l.placa}</td>
                              <td style={{ ...tdOS, fontWeight:600 }}>{fmtBRL(l.gasto)}</td>
                              <td style={tdOS}>{l.kmMin?.toLocaleString("pt-BR") ?? "—"}</td>
                              <td style={tdOS}>{l.kmMax?.toLocaleString("pt-BR") ?? "—"}</td>
                              <td style={tdOS}>{l.kmRodado > 0 ? l.kmRodado.toLocaleString("pt-BR") : "—"}</td>
                              <td style={tdOS}>{l.entradas}</td>
                              <td style={{ ...tdOS, fontWeight:700, color: critico ? "var(--danger)" : bom ? "var(--success)" : "var(--text)" }}>
                                {l.cpk != null ? fmtBRL(l.cpk) + "/km" : <span style={{ color:"var(--text-subtle)" }}>sem KM</span>}
                              </td>
                              <td style={tdOS}>
                                {delta == null ? "—" : (
                                  <span style={{ background: critico ? "var(--danger-bg)" : bom ? "var(--success-bg)" : "var(--surface-2)", color: critico ? "var(--danger)" : bom ? "var(--success)" : "var(--text-muted)", fontSize:".78rem", fontWeight:700, padding:"3px 8px", borderRadius:999 }}>
                                    {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ background:"#fef9c3", border:"1px solid var(--warning-border)", borderRadius:8, padding:"12px 16px", fontSize:".82rem", color:"#78350f", display:"flex", alignItems:"flex-start", gap:10 }}>
                  <Lightbulb size={18} style={{ flexShrink:0, marginTop:2 }} />
                  <div>
                    <strong>Como interpretar:</strong> se um veículo aparece com "sem KM" é porque não tem hodômetro registrado em nenhuma entrada de custo (adicione KM nas OS/lançamentos). A qualidade do CPK melhora quando você registra o hodômetro em cada OS ou usa import de NF-e (que já vem com hodômetro se tiver na nota).
                  </div>
                </div>
              </>
            );
          })()}
        </main>
      )}

      {/* ── ABA: ORDENS DE SERVIÇO ────────────────────────────────────── */}
      {aba === "os" && podeVerAba("os_abertura") && (
        <main style={s.main} className="pg-body">
          {/* Alerta de garantia — se placa+tipoServico teve OS finalizada há < garantiaDias */}
          {(() => {
            if (!formOS.placa || !formOS.tipoServico) return null;
            const hoje = Date.now();
            const anteriores = ordensServico.filter(o =>
              o.status === "finalizada" &&
              o.placa === formOS.placa &&
              o.tipoServico === formOS.tipoServico
            ).map(o => {
              const finMs = o.finalizadaEm ? Date.parse(o.finalizadaEm) : null;
              const garantia = Number(o.garantiaDias) || 90;
              const diasDesde = finMs ? Math.floor((hoje - finMs) / 86400000) : null;
              const emGarantia = diasDesde != null && diasDesde <= garantia;
              return { os: o, diasDesde, garantia, emGarantia };
            }).filter(x => x.emGarantia).sort((a, b) => a.diasDesde - b.diasDesde);
            if (anteriores.length === 0) return null;
            const primeiro = anteriores[0];
            return (
              <div style={{ background: "var(--danger-bg)", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 12 }}>
                <AlertCircle size={20} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#991b1b", fontSize: ".9rem" }}>
                    Serviço ainda em garantia — cobre do fornecedor antes de gerar nova OS
                  </div>
                  <div style={{ fontSize: ".82rem", color: "#7f1d1d", marginTop: 4 }}>
                    OS <strong>{primeiro.os.numero}</strong> ({primeiro.os.tipoServico}) foi finalizada há <strong>{primeiro.diasDesde} dia(s)</strong> —
                    garantia de {primeiro.garantia} dias{primeiro.os.fornecedor ? <> · fornecedor: <strong>{primeiro.os.fornecedor}</strong></> : null}.
                  </div>
                </div>
              </div>
            );
          })()}
          {/* Formulário de nova OS */}
          <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 0.75rem 0", color: "var(--text)", fontSize: "1.05rem" }}>Abrir ordem de serviço <span style={{ fontWeight:400, fontSize:".8rem", color:"var(--text-muted)" }}>— bloqueia o veículo</span></h2>
            <form onSubmit={salvarOS} className="grid-form-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              <label style={s.fieldLabel}>
                Tipo de serviço
                <select
                  style={s.fieldInput}
                  value={formOS.tipoServico}
                  onChange={e => setFormOS({ ...formOS, tipoServico: e.target.value })}
                  required
                >
                  <option value="">— Selecione —</option>
                  {/* OS é do veículo — grupo "Motorista" (NR-20, NR-35, CNH etc.) fica fora */}
                  {Array.from(new Set(
                    TIPOS_TODOS.filter(t => t.grupo !== "Motorista").map(t => t.grupo || "Outros")
                  )).sort().map(grupo => (
                    <optgroup key={grupo} label={grupo}>
                      {TIPOS_TODOS.filter(t => (t.grupo || "Outros") === grupo).map(t => (
                        <option key={t.id} value={t.label}>{t.label}</option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="Rápidos (sem cadastro)">
                    <option value="Reparo geral">Reparo geral</option>
                    <option value="Limpeza">Limpeza</option>
                    <option value="Borracharia">Borracharia</option>
                    <option value="Lanternagem / Pintura">Lanternagem / Pintura</option>
                    <option value="Outro">Outro</option>
                  </optgroup>
                </select>
              </label>

              <label style={s.fieldLabel}>
                Placa
                <select
                  style={s.fieldInput}
                  value={formOS.placa}
                  onChange={e => setFormOS({ ...formOS, placa: e.target.value.toUpperCase() })}
                  required
                >
                  <option value="">— Selecione o veículo —</option>
                  <optgroup label="Cavalos">
                    {veiculos.filter(v => v.tipo !== "carreta").map(v => (
                      <option key={v.id} value={v.placa}>
                        {v.placa}{v.bloqueio?.ativo ? " 🔒 já bloqueado" : ""}{v.modelo ? ` — ${v.modelo}` : ""}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Carretas">
                    {veiculos.filter(v => v.tipo === "carreta").map(v => (
                      <option key={v.id} value={v.placa}>
                        {v.placa}{v.bloqueio?.ativo ? " 🔒 já bloqueado" : ""}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>

              <label style={s.fieldLabel}>
                Motorista
                <select
                  style={s.fieldInput}
                  value={formOS.motoristaId}
                  onChange={e => setFormOS({ ...formOS, motoristaId: e.target.value })}
                  required
                >
                  <option value="">— Selecione —</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </label>

              <div style={s.fieldLabel}>
                Fornecedor / Oficina
                <SearchSelect
                  value={formOS.fornecedor}
                  onChange={val => setFormOS({ ...formOS, fornecedor: val, fornecedorCnpj: cnpjDoFornecedor(val) })}
                  options={opcoesCatalogo(itensCatalogo, "fornecedor")}
                  onAdd={nome => garantirItemCatalogo("fornecedor", nome, { cnpj: formOS.fornecedorCnpj })}
                  placeholder="Buscar ou cadastrar fornecedor"
                />
              </div>

              <label style={s.fieldLabel}>
                CNPJ do fornecedor
                <input
                  type="text"
                  style={s.fieldInput}
                  value={formOS.fornecedorCnpj}
                  onChange={e => setFormOS({ ...formOS, fornecedorCnpj: e.target.value })}
                  placeholder="Ex: 12.345.678/0001-90"
                />
              </label>

              <label style={s.fieldLabel}>
                Hodômetro (km)
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="number" min="0" step="1" inputMode="numeric"
                    style={{ ...s.fieldInput, flex: 1 }}
                    value={formOS.hodometro}
                    onChange={e => setFormOS({ ...formOS, hodometro: e.target.value.replace(/\D/g, "") })}
                    placeholder={
                      formOS.placa
                        ? (sascarLoading ? "Buscando SASCAR..." : (() => {
                            const r = resolverKmSascar(formOS.placa);
                            return r ? `SASCAR: ${r.km.toLocaleString("pt-BR")}${r.fonte.startsWith("via") ? ` (${r.fonte})` : ""}` : "Ex: 350000";
                          })())
                        : "Selecione a placa"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => puxarOdometroSascar("os")}
                    disabled={!formOS.placa || sascarLoading}
                    title="Puxar hodômetro atual da SASCAR"
                    style={{ padding: "0 12px", borderRadius: 8, border: "1px solid var(--border-strong)", background: formOS.placa && !sascarLoading ? "#ea580c" : "var(--surface-2)", color: formOS.placa && !sascarLoading ? "#fff" : "var(--text-subtle)", fontWeight: 700, fontSize: ".78rem", cursor: formOS.placa && !sascarLoading ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap" }}
                  >
                    {sascarLoading ? "..." : "🛰 SASCAR"}
                  </button>
                </div>
                {(() => {
                  const r = formOS.placa ? resolverKmSascar(formOS.placa) : null;
                  if (!r?.dados) return null;
                  return (
                    <div style={{ fontSize: ".7rem", color: "var(--text-muted)", marginTop: 3 }}>
                      {r.fonte.startsWith("via") && <strong style={{ color: "#ea580c" }}>Carreta — km puxado {r.fonte} · </strong>}
                      Última posição: {r.dados.cidade || "—"}/{r.dados.uf || "--"} · {r.dados.dataPosicao ? new Date(r.dados.dataPosicao).toLocaleString("pt-BR") : "—"}
                    </div>
                  );
                })()}
              </label>

              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 4 }}>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                  Data/hora: <strong style={{ color: "var(--text)" }}>preenchida automaticamente ao salvar</strong>
                </div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                  Próximo número: <strong style={{ color: "var(--text)" }}>{proximoNumeroOS()}</strong>
                </div>
              </div>

              <label style={{ ...s.fieldLabel, gridColumn: "1 / -1" }}>
                Observações / motivo da entrada
                <textarea
                  style={{ ...s.fieldInput, resize: "vertical", minHeight: 80 }}
                  value={formOS.obs}
                  onChange={e => setFormOS({ ...formOS, obs: e.target.value })}
                  placeholder="Motivo da entrada em manutenção, observações..."
                />
              </label>

              <p style={{ gridColumn:"1 / -1", margin:0, fontSize:".75rem", color:"var(--warning)", background:"var(--warning-bg)", border:"1px solid #fcd34d", borderRadius:8, padding:"8px 10px", lineHeight:1.5 }}>
                🔒 Ao abrir a OS, o veículo é <strong>bloqueado automaticamente</strong> no sistema (não gera OC) e só é liberado quando a OS for <strong>finalizada</strong>. Depois de aberta, a OS só pode ser editada por <strong>24h</strong>.
              </p>

              {erroOS && <p style={{ ...s.erroMsg, gridColumn: "1 / -1" }}>{erroOS}</p>}

              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={() => { setFormOS({ ...EMPTY_OS }); setErroOS(""); }}
                >
                  Limpar
                </button>
                <button type="submit" style={s.saveBtn} disabled={salvandoOS}>
                  {salvandoOS ? "Salvando..." : "Salvar OS"}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de OSs */}
          <div style={{ background: "var(--card-bg)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, color: "var(--text)", fontSize: ".98rem" }}>Histórico de OS ({ordensServico.length})</h3>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                    <th style={thOS}>OS</th>
                    <th style={thOS}>Data / hora</th>
                    <th style={thOS}>Tipo</th>
                    <th style={thOS}>Placa</th>
                    <th style={thOS}>Motorista</th>
                    <th style={thOS}>Status</th>
                    <th style={thOS}>Observações</th>
                    <th style={thOS}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ordensServico.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-subtle)" }}>Nenhuma OS criada ainda</td></tr>
                  ) : ordensServico.map(os => {
                    const st        = osStatus(os);
                    const finalizada = st === "finalizada";
                    const editavel  = osEditavel(os);
                    const limite    = osLimiteEdicao(os);
                    return (
                    <tr key={os.id} style={{ borderBottom: "1px solid var(--surface-2)", background: finalizada ? "var(--surface-2)" : "var(--card-bg)" }}>
                      <td style={tdOS}><strong style={{ color: "var(--text)" }}>{os.numero}</strong></td>
                      <td style={tdOS}>
                        {fmtDateTimeBR(os.dataHora)}
                        {os.criadoPor && <div style={{ fontSize:".68rem", color:"var(--text-subtle)", marginTop:3 }}>por {os.criadoPor}</div>}
                      </td>
                      <td style={tdOS}>{os.tipoServico}</td>
                      <td style={tdOS}><strong>{os.placa}</strong></td>
                      <td style={tdOS}>{os.motoristaNome}</td>
                      <td style={tdOS}>
                        {finalizada ? (
                          <span style={{ ...s.osBadge, background:"var(--success-bg)", color:"var(--success)" }}>✓ Finalizada</span>
                        ) : (
                          <span style={{ ...s.osBadge, background:"#fef9c3", color:"#a16207" }}>🔧 Aberta</span>
                        )}
                        {finalizada && os.finalizadaEm && (
                          <div style={{ fontSize:".68rem", color:"var(--text-subtle)", marginTop:3 }}>{fmtDateTimeBR(os.finalizadaEm)}</div>
                        )}
                        {!finalizada && limite && (
                          <div style={{ fontSize:".68rem", color: editavel ? "var(--text-muted)" : "var(--danger)", marginTop:3 }}>
                            {editavel ? `edição até ${fmtDateTimeBR(limite)}` : "edição encerrada (24h)"}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdOS, maxWidth: 360, whiteSpace: "normal", color: "var(--text-muted)" }}>{os.obs || "—"}</td>
                      <td style={tdOS}>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          <button
                            onClick={() => visualizarPdfOS(os)}
                            style={{ background:"var(--surface-2)", border:"none", color:"var(--text-subtle)", cursor:"pointer", fontSize:".75rem", fontWeight:700, padding:"4px 10px", borderRadius:5, display:"inline-flex", alignItems:"center", gap:4 }}
                            title="Visualizar em nova aba"
                          >
                            <Eye size={12} /> Ver
                          </button>
                          <button
                            onClick={() => gerarPdfOS(os)}
                            style={{ background:"#dbeafe", border:"none", color:"#1d4ed8", cursor:"pointer", fontSize:".75rem", fontWeight:700, padding:"4px 10px", borderRadius:5, display:"inline-flex", alignItems:"center", gap:4 }}
                            title="Baixar PDF"
                          >
                            <FileDown size={12} /> PDF
                          </button>
                          {editavel && (
                            <button
                              onClick={() => abrirEditOS(os)}
                              style={{ background:"var(--success-bg)", border:"none", color:"var(--success)", cursor:"pointer", fontSize:".75rem", fontWeight:700, padding:"4px 10px", borderRadius:5 }}
                            >
                              Editar
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => excluirOS(os)}
                              style={{ background:"transparent", border:"none", color:"var(--danger)", cursor:"pointer", fontSize:".75rem", fontWeight:600, padding:"4px 6px" }}
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* ── ABA: LANÇAMENTO DE OS (conclusão — registra KM saída, mecânico, oficina, serviço executado) ── */}
      {aba === "os_lanc" && podeVerAba("os_lancamento") && (
        <main style={s.main} className="pg-body">
          {(() => {
            // Aging OS — computa uma vez, reutiliza pra contador e ordenação
            const abertas = ordensServico.filter(o => osStatus(o) !== "finalizada");
            const comAging = abertas
              .map(os => ({ os, aging: osAging(os) }))
              .sort((a, b) => (b.aging.dias ?? -1) - (a.aging.dias ?? -1)); // mais antigas primeiro
            const criticas = comAging.filter(x => x.aging.urgencia === "critico").length;
            const atencao  = comAging.filter(x => x.aging.urgencia === "atencao").length;
            return (
              <div style={{ background: "var(--card-bg)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)" }}>
                  <h2 style={{ margin: 0, color: "var(--text)", fontSize: ".98rem", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    OSs abertas — registrar conclusão ({abertas.length})
                    {criticas > 0 && (
                      <span title={`${criticas} OS aberta(s) há 14 dias ou mais — investigar`} style={{ background:"var(--danger-bg)", color:"var(--danger)", fontSize:".72rem", fontWeight:700, padding:"3px 8px", borderRadius:999, display:"inline-flex", alignItems:"center", gap:5 }}>
                        <AlertCircle size={12} />
                        {criticas} crítica{criticas > 1 ? "s" : ""} (≥14d)
                      </span>
                    )}
                    {atencao > 0 && (
                      <span title={`${atencao} OS aberta(s) entre 7 e 13 dias`} style={{ background:"var(--warning-bg)", color:"var(--warning)", fontSize:".72rem", fontWeight:700, padding:"3px 8px", borderRadius:999, display:"inline-flex", alignItems:"center", gap:5 }}>
                        <AlertTriangle size={12} />
                        {atencao} em atenção (7-13d)
                      </span>
                    )}
                  </h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: ".75rem", color: "var(--text-muted)" }}>
                    Concluir a OS registra KM de saída, mecânico, oficina e serviço executado, e libera o veículo. <strong>Ordenado por mais tempo aberta.</strong>
                  </p>
                </div>
                <div style={{ overflowX: "auto" }} className="table-wrap">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
                    <thead>
                      <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                        <th style={thOS}>OS</th>
                        <th style={thOS}>Aberta há</th>
                        <th style={thOS}>Abertura</th>
                        <th style={thOS}>Placa</th>
                        <th style={thOS}>Tipo</th>
                        <th style={thOS}>Motorista</th>
                        <th style={thOS}>KM entrada</th>
                        <th style={thOS}>Fornecedor</th>
                        <th style={thOS}>Total R$</th>
                        <th style={thOS}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abertas.length === 0 ? (
                        <tr><td colSpan={10} style={{ padding: "2rem", textAlign: "center", color: "var(--text-subtle)" }}>
                          Nenhuma OS aberta — todas finalizadas
                        </td></tr>
                      ) : comAging.map(({ os, aging }) => (
                        <tr key={os.id} style={{ borderBottom: "1px solid var(--surface-2)" }}>
                          <td style={tdOS}><strong style={{ color: "var(--text)" }}>{os.numero}</strong></td>
                          <td style={tdOS}>
                            <span
                              title={aging.dias != null ? `${aging.dias} dia(s) desde a abertura` : "Sem data de abertura"}
                              style={{ background: aging.bg, color: aging.cor, fontWeight: 700, fontSize: ".78rem", padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}
                            >
                              <Circle size={8} fill={aging.cor} stroke="none" />
                              {aging.texto}
                            </span>
                          </td>
                          <td style={tdOS}>{fmtDateTimeBR(os.dataHora)}</td>
                          <td style={tdOS}><strong>{os.placa}</strong></td>
                          <td style={tdOS}>{os.tipoServico}</td>
                          <td style={tdOS}>{os.motoristaNome}</td>
                          <td style={tdOS}>{os.hodometro != null ? os.hodometro : "—"}</td>
                          <td style={tdOS}>{os.fornecedor || <span style={{color:"var(--text-subtle)"}}>—</span>}</td>
                          <td style={{ ...tdOS, fontWeight: 700, color: os.valorTotal > 0 ? "var(--text)" : "var(--text-subtle)" }}>
                            {os.valorTotal > 0 ? fmtBRL(os.valorTotal) : "—"}
                          </td>
                          <td style={tdOS}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button
                                onClick={() => setFotosOsModal(os)}
                                title={`${(os.fotos?.length || 0)} foto(s)`}
                                style={{ background: (os.fotos?.length || 0) > 0 ? "#dbeafe" : "var(--surface-2)", border:"none", color:(os.fotos?.length || 0) > 0 ? "#1d4ed8" : "var(--text-muted)", cursor:"pointer", fontSize:".78rem", fontWeight:700, padding:"5px 10px", borderRadius:5, display:"inline-flex", alignItems:"center", gap:5 }}
                              >
                                <Camera size={13} />
                                {os.fotos?.length || 0}
                              </button>
                              <button
                                onClick={() => abrirConclusaoOS(os)}
                                style={{ background:"var(--success-bg)", border:"none", color:"var(--success)", cursor:"pointer", fontSize:".78rem", fontWeight:700, padding:"5px 14px", borderRadius:5 }}
                              >
                                Concluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </main>
      )}

      {/* ── ABA: LANÇAMENTO DE NF (registro de nota fiscal/custo) ─────────── */}
      {aba === "lancamento" && podeVerAba("nf") && (
        <main style={s.main} className="pg-body">
          {/* Dashboard de custos (visão diretoria) */}
          <DashboardCustos lancamentos={lancamentos} fmtBRLfn={fmtBRL} />

          {/* Formulário de novo lançamento */}
          <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 0.25rem 0", color: "var(--text)", fontSize: "1.05rem" }}>Lançamento de NF</h2>
            <p style={{ margin: "0 0 0.75rem 0", fontSize: ".78rem", color: "var(--text-muted)" }}>Registro de serviço e custo. <strong>Não bloqueia o veículo.</strong></p>
            <form onSubmit={salvarLanc}>
              {/* Cabeçalho */}
              <div className="grid-form-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                <label style={{ ...s.fieldLabel, gridColumn: "1 / -1" }}>
                  OS relacionada <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: ".72rem" }}>(opcional — se selecionar, preenche placa/fornecedor/hodômetro)</span>
                  <select
                    style={s.fieldInput}
                    value={formLanc.osId}
                    onChange={e => {
                      const osId = e.target.value;
                      if (!osId) {
                        setFormLanc({ ...formLanc, osId: "", osNumero: "" });
                        return;
                      }
                      const os = ordensServico.find(o => o.id === osId);
                      if (!os) return;
                      setFormLanc({
                        ...formLanc,
                        osId:       os.id,
                        osNumero:   os.numero || "",
                        placa:      os.placa || formLanc.placa,
                        fornecedor: os.fornecedor || formLanc.fornecedor,
                        hodometro:  formLanc.hodometro || (os.hodometroSaida != null ? String(os.hodometroSaida) : (os.hodometro != null ? String(os.hodometro) : "")),
                      });
                    }}
                  >
                    <option value="">— Nenhuma OS vinculada —</option>
                    {[...ordensServico]
                      .sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""))
                      .map(o => (
                        <option key={o.id} value={o.id}>
                          {o.numero || "S/Nº"} · {o.placa || "—"} · {osStatus(o) === "finalizada" ? "Finalizada" : "Aberta"}{o.fornecedor ? ` · ${o.fornecedor}` : ""}
                        </option>
                      ))}
                  </select>
                </label>

                <div style={s.fieldLabel}>
                  Tipo de lançamento
                  <SearchSelect
                    value={formLanc.tipoLancamento}
                    onChange={val => setFormLanc({ ...formLanc, tipoLancamento: val })}
                    options={opcoesCatalogo(itensCatalogo, "tipo_lancamento", TIPO_LANCAMENTO_SUGEST)}
                    onAdd={nome => garantirItemCatalogo("tipo_lancamento", nome)}
                    placeholder="Buscar ou cadastrar (Elétrico, Motor, Inspeção...)"
                  />
                </div>

                <label style={s.fieldLabel}>
                  Placa
                  <select
                    style={s.fieldInput}
                    value={formLanc.placa}
                    onChange={e => setFormLanc({ ...formLanc, placa: e.target.value.toUpperCase() })}
                  >
                    <option value="">— Selecione o veículo —</option>
                    <optgroup label="Cavalos">
                      {veiculos.filter(v => v.tipo !== "carreta").map(v => (
                        <option key={v.id} value={v.placa}>{v.placa}{v.modelo ? ` — ${v.modelo}` : ""}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Carretas">
                      {veiculos.filter(v => v.tipo === "carreta").map(v => (
                        <option key={v.id} value={v.placa}>{v.placa}</option>
                      ))}
                    </optgroup>
                  </select>
                </label>

                <div style={s.fieldLabel}>
                  Fornecedor da OS
                  <SearchSelect
                    value={formLanc.fornecedor}
                    onChange={val => setFormLanc({ ...formLanc, fornecedor: val })}
                    options={opcoesCatalogo(itensCatalogo, "fornecedor")}
                    onAdd={nome => garantirItemCatalogo("fornecedor", nome)}
                    placeholder="Buscar ou cadastrar fornecedor"
                  />
                </div>

                <label style={s.fieldLabel}>
                  Hodômetro (km)
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="number" min="0" step="1" inputMode="numeric"
                      style={{ ...s.fieldInput, flex: 1 }}
                      value={formLanc.hodometro}
                      onChange={e => setFormLanc({ ...formLanc, hodometro: e.target.value.replace(/\D/g, "") })}
                      placeholder={
                        formLanc.placa
                          ? (sascarLoading ? "Buscando SASCAR..." : (() => {
                              const r = resolverKmSascar(formLanc.placa);
                              return r ? `SASCAR: ${r.km.toLocaleString("pt-BR")}${r.fonte.startsWith("via") ? ` (${r.fonte})` : ""}` : "Ex: 350000";
                            })())
                          : "Selecione a placa"
                      }
                    />
                    <button
                      type="button"
                      onClick={() => puxarOdometroSascar("lanc")}
                      disabled={!formLanc.placa || sascarLoading}
                      title="Puxar hodômetro atual da SASCAR"
                      style={{ padding: "0 12px", borderRadius: 8, border: "1px solid var(--border-strong)", background: formLanc.placa && !sascarLoading ? "#ea580c" : "var(--surface-2)", color: formLanc.placa && !sascarLoading ? "#fff" : "var(--text-subtle)", fontWeight: 700, fontSize: ".78rem", cursor: formLanc.placa && !sascarLoading ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap" }}
                    >
                      {sascarLoading ? "..." : "🛰 SASCAR"}
                    </button>
                  </div>
                  {(() => {
                    const r = formLanc.placa ? resolverKmSascar(formLanc.placa) : null;
                    if (!r?.dados) return null;
                    return (
                      <div style={{ fontSize: ".7rem", color: "var(--text-muted)", marginTop: 3 }}>
                        {r.fonte.startsWith("via") && <strong style={{ color: "#ea580c" }}>Carreta — km puxado {r.fonte} · </strong>}
                        Última posição: {r.dados.cidade || "—"}/{r.dados.uf || "--"} · {r.dados.dataPosicao ? new Date(r.dados.dataPosicao).toLocaleString("pt-BR") : "—"}
                      </div>
                    );
                  })()}
                </label>
              </div>

              {/* Itens (serviços/peças) */}
              <div style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 700, color: "var(--text)", fontSize: ".9rem", marginBottom: 8 }}>Serviços / Peças deste lançamento</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <label style={{ ...s.fieldLabel, minWidth: 120 }}>
                    Tipo
                    <select style={s.fieldInput} value={itemDraft.tipoItem} onChange={e => setItemDraft({ ...itemDraft, tipoItem: e.target.value, item: "" })}>
                      <option value="">—</option>
                      <option value="servico">Serviço</option>
                      <option value="peca">Peça</option>
                    </select>
                  </label>
                  <label style={{ ...s.fieldLabel, flex: 1, minWidth: 160 }}>
                    {itemDraft.tipoItem === "peca" ? "Peça" : "Serviço"}
                    <input
                      type="text" list="cat-item-novo" style={s.fieldInput}
                      value={itemDraft.item}
                      onChange={e => setItemDraft({ ...itemDraft, item: e.target.value })}
                      placeholder={itemDraft.tipoItem ? "Selecione ou digite" : "Escolha o tipo"}
                      disabled={!itemDraft.tipoItem}
                      autoComplete="off"
                    />
                    <datalist id="cat-item-novo">
                      {itensCatalogo.filter(i => i.tipo === itemDraft.tipoItem).map(i => <option key={i.id} value={i.nome} />)}
                    </datalist>
                  </label>
                  <label style={{ ...s.fieldLabel, width: 80 }}>
                    Qtd
                    <input type="number" min="0" step="1" inputMode="numeric" style={s.fieldInput} value={itemDraft.quantidade} onChange={e => setItemDraft({ ...itemDraft, quantidade: e.target.value.replace(/\D/g, "") })} placeholder="1" />
                  </label>
                  <label style={{ ...s.fieldLabel, width: 120 }}>
                    Valor unit. (R$)
                    <input type="text" inputMode="decimal" style={s.fieldInput} value={itemDraft.valorUnitario} onChange={e => setItemDraft({ ...itemDraft, valorUnitario: maskMoeda(e.target.value) })} placeholder="0,00" />
                  </label>
                  <button type="button" onClick={addItemLanc} style={{ ...s.saveBtn, whiteSpace: "nowrap" }}>+ Item</button>
                </div>

                {lancItens.length > 0 && (
                  <div style={{ marginTop: 10, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem" }}>
                      <thead>
                        <tr style={{ background: "var(--surface-2)" }}>
                          <th style={thOS}>Tipo</th><th style={thOS}>Item</th><th style={thOS}>Qtd</th><th style={thOS}>Unit.</th><th style={thOS}>Total</th><th style={thOS}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lancItens.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--surface-2)" }}>
                            <td style={tdOS}><span style={{ ...s.osBadge, background: it.tipoItem === "peca" ? "var(--warning-bg)" : "#dbeafe", color: it.tipoItem === "peca" ? "#92400e" : "#1d4ed8" }}>{it.tipoItem === "peca" ? "Peça" : "Serviço"}</span></td>
                            <td style={tdOS}>{it.item}</td>
                            <td style={tdOS}>{it.quantidade}</td>
                            <td style={tdOS}>{fmtBRL(it.valorUnitario)}</td>
                            <td style={tdOS}><strong>{fmtBRL(it.valorTotal)}</strong></td>
                            <td style={tdOS}><button type="button" onClick={() => removerItemLanc(idx)} title="Remover" style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", fontWeight: 700, fontSize: ".9rem" }}>✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Total + meta */}
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                  Data/hora automática · Lançado por <strong style={{ color: "var(--text)" }}>{quemSou()}</strong> · Nº <strong style={{ color: "var(--text)" }}>{proximoNumeroLanc()}</strong>
                </div>
                <div style={{ fontSize: ".95rem", color: "var(--text)", fontWeight: 700, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px" }}>
                  Total do lançamento: <span style={{ fontSize: "1.1rem" }}>{fmtBRL(lancItens.reduce((sum, it) => sum + (Number(it.valorTotal) || 0), 0))}</span>
                </div>
              </div>

              <label style={{ ...s.fieldLabel, marginTop: 12 }}>
                Serviço feito / descrição
                <textarea
                  style={{ ...s.fieldInput, resize: "vertical", minHeight: 70 }}
                  value={formLanc.servicoFeito}
                  onChange={e => setFormLanc({ ...formLanc, servicoFeito: e.target.value })}
                  placeholder="Observações gerais do lançamento..."
                />
              </label>

              {erroLanc && <p style={{ ...s.erroMsg, marginTop: 8 }}>{erroLanc}</p>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button type="button" style={s.cancelBtn} onClick={() => { setFormLanc({ ...EMPTY_LANC }); setLancItens([]); setItemDraft({ ...EMPTY_ITEM }); setErroLanc(""); }}>
                  Limpar
                </button>
                <button type="submit" style={s.saveBtn} disabled={salvandoLanc}>
                  {salvandoLanc ? "Salvando..." : "Salvar lançamento"}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de lançamentos */}
          <div style={{ background: "var(--card-bg)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ margin: 0, color: "var(--text)", fontSize: ".98rem" }}>Histórico de lançamentos ({lancamentos.length})</h3>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                    <th style={thOS}>Nº</th>
                    <th style={thOS}>Data / hora</th>
                    <th style={thOS}>OS</th>
                    <th style={thOS}>Lançamento</th>
                    <th style={thOS}>Item</th>
                    <th style={thOS}>Placa</th>
                    <th style={thOS}>Fornecedor</th>
                    <th style={thOS}>Custo</th>
                    <th style={thOS}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "var(--text-subtle)" }}>Nenhum lançamento ainda</td></tr>
                  ) : lancamentos.map(l => (
                    <tr key={l.id} style={{ borderBottom: "1px solid var(--surface-2)" }}>
                      <td style={tdOS}><strong style={{ color: "var(--text)" }}>{l.numero}</strong></td>
                      <td style={tdOS}>
                        {fmtDateTimeBR(l.dataHora)}
                        {l.criadoPor && <div style={{ fontSize:".68rem", color:"var(--text-subtle)", marginTop:3 }}>por {l.criadoPor}</div>}
                      </td>
                      <td style={tdOS}>
                        {l.osNumero || l.osId ? (
                          <span style={{ ...s.osBadge, background:"var(--success-bg)", color:"#166534" }}>
                            {l.osNumero || "OS vinculada"}
                          </span>
                        ) : (
                          <span style={{ color:"var(--text-subtle)", fontSize:".72rem" }}>—</span>
                        )}
                      </td>
                      <td style={tdOS}>
                        {l.tipoLancamento && <span style={{ ...s.osBadge, background:"var(--info-bg)", color:"var(--info)" }}>{l.tipoLancamento}</span>}
                      </td>
                      <td style={{ ...tdOS, maxWidth: 340, whiteSpace: "normal" }}>
                        {Array.isArray(l.itens) && l.itens.length ? (
                          l.itens.map((it, i) => (
                            <div key={i} style={{ marginBottom: 3 }}>
                              <span style={{ ...s.osBadge, marginRight: 5, background: it.tipoItem === "peca" ? "var(--warning-bg)" : "#dbeafe", color: it.tipoItem === "peca" ? "#92400e" : "#1d4ed8" }}>{it.tipoItem === "peca" ? "Peça" : "Serviço"}</span>
                              <strong style={{ color: "var(--text-subtle)" }}>{it.item}</strong>
                              <span style={{ color: "var(--text-subtle)", fontSize: ".74rem" }}> &nbsp;{numOS(it.quantidade)}× {fmtBRL(it.valorUnitario)}</span>
                            </div>
                          ))
                        ) : (
                          <strong style={{ color: "var(--text-subtle)" }}>{l.item || "—"}</strong>
                        )}
                        {l.servicoFeito && <div style={{ fontSize: ".74rem", color: "var(--text-muted)", marginTop: 2 }}>{l.servicoFeito}</div>}
                      </td>
                      <td style={tdOS}>
                        <strong>{l.placa}</strong>
                        {l.hodometro ? <div style={{ fontSize: ".68rem", color: "var(--text-subtle)", marginTop: 2 }}>{Number(l.hodometro).toLocaleString("pt-BR")} km</div> : null}
                      </td>
                      <td style={tdOS}>{l.fornecedor || "—"}</td>
                      <td style={tdOS}>
                        <strong style={{ color: "var(--text)" }}>{fmtBRL(l.valorTotal != null ? l.valorTotal : somaItens(l))}</strong>
                        {Array.isArray(l.itens) && l.itens.length > 0 && (
                          <div style={{ fontSize: ".68rem", color: "var(--text-subtle)", marginTop: 2 }}>{l.itens.length} {l.itens.length === 1 ? "item" : "itens"}</div>
                        )}
                        {Array.isArray(l.anexos) && l.anexos.length > 0 && (
                          <div title={`${l.anexos.length} anexo(s)`} style={{ display:"inline-flex", alignItems:"center", gap:3, marginTop:4, fontSize:".68rem", fontWeight:700, color:"var(--info)", background:"var(--info-bg)", padding:"2px 7px", borderRadius:10 }}>
                            📎 {l.anexos.length}
                          </div>
                        )}
                      </td>
                      <td style={tdOS}>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          <button
                            onClick={() => abrirEditLanc(l)}
                            style={{ background:"#dbeafe", border:"none", color:"#1d4ed8", cursor:"pointer", fontSize:".75rem", fontWeight:700, padding:"4px 10px", borderRadius:5 }}
                          >
                            Editar
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => excluirLanc(l)}
                              style={{ background:"transparent", border:"none", color:"var(--danger)", cursor:"pointer", fontSize:".75rem", fontWeight:600, padding:"4px 6px" }}
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* ── ABA: CHECKLIST MENSAL DE MANUTENÇÃO PREVENTIVA ───────────── */}
      {aba === "checklist" && (
        <ChecklistMensalPanel veiculos={veiculos} profile={profile} />
      )}

      {/* ── ABA: CADASTROS (catálogo de tipos / serviços / peças) ─────── */}
      {aba === "cadastros" && podeVerAba("cadastros") && (
        <main style={s.main} className="pg-body">
          <div className="grid-auto-280 cadastros-grid">
            {[
              { tipo:"tipo_lancamento", titulo:"Tipos de lançamento", singular:"tipo de lançamento", cor:"var(--info)", bg:"var(--info-bg)" },
              { tipo:"servico",         titulo:"Serviços",            singular:"serviço",             cor:"#1d4ed8", bg:"#dbeafe" },
              { tipo:"peca",            titulo:"Peças",               singular:"peça",                cor:"#92400e", bg:"var(--warning-bg)" },
              { tipo:"fornecedor",      titulo:"Fornecedores",        singular:"fornecedor",          cor:"var(--success)", bg:"var(--success-bg)" },
            ].map(sec => {
              const itens = itensCatalogo.filter(i => i.tipo === sec.tipo).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
              return (
                <div key={sec.tipo} className="cadastro-card" style={{ background:"var(--card-bg)", borderRadius:12, boxShadow:"0 1px 3px rgba(0,0,0,0.06)", overflow:"hidden", display:"flex", flexDirection:"column", minWidth: 0 }}>
                  <div style={{ padding:"0.85rem 1rem", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ ...s.osBadge, background:sec.bg, color:sec.cor }}>{itens.length}</span>
                    <h3 style={{ margin:0, color:"var(--text)", fontSize:".98rem" }}>{sec.titulo}</h3>
                  </div>
                  <div style={{ padding:"0.85rem 1rem", display:"flex", flexDirection:"column", gap:8, borderBottom:"1px solid var(--surface-2)" }}>
                    <div className="cadastro-add-row">
                      <input
                        style={{ ...s.fieldInput }}
                        value={novoCat[sec.tipo]}
                        onChange={e => setNovoCat(prev => ({ ...prev, [sec.tipo]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItemCat(sec.tipo); } }}
                        placeholder={sec.tipo === "fornecedor" ? "Nome / razão social..." : `Novo ${sec.singular}...`}
                      />
                      <button type="button" style={s.saveBtn} onClick={() => addItemCat(sec.tipo)}>Adicionar</button>
                    </div>
                    {sec.tipo === "fornecedor" && (
                      <input
                        style={{ ...s.fieldInput }}
                        value={novoCatCnpj}
                        onChange={e => setNovoCatCnpj(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItemCat("fornecedor"); } }}
                        placeholder="CNPJ (opcional) — ex: 12.345.678/0001-90"
                      />
                    )}
                  </div>
                  <div style={{ padding:"0.4rem 0", maxHeight:380, overflowY:"auto" }}>
                    {itens.length === 0 ? (
                      <p style={{ textAlign:"center", color:"var(--text-subtle)", fontSize:".85rem", padding:"1rem" }}>Nenhum cadastrado</p>
                    ) : itens.map(i => (
                      <div key={i.id} className="cadastro-item" style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 1rem", borderBottom:"1px solid var(--surface-2)" }}>
                        {editItemCat?.id === i.id ? (
                          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                            <input
                              style={{ ...s.fieldInput }}
                              value={editItemCat.nome}
                              onChange={e => setEditItemCat({ ...editItemCat, nome: e.target.value })}
                              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); renomearItemCat(); } }}
                              autoFocus
                            />
                            {sec.tipo === "fornecedor" && (
                              <input
                                style={{ ...s.fieldInput }}
                                value={editItemCat.cnpj || ""}
                                onChange={e => setEditItemCat({ ...editItemCat, cnpj: e.target.value })}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); renomearItemCat(); } }}
                                placeholder="CNPJ (opcional)"
                              />
                            )}
                            <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                              <button type="button" style={{ ...s.saveBtn, padding:"4px 12px" }} onClick={renomearItemCat}>Salvar</button>
                              <button type="button" style={{ ...s.cancelBtn, padding:"4px 12px" }} onClick={() => setEditItemCat(null)}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ color:"var(--text-subtle)", fontSize:".9rem", fontWeight: sec.tipo === "fornecedor" ? 600 : 400 }}>{i.nome}</div>
                              {sec.tipo === "fornecedor" && i.cnpj && (
                                <div style={{ fontSize:".72rem", color:"var(--text-muted)", marginTop:2 }}>CNPJ: {i.cnpj}</div>
                              )}
                            </div>
                            {canDelete && (
                              <>
                                <button type="button" onClick={() => setEditItemCat({ id:i.id, nome:i.nome, cnpj: i.cnpj || "" })} style={{ background:"#dbeafe", border:"none", color:"#1d4ed8", cursor:"pointer", fontSize:".75rem", fontWeight:700, padding:"4px 10px", borderRadius:5 }}>Editar</button>
                                <button type="button" onClick={() => excluirItemCat(i)} style={{ background:"transparent", border:"none", color:"var(--danger)", cursor:"pointer", fontSize:".75rem", fontWeight:600, padding:"4px 6px" }}>Excluir</button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {!canDelete && (
            <p style={{ marginTop:12, fontSize:".78rem", color:"var(--text-muted)" }}>Você pode adicionar itens. Editar e excluir é restrito a administradores.</p>
          )}

          {/* ── Tipos de Manutenção personalizados ─────────────────────── */}
          <div style={{ marginTop: 28, background:"var(--card-bg)", borderRadius:12, boxShadow:"0 1px 3px rgba(0,0,0,0.06)", overflow:"hidden" }}>
            <div style={{ padding:"0.85rem 1rem", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ ...s.osBadge, background:"var(--warning-bg)", color:"#92400e" }}>{tiposCustom.length}</span>
              <h3 style={{ margin:0, color:"var(--text)", fontSize:".98rem" }}>Tipos de Manutenção personalizados</h3>
              <span style={{ fontSize:".75rem", color:"var(--text-muted)", marginLeft:4 }}>
                — adicione itens que não estão no catálogo padrão (ex: mais serviços de Mecânica)
              </span>
            </div>

            {/* Form: novo tipo */}
            <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--surface-2)", display:"grid", gap:10 }}>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <label style={{ ...s.fieldLabel, flex:"2 1 240px", minWidth:200 }}>
                  Nome do tipo *
                  <input
                    style={s.fieldInput}
                    value={novoTipo.label}
                    onChange={e => setNovoTipo({ ...novoTipo, label: e.target.value })}
                    placeholder="Ex: Lavagem do motor"
                  />
                </label>
                <label style={{ ...s.fieldLabel, flex:"1 1 160px", minWidth:140 }}>
                  Grupo *
                  <select
                    style={s.fieldInput}
                    value={novoTipo.grupo}
                    onChange={e => setNovoTipo({ ...novoTipo, grupo: e.target.value })}
                  >
                    <option value="Mecânica">Mecânica</option>
                    <option value="Documentação">Documentação</option>
                  </select>
                </label>
              </div>
              <label style={s.fieldLabel}>
                Descrição
                <input
                  style={s.fieldInput}
                  value={novoTipo.desc}
                  onChange={e => setNovoTipo({ ...novoTipo, desc: e.target.value })}
                  placeholder="Detalhe rápido do que esse tipo significa"
                />
              </label>
              <div>
                <div style={{ fontSize:".82rem", fontWeight:600, color:"#374151", marginBottom:6 }}>Campos a preencher</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {Object.entries(CAMPO_LABEL).map(([id, label]) => (
                    <label key={id} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:".82rem", color:"var(--text)", padding:"4px 10px", border:"1px solid var(--border-strong)", borderRadius:8, background: novoTipo.campos.includes(id) ? "#eff6ff" : "var(--card-bg)", cursor:"pointer" }}>
                      <input
                        type="checkbox"
                        checked={novoTipo.campos.includes(id)}
                        onChange={() => toggleCampoEm(novoTipo, setNovoTipo, id)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              {erroTipo && <p style={s.erroMsg}>{erroTipo}</p>}
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button type="button" style={s.cancelBtn}
                  onClick={() => { setNovoTipo({ label:"", grupo:"Mecânica", desc:"", campos:["data_realiz","venc","local","resp","obs"] }); setErroTipo(""); }}>
                  Limpar
                </button>
                <button type="button" style={s.saveBtn} onClick={salvarNovoTipo} disabled={salvandoTipo}>
                  {salvandoTipo ? "Salvando..." : "+ Adicionar tipo"}
                </button>
              </div>
            </div>

            {/* Lista */}
            <div style={{ padding:"6px 0", maxHeight:420, overflowY:"auto" }}>
              {tiposCustom.length === 0 ? (
                <p style={{ textAlign:"center", color:"var(--text-subtle)", fontSize:".85rem", padding:"1rem" }}>
                  Nenhum tipo personalizado cadastrado.
                </p>
              ) : tiposCustom.map(t => (
                <div key={t.id} style={{ padding:"10px 16px", borderBottom:"1px solid var(--surface-2)" }}>
                  {editTipo?.id === t.id ? (
                    <div style={{ display:"grid", gap:8 }}>
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                        <input
                          style={{ ...s.fieldInput, flex:"2 1 240px" }}
                          value={editTipo.label}
                          onChange={e => setEditTipo({ ...editTipo, label: e.target.value })}
                          placeholder="Nome"
                          autoFocus
                        />
                        <select
                          style={{ ...s.fieldInput, flex:"1 1 140px" }}
                          value={editTipo.grupo}
                          onChange={e => setEditTipo({ ...editTipo, grupo: e.target.value })}
                        >
                          <option value="Mecânica">Mecânica</option>
                          <option value="Documentação">Documentação</option>
                        </select>
                      </div>
                      <input
                        style={s.fieldInput}
                        value={editTipo.desc || ""}
                        onChange={e => setEditTipo({ ...editTipo, desc: e.target.value })}
                        placeholder="Descrição"
                      />
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {Object.entries(CAMPO_LABEL).map(([id, lbl]) => (
                          <label key={id} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:".78rem", padding:"3px 8px", border:"1px solid var(--border-strong)", borderRadius:6, background: (editTipo.campos||[]).includes(id) ? "#eff6ff" : "var(--card-bg)", cursor:"pointer" }}>
                            <input
                              type="checkbox"
                              checked={(editTipo.campos||[]).includes(id)}
                              onChange={() => toggleCampoEm(editTipo, setEditTipo, id)}
                            />
                            {lbl}
                          </label>
                        ))}
                      </div>
                      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                        <button type="button" style={{ ...s.cancelBtn, padding:"4px 12px" }} onClick={() => { setEditTipo(null); setErroTipo(""); }}>Cancelar</button>
                        <button type="button" style={{ ...s.saveBtn, padding:"4px 14px" }} onClick={salvarEditTipo} disabled={salvandoTipo}>
                          {salvandoTipo ? "Salvando..." : "Salvar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          <span style={{ fontWeight:700, color:"var(--text)", fontSize:".92rem" }}>{t.label}</span>
                          <span style={{ ...s.osBadge, background: t.grupo === "Documentação" ? "#dbeafe" : "var(--success-bg)", color: t.grupo === "Documentação" ? "#1d4ed8" : "var(--success)" }}>{t.grupo}</span>
                        </div>
                        {t.desc && <div style={{ fontSize:".78rem", color:"var(--text-muted)", marginTop:2 }}>{t.desc}</div>}
                        <div style={{ fontSize:".72rem", color:"var(--text-subtle)", marginTop:4 }}>
                          Campos: {(t.campos || []).map(c => CAMPO_LABEL[c] || c).join(" · ") || "—"}
                        </div>
                      </div>
                      {canDelete && (
                        <div style={{ display:"flex", gap:6 }}>
                          <button type="button"
                            onClick={() => { setEditTipo({ id:t.id, label:t.label, grupo:t.grupo, desc:t.desc||"", campos: Array.isArray(t.campos)?[...t.campos]:[] }); setErroTipo(""); }}
                            style={{ background:"#dbeafe", border:"none", color:"#1d4ed8", cursor:"pointer", fontSize:".75rem", fontWeight:700, padding:"4px 10px", borderRadius:5 }}>
                            Editar
                          </button>
                          <button type="button"
                            onClick={() => excluirTipoCustom(t)}
                            style={{ background:"transparent", border:"none", color:"var(--danger)", cursor:"pointer", fontSize:".75rem", fontWeight:600, padding:"4px 6px" }}>
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* ── MODAL: FOTOS DA OS (galeria + upload) ─────────────────────── */}
      {fotosOsModal && (
        <div onClick={() => { setFotosOsModal(null); setFotosErro(""); }} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"var(--card-bg)", borderRadius:12, maxWidth:900, width:"100%", maxHeight:"90vh", overflow:"auto", padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <h2 style={{ margin:0, color:"var(--text)", fontSize:"1.1rem", display:"flex", alignItems:"center", gap:8 }}>
                  <Camera size={20} /> Fotos da OS {fotosOsModal.numero}
                </h2>
                <p style={{ margin:"4px 0 0 0", fontSize:".8rem", color:"var(--text-muted)" }}>
                  {fotosOsModal.placa} · {fotosOsModal.tipoServico} · {(fotosOsModal.fotos?.length || 0)} foto(s)
                </p>
              </div>
              <button onClick={() => { setFotosOsModal(null); setFotosErro(""); }} style={{ background:"none", border:"none", fontSize:"1.5rem", cursor:"pointer", color:"var(--text-muted)" }}>✕</button>
            </div>

            <label style={{ display:"block", padding:"12px 16px", background:"#f0f9ff", border:"2px dashed #0ea5e9", borderRadius:8, textAlign:"center", cursor:"pointer", marginBottom:16 }}>
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={e => uploadFotosOS(fotosOsModal, e.target.files)}
                disabled={fotosUploading}
                style={{ display:"none" }}
              />
              <span style={{ color:"#0369a1", fontWeight:600, fontSize:".9rem", display:"inline-flex", alignItems:"center", gap:6 }}>
                {fotosUploading ? <><Circle size={12} className="anim-spin" /> Enviando...</> : <><Camera size={16} /> Adicionar fotos (câmera ou galeria)</>}
              </span>
              <div style={{ fontSize:".72rem", color:"var(--text-muted)", marginTop:4 }}>
                Comprimido automaticamente pra 1600px · Firebase Storage grátis até 5GB
              </div>
            </label>

            {fotosErro && (
              <div style={{ background:"var(--danger-bg)", color:"var(--danger)", padding:"8px 12px", borderRadius:6, marginBottom:12, fontSize:".85rem" }}>
                {fotosErro}
              </div>
            )}

            {(fotosOsModal.fotos?.length || 0) === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--text-subtle)" }}>
                Nenhuma foto ainda. Registrar antes/durante/depois do serviço ajuda em garantia e auditoria.
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
                {fotosOsModal.fotos.map((foto, idx) => (
                  <div key={foto.path} style={{ border:"1px solid var(--border)", borderRadius:8, overflow:"hidden", background:"var(--surface-2)", position:"relative" }}>
                    <a href={foto.url} target="_blank" rel="noopener noreferrer">
                      <img src={foto.url} alt={foto.nome} style={{ width:"100%", height:150, objectFit:"cover", display:"block" }} />
                    </a>
                    <div style={{ padding:"6px 8px", fontSize:".72rem", color:"var(--text-muted)" }}>
                      <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={foto.nome}>{foto.nome}</div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:4 }}>
                        <span>{new Date(foto.criadoEm).toLocaleDateString("pt-BR")}</span>
                        <button
                          onClick={() => removerFotoOS(fotosOsModal, idx)}
                          style={{ background:"none", border:"none", color:"var(--danger)", cursor:"pointer", padding:2, display:"inline-flex", alignItems:"center" }}
                          title="Remover foto"
                        ><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL ─────────────────────────────────────────────────────── */}
      {modal && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={fecharModal}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTitulo}>{modal.placa} — {modal.tipo.label}</div>
                <div style={s.modalSubtitulo}>{modal.tipo.desc}</div>
              </div>
              <button style={s.closeBtn} onClick={fecharModal}>✕</button>
            </div>

            <form onSubmit={salvar} style={s.form}>
              {(modal.tipo.campos || ["data_realiz","venc","local","resp","obs"]).map(campo => {
                if (campo === "obs") {
                  return (
                    <label key={campo} style={s.fieldLabel}>
                      {CAMPO_LABEL[campo]}
                      <textarea
                        style={{ ...s.fieldInput, resize:"vertical", minHeight:64 }}
                        value={form[campo]}
                        onChange={e => setForm({ ...form, [campo]: e.target.value })}
                        placeholder="Detalhes adicionais..."
                      />
                    </label>
                  );
                }
                if (campo === "km_atual" || campo === "km_prox") {
                  const kmSascar = modal?.placa ? Number(odometroDe?.(normP(modal.placa))?.km) : null;
                  const hint = campo === "km_prox"
                    ? (kmSascar ? `Odômetro atual SASCAR: ${kmSascar.toLocaleString("pt-BR")} km` : "Ex: 300000")
                    : (kmSascar ? `Sugestão SASCAR: ${kmSascar.toLocaleString("pt-BR")}` : "KM atual do veículo");
                  return (
                    <label key={campo} style={s.fieldLabel}>
                      {CAMPO_LABEL[campo]}
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        style={s.fieldInput}
                        value={form[campo]}
                        onChange={e => setForm({ ...form, [campo]: e.target.value.replace(/\D/g, "") })}
                        placeholder={hint}
                      />
                    </label>
                  );
                }
                if (campo === "agendamento") {
                  // Destaca visualmente se o item venceu — sinaliza que precisa agendar
                  const hojeIso = new Date().toISOString().slice(0, 10);
                  const vencido = form.venc && form.venc < hojeIso;
                  const preenchido = !!form.agendamento;
                  const bg = vencido && !preenchido ? "var(--warning-bg)" : preenchido ? "var(--success-bg)" : undefined;
                  const borda = vencido && !preenchido ? "#fbbf24" : preenchido ? "#86efac" : undefined;
                  return (
                    <label key={campo} style={{ ...s.fieldLabel, background: bg, border: borda ? `1px solid ${borda}` : undefined, padding: bg ? 10 : undefined, borderRadius: 6 }}>
                      {CAMPO_LABEL[campo]}
                      <input
                        type="date"
                        style={s.fieldInput}
                        value={form[campo]}
                        onChange={e => setForm({ ...form, [campo]: e.target.value })}
                      />
                      <span style={{ fontSize: ".72rem", color: vencido && !preenchido ? "#92400e" : preenchido ? "#166534" : "var(--text-muted)", marginTop: 4, display: "inline-flex", alignItems: "flex-start", gap: 5 }}>
                        {vencido && !preenchido && <AlertTriangle size={12} style={{ marginTop: 1, flexShrink: 0 }} />}
                        {preenchido && <CheckCircle2 size={12} style={{ marginTop: 1, flexShrink: 0 }} />}
                        <span>{vencido && !preenchido
                          ? "Item vencido — informe a data agendada da nova inspeção pra postergar o status."
                          : preenchido
                          ? "Enquanto essa data não passar, status fica 'Agendado' (não conta como vencido)."
                          : "Opcional. Preencha quando agendar nova inspeção após vencimento — posterga o status até essa data."}</span>
                      </span>
                    </label>
                  );
                }
                return (
                  <label key={campo} style={s.fieldLabel}>
                    {CAMPO_LABEL[campo]}
                    <input
                      type={["venc","data_realiz","agendamento"].includes(campo) ? "date" : "text"}
                      style={s.fieldInput}
                      value={form[campo]}
                      onChange={e => setForm({ ...form, [campo]: e.target.value })}
                      required={campo === "venc"}
                    />
                  </label>
                );
              })}

              {/* ── Anexos ───────────────────────────────────────────── */}
              <div style={{ borderTop:"1px dashed var(--border-strong)", paddingTop:14, marginTop:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontWeight:700, color:"var(--text)", fontSize:".9rem" }}>📎 Anexos</span>
                  <span style={{ ...s.osBadge, background:"var(--info-bg)", color:"var(--info)" }}>{anexos.length}</span>
                  <span style={{ fontSize:".72rem", color:"var(--text-subtle)", marginLeft:"auto" }}>
                    PDF · JPG · PNG · WEBP — até 10 MB
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  style={{ display:"none" }}
                  onChange={(e) => uploadAnexos(e.target.files)}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); uploadAnexos(e.dataTransfer.files); }}
                  style={{
                    border:"2px dashed var(--border-strong)", borderRadius:10, padding:"14px",
                    textAlign:"center", color:"var(--text-muted)", cursor: uploadando ? "wait" : "pointer",
                    background: uploadando ? "var(--surface-2)" : "var(--surface-2)", fontSize:".82rem",
                    transition:"background .15s"
                  }}
                >
                  {uploadando
                    ? "Enviando arquivo(s)..."
                    : "Clique para selecionar ou arraste arquivos aqui"}
                </div>

                {!modal.record && (
                  <p style={{ marginTop:6, fontSize:".72rem", color:"#a16207", background:"#fef9c3", padding:"6px 10px", borderRadius:6 }}>
                    💡 Anexos vão pro Storage agora. Clique <strong>Salvar</strong> pra criar o registro do documento (senão os anexos ficam órfãos).
                  </p>
                )}

                {erroAnexo && <p style={{ ...s.erroMsg, marginTop:8 }}>{erroAnexo}</p>}

                {anexos.length > 0 && (
                  <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:6 }}>
                    {anexos.map((a, i) => {
                      const isImg = (a.contentType || "").startsWith("image/");
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 10px", border:"1px solid var(--border)", borderRadius:8, background:"var(--card-bg)" }}>
                          {isImg ? (
                            <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink:0 }}>
                              <img src={a.url} alt={a.nome} style={{ width:42, height:42, objectFit:"cover", borderRadius:6, border:"1px solid var(--border)" }} />
                            </a>
                          ) : (
                            <div style={{ width:42, height:42, borderRadius:6, background:"var(--danger-bg)", color:"var(--danger)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:".7rem", flexShrink:0 }}>
                              PDF
                            </div>
                          )}
                          <div style={{ flex:1, minWidth:0 }}>
                            <a href={a.url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize:".82rem", color:"#1d4ed8", fontWeight:600, textDecoration:"none", display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
                              title={a.nome}>
                              {a.nome}
                            </a>
                            <div style={{ fontSize:".7rem", color:"var(--text-subtle)" }}>
                              {fmtTamanho(a.tamanho)}{a.criadoEm ? ` · ${fmtDate(a.criadoEm.slice(0,10))}` : ""}
                              {a.criadoPor ? ` · ${a.criadoPor}` : ""}
                            </div>
                          </div>
                          <a href={a.url} target="_blank" rel="noopener noreferrer"
                            title="Abrir em nova aba"
                            style={{ background:"#dbeafe", color:"#1d4ed8", border:"none", borderRadius:5, padding:"5px 8px", fontSize:".75rem", fontWeight:700, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4 }}>
                            <Eye size={12} /> Abrir
                          </a>
                          <a href={a.url} download={a.nome}
                            title="Baixar pro seu PC"
                            style={{ background:"var(--success-bg)", color:"var(--success)", border:"none", borderRadius:5, padding:"5px 8px", fontSize:".75rem", fontWeight:700, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4 }}>
                            <FileDown size={12} /> Baixar
                          </a>
                          <button type="button" onClick={() => imprimirAnexo(a)}
                            title="Abrir e imprimir direto"
                            style={{ background:"var(--info-bg)", color:"var(--info)", border:"none", borderRadius:5, padding:"5px 8px", fontSize:".75rem", fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 }}>
                            <Printer size={12} /> Imprimir
                          </button>
                          <button type="button" onClick={() => removerAnexo(i)}
                            style={{ background:"transparent", border:"none", color:"var(--danger)", cursor:"pointer", padding:2 }}
                            title="Excluir anexo">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {erro && <p style={s.erroMsg}>{erro}</p>}

              <div style={s.formFooter}>
                {modal.record && canDelete && (
                  <button
                    type="button"
                    style={{ ...s.cancelBtn, color:"var(--danger)", borderColor:"#fca5a5" }}
                    onClick={() => { excluir(modal.record.id, modal.tipo.label); fecharModal(); }}
                  >
                    Excluir
                  </button>
                )}
                <div style={{ flex:1 }} />
                <button type="button" style={s.cancelBtn} onClick={fecharModal}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={salvando || uploadando}>
                  {salvando ? "Salvando..." : modal.record ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDITAR OS (até 24h) ────────────────────────────────── */}
      {/* ── MODAL: CONCLUIR OS (registra KM saída + mecânico + oficina + serviço) ── */}
      {concluindoOS && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={fecharConclusaoOS}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTitulo}>Concluir {concluindoOS.numero}</div>
                <div style={s.modalSubtitulo}>
                  {concluindoOS.placa} · {concluindoOS.tipoServico}
                  {concluindoOS.hodometro != null && ` · KM entrada: ${concluindoOS.hodometro}`}
                </div>
              </div>
              <button style={s.closeBtn} onClick={fecharConclusaoOS}>✕</button>
            </div>

            <form onSubmit={salvarConclusaoOS} style={s.form}>
              <label style={s.fieldLabel}>
                KM de saída {(() => {
                  const r = resolverKmSascar(concluindoOS.placa);
                  if (r?.km) return <span style={{ fontSize: ".7rem", color: "#ea580c", fontWeight: 600 }}> · 🛰 SASCAR</span>;
                  return null;
                })()}
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="number" min="0" step="1" inputMode="numeric"
                    style={{ ...s.fieldInput, flex: 1 }}
                    value={formConclusao.kmSaida}
                    onChange={e => setFormConclusao({ ...formConclusao, kmSaida: e.target.value.replace(/\D/g, "") })}
                    placeholder={concluindoOS.hodometro != null ? `≥ ${concluindoOS.hodometro}` : "Ex: 350500"}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await refetchSascar();
                      const r = resolverKmSascar(concluindoOS.placa);
                      if (!r?.km) { alert("Sem posição SASCAR disponível pra essa placa (nem via cavalo atrelado)."); return; }
                      setFormConclusao(f => ({ ...f, kmSaida: String(r.km) }));
                    }}
                    disabled={sascarLoading}
                    title="Atualizar KM pela SASCAR"
                    style={{ padding: "0 12px", borderRadius: 8, border: "1px solid var(--border-strong)", background: sascarLoading ? "var(--surface-2)" : "#ea580c", color: sascarLoading ? "var(--text-subtle)" : "#fff", fontWeight: 700, fontSize: ".78rem", cursor: sascarLoading ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                  >
                    {sascarLoading ? "..." : "🛰"}
                  </button>
                </div>
              </label>

              <label style={s.fieldLabel}>
                Mecânico / técnico
                <input
                  type="text"
                  style={s.fieldInput}
                  value={formConclusao.mecanico}
                  onChange={e => setFormConclusao({ ...formConclusao, mecanico: e.target.value })}
                  placeholder="Nome do mecânico responsável"
                />
              </label>

              <label style={s.fieldLabel}>
                Oficina
                <input
                  type="text"
                  style={s.fieldInput}
                  value={formConclusao.oficina}
                  onChange={e => setFormConclusao({ ...formConclusao, oficina: e.target.value })}
                  placeholder="Nome da oficina (interna/terceiro)"
                />
              </label>

              <label style={s.fieldLabel}>
                Serviço executado (resumo)
                <textarea
                  style={{ ...s.fieldInput, resize: "vertical", minHeight: 60 }}
                  value={formConclusao.servicoExecutado}
                  onChange={e => setFormConclusao({ ...formConclusao, servicoExecutado: e.target.value })}
                  placeholder="Ex: revisão dos 60mil km, troca de filtros e óleo…"
                  required
                />
              </label>

              <label style={s.fieldLabel}>
                Garantia da peça/serviço (dias)
                <input
                  type="number"
                  min="0"
                  step="1"
                  style={s.fieldInput}
                  value={formConclusao.garantiaDias}
                  onChange={e => setFormConclusao({ ...formConclusao, garantiaDias: e.target.value.replace(/\D/g, "") })}
                  placeholder="90"
                />
                <span style={{ fontSize: ".7rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Se abrir outra OS com mesma peça antes deste prazo, sistema alerta pra acionar garantia.
                </span>
              </label>

              {/* Fornecedor + CNPJ */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={s.fieldLabel}>
                  Fornecedor / Oficina
                  <SearchSelect
                    value={formConclusao.fornecedor}
                    onChange={val => setFormConclusao({ ...formConclusao, fornecedor: val, fornecedorCnpj: cnpjDoFornecedor(val) || formConclusao.fornecedorCnpj })}
                    options={opcoesCatalogo(itensCatalogo, "fornecedor")}
                    onAdd={nome => garantirItemCatalogo("fornecedor", nome, { cnpj: formConclusao.fornecedorCnpj })}
                    placeholder="Buscar ou cadastrar"
                  />
                </div>
                <label style={s.fieldLabel}>
                  CNPJ do fornecedor
                  <input
                    type="text"
                    style={s.fieldInput}
                    value={formConclusao.fornecedorCnpj}
                    onChange={e => setFormConclusao({ ...formConclusao, fornecedorCnpj: e.target.value })}
                    placeholder="Ex: 12.345.678/0001-90"
                  />
                </label>
              </div>

              {/* BLOCO ITENS (serviços/peças com valor) */}
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginTop: 4 }}>
                <div style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                  Itens do serviço (peças e mão de obra)
                </div>

                {/* Draft do próximo item */}
                <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 70px 110px auto", gap: 6, alignItems: "end", marginBottom: 8 }}>
                  <label style={{ ...s.fieldLabel, fontSize: ".72rem" }}>
                    Tipo
                    <select
                      style={s.fieldInput}
                      value={itemDraftConcl.tipoItem}
                      onChange={e => setItemDraftConcl({ ...itemDraftConcl, tipoItem: e.target.value })}
                    >
                      <option value="">—</option>
                      <option value="servico">Serviço</option>
                      <option value="peca">Peça</option>
                    </select>
                  </label>
                  <div style={{ ...s.fieldLabel, fontSize: ".72rem" }}>
                    {itemDraftConcl.tipoItem === "peca" ? "Peça" : "Serviço / descrição"}
                    <SearchSelect
                      value={itemDraftConcl.item}
                      onChange={val => setItemDraftConcl({ ...itemDraftConcl, item: val })}
                      options={opcoesCatalogo(itensCatalogo, itemDraftConcl.tipoItem || "servico")}
                      onAdd={nome => itemDraftConcl.tipoItem && garantirItemCatalogo(itemDraftConcl.tipoItem, nome)}
                      placeholder={itemDraftConcl.tipoItem === "peca" ? "Nome da peça" : "Descrição do serviço"}
                    />
                  </div>
                  <label style={{ ...s.fieldLabel, fontSize: ".72rem" }}>
                    Qtd
                    <input
                      type="number" min="0" step="0.01" inputMode="decimal"
                      style={s.fieldInput}
                      value={itemDraftConcl.quantidade}
                      onChange={e => setItemDraftConcl({ ...itemDraftConcl, quantidade: e.target.value })}
                      placeholder="1"
                    />
                  </label>
                  <label style={{ ...s.fieldLabel, fontSize: ".72rem" }}>
                    Valor unit. (R$)
                    <input
                      type="number" min="0" step="0.01" inputMode="decimal"
                      style={s.fieldInput}
                      value={itemDraftConcl.valorUnitario}
                      onChange={e => setItemDraftConcl({ ...itemDraftConcl, valorUnitario: e.target.value })}
                      placeholder="0,00"
                    />
                  </label>
                  <button type="button" onClick={adicionarItemConclusao}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "var(--text)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>
                    + Add
                  </button>
                </div>

                {/* Lista de itens já adicionados */}
                {conclusaoItens.length === 0 ? (
                  <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-subtle)", textAlign: "center", padding: "10px 0" }}>
                    Nenhum item adicionado. Adicione peças e serviços com valores acima.
                  </p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                        <th style={{ padding: 5, textAlign: "left", fontSize: ".7rem", fontWeight: 700 }}>Tipo</th>
                        <th style={{ padding: 5, textAlign: "left", fontSize: ".7rem", fontWeight: 700 }}>Descrição</th>
                        <th style={{ padding: 5, textAlign: "right", fontSize: ".7rem", fontWeight: 700 }}>Qtd</th>
                        <th style={{ padding: 5, textAlign: "right", fontSize: ".7rem", fontWeight: 700 }}>Unit.</th>
                        <th style={{ padding: 5, textAlign: "right", fontSize: ".7rem", fontWeight: 700 }}>Total</th>
                        <th style={{ padding: 5, width: 24 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {conclusaoItens.map((it, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: 5, color: it.tipoItem === "peca" ? "var(--chart-6)" : "var(--tech)", fontWeight: 600, textTransform: "capitalize" }}>{it.tipoItem}</td>
                          <td style={{ padding: 5, color: "var(--text)" }}>{it.item}</td>
                          <td style={{ padding: 5, textAlign: "right" }}>{it.quantidade}</td>
                          <td style={{ padding: 5, textAlign: "right" }}>{fmtBRL(it.valorUnitario)}</td>
                          <td style={{ padding: 5, textAlign: "right", fontWeight: 700, color: "var(--text)" }}>{fmtBRL(it.valorTotal)}</td>
                          <td style={{ padding: 5 }}>
                            <button type="button" onClick={() => removerItemConclusao(i)}
                              style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: ".95rem" }}>✕</button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={4} style={{ padding: 8, textAlign: "right", fontWeight: 700, color: "var(--text)" }}>Total geral:</td>
                        <td style={{ padding: 8, textAlign: "right", fontWeight: 800, color: "var(--text)", fontSize: ".95rem" }}>
                          {fmtBRL(conclusaoItens.reduce((s, it) => s + it.valorTotal, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Assinatura digital do motorista — evita disputa ("recebi/não recebi") */}
              <div style={{ borderTop: "1px dashed var(--border-strong)", paddingTop: 14, marginTop: 8 }}>
                <PadAssinatura
                  label={`Assinatura do motorista (${concluindoOS?.motoristaNome || "—"})`}
                  value={formConclusao.assinaturaMotorista}
                  onChange={png => setFormConclusao({ ...formConclusao, assinaturaMotorista: png })}
                />
              </div>

              {erroConclusao && <p style={s.erroMsg}>{erroConclusao}</p>}

              <div style={s.formFooter}>
                <button type="button" style={s.cancelBtn} onClick={fecharConclusaoOS}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={salvandoConclusao}>
                  {salvandoConclusao ? "Salvando..." : "Concluir OS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOS && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={fecharEditOS}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTitulo}>Editar {editOS.numero}</div>
                <div style={s.modalSubtitulo}>Edição permitida até {fmtDateTimeBR(osLimiteEdicao(editOS))} (24h após a abertura)</div>
              </div>
              <button style={s.closeBtn} onClick={fecharEditOS}>✕</button>
            </div>

            <form onSubmit={salvarEditOS} style={s.form}>
              <label style={s.fieldLabel}>
                Tipo de serviço
                <select
                  style={s.fieldInput}
                  value={formEditOS.tipoServico}
                  onChange={e => setFormEditOS({ ...formEditOS, tipoServico: e.target.value })}
                  required
                >
                  <option value="">— Selecione —</option>
                  <optgroup label="Mecânica">
                    {TIPOS_TODOS.filter(t => t.grupo === "Mecânica").map(t => (
                      <option key={t.id} value={t.label}>{t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Outro">
                    {["Reparo geral","Limpeza","Borracharia","Elétrica","Lanternagem / Pintura","Outro"].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </optgroup>
                </select>
              </label>

              <label style={s.fieldLabel}>
                Placa
                <select
                  style={s.fieldInput}
                  value={formEditOS.placa}
                  onChange={e => setFormEditOS({ ...formEditOS, placa: e.target.value.toUpperCase() })}
                  required
                >
                  <option value="">— Selecione o veículo —</option>
                  <optgroup label="Cavalos">
                    {veiculos.filter(v => v.tipo !== "carreta").map(v => (
                      <option key={v.id} value={v.placa}>{v.placa}{v.modelo ? ` — ${v.modelo}` : ""}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Carretas">
                    {veiculos.filter(v => v.tipo === "carreta").map(v => (
                      <option key={v.id} value={v.placa}>{v.placa}</option>
                    ))}
                  </optgroup>
                </select>
              </label>

              <label style={s.fieldLabel}>
                Motorista
                <select
                  style={s.fieldInput}
                  value={formEditOS.motoristaId}
                  onChange={e => setFormEditOS({ ...formEditOS, motoristaId: e.target.value })}
                  required
                >
                  <option value="">— Selecione —</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </label>

              <label style={s.fieldLabel}>
                Hodômetro (km)
                <input
                  type="number" min="0" step="1" inputMode="numeric"
                  style={s.fieldInput}
                  value={formEditOS.hodometro}
                  onChange={e => setFormEditOS({ ...formEditOS, hodometro: e.target.value.replace(/\D/g, "") })}
                  placeholder="Ex: 350000"
                />
              </label>

              <label style={s.fieldLabel}>
                Observações / motivo da entrada
                <textarea
                  style={{ ...s.fieldInput, resize:"vertical", minHeight:80 }}
                  value={formEditOS.obs}
                  onChange={e => setFormEditOS({ ...formEditOS, obs: e.target.value })}
                />
              </label>

              <p style={{ margin:0, fontSize:".72rem", color:"var(--text-muted)" }}>
                Trocar a placa transfere o bloqueio: libera o veículo anterior e bloqueia o novo.
              </p>

              {erroEdit && <p style={s.erroMsg}>{erroEdit}</p>}

              <div style={s.formFooter}>
                <div style={{ flex:1 }} />
                <button type="button" style={s.cancelBtn} onClick={fecharEditOS}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={salvandoEdit}>
                  {salvandoEdit ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDITAR LANÇAMENTO DE NF ────────────────────────────── */}
      {editLanc && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={fecharEditLanc}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTitulo}>Editar {editLanc.numero}</div>
                <div style={s.modalSubtitulo}>Lançamento de serviço/custo</div>
              </div>
              <button style={s.closeBtn} onClick={fecharEditLanc}>✕</button>
            </div>

            <form onSubmit={salvarEditLanc} style={s.form}>
              <label style={s.fieldLabel}>
                OS relacionada
                <select
                  style={s.fieldInput}
                  value={formEditLanc.osId}
                  onChange={e => {
                    const osId = e.target.value;
                    if (!osId) {
                      setFormEditLanc({ ...formEditLanc, osId: "", osNumero: "" });
                      return;
                    }
                    const os = ordensServico.find(o => o.id === osId);
                    if (!os) return;
                    setFormEditLanc({
                      ...formEditLanc,
                      osId:       os.id,
                      osNumero:   os.numero || "",
                      placa:      os.placa || formEditLanc.placa,
                      fornecedor: os.fornecedor || formEditLanc.fornecedor,
                    });
                  }}
                >
                  <option value="">— Nenhuma OS vinculada —</option>
                  {[...ordensServico]
                    .sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""))
                    .map(o => (
                      <option key={o.id} value={o.id}>
                        {o.numero || "S/Nº"} · {o.placa || "—"} · {osStatus(o) === "finalizada" ? "Finalizada" : "Aberta"}{o.fornecedor ? ` · ${o.fornecedor}` : ""}
                      </option>
                    ))}
                </select>
              </label>

              <div style={s.fieldLabel}>
                Tipo de lançamento
                <SearchSelect
                  value={formEditLanc.tipoLancamento}
                  onChange={val => setFormEditLanc({ ...formEditLanc, tipoLancamento: val })}
                  options={opcoesCatalogo(itensCatalogo, "tipo_lancamento", TIPO_LANCAMENTO_SUGEST)}
                  onAdd={nome => garantirItemCatalogo("tipo_lancamento", nome)}
                  placeholder="Buscar ou cadastrar (Elétrico, Motor, Inspeção...)"
                />
              </div>

              <label style={s.fieldLabel}>
                Placa
                <select
                  style={s.fieldInput}
                  value={formEditLanc.placa}
                  onChange={e => setFormEditLanc({ ...formEditLanc, placa: e.target.value.toUpperCase() })}
                >
                  <option value="">— Selecione o veículo —</option>
                  <optgroup label="Cavalos">
                    {veiculos.filter(v => v.tipo !== "carreta").map(v => (
                      <option key={v.id} value={v.placa}>{v.placa}{v.modelo ? ` — ${v.modelo}` : ""}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Carretas">
                    {veiculos.filter(v => v.tipo === "carreta").map(v => (
                      <option key={v.id} value={v.placa}>{v.placa}</option>
                    ))}
                  </optgroup>
                </select>
              </label>

              <div style={s.fieldLabel}>
                Fornecedor da OS
                <SearchSelect
                  value={formEditLanc.fornecedor}
                  onChange={val => setFormEditLanc({ ...formEditLanc, fornecedor: val })}
                  options={opcoesCatalogo(itensCatalogo, "fornecedor")}
                  onAdd={nome => garantirItemCatalogo("fornecedor", nome)}
                  placeholder="Buscar ou cadastrar fornecedor"
                />
              </div>

              <label style={s.fieldLabel}>
                Hodômetro (km)
                <input
                  type="number" min="0" step="1" inputMode="numeric"
                  style={s.fieldInput}
                  value={formEditLanc.hodometro}
                  onChange={e => setFormEditLanc({ ...formEditLanc, hodometro: e.target.value.replace(/\D/g, "") })}
                  placeholder="Ex: 350000"
                />
              </label>

              {/* Itens */}
              <div style={{ border:"1px solid var(--border)", borderRadius:10, padding:12 }}>
                <div style={{ fontWeight:700, color:"var(--text)", fontSize:".9rem", marginBottom:8 }}>Serviços / Peças</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-end" }}>
                  <label style={{ ...s.fieldLabel, minWidth:110 }}>
                    Tipo
                    <select style={s.fieldInput} value={itemDraftEdit.tipoItem} onChange={e => setItemDraftEdit({ ...itemDraftEdit, tipoItem: e.target.value, item: "" })}>
                      <option value="">—</option>
                      <option value="servico">Serviço</option>
                      <option value="peca">Peça</option>
                    </select>
                  </label>
                  <label style={{ ...s.fieldLabel, flex:1, minWidth:140 }}>
                    {itemDraftEdit.tipoItem === "peca" ? "Peça" : "Serviço"}
                    <input
                      type="text" list="cat-item-edit" style={s.fieldInput}
                      value={itemDraftEdit.item}
                      onChange={e => setItemDraftEdit({ ...itemDraftEdit, item: e.target.value })}
                      placeholder={itemDraftEdit.tipoItem ? "Selecione ou digite" : "Escolha o tipo"}
                      disabled={!itemDraftEdit.tipoItem}
                      autoComplete="off"
                    />
                    <datalist id="cat-item-edit">
                      {itensCatalogo.filter(i => i.tipo === itemDraftEdit.tipoItem).map(i => <option key={i.id} value={i.nome} />)}
                    </datalist>
                  </label>
                  <label style={{ ...s.fieldLabel, width:70 }}>
                    Qtd
                    <input type="number" min="0" step="1" inputMode="numeric" style={s.fieldInput} value={itemDraftEdit.quantidade} onChange={e => setItemDraftEdit({ ...itemDraftEdit, quantidade: e.target.value.replace(/\D/g, "") })} placeholder="1" />
                  </label>
                  <label style={{ ...s.fieldLabel, width:110 }}>
                    Unit. (R$)
                    <input type="text" inputMode="decimal" style={s.fieldInput} value={itemDraftEdit.valorUnitario} onChange={e => setItemDraftEdit({ ...itemDraftEdit, valorUnitario: maskMoeda(e.target.value) })} placeholder="0,00" />
                  </label>
                  <button type="button" onClick={addItemEditLanc} style={{ ...s.saveBtn, whiteSpace:"nowrap" }}>+ Item</button>
                </div>

                {lancItensEdit.length > 0 && (
                  <div style={{ marginTop:10, overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".85rem" }}>
                      <thead>
                        <tr style={{ background:"var(--surface-2)" }}>
                          <th style={thOS}>Tipo</th><th style={thOS}>Item</th><th style={thOS}>Qtd</th><th style={thOS}>Unit.</th><th style={thOS}>Total</th><th style={thOS}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lancItensEdit.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom:"1px solid var(--border)" }}>
                            <td style={tdOS}><span style={{ ...s.osBadge, background: it.tipoItem === "peca" ? "var(--warning-bg)" : "#dbeafe", color: it.tipoItem === "peca" ? "#92400e" : "#1d4ed8" }}>{it.tipoItem === "peca" ? "Peça" : "Serviço"}</span></td>
                            <td style={tdOS}>{it.item}</td>
                            <td style={tdOS}>{it.quantidade}</td>
                            <td style={tdOS}>{fmtBRL(it.valorUnitario)}</td>
                            <td style={tdOS}><strong>{fmtBRL(it.valorTotal)}</strong></td>
                            <td style={tdOS}><button type="button" onClick={() => removerItemEditLanc(idx)} title="Remover" style={{ background:"transparent", border:"none", color:"var(--danger)", cursor:"pointer", fontWeight:700, fontSize:".9rem" }}>✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:8, fontSize:".95rem", color:"var(--text)", fontWeight:700, background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, padding:"8px 12px" }}>
                Total: <span style={{ fontSize:"1.1rem" }}>{fmtBRL(lancItensEdit.reduce((sum, it) => sum + (Number(it.valorTotal) || 0), 0))}</span>
              </div>

              <label style={s.fieldLabel}>
                Serviço feito / descrição
                <textarea
                  style={{ ...s.fieldInput, resize:"vertical", minHeight:70 }}
                  value={formEditLanc.servicoFeito}
                  onChange={e => setFormEditLanc({ ...formEditLanc, servicoFeito: e.target.value })}
                />
              </label>

              {/* ── Anexos do Lançamento (NF, fotos, recibo) ─────── */}
              <div style={{ borderTop:"1px dashed var(--border-strong)", paddingTop:14, marginTop:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontWeight:700, color:"var(--text)", fontSize:".9rem" }}>📎 Anexos (NF, foto da peça, recibo)</span>
                  <span style={{ ...s.osBadge, background:"var(--info-bg)", color:"var(--info)" }}>{anexosLanc.length}</span>
                  <span style={{ fontSize:".72rem", color:"var(--text-subtle)", marginLeft:"auto" }}>
                    PDF · JPG · PNG · WEBP — até 10 MB
                  </span>
                </div>

                <input
                  ref={fileInputLancRef}
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  style={{ display:"none" }}
                  onChange={(e) => uploadAnexosLanc(e.target.files)}
                />

                <div
                  onClick={() => fileInputLancRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); uploadAnexosLanc(e.dataTransfer.files); }}
                  style={{
                    border:"2px dashed var(--border-strong)", borderRadius:10, padding:"14px",
                    textAlign:"center", color:"var(--text-muted)", cursor: uploadandoLanc ? "wait" : "pointer",
                    background: uploadandoLanc ? "var(--surface-2)" : "var(--surface-2)", fontSize:".82rem",
                  }}
                >
                  {uploadandoLanc ? "Enviando arquivo(s)..." : "Clique para selecionar ou arraste arquivos aqui"}
                </div>

                {erroAnexoLanc && <p style={{ ...s.erroMsg, marginTop:8 }}>{erroAnexoLanc}</p>}

                {anexosLanc.length > 0 && (
                  <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:6 }}>
                    {anexosLanc.map((a, i) => {
                      const isImg = (a.contentType || "").startsWith("image/");
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 10px", border:"1px solid var(--border)", borderRadius:8, background:"var(--card-bg)" }}>
                          {isImg ? (
                            <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink:0 }}>
                              <img src={a.url} alt={a.nome} style={{ width:42, height:42, objectFit:"cover", borderRadius:6, border:"1px solid var(--border)" }} />
                            </a>
                          ) : (
                            <div style={{ width:42, height:42, borderRadius:6, background:"var(--danger-bg)", color:"var(--danger)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:".7rem", flexShrink:0 }}>
                              PDF
                            </div>
                          )}
                          <div style={{ flex:1, minWidth:0 }}>
                            <a href={a.url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize:".82rem", color:"#1d4ed8", fontWeight:600, textDecoration:"none", display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
                              title={a.nome}>
                              {a.nome}
                            </a>
                            <div style={{ fontSize:".7rem", color:"var(--text-subtle)" }}>
                              {fmtTamanho(a.tamanho)}{a.criadoEm ? ` · ${fmtDate(a.criadoEm.slice(0,10))}` : ""}
                              {a.criadoPor ? ` · ${a.criadoPor}` : ""}
                            </div>
                          </div>
                          <a href={a.url} target="_blank" rel="noopener noreferrer"
                            title="Abrir em nova aba"
                            style={{ background:"#dbeafe", color:"#1d4ed8", border:"none", borderRadius:5, padding:"5px 8px", fontSize:".75rem", fontWeight:700, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4 }}>
                            <Eye size={12} /> Abrir
                          </a>
                          <a href={a.url} download={a.nome}
                            title="Baixar pro seu PC"
                            style={{ background:"var(--success-bg)", color:"var(--success)", border:"none", borderRadius:5, padding:"5px 8px", fontSize:".75rem", fontWeight:700, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4 }}>
                            <FileDown size={12} /> Baixar
                          </a>
                          <button type="button" onClick={() => imprimirAnexo(a)}
                            title="Abrir e imprimir direto"
                            style={{ background:"var(--info-bg)", color:"var(--info)", border:"none", borderRadius:5, padding:"5px 8px", fontSize:".75rem", fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 }}>
                            <Printer size={12} /> Imprimir
                          </button>
                          <button type="button" onClick={() => removerAnexoLanc(i)}
                            style={{ background:"transparent", border:"none", color:"var(--danger)", cursor:"pointer", padding:2 }}
                            title="Excluir anexo">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {erroEditLanc && <p style={s.erroMsg}>{erroEditLanc}</p>}

              <div style={s.formFooter}>
                <div style={{ flex:1 }} />
                <button type="button" style={s.cancelBtn} onClick={fecharEditLanc}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={salvandoEditLanc || uploadandoLanc}>
                  {salvandoEditLanc ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Documentos aplicáveis por placa ─────────────────────── */}
      {modalDocs && (
        <div style={s.overlay} onClick={fecharModalDocs}>
          <div style={{ ...s.modal, maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTitulo}>Documentos aplicáveis — {modalDocs.veiculo.placa}</div>
                <div style={s.modalSubtitulo}>
                  Marque só os documentos que essa placa precisa. Desmarcar oculta o documento da aba Veículo e dos Alertas.
                </div>
              </div>
              <button style={s.closeBtn} onClick={fecharModalDocs}>✕</button>
            </div>

            <div style={{ padding:"16px 24px", display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button type="button" onClick={marcarTodosDocs}
                  style={{ padding:"6px 12px", background:"#dbeafe", color:"#1d4ed8", border:"none", borderRadius:6, cursor:"pointer", fontWeight:700, fontSize:".78rem" }}>
                  Marcar todos
                </button>
                <button type="button" onClick={restaurarPadraoDocs}
                  style={{ padding:"6px 12px", background:"var(--surface-2)", color:"var(--text-muted)", border:"1px solid var(--border-strong)", borderRadius:6, cursor:"pointer", fontWeight:700, fontSize:".78rem" }}>
                  Restaurar padrão da frota
                </button>
                <button type="button"
                  onClick={() => { fecharModalDocs(); setAba("cadastros"); }}
                  style={{ padding:"6px 12px", background:"var(--warning-bg)", color:"#92400e", border:"none", borderRadius:6, cursor:"pointer", fontWeight:700, fontSize:".78rem", marginLeft:"auto" }}
                  title="Vai pra aba Cadastros pra criar um tipo novo">
                  + Cadastrar novo tipo
                </button>
                {modalDocs.restaurar && (
                  <span style={{ alignSelf:"center", fontSize:".78rem", color:"#a16207" }}>
                    Vai voltar pro padrão ao salvar
                  </span>
                )}
              </div>

              {["Documentação","Mecânica"].map(grupo => {
                const tiposG = TIPOS_TODOS.filter(t => t.grupo === grupo);
                if (tiposG.length === 0) return null;
                const gc = GRUPO_COLOR[grupo] || { bg:"var(--surface-2)", color:"var(--text-muted)", border:"var(--border-strong)" };
                return (
                  <div key={grupo}>
                    <div style={{ ...s.grupoHeader, background: gc.bg, color: gc.color, borderColor: gc.border, marginBottom: 8 }}>
                      {grupo}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:6 }}>
                      {tiposG.map(t => {
                        const checked = modalDocs.selecionados.has(t.id) && !modalDocs.restaurar;
                        return (
                          <label key={t.id}
                            style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"6px 8px", borderRadius:6, cursor: modalDocs.restaurar ? "not-allowed" : "pointer", background: checked ? "#eff6ff" : "transparent", opacity: modalDocs.restaurar ? 0.5 : 1 }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={modalDocs.restaurar}
                              onChange={() => toggleDocAplicavel(t.id)}
                              style={{ marginTop: 3 }}
                            />
                            <span style={{ fontSize:".82rem", color:"var(--text)", lineHeight:1.3 }}>
                              <strong>{t.label}</strong>
                              <br />
                              <span style={{ color:"var(--text-muted)", fontSize:".72rem" }}>{t.desc}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ ...s.formFooter, padding:"16px 24px 20px" }}>
              <div style={{ flex:1, fontSize:".78rem", color:"var(--text-muted)" }}>
                {modalDocs.restaurar
                  ? "Padrão da frota: documentos definidos pelas regras de tipo de veículo."
                  : `${modalDocs.selecionados.size} de ${TIPOS_TODOS.filter(t => t.grupo !== "Motorista").length} marcados`}
              </div>
              <button type="button" style={s.cancelBtn} onClick={fecharModalDocs}>Cancelar</button>
              <button type="button" style={s.saveBtn} onClick={salvarDocsAplicaveis} disabled={salvandoDocs}>
                {salvandoDocs ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────
const s = {
  wrap:        { minHeight:"100vh", background:"var(--bg)" },

  // header
  header:      { background:"var(--header-bg)", color:"#fff", borderBottom:"1px solid var(--header-border)", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 14px rgba(15,23,42,.18)", position:"sticky", top:0, zIndex:100 },
  headerTitle: { color:"#fff", fontSize:"1.15rem", fontWeight:700, margin:0, lineHeight:1.1 },
  alertaBadge: { background:"var(--danger)", color:"#fff", borderRadius:20, fontSize:".7rem", fontWeight:700, padding:"3px 10px", display:"inline-flex", alignItems:"center", gap:5 },
  backBtn:     { padding:"8px 14px", background:"var(--card-bg)", border:"none", borderRadius:8, fontSize:".82rem", cursor:"pointer", color:"var(--accent)", fontWeight:700, whiteSpace:"nowrap", boxShadow:"0 1px 3px rgba(0,0,0,.1)" },

  // Navbar lateral esquerda (tema + sticky/fixo)
  navGroups:      { display:"flex", flexDirection:"column", gap:0, background:"var(--card-bg)", borderRight:"1px solid var(--border)", padding:"12px 10px 24px", boxShadow:"0 1px 3px rgba(15,23,42,.04)", position:"fixed", left:0, top:64, bottom:0, width:250, overflowY:"auto", zIndex:200 },
  sidebarTitle:   { fontWeight:800, fontSize:".9rem", color:"var(--text)", padding:"6px 10px 12px", borderBottom:"2px solid var(--accent)", marginBottom:4, letterSpacing:".02em" },
  navGroup:       { display:"flex", flexDirection:"column", gap:2, padding:"12px 0", borderBottom:"1px solid var(--border)" },
  navGroupLabel:  { fontSize:".68rem", textTransform:"uppercase", letterSpacing:".09em", fontWeight:800, color:"var(--text-subtle)", padding:"2px 12px 6px" },

  // KPIs — resumo clicável (service desk)
  kpisRow:        { display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14, padding:"20px 20px 6px", marginLeft:262 },
  kpi:            { position:"relative", background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:14, padding:"16px 18px", textAlign:"left", cursor:"pointer", fontFamily:"inherit", display:"flex", flexDirection:"column", gap:12, boxShadow:"0 1px 3px rgba(15,23,42,.04)", transition:"transform .15s, box-shadow .15s, border-color .15s", overflow:"hidden" },
  kpiTop:         { display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 },
  kpiIco:         { width:34, height:34, borderRadius:10, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  kpiLabel:       { fontSize:".74rem", fontWeight:600, color:"var(--text-muted)", letterSpacing:".02em" },
  kpiValor:       { fontSize:"1.6rem", fontWeight:800, color:"var(--text)", lineHeight:1 },

  // seletor veículo
  main:        { padding:"24px", marginLeft:262, maxWidth:1200 },
  veiculoRow:  { display:"flex", alignItems:"center", gap:14, marginBottom:28, flexWrap:"wrap" },
  veiculoLabel:{ fontWeight:700, fontSize:".85rem", color:"var(--text)", whiteSpace:"nowrap" },
  veiculoSelect:{ padding:"10px 14px", border:"1px solid var(--border)", borderRadius:10, fontSize:".9rem", fontWeight:700, background:"var(--card-bg)", color:"var(--text)", cursor:"pointer", minWidth:200, boxShadow:"0 1px 3px rgba(15,23,42,.04)", fontFamily:"inherit" },
  resumoPills: { display:"flex", gap:6, flexWrap:"wrap" },
  rPill:       { padding:"3px 10px", borderRadius:20, fontSize:".72rem", fontWeight:700 },

  // grupo / tipo grid
  grupoHeader: { display:"inline-block", padding:"4px 16px", borderRadius:20, fontSize:".78rem", fontWeight:700, marginBottom:12, border:"1px solid" },
  sPill:       { padding:"2px 9px", borderRadius:20, fontSize:".68rem", fontWeight:700, whiteSpace:"nowrap" },

  // split view (aba Por Veículo)
  fieldLbl:    { fontSize:".72rem", color:"var(--text-muted)", fontWeight:700, textTransform:"uppercase", marginBottom:4, letterSpacing:".03em" },
  fieldVal:    { fontSize:".92rem", color:"var(--text)" },

  // toolbar alertas
  toolbar:     { display:"flex", alignItems:"center", gap:12, padding:"14px 24px", background:"transparent", flexWrap:"wrap" },
  inputBusca:  { flex:1, minWidth:160, padding:"10px 14px", border:"1px solid var(--border)", borderRadius:10, fontSize:".9rem", outline:"none", background:"var(--card-bg)", color:"var(--text)", boxShadow:"0 1px 3px rgba(15,23,42,.04)", fontFamily:"inherit" },
  filtros:     { display:"flex", gap:4, padding:4, background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:12, boxShadow:"0 1px 3px rgba(15,23,42,.04)" },
  filtroBtn:   { padding:"6px 14px", border:"none", borderRadius:8, background:"transparent", cursor:"pointer", fontSize:".8rem", color:"var(--text-muted)", fontWeight:700, fontFamily:"inherit" },
  filtroBtnAtivo:{ background:"var(--accent)", color:"#fff" },

  // tabela
  info:        { color:"var(--text-muted)", textAlign:"center", marginTop:40 },
  tableWrap:   { overflowX:"auto", background:"var(--card-bg)", borderRadius:14, border:"1px solid var(--border)", boxShadow:"0 1px 3px rgba(15,23,42,.05), 0 8px 24px -16px rgba(15,23,42,.10)" },
  table:       { width:"100%", borderCollapse:"collapse", minWidth:780 },
  theadRow:    { background:"var(--accent)" },
  th:          { padding:"13px 16px", textAlign:"left", color:"#fff", fontSize:".78rem", fontWeight:700, whiteSpace:"nowrap", textTransform:"uppercase", letterSpacing:".04em" },
  tr:          { borderBottom:"1px solid var(--border)" },
  td:          { padding:"12px 16px", fontSize:".88rem", color:"var(--text)", verticalAlign:"middle" },
  statusBadge: { padding:"2px 10px", borderRadius:20, fontSize:".72rem", fontWeight:700 },
  osBadge:     { display:"inline-block", padding:"2px 9px", borderRadius:20, fontSize:".7rem", fontWeight:700, whiteSpace:"nowrap" },
  editBtn:     { padding:"4px 12px", background:"var(--accent-soft)", color:"var(--accent)", border:"none", borderRadius:5, cursor:"pointer", fontWeight:700, fontSize:".78rem" },

  // modal
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:16 },
  modal:       { background:"var(--card-bg)", borderRadius:14, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.25)" },
  modalHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"20px 24px 0", gap:12 },
  modalTitulo: { fontSize:"1.05rem", fontWeight:700, color:"var(--text)", marginBottom:3 },
  modalSubtitulo:{ fontSize:".78rem", color:"var(--text-muted)", lineHeight:1.4 },
  closeBtn:    { background:"none", border:"none", fontSize:"1.1rem", cursor:"pointer", color:"var(--text-muted)", padding:"0 4px" },
  form:        { padding:24, display:"flex", flexDirection:"column", gap:14 },
  fieldLabel:  { display:"flex", flexDirection:"column", gap:5, fontSize:".85rem", fontWeight:600, color:"var(--text)" },
  fieldInput:  { padding:"8px 10px", border:"1px solid var(--border)", borderRadius:6, fontSize:".9rem", outline:"none", fontFamily:"inherit", background:"var(--bg)", color:"var(--text)" },
  erroMsg:     { color:"var(--danger)", fontSize:".82rem", background:"var(--danger-bg)", padding:"6px 10px", borderRadius:6 },
  formFooter:  { display:"flex", gap:10, alignItems:"center", paddingTop:4 },
  cancelBtn:   { padding:"8px 20px", background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:".85rem", color:"var(--text-muted)" },
  saveBtn:     { padding:"8px 24px", background:"var(--accent)", border:"none", borderRadius:6, cursor:"pointer", fontWeight:700, fontSize:".85rem", color:"#fff" },
};
