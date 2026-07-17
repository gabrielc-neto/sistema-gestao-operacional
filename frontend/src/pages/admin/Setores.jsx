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
import ModuleHeader from "../../components/ModuleHeader";
import ExportBar from "../../components/ExportBar";

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

  // carrega ao montar; loader reusado no refresh
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
      <ModuleHeader
        title="Setores"
        actions={
          <ProtegerPor permissao="setores.criar">
            <button className="mod-hbtn-alt" onClick={abrirNovo}>+ Novo Setor</button>
          </ProtegerPor>
        }
      />

      <div style={s.body}>
        <div style={s.toolbar}>
          <input style={s.busca} placeholder="Buscar setor..."
            value={busca} onChange={e => setBusca(e.target.value)} />
          <span style={s.total}>{lista.length} setor{lista.length !== 1 ? "es" : ""}</span>
        </div>

        <ExportBar
          titulo="Setores"
          arquivo="setores"
          subtitulo={() => `${lista.length} setor(es)`}
          dados={() => ({
            colunas: ["Nome", "Descrição", "Status"],
            linhas: lista.map((setor) => [
              setor.nome || "",
              setor.descricao || "",
              setor.status === "inativo" ? "Inativo" : "Ativo",
            ]),
          })}
        />

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
                    <td style={{ ...s.td, color: "var(--text-muted)", fontSize: ".83rem" }}>{setor.descricao || "—"}</td>
                    <td style={s.td}>
                      <span style={{
                        background: setor.status === "inativo" ? "var(--danger-bg)" : "var(--success-bg)",
                        color:      setor.status === "inativo" ? "var(--danger)" : "var(--success)",
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
                          <button style={{ ...s.btnEdit, background: "var(--danger-bg)", color: "var(--danger)" }}
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

              {erro && <p style={{ color: "var(--danger)", fontSize: ".82rem", fontWeight: 600 }}>{erro}</p>}

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
  wrap:    { minHeight: "100vh", background: "var(--bg, #f0f4f8)", fontFamily: "var(--font)" },
  header:  { background: "var(--header-bg)", borderBottom: "1px solid var(--header-border)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 8px rgba(0,0,0,.15)" },
  titulo:  { color: "#fff", fontWeight: 700, fontSize: "1.1rem" },
  btnNovo: { padding: "7px 16px", background: "var(--header-btn-bg)", color: "var(--accent)", border: "none", borderRadius: 7, fontWeight: 700, cursor: "pointer", fontSize: ".85rem" },
  btnBack: { padding: "7px 16px", background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 7, cursor: "pointer", fontSize: ".85rem", display: "inline-flex", alignItems: "center", gap: 6 },
  body:    { padding: 24, maxWidth: 1100, margin: "0 auto" },
  toolbar: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  busca:   { flex: 1, padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border-strong)", fontSize: ".88rem", outline: "none" },
  total:   { fontSize: ".82rem", color: "var(--text-subtle)", whiteSpace: "nowrap" },
  info:    { color: "var(--text-subtle)", textAlign: "center", marginTop: 40 },
  tabWrap: { background: "var(--card-bg)", borderRadius: 10, border: "1px solid var(--border)", overflowX: "auto" },
  table:   { width: "100%", borderCollapse: "collapse", fontSize: ".85rem" },
  th:      { padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "var(--accent)", background: "var(--surface-2)", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" },
  td:      { padding: "12px 16px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" },
  btnEdit: { padding: "5px 12px", background: "var(--accent-soft)", color: "var(--accent)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".75rem", whiteSpace: "nowrap" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modal:   { background: "var(--card-bg)", borderRadius: 12, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.2)" },
  mh:      { background: "var(--accent)", padding: "14px 20px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  mclose:  { background: "none", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer" },
  mform:   { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  mlbl:    { display: "flex", flexDirection: "column", gap: 5, fontSize: ".82rem", fontWeight: 600, color: "var(--text)" },
  minp:    { padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: ".9rem", outline: "none", fontFamily: "inherit" },
  mfoot:   { display: "flex", gap: 10, justifyContent: "flex-end" },
  mbtnCancel: { padding: "8px 18px", background: "var(--surface-3)", border: "1px solid var(--border-strong)", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".85rem", color: "var(--text-muted)" },
  mbtnSave:   { padding: "8px 24px", background: "var(--accent)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: ".85rem", color: "#fff" },
};
