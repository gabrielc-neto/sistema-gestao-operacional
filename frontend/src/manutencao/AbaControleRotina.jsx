// Componente genérico para abas de "controle de rotina" — 1 tipo por vez.
// Usado para Lavagem, Calibragem e Lubrificação separadamente.

import { useState, useMemo } from "react";
import { Search, Printer, Pencil, Plus } from "lucide-react";

const STATUS = {
  vencido:  { txt: "#b91c1c", bg: "#fef2f2", label: "Vencido"  },
  alerta:   { txt: "#a16207", bg: "#fffbeb", label: "Alerta"   },
  ok:       { txt: "#15803d", bg: "#f0fdf4", label: "OK"       },
  sem_data: { txt: "#94a3b8", bg: "#f8fafc", label: "Sem dado" },
};
const chaveOrdem = { vencido: 0, alerta: 1, sem_data: 2, ok: 3 };

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" },
  h1: { margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-.01em", display: "inline-flex", alignItems: "center", gap: 10 },
  h2: { margin: "3px 0 0", fontSize: ".8rem", color: "#64748b", fontWeight: 500 },

  kpiRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  kpiSlot: (st) => ({
    background: STATUS[st].bg, borderRadius: 10, padding: "14px 16px",
    display: "flex", flexDirection: "column", gap: 4,
    border: "1px solid " + STATUS[st].txt + "22",
  }),
  kpiN: (st) => ({ fontSize: "1.6rem", fontWeight: 800, color: STATUS[st].txt, lineHeight: 1, fontVariantNumeric: "tabular-nums" }),
  kpiL: (st) => ({ fontSize: ".72rem", fontWeight: 700, color: STATUS[st].txt, textTransform: "uppercase", letterSpacing: ".05em" }),

  toolbar: { display: "flex", alignItems: "center", gap: 10, background: "#fff", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", flexWrap: "wrap" },
  searchWrap: { position: "relative", flex: "1 1 240px", minWidth: 180 },
  searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" },
  input: { width: "100%", padding: "8px 10px 8px 32px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontFamily: "inherit", fontSize: ".88rem", color: "#0f172a", outline: "none" },
  select: { padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontFamily: "inherit", fontSize: ".85rem", color: "#0f172a", fontWeight: 600, cursor: "pointer" },
  btn: { padding: "8px 14px", borderRadius: 8, background: "#0f172a", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: ".84rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 },
  counter: { fontSize: ".78rem", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" },

  tableWrap: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" },
  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" },
  th: { padding: "9px 14px", fontSize: ".7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", whiteSpace: "nowrap" },
  td: { padding: "10px 14px", fontSize: ".86rem", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle", color: "#0f172a" },
  tdPlaca: { fontFamily: "'JetBrains Mono', 'Menlo', 'Consolas', monospace", fontWeight: 700, color: "#0f172a", letterSpacing: ".02em" },
  tdModelo: { color: "#64748b", fontSize: ".78rem" },
  tdData: { color: "#475569", whiteSpace: "nowrap" },
  tdVenc: { fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" },
  tdEmpty: { color: "#cbd5e1" },
  zebra: { background: "#fafcff" },

  chip: (st) => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "3px 9px", borderRadius: 6,
    background: STATUS[st].bg, color: STATUS[st].txt,
    fontSize: ".74rem", fontWeight: 700, whiteSpace: "nowrap",
  }),
  chipDot: (st) => ({ width: 6, height: 6, borderRadius: "50%", background: STATUS[st].txt }),
  chipDias: (st) => ({ fontSize: ".72rem", color: STATUS[st].txt, fontWeight: 600, marginLeft: 6, whiteSpace: "nowrap" }),

  btnAcao: { padding: "5px 10px", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 },
  btnLancar: { padding: "5px 10px", borderRadius: 6, background: "#0f172a", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 },
  vazio: { padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: ".9rem" },
};

const normP = (p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const fmtDate = (iso) => iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : null;
const diasAte = (iso) => {
  if (!iso) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(iso + "T00:00:00") - hoje) / 86400000);
};

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

/**
 * Props:
 * - tipoId: string ("lavagem" | "calibragem" | "lubrificacao")
 * - titulo, subtitulo, cor, Icone
 * - veiculos, registros, TIPOS, calcStatus
 * - onEditar(placa, tipoObj)
 */
export default function AbaControleRotina({
  tipoId, titulo, subtitulo, cor, Icone,
  veiculos, registros, TIPOS, calcStatus, onEditar,
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const tipoObj = TIPOS.find(t => t.id === tipoId);

  const linhas = useMemo(() => {
    const cavalos = veiculos
      .filter(v => v.tipo !== "carreta")
      .slice()
      .sort((a, b) => (a.placa || "").localeCompare(b.placa || ""));
    return cavalos.map(v => {
      const pN = normP(v.placa);
      const rec = registros[`${pN}__${tipoId}`] || null;
      const status = calcStatus(rec?.venc);
      const dias = rec?.venc ? diasAte(rec.venc) : null;
      return { placa: v.placa, modelo: v.modelo || "", item: { rec, status, dias } };
    });
  }, [veiculos, registros, calcStatus, tipoId]);

  const resumo = useMemo(() => {
    const acc = { vencido: 0, alerta: 0, ok: 0, sem_data: 0 };
    linhas.forEach(l => { acc[l.item.status] = (acc[l.item.status] || 0) + 1; });
    return acc;
  }, [linhas]);

  const linhasFiltradas = useMemo(() => {
    const q = busca.trim().toUpperCase();
    return linhas
      .filter(l => {
        if (q && !normP(l.placa).includes(normP(q)) && !l.modelo.toUpperCase().includes(q)) return false;
        if (filtro !== "todos" && l.item.status !== filtro) return false;
        return true;
      })
      .sort((a, b) => {
        const critA = chaveOrdem[a.item.status] ?? 4;
        const critB = chaveOrdem[b.item.status] ?? 4;
        if (critA !== critB) return critA - critB;
        return (a.item.dias ?? 9e9) - (b.item.dias ?? 9e9);
      });
  }, [linhas, busca, filtro]);

  const total = linhas.length;

  return (
    <div style={s.wrap}>
      <div style={s.head} className="no-print">
        <div>
          <h1 style={s.h1}>{Icone ? <Icone size={18} color={cor} /> : null}{titulo}</h1>
          {subtitulo && <p style={s.h2}>{subtitulo}</p>}
        </div>
      </div>

      <div style={s.kpiRow}>
        {["vencido","alerta","ok","sem_data"].map(st => (
          <div key={st} style={s.kpiSlot(st)}>
            <div style={s.kpiN(st)}>{resumo[st] || 0}</div>
            <div style={s.kpiL(st)}>{STATUS[st].label}</div>
          </div>
        ))}
      </div>

      <div style={s.toolbar} className="no-print">
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
        <select value={filtro} onChange={e => setFiltro(e.target.value)} style={s.select}>
          <option value="todos">Todos os status</option>
          <option value="vencido">Só vencidos</option>
          <option value="alerta">Só em alerta</option>
          <option value="ok">Só OK</option>
          <option value="sem_data">Só sem dado</option>
        </select>
        <span style={s.counter}>{linhasFiltradas.length} de {total}</span>
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
                  <th style={s.th}>Placa</th>
                  <th style={s.th} className="hide-mobile">Modelo</th>
                  <th style={s.th}>Última</th>
                  <th style={s.th}>Vencimento</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th} className="no-print" />
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.map((l, idx) => (
                  <tr key={l.placa} style={idx % 2 === 1 ? s.zebra : {}}>
                    <td style={{ ...s.td, ...s.tdPlaca }}>{l.placa}</td>
                    <td style={{ ...s.td, ...s.tdModelo }} className="hide-mobile">{l.modelo}</td>
                    <td style={{ ...s.td, ...s.tdData }}>
                      {l.item.rec?.data_realiz ? fmtDate(l.item.rec.data_realiz) : <span style={s.tdEmpty}>—</span>}
                    </td>
                    <td style={{ ...s.td, ...s.tdVenc }}>
                      {l.item.rec?.venc ? fmtDate(l.item.rec.venc) : <span style={s.tdEmpty}>—</span>}
                    </td>
                    <td style={s.td}><CelStatus item={l.item} /></td>
                    <td style={{ ...s.td, textAlign: "right" }} className="no-print">
                      {l.item.rec ? (
                        <button style={s.btnAcao} onClick={() => onEditar && tipoObj && onEditar(l.placa, tipoObj)} title="Editar">
                          <Pencil size={12} /> Editar
                        </button>
                      ) : (
                        <button style={s.btnLancar} onClick={() => onEditar && tipoObj && onEditar(l.placa, tipoObj)} title="Lançar">
                          <Plus size={12} /> Lançar
                        </button>
                      )}
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
