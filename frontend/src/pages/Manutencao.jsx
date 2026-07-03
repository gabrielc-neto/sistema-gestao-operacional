import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, getDocs, setDoc, deleteDoc, addDoc, updateDoc,
  doc, query, orderBy,
} from "firebase/firestore";
import { Lock, X, CheckCircle2, Download } from "lucide-react";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import ModuleHeader from "../components/ModuleHeader";

// ── Catálogo de tipos de manutenção ───────────────────────────────────────
const TIPOS = [
  // Documentação
  { id:"civ",              label:"CIV",                   grupo:"Documentação", desc:"Certificado de Inspeção Veicular — vistoria obrigatória anual",              campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"cipp",             label:"CIPP",                  grupo:"Documentação", desc:"Certificado de Inspeção para Produtos Perigosos — veículos que transportam cargas perigosas (MOPP)", campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"crlv",             label:"CRLV",                  grupo:"Documentação", desc:"Certificado de Registro e Licenciamento do Veículo",                         campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"tacografo",        label:"Tacógrafo",             grupo:"Documentação", desc:"Calibração, certificação e próximo vencimento do tacógrafo (INMETRO)",      campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"extintor",         label:"Extintor",              grupo:"Documentação", desc:"Validade e recarga do extintor de incêndio (cabine e carreta)",            campos:["data_realiz","venc","local","resp","obs"] },
  { id:"rntrc",            label:"RNTRC",                 grupo:"Documentação", desc:"Registro Nacional de Transportadores Rodoviários de Cargas (ANTT)",          campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"seguro",           label:"Seguro",                grupo:"Documentação", desc:"Seguro do veículo (apólice vigente)",                                        campos:["data_realiz","venc","numero_doc","local","resp","obs"] },
  { id:"licenca_parana",   label:"Licença Paraná",        grupo:"Documentação", desc:"Licença especial de trânsito no estado do Paraná (bitrem)",                 campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"licenca_federal",  label:"Licença Federal-DNIT",  grupo:"Documentação", desc:"Licença Federal DNIT para bitrens em rodovias federais",                   campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"aet",              label:"AET",                   grupo:"Documentação", desc:"Autorização Especial de Trânsito — cargas especiais/indivisíveis (DER/DNIT)", campos:["data_realiz","venc","numero_doc","local","resp","obs"] },
  { id:"cnh_venc",         label:"Validade CNH",          grupo:"Motorista",    desc:"Vencimento da CNH do motorista",                                           campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"aso",              label:"ASO",                   grupo:"Motorista",    desc:"Atestado de Saúde Ocupacional — exame médico periódico obrigatório",       campos:["data_realiz","venc","local","resp","obs"] },
  { id:"toxicologico",     label:"Exame Toxicológico",    grupo:"Motorista",    desc:"Exame toxicológico obrigatório para motoristas profissionais (Lei 13.103/2015) — validade 2,5 anos", campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"mopp",             label:"MOPP",                  grupo:"Motorista",    desc:"Movimentação Operacional de Produtos Perigosos — certificação do motorista", campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"nr20",             label:"NR-20",                 grupo:"Motorista",    desc:"Certificação NR-20 — Segurança e Saúde no Trabalho com Inflamáveis",        campos:["data_realiz","venc","local","resp","obs"] },
  { id:"nr35",             label:"NR-35",                 grupo:"Motorista",    desc:"Certificação NR-35 — Trabalho em Altura",                                   campos:["data_realiz","venc","local","resp","obs"] },
  // Mecânica
  { id:"oleo",             label:"Troca de Óleo",         grupo:"Mecânica",     desc:"Troca do óleo do motor e filtros",                                          campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"bateria",          label:"Bateria",               grupo:"Mecânica",     desc:"Troca ou verificação da bateria",                                           campos:["data_realiz","venc","local","resp","obs"] },
  { id:"engraxe",          label:"Engraxe Geral",         grupo:"Mecânica",     desc:"Engraxe geral de quinta-roda, rolamentos e articulações",                  campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"pneus",            label:"Pneus",                 grupo:"Mecânica",     desc:"Troca, recapagem ou rodízio de pneus",                                      campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"freios",           label:"Freios",                grupo:"Mecânica",     desc:"Verificação e ajuste do sistema de freios (lonas, discos, cilindros)",      campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"suspensao",        label:"Suspensão",             grupo:"Mecânica",     desc:"Revisão e manutenção da suspensão e amortecedores",                        campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"alinhamento",      label:"Alinhamento",           grupo:"Mecânica",     desc:"Alinhamento e balanceamento de rodas",                                      campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"arrefecimento",    label:"Arrefecimento",         grupo:"Mecânica",     desc:"Revisão do sistema de arrefecimento — radiador, fluido e mangueiras",      campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"embreagem",        label:"Embreagem",             grupo:"Mecânica",     desc:"Troca ou ajuste da embreagem",                                              campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"diferencial",      label:"Diferencial / Câmbio",  grupo:"Mecânica",     desc:"Revisão e troca de óleo do diferencial e caixa de câmbio",                 campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"preventiva",       label:"Preventiva",            grupo:"Mecânica",     desc:"Manutenção preventiva geral programada por KM ou período",                  campos:["data_realiz","venc","km_atual","local","resp","obs"] },
];

const CAMPO_LABEL = {
  data_realiz: "Data da Realização / Inspeção",
  venc:        "Validade / Próximo Vencimento",
  local:       "Local / Oficina",
  numero_doc:  "Número do Documento",
  km_atual:    "KM na Realização",
  resp:        "Responsável",
  obs:         "Observações",
};

const EMPTY_FORM = { data_realiz:"", venc:"", local:"", numero_doc:"", km_atual:"", resp:"", obs:"" };

// Abertura de OS — form vazio (bloqueia o veículo, NÃO tem custo)
const EMPTY_OS = { tipoServico: "", placa: "", motoristaId: "", hodometro: "", obs: "" };
const EMPTY_CONCLUSAO = { kmSaida: "", mecanico: "", oficina: "", servicoExecutado: "" };

// Lançamento de NF — registro de nota fiscal/custo (NÃO bloqueia o veículo)
// Sugestões iniciais do "Tipo de lançamento" (campo é cadastrável — aceita novos)
const TIPO_LANCAMENTO_SUGEST = [
  "Estoque", "Peças", "Manutenção", "Pneus", "Socorro", "Lavagem",
  "Sistema", "Contrato", "Documentação", "Elétrico", "Motor", "Inspeção"
];
// Cabeçalho do lançamento (os serviços/peças ficam na lista `itens`)
const EMPTY_LANC = {
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
  "Documentação": { bg:"var(--accent-soft)", color:"var(--accent)", border:"#93c5fd" },
  "Motorista":    { bg:"var(--warning-bg)", color:"var(--warning)", border:"var(--warning-border)" },
  "Mecânica":     { bg:"var(--success-bg)", color:"#065f46", border:"#6ee7b7" },
};

// ── Status ────────────────────────────────────────────────────────────────
function calcStatus(vencStr) {
  if (!vencStr) return "sem_data";
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const venc = new Date(vencStr + "T00:00:00");
  const diff = Math.ceil((venc - hoje) / 86400000);
  if (diff < 0)   return "vencido";
  if (diff <= 30) return "alerta";
  return "ok";
}

const STATUS_ORDER = { vencido: 0, alerta: 1, ok: 2, sem_data: 3 };

const STATUS_META = {
  vencido:  { label:"Vencido",      bg:"var(--danger-bg)", color:"var(--danger)", rowBg:"var(--danger-bg)" },
  alerta:   { label:"Alerta",       bg:"var(--warning-bg)", color:"var(--warning)", rowBg:"var(--warning-bg)" },
  ok:       { label:"OK",           bg:"var(--success-bg)", color:"var(--success)", rowBg:"var(--success-bg)" },
  sem_data: { label:"Sem registro", bg:"var(--surface-3)", color:"var(--text-subtle)", rowBg:"var(--surface-2)" },
};

function fmtDate(str) {
  if (!str) return "—";
  const [y,m,d] = str.split("-");
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
  { key: "12meses",   label: "Últimos 12 meses" },
  { key: "tudo",      label: "Tudo" },
  { key: "custom",    label: "Personalizado" },
];

// Paleta cíclica para colorir categorias do ranking
// Paleta "asteroide ao luar" — tons frios/lunares, cíclica
const PALETA_CAT = ["var(--chart-1)","var(--chart-2)","var(--chart-3)","var(--chart-4)","var(--chart-5)","var(--chart-6)","var(--chart-7)","var(--chart-8)","var(--chart-1)","var(--chart-2)","var(--chart-3)","var(--chart-4)"];

