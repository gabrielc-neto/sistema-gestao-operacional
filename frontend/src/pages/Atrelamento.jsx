import { useState, useEffect } from "react";
import { list as dsList, insert as dsInsert } from "../services/genericDataSource";
import { listVeiculos, patchVeiculo } from "../services/frotaDataSource";
import ModuleHeader from "../components/ModuleHeader";
import ExportBar from "../components/ExportBar";

const normPlaca = (p) => (p || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

const TIPOS_CARRETA = ["LS", "Bitrem", "Rodotrem", "4° Eixo", "Outro"];
const OPERACOES = ["ATRELAMENTO", "DESATRELAMENTO", "SUBSTITUIÇÃO"];
const STATUS_LIST = ["CONCLUÍDO", "PENDENTE", "CANCELADO"];

const corOperacao = {
  ATRELAMENTO: { bg: "var(--accent)", color: "#fff" },
  DESATRELAMENTO: { bg: "var(--accent)", color: "#fff" },
  "SUBSTITUIÇÃO": { bg: "var(--accent)", color: "#fff" },
};

const corStatus = {
  "CONCLUÍDO": { bg: "var(--success)", color: "#fff" },
  PENDENTE: { bg: "var(--accent-soft)", color: "var(--accent)" },
  CANCELADO: { bg: "var(--danger)", color: "#fff" },
};

const Badge = ({ label, map }) => {
  const style = map[label] || { bg: "var(--text-subtle)", color: "#fff" };
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

const DOT_COR = { vencido:"var(--danger)", alerta:"var(--warning)", ok:"var(--success)" };
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
      const [regRows, veicRows, motRows, manutRows] = await Promise.all([
        dsList("atrelamentos", { orderBy: "data", order: "desc" }),
        listVeiculos(),
        dsList("motoristas", { where: { status: "ativo" } }),
        dsList("manutencoes").catch(() => []),
      ]);
      setRegistros(regRows);
      setVeiculos(veicRows.filter(v => v.tipo !== "carreta" && v.status !== "inativo"));
      setMotoristas(motRows);
      setManutencoes(manutRows);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // carga inicial no mount
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
      await dsInsert("atrelamentos", {
        ...form,
        km: Number(form.km) || 0,
        criadoEm: new Date().toISOString(),
      });

      if (form.status === "CONCLUÍDO") {
        const cavaloDoc = veiculos.find(v => normPlaca(v.placa) === normPlaca(form.cavalo));
        if (cavaloDoc) {
          if (form.op === "ATRELAMENTO" || form.op === "SUBSTITUIÇÃO") {
            await patchVeiculo(cavaloDoc.id, {
              c1: normPlaca(form.c1) || null,
              t1: form.t1 || "LS",
              c2: normPlaca(form.c2) || null,
              t2: form.c2 ? (form.t2 || "LS") : null,
              motorista: form.motorista || null,
              updatedAt: new Date().toISOString(),
            });
          } else if (form.op === "DESATRELAMENTO") {
            await patchVeiculo(cavaloDoc.id, {
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
          const manutRows = await dsList("manutencoes").catch(() => []);
          const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
          const em30 = new Date(hoje); em30.setDate(em30.getDate() + 30);

          const alertasEncontrados = [];
          manutRows.forEach(rec => {
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


  const inputStyle = {
    width: "100%", padding: "7px 10px", border: "1px solid var(--border-strong)",
    borderRadius: 6, fontSize: 13, boxSizing: "border-box",
    background: "var(--card-bg)", color: "var(--text)",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 3, display: "block" };
  const fieldGroup = { display: "flex", flexDirection: "column", marginBottom: 10 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)" }}>
      {/* Header */}
      <ModuleHeader
        title="Atrelamento"
        actions={
          <button className="mod-hbtn-alt" onClick={abrirModal}>
            + Novo Registro
          </button>
        }
      />

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
            style={{ ...inputStyle, flex: "1 1 200px", minWidth: 0, width: "auto" }}
          />
          <select value={filtroOp} onChange={e => setFiltroOp(e.target.value)} style={{ ...inputStyle, flex: "1 1 150px", minWidth: 0, width: "auto" }}>
            <option value="todos">Todas operações</option>
            {OPERACOES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ ...inputStyle, flex: "1 1 140px", minWidth: 0, width: "auto" }}>
            <option value="todos">Todos status</option>
            {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <ExportBar
          titulo="Atrelamentos"
          arquivo="atrelamentos"
          subtitulo={() => `${filtrados.length} registro(s)${filtroOp !== "todos" ? ` · operação: ${filtroOp}` : ""}${filtroStatus !== "todos" ? ` · status: ${filtroStatus}` : ""}`}
          dados={() => ({
            colunas: ["Nº", "Data/Hora", "Operação", "Cavalo", "KM", "Carreta 1", "Tipo", "Carreta 2", "Tipo", "Motorista", "Local", "Status"],
            linhas: filtrados.map((r) => [
              r.num || "", `${r.data || ""} ${r.hora || ""}`.trim(), r.op || "", r.cavalo || "",
              r.km ?? "", r.c1 || "", r.t1 || "", r.c2 || "", r.t2 || "",
              r.motorista || "", r.local || "", r.status || "",
            ]),
          })}
        />

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
                <tr style={{ background: "var(--accent)", color: "#fff" }}>
                  {["Nº","Data/Hora","Operação","Cavalo","KM","Carreta 1","Tipo","Carreta 2","Tipo","Motorista","Local","Status"].map((h, i) => (
                    <th key={i} style={{ padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={12} style={{ textAlign: "center", padding: 32, color: "var(--text-subtle)" }}>Nenhum registro encontrado.</td></tr>
                ) : filtrados.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "var(--surface-2)" : "#fff", borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--accent)" }}>{r.num}</td>
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
            background: "var(--card-bg)", borderRadius: 12, width: "100%", maxWidth: 560,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden",
          }}>
            <div style={{ background: "var(--danger)", padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Atenção — Vencimentos do Conjunto</span>
              <button onClick={() => setAlertas(null)} style={{ background: "transparent", border: "none", color: "var(--danger-border)", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text)" }}>
                Conjunto: <strong>{alertas.conjunto.join(" + ")}</strong>
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--surface-3)" }}>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>Placa / Nome</th>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>Documento</th>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>Vencimento</th>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.itens.map((it, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: it.status === "VENCIDO" ? "var(--danger-bg)" : "var(--warning-bg)" }}>
                      <td style={{ padding: "7px 10px", fontWeight: 700 }}>
                        {it.placa}
                        {it.isMotorista && <span style={{ marginLeft: 5, fontSize: 10, background: "var(--warning-bg)", color: "var(--warning)", borderRadius: 4, padding: "1px 5px" }}>Motorista</span>}
                      </td>
                      <td style={{ padding: "7px 10px" }}>{it.tipo}</td>
                      <td style={{ padding: "7px 10px" }}>{it.venc}</td>
                      <td style={{ padding: "7px 10px" }}>
                        <span style={{
                          background: it.status === "VENCIDO" ? "var(--danger)" : "var(--warning)",
                          color: "#fff", borderRadius: 4, padding: "2px 8px",
                          fontWeight: 700, fontSize: 11,
                        }}>{it.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {alertas.itens.some(it => it.isMotorista) && (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--warning)", background: "var(--warning-bg)", padding: "6px 10px", borderRadius: 6 }}>
                  Documentos de motorista são gerenciados em <strong>/motoristas</strong>.
                </p>
              )}
              <div style={{ marginTop: 16, textAlign: "right" }}>
                <button onClick={() => setAlertas(null)} style={{
                  background: "var(--accent)", color: "#fff", border: "none",
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
              background: "var(--accent)", borderBottom: "3px solid var(--accent)",
              padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center",
              borderRadius: "12px 12px 0 0",
            }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Novo Registro de Atrelamento</span>
              <button onClick={() => setModalOpen(false)} style={{
                background: "transparent", border: "none", color: "#fff",
                fontSize: 22, cursor: "pointer", lineHeight: 1,
              }}>×</button>
            </div>

            <form onSubmit={salvar} style={{ padding: 22 }}>
              {/* Linha 1 */}
              <div className="grid-form-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 0 }}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Nº Registro</label>
                  <input name="num" value={form.num} readOnly style={{ ...inputStyle, background: "var(--surface-3)" }} />
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
                  background: "var(--surface-3)", color: "var(--text-muted)", border: "1px solid var(--border-strong)",
                  borderRadius: 6, padding: "9px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14,
                }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{
                  background: "var(--accent)", color: "#fff", border: "none",
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
