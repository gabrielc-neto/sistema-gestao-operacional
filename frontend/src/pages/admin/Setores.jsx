// CRUD de Setores
// Requer permissão `setores.ver` para entrar (controlado em App.jsx).
// Botões de criar/editar/excluir aparecem só com a permissão correspondente.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import ProtegerPor from "../../rbac/ProtegerPor";
import LogoPontual from "../../components/LogoPontual";

const VAZIO = { nome: "", descricao: "", status: "ativo" };

export default function Setores() {
  const navigate = useNavigate();

  const [setores, setSetores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editId, setEditId]   = useState(null);
  const [form, setForm]       = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]       = useState("");
  const [busca, setBusca]     = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "setores"), orderBy("nome")));
      setSetores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega ao montar; loader reusado no refresh
  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm(VAZIO); setEditId(null); setErro(""); setModal(true);
  }

  function abrirEditar(s) {
    setForm({
      nome: s.nome || "",
      descricao: s.descricao || "",
      status: s.status || "ativo",
    });
    setEditId(s.id); setErro(""); setModal(true);
  }

  function fechar() {
    setModal(false); setForm(VAZIO); setEditId(null); setErro("");
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) return setErro("Nome é obrigatório.");

    setSalvando(true); setErro("");
    try {
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        status: form.status,
        updated_at: serverTimestamp(),
      };
      if (editId) {
        await updateDoc(doc(db, "setores", editId), payload);
      } else {
        await addDoc(collection(db, "setores"), { ...payload, created_at: serverTimestamp() });
      }
      await carregar();
      fechar();
    } catch (err) {
      setErro("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(s) {
    if (!window.confirm(`Excluir setor "${s.nome}"?\n\nCargos vinculados perderão a referência ao setor.`)) return;
    try {
      await deleteDoc(doc(db, "setores", s.id));
      carregar();
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  }

  const lista = setores.filter(s => {
    const txt = busca.toLowerCase();
    return !txt || s.nome?.toLowerCase().includes(txt) || s.descricao?.toLowerCase().includes(txt);
  });

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <LogoPontual height={36} />
        <span style={s.titulo}>Setores</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ProtegerPor permissao="setores.criar">
            <button style={s.btnNovo} onClick={abrirNovo}>+ Novo Setor</button>
          </ProtegerPor>
          <button style={s.btnBack} onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>
      </header>

      <div style={s.body}>
        <div style={s.toolbar}>
          <input style={s.busca} placeholder="Buscar setor..."
            value={busca} onChange={e => setBusca(e.target.value)} />
          <span style={s.total}>{lista.length} setor{lista.length !== 1 ? "es" : ""}</span>
        </div>

        {loading ? (
          <p style={s.info}>Carregando...</p>
        ) : lista.length === 0 ? (
          <p style={s.info}>Nenhum setor cadastrado.</p>
        ) : (
          <div style={s.tabWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Nome</th>
                  <th style={s.th}>Descrição</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(setor => (
                  <tr key={setor.id} style={{ opacity: setor.status === "inativo" ? 0.55 : 1 }}>
                    <td style={s.td}><strong>{setor.nome}</strong></td>
                    <td style={{ ...s.td, color: "#475569", fontSize: ".83rem" }}>{setor.descricao || "—"}</td>
                    <td style={s.td}>
                      <span style={{
                        background: setor.status === "inativo" ? "#fee2e2" : "#dcfce7",
                        color:      setor.status === "inativo" ? "#dc2626" : "#15803d",
                        padding: "3px 10px", borderRadius: 20, fontSize: ".75rem", fontWeight: 700
                      }}>
                        {setor.status === "inativo" ? "Inativo" : "Ativo"}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <ProtegerPor permissao="setores.editar">
                          <button style={s.btnEdit} onClick={() => abrirEditar(setor)}>Editar</button>
                        </ProtegerPor>
                        <ProtegerPor permissao="setores.excluir">
                          <button style={{ ...s.btnEdit, background: "#fee2e2", color: "#dc2626" }}
                            onClick={() => excluir(setor)}>Excluir</button>
                        </ProtegerPor>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={fechar}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
            <div style={s.mh}>
              <h3 style={{ color: "#fff", fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                {editId ? "Editar Setor" : "Novo Setor"}
              </h3>
              <button style={s.mclose} onClick={fechar}>×</button>
            </div>
            <form onSubmit={salvar} style={s.mform}>
              <label style={s.mlbl}>
                Nome *
                <input style={s.minp} value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Logística" required />
              </label>
              <label style={s.mlbl}>
                Descrição
                <input style={s.minp} value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descreva o setor..." />
              </label>
              <label style={s.mlbl}>
                Status
                <select style={s.minp} value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>

              {erro && <p style={{ color: "#dc2626", fontSize: ".82rem", fontWeight: 600 }}>{erro}</p>}

              <div style={s.mfoot}>
                <button type="button" style={s.mbtnCancel} onClick={fechar}>Cancelar</button>
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
  wrap:    { minHeight: "100vh", background: "var(--bg, #f0f4f8)", fontFamily: "system-ui, sans-serif" },
  header:  { background: "#1a3a5c", padding: "10px 24px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 8px rgba(0,0,0,.15)" },
  titulo:  { color: "#fff", fontWeight: 700, fontSize: "1.1rem" },
  btnNovo: { padding: "7px 16px", background: "#f5c318", color: "#1a3a5c", border: "none", borderRadius: 7, fontWeight: 700, cursor: "pointer", fontSize: ".85rem" },
  btnBack: { padding: "7px 16px", background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 7, cursor: "pointer", fontSize: ".85rem" },
  body:    { padding: 24, maxWidth: 1100, margin: "0 auto" },
  toolbar: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  busca:   { flex: 1, padding: "9px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: ".88rem", outline: "none" },
  total:   { fontSize: ".82rem", color: "#94a3b8", whiteSpace: "nowrap" },
  info:    { color: "#94a3b8", textAlign: "center", marginTop: 40 },
  tabWrap: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto" },
  table:   { width: "100%", borderCollapse: "collapse", fontSize: ".85rem" },
  th:      { padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#1a3a5c", background: "#f8fafc", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" },
  td:      { padding: "12px 16px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" },
  btnEdit: { padding: "5px 12px", background: "#dbeafe", color: "#1d4ed8", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".75rem", whiteSpace: "nowrap" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modal:   { background: "#fff", borderRadius: 12, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.2)" },
  mh:      { background: "#1a3a5c", padding: "14px 20px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  mclose:  { background: "none", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer" },
  mform:   { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  mlbl:    { display: "flex", flexDirection: "column", gap: 5, fontSize: ".82rem", fontWeight: 600, color: "#374151" },
  minp:    { padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: ".9rem", outline: "none", fontFamily: "inherit" },
  mfoot:   { display: "flex", gap: 10, justifyContent: "flex-end" },
  mbtnCancel: { padding: "8px 18px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".85rem", color: "#475569" },
  mbtnSave:   { padding: "8px 24px", background: "#f5c318", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: ".85rem", color: "#1a3a5c" },
};
