// Aba "Lavagem/Calibragem" — dashboard corporativo dedicado.
// Reutiliza registros/calcStatus da Manutenção — nenhuma migração de banco.

import { useState, useMemo } from "react";
import { Search, Printer, Pencil, Droplet, Gauge, ChevronDown } from "lucide-react";

const STATUS = {
  vencido:  { txt: "#b91c1c", bar: "#dc2626", label: "Vencido"    },
  alerta:   { txt: "#a16207", bar: "#eab308", label: "Alerta"     },
  ok:       { txt: "#15803d", bar: "#22c55e", label: "OK"         },
  sem_data: { txt: "#64748b", bar: "#cbd5e1", label: "Sem dado"   },
};

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },

  // Header compacto: título à esquerda, resumo à direita
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" },
  headTit: { display: "flex", flexDirection: "column", gap: 2 },
  h1: { margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-.01em" },
  h2: { margin: 0, fontSize: ".78rem", color: "#64748b", fontWeight: 500 },

  // Toolbar sóbria
  toolbar: { display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "8px 10px", borderRadius: 10, border: "1px solid #e2e8f0", flexWrap: "wrap" },
  searchWrap: { position: "relative", flex: "1 1 260px", minWidth: 200 },
  searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" },
  input: { width: "100%", padding: "7px 10px 7px 34px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontFamily: "inherit", fontSize: ".88rem", color: "#0f172a", outline: "none" },
  select: { padding: "7px 28px 7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontFamily: "inherit", fontSize: ".85rem", color: "#0f172a", fontWeight: 600, appearance: "none", cursor: "pointer" },
  btn: { padding: "7px 12px", borderRadius: 8, background: "#0f172a", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: ".84rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 },
  counter: { fontSize: ".78rem", color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" },

  // KPI: linha horizontal enxuta com barra de distribuição
  kpiRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  kpiCard: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 },
  kpiTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  kpiTit: { fontSize: ".76rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: ".05em", display: "inline-flex", alignItems: "center", gap: 8 },
  kpiTotal: { fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  kpiBar: { display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "#f1f5f9" },
  kpiLegenda: { display: "flex", gap: 14, flexWrap: "wrap", fontSize: ".75rem" },
  kpiLegItem: { display: "inline-flex", alignItems: "center", gap: 5, color: "#475569" },
  kpiSeg: (cor) => ({ background: cor }),
  kpiDot: (cor) => ({ width: 8, height: 8, borderRadius: 2, background: cor }),
  kpiNumInline: { fontWeight: 700, color: "#0f172a", fontVariantNumeric: "tabular-nums" },

  // Tabela densa
  tableWrap: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" },
  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" },
  thGrupo: { padding: "8px 14px", fontSize: ".68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" },
  th: { padding: "9px 14px", fontSize: ".7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", whiteSpace: "nowrap" },
  td: { padding: "10px 14px", fontSize: ".84rem", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle", color: "#0f172a" },
  tdPlaca: { fontFamily: "'JetBrains Mono', 'Menlo', 'Consolas', monospace", fontWeight: 700, color: "#0f172a", letterSpacing: ".02em" },
  tdModelo: { color: "#64748b", fontSize: ".78rem" },
  tdData: { color: "#475569", whiteSpace: "nowrap" },
  tdVenc: { fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" },
  tdEmpty: { color: "#cbd5e1" },
  divBloco: { borderLeft: "1px solid #e2e8f0" },

  // Chip status estilo Linear/Notion: só cor e borda, sem fundo pesado
  chip: (st) => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "2px 8px", borderRadius: 6,
    border: `1px solid ${STATUS[st].bar}33`,
    background: `${STATUS[st].bar}0F`,
    color: STATUS[st].txt,
    fontSize: ".74rem", fontWeight: 700,
    whiteSpace: "nowrap",
  }),
  chipDot: (st) => ({ width: 6, height: 6, borderRadius: "50%", background: STATUS[st].bar }),
  chipDias: (st) => ({ fontSize: ".72rem", color: STATUS[st].txt, fontWeight: 600, marginLeft: 6, whiteSpace: "nowrap" }),

  btnEditar: {
    padding: "4px 8px", borderRadius: 6, background: "transparent", border: "1px solid transparent",
    color: "#64748b", cursor: "pointer", fontFamily: "inherit", fontSize: ".76rem", fontWeight: 600,
    display: "inline-flex", alignItems: "center", gap: 4,
    transition: "all .12s",
  },

  vazio: { padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: ".9rem" },
};

const normP = (p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const fmtDate = (iso) => iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : null;
const diasAte = (iso) => {
  if (!iso) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(iso + "T00:00:00") - hoje) / 86400000);
};
const chaveOrdem = { vencido: 0, alerta: 1, sem_data: 2, ok: 3 };

// KPI compacto — total no topo, barra de distribuição, legenda
function KpiCard({ icone: Icone, cor, titulo, contagem, total }) {
  const segs = ["vencido", "alerta", "ok", "sem_data"];
  return (
    <div style={s.kpiCard}>
      <div style={s.kpiTop}>
        <div style={s.kpiTit}><Icone size={14} color={cor} /> {titulo}</div>
        <div style={s.kpiTotal}>{total}</div>
      </div>
      <div style={s.kpiBar}>
        {segs.map(st => {
          const n = contagem[st] || 0;
          const pct = total > 0 ? (n / total) * 100 : 0;
          if (pct === 0) return null;
          return <div key={st} style={{ ...s.kpiSeg(STATUS[st].bar), width: pct + "%" }} title={`${STATUS[st].label}: ${n}`} />;
        })}
      </div>
      <div style={s.kpiLegenda}>
        {segs.map(st => (
          <span key={st} style={s.kpiLegItem}>
            <span style={s.kpiDot(STATUS[st].bar)} />
            {STATUS[st].label}
            <span style={s.kpiNumInline}>{contagem[st] || 0}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CelStatus({ item }) {
  if (!item.rec) return <span style={s.chip("sem_data")}><span style={s.chipDot("sem_data")} /> Sem dado</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      <span style={s.chip(item.status)}>
        <span style={s.chipDot(item.status)} />
        {STATUS[item.status].label}
      </span>
      {item.dias !== null && (
        <span style={s.chipDias(item.status)}>
          {item.dias < 0 ? `há ${Math.abs(item.dias)}d` : item.dias === 0 ? "hoje" : `em ${item.dias}d`}
        </span>
      )}
    </span>
  );
}

export default function AbaLavagemCalibragem({ veiculos, registros, TIPOS, calcStatus, onEditar }) {
  const [busca, setBusca] = useState("");
  const [filtroSt, setFiltroSt] = useState("todos");
  const [hoverRow, setHoverRow] = useState(null);

  const tipoLav = TIPOS.find(t => t.id === "lavagem");
  const tipoCal = TIPOS.find(t => t.id === "calibragem");

  const linhas = useMemo(() => {
    const cavalos = veiculos
      .filter(v => v.tipo !== "carreta")
      .slice()
      .sort((a, b) => (a.placa || "").localeCompare(b.placa || ""));
    return cavalos.map(v => {
      const pN = normP(v.placa);
      const recLav = registros[`${pN}__lavagem`] || null;
      const recCal = registros[`${pN}__calibragem`] || null;
      const stLav = calcStatus(recLav?.venc);
      const stCal = calcStatus(recCal?.venc);
      return {
        placa: v.placa,
        modelo: v.modelo || "",
        lav: { rec: recLav, status: stLav, dias: recLav?.venc ? diasAte(recLav.venc) : null },
        cal: { rec: recCal, status: stCal, dias: recCal?.venc ? diasAte(recCal.venc) : null },
      };
    });
  }, [veiculos, registros, calcStatus]);

  const resumo = useMemo(() => {
    const acc = { lav: { vencido: 0, alerta: 0, ok: 0, sem_data: 0 }, cal: { vencido: 0, alerta: 0, ok: 0, sem_data: 0 } };
    linhas.forEach(l => {
      acc.lav[l.lav.status] = (acc.lav[l.lav.status] || 0) + 1;
      acc.cal[l.cal.status] = (acc.cal[l.cal.status] || 0) + 1;
    });
    return acc;
  }, [linhas]);

  const linhasFiltradas = useMemo(() => {
    const q = busca.trim().toUpperCase();
    return linhas
      .filter(l => {
        if (q && !normP(l.placa).includes(normP(q)) && !l.modelo.toUpperCase().includes(q)) return false;
        if (filtroSt !== "todos") {
          if (l.lav.status !== filtroSt && l.cal.status !== filtroSt) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const critA = Math.min(chaveOrdem[a.lav.status] ?? 4, chaveOrdem[a.cal.status] ?? 4);
        const critB = Math.min(chaveOrdem[b.lav.status] ?? 4, chaveOrdem[b.cal.status] ?? 4);
        if (critA !== critB) return critA - critB;
        const daysA = Math.min(a.lav.dias ?? 9e9, a.cal.dias ?? 9e9);
        const daysB = Math.min(b.lav.dias ?? 9e9, b.cal.dias ?? 9e9);
        return daysA - daysB;
      });
  }, [linhas, busca, filtroSt]);

  const totalLav = resumo.lav.vencido + resumo.lav.alerta + resumo.lav.ok + resumo.lav.sem_data;
  const totalCal = resumo.cal.vencido + resumo.cal.alerta + resumo.cal.ok + resumo.cal.sem_data;

  return (
    <div style={s.wrap} className="lavcal-wrap">
      {/* Header enxuto */}
      <div style={s.head} className="no-print">
        <div style={s.headTit}>
          <h1 style={s.h1}>Lavagem e Calibragem</h1>
          <p style={s.h2}>Controle de rotina — 35 dias entre lavagens, 10 dias entre calibragens</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={s.kpiRow} className="lavcal-kpi">
        <KpiCard icone={Droplet} cor="#0891b2" titulo="Lavagem e lubrificação" contagem={resumo.lav} total={totalLav} />
        <KpiCard icone={Gauge}   cor="#dc2626" titulo="Calibragem de pneus"    contagem={resumo.cal} total={totalCal} />
      </div>

      {/* Toolbar */}
      <div style={s.toolbar} className="no-print lavcal-toolbar">
        <div style={s.searchWrap}>
          <Search size={14} style={s.searchIcon} />
          <input
            type="text"
            placeholder="Buscar placa ou modelo…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={s.input}
          />
        </div>
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <select value={filtroSt} onChange={e => setFiltroSt(e.target.value)} style={s.select}>
            <option value="todos">Todos os status</option>
            <option value="vencido">Vencidos</option>
            <option value="alerta">Em alerta</option>
            <option value="ok">Em dia</option>
            <option value="sem_data">Sem registro</option>
          </select>
          <ChevronDown size={14} style={{ position: "absolute", right: 8, pointerEvents: "none", color: "#64748b" }} />
        </div>
        <span style={s.counter}>{linhasFiltradas.length} de {linhas.length}</span>
        <button style={{ ...s.btn, marginLeft: "auto" }} onClick={() => window.print()}>
          <Printer size={14} /> Imprimir
        </button>
      </div>

      {/* Tabela */}
      <div style={s.tableWrap}>
        {linhasFiltradas.length === 0 ? (
          <div style={s.vazio}>Nenhum veículo encontrado com esse filtro.</div>
        ) : (
          <div style={s.tableScroll}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.thGrupo} colSpan={2}>Veículo</th>
                  <th style={{ ...s.thGrupo, ...s.divBloco }} colSpan={3}>Lavagem e Lubrificação</th>
                  <th style={{ ...s.thGrupo, ...s.divBloco }} colSpan={3}>Calibragem de Pneus</th>
                </tr>
                <tr>
                  <th style={s.th}>Placa</th>
                  <th style={s.th} className="hide-mobile">Modelo</th>
                  <th style={{ ...s.th, ...s.divBloco }}>Última</th>
                  <th style={s.th}>Vencimento</th>
                  <th style={s.th}>Status</th>
                  <th style={{ ...s.th, ...s.divBloco }}>Última</th>
                  <th style={s.th}>Vencimento</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.map((l, idx) => {
                  const hover = hoverRow === idx;
                  return (
                    <tr
                      key={l.placa}
                      onMouseEnter={() => setHoverRow(idx)}
                      onMouseLeave={() => setHoverRow(null)}
                      style={hover ? { background: "#f8fafc" } : {}}
                    >
                      <td style={{ ...s.td, ...s.tdPlaca }}>{l.placa}</td>
                      <td style={{ ...s.td, ...s.tdModelo }} className="hide-mobile">{l.modelo}</td>

                      {/* Lavagem */}
                      <td style={{ ...s.td, ...s.tdData, ...s.divBloco }}>
                        {l.lav.rec?.data_realiz ? fmtDate(l.lav.rec.data_realiz) : <span style={s.tdEmpty}>—</span>}
                      </td>
                      <td style={{ ...s.td, ...s.tdVenc }}>
                        {l.lav.rec?.venc ? fmtDate(l.lav.rec.venc) : <span style={s.tdEmpty}>—</span>}
                      </td>
                      <td style={s.td}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CelStatus item={l.lav} />
                          <button
                            style={{ ...s.btnEditar, opacity: hover ? 1 : 0, background: hover ? "#f1f5f9" : "transparent" }}
                            onClick={() => onEditar && tipoLav && onEditar(l.placa, tipoLav)}
                            title={l.lav.rec ? "Editar lavagem" : "Lançar lavagem"}
                            className="no-print"
                          >
                            <Pencil size={12} />
                          </button>
                        </span>
                      </td>

                      {/* Calibragem */}
                      <td style={{ ...s.td, ...s.tdData, ...s.divBloco }}>
                        {l.cal.rec?.data_realiz ? fmtDate(l.cal.rec.data_realiz) : <span style={s.tdEmpty}>—</span>}
                      </td>
                      <td style={{ ...s.td, ...s.tdVenc }}>
                        {l.cal.rec?.venc ? fmtDate(l.cal.rec.venc) : <span style={s.tdEmpty}>—</span>}
                      </td>
                      <td style={s.td}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CelStatus item={l.cal} />
                          <button
                            style={{ ...s.btnEditar, opacity: hover ? 1 : 0, background: hover ? "#f1f5f9" : "transparent" }}
                            onClick={() => onEditar && tipoCal && onEditar(l.placa, tipoCal)}
                            title={l.cal.rec ? "Editar calibragem" : "Lançar calibragem"}
                            className="no-print"
                          >
                            <Pencil size={12} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