function inicioPeriodo(key, agora, customIni) {
  const y = agora.getFullYear();
  const m = agora.getMonth();
  if (key === "mes")      return new Date(y, m, 1).getTime();
  if (key === "mes_ant")  return new Date(y, m - 1, 1).getTime();
  if (key === "ano")      return new Date(y, 0, 1).getTime();
  if (key === "12meses")  return new Date(y, m - 11, 1).getTime();
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

// ════════════════════════════════════════════════════════════════════════
//  DASHBOARD DE MANUTENÇÃO — KPIs + gráficos + tabela por veículo (export)
// ════════════════════════════════════════════════════════════════════════
const ALERTA_MENSAL = 8000; // R$ por mês → veículo "em alerta"

// ── Gráfico de LINHA marcada (evolução mensal) ──────────────────────────
function LinhaCustos({ meses, fmt }) {
  const W = 720, H = 230, padL = 52, padR = 16, padT = 14, padB = 30;
  const iw = W - padL - padR, ih = H - padT - padB;
  const max = Math.max(1, ...meses.map(m => m.valor));
  const x = i => padL + (meses.length > 1 ? (i / (meses.length - 1)) * iw : iw / 2);
  const y = v => padT + ih - (v / max) * ih;
  const pts = meses.map((m, i) => [x(i), y(m.valor)]);
  const dLine = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const dArea = `${dLine} L ${x(meses.length - 1).toFixed(1)} ${padT + ih} L ${x(0).toFixed(1)} ${padT + ih} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {[0, .25, .5, .75, 1].map((g, i) => {
        const yy = padT + ih - g * ih;
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 8} y={yy + 3} textAnchor="end" fontSize="9" fill="var(--text-subtle)">{fmtBRLcurto(max * g).replace("R$ ", "")}</text>
          </g>
        );
      })}
      <path d={dArea} fill="var(--chart-2)" opacity=".12" />
      <path d={dLine} fill="none" stroke="var(--chart-2)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3.6" fill="var(--card-bg)" stroke="var(--chart-2)" strokeWidth="2" />
          <text x={p[0]} y={H - 10} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{nomeMes(meses[i].mes)}</text>
          <title>{`${nomeMes(meses[i].mes)}: ${fmt(meses[i].valor)}`}</title>
        </g>
      ))}
    </svg>
  );
}

// ── Donut / Pizza (reaproveitável) ──────────────────────────────────────
function DonutPie({ segments, fmt, tipo = "donut", size = 190 }) {
  const ativos = segments.filter(s => s.valor > 0);
  const total = ativos.reduce((s, x) => s + x.valor, 0);
  const R = size / 2, cx = R, cy = R;
  const inner = tipo === "donut" ? R * 0.6 : 0;
  if (total <= 0) {
    return <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}><circle cx={cx} cy={cy} r={R - 1} fill="var(--surface-3)" />{tipo === "donut" && <circle cx={cx} cy={cy} r={inner} fill="var(--card-bg)" />}</svg>;
  }
  if (ativos.length === 1) {
    return <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}><circle cx={cx} cy={cy} r={R} fill={ativos[0].cor} />{tipo === "donut" && <circle cx={cx} cy={cy} r={inner} fill="var(--card-bg)" />}</svg>;
  }
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {ativos.map((s, i) => {
        const frac = s.valor / total;
        const a0 = acc * 2 * Math.PI - Math.PI / 2; acc += frac;
        const a1 = acc * 2 * Math.PI - Math.PI / 2;
        const large = frac > 0.5 ? 1 : 0;
        const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
        const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        let d;
        if (tipo === "donut") {
          const xi0 = cx + inner * Math.cos(a0), yi0 = cy + inner * Math.sin(a0);
          const xi1 = cx + inner * Math.cos(a1), yi1 = cy + inner * Math.sin(a1);
          d = `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${inner} ${inner} 0 ${large} 0 ${xi0} ${yi0} Z`;
        } else {
          d = `M ${cx} ${cy} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
        }
        return <path key={i} d={d} fill={s.cor} stroke="var(--card-bg)" strokeWidth="1.5"><title>{`${s.label}: ${fmt ? fmt(s.valor) : s.valor} (${(frac * 100).toFixed(1)}%)`}</title></path>;
      })}
    </svg>
  );
}

// ── Legenda de segmentos ────────────────────────────────────────────────
function LegendaSeg({ segments, fmt }) {
  const total = segments.reduce((s, x) => s + x.valor, 0) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 150 }}>
      {segments.filter(s => s.valor > 0).map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".78rem" }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: s.cor, flexShrink: 0 }} />
          <span style={{ color: "var(--text-muted)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
          <span style={{ color: "var(--text)", fontWeight: 700 }}>{fmt ? fmt(s.valor) : s.valor}</span>
          <span style={{ color: "var(--text-subtle)", fontWeight: 600, minWidth: 40, textAlign: "right" }}>{((s.valor / total) * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Barras horizontais (Top 10 veículos) ────────────────────────────────
function BarrasH({ items, fmt }) {
  const max = Math.max(1, ...items.map(i => i.valor));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 78, fontSize: ".74rem", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-display)", flexShrink: 0 }}>{it.placa}</span>
          <div style={{ flex: 1, height: 16, background: "var(--surface-3)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${(it.valor / max) * 100}%`, height: "100%", borderRadius: 6, background: `linear-gradient(90deg, var(--chart-4), var(--chart-2))` }} />
          </div>
          <span style={{ width: 82, textAlign: "right", fontSize: ".76rem", fontWeight: 700, color: "var(--text)" }}>{fmt(it.valor)}</span>
        </div>
      ))}
      {items.length === 0 && <p style={{ color: "var(--text-subtle)", fontSize: ".82rem" }}>Sem lançamentos no período.</p>}
    </div>
  );
}

// ── Exportações ─────────────────────────────────────────────────────────
function baixarCSV(nome, headers, rows) {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(";"), ...rows.map(r => r.map(esc).join(";"))].join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
}
async function baixarPDF(el, nome) {
  if (!el) return;
  const html2pdf = (await import("html2pdf.js")).default;
  await html2pdf().set({
    margin: 8, filename: nome,
    image: { type: "jpeg", quality: .95 },
    html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
  }).from(el).save();
}

// ── Card de KPI com comparação anual ────────────────────────────────────
function KpiCard({ label, valor, sub, pct, invert = true, alerta = false }) {
  // invert=true → aumento de custo é ruim (vermelho); queda é bom (verde)
  const temPct = pct != null && Number.isFinite(pct);
  const subiu = temPct && pct > 0;
  const bom = temPct && (invert ? pct < 0 : pct > 0);
  const corPct = !temPct ? "var(--text-subtle)" : bom ? "var(--success)" : "var(--danger)";
  return (
    <div style={{ background: "var(--card-bg)", border: `1px solid ${alerta ? "var(--danger-border)" : "var(--border)"}`, borderRadius: "var(--r-lg)", padding: "16px 18px", boxShadow: "var(--sh-sm)", position: "relative", overflow: "hidden" }}>
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: alerta ? "var(--danger)" : "linear-gradient(180deg, var(--chart-2), var(--chart-4))" }} />
      <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: "1.55rem", fontWeight: 800, color: alerta ? "var(--danger)" : "var(--text)", marginTop: 6, lineHeight: 1.1, letterSpacing: "-.02em", fontFamily: "var(--font-display)" }}>{valor}</div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: ".74rem" }}>
        {temPct && <span style={{ color: corPct, fontWeight: 700 }}>{subiu ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%</span>}
        {sub && <span style={{ color: "var(--text-subtle)" }}>{sub}</span>}
      </div>
    </div>
  );
}

