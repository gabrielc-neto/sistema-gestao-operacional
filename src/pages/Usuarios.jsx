import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, getDocs, setDoc, updateDoc,
  doc, query, orderBy,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  getAuth,
} from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { db } from "../firebase/config";
import app from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import LogoPontual from "../components/LogoPontual";

const CARGOS = [
  { id: "admin",          label: "Administrador" },
  { id: "diretor",        label: "Diretor" },
  { id: "superintendente",label: "Superintendente" },
  { id: "gestao",         label: "Gestão" },
  { id: "logistica",      label: "Logística" },
  { id: "comercial",      label: "Comercial" },
  { id: "faturamento",    label: "Faturamento" },
  { id: "rh",             label: "RH" },
  { id: "motorista",      label: "Motorista" },
];

const CARGO_COR = {
  master:          "#1a3a5c",
  admin:           "#1a3a5c",
  diretor:         "#7c3aed",
  superintendente: "#6d28d9",
  gestao:          "#0369a1",
  logistica:       "#0e7490",
  comercial:       "#b45309",
  faturamento:     "#be185d",
  rh:              "#15803d",
  motorista:       "#166534",
};

const VAZIO = { nome: "", email: "", senha: "", cargo: "logistica" };

async function criarUsuarioFirebase(email, senha) {
  const appAux = initializeApp(app.options, "aux_" + Date.now());
  try {
    const authAux = getAuth(appAux);
    const cred = await createUserWithEmailAndPassword(authAux, email, senha);
    return cred.user.uid;
  } finally {
    await deleteApp(appAux);
  }
}

