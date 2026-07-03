import { useState, useEffect } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import ModuleHeader from "../components/ModuleHeader";

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
  agendada:  { bg: "var(--accent-soft)", color: "var(--accent)", label: "Agendada" },
  em_ferias: { bg: "var(--warning-bg)", color: "var(--warning)", label: "Em Férias" },
  concluida: { bg: "var(--success-bg)", color: "var(--success)", label: "Concluída" },
};

const VAZIO = { motorista: "", inicio: "", fim: "", obs: "", esocial: false };

export default function Ferias() {
  const { profile } = useAuth();
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

  // carga inicial no mount
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
      <ModuleHeader
        title="Férias — Motoristas"
        actions={isAdmin && <button className="mod-hbtn-alt" onClick={abrirNovo}>+ Nova Férias</button>}
      />

      <div style={s.body}>

        {/* ALERTAS 60 DIAS */}
        {alertas.length > 0 && (
          <div style={s.alertBox}>
            <div style={s.alertTitulo}><AlertTriangle size={16} color="var(--warning)" /> Férias nos próximos 60 dias — eSocial pendente ({alertas.length})</div>
            <div style={s.alertLista}>
              {alertas.map(f => {
                const dias = diasAte(f.inicio);
                const urgente = dias <= 15;
                return (
                  <div key={f.id} style={{ ...s.alertItem, borderLeft: `4px solid ${urgente ? "var(--danger)" : "var(--warning)"}` }}>
                    <div style={s.alertNome}>{f.motorista}</div>
                    <div style={s.alertDatas}>
                      {fmtData(f.inicio)} → {fmtData(f.fim)}
                    </div>
                    <div style={{ ...s.alertDias, color: urgente ? "var(--danger)" : "var(--warning)" }}>
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
                      <span style={{ ...s.val, color: dias <= 60 ? "var(--warning)" : "var(--text)", fontWeight: 700 }}>
                        {dias} dias
                      </span>
                    </div>
                  )}
                  <div style={s.cardRow}>
                    <span style={s.lbl}>eSocial</span>
                    <span style={{ ...s.val, display: "inline-flex", alignItems: "center", gap: 6, color: f.esocial ? "var(--success)" : "var(--danger)", fontWeight: 700 }}>
                      {f.esocial ? <><Check size={13} color="var(--success)" /> Enviado</> : "Pendente"}
                    </span>
                  </div>
                  {f.obs && <div style={s.cardObs}>{f.obs}</div>}
                  <div style={s.cardActions}>
                    <button style={s.btnEditar} onClick={() => abrirEditar(f)}>Editar</button>
                    <button
                      style={{ ...s.btnEsocialCard, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: f.esocial ? "var(--success-bg)" : "var(--warning-bg)", color: f.esocial ? "var(--success)" : "var(--warning)" }}
                      onClick={() => marcarEsocial(f)}
                    >
                      {f.esocial ? <>eSocial <Check size={13} /></> : "eSocial pendente"}
                    </button>
                    {isAdmin && <button style={{ ...s.btnExcluir, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => excluir(f.id)}><X size={14} /></button>}
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
  wrap:    { minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)" },
  header:  { background: "var(--header-bg)", borderBottom: "1px solid var(--header-border)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 8px rgba(0,0,0,.15)" },
  titulo:  { color: "#fff", fontWeight: 700, fontSize: "1.1rem" },
  btnNovo: { padding: "7px 16px", background: "var(--header-btn-bg)", color: "var(--accent)", border: "none", borderRadius: 7, fontWeight: 700, cursor: "pointer", fontSize: ".85rem" },
  btnBack: { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 7, cursor: "pointer", fontSize: ".85rem" },
  body:    { padding: 24, maxWidth: 1200, margin: "0 auto" },

  // alertas
  alertBox:    { background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--r-md)", padding: 16, marginBottom: 20, boxShadow: "var(--sh-sm)" },
  alertTitulo: { fontWeight: 700, color: "var(--warning)", marginBottom: 12, fontSize: ".95rem" },
  alertLista:  { display: "flex", flexDirection: "column", gap: 8 },
  alertItem:   { background: "var(--warning-bg)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" },
  alertNome:   { fontWeight: 700, color: "var(--text)", minWidth: 180 },
  alertDatas:  { fontSize: ".85rem", color: "var(--text-muted)", flex: 1 },
  alertDias:   { fontWeight: 700, fontSize: ".9rem", minWidth: 60 },
  btnEsocial:  { padding: "5px 12px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: ".78rem", fontWeight: 600, whiteSpace: "nowrap" },

  // toolbar
  toolbar:      { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  filtroBtn:    { padding: "7px 16px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--card-bg)", cursor: "pointer", fontSize: ".82rem", fontWeight: 600, color: "var(--text-muted)" },
  filtroBtnAtivo: { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" },

  info:    { color: "var(--text-subtle)", textAlign: "center", marginTop: 40 },

  // grid
  grid:       { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 },
  card:       { background: "var(--card-bg)", borderRadius: 10, padding: 16, border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,.06)" },
  cardHead:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardNome:   { fontWeight: 700, color: "var(--accent)", fontSize: ".95rem" },
  badge:      { padding: "2px 10px", borderRadius: 20, fontSize: ".72rem", fontWeight: 700 },
  cardRow:    { display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: ".84rem" },
  lbl:        { color: "var(--text-subtle)", fontWeight: 500 },
  val:        { color: "var(--text)", fontWeight: 500 },
  cardObs:    { marginTop: 6, fontSize: ".76rem", color: "var(--text-muted)", background: "var(--bg)", padding: "5px 8px", borderRadius: 6 },
  cardActions:{ display: "flex", gap: 6, marginTop: 12 },
  btnEditar:       { flex: 1, padding: "6px 0", background: "var(--accent-soft)", color: "var(--accent)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".78rem" },
  btnEsocialCard:  { flex: 1, padding: "6px 0", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".78rem" },
  btnExcluir:      { padding: "6px 10px", background: "var(--danger-bg)", color: "var(--danger)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".78rem" },

  // modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modal:   { background: "var(--card-bg)", borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" },
  mh:      { background: "var(--accent)", color: "#fff", padding: "14px 20px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  mclose:  { background: "none", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer" },
  mform:   { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  mlbl:    { display: "flex", flexDirection: "column", gap: 5, fontSize: ".82rem", fontWeight: 600, color: "var(--text)" },
  minp:    { padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: ".9rem", outline: "none", fontFamily: "inherit" },
  mrow:    { display: "flex", gap: 12 },
  mfoot:   { display: "flex", gap: 10, justifyContent: "flex-end" },
  mbtnCancel: { padding: "8px 18px", background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".85rem", color: "var(--text-muted)" },
  mbtnSave:   { padding: "8px 24px", background: "var(--accent)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: ".85rem", color: "#fff" },
};
