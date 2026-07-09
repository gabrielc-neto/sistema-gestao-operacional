// Aba "Lavagem/Calibragem" — dashboard consolidado só desses 2 itens.
// Layout inspirado na planilha "Controle Frota Lavagem Calibragem".
// Reutiliza registros/calcStatus da Manutenção — nenhuma migração de banco.

import { useState, useMemo } from "react";
import { Droplet, Gauge, Printer, Pen, RefreshCw } from "lucide-react";

const STATUS_COR = {
  vencido:  { bg: "#fef2f2", cor: "#991b1b", pt: "#dc2626", label: "VENCIDO" },
  alerta:   { bg: "#fef3c7", cor: "#78350f", pt: "#d97706", label: "ALERTA"  },
  ok:       { bg: "#dcfce7", cor: "#166534", pt: "#16a34a", label: "OK"      },
  sem_data: { bg: "#f1f5f9", cor: "#475569", pt: "#94a3b8", label: "SEM DADO"},
};

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },
  toolbar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", background: "#fff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" },
  input: { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: ".88rem", minWidth: 200 },
  select: { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: ".85rem", background: "#fff", fontWeight: 600 },
  btn: (cor) => ({ padding: "8px 14px", borderRadius: 8, background: cor, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }),
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 },
  kpiCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" },
  kpiTit: { fontSize: ".78rem", fontWeight: 800, color: "#1a3a5c", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 8 },
  kpiSemaforo: { display: "flex", gap: 10, flexWrap: "wrap" },
  kpiBadge: (st) => ({ flex: 1, minWidth: 90, background: STATUS_COR[st].bg, color: STATUS_COR[st].cor, borderRadius: 8, padding: "10px 12px", textAlign: "center" }),
  kpiN: { fontSize: "1.6rem", fontWeight: 900, lineHeight: 1 },
  kpiL: { fontSize: ".7rem", fontWeight: 700, letterSpacing: ".05em", marginTop: 3 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" },
  cardHead: { padding: "10px 14px", background: "#1a3a5c", color: "#fff", fontWeight: 800, fontSize: ".92rem" },
  tabela: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "8px 12px", textAlign: "left", fontSize: ".7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".04em", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" },
  td: { padding: "8px 12px", fontSize: ".82rem", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" },
  chip: (st) => ({ padding: "3px 8px", borderRadius: 20, background: STATUS_COR[st].bg, color: STATUS_COR[st].cor, fontSize: ".7rem", fontWeight: 800, whiteSpace: "nowrap" }),
  linkEditar: { background: "transparent", border: "1px solid #cbd5e1", cursor: "pointer", padding: "3px 8px", borderRadius: 6, fontSize: ".72rem", color: "#475569", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 },
  vazio: { padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: ".9rem" },
};

const normP = (p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const fmtDate = (iso) => iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "—";
const diasAte = (iso) => {
  if (!iso) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(iso + "T00:00:00") - hoje) / 86400000);
};
const chaveOrdem = { vencido: 0, alerta: 1, sem_data: 2, ok: 3 };

