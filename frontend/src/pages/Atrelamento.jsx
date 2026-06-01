import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, query, where, orderBy, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import LogoPontual from "../components/LogoPontual";

const normPlaca = (p) => (p || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

const TIPOS_CARRETA = ["LS", "Bitrem", "Rodotrem", "4° Eixo", "Outro"];
const OPERACOES = ["ATRELAMENTO", "DESATRELAMENTO", "SUBSTITUIÇÃO"];
const STATUS_LIST = ["CONCLUÍDO", "PENDENTE", "CANCELADO"];

const corOperacao = {
  ATRELAMENTO: { bg: "#1d4ed8", color: "#fff" },
  DESATRELAMENTO: { bg: "#ea580c", color: "#fff" },
  "SUBSTITUIÇÃO": { bg: "#7c3aed", color: "#fff" },
};

const corStatus = {
  "CONCLUÍDO": { bg: "#16a34a", color: "#fff" },
  PENDENTE: { bg: "#f5c318", color: "#1a3a5c" },
  CANCELADO: { bg: "#dc2626", color: "#fff" },
};

const Badge = ({ label, map }) => {
  const style = map[label] || { bg: "#94a3b8", color: "#fff" };
  return (
    <span style={{
      background: style.bg,
      color: style.color,
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
};

const hoje = () => new Date().toISOString().split("T")[0];
const agora = () => new Date().toTimeString().slice(0, 5);

const padNum = (n) => `ATR-${String(n).padStart(4, "0")}`;

const toCSV = (rows) => {
  const headers = ["Nº","Data","Hora","Operação","Cavalo","KM","Carreta1","TipoC1","Carreta2","TipoC2","Motorista","Local","Status","Obs"];
  const lines = rows.map(r =>
    [r.num, r.data, r.hora, r.op, r.cavalo, r.km, r.c1, r.t1, r.c2, r.t2, r.motorista, r.local, r.status, r.obs]
      .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [headers.join(","), ...lines].join("\n");
};

function calcStatusPlaca(manutencoes, placa) {
  const norm = normPlaca(placa);
  if (!norm) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const em30 = new Date(hoje); em30.setDate(em30.getDate() + 30);
  let pior = null;
  const ord = { vencido:0, alerta:1, ok:2 };
  manutencoes.forEach(rec => {
    if (normPlaca(rec.placa) !== norm || !rec.venc) return;
    const v = new Date(rec.venc + "T00:00:00");
    const st = v < hoje ? "vencido" : v <= em30 ? "alerta" : "ok";
    if (pior === null || ord[st] < ord[pior]) pior = st;
  });
  return pior;
}

const DOT_COR = { vencido:"#dc2626", alerta:"#f59e0b", ok:"#16a34a" };
const DOT_TITLE = { vencido:"Documentos vencidos", alerta:"Documentos a vencer em 30 dias", ok:"Documentos em dia" };

function PlacaDot({ status }) {
  if (!status) return null;
  return (
    <span
      title={DOT_TITLE[status]}
      style={{
        display:"inline-block", width:8, height:8, borderRadius:"50%",
        background: DOT_COR[status], marginLeft:6, verticalAlign:"middle",
        flexShrink:0,
      }}
    />
  );
}

export default function Atrelamento() {
  const [registros, setRegistros] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertas, setAlertas] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroOp, setFiltroOp] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const [form, setForm] = useState({
    num: "", data: hoje(), hora: agora(), op: "ATRELAMENTO",
    status: "CONCLUÍDO", cavalo: "", km: "", motorista: "",
    c1: "", t1: "LS", c2: "", t2: "LS", local: "", obs: "",
  });

  const carregar = async () => {
    setLoading(true);
    try {
      const [snapReg, snapVeic, snapMot, snapManut] = await Promise.all([
        getDocs(query(collection(db, "atrelamentos"), orderBy("data", "desc"))),
        getDocs(query(collection(db, "veiculos"), orderBy("placa"))),
        getDocs(query(collection(db, "motoristas"), where("status", "==", "ativo"))),
        getDocs(collection(db, "manutencoes")),
      ]);
      setRegistros(snapReg.docs.map(d => ({ id: d.id, ...d.data() })));
      setVeiculos(
        snapVeic.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(v => v.tipo !== "carreta" && v.status !== "inativo")
      );
      setMotoristas(snapMot.docs.map(d => ({ id: d.id, ...d.data() })));
      setManutencoes(snapManut.docs.map(d => d.data()));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const abrirModal = () => {
    const maxN = registros.reduce((m, r) => {
      const n = parseInt((r.num || "").replace(/\D/g, ""), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const nextNum = padNum(maxN + 1);
    setForm({
      num: nextNum, data: hoje(), hora: agora(), op: "ATRELAMENTO",
      status: "CONCLUÍDO", cavalo: "", km: "", motorista: "",
      c1: "", t1: "LS", c2: "", t2: "LS", local: "", obs: "",
    });
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v = (name === "c1" || name === "c2") ? value.toUpperCase() : value;
    setForm(prev => ({ ...prev, [name]: v }));
  };

  const salvar = async (e) => {
    e.preventDefault();
    if (!form.cavalo || !form.motorista || !form.c1) {
      alert("Preencha cavalo, motorista e carreta 1.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "atrelamentos"), {
        ...form,
        km: Number(form.km) || 0,
        criadoEm: new Date().toISOString(),
      });

      if (form.status === "CONCLUÍDO") {
        // Localiza doc do cavalo pelo placa normalizado
        const cavaloDoc = veiculos.find(v => normPlaca(v.placa) === normPlaca(form.cavalo));
        if (cavaloDoc) {
          if (form.op === "ATRELAMENTO" || form.op === "SUBSTITUIÇÃO") {
            await updateDoc(doc(db, "veiculos", cavaloDoc.id), {
              c1: normPlaca(form.c1) || null,
              t1: form.t1 || "LS",
              c2: normPlaca(form.c2) || null,
              t2: form.c2 ? (form.t2 || "LS") : null,
              motorista: form.motorista || null,
              updatedAt: new Date().toISOString(),
            });
          } else if (form.op === "DESATRELAMENTO") {
            await updateDoc(doc(db, "veiculos", cavaloDoc.id), {
              c1: null, t1: null,
              c2: null, t2: null,
              motorista: null,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // Verificar vencimentos do conjunto (documentos de veículos apenas)
        if (form.op !== "DESATRELAMENTO") {
          const placas = [normPlaca(form.cavalo), normPlaca(form.c1)];
          if (form.c2) placas.push(normPlaca(form.c2));

          const TIPOS_MOTORISTA_IDS = ["cnh_venc", "mopp", "nr20", "nr35"];
          const snapManut = await getDocs(collection(db, "manutencoes"));
          const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
          const em30 = new Date(hoje); em30.setDate(em30.getDate() + 30);

          const alertasEncontrados = [];
          snapManut.docs.forEach(d => {
            const rec = d.data();
            if (!placas.includes(normPlaca(rec.placa))) return;
            if (!rec.venc) return;
            if (TIPOS_MOTORISTA_IDS.includes(rec.tipo)) return;
            const venc = new Date(rec.venc + "T00:00:00");
            const label = rec.tipo_label || rec.tipo;
            if (venc <= hoje) {
              alertasEncontrados.push({ placa: rec.placa, tipo: label, venc: rec.venc, status: "VENCIDO" });
            } else if (venc <= em30) {
              alertasEncontrados.push({ placa: rec.placa, tipo: label, venc: rec.venc, status: "ALERTA" });
            }
          });

          // Documentos do motorista (CNH, MOPP, NR-20, NR-35)
          const motoristaDoc = motoristas.find(m => m.nome === form.motorista);
          if (motoristaDoc) {
            [
              { campo: "cnh_venc",  label: "CNH" },
              { campo: "mopp_venc", label: "MOPP" },
              { campo: "nr20_venc", label: "NR-20" },
              { campo: "nr35_venc", label: "NR-35" },
            ].forEach(({ campo, label }) => {
              const vencStr = motoristaDoc[campo];
              if (!vencStr) return;
              const venc = new Date(vencStr + "T00:00:00");
              if (venc <= hoje) {
                alertasEncontrados.push({ placa: motoristaDoc.nome, tipo: label, venc: vencStr, status: "VENCIDO", isMotorista: true });
              } else if (venc <= em30) {
                alertasEncontrados.push({ placa: motoristaDoc.nome, tipo: label, venc: vencStr, status: "ALERTA", isMotorista: true });
              }
            });
          }

          if (alertasEncontrados.length > 0) {
            setAlertas({ conjunto: placas, itens: alertasEncontrados });
          }
        }
      }

      setModalOpen(false);
      await carregar();
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    }
    setSaving(false);
  };

  const filtrados = registros.filter(r => {
    const texto = busca.toLowerCase();
    const matchBusca = !busca || [r.num, r.cavalo, r.motorista, r.c1, r.c2, r.local, r.op]
      .some(v => String(v ?? "").toLowerCase().includes(texto));
    const matchOp = filtroOp === "todos" || r.op === filtroOp;
    const matchStatus = filtroStatus === "todos" || r.status === filtroStatus;
    return matchBusca && matchOp && matchStatus;
  });

  const exportarCSV = () => {
    const csv = toCSV(filtrados);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atrelamentos_${hoje()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle = {
    width: "100%", padding: "7px 10px", border: "1px solid #cbd5e1",
    borderRadius: 6, fontSize: 13, boxSizing: "border-box",
    background: "var(--card-bg)", color: "var(--text)",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 3, display: "block" };
  const fieldGroup = { display: "flex", flexDirection: "column", marginBottom: 10 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="pg-header" style={{
        background: "#1a3a5c", borderBottom: "4px solid transparent", borderImage: "linear-gradient(90deg, #3d6b47, #6aaa5e, #b5d947, #f5c318, #f0a500) 1",
        padding: "0 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 64,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }} className="pg-logo">
          <LogoPontual height={40} />
          <span style={{ color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: 0.5 }}>
            Atrelamento
          </span>
        </div>
        <div className="pg-header-actions">
          <a href="/dashboard" style={{
            background: "#f5c318", color: "#1a3a5c", fontWeight: 700,
            border: "none", borderRadius: 6, padding: "8px 18px",
            cursor: "pointer", textDecoration: "none", fontSize: 14,
          }}>
            ← Dashboard
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }} className="pg-body">
        {/* Toolbar */}
        <div style={{
          background: "var(--card-bg)", borderRadius: 10, padding: "14px 18px",
          marginBottom: 18, display: "flex", alignItems: "center",
          gap: 12, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        }}>
          <input
            placeholder="Buscar por placa, motorista, nº..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...inputStyle, width: 240, flex: "none" }}
          />
          <select value={filtroOp} onChange={e => setFiltroOp(e.target.value)} style={{ ...inputStyle, width: 180, flex: "none" }}>
            <option value="todos">Todas operações</option>
            {OPERACOES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ ...inputStyle, width: 160, flex: "none" }}>
            <option value="todos">Todos status</option>
            {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <button onClick={exportarCSV} style={{
            background: "var(--bg)", color: "#1a3a5c", border: "1px solid #cbd5e1",
            borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}>
            Exportar CSV
          </button>
          <button onClick={abrirModal} style={{
            background: "#f5c318", color: "#1a3a5c", border: "none",
            borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: 14,
          }}>
            + Novo Registro
          </button>
        </div>

        {/* Tabela */}
        <div style={{
          background: "var(--card-bg)", borderRadius: 10, overflow: "auto",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Carregando...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#1a3a5c", color: "#fff" }}>
                  {["Nº","Data/Hora","Operação","Cavalo","KM","Carreta 1","Tipo","Carreta 2","Tipo","Motorista","Local","Status"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={12} style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>Nenhum registro encontrado.</td></tr>
                ) : filtrados.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1a3a5c" }}>{r.num}</td>
                    <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{r.data} {r.hora}</td>
                    <td style={{ padding: "8px 12px" }}><Badge label={r.op} map={corOperacao} /></td>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                      {r.cavalo}<PlacaDot status={calcStatusPlaca(manutencoes, r.cavalo)} />
                    </td>
                    <td style={{ padding: "8px 12px" }}>{r.km ? Number(r.km).toLocaleString("pt-BR") : "-"}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                      {r.c1}<PlacaDot status={calcStatusPlaca(manutencoes, r.c1)} />
                    </td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{r.t1}</td>
                    <td style={{ padding: "8px 12px" }}>
                      {r.c2 ? <>{r.c2}<PlacaDot status={calcStatusPlaca(manutencoes, r.c2)} /></> : "-"}
                    </td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{r.c2 ? r.t2 : "-"}</td>
                    <td style={{ padding: "8px 12px" }}>{r.motorista}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{r.local || "-"}</td>
                    <td style={{ padding: "8px 12px" }}><Badge label={r.status} map={corStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 12, textAlign: "right" }}>
          {filtrados.length} registro{filtrados.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Modal Alertas Vencimento */}
      {alertas && (
        <div className="modal-mobile-sheet-overlay" style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 2000, padding: 16,
        }}>
          <div className="modal-mobile-sheet" style={{
            background: "#fff", borderRadius: 12, width: "100%", maxWidth: 560,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden",
          }}>
            <div style={{ background: "#b91c1c", padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Atenção — Vencimentos do Conjunto</span>
              <button onClick={() => setAlertas(null)} style={{ background: "transparent", border: "none", color: "#fca5a5", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "#374151" }}>
                Conjunto: <strong>{alertas.conjunto.join(" + ")}</strong>
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>Placa / Nome</th>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>Documento</th>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>Vencimento</th>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.itens.map((it, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e5e7eb", background: it.status === "VENCIDO" ? "#fef2f2" : "#fffbeb" }}>
                      <td style={{ padding: "7px 10px", fontWeight: 700 }}>
                        {it.placa}
                        {it.isMotorista && <span style={{ marginLeft: 5, fontSize: 10, background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "1px 5px" }}>Motorista</span>}
                      </td>
                      <td style={{ padding: "7px 10px" }}>{it.tipo}</td>
                      <td style={{ padding: "7px 10px" }}>{it.venc}</td>
                      <td style={{ padding: "7px 10px" }}>
                        <span style={{
                          background: it.status === "VENCIDO" ? "#dc2626" : "#f59e0b",
                          color: "#fff", borderRadius: 4, padding: "2px 8px",
                          fontWeight: 700, fontSize: 11,
                        }}>{it.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {alertas.itens.some(it => it.isMotorista) && (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: "#92400e", background: "#fef3c7", padding: "6px 10px", borderRadius: 6 }}>
                  Documentos de motorista são gerenciados em <strong>/motoristas</strong>.
                </p>
              )}
              <div style={{ marginTop: 16, textAlign: "right" }}>
                <button onClick={() => setAlertas(null)} style={{
                  background: "#1a3a5c", color: "#fff", border: "none",
                  borderRadius: 6, padding: "9px 24px", cursor: "pointer", fontWeight: 700, fontSize: 14,
                }}>OK, Entendido</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-mobile-sheet-overlay" style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16,
        }}>
          <div className="modal-mobile-sheet" style={{
            background: "var(--card-bg)", borderRadius: 12, width: "100%", maxWidth: 720,
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}>
            <div style={{
              background: "#1a3a5c", borderBottom: "3px solid #f5c318",
              padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center",
              borderRadius: "12px 12px 0 0",
            }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Novo Registro de Atrelamento</span>
              <button onClick={() => setModalOpen(false)} style={{
                background: "transparent", border: "none", color: "#f5c318",
                fontSize: 22, cursor: "pointer", lineHeight: 1,
              }}>×</button>
            </div>

            <form onSubmit={salvar} style={{ padding: 22 }}>
              {/* Linha 1 */}
              <div className="grid-form-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 0 }}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Nº Registro</label>
                  <input name="num" value={form.num} readOnly style={{ ...inputStyle, background: "#f1f5f9" }} />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Data</label>
                  <input name="data" type="date" value={form.data} onChange={handleChange} required style={inputStyle} />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Hora</label>
                  <input name="hora" type="time" value={form.hora} onChange={handleChange} required style={inputStyle} />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>KM</label>
                  <input name="km" type="number" value={form.km} onChange={handleChange} min={0} style={inputStyle} />
                </div>
              </div>

              {/* Linha 2 */}
              <div className="grid-form-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Operação</label>
                  <select name="op" value={form.op} onChange={handleChange} required style={inputStyle}>
                    {OPERACOES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Status</label>
                  <select name="status" value={form.status} onChange={handleChange} required style={inputStyle}>
                    {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Linha 3 */}
              <div className="grid-form-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Cavalo (Placa)</label>
                  <select name="cavalo" value={form.cavalo} onChange={handleChange} required style={inputStyle}>
                    <option value="">Selecione o cavalo...</option>
                    {veiculos.map(v => (
                      <option key={v.id} value={v.placa}>{v.placa}{v.modelo ? ` — ${v.modelo}` : ""}</option>
                    ))}
                  </select>
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Motorista</label>
                  <select name="motorista" value={form.motorista} onChange={handleChange} required style={inputStyle}>
                    <option value="">Selecione o motorista...</option>
                    {motoristas.map(m => (
                      <option key={m.id} value={m.nome}>{m.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Carreta 1 */}
              <div className="grid-form-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Placa Carreta 1</label>
                  <input name="c1" value={form.c1} onChange={handleChange} placeholder="EX: ABC1234" required style={inputStyle} maxLength={10} />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Tipo Carreta 1</label>
                  <select name="t1" value={form.t1} onChange={handleChange} style={inputStyle}>
                    {TIPOS_CARRETA.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Carreta 2 */}
              <div className="grid-form-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Placa Carreta 2 (opcional)</label>
                  <input name="c2" value={form.c2} onChange={handleChange} placeholder="EX: DEF5678" style={inputStyle} maxLength={10} />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Tipo Carreta 2</label>
                  <select name="t2" value={form.t2} onChange={handleChange} style={inputStyle} disabled={!form.c2}>
                    {TIPOS_CARRETA.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Local + Obs */}
              <div style={fieldGroup}>
                <label style={labelStyle}>Local</label>
                <input name="local" value={form.local} onChange={handleChange} placeholder="Base, pátio, posto..." style={inputStyle} />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Observações</label>
                <textarea name="obs" value={form.obs} onChange={handleChange} rows={3}
                  style={{ ...inputStyle, resize: "vertical" }} placeholder="Observações adicionais..." />
              </div>

              {/* Botões */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} style={{
                  background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1",
                  borderRadius: 6, padding: "9px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14,
                }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{
                  background: "#f5c318", color: "#1a3a5c", border: "none",
                  borderRadius: 6, padding: "9px 24px", cursor: "pointer", fontWeight: 700, fontSize: 14,
                  opacity: saving ? 0.7 : 1,
                }}>
                  {saving ? "Salvando..." : "Salvar Registro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
