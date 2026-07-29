// Tela de Usuários — integrada ao RBAC novo.
//
// Comportamento principal:
//   1. Setor → Cargo é carregado dinamicamente (cargos do setor selecionado).
//   2. Toggle `is_super_admin` (ignora todas as permissões).
//   3. `role` legacy mantido vazio nos novos usuários (compatibilidade).
//
// Acesso: rota protegida por `usuarios.ver` no App.jsx.
// Botões: protegidos por `usuarios.criar` / `usuarios.editar` / `usuarios.excluir`.

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { list as dsList } from "../services/genericDataSource";
import { authApi } from "../services/pontualApi";
import { useRBAC } from "../rbac/RBACContext";
import ProtegerPor from "../rbac/ProtegerPor";
import ModuleHeader from "../components/ModuleHeader";
import ExportBar from "../components/ExportBar";

const VAZIO = {
  nome: "",
  email: "",
  senha: "",
  setor_id: "",
  cargo_id: "",
  is_super_admin: false,
};

export default function Usuarios() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useRBAC();

  const [usuarios, setUsuarios] = useState([]);
  const [setores, setSetores]   = useState([]);
  const [cargos, setCargos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState("");
  const [busca, setBusca]       = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [usuariosRows, setoresRows, cargosRows] = await Promise.all([
        authApi.listUsers(),
        dsList("setores",  { orderBy: "nome" }),
        dsList("cargos",   { orderBy: "nome" }),
      ]);
      setUsuarios(usuariosRows);
      setSetores(setoresRows);
      setCargos(cargosRows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // carrega ao montar; loader reusado no refresh
  useEffect(() => { carregar(); }, []);

  // Cargos filtrados pelo setor selecionado no form (carregamento dinâmico).
  const cargosDoSetor = useMemo(
    () => cargos.filter(c => c.setor_id === form.setor_id && c.status !== "inativo"),
    [cargos, form.setor_id]
  );

  function abrirNovo() {
    setForm(VAZIO); setEditId(null); setErro(""); setModal(true);
  }

  function abrirEditar(u) {
    setForm({
      nome: u.nome || "",
      email: u.email || "",
      senha: "",
      setor_id: u.setor_id || "",
      cargo_id: u.cargo_id || "",
      is_super_admin: !!u.is_super_admin,
    });
    setEditId(u.id); setErro(""); setModal(true);
  }

  function fechar() {
    setModal(false); setForm(VAZIO); setEditId(null); setErro("");
  }

  function trocarSetor(novoSetorId) {
    // Ao trocar de setor, limpa o cargo selecionado
    setForm(prev => ({ ...prev, setor_id: novoSetorId, cargo_id: "" }));
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim())             return setErro("Nome é obrigatório.");
    if (!form.email.trim())            return setErro("E-mail é obrigatório.");
    if (!editId && !form.senha)        return setErro("Senha é obrigatória.");
    if (!editId && form.senha.length < 6) return setErro("Senha mínimo 6 caracteres.");
    if (!form.is_super_admin && !form.setor_id) return setErro("Selecione um setor (ou marque como Super Admin).");
    if (!form.is_super_admin && !form.cargo_id) return setErro("Selecione um cargo (ou marque como Super Admin).");

    setSalvando(true); setErro("");
    try {
      if (editId) {
        await authApi.updateUser(editId, {
          nome:           form.nome.trim(),
          setor_id:       form.setor_id || null,
          cargo_id:       form.cargo_id || null,
          is_super_admin: !!form.is_super_admin,
        });
      } else {
        await authApi.createUser({
          nome:           form.nome.trim(),
          email:          form.email.trim().toLowerCase(),
          senha:          form.senha,
          setor_id:       form.setor_id || null,
          cargo_id:       form.cargo_id || null,
          is_super_admin: !!form.is_super_admin,
        });
      }
      await carregar();
      fechar();
    } catch (err) {
      const code = err.body?.error || err.message;
      if (code === "email_ja_cadastrado")   setErro("Este e-mail já está cadastrado.");
      else if (code === "senha_minimo_6")   setErro("Senha mínimo 6 caracteres.");
      else                                  setErro("Erro ao salvar: " + (err.message || code));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(u) {
    try {
      await authApi.updateUser(u.id, { ativo: !u.ativo });
      carregar();
    } catch (e) {
      alert("Erro ao atualizar: " + e.message);
    }
  }

  async function resetarSenha(u) {
    const novaSenha = window.prompt(`Nova senha para "${u.nome || u.email}"\n(mínimo 6 caracteres):`);
    if (novaSenha == null) return; // cancelou
    if (String(novaSenha).length < 6) { alert("Senha muito curta — mínimo 6 caracteres."); return; }
    if (!window.confirm(`Confirmar reset da senha de "${u.nome || u.email}"?\n\nA senha nova ficará: ${novaSenha}\n\nAvise o usuário.`)) return;
    try {
      await authApi.resetSenha(u.id, novaSenha);
      alert(`Senha resetada. Nova senha: ${novaSenha}`);
    } catch (e) {
      alert("Erro ao resetar: " + (e.message || e));
    }
  }

  async function excluir(u) {
    if (!window.confirm(`Excluir PERMANENTEMENTE "${u.nome || u.email}"?\n\nEssa ação não pode ser desfeita.\nSe quiser só bloquear o acesso, use "Inativar".`)) return;
    try {
      await authApi.deleteUser(u.id);
      carregar();
    } catch (e) {
      const code = e.body?.error || e.message;
      if (code === "nao_pode_excluir_a_si_mesmo") alert("Você não pode excluir seu próprio usuário.");
      else alert("Erro ao excluir: " + (e.message || code));
    }
  }

  const lista = usuarios.filter(u => {
    const txt = busca.toLowerCase();
    return !txt || u.nome?.toLowerCase().includes(txt) || u.email?.toLowerCase().includes(txt);
  });

  function rotuloSetor(id) {
    return setores.find(s => s.id === id)?.nome || "—";
  }
  function rotuloCargo(id) {
    return cargos.find(c => c.id === id)?.nome || "—";
  }

  return (
    <div style={s.wrap}>
      <ModuleHeader
        title="Usuários"
        actions={
          <ProtegerPor permissao="usuarios.criar">
            <button className="mod-hbtn-alt" onClick={abrirNovo}>+ Novo Usuário</button>
          </ProtegerPor>
        }
      />

      <div style={s.body} className="pg-body">
        <div style={s.toolbar} className="pg-toolbar">
          <input style={s.busca} placeholder="Buscar por nome ou e-mail..."
            value={busca} onChange={e => setBusca(e.target.value)} />
          <span style={s.total}>{lista.length} usuário{lista.length !== 1 ? "s" : ""}</span>
        </div>

        <ExportBar
          titulo="Usuários"
          arquivo="usuarios"
          subtitulo={() => `${lista.length} usuário(s)${busca ? ` · busca: "${busca}"` : ""}`}
          dados={() => ({
            colunas: ["Nome", "E-mail", "Setor", "Cargo", "Super Admin", "Status"],
            linhas: lista.map((u) => [
              u.nome || "",
              u.email || "",
              u.is_super_admin ? "—" : rotuloSetor(u.setor_id),
              u.is_super_admin ? "—" : rotuloCargo(u.cargo_id),
              u.is_super_admin ? "Sim" : "Não",
              u.ativo === false ? "Inativo" : "Ativo",
            ]),
          })}
        />

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
                  <th style={s.th}>Setor</th>
                  <th style={s.th}>Cargo</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(u => (
                  <tr key={u.id} style={{ opacity: u.ativo === false ? 0.5 : 1 }}>
                    <td style={s.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: u.is_super_admin ? "var(--accent)" : "var(--accent)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: 700, fontSize: ".85rem", flexShrink: 0 }}>
                          {u.nome?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text, #1f2937)" }}>{u.nome}</div>
                          {u.is_super_admin && (
                            <span style={{ fontSize: ".7rem", color: "var(--accent)", fontWeight: 700 }}>Super Admin</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...s.td, color: "var(--text-muted)", fontSize: ".83rem" }}>{u.email}</td>
                    <td style={s.td}>{rotuloSetor(u.setor_id)}</td>
                    <td style={s.td}>{rotuloCargo(u.cargo_id)}</td>
                    <td style={s.td}>
                      <span style={{
                        background: u.ativo === false ? "var(--danger-bg)" : "var(--success-bg)",
                        color:      u.ativo === false ? "var(--danger)" : "var(--success)",
                        padding: "3px 10px", borderRadius: 20, fontSize: ".75rem", fontWeight: 700
                      }}>
                        {u.ativo === false ? "Inativo" : "Ativo"}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <ProtegerPor permissao="usuarios.editar">
                          <button style={s.btnEdit} onClick={() => abrirEditar(u)}>Editar</button>
                        </ProtegerPor>
                        <ProtegerPor permissao="usuarios.editar">
                          <button
                            style={{ ...s.btnEdit, background: "var(--info-bg, #dbeafe)", color: "var(--info, #1d4ed8)" }}
                            onClick={() => resetarSenha(u)}>
                            Senha
                          </button>
                        </ProtegerPor>
                        <ProtegerPor permissao="usuarios.editar">
                          <button
                            style={{ ...s.btnEdit, background: u.ativo === false ? "var(--success-bg)" : "var(--warning-bg)",
                              color: u.ativo === false ? "var(--success)" : "var(--warning)" }}
                            onClick={() => alternarAtivo(u)}>
                            {u.ativo === false ? "Ativar" : "Inativar"}
                          </button>
                        </ProtegerPor>
                        <ProtegerPor permissao="usuarios.excluir">
                          <button style={{ ...s.btnEdit, background: "var(--danger-bg)", color: "var(--danger)" }}
                            onClick={() => excluir(u)}>Excluir</button>
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
                {editId ? "Editar Usuário" : "Novo Usuário"}
              </h3>
              <button style={s.mclose} onClick={fechar}>×</button>
            </div>
            <form onSubmit={salvar} style={s.mform}>
              <label style={s.mlbl}>
                Nome completo
                <input style={s.minp} value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: João Silva" required />
              </label>

              <label style={s.mlbl}>
                E-mail
                <input style={s.minp} type="email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="joao@pontual.com.br"
                  disabled={!!editId} required />
                {editId && <span style={{ fontSize: ".7rem", color: "var(--text-subtle)", marginTop: 2 }}>E-mail não pode ser alterado</span>}
              </label>

              {!editId && (
                <label style={s.mlbl}>
                  Senha
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
                        background: "none", border: "none", cursor: "pointer", color: "var(--text-subtle)", fontSize: ".8rem" }}
                      onClick={() => setSenhaVisivel(v => !v)}>
                      {senhaVisivel ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </label>
              )}

              <div className="grid-form-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={s.mlbl}>
                  Setor
                  <select style={s.minp} value={form.setor_id}
                    onChange={e => trocarSetor(e.target.value)}
                    disabled={form.is_super_admin}>
                    <option value="">Selecione...</option>
                    {setores.filter(x => x.status !== "inativo").map(set =>
                      <option key={set.id} value={set.id}>{set.nome}</option>
                    )}
                  </select>
                </label>

                <label style={s.mlbl}>
                  Cargo
                  <select style={s.minp} value={form.cargo_id}
                    onChange={e => setForm({ ...form, cargo_id: e.target.value })}
                    disabled={form.is_super_admin || !form.setor_id}>
                    <option value="">
                      {form.setor_id ? "Selecione..." : "Escolha um setor antes"}
                    </option>
                    {cargosDoSetor.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </label>
              </div>

              <ProtegerPor permissao="usuarios.criar"
                fallback={null}>
                {isSuperAdmin && (
                  <label style={{ ...s.mlbl, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <input type="checkbox" checked={form.is_super_admin}
                      onChange={e => setForm({ ...form, is_super_admin: e.target.checked })} />
                    <span style={{ color: "var(--accent)" }}>Super Admin (ignora todas as permissões)</span>
                  </label>
                )}
              </ProtegerPor>

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
  wrap:    { minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)" },
  header:  { background: "var(--header-bg)", borderBottom: "1px solid var(--header-border)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 8px rgba(0,0,0,.15)" },
  titulo:  { color: "#fff", fontWeight: 700, fontSize: "1.1rem" },
  btnNovo: { padding: "7px 16px", background: "var(--header-btn-bg)", color: "var(--accent)", border: "none", borderRadius: 7, fontWeight: 700, cursor: "pointer", fontSize: ".85rem" },
  btnBack: { padding: "7px 16px", background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 7, cursor: "pointer", fontSize: ".85rem", display: "inline-flex", alignItems: "center", gap: 6 },
  body:    { padding: 24, maxWidth: 1200, margin: "0 auto" },
  toolbar: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  busca:   { flex: 1, padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border, #cbd5e1)", fontSize: ".88rem", outline: "none" },
  total:   { fontSize: ".82rem", color: "var(--text-subtle)", whiteSpace: "nowrap" },
  info:    { color: "var(--text-subtle)", textAlign: "center", marginTop: 40 },
  tabWrap: { background: "var(--card-bg, #fff)", borderRadius: 10, border: "1px solid var(--border, #e2e8f0)", overflowX: "auto" },
  table:   { width: "100%", borderCollapse: "collapse", fontSize: ".85rem" },
  th:      { padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "var(--accent)", background: "var(--bg, #f8fafc)", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" },
  td:      { padding: "12px 16px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" },
  btnEdit: { padding: "5px 12px", background: "var(--accent-soft)", color: "var(--accent)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".75rem", whiteSpace: "nowrap" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modal:   { background: "var(--card-bg, #fff)", borderRadius: 12, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,.2)" },
  mh:      { background: "var(--accent)", padding: "14px 20px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  mclose:  { background: "none", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer" },
  mform:   { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  mlbl:    { display: "flex", flexDirection: "column", gap: 5, fontSize: ".82rem", fontWeight: 600, color: "var(--text)" },
  minp:    { padding: "8px 10px", border: "1px solid var(--border, #cbd5e1)", borderRadius: 6, fontSize: ".9rem", outline: "none", fontFamily: "inherit" },
  mfoot:   { display: "flex", gap: 10, justifyContent: "flex-end" },
  mbtnCancel: { padding: "8px 18px", background: "var(--surface-3)", border: "1px solid var(--border, #cbd5e1)", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".85rem", color: "var(--text-muted)" },
  mbtnSave:   { padding: "8px 24px", background: "var(--accent)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: ".85rem", color: "#fff" },
};
