import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import LogoPontual from "../components/LogoPontual";

const HOJE = () => new Date();

function diasAte(dataStr) {
  const d = new Date(dataStr + "T00:00:00");
  return Math.ceil((d - HOJE()) / (1000 * 60 * 60 * 24));
}

function fmtData(dataStr) {
  if (!dataStr) return "—";
  const [y, m, d] = dataStr.split("-");
  return `${d}/${m}/${y}`;
}

function statusCalc(inicio, fim) {
  const hoje = HOJE();
  const ini  = new Date(inicio + "T00:00:00");
  const end  = new Date(fim    + "T00:00:00");
  if (hoje < ini) return "agendada";
  if (hoje <= end) return "em_ferias";
  return "concluida";
}

const STATUS_STYLE = {
  agendada:  { bg: "#dbeafe", color: "#1d4ed8", label: "Agendada" },
  em_ferias: { bg: "#fef9c3", color: "#a16207", label: "Em Férias" },
  concluida: { bg: "#dcfce7", color: "#15803d", label: "Concluída" },
};

const VAZIO = { motorista: "", inicio: "", fim: "", obs: "", esocial: false };

export default function Ferias() {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const isAdmin     = ["master", "admin"].includes(profile?.role);

  const [ferias, setFerias]         = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState(VAZIO);
  const [editId, setEditId]         = useState(null);
  const [salvando, setSalvando]     = useState(false);
  const [filtro, setFiltro]         = useState("todos");

  async function carregar() {
    setLoading(true);
    const [fSnap, mSnap] = await Promise.all([
      getDocs(query(collection(db, "ferias"), orderBy("inicio"))),
      getDocs(query(collection(db, "motoristas"), orderBy("nome"))),
    ]);
    setFerias(fSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setMotoristas(mSnap.docs.map(d => d.data().nome).filter(Boolean));
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  // alertas: férias que começam em até 60 dias e eSocial não enviado
  const alertas = ferias.filter(f => {
    const dias = diasAte(f.inicio);
    return dias >= 0 && dias <= 60 && !f.esocial;
  }).sort((a, b) => diasAte(a.inicio) - diasAte(b.inicio));

  const lista = ferias.filter(f => {
    const st = statusCalc(f.inicio, f.fim);
    return filtro === "todos" || st === filtro;
  });

  function abrirNovo() {
    setForm(VAZIO); setEditId(null); setModal(true);
  }

  function abrirEditar(f) {
    setForm({ motorista: f.motorista, inicio: f.inicio, fim: f.fim, obs: f.obs || "", esocial: f.esocial || false });
    setEditId(f.id); setModal(true);
  }

  function fecharModal() { setModal(false); setForm(VAZIO); setEditId(null); }

  async function salvar(e) {
    e.preventDefault();
    if (!form.motorista || !form.inicio || !form.fim) return;
    setSalvando(true);
    try {
      const data = { ...form, updatedAt: new Date().toISOString() };
      if (editId) {
        await updateDoc(doc(db, "ferias", editId), data);
      } else {
        await addDoc(collection(db, "ferias"), { ...data, createdAt: new Date().toISOString() });
      }
      fecharModal();
      carregar();
    } catch(e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    if (!window.confirm("Excluir registro de férias?")) return;
    try {
      await deleteDoc(doc(db, "ferias", id));
      carregar();
    } catch(e) {
      alert("Erro ao excluir: " + e.message);
    }
  }

  async function marcarEsocial(f) {
    try {
      await updateDoc(doc(db, "ferias", f.id), { esocial: !f.esocial });
      carregar();
    } catch(e) {
      alert("Erro ao atualizar: " + e.message);
    }
  }

  return (
    <div style={s.wrap}>
      <header style={s.header} className="pg-header">
        <div className="pg-logo"><LogoPontual height={36} /></div>
        <span style={s.titulo}>Férias — Motoristas</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }} className="pg-header-actions">
          {isAdmin && <button style={s.btnNovo} onClick={abrirNovo}>+ Nova Férias</button>}
          <button style={s.btnBack} onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>
      </header>

      <div style={s.body}>

        {/* ALERTAS 60 DIAS */}
        {alertas.length > 0 && (
          <div style={s.alertBox}>
            <div style={s.alertTitulo}>⚠️ Férias nos próximos 60 dias — eSocial pendente ({alertas.length})</div>
            <div style={s.alertLista}>
              {alertas.map(f => {
                const dias = diasAte(f.inicio);
                const urgente = dias <= 15;
                return (
                  <div key={f.id} style={{ ...s.alertItem, borderLeft: `4px solid ${urgente ? "#dc2626" : "#f59e0b"}` }}>
                    <div style={s.alertNome}>{f.motorista}</div>
                    <div style={s.alertDatas}>
                      {fmtData(f.inicio)} → {fmtData(f.fim)}
                    </div>
                    <div style={{ ...s.alertDias, color: urgente ? "#dc2626" : "#d97706" }}>
                      {dias === 0 ? "Hoje!" : `${dias} dias`}
                    </div>
                    <button style={s.btnEsocial} onClick={() => marcarEsocial(f)}>
                      Marcar eSocial enviado
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FILTROS */}
        <div style={s.toolbar} className="pg-toolbar">
          {[["todos","Todos"], ["agendada","Agendadas"], ["em_ferias","Em Férias"], ["concluida","Concluídas"]].map(([v, l]) => (
            <button
              key={v}
              style={{ ...s.filtroBtn, ...(filtro === v ? s.filtroBtnAtivo : {}) }}
              onClick={() => setFiltro(v)}
            >
              {l}
            </button>
          ))}
        </div>

        {/* LISTA */}
        {loading ? (
          <p style={s.info}>Carregando...</p>
        ) : lista.length === 0 ? (
          <p style={s.info}>Nenhum registro encontrado.</p>
        ) : (
          <div style={s.grid} className="pg-grid">
            {lista.map(f => {
              const st    = statusCalc(f.inicio, f.fim);
              const style = STATUS_STYLE[st];
              const dias  = diasAte(f.inicio);
              return (
                <div key={f.id} style={s.card}>
                  <div style={s.cardHead}>
                    <span style={s.cardNome}>{f.motorista}</span>
                    <span style={{ ...s.badge, background: style.bg, color: style.color }}>{style.label}</span>
                  </div>
                  <div style={s.cardRow}>
                    <span style={s.lbl}>Início</span>
                    <span style={s.val}>{fmtData(f.inicio)}</span>
                  </div>
                  <div style={s.cardRow}>
                    <span style={s.lbl}>Retorno</span>
                    <span style={s.val}>{fmtData(f.fim)}</span>
                  </div>
                  {st === "agendada" && (
                    <div style={s.cardRow}>
                      <span style={s.lbl}>Faltam</span>
                      <span style={{ ...s.val, color: dias <= 60 ? "#d97706" : "#1e293b", fontWeight: 700 }}>
                        {dias} dias
                      </span>
                    </div>
                  )}
                  <div style={s.cardRow}>
                    <span style={s.lbl}>eSocial</span>
                    <span style={{ ...s.val, color: f.esocial ? "#15803d" : "#dc2626", fontWeight: 700 }}>
                      {f.esocial ? "✓ Enviado" : "Pendente"}
                    </span>
                  </div>
                  {f.obs && <div style={s.cardObs}>{f.obs}</div>}
                  <div style={s.cardActions}>
                    <button style={s.btnEditar} onClick={() => abrirEditar(f)}>Editar</button>
                    <button
                      style={{ ...s.btnEsocialCard, background: f.esocial ? "#dcfce7" : "#fef9c3", color: f.esocial ? "#15803d" : "#a16207" }}
                      onClick={() => marcarEsocial(f)}
                    >
                      {f.esocial ? "eSocial ✓" : "eSocial pendente"}
                    </button>
                    {isAdmin && <button style={s.btnExcluir} onClick={() => excluir(f.id)}>✕</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={fecharModal}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
            <div style={s.mh}>
              <h3>{editId ? "Editar Férias" : "Nova Férias"}</h3>
              <button style={s.mclose} onClick={fecharModal}>×</button>
            </div>
            <form onSubmit={salvar} style={s.mform}>
              <label style={s.mlbl}>
                Motorista *
                <select style={s.minp} value={form.motorista} onChange={e => setForm({ ...form, motorista: e.target.value })} required>
                  <option value="">— Selecionar —</option>
                  {motoristas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <div style={s.mrow}>
                <label style={{ ...s.mlbl, flex: 1 }}>
                  Início das férias *
                  <input style={s.minp} type="date" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} required />
                </label>
                <label style={{ ...s.mlbl, flex: 1 }}>
                  Retorno *
                  <input style={s.minp} type="date" value={form.fim} onChange={e => setForm({ ...form, fim: e.target.value })} required />
                </label>
              </div>
              <label style={s.mlbl}>
                Observações
                <textarea style={{ ...s.minp, minHeight: 60, resize: "vertical" }} value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} />
              </label>
              <label style={{ ...s.mlbl, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={form.esocial} onChange={e => setForm({ ...form, esocial: e.target.checked })} />
                eSocial já enviado
              </label>
              <div style={s.mfoot}>
                <button type="button" style={s.mbtnCancel} onClick={fecharModal}>Cancelar</button>
                <button type="submit" style={s.mbtnSave} disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:    { minHeight: "100vh", background: "var(--bg)", fontFamily: "system-ui, sans-serif" },
  header:  { background: "#1a3a5c", borderBottom: "4px solid transparent", borderImage: "linear-gradient(90deg, #3d6b47, #6aaa5e, #b5d947, #f5c318, #f0a500) 1", padding: "10px 24px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 8px rgba(0,0,0,.15)" },
  titulo:  { color: "#fff", fontWeight: 700, fontSize: "1.1rem" },
  btnNovo: { padding: "7px 16px", background: "#f5c318", color: "#1a3a5c", border: "none", borderRadius: 7, fontWeight: 700, cursor: "pointer", fontSize: ".85rem" },
  btnBack: { padding: "7px 16px", background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 7, cursor: "pointer", fontSize: ".85rem" },
  body:    { padding: 24, maxWidth: 1200, margin: "0 auto" },

  // alertas
  alertBox:    { background: "var(--card-bg)", border: "1px solid #fcd34d", borderRadius: 10, padding: 16, marginBottom: 20, boxShadow: "0 2px 8px rgba(245,193,24,.15)" },
  alertTitulo: { fontWeight: 700, color: "#92400e", marginBottom: 12, fontSize: ".95rem" },
  alertLista:  { display: "flex", flexDirection: "column", gap: 8 },
  alertItem:   { background: "#fffbeb", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" },
  alertNome:   { fontWeight: 700, color: "var(--text)", minWidth: 180 },
  alertDatas:  { fontSize: ".85rem", color: "#475569", flex: 1 },
  alertDias:   { fontWeight: 700, fontSize: ".9rem", minWidth: 60 },
  btnEsocial:  { padding: "5px 12px", background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: ".78rem", fontWeight: 600, whiteSpace: "nowrap" },

  // toolbar
  toolbar:      { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  filtroBtn:    { padding: "7px 16px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--card-bg)", cursor: "pointer", fontSize: ".82rem", fontWeight: 600, color: "var(--text-muted)" },
  filtroBtnAtivo: { background: "#1a3a5c", color: "#fff", borderColor: "#1a3a5c" },

  info:    { color: "#94a3b8", textAlign: "center", marginTop: 40 },

  // grid
  grid:       { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 },
  card:       { background: "var(--card-bg)", borderRadius: 10, padding: 16, border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,.06)" },
  cardHead:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardNome:   { fontWeight: 700, color: "#1a3a5c", fontSize: ".95rem" },
  badge:      { padding: "2px 10px", borderRadius: 20, fontSize: ".72rem", fontWeight: 700 },
  cardRow:    { display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: ".84rem" },
  lbl:        { color: "#94a3b8", fontWeight: 500 },
  val:        { color: "var(--text)", fontWeight: 500 },
  cardObs:    { marginTop: 6, fontSize: ".76rem", color: "var(--text-muted)", background: "var(--bg)", padding: "5px 8px", borderRadius: 6 },
  cardActions:{ display: "flex", gap: 6, marginTop: 12 },
  btnEditar:       { flex: 1, padding: "6px 0", background: "#dbeafe", color: "#1d4ed8", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".78rem" },
  btnEsocialCard:  { flex: 1, padding: "6px 0", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".78rem" },
  btnExcluir:      { padding: "6px 10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".78rem" },

  // modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modal:   { background: "var(--card-bg)", borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" },
  mh:      { background: "#1a3a5c", color: "#fff", padding: "14px 20px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  mclose:  { background: "none", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer" },
  mform:   { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  mlbl:    { display: "flex", flexDirection: "column", gap: 5, fontSize: ".82rem", fontWeight: 600, color: "#374151" },
  minp:    { padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: ".9rem", outline: "none", fontFamily: "inherit" },
  mrow:    { display: "flex", gap: 12 },
  mfoot:   { display: "flex", gap: 10, justifyContent: "flex-end" },
  mbtnCancel: { padding: "8px 18px", background: "#f1f5f9", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".85rem", color: "#475569" },
  mbtnSave:   { padding: "8px 24px", background: "#f5c318", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: ".85rem", color: "#1a3a5c" },
};