export default function Usuarios() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = ["master", "admin"].includes(profile?.role);

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "usuarios"), orderBy("nome")));
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "#dc2626", fontWeight: 700 }}>Acesso restrito a Administradores.</p>
      </div>
    );
  }

  function abrirNovo() {
    setForm(VAZIO); setEditId(null); setErro(""); setModal(true);
  }

  function abrirEditar(u) {
    setForm({ nome: u.nome, email: u.email, senha: "", cargo: u.role });
    setEditId(u.id); setErro(""); setModal(true);
  }

  function fecharModal() {
    setModal(false); setForm(VAZIO); setEditId(null); setErro("");
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) return setErro("Nome é obrigatório.");
    if (!form.email.trim()) return setErro("E-mail é obrigatório.");
    if (!editId && !form.senha) return setErro("Senha é obrigatória.");
    if (!editId && form.senha.length < 6) return setErro("Senha mínimo 6 caracteres.");

    setSalvando(true);
    setErro("");

    try {
      if (editId) {
        await updateDoc(doc(db, "usuarios", editId), {
          nome:  form.nome.trim(),
          role:  form.cargo,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const uid = await criarUsuarioFirebase(form.email.trim(), form.senha);
        await setDoc(doc(db, "usuarios", uid), {
          nome:      form.nome.trim(),
          email:     form.email.trim().toLowerCase(),
          role:      form.cargo,
          ativo:     true,
          createdAt: new Date().toISOString(),
        });
      }
      await carregar();
      fecharModal();
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setErro("Este e-mail já está cadastrado.");
      } else if (err.code === "auth/invalid-email") {
        setErro("E-mail inválido.");
      } else {
        setErro("Erro ao salvar: " + err.message);
      }
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(u) {
    try {
      await updateDoc(doc(db, "usuarios", u.id), { ativo: !u.ativo });
      carregar();
    } catch(e) {
      alert("Erro ao atualizar: " + e.message);
    }
  }

  async function excluir(u) {
    if (!window.confirm(`Desativar "${u.nome}"?\n\nO acesso será bloqueado imediatamente.\nO registro é mantido para histórico.`)) return;
    try {
      await updateDoc(doc(db, "usuarios", u.id), { ativo: false });
      carregar();
    } catch(e) {
      alert("Erro ao desativar: " + e.message);
    }
  }

  const lista = usuarios.filter(u => {
    const txt = busca.toLowerCase();
    return !txt || u.nome?.toLowerCase().includes(txt) || u.email?.toLowerCase().includes(txt);
  });

  return (
    <div style={s.wrap}>
      <header style={s.header} className="pg-header">
        <div className="pg-logo"><LogoPontual height={36} /></div>
        <span style={s.titulo}>Usuários</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }} className="pg-header-actions">
          <button style={s.btnNovo} onClick={abrirNovo}>+ Novo Usuário</button>
          <button style={s.btnBack} onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>
      </header>

      <div style={s.body} className="pg-body">

        {/* BUSCA */}
        <div style={s.toolbar} className="pg-toolbar">
          <input style={s.busca} placeholder="Buscar por nome ou e-mail..."
            value={busca} onChange={e => setBusca(e.target.value)} />
          <span style={s.total}>{lista.length} usuário{lista.length !== 1 ? "s" : ""}</span>
        </div>

        {/* LISTA */}
        {loading ? (
          <p style={s.info}>Carregando...</p>
        ) : lista.length === 0 ? (
          <p style={s.info}>Nenhum usuário encontrado.</p>
        ) : (
          <div style={s.tabWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Nome</th>
                  <th style={s.th}>E-mail</th>
                  <th style={s.th}>Cargo</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(u => {
                  const cor = CARGO_COR[u.role] || "#64748b";
                  const cargo = CARGOS.find(c => c.id === u.role)?.label || u.role;
                  return (
                    <tr key={u.id} style={{ opacity: u.ativo === false ? 0.5 : 1 }}>
                      <td style={s.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: cor,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontWeight: 700, fontSize: ".85rem", flexShrink: 0 }}>
                            {u.nome?.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: "var(--text)" }}>{u.nome}</span>
                        </div>
                      </td>
                      <td style={{ ...s.td, color: "var(--text-muted)", fontSize: ".83rem" }}>{u.email}</td>
                      <td style={s.td}>
                        <span style={{ background: cor + "22", color: cor, padding: "3px 10px",
                          borderRadius: 20, fontSize: ".75rem", fontWeight: 700 }}>
                          {cargo}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{
                          background: u.ativo === false ? "#fee2e2" : "#dcfce7",
                          color: u.ativo === false ? "#dc2626" : "#15803d",
                          padding: "3px 10px", borderRadius: 20, fontSize: ".75rem", fontWeight: 700
                        }}>
                          {u.ativo === false ? "Inativo" : "Ativo"}
                        </span>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={s.btnEdit} onClick={() => abrirEditar(u)}>Editar</button>
                          <button
                            style={{ ...s.btnEdit, background: u.ativo === false ? "#dcfce7" : "#fef9c3",
                              color: u.ativo === false ? "#15803d" : "#a16207" }}
                            onClick={() => alternarAtivo(u)}>
                            {u.ativo === false ? "Ativar" : "Inativar"}
                          </button>
                          <button style={{ ...s.btnEdit, background: "#fee2e2", color: "#dc2626" }}
                            onClick={() => excluir(u)}>
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <div style={s.overlay} onClick={fecharModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.mh}>
              <h3 style={{ color: "#fff", fontSize: "1rem", fontWeight: 700 }}>
                {editId ? "Editar Usuário" : "Novo Usuário"}
              </h3>
              <button style={s.mclose} onClick={fecharModal}>×</button>
            </div>
            <form onSubmit={salvar} style={s.mform}>
              <label style={s.mlbl}>
                Nome completo *
                <input style={s.minp} value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: João Silva" required />
              </label>

              <label style={s.mlbl}>
                E-mail *
                <input style={s.minp} type="email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="joao@pontual.com.br"
                  disabled={!!editId} required />
                {editId && <span style={{ fontSize: ".7rem", color: "#94a3b8", marginTop: 2 }}>E-mail não pode ser alterado</span>}
              </label>

              {!editId && (
                <label style={s.mlbl}>
                  Senha *
                  <div style={{ position: "relative" }}>
                    <input
                      style={{ ...s.minp, paddingRight: 36 }}
                      type={senhaVisivel ? "text" : "password"}
                      value={form.senha}
                      onChange={e => setForm({ ...form, senha: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                    <button type="button"
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: ".8rem" }}
                      onClick={() => setSenhaVisivel(v => !v)}>
                      {senhaVisivel ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </label>
              )}

              <label style={s.mlbl}>
                Cargo *
                <select style={s.minp} value={form.cargo}
                  onChange={e => setForm({ ...form, cargo: e.target.value })}>
                  {CARGOS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>

              {erro && <p style={{ color: "#dc2626", fontSize: ".82rem", fontWeight: 600 }}>{erro}</p>}

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
  body:    { padding: 24, maxWidth: 1100, margin: "0 auto" },
  toolbar: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  busca:   { flex: 1, padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", fontSize: ".88rem", outline: "none" },
  total:   { fontSize: ".82rem", color: "#94a3b8", whiteSpace: "nowrap" },
  info:    { color: "#94a3b8", textAlign: "center", marginTop: 40 },
  tabWrap: { background: "var(--card-bg)", borderRadius: 10, border: "1px solid var(--border)", overflowX: "auto" },
  table:   { width: "100%", borderCollapse: "collapse", fontSize: ".85rem" },
  th:      { padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#1a3a5c", background: "var(--bg)", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" },
  td:      { padding: "12px 16px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" },
  btnEdit: { padding: "5px 12px", background: "#dbeafe", color: "#1d4ed8", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".75rem", whiteSpace: "nowrap" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modal:   { background: "var(--card-bg)", borderRadius: 12, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.2)" },
  mh:      { background: "#1a3a5c", padding: "14px 20px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  mclose:  { background: "none", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer" },
  mform:   { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  mlbl:    { display: "flex", flexDirection: "column", gap: 5, fontSize: ".82rem", fontWeight: 600, color: "#374151" },
  minp:    { padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: ".9rem", outline: "none", fontFamily: "inherit" },
  mfoot:   { display: "flex", gap: 10, justifyContent: "flex-end" },
  mbtnCancel: { padding: "8px 18px", background: "#f1f5f9", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".85rem", color: "#475569" },
  mbtnSave:   { padding: "8px 24px", background: "#f5c318", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: ".85rem", color: "#1a3a5c" },
};
