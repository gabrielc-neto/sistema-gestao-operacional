import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { watch as dsWatch } from "../services/genericDataSource";
import { History, Download, Filter } from "lucide-react";

const COL = "pneu_movimentacoes";

const TIPO_META = {
  instalacao: { label: "Instalação",  bg: "#dcfce7", color: "#166534" },
  remocao:    { label: "Remoção",     bg: "#fee2e2", color: "#991b1b" },
  rodizio:    { label: "Rodízio",     bg: "#fef3c7", color: "#92400e" },
  recapagem:  { label: "Recapagem",   bg: "#e0e7ff", color: "#4338ca" },
  compra:     { label: "Compra",      bg: "#f1f5f9", color: "#475569" },
  descarte:   { label: "Descarte",    bg: "#fecaca", color: "#7f1d1d" },
};

function fmtDataBR(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : String(iso);
}

function fmtDataYYYYMMDD(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function baixarCsv(rows, filename) {
  const header = ["Data", "Tipo", "Veículo", "KM", "Pneu A", "Pos A antes", "Pos A depois", "Pneu B", "Pos B antes", "Pos B depois", "Autor", "Observação"];
  const linhas = [header.join(";")].concat(rows.map(r => [
    fmtDataBR(r.data),
    (TIPO_META[r.tipo]?.label || r.tipo || "").toString(),
    r.veiculoPlaca || "",
    r.km ?? "",
    r.fogoA || "",
    r.posOriginalA || "",
    r.novaPosicaoA || r.posOriginalA || "",
    r.fogoB || "",
    r.posOriginalB || "",
    r.novaPosicaoB || "",
    r.autor || "",
    (r.obs || "").replace(/[;\n\r]+/g, " "),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")));
  const csv = "﻿" + linhas.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const st = {
  wrap:    { padding: 12, maxWidth: 1400, margin: "0 auto" },
  card:    { background: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  filtros: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, alignItems: "end" },
  label:   { display: "flex", flexDirection: "column", gap: 4, fontSize: ".78rem", color: "#334155", fontWeight: 600 },
  input:   { padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: ".88rem", fontFamily: "inherit" },
  th:      { textAlign: "left", padding: "9px 8px", fontSize: ".76rem", color: "#334155", fontWeight: 700, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0 },
  td:      { padding: "8px", fontSize: ".82rem", color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" },
  badge:   (meta) => ({ display: "inline-block", padding: "3px 8px", borderRadius: 999, fontSize: ".7rem", fontWeight: 700, background: meta?.bg || "#e2e8f0", color: meta?.color || "#475569" }),
  chip:    { display: "inline-block", padding: "1px 6px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: ".7rem", fontFamily: "monospace", background: "#f8fafc" },
  arrow:   { color: "#94a3b8", margin: "0 4px" },
  btn:     { padding: "8px 14px", border: "1px solid #1a3a5c", background: "#1a3a5c", color: "#fff", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: ".84rem", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 },
  stat:    { padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, minWidth: 130 },
  statVal: { fontSize: "1.3rem", color: "#1a3a5c", fontWeight: 800, lineHeight: 1 },
  statLbl: { fontSize: ".7rem", color: "#64748b", marginTop: 4, textTransform: "uppercase", letterSpacing: ".04em" },
};

export default function AbaHistorico({ pneus }) {
  const [movs, setMovs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [placa, setPlaca]         = useState("");
  const [fogo, setFogo]           = useState("");
  const [tipo, setTipo]           = useState("");
  const [de, setDe]               = useState("");
  const [ate, setAte]             = useState("");

  useEffect(() => {
    const unsub = dsWatch(COL, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
      setMovs(rows);
      setLoading(false);
    }, { orderBy: "data", order: "desc" });
    return () => unsub();
  }, []);

  // Placas únicas pra dropdown de filtro
  const placas = useMemo(() => {
    return [...new Set(movs.map(m => m.veiculoPlaca).filter(Boolean))].sort();
  }, [movs]);

  // Fogos únicos pra dropdown de filtro
  const fogos = useMemo(() => {
    return [...new Set([
      ...movs.map(m => m.fogoA),
      ...movs.map(m => m.fogoB),
    ].filter(Boolean))].sort();
  }, [movs]);

  const filtrado = useMemo(() => {
    return movs.filter(m => {
      if (placa && m.veiculoPlaca !== placa) return false;
      if (fogo && m.fogoA !== fogo && m.fogoB !== fogo) return false;
      if (tipo && m.tipo !== tipo) return false;
      if (de) {
        const d1 = fmtDataYYYYMMDD(m.data);
        if (d1 < de) return false;
      }
      if (ate) {
        const d1 = fmtDataYYYYMMDD(m.data);
        if (d1 > ate) return false;
      }
      return true;
    });
  }, [movs, placa, fogo, tipo, de, ate]);

  const contagens = useMemo(() => {
    const c = { total: filtrado.length };
    for (const m of filtrado) c[m.tipo] = (c[m.tipo] || 0) + 1;
    return c;
  }, [filtrado]);

  const limpar = () => { setPlaca(""); setFogo(""); setTipo(""); setDe(""); setAte(""); };

  return (
    <div style={st.wrap}>
      <div style={st.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <History size={20} color="#1a3a5c" />
          <h2 style={{ margin: 0, color: "#1a3a5c", fontSize: "1.05rem" }}>Histórico de Movimentações</h2>
          <span style={{ marginLeft: "auto", fontSize: ".78rem", color: "#64748b" }}>{loading ? "Carregando…" : `${filtrado.length} de ${movs.length}`}</span>
        </div>

        {/* Filtros */}
        <div style={st.filtros}>
          <label style={st.label}>Placa
            <select style={st.input} value={placa} onChange={e => setPlaca(e.target.value)}>
              <option value="">Todas</option>
              {placas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label style={st.label}>Pneu (Fogo)
            <select style={st.input} value={fogo} onChange={e => setFogo(e.target.value)}>
              <option value="">Todos</option>
              {fogos.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label style={st.label}>Tipo
            <select style={st.input} value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(TIPO_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label style={st.label}>De
            <input type="date" style={st.input} value={de} onChange={e => setDe(e.target.value)} />
          </label>
          <label style={st.label}>Até
            <input type="date" style={st.input} value={ate} onChange={e => setAte(e.target.value)} />
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button style={{ ...st.btn, background: "#fff", color: "#334155", border: "1px solid #cbd5e1" }} onClick={limpar}>
              <Filter size={14} /> Limpar
            </button>
            <button style={st.btn} onClick={() => baixarCsv(filtrado, `historico_pneus_${new Date().toISOString().slice(0,10)}.csv`)} disabled={filtrado.length === 0}>
              <Download size={14} /> Excel
            </button>
          </div>
        </div>

        {/* Resumo */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <div style={st.stat}><div style={st.statVal}>{contagens.total}</div><div style={st.statLbl}>Total</div></div>
          <div style={st.stat}><div style={{ ...st.statVal, color: "#166534" }}>{contagens.instalacao || 0}</div><div style={st.statLbl}>Instalações</div></div>
          <div style={st.stat}><div style={{ ...st.statVal, color: "#92400e" }}>{contagens.rodizio || 0}</div><div style={st.statLbl}>Rodízios</div></div>
          <div style={st.stat}><div style={{ ...st.statVal, color: "#991b1b" }}>{contagens.remocao || 0}</div><div style={st.statLbl}>Remoções</div></div>
          <div style={st.stat}><div style={{ ...st.statVal, color: "#4338ca" }}>{contagens.recapagem || 0}</div><div style={st.statLbl}>Recapagens</div></div>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ ...st.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={st.th}>Data / Hora</th>
              <th style={st.th}>Tipo</th>
              <th style={st.th}>Veículo</th>
              <th style={st.th}>KM</th>
              <th style={st.th}>Pneu A</th>
              <th style={st.th}>Movimento A</th>
              <th style={st.th}>Pneu B</th>
              <th style={st.th}>Movimento B</th>
              <th style={st.th}>Autor</th>
              <th style={st.th}>Obs</th>
            </tr>
          </thead>
          <tbody>
            {filtrado.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                {loading ? "Carregando…" : "Nenhum registro no filtro"}
              </td></tr>
            ) : filtrado.map(m => {
              const meta = TIPO_META[m.tipo];
              return (
                <tr key={m.id}>
                  <td style={st.td}>{fmtDataBR(m.data)}</td>
                  <td style={st.td}><span style={st.badge(meta)}>{meta?.label || m.tipo}</span></td>
                  <td style={st.td}><strong>{m.veiculoPlaca || "—"}</strong></td>
                  <td style={st.td}>{m.km ? Number(m.km).toLocaleString("pt-BR") : "—"}</td>
                  <td style={st.td}>{m.fogoA ? <span style={st.chip}>{m.fogoA}</span> : "—"}</td>
                  <td style={st.td}>
                    {m.posOriginalA && <span style={st.chip}>{m.posOriginalA}</span>}
                    {m.novaPosicaoA && m.novaPosicaoA !== m.posOriginalA && (
                      <>
                        <span style={st.arrow}>→</span>
                        <span style={st.chip}>{m.novaPosicaoA}</span>
                      </>
                    )}
                    {!m.posOriginalA && !m.novaPosicaoA && "—"}
                  </td>
                  <td style={st.td}>{m.fogoB ? <span style={st.chip}>{m.fogoB}</span> : "—"}</td>
                  <td style={st.td}>
                    {m.posOriginalB && <span style={st.chip}>{m.posOriginalB}</span>}
                    {m.novaPosicaoB && m.novaPosicaoB !== m.posOriginalB && (
                      <>
                        <span style={st.arrow}>→</span>
                        <span style={st.chip}>{m.novaPosicaoB}</span>
                      </>
                    )}
                    {!m.posOriginalB && !m.novaPosicaoB && "—"}
                  </td>
                  <td style={st.td}>{m.autor || "—"}</td>
                  <td style={{ ...st.td, maxWidth: 240 }}>{m.obs || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
