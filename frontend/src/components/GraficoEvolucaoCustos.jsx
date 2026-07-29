import { useState, useEffect, useMemo } from "react";
import { listAll as dsList } from "../services/manutencaoDataSource";
import { TrendingUp } from "lucide-react";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmtBRL(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
}
function fmtCurto(n) {
  const v = Number(n) || 0;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(".", ",")}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return String(Math.round(v));
}

// Gráfico de linha marcada — evolução mensal (mesmo visual do dashboard de manutenção)
function LinhaCustos({ meses, fmt }) {
  const W = 720, H = 220, padL = 46, padR = 16, padT = 14, padB = 28;
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
            <text x={padL - 8} y={yy + 3} textAnchor="end" fontSize="9" fill="var(--text-subtle)">{fmtCurto(max * g)}</text>
          </g>
        );
      })}
      <path d={dArea} fill="var(--accent)" opacity=".10" />
      <path d={dLine} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3.6" fill="var(--card-bg)" stroke="var(--accent)" strokeWidth="2" />
          <text x={p[0]} y={H - 9} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{MESES[meses[i].mes]}</text>
          <title>{`${MESES[meses[i].mes]}: ${fmt(meses[i].valor)}`}</title>
        </g>
      ))}
    </svg>
  );
}

export default function GraficoEvolucaoCustos({ style }) {
  const [lancamentos, setLancamentos] = useState([]);
  const [ano, setAno] = useState(() => new Date().getFullYear());

  useEffect(() => {
    dsList("lancamentos_os")
      .then(rows => setLancamentos(rows))
      .catch(() => {});
  }, []);

  const anos = useMemo(() => {
    const s = new Set();
    lancamentos.forEach(l => { const d = new Date(l.criadoEm || l.dataHora || l.data_emissao || l.created_at); if (!isNaN(d)) s.add(d.getFullYear()); });
    s.add(new Date().getFullYear());
    return [...s].sort((a, b) => b - a);
  }, [lancamentos]);

  useEffect(() => { if (anos.length && !anos.includes(ano)) setAno(anos[0]); }, [anos]); // eslint-disable-line

  const meses = useMemo(() => {
    const arr = Array.from({ length: 12 }, (_, m) => ({ mes: m, valor: 0 }));
    lancamentos.forEach(l => {
      const d = new Date(l.criadoEm || l.dataHora || l.data_emissao || l.created_at);
      if (!isNaN(d) && d.getFullYear() === ano) arr[d.getMonth()].valor += Number(l.valorTotal ?? l.valor_total) || 0;
    });
    return arr;
  }, [lancamentos, ano]);

  const total = meses.reduce((s, m) => s + m.valor, 0);

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-sm)", padding: "14px 16px", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <TrendingUp size={16} color="var(--tech)" />
        <span style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--text)" }}>Evolução de custos mensais</span>
        <span style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>
          Total {ano}: <strong style={{ color: "var(--text)" }}>{fmtBRL(total)}</strong>
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--text-muted)" }}>Ano</label>
          <select
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
            style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", fontSize: ".82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            {anos.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <LinhaCustos meses={meses} fmt={fmtBRL} />
    </div>
  );
}
