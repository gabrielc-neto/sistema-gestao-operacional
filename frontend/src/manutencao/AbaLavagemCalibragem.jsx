// Aba "Lavagem/Calibragem" — dashboard dedicado.
// v2: filtros independentes por coluna + visual mais limpo.

import { useState, useMemo } from "react";
import { Search, Printer, Pencil, Droplet, Gauge } from "lucide-react";

const STATUS = {
  vencido:  { txt: "#b91c1c", bg: "#fef2f2", label: "Vencido"    },
  alerta:   { txt: "#a16207", bg: "#fffbeb", label: "Alerta"     },
  ok:       { txt: "#15803d", bg: "#f0fdf4", label: "OK"         },
  sem_data: { txt: "#94a3b8", bg: "#f8fafc", label: "Sem dado"   },
};

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },

  head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" },
  h1: { margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-.01em" },
  h2: { margin: "2px 0 0", fontSize: ".78rem", color: "#64748b", fontWeight: 500 },

  // KPI simples: total + 4 números pequenos
  kpiRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  kpiCard: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "14px 18px" },
  kpiHead: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 },
  kpiTit: { fontSize: ".82rem", fontWeight: 700, color: "#334155", display: "inline-flex", alignItems: "center", gap: 8 },
  kpiTotal: { fontSize: ".78rem", color: "#94a3b8", fontVariantNumeric: "tabular-nums" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  kpiSlot: (st) => ({
    padding: "8px 10px", borderRadius: 8, background: STATUS[st].bg,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  }),
  kpiN: (st) => ({ fontSize: "1.2rem", fontWeight: 800, color: STATUS[st].txt, lineHeight: 1, fontVariantNumeric: "tabular-nums" }),
  kpiL: (st) => ({ fontSize: ".65rem", fontWeight: 700, color: STATUS[st].txt, textTransform: "uppercase", letterSpacing: ".05em" }),

  // Toolbar
  toolbar: { display: "flex", alignItems: "center", gap: 10, background: "#fff", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", flexWrap: "wrap" },
  searchWrap: { position: "relative", flex: "1 1 220px", minWidth: 180 },
  searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" },
  input: { width: "100%", padding: "8px 10px 8px 32px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontFamily: "inherit", fontSize: ".88rem", color: "#0f172a", outline: "none" },
  filtGrupo: { display: "flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" },
  filtLbl: { fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" },
  select: { padding: "5px 8px", borderRadius: 6, border: "1px solid transparent", background: "transparent", fontFamily: "inherit", fontSize: ".82rem", color: "#0f172a", fontWeight: 700, cursor: "pointer" },
  btn: { padding: "8px 14px", borderRadius: 8, background: "#0f172a", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: ".84rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 },
  counter: { fontSize: ".78rem", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" },

  // Tabela
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
  zebra: { background: "#fafcff" },

  // Chip clean
  chip: (st) => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "3px 9px", borderRadius: 6,
    background: STATUS[st].bg,
    color: STATUS[st].txt,
    fontSize: ".74rem", fontWeight: 700,
    whiteSpace: "nowrap",
  }),
  chipDot: (st) => ({ width: 6, height: 6, borderRadius: "50%", background: STATUS[st].txt }),
  chipDias: (st) => ({ fontSize: ".72rem", color: STATUS[st].txt, fontWeight: 600, marginLeft: 6, whiteSpace: "nowrap" }),

  btnEditar: {
    padding: "5px 8px", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0",
    color: "#475569", cursor: "pointer", fontFamily: "inherit", fontSize: ".76rem", fontWeight: 600,
    display: "inline-flex", alignItems: "center", gap: 4,
    marginLeft: 8,
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

function CelStatus({ item }) {
  if (!item.rec) return <span style={s.chip("sem_data")}><span style={s.chipDot("sem_data")} />Sem dado</span>;
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
  const [filtroLav, setFiltroLav] = useState("todos");
  const [filtroCal, setFiltroCal] = useState("todos");

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
        // Filtros INDEPENDENTES por coluna (AND) — só passa se AMBAS as colunas atendem
        if (filtroLav !== "todos" && l.lav.status !== filtroLav) return false;
        if (filtroCal !== "todos" && l.cal.status !== filtroCal) return false;
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
  }, [linhas, busca, filtroLav, filtroCal]);

  const totalLav = resumo.lav.vencido + resumo.lav.alerta + resumo.lav.ok + resumo.lav.sem_data;
  const totalCal = resumo.cal.vencido + resumo.cal.alerta + resumo.cal.ok + resumo.cal.sem_data;

  const KpiCard = ({ Icone, cor, titulo, contagem, total }) => (
    <div style={s.kpiCard}>
      <div style={s.kpiHead}>
        <div style={s.kpiTit}><Icone size={14} color={cor} /> {titulo}</div>
        <div style={s.kpiTotal}>{total} veículos</div>
      </div>
      <div style={s.kpiGrid}>
        {["vencido","alerta","ok","sem_data"].map(st => (
          <div key={st} style={s.kpiSlot(st)}>
            <div style={s.kpiN(st)}>{contagem[st] || 0}</div>
            <div style={s.kpiL(st)}>{STATUS[st].label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={s.wrap} className="lavcal-wrap">
      <div style={s.head} className="no-print">
        <div>
          <h1 style={s.h1}>Lavagem e Calibragem</h1>
          <p style={s.h2}>Controle de rotina — 35 dias entre lavagens, 10 dias entre calibragens</p>
        </div>
      </div>

      <div style={s.kpiRow} className="lavcal-kpi">
        <KpiCard Icone={Droplet} cor="#0891b2" titulo="Lavagem e lubrificação" contagem={resumo.lav} total={totalLav} />
        <KpiCard Icone={Gauge}   cor="#dc2626" titulo="Calibragem de pneus"    contagem={resumo.cal} total={totalCal} />
      </div>

      {/* Toolbar com 2 filtros INDEPENDENTES por coluna */}
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
        <div style={s.filtGrupo}>
          <Droplet size={13} color="#0891b2" />
          <span style={s.filtLbl}>Lavagem</span>
          <select value={filtroLav} onChange={e => setFiltroLav(e.target.value)} style={s.select}>
            <option value="todos">Todos</option>
            <option value="vencido">Vencido</option>
            <option value="alerta">Alerta</option>
            <option value="ok">OK</option>
            <option value="sem_data">Sem dado</option>
          </select>
        </div>
        <div style={s.filtGrupo}>
          <Gauge size={13} color="#dc2626" />
          <span style={s.filtLbl}>Calibragem</span>
          <select value={filtroCal} onChange={e => setFiltroCal(e.target.value)} style={s.select}>
            <option value="todos">Todos</option>
            <option value="vencido">Vencido</option>
            <option value="alerta">Alerta</option>
            <option value="ok">OK</option>
            <option value="sem_data">Sem dado</option>
          </select>
        </div>
        <span style={s.counter}>{linhasFiltradas.length} de {linhas.length}</span>
        <button style={{ ...s.btn, marginLeft: "auto" }} onClick={() => window.print()}>
          <Printer size={14} /> Imprimir
        </button>
      </div>

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
                  const rowStyle = idx % 2 === 1 ? s.zebra : {};
                  return (
                    <tr key={l.placa} style={rowStyle}>
                      <td style={{ ...s.td, ...s.tdPlaca }}>{l.placa}</td>
                      <td style={{ ...s.td, ...s.tdModelo }} className="hide-mobile">{l.modelo}</td>

                      <td style={{ ...s.td, ...s.tdData, ...s.divBloco }}>
                        {l.lav.rec?.data_realiz ? fmtDate(l.lav.rec.data_realiz) : <span style={s.tdEmpty}>—</span>}
                      </td>
                      <td style={{ ...s.td, ...s.tdVenc }}>
                        {l.lav.rec?.venc ? fmtDate(l.lav.rec.venc) : <span style={s.tdEmpty}>—</span>}
                      </td>
                      <td style={s.td}>
                        <CelStatus item={l.lav} />
                        <button
                          style={s.btnEditar}
                          onClick={() => onEditar && tipoLav && onEditar(l.placa, tipoLav)}
                          title={l.lav.rec ? "Editar lavagem" : "Lançar lavagem"}
                          className="no-print"
                        >
                          <Pencil size={11} />
                        </button>
                      </td>

                      <td style={{ ...s.td, ...s.tdData, ...s.divBloco }}>
                        {l.cal.rec?.data_realiz ? fmtDate(l.cal.rec.data_realiz) : <span style={s.tdEmpty}>—</span>}
                      </td>
                      <td style={{ ...s.td, ...s.tdVenc }}>
                        {l.cal.rec?.venc ? fmtDate(l.cal.rec.venc) : <span style={s.tdEmpty}>—</span>}
                      </td>
                      <td style={s.td}>
                        <CelStatus item={l.cal} />
                        <button
                          style={s.btnEditar}
                          onClick={() => onEditar && tipoCal && onEditar(l.placa, tipoCal)}
                          title={l.cal.rec ? "Editar calibragem" : "Lançar calibragem"}
                          className="no-print"
                        >
                          <Pencil size={11} />
                        </button>
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