function DashboardManutencao({ lancamentos, veiculos }) {
  const pdfRef = useRef(null);
  const anosDisponiveis = useMemo(() => {
    const set = new Set();
    (lancamentos || []).forEach(l => { const d = new Date(l.criadoEm || l.dataHora); if (!isNaN(d)) set.add(d.getFullYear()); });
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [lancamentos]);

  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [mesSel, setMesSel] = useState("todos");
  useEffect(() => { if (!anosDisponiveis.includes(ano)) setAno(anosDisponiveis[0]); }, [anosDisponiveis]); // eslint-disable-line

  const d = useMemo(() => {
    const hoje = new Date();
    const norm = (lancamentos || []).map(l => ({ ...l, _d: new Date(l.criadoEm || l.dataHora), _v: Number(l.valorTotal) || 0 })).filter(l => !isNaN(l._d));
    const doAno = y => norm.filter(l => l._d.getFullYear() === y);
    const atuais = doAno(ano), anteriores = doAno(ano - 1);

    const totalAtual = atuais.reduce((s, l) => s + l._v, 0);
    const totalAnt = anteriores.reduce((s, l) => s + l._v, 0);

    const nVeic = (veiculos || []).filter(v => v.tipo !== "carreta").length || 1;
    const mediaVeicAtual = totalAtual / nVeic;
    const mediaVeicAnt = totalAnt / nVeic;
    const mesesAno = ano === hoje.getFullYear() ? hoje.getMonth() + 1 : 12;

    const porMes = Array.from({ length: 12 }, (_, m) => ({ mes: m, valor: 0 }));
    atuais.forEach(l => { porMes[l._d.getMonth()].valor += l._v; });

    const catMap = {};
    atuais.forEach(l => { const c = (l.tipoLancamento || "Sem categoria").trim() || "Sem categoria"; catMap[c] = (catMap[c] || 0) + l._v; });
    const porCategoria = Object.entries(catMap).map(([nome, valor], i) => ({ label: nome, valor, cor: PALETA_CAT[i % PALETA_CAT.length] })).sort((a, b) => b.valor - a.valor);

    const veicMap = {};
    atuais.forEach(l => {
      const p = (l.placa || "—").toUpperCase();
      if (!veicMap[p]) veicMap[p] = { placa: p, total: 0, meses: Array(12).fill(0) };
      veicMap[p].total += l._v;
      veicMap[p].meses[l._d.getMonth()] += l._v;
    });
    const porVeiculo = Object.values(veicMap).map(v => ({ ...v, media: v.total / mesesAno, maxMes: Math.max(0, ...v.meses) })).sort((a, b) => b.total - a.total);

    const emAlerta = porVeiculo.filter(v => v.maxMes > ALERTA_MENSAL);
    const maiorCusto = porVeiculo[0] || null;
    const top10 = porVeiculo.slice(0, 10).map(v => ({ placa: v.placa, valor: v.total }));

    const faixas = [
      { label: "Até R$2k/mês", min: 0, max: 2000, cor: "var(--chart-3)", valor: 0 },
      { label: "R$2k–5k/mês", min: 2000, max: 5000, cor: "var(--chart-2)", valor: 0 },
      { label: "R$5k–8k/mês", min: 5000, max: 8000, cor: "var(--chart-5)", valor: 0 },
      { label: "Acima de R$8k/mês", min: 8000, max: Infinity, cor: "var(--danger)", valor: 0 },
    ];
    porVeiculo.forEach(v => { (faixas.find(f => v.media >= f.min && v.media < f.max) || faixas[3]).valor++; });

    const pct = (a, b) => (b > 0 ? ((a - b) / b) * 100 : null);
    return {
      totalAtual, mediaVeicAtual, emAlerta, maiorCusto, porMes, porCategoria, porVeiculo, top10, faixas, nVeic,
      pctTotal: pct(totalAtual, totalAnt), pctMedia: pct(mediaVeicAtual, mediaVeicAnt),
    };
  }, [lancamentos, veiculos, ano]);

  // Tabela por veículo (respeita seletor de mês)
  const linhasTabela = d.porVeiculo.map(v => {
    const gasto = mesSel === "todos" ? v.total : v.meses[Number(mesSel)];
    return { placa: v.placa, gasto, media: v.media, maxMes: v.maxMes };
  }).filter(r => r.gasto > 0 || mesSel === "todos");

  function exportarCSV() {
    const headers = ["Placa", mesSel === "todos" ? "Gasto no ano (R$)" : `Gasto ${nomeMes(Number(mesSel))} (R$)`, "Média mensal (R$)", "Maior mês (R$)"];
    const rows = linhasTabela.map(r => [r.placa, r.gasto.toFixed(2).replace(".", ","), r.media.toFixed(2).replace(".", ","), r.maxMes.toFixed(2).replace(".", ",")]);
    baixarCSV(`manutencao_${ano}${mesSel === "todos" ? "" : "_" + nomeMes(Number(mesSel))}.csv`, headers, rows);
  }

  const sd = estilosDash;
  return (
    <main style={s.main} className="pg-body">
      {/* Toolbar */}
      <div style={sd.toolbar}>
        <div>
          <div style={sd.h1}>Dashboard de Manutenção</div>
          <div style={sd.h1sub}>Custos, alertas e evolução — {mesSel === "todos" ? `ano de ${ano}` : `${nomeMes(Number(mesSel))}/${ano}`}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={sd.selLabel}>Ano</label>
          <select style={sd.select} value={ano} onChange={e => setAno(Number(e.target.value))}>
            {anosDisponiveis.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div style={sd.kpiRow}>
        <KpiCard label="Custo total do período" valor={fmtBRL(d.totalAtual)} pct={d.pctTotal} sub="vs. ano anterior" />
        <KpiCard label="Custo médio / veículo" valor={fmtBRL(d.mediaVeicAtual)} pct={d.pctMedia} sub={`${d.nVeic} veículos · vs. ano anterior`} />
        <KpiCard label="Veículos em alerta" valor={String(d.emAlerta.length)} sub={`acima de ${fmtBRLcurto(ALERTA_MENSAL)}/mês`} alerta={d.emAlerta.length > 0} />
        <KpiCard label="Maior custo unitário" valor={d.maiorCusto ? fmtBRL(d.maiorCusto.total) : "—"} sub={d.maiorCusto ? `placa ${d.maiorCusto.placa}` : "sem dados"} />
      </div>

      {/* Linha (evolução) + Donut (categorias) */}
      <div style={sd.grid2}>
        <div style={sd.panel}>
          <div style={sd.panelTitle}>Evolução de custos mensais — {ano}</div>
          <LinhaCustos meses={d.porMes} fmt={fmtBRL} />
        </div>
        <div style={sd.panel}>
          <div style={sd.panelTitle}>Distribuição por categoria</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
            <DonutPie segments={d.porCategoria} fmt={fmtBRLcurto} tipo="donut" />
            <LegendaSeg segments={d.porCategoria} fmt={fmtBRLcurto} />
          </div>
        </div>
      </div>

      {/* Top 10 + Pizza (faixas) */}
      <div style={sd.grid2}>
        <div style={sd.panel}>
          <div style={sd.panelTitle}>Top 10 veículos — maior custo acumulado</div>
          <BarrasH items={d.top10} fmt={fmtBRLcurto} />
        </div>
        <div style={sd.panel}>
          <div style={sd.panelTitle}>Status da frota — faixa de custo mensal médio</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
            <DonutPie segments={d.faixas} tipo="pizza" fmt={n => `${n} veíc.`} />
            <LegendaSeg segments={d.faixas} fmt={n => `${n} veíc.`} />
          </div>
        </div>
      </div>

      {/* Tabela por veículo + export */}
      <div style={sd.panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={sd.panelTitle}>Gastos por veículo</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={sd.selLabel}>Mês</label>
            <select style={sd.select} value={mesSel} onChange={e => setMesSel(e.target.value)}>
              <option value="todos">Todos</option>
              {Array.from({ length: 12 }, (_, m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
            </select>
            <button style={sd.btnExp} onClick={exportarCSV}><Download size={15} /> CSV</button>
            <button style={sd.btnExp} onClick={() => baixarPDF(pdfRef.current, `manutencao_${ano}.pdf`)}><Download size={15} /> PDF</button>
          </div>
        </div>
        <div ref={pdfRef} className="table-wrap" style={{ boxShadow: "none" }}>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Placa</th>
                <th style={{ textAlign: "right" }}>{mesSel === "todos" ? `Gasto no ano` : `Gasto em ${nomeMes(Number(mesSel))}`}</th>
                <th style={{ textAlign: "right" }}>Média/mês</th>
                <th style={{ textAlign: "right" }}>Maior mês</th>
              </tr>
            </thead>
            <tbody>
              {linhasTabela.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: "var(--accent)" }}>{r.placa}</td>
                  <td style={{ textAlign: "right" }}>{fmtBRL(r.gasto)}</td>
                  <td style={{ textAlign: "right" }}>{fmtBRL(r.media)}</td>
                  <td style={{ textAlign: "right", color: r.maxMes > ALERTA_MENSAL ? "var(--danger)" : "var(--text)", fontWeight: r.maxMes > ALERTA_MENSAL ? 700 : 400 }}>{fmtBRL(r.maxMes)}</td>
                </tr>
              ))}
              {linhasTabela.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-subtle)", padding: 24 }}>Sem lançamentos no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

const estilosDash = {
  toolbar: { display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 8 },
  h1: { fontSize: "1.15rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-.02em", fontFamily: "var(--font-display)" },
  h1sub: { fontSize: ".8rem", color: "var(--text-muted)", marginTop: 2 },
  selLabel: { fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--text-muted)" },
  select: { padding: "7px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", fontSize: ".85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginBottom: 16 },
  panel: { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-sm)", padding: "16px 18px" },
  panelTitle: { fontSize: ".8rem", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 12 },
  btnExp: { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "var(--card-bg)", color: "var(--text)", fontSize: ".8rem", fontWeight: 700, cursor: "pointer" },
};

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
    else if (periodo === "12meses") mesesNoPeriodo = 12;
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
          <h2 style={{ margin: 0, color: "var(--accent)", fontSize: "1rem", fontWeight: 700 }} className="manut-display">Dashboard de custos</h2>
          <p style={{ margin: "2px 0 0 0", fontSize: ".75rem", color: "var(--text-muted)" }}>
            {filtrados.length} lançamento{filtrados.length === 1 ? "" : "s"} no período selecionado
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 8, padding: 6, background: "var(--surface-3)", borderRadius: 12, flexWrap: "wrap" }}>
            {PERIODOS_LANC.map(p => (
              <button key={p.key} type="button" onClick={() => setPeriodo(p.key)}
                style={{ padding: "7px 16px", borderRadius: 8, border: "none", fontSize: ".82rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  background: periodo === p.key ? "var(--accent)" : "transparent",
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
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "linear-gradient(135deg, #18216E, #234775)", color: "#fff" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 700, opacity: .75, textTransform: "uppercase", letterSpacing: ".04em" }}>Total gasto</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 4, lineHeight: 1 }} className="manut-display">{fmtBRLfn(totalGeral)}</div>
        </div>
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--accent-soft)", border: "1px solid #bae6fd" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".04em" }}>Categorias</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0c4a6e", marginTop: 4, lineHeight: 1 }} className="manut-display">{ranking.length}</div>
        </div>
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--success-bg)", border: "1px solid #86efac" }}>
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
                  <div style={{ height: 8, background: "var(--surface-3)", borderRadius: 6, overflow: "hidden" }}>
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
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
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
              style={{ padding:"8px 12px", cursor:"pointer", fontSize:".88rem", color:"var(--text)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-3)")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente ─────────────────────────────────────────────────────────────
export default function Manutencao() {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const canDelete   = ["master","admin"].includes(profile?.role);

  const [registros,      setRegistros]      = useState({});
  const [todosRegistros, setTodosRegistros] = useState([]);
  const [legacy,         setLegacy]         = useState([]);
  const [veiculos,       setVeiculos]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [aba,            setAba]            = useState("dashboard");
  const [placa,          setPlaca]          = useState("");
  const [busca,          setBusca]          = useState("");
  const [filtroSt,       setFiltroSt]       = useState("todos");
  const [filtroTipo,     setFiltroTipo]     = useState("civ");
  const [filtroStTipo,   setFiltroStTipo]   = useState("todos");
  const [modal,          setModal]          = useState(null);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [salvando,       setSalvando]       = useState(false);
  const [erro,           setErro]           = useState("");
  // Ordens de Serviço
  const [motoristas,     setMotoristas]     = useState([]);
  const [ordensServico,  setOrdensServico]  = useState([]);
  const [formOS, setFormOS] = useState({ ...EMPTY_OS });
  const [salvandoOS,     setSalvandoOS]     = useState(false);
  const [erroOS,         setErroOS]         = useState("");
  // edição / finalização de OS
  const [editOS,         setEditOS]         = useState(null); // { os } sendo editada
  const [formEditOS,     setFormEditOS]     = useState({ ...EMPTY_OS });
  const [salvandoEdit,   setSalvandoEdit]   = useState(false);
  const [erroEdit,       setErroEdit]       = useState("");
  // eslint-disable-next-line no-unused-vars -- WIP: usado pelo fluxo finalizar OS, em standby
  const [acaoOS,         setAcaoOS]         = useState(null); // id da OS em ação (finalizar)
  // Conclusão de OS (Lançamento de OS — registra KM saída, mecânico, oficina, serviço executado)
  const [concluindoOS,    setConcluindoOS]    = useState(null);
  const [formConclusao,   setFormConclusao]   = useState({ ...EMPTY_CONCLUSAO });
  const [erroConclusao,   setErroConclusao]   = useState("");
  const [salvandoConclusao, setSalvandoConclusao] = useState(false);
  // Lançamento de NF (registro de nota fiscal/custo — NÃO bloqueia veículo)
  const [lancamentos,     setLancamentos]     = useState([]);
  const [formLanc,        setFormLanc]        = useState({ ...EMPTY_LANC });
  const [lancItens,       setLancItens]       = useState([]);                 // itens do lançamento sendo criado
  const [itemDraft,       setItemDraft]       = useState({ ...EMPTY_ITEM });  // item em digitação
  const [salvandoLanc,    setSalvandoLanc]    = useState(false);
  const [erroLanc,        setErroLanc]        = useState("");
  const [editLanc,        setEditLanc]        = useState(null);
  const [formEditLanc,    setFormEditLanc]    = useState({ ...EMPTY_LANC });
  const [lancItensEdit,   setLancItensEdit]   = useState([]);
  const [itemDraftEdit,   setItemDraftEdit]   = useState({ ...EMPTY_ITEM });
  const [salvandoEditLanc, setSalvandoEditLanc] = useState(false);
  const [erroEditLanc,    setErroEditLanc]    = useState("");
  // catálogo de serviços e peças (cadastro inline)
  const [itensCatalogo,   setItensCatalogo]   = useState([]);
  // tela de Cadastros (gerenciar catálogo)
  const [novoCat,         setNovoCat]         = useState({ tipo_lancamento: "", servico: "", peca: "", fornecedor: "" });
  const [editItemCat,     setEditItemCat]     = useState(null); // { id, nome }

  async function carregarTudo() {
    setLoading(true);
    try {
      // queries em paralelo, cada uma com try local pra não derrubar as outras
      const [snapM, snapV, snapMot, snapOS, snapLanc, snapCat] = await Promise.all([
        getDocs(collection(db, "manutencoes")).catch(e => { console.warn("manutencoes:", e); return null; }),
        getDocs(query(collection(db, "veiculos"), orderBy("placa"))).catch(e => { console.warn("veiculos:", e); return null; }),
        getDocs(collection(db, "motoristas")).catch(e => { console.warn("motoristas:", e); return null; }),
        getDocs(collection(db, "ordens_servico")).catch(e => { console.warn("ordens_servico:", e); return null; }),
        getDocs(collection(db, "lancamentos_os")).catch(e => { console.warn("lancamentos_os:", e); return null; }),
        getDocs(collection(db, "itens_manutencao")).catch(e => { console.warn("itens_manutencao:", e); return null; }),
      ]);

      // motoristas: filtra ativos e ordena por nome localmente
      const mots = snapMot ? snapMot.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      const motsAtivos = mots
        .filter(m => {
          const st = (m.status || "").toString().toLowerCase().trim();
          return st === "ativo" || st === "" || st === "ativa"; // tolerante
        })
        .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setMotoristas(motsAtivos);

      // ordens de serviço: ordena por criadoEm desc localmente
      const oss = snapOS ? snapOS.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      oss.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
      setOrdensServico(oss);

      // lançamentos de OS (registro de serviço/custo): ordena por criadoEm desc
      const lancs = snapLanc ? snapLanc.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      lancs.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
      setLancamentos(lancs);

      // catálogo de serviços/peças: ordena por nome
      const cat = snapCat ? snapCat.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      cat.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setItensCatalogo(cat);

      if (!snapM || !snapV) return;
      const normP = (p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const map = {};
      const leg = [];
      const todos = [];
      snapM.docs.forEach(d => {
        const data = { id: d.id, ...d.data() };
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
      const vs = snapV.docs
        .map(d => ({ id: d.id, ...d.data() }))
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

  // carga inicial no mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregarTudo(); }, []);

  const alertaCount = useMemo(() => {
    const novosPend  = Object.values(registros).filter(r => ["vencido","alerta"].includes(calcStatus(r.venc))).length;
    const legadoPend = legacy.filter(r => ["vencido","alerta"].includes(calcStatus(r.venc))).length;
    return novosPend + legadoPend;
  }, [registros, legacy]);

  const normP = (p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  // ── Aba Por Veículo ───────────────────────────────────────────────────
  const veiculoSelecionado = useMemo(() =>
    veiculos.find(v => v.placa === placa) || null,
  [veiculos, placa]);

  const conjuntoComStatus = useMemo(() => {
    if (!veiculoSelecionado) return [];
    const isCarreta = veiculoSelecionado.tipo === "carreta";
    const is9eixos  = String(veiculoSelecionado.total_eixos) === "9";

    const tiposVeiculo = TIPOS.filter(t => {
      if (isCarreta) {
        if (t.grupo !== "Documentação") return false;
        if (["calibragem","tacografo","rntrc","seguro"].includes(t.id)) return false;
        if (t.id === "licenca_parana" || t.id === "licenca_federal") return is9eixos;
        return true;
      } else {
        if (t.grupo === "Motorista") return false;
        if (t.id === "licenca_parana" || t.id === "licenca_federal") return is9eixos;
        return true;
      }
    });

    const p = normP(placa);
    const tiposStatus = tiposVeiculo.map(t => {
      const rec = registros[`${p}__${t.id}`] || null;
      return { ...t, record: rec, status: calcStatus(rec?.venc) };
    });
    const grps = {};
    tiposStatus.forEach(t => {
      if (!grps[t.grupo]) grps[t.grupo] = [];
      grps[t.grupo].push(t);
    });
    const tipoLabel = isCarreta ? "Carreta" : "Cavalo";
    return [{ placa: p, label: `${tipoLabel} — ${p}`, tiposStatus, grupos: grps }];
  }, [veiculoSelecionado, placa, registros]);

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
      .map(r => ({ ...r, _status: calcStatus(r.venc) }))
      .filter(r => filtroStTipo === "todos" || r._status === filtroStTipo)
      .sort((a,b) => (STATUS_ORDER[a._status]||3) - (STATUS_ORDER[b._status]||3) || (a.venc||"").localeCompare(b.venc||""));
  }, [todosRegistros, filtroTipo, filtroStTipo]);

  // ── Aba Alertas ───────────────────────────────────────────────────────
  const listaAlertas = useMemo(() => {
    const tudo = [
      ...Object.values(registros).map(r => ({ ...r, _label: r.label || r.tipo })),
      ...legacy.map(r => ({ ...r, _label: r.item || "—" })),
    ];
    return tudo
      .map(r => ({ ...r, _status: calcStatus(r.venc) }))
      .filter(r => {
        const q = busca.toLowerCase();
        const matchB = (r.placa||"").toLowerCase().includes(q) || (r._label||"").toLowerCase().includes(q);
        const matchS = filtroSt === "todos" || r._status === filtroSt;
        return matchB && matchS;
      })
      .sort((a,b) => (STATUS_ORDER[a._status]||3) - (STATUS_ORDER[b._status]||3) || (a.venc||"").localeCompare(b.venc||""));
  }, [registros, legacy, busca, filtroSt]);

  // ── Modal ─────────────────────────────────────────────────────────────
  function abrirModal(veiculoPlaca, tipo) {
    const pNorm = normP(veiculoPlaca);
    const rec = registros[`${pNorm}__${tipo.id}`];
    setModal({ placa: pNorm, tipo, record: rec || null });
    setForm(rec ? {
      data_realiz: rec.data_realiz || "",
      venc:        rec.venc        || "",
      local:       rec.local       || "",
      numero_doc:  rec.numero_doc  || "",
      km_atual:    rec.km_atual    || "",
      resp:        rec.resp        || "",
      obs:         rec.obs         || "",
    } : { ...EMPTY_FORM });
    setErro("");
  }

  function fecharModal() { setModal(null); setErro(""); }

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
        local:       form.local.trim()       || null,
        numero_doc:  form.numero_doc.trim()  || null,
        km_atual:    form.km_atual.trim()    || null,
        resp:        form.resp.trim()        || null,
        obs:         form.obs.trim()         || null,
        updatedAt:   new Date().toISOString(),
      };
      if (!modal.record) payload.createdAt = new Date().toISOString();
      await setDoc(doc(db, "manutencoes", docId), payload, { merge: true });
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
      await deleteDoc(doc(db, "manutencoes", docId));
      await carregarTudo();
    } catch {
      alert("Erro ao excluir.");
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

  const quemSou = () => profile?.nome || profile?.email || profile?.role || "—";

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
    await updateDoc(doc(db, "veiculos", veiculo.id), { bloqueio });
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
    await updateDoc(doc(db, "veiculos", veiculo.id), { bloqueio });
    patchVeiculoLocal(veiculo.id, bloqueio);
  }

  async function salvarOS(e) {
    e.preventDefault();
    setErroOS("");
    const placa = (formOS.placa || "").trim().toUpperCase();
    if (!formOS.tipoServico) { setErroOS("Selecione o tipo de serviço."); return; }
    if (!placa)              { setErroOS("Informe a placa.");             return; }
    if (!formOS.motoristaId) { setErroOS("Selecione o motorista.");       return; }

    setSalvandoOS(true);
    try {
      const mot = motoristas.find(m => m.id === formOS.motoristaId);
      const veiculo = veiculos.find(v => normP(v.placa) === normP(placa)) || null;
      const agora = new Date();
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
        status:        "aberta",
        criadoPor:     profile?.email || profile?.nome || "—",
        criadoEm:      agora.toISOString(),
      };
      const ref = await addDoc(collection(db, "ordens_servico"), payload);
      const osCriada = { id: ref.id, ...payload };
      setOrdensServico(prev => [osCriada, ...prev]);
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
      await updateDoc(doc(db, "ordens_servico", os.id), {
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

  function abrirConclusaoOS(os) {
    if (osStatus(os) === "finalizada") return;
    setConcluindoOS(os);
    setFormConclusao({
      kmSaida: "",
      mecanico: "",
      oficina: "",
      servicoExecutado: os.tipoServico || "",
    });
    setErroConclusao("");
  }

  function fecharConclusaoOS() {
    setConcluindoOS(null);
    setErroConclusao("");
  }

  async function salvarConclusaoOS(e) {
    e.preventDefault();
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
    setSalvandoConclusao(true);
    try {
      const agora = new Date().toISOString();
      const dados = {
        status: "finalizada",
        finalizadaEm: agora,
        finalizadaPor: quemSou(),
        kmSaida: Number(kmSaidaStr),
        mecanico: formConclusao.mecanico.trim(),
        oficina: formConclusao.oficina.trim(),
        servicoExecutado: formConclusao.servicoExecutado.trim(),
      };
      await updateDoc(doc(db, "ordens_servico", os.id), dados);
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
    if (!editOS) return;
    // trava de segurança — passou das 24h ou já finalizada
    if (!osEditavel(editOS)) { setErroEdit("Esta OS não pode mais ser editada (passou de 24h ou já finalizada)."); return; }
    setErroEdit("");
    const placa = (formEditOS.placa || "").trim().toUpperCase();
    if (!formEditOS.tipoServico) { setErroEdit("Selecione o tipo de serviço."); return; }
    if (!placa)                  { setErroEdit("Informe a placa.");             return; }
    if (!formEditOS.motoristaId) { setErroEdit("Selecione o motorista.");       return; }

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
      await updateDoc(doc(db, "ordens_servico", editOS.id), updates);
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
    }
  }

  async function excluirOS(os) {
    if (!canDelete) return;
    if (!window.confirm(`Excluir ${os.numero}?`)) return;
    try {
      await deleteDoc(doc(db, "ordens_servico", os.id));
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

  // cadastra item no catálogo se ainda não existir (tipoItem: "servico"|"peca")
  async function garantirItemCatalogo(tipoItem, nome) {
    const nm = (nome || "").trim();
    if (!nm || !tipoItem) return;
    const existe = itensCatalogo.some(i => i.tipo === tipoItem && normNome(i.nome) === normNome(nm));
    if (existe) return;
    try {
      const payload = { tipo: tipoItem, nome: nm, criadoEm: new Date().toISOString(), criadoPor: quemSou() };
      const ref = await addDoc(collection(db, "itens_manutencao"), payload);
      setItensCatalogo(prev => [...prev, { id: ref.id, ...payload }].sort((a, b) => (a.nome || "").localeCompare(b.nome || "")));
    } catch (e) {
      console.warn("Falha ao cadastrar item no catálogo:", e);
    }
  }

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
      const ref = await addDoc(collection(db, "itens_manutencao"), payload);
      setItensCatalogo(prev => [...prev, { id: ref.id, ...payload }].sort((a, b) => (a.nome || "").localeCompare(b.nome || "")));
      setNovoCat(prev => ({ ...prev, [tipo]: "" }));
    } catch (e) {
      alert("Erro ao cadastrar: " + e.message);
    }
  }

  async function renomearItemCat() {
    if (!editItemCat) return;
    const nm = (editItemCat.nome || "").trim();
    if (!nm) return;
    try {
      await updateDoc(doc(db, "itens_manutencao", editItemCat.id), { nome: nm, editadoEm: new Date().toISOString(), editadoPor: quemSou() });
      setItensCatalogo(prev => prev.map(i => (i.id === editItemCat.id ? { ...i, nome: nm } : i)).sort((a, b) => (a.nome || "").localeCompare(b.nome || "")));
      setEditItemCat(null);
    } catch (e) {
      alert("Erro ao renomear: " + e.message);
    }
  }

  async function excluirItemCat(item) {
    if (!canDelete) return;
    if (!window.confirm(`Excluir "${item.nome}" do catálogo?`)) return;
    try {
      await deleteDoc(doc(db, "itens_manutencao", item.id));
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
    setErroLanc("");
    const placa = (formLanc.placa || "").trim().toUpperCase();
    const tipoLancamento = (formLanc.tipoLancamento || "").trim();
    if (!tipoLancamento)        { setErroLanc("Informe o tipo de lançamento (ex: Elétrico, Motor, Inspeção)."); return; }
    if (!placa)                 { setErroLanc("Selecione a placa."); return; }
    if (lancItens.length === 0) { setErroLanc("Adicione pelo menos um serviço/peça."); return; }

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
        tipoLancamento,
        placa,
        fornecedor:     (formLanc.fornecedor || "").trim(),
        hodometro:      numOS(formLanc.hodometro),
        itens,
        valorTotal,
        servicoFeito:   (formLanc.servicoFeito || "").trim(),
        criadoPor:      profile?.email || profile?.nome || "—",
        criadoEm:       agora.toISOString(),
      };
      const ref = await addDoc(collection(db, "lancamentos_os"), payload);
      setLancamentos(prev => [{ id: ref.id, ...payload }, ...prev]);
      setFormLanc({ ...EMPTY_LANC });
      setLancItens([]);
      setItemDraft({ ...EMPTY_ITEM });
    } catch (e) {
      setErroLanc("Erro ao salvar: " + e.message);
    } finally {
      setSalvandoLanc(false);
    }
  }

  function abrirEditLanc(l) {
    setEditLanc(l);
    setFormEditLanc({
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
    setErroEditLanc("");
  }

  function fecharEditLanc() { setEditLanc(null); setErroEditLanc(""); }

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
    if (!editLanc) return;
    setErroEditLanc("");
    const placa = (formEditLanc.placa || "").trim().toUpperCase();
    const tipoLancamento = (formEditLanc.tipoLancamento || "").trim();
    if (!tipoLancamento)            { setErroEditLanc("Informe o tipo de lançamento."); return; }
    if (!placa)                     { setErroEditLanc("Selecione a placa."); return; }
    if (lancItensEdit.length === 0) { setErroEditLanc("Adicione pelo menos um serviço/peça."); return; }

    setSalvandoEditLanc(true);
    try {
      await garantirItemCatalogo("tipo_lancamento", tipoLancamento);
      await garantirItemCatalogo("fornecedor", (formEditLanc.fornecedor || "").trim());
      const itens = lancItensEdit;
      const valorTotal = itens.reduce((sum, it) => sum + (Number(it.valorTotal) || 0), 0);
      const updates = {
        tipoLancamento,
        placa,
        fornecedor:   (formEditLanc.fornecedor || "").trim(),
        hodometro:    numOS(formEditLanc.hodometro),
        itens,
        valorTotal,
        servicoFeito: (formEditLanc.servicoFeito || "").trim(),
        editadoEm:    new Date().toISOString(),
        editadoPor:   quemSou(),
      };
      await updateDoc(doc(db, "lancamentos_os", editLanc.id), updates);
      setLancamentos(prev => prev.map(x => (x.id === editLanc.id ? { ...x, ...updates } : x)));
      fecharEditLanc();
    } catch (e) {
      setErroEditLanc("Erro ao salvar: " + e.message);
    } finally {
      setSalvandoEditLanc(false);
    }
  }

  async function excluirLanc(l) {
    if (!canDelete) return;
    if (!window.confirm(`Excluir o lançamento ${l.numero}?`)) return;
    try {
      await deleteDoc(doc(db, "lancamentos_os", l.id));
      setLancamentos(prev => prev.filter(x => x.id !== l.id));
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  }

  const thOS = { textAlign: "left", padding: "0.7rem 0.9rem", fontSize: ".72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" };
  const tdOS = { padding: "0.7rem 0.9rem", verticalAlign: "top", color: "var(--text)" };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap} className="manut-page-root">

      <style>{`
        .manut-page-root { font-family: "Manrope", system-ui, -apple-system, sans-serif; }
        .manut-page-root .manut-display { font-family: "Space Grotesk", "Manrope", system-ui, sans-serif; letter-spacing: -.01em; }
        .manut-header-btn { transition: transform .15s, background .15s; display:inline-flex; align-items:center; gap:8px; }
        .manut-header-btn:hover { transform: translateY(-1px); }

        /* ── Abas (navbar interna) — estado ativo controlado por classe .ativa ── */
        .manut-tabbar { display:flex; gap:0; background:var(--card-bg); border-bottom:1px solid var(--border); padding:0 24px; box-shadow:0 1px 3px rgba(15,23,42,.03); overflow-x:auto; }
        .manut-tab {
          padding:14px 18px; border:none; border-bottom:3px solid transparent; background:transparent;
          cursor:pointer; font-size:.86rem; font-weight:700; color:var(--text-muted);
          display:flex; align-items:center; gap:8px; font-family:inherit; white-space:nowrap;
          transition:color .15s, border-color .15s, background .15s;
          outline:none; -webkit-tap-highlight-color:transparent;
        }
        /* nenhum artefato de foco fica "grudado" no botão clicado */
        .manut-tab:focus, .manut-tab:focus-visible { outline:none; box-shadow:none; }
        .manut-tab:hover:not(.ativa) { color:var(--text); background:var(--surface-2); }
        /* SOMENTE a aba atual recebe a cor; ao trocar, a anterior volta ao estado inicial */
        .manut-tab.ativa { color:var(--accent); border-bottom-color:var(--accent); background:var(--accent-soft); }
      `}</style>
      {/* HEADER */}
      <ModuleHeader
        title="MANUTENÇÃO"
        actions={alertaCount > 0 && (
          <span style={s.alertaBadge}>
            <Ico.Alert size={11} /> {alertaCount} pendente{alertaCount>1?"s":""}
          </span>
        )}
      />

      {/* TABS — .ativa aplica a cor só na aba atual; ao trocar, a anterior volta ao normal */}
      <div className="manut-tabbar">
        <button className={"manut-tab" + (aba==="dashboard" ? " ativa" : "")} onClick={() => setAba("dashboard")}>
          Dashboard
        </button>
        <button className={"manut-tab" + (aba==="veiculo" ? " ativa" : "")} onClick={() => setAba("veiculo")}>
          Por Veículo
        </button>
        <button className={"manut-tab" + (aba==="tipo" ? " ativa" : "")} onClick={() => setAba("tipo")}>
          Por Tipo
        </button>
        <button className={"manut-tab" + (aba==="alertas" ? " ativa" : "")} onClick={() => setAba("alertas")}>
          Alertas
          {alertaCount > 0 && <span style={s.tabBadge}>{alertaCount}</span>}
        </button>
        <button className={"manut-tab" + (aba==="os" ? " ativa" : "")} onClick={() => setAba("os")}>
          Abertura de OS
          {ordensServico.length > 0 && <span style={{ ...s.tabBadge, background:"var(--success)" }}>{ordensServico.length}</span>}
        </button>
        <button className={"manut-tab" + (aba==="os_lanc" ? " ativa" : "")} onClick={() => setAba("os_lanc")}>
          Lançamento de OS
        </button>
        <button className={"manut-tab" + (aba==="lancamento" ? " ativa" : "")} onClick={() => setAba("lancamento")}>
          Lançamento de NF
          {lancamentos.length > 0 && <span style={{ ...s.tabBadge, background:"var(--accent)" }}>{lancamentos.length}</span>}
        </button>
        <button className={"manut-tab" + (aba==="cadastros" ? " ativa" : "")} onClick={() => setAba("cadastros")}>
          Cadastros
          {itensCatalogo.length > 0 && <span style={{ ...s.tabBadge, background:"var(--text-muted)" }}>{itensCatalogo.length}</span>}
        </button>
      </div>

      {/* ── ABA: DASHBOARD ────────────────────────────────────────────── */}
      {aba === "dashboard" && (
        <DashboardManutencao lancamentos={lancamentos} veiculos={veiculos} />
      )}

      {/* ── ABA: POR VEÍCULO ──────────────────────────────────────────── */}
      {aba === "veiculo" && (
        <main style={s.main} className="pg-body">
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
                  {summaryStatus.alerta  > 0 && <span style={{ ...s.rPill, background:"var(--warning-bg)", color:"var(--warning)" }}>{summaryStatus.alerta} alerta{summaryStatus.alerta>1?"s":""}</span>}
                  {summaryStatus.ok      > 0 && <span style={{ ...s.rPill, background:"var(--success-bg)", color:"var(--success)" }}>{summaryStatus.ok} ok</span>}
                  {summaryStatus.semReg  > 0 && <span style={{ ...s.rPill, background:"var(--surface-3)", color:"var(--text-subtle)" }}>{summaryStatus.semReg} sem reg.</span>}
                </div>
            )}
          </div>

          {loading ? (
            <p style={s.info}>Carregando...</p>
          ) : (
            conjuntoComStatus.map(secao => (
              <div key={secao.placa} style={{ marginBottom: 28 }}>
                <div style={{ fontWeight:700, fontSize:".95rem", color:"var(--accent)", padding:"10px 0 8px", borderBottom:"2px solid #18216E33", marginBottom:12 }}>
                  {secao.label}
                </div>
                {Object.entries(secao.grupos).map(([grupo, tipos]) => {
              const gc = GRUPO_COLOR[grupo] || { bg:"var(--surface-3)", color:"var(--text-muted)", border:"var(--border-strong)" };
              return (
                <div key={grupo} style={s.grupoSection}>
                  <div style={{ ...s.grupoHeader, background: gc.bg, color: gc.color, borderColor: gc.border }}>
                    {grupo}
                  </div>
                  <div style={s.tipoGrid}>
                    {tipos.map(t => {
                      const sm = STATUS_META[t.status];
                      const temDado = !!t.record;
                      return (
                        <div
                          key={t.id}
                          style={{ ...s.tipoCard, borderColor: temDado ? sm.color+"55" : "var(--border)", background: temDado ? sm.rowBg : "var(--card-bg)" }}
                          onClick={() => abrirModal(secao.placa, t)}
                        >
                          <div style={s.tipoCardTop}>
                            <span style={s.tipoNome}>{t.label}</span>
                            <span style={{ ...s.sPill, background: sm.bg, color: sm.color }}>{sm.label}</span>
                          </div>
                          <div style={s.tipoDesc}>{t.desc}</div>
                          {temDado && (
                            <div style={s.tipoMeta}>
                              {t.record.venc        && <span>Vence: <strong>{fmtDate(t.record.venc)}</strong></span>}
                              {t.record.data_realiz && <span>Realizado: {fmtDate(t.record.data_realiz)}</span>}
                              {t.record.local       && <span>Local: {t.record.local}</span>}
                              {t.record.numero_doc  && <span>Doc: {t.record.numero_doc}</span>}
                            </div>
                          )}
                          {!temDado && (
                            <div style={s.tipoVazio}>Clique para preencher</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
              </div>
            ))
          )}
        </main>
      )}

      {/* ── ABA: POR TIPO ─────────────────────────────────────────────── */}
      {aba === "tipo" && (
        <>
          <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:10 }}>
            {["Documentação","Motorista","Mecânica"].map(grupo => {
              const gc = GRUPO_COLOR[grupo];
              const tiposGrupo = TIPOS.filter(t => t.grupo === grupo);
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
                      ...(ativo ? { background: sm?.bg || "var(--accent)", color: sm?.color || "#fff", borderColor: "transparent" } : {}),
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
                      const tipo = TIPOS.find(t => t.id === r.tipo) || { id: r.tipo, label: r.tipo, desc:"", campos:["data_realiz","venc","local","resp","obs"] };
                      const ident = r.placa || r.motorista || "—";
                      return (
                        <tr key={r.id} style={{ ...s.tr, background: sm.rowBg }}>
                          <td style={{ ...s.td, fontWeight:700, color:"var(--accent)" }}>
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
      {aba === "alertas" && (
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
              {["todos","vencido","alerta","ok"].map(f => (
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
                      const tipo = TIPOS.find(t => t.id === r.tipo) || { id: r.tipo||"outro", label: r._label, desc:"", campos:["data_realiz","venc","local","resp","obs"] };
                      return (
                        <tr key={r.id} style={{ ...s.tr, background: sm.rowBg }}>
                          <td style={{ ...s.td, fontWeight:700, color:"var(--accent)" }}>{r.placa}</td>
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

      {/* ── ABA: ORDENS DE SERVIÇO ────────────────────────────────────── */}
      {aba === "os" && (
        <main style={s.main} className="pg-body">
          {/* Formulário de nova OS */}
          <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 0.75rem 0", color: "var(--accent)", fontSize: "1.05rem" }}>Abrir ordem de serviço <span style={{ fontWeight:400, fontSize:".8rem", color:"var(--text-muted)" }}>— bloqueia o veículo</span></h2>
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
                  <optgroup label="Mecânica">
                    {TIPOS.filter(t => t.grupo === "Mecânica").map(t => (
                      <option key={t.id} value={t.label}>{t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Outro">
                    <option value="Reparo geral">Reparo geral</option>
                    <option value="Limpeza">Limpeza</option>
                    <option value="Borracharia">Borracharia</option>
                    <option value="Elétrica">Elétrica</option>
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
                        {v.placa}{v.bloqueio?.ativo ? " • já bloqueado" : ""}{v.modelo ? ` — ${v.modelo}` : ""}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Carretas">
                    {veiculos.filter(v => v.tipo === "carreta").map(v => (
                      <option key={v.id} value={v.placa}>
                        {v.placa}{v.bloqueio?.ativo ? " • já bloqueado" : ""}
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

              <label style={s.fieldLabel}>
                Hodômetro (km)
                <input
                  type="number" min="0" step="1" inputMode="numeric"
                  style={s.fieldInput}
                  value={formOS.hodometro}
                  onChange={e => setFormOS({ ...formOS, hodometro: e.target.value.replace(/\D/g, "") })}
                  placeholder="Ex: 350000"
                />
              </label>

              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 4 }}>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                  Data/hora: <strong style={{ color: "var(--accent)" }}>preenchida automaticamente ao salvar</strong>
                </div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                  Próximo número: <strong style={{ color: "var(--accent)" }}>{proximoNumeroOS()}</strong>
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

              <p style={{ gridColumn:"1 / -1", margin:0, fontSize:".75rem", color:"var(--warning)", background:"var(--warning-bg)", border:"1px solid #fcd34d", borderRadius:8, padding:"8px 10px", lineHeight:1.5, display:"flex", alignItems:"flex-start", gap:8 }}>
                <Lock size={15} style={{ flexShrink:0, marginTop:2 }} />
                <span>Ao abrir a OS, o veículo é <strong>bloqueado automaticamente</strong> no sistema (não gera OC) e só é liberado quando a OS for <strong>finalizada</strong>. Depois de aberta, a OS só pode ser editada por <strong>24h</strong>.</span>
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
              <h3 style={{ margin: 0, color: "var(--accent)", fontSize: ".98rem" }}>Histórico de OS ({ordensServico.length})</h3>
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
                    <tr key={os.id} style={{ borderBottom: "1px solid #f1f5f9", background: finalizada ? "var(--surface-2)" : "#fff" }}>
                      <td style={tdOS}><strong style={{ color: "var(--accent)" }}>{os.numero}</strong></td>
                      <td style={tdOS}>
                        {fmtDateTimeBR(os.dataHora)}
                        {os.criadoPor && <div style={{ fontSize:".68rem", color:"var(--text-subtle)", marginTop:3 }}>por {os.criadoPor}</div>}
                      </td>
                      <td style={tdOS}>{os.tipoServico}</td>
                      <td style={tdOS}><strong>{os.placa}</strong></td>
                      <td style={tdOS}>{os.motoristaNome}</td>
                      <td style={tdOS}>
                        {finalizada ? (
                          <span style={{ ...s.osBadge, display:"inline-flex", alignItems:"center", gap:5, background:"var(--success-bg)", color:"var(--success)" }}><CheckCircle2 size={12} /> Finalizada</span>
                        ) : (
                          <span style={{ ...s.osBadge, display:"inline-flex", alignItems:"center", gap:5, background:"var(--warning-bg)", color:"var(--warning)" }}><Ico.Wrench size={12} /> Aberta</span>
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
                          {editavel && (
                            <button
                              onClick={() => abrirEditOS(os)}
                              style={{ background:"var(--accent-soft)", border:"none", color:"var(--accent)", cursor:"pointer", fontSize:".75rem", fontWeight:700, padding:"4px 10px", borderRadius:5 }}
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
      {aba === "os_lanc" && (
        <main style={s.main} className="pg-body">
          <div style={{ background: "var(--card-bg)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ margin: 0, color: "var(--accent)", fontSize: ".98rem" }}>
                OSs abertas — registrar conclusão ({ordensServico.filter(o => osStatus(o) !== "finalizada").length})
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: ".75rem", color: "var(--text-muted)" }}>
                Concluir a OS registra KM de saída, mecânico, oficina e serviço executado, e libera o veículo.
              </p>
            </div>
            <div style={{ overflowX: "auto" }} className="table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                    <th style={thOS}>OS</th>
                    <th style={thOS}>Abertura</th>
                    <th style={thOS}>Placa</th>
                    <th style={thOS}>Tipo</th>
                    <th style={thOS}>Motorista</th>
                    <th style={thOS}>KM entrada</th>
                    <th style={thOS}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const abertas = ordensServico.filter(o => osStatus(o) !== "finalizada");
                    if (abertas.length === 0) {
                      return (
                        <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--text-subtle)" }}>
                          Nenhuma OS aberta — todas finalizadas
                        </td></tr>
                      );
                    }
                    return abertas.map(os => (
                      <tr key={os.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={tdOS}><strong style={{ color: "var(--accent)" }}>{os.numero}</strong></td>
                        <td style={tdOS}>{fmtDateTimeBR(os.dataHora)}</td>
                        <td style={tdOS}><strong>{os.placa}</strong></td>
                        <td style={tdOS}>{os.tipoServico}</td>
                        <td style={tdOS}>{os.motoristaNome}</td>
                        <td style={tdOS}>{os.hodometro != null ? os.hodometro : "—"}</td>
                        <td style={tdOS}>
                          <button
                            onClick={() => abrirConclusaoOS(os)}
                            style={{ background:"var(--success-bg)", border:"none", color:"var(--success)", cursor:"pointer", fontSize:".78rem", fontWeight:700, padding:"5px 14px", borderRadius:5 }}
                          >
                            Concluir
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* ── ABA: LANÇAMENTO DE NF (registro de nota fiscal/custo) ─────────── */}
      {aba === "lancamento" && (
        <main style={s.main} className="pg-body">
          {/* Dashboard de custos (visão diretoria) */}
          <DashboardCustos lancamentos={lancamentos} fmtBRLfn={fmtBRL} />

          {/* Formulário de novo lançamento */}
          <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 0.25rem 0", color: "var(--accent)", fontSize: "1.05rem" }}>Lançamento de NF</h2>
            <p style={{ margin: "0 0 0.75rem 0", fontSize: ".78rem", color: "var(--text-muted)" }}>Registro de serviço e custo. <strong>Não bloqueia o veículo.</strong></p>
            <form onSubmit={salvarLanc}>
              {/* Cabeçalho */}
              <div className="grid-form-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
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
                  <input
                    type="number" min="0" step="1" inputMode="numeric"
                    style={s.fieldInput}
                    value={formLanc.hodometro}
                    onChange={e => setFormLanc({ ...formLanc, hodometro: e.target.value.replace(/\D/g, "") })}
                    placeholder="Ex: 350000"
                  />
                </label>
              </div>

              {/* Itens (serviços/peças) */}
              <div style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: ".9rem", marginBottom: 8 }}>Serviços / Peças deste lançamento</div>
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
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={tdOS}><span style={{ ...s.osBadge, background: it.tipoItem === "peca" ? "var(--warning-bg)" : "var(--accent-soft)", color: it.tipoItem === "peca" ? "var(--warning)" : "var(--accent)" }}>{it.tipoItem === "peca" ? "Peça" : "Serviço"}</span></td>
                            <td style={tdOS}>{it.item}</td>
                            <td style={tdOS}>{it.quantidade}</td>
                            <td style={tdOS}>{fmtBRL(it.valorUnitario)}</td>
                            <td style={tdOS}><strong>{fmtBRL(it.valorTotal)}</strong></td>
                            <td style={tdOS}><button type="button" onClick={() => removerItemLanc(idx)} title="Remover" style={{ display: "inline-flex", alignItems: "center", background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", fontWeight: 700, fontSize: ".9rem" }}><X size={15} /></button></td>
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
                  Data/hora automática · Lançado por <strong style={{ color: "var(--accent)" }}>{quemSou()}</strong> · Nº <strong style={{ color: "var(--accent)" }}>{proximoNumeroLanc()}</strong>
                </div>
                <div style={{ fontSize: ".95rem", color: "var(--accent)", fontWeight: 700, background: "var(--success-bg)", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px" }}>
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
              <h3 style={{ margin: 0, color: "var(--accent)", fontSize: ".98rem" }}>Histórico de lançamentos ({lancamentos.length})</h3>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                    <th style={thOS}>Nº</th>
                    <th style={thOS}>Data / hora</th>
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
                    <tr><td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-subtle)" }}>Nenhum lançamento ainda</td></tr>
                  ) : lancamentos.map(l => (
                    <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={tdOS}><strong style={{ color: "var(--accent)" }}>{l.numero}</strong></td>
                      <td style={tdOS}>
                        {fmtDateTimeBR(l.dataHora)}
                        {l.criadoPor && <div style={{ fontSize:".68rem", color:"var(--text-subtle)", marginTop:3 }}>por {l.criadoPor}</div>}
                      </td>
                      <td style={tdOS}>
                        {l.tipoLancamento && <span style={{ ...s.osBadge, background:"var(--accent-soft)", color:"var(--accent)" }}>{l.tipoLancamento}</span>}
                      </td>
                      <td style={{ ...tdOS, maxWidth: 340, whiteSpace: "normal" }}>
                        {Array.isArray(l.itens) && l.itens.length ? (
                          l.itens.map((it, i) => (
                            <div key={i} style={{ marginBottom: 3 }}>
                              <span style={{ ...s.osBadge, marginRight: 5, background: it.tipoItem === "peca" ? "var(--warning-bg)" : "var(--accent-soft)", color: it.tipoItem === "peca" ? "var(--warning)" : "var(--accent)" }}>{it.tipoItem === "peca" ? "Peça" : "Serviço"}</span>
                              <strong style={{ color: "var(--text)" }}>{it.item}</strong>
                              <span style={{ color: "var(--text-subtle)", fontSize: ".74rem" }}> &nbsp;{numOS(it.quantidade)}× {fmtBRL(it.valorUnitario)}</span>
                            </div>
                          ))
                        ) : (
                          <strong style={{ color: "var(--text)" }}>{l.item || "—"}</strong>
                        )}
                        {l.servicoFeito && <div style={{ fontSize: ".74rem", color: "var(--text-muted)", marginTop: 2 }}>{l.servicoFeito}</div>}
                      </td>
                      <td style={tdOS}>
                        <strong>{l.placa}</strong>
                        {l.hodometro ? <div style={{ fontSize: ".68rem", color: "var(--text-subtle)", marginTop: 2 }}>{Number(l.hodometro).toLocaleString("pt-BR")} km</div> : null}
                      </td>
                      <td style={tdOS}>{l.fornecedor || "—"}</td>
                      <td style={tdOS}>
                        <strong style={{ color: "var(--accent)" }}>{fmtBRL(l.valorTotal != null ? l.valorTotal : somaItens(l))}</strong>
                        {Array.isArray(l.itens) && l.itens.length > 0 && (
                          <div style={{ fontSize: ".68rem", color: "var(--text-subtle)", marginTop: 2 }}>{l.itens.length} {l.itens.length === 1 ? "item" : "itens"}</div>
                        )}
                      </td>
                      <td style={tdOS}>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          <button
                            onClick={() => abrirEditLanc(l)}
                            style={{ background:"var(--accent-soft)", border:"none", color:"var(--accent)", cursor:"pointer", fontSize:".75rem", fontWeight:700, padding:"4px 10px", borderRadius:5 }}
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

      {/* ── ABA: CADASTROS (catálogo de tipos / serviços / peças) ─────── */}
      {aba === "cadastros" && (
        <main style={s.main} className="pg-body">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:16 }}>
            {[
              { tipo:"tipo_lancamento", titulo:"Tipos de lançamento", singular:"tipo de lançamento", cor:"var(--accent)", bg:"var(--accent-soft)" },
              { tipo:"servico",         titulo:"Serviços",            singular:"serviço",             cor:"var(--accent)", bg:"var(--accent-soft)" },
              { tipo:"peca",            titulo:"Peças",               singular:"peça",                cor:"var(--warning)", bg:"var(--warning-bg)" },
              { tipo:"fornecedor",      titulo:"Fornecedores",        singular:"fornecedor",          cor:"var(--success)", bg:"var(--success-bg)" },
            ].map(sec => {
              const itens = itensCatalogo.filter(i => i.tipo === sec.tipo).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
              return (
                <div key={sec.tipo} style={{ background:"var(--card-bg)", borderRadius:12, boxShadow:"0 1px 3px rgba(0,0,0,0.06)", overflow:"hidden", display:"flex", flexDirection:"column" }}>
                  <div style={{ padding:"0.85rem 1rem", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ ...s.osBadge, background:sec.bg, color:sec.cor }}>{itens.length}</span>
                    <h3 style={{ margin:0, color:"var(--accent)", fontSize:".98rem" }}>{sec.titulo}</h3>
                  </div>
                  <div style={{ padding:"0.85rem 1rem", display:"flex", gap:8, borderBottom:"1px solid #f1f5f9" }}>
                    <input
                      style={{ ...s.fieldInput, flex:1 }}
                      value={novoCat[sec.tipo]}
                      onChange={e => setNovoCat(prev => ({ ...prev, [sec.tipo]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItemCat(sec.tipo); } }}
                      placeholder={`Novo ${sec.singular}...`}
                    />
                    <button type="button" style={s.saveBtn} onClick={() => addItemCat(sec.tipo)}>Adicionar</button>
                  </div>
                  <div style={{ padding:"0.4rem 0", maxHeight:380, overflowY:"auto" }}>
                    {itens.length === 0 ? (
                      <p style={{ textAlign:"center", color:"var(--text-subtle)", fontSize:".85rem", padding:"1rem" }}>Nenhum cadastrado</p>
                    ) : itens.map(i => (
                      <div key={i.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 1rem", borderBottom:"1px solid #f8fafc" }}>
                        {editItemCat?.id === i.id ? (
                          <>
                            <input
                              style={{ ...s.fieldInput, flex:1 }}
                              value={editItemCat.nome}
                              onChange={e => setEditItemCat({ ...editItemCat, nome: e.target.value })}
                              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); renomearItemCat(); } }}
                              autoFocus
                            />
                            <button type="button" style={{ ...s.saveBtn, padding:"4px 12px" }} onClick={renomearItemCat}>Salvar</button>
                            <button type="button" style={{ ...s.cancelBtn, padding:"4px 12px" }} onClick={() => setEditItemCat(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <span style={{ flex:1, color:"var(--text)", fontSize:".9rem" }}>{i.nome}</span>
                            {canDelete && (
                              <>
                                <button type="button" onClick={() => setEditItemCat({ id:i.id, nome:i.nome })} style={{ background:"var(--accent-soft)", border:"none", color:"var(--accent)", cursor:"pointer", fontSize:".75rem", fontWeight:700, padding:"4px 10px", borderRadius:5 }}>Editar</button>
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
        </main>
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
              <button style={s.closeBtn} onClick={fecharModal}><X size={18} /></button>
            </div>

            <form onSubmit={salvar} style={s.form}>
              {(modal.tipo.campos || ["data_realiz","venc","local","resp","obs"]).map(campo => (
                campo === "obs" ? (
                  <label key={campo} style={s.fieldLabel}>
                    {CAMPO_LABEL[campo]}
                    <textarea
                      style={{ ...s.fieldInput, resize:"vertical", minHeight:64 }}
                      value={form[campo]}
                      onChange={e => setForm({ ...form, [campo]: e.target.value })}
                      placeholder="Detalhes adicionais..."
                    />
                  </label>
                ) : (
                  <label key={campo} style={s.fieldLabel}>
                    {CAMPO_LABEL[campo]}
                    <input
                      type={["venc","data_realiz"].includes(campo) ? "date" : "text"}
                      style={s.fieldInput}
                      value={form[campo]}
                      onChange={e => setForm({ ...form, [campo]: e.target.value })}
                      required={campo === "venc"}
                    />
                  </label>
                )
              ))}

              {erro && <p style={s.erroMsg}>{erro}</p>}

              <div style={s.formFooter}>
                {modal.record && canDelete && (
                  <button
                    type="button"
                    style={{ ...s.cancelBtn, color:"var(--danger)", borderColor:"var(--danger-border)" }}
                    onClick={() => { excluir(modal.record.id, modal.tipo.label); fecharModal(); }}
                  >
                    Excluir
                  </button>
                )}
                <div style={{ flex:1 }} />
                <button type="button" style={s.cancelBtn} onClick={fecharModal}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={salvando}>
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
              <button style={s.closeBtn} onClick={fecharConclusaoOS}><X size={18} /></button>
            </div>

            <form onSubmit={salvarConclusaoOS} style={s.form}>
              <label style={s.fieldLabel}>
                KM de saída
                <input
                  type="number" min="0" step="1" inputMode="numeric"
                  style={s.fieldInput}
                  value={formConclusao.kmSaida}
                  onChange={e => setFormConclusao({ ...formConclusao, kmSaida: e.target.value.replace(/\D/g, "") })}
                  placeholder={concluindoOS.hodometro != null ? `≥ ${concluindoOS.hodometro}` : "Ex: 350500"}
                  required
                  autoFocus
                />
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
                Serviço executado
                <textarea
                  style={{ ...s.fieldInput, resize: "vertical", minHeight: 80 }}
                  value={formConclusao.servicoExecutado}
                  onChange={e => setFormConclusao({ ...formConclusao, servicoExecutado: e.target.value })}
                  placeholder="O que foi feito (peças trocadas, ajustes, diagnóstico…)"
                  required
                />
              </label>

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
              <button style={s.closeBtn} onClick={fecharEditOS}><X size={18} /></button>
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
                    {TIPOS.filter(t => t.grupo === "Mecânica").map(t => (
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
              <button style={s.closeBtn} onClick={fecharEditLanc}><X size={18} /></button>
            </div>

            <form onSubmit={salvarEditLanc} style={s.form}>
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
                <div style={{ fontWeight:700, color:"var(--accent)", fontSize:".9rem", marginBottom:8 }}>Serviços / Peças</div>
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
                          <tr key={idx} style={{ borderBottom:"1px solid #f1f5f9" }}>
                            <td style={tdOS}><span style={{ ...s.osBadge, background: it.tipoItem === "peca" ? "var(--warning-bg)" : "var(--accent-soft)", color: it.tipoItem === "peca" ? "var(--warning)" : "var(--accent)" }}>{it.tipoItem === "peca" ? "Peça" : "Serviço"}</span></td>
                            <td style={tdOS}>{it.item}</td>
                            <td style={tdOS}>{it.quantidade}</td>
                            <td style={tdOS}>{fmtBRL(it.valorUnitario)}</td>
                            <td style={tdOS}><strong>{fmtBRL(it.valorTotal)}</strong></td>
                            <td style={tdOS}><button type="button" onClick={() => removerItemEditLanc(idx)} title="Remover" style={{ display:"inline-flex", alignItems:"center", background:"transparent", border:"none", color:"var(--danger)", cursor:"pointer", fontWeight:700, fontSize:".9rem" }}><X size={15} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:8, fontSize:".95rem", color:"var(--accent)", fontWeight:700, background:"var(--success-bg)", border:"1px solid #86efac", borderRadius:8, padding:"8px 12px" }}>
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

              {erroEditLanc && <p style={s.erroMsg}>{erroEditLanc}</p>}

              <div style={s.formFooter}>
                <div style={{ flex:1 }} />
                <button type="button" style={s.cancelBtn} onClick={fecharEditLanc}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={salvandoEditLanc}>
                  {salvandoEditLanc ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────
const s = {
  wrap:        { minHeight:"100vh", background:"#f5f7fb" },

  // header
  header:      { background:"var(--header-bg)", color:"#fff", borderBottom: "1px solid var(--accent-800)", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 14px rgba(15,23,42,.18)" },
  headerTitle: { color:"#fff", fontSize:"1.15rem", fontWeight:700, margin:0, lineHeight:1.1 },
  alertaBadge: { background:"var(--danger)", color:"#fff", borderRadius:20, fontSize:".7rem", fontWeight:700, padding:"3px 10px", display:"inline-flex", alignItems:"center", gap:5 },
  backBtn:     { display:"inline-flex", alignItems:"center", gap:8, padding:"8px 14px", background:"var(--header-btn-bg)", border:"none", borderRadius:8, fontSize:".82rem", cursor:"pointer", color:"var(--accent)", fontWeight:700, whiteSpace:"nowrap", boxShadow:"0 1px 3px rgba(0,0,0,.1)" },

  // tabs
  tabBar:      { display:"flex", gap:0, background:"var(--card-bg)", borderBottom:"1px solid var(--border)", padding:"0 24px", boxShadow:"0 1px 3px rgba(15,23,42,.03)", overflowX:"auto" },
  tab:         { padding:"14px 18px", border:"none", borderBottom:"3px solid transparent", background:"none", cursor:"pointer", fontSize:".86rem", fontWeight:700, color:"var(--text-muted)", display:"flex", alignItems:"center", gap:8, fontFamily:"inherit", whiteSpace:"nowrap", transition:"color .15s, border-color .15s", outline:"none", WebkitTapHighlightColor:"transparent" },
  tabAtivo:    { color:"var(--accent)", borderBottomColor:"var(--accent)" },
  tabBadge:    { background:"var(--danger)", color:"#fff", borderRadius:20, fontSize:".64rem", fontWeight:800, padding:"2px 7px", minWidth:18, textAlign:"center", lineHeight:1.2 },

  // seletor veículo
  main:        { padding:"24px", maxWidth:1300, margin:"0 auto" },
  veiculoRow:  { display:"flex", alignItems:"center", gap:14, marginBottom:28, flexWrap:"wrap" },
  veiculoLabel:{ fontWeight:700, fontSize:".85rem", color:"var(--text)", whiteSpace:"nowrap" },
  veiculoSelect:{ padding:"10px 14px", border:"1px solid var(--border)", borderRadius:10, fontSize:".9rem", fontWeight:700, background:"var(--card-bg)", color:"var(--text)", cursor:"pointer", minWidth:200, boxShadow:"0 1px 3px rgba(15,23,42,.04)", fontFamily:"inherit" },
  resumoPills: { display:"flex", gap:6, flexWrap:"wrap" },
  rPill:       { padding:"3px 10px", borderRadius:20, fontSize:".72rem", fontWeight:700 },

  // grupo / tipo grid
  grupoSection:{ marginBottom:28 },
  grupoHeader: { display:"inline-block", padding:"4px 16px", borderRadius:20, fontSize:".78rem", fontWeight:700, marginBottom:12, border:"1px solid" },
  tipoGrid:    { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(270px, 1fr))", gap:14 },
  tipoCard:    { background:"var(--card-bg)", border:"1px solid", borderRadius:14, padding:"16px 18px", cursor:"pointer", display:"flex", flexDirection:"column", gap:6, transition:"transform .2s ease, box-shadow .2s ease", boxShadow:"0 1px 3px rgba(15,23,42,.05), 0 8px 24px -16px rgba(15,23,42,.10)" },
  tipoCardTop: { display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 },
  tipoNome:    { fontWeight:700, fontSize:".92rem", color:"var(--text)" },
  sPill:       { padding:"2px 9px", borderRadius:20, fontSize:".68rem", fontWeight:700, whiteSpace:"nowrap" },
  tipoDesc:    { fontSize:".75rem", color:"var(--text-muted)", lineHeight:1.4 },
  tipoMeta:    { display:"flex", flexDirection:"column", gap:3, marginTop:4, fontSize:".75rem", color:"var(--text-muted)" },
  tipoVazio:   { fontSize:".72rem", color:"var(--text-subtle)", fontStyle:"italic", marginTop:2 },

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
  tr:          { borderBottom:"1px solid #f1f5f9" },
  td:          { padding:"12px 16px", fontSize:".88rem", color:"var(--text)", verticalAlign:"middle" },
  statusBadge: { padding:"2px 10px", borderRadius:20, fontSize:".72rem", fontWeight:700 },
  osBadge:     { display:"inline-block", padding:"2px 9px", borderRadius:20, fontSize:".7rem", fontWeight:700, whiteSpace:"nowrap" },
  acoes:       { display:"flex", gap:6 },
  editBtn:     { padding:"4px 12px", background:"var(--accent-soft)", color:"var(--accent)", border:"none", borderRadius:5, cursor:"pointer", fontWeight:600, fontSize:".78rem" },

  // modal
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:16 },
  modal:       { background:"var(--card-bg)", borderRadius:14, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.25)" },
  modalHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"20px 24px 0", gap:12 },
  modalTitulo: { fontSize:"1.05rem", fontWeight:700, color:"var(--accent)", marginBottom:3 },
  modalSubtitulo:{ fontSize:".78rem", color:"var(--text-muted)", lineHeight:1.4 },
  closeBtn:    { display:"inline-flex", alignItems:"center", justifyContent:"center", background:"none", border:"none", fontSize:"1.1rem", cursor:"pointer", color:"var(--text-muted)", padding:"0 4px" },
  form:        { padding:24, display:"flex", flexDirection:"column", gap:14 },
  fieldLabel:  { display:"flex", flexDirection:"column", gap:5, fontSize:".85rem", fontWeight:600, color:"var(--text)" },
  fieldInput:  { padding:"8px 10px", border:"1px solid var(--border-strong)", borderRadius:6, fontSize:".9rem", outline:"none", fontFamily:"inherit", background:"var(--bg)", color:"var(--text)" },
  erroMsg:     { color:"var(--danger)", fontSize:".82rem", background:"var(--danger-bg)", padding:"6px 10px", borderRadius:6 },
  formFooter:  { display:"flex", gap:10, alignItems:"center", paddingTop:4 },
  cancelBtn:   { padding:"8px 20px", background:"var(--surface-3)", border:"1px solid var(--border-strong)", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:".85rem", color:"var(--text-muted)" },
  saveBtn:     { padding:"8px 24px", background:"var(--accent)", border:"none", borderRadius:6, cursor:"pointer", fontWeight:700, fontSize:".85rem", color:"#fff" },
};