export default function AbaLavagemCalibragem({ veiculos, registros, TIPOS, calcStatus, onEditar }) {
  const [busca, setBusca] = useState("");
  const [filtroSt, setFiltroSt] = useState("todos");

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

  // Contadores por categoria
  const resumo = useMemo(() => {
    const acc = {
      lav: { vencido: 0, alerta: 0, ok: 0, sem_data: 0 },
      cal: { vencido: 0, alerta: 0, ok: 0, sem_data: 0 },
    };
    linhas.forEach(l => {
      acc.lav[l.lav.status] = (acc.lav[l.lav.status] || 0) + 1;
      acc.cal[l.cal.status] = (acc.cal[l.cal.status] || 0) + 1;
    });
    return acc;
  }, [linhas]);

  // Filtro + ordenação
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

  const imprimir = () => window.print();

  const CelStatus = ({ item, tipo }) => {
    if (!item.rec) return <span style={s.chip("sem_data")}>SEM DADO</span>;
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={s.chip(item.status)}>{STATUS_COR[item.status].label}</span>
        {item.dias !== null && (
          <span style={{ fontSize: ".72rem", color: STATUS_COR[item.status].cor, fontWeight: 700 }}>
            {item.dias < 0 ? `há ${Math.abs(item.dias)}d` : `em ${item.dias}d`}
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={s.wrap} className="lavcal-wrap">
      {/* Toolbar */}
      <div style={s.toolbar} className="no-print lavcal-toolbar">
        <input
          type="text"
          placeholder="Buscar placa ou modelo..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={s.input}
        />
        <select value={filtroSt} onChange={e => setFiltroSt(e.target.value)} style={s.select}>
          <option value="todos">Todos os status</option>
          <option value="vencido">Só vencidos</option>
          <option value="alerta">Só em alerta</option>
          <option value="ok">Só OK</option>
          <option value="sem_data">Só sem dado</option>
        </select>
        <span style={{ fontSize: ".8rem", color: "#64748b", fontWeight: 600 }}>
          {linhasFiltradas.length} de {linhas.length}
        </span>
        <button style={{ ...s.btn("#1a3a5c"), marginLeft: "auto" }} onClick={imprimir}>
          <Printer size={15} /> Imprimir
        </button>
      </div>

      {/* KPIs semáforo — 2 blocos lado a lado */}
      <div style={s.kpiRow} className="lavcal-kpi">
        <div style={s.kpiCard}>
          <div style={s.kpiTit}><Droplet size={16} color="#0891b2" /> Lavagem e Lubrificação</div>
          <div style={s.kpiSemaforo}>
            <div style={s.kpiBadge("ok")}>       <div style={s.kpiN}>{resumo.lav.ok}</div>       <div style={s.kpiL}>OK</div>       </div>
            <div style={s.kpiBadge("alerta")}>   <div style={s.kpiN}>{resumo.lav.alerta}</div>   <div style={s.kpiL}>ALERTA</div>   </div>
            <div style={s.kpiBadge("vencido")}>  <div style={s.kpiN}>{resumo.lav.vencido}</div>  <div style={s.kpiL}>VENCIDO</div>  </div>
            <div style={s.kpiBadge("sem_data")}> <div style={s.kpiN}>{resumo.lav.sem_data}</div> <div style={s.kpiL}>SEM DADO</div> </div>
          </div>
        </div>
        <div style={s.kpiCard}>
          <div style={s.kpiTit}><Gauge size={16} color="#dc2626" /> Calibragem de Pneus</div>
          <div style={s.kpiSemaforo}>
            <div style={s.kpiBadge("ok")}>       <div style={s.kpiN}>{resumo.cal.ok}</div>       <div style={s.kpiL}>OK</div>       </div>
            <div style={s.kpiBadge("alerta")}>   <div style={s.kpiN}>{resumo.cal.alerta}</div>   <div style={s.kpiL}>ALERTA</div>   </div>
            <div style={s.kpiBadge("vencido")}>  <div style={s.kpiN}>{resumo.cal.vencido}</div>  <div style={s.kpiL}>VENCIDO</div>  </div>
            <div style={s.kpiBadge("sem_data")}> <div style={s.kpiN}>{resumo.cal.sem_data}</div> <div style={s.kpiL}>SEM DADO</div> </div>
          </div>
        </div>
      </div>

      {/* Tabela consolidada */}
      <div style={s.card}>
        <div style={s.cardHead}>Acompanhamento consolidado por veículo</div>
        {linhasFiltradas.length === 0 ? (
          <div style={s.vazio}>Nenhum veículo encontrado com esse filtro.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={s.tabela}>
              <thead>
                <tr>
                  <th style={s.th}>Placa</th>
                  <th style={s.th} className="hide-mobile">Modelo</th>
                  <th style={s.th}>Última Lavagem</th>
                  <th style={s.th}>Próx. Venc.</th>
                  <th style={s.th}>Status Lavagem</th>
                  <th style={s.th} className="no-print"></th>
                  <th style={s.th}>Última Calibragem</th>
                  <th style={s.th}>Próx. Venc.</th>
                  <th style={s.th}>Status Calibragem</th>
                  <th style={s.th} className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.map(l => (
                  <tr key={l.placa}>
                    <td style={{ ...s.td, fontWeight: 800, color: "#1a3a5c", fontFamily: "monospace" }}>{l.placa}</td>
                    <td style={{ ...s.td, color: "#64748b", fontSize: ".78rem" }} className="hide-mobile">{l.modelo}</td>
                    <td style={s.td}>{fmtDate(l.lav.rec?.data_realiz)}</td>
                    <td style={{ ...s.td, fontWeight: 700 }}>{fmtDate(l.lav.rec?.venc)}</td>
                    <td style={s.td}><CelStatus item={l.lav} tipo="lavagem" /></td>
                    <td style={s.td} className="no-print">
                      <button style={s.linkEditar} onClick={() => onEditar && tipoLav && onEditar(l.placa, tipoLav)} title="Lançar/editar lavagem">
                        <Pen size={11} /> {l.lav.rec ? "Editar" : "Lançar"}
                      </button>
                    </td>
                    <td style={s.td}>{fmtDate(l.cal.rec?.data_realiz)}</td>
                    <td style={{ ...s.td, fontWeight: 700 }}>{fmtDate(l.cal.rec?.venc)}</td>
                    <td style={s.td}><CelStatus item={l.cal} tipo="calibragem" /></td>
                    <td style={s.td} className="no-print">
                      <button style={s.linkEditar} onClick={() => onEditar && tipoCal && onEditar(l.placa, tipoCal)} title="Lançar/editar calibragem">
                        <Pen size={11} /> {l.cal.rec ? "Editar" : "Lançar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
