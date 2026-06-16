// CRUD de Cargos + gerenciamento de permissões do cargo.
//
// Tela em duas colunas:
//   - Esquerda: lista de cargos agrupados por setor
//   - Direita: detalhes do cargo selecionado com checkboxes de permissões
//
// Cada cargo armazena seu próprio array `permissoes` (denormalizado).

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useRBAC } from "../../rbac/RBACContext";
import ProtegerPor from "../../rbac/ProtegerPor";
import { PERMISSOES_POR_MODULO } from "../../rbac/permissoes-catalogo";
import LogoPontual from "../../components/LogoPontual";

const VAZIO = { nome: "", setor_id: "", nivel: 1, descricao: "", status: "ativo", permissoes: [] };

export default function Cargos() {
  const navigate = useNavigate();
  const { temPermissao } = useRBAC();

  const [setores, setSetores]     = useState([]);
  const [cargos, setCargos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(VAZIO);
  const [salvando, setSalvando]   = useState(false);
  const [erro, setErro]           = useState("");
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [permsLocal, setPermsLocal]       = useState([]);
  const [salvandoPerms, setSalvandoPerms] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [setoresSnap, cargosSnap] = await Promise.all([
        getDocs(query(collection(db, "setores"), orderBy("nome"))),
        getDocs(query(collection(db, "cargos"),  orderBy("nivel", "desc"))),
      ]);
      setSetores(setoresSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargos(cargosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // carrega ao montar; loader reusado no refresh
  useEffect(() => { carregar(); }, []);

  const selecionado = useMemo(
    () => cargos.find(c => c.id === selecionadoId) || null,
    [cargos, selecionadoId]
  );

  // reseta cópia editável ao trocar de cargo
  useEffect(() => {
    setPermsLocal(Array.isArray(selecionado?.permissoes) ? [...selecionado.permissoes] : []);
  }, [selecionadoId, selecionado?.permissoes]);

  const cargosAgrupados = useMemo(() => {
    return setores.map(set => ({
      setor: set,
      cargos: cargos.filter(c => c.setor_id === set.id),
    }));
  }, [setores, cargos]);

  function abrirNovo() {
    setForm({ ...VAZIO, setor_id: setores[0]?.id || "" });
    setEditId(null); setErro(""); setModal(true);
  }

  function abrirEditar(c) {
    setForm({
      nome: c.nome || "",
      setor_id: c.setor_id || "",
      nivel: c.nivel ?? 1,
      descricao: c.descricao || "",
      status: c.status || "ativo",
      permissoes: c.permissoes || [],
    });
    setEditId(c.id); setErro(""); setModal(true);
  }

  function fechar() {
    setModal(false); setForm(VAZIO); setEditId(null); setErro("");
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim())   return setErro("Nome é obrigatório.");
    if (!form.setor_id)      return setErro("Selecione um setor.");

    setSalvando(true); setErro("");
    try {
      const payload = {
        nome:      form.nome.trim(),
        setor_id:  form.setor_id,
        nivel:     Number(form.nivel) || 1,
        descricao: form.descricao.trim(),
        status:    form.status,
        permissoes: form.permissoes || [],
        updated_at: serverTimestamp(),
      };
      if (editId) {
        await updateDoc(doc(db, "cargos", editId), payload);
      } else {
        await addDoc(collection(db, "cargos"), { ...payload, created_at: serverTimestamp() });
      }
      await carregar();
      fechar();
    } catch (err) {
      setErro("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(c) {
    if (!window.confirm(`Excluir cargo "${c.nome}"?\n\nUsuários vinculados perderão suas permissões.`)) return;
    try {
      await deleteDoc(doc(db, "cargos", c.id));
      if (selecionadoId === c.id) setSelecionadoId(null);
      carregar();
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  }

  function togglePerm(nome) {
    setPermsLocal(prev =>
      prev.includes(nome) ? prev.filter(p => p !== nome) : [...prev, nome]
    );
  }

  function marcarTodasModulo(modulo, valor) {
    const itens = PERMISSOES_POR_MODULO.find(g => g.modulo.id === modulo)?.itens || [];
    setPermsLocal(prev => {
      const set = new Set(prev);
      itens.forEach(p => valor ? set.add(p.nome) : set.delete(p.nome));
      return Array.from(set);
    });
  }

  async function salvarPermissoes() {
    if (!selecionado) return;
    setSalvandoPerms(true);
    try {
      await updateDoc(doc(db, "cargos", selecionado.id), {
        permissoes: permsLocal,
        updated_at: serverTimestamp(),
      });
      await carregar();
    } catch (e) {
      alert("Erro ao salvar permissões: " + e.message);
    } finally {
      setSalvandoPerms(false);
    }
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <LogoPontual height={36} variant="white" />
        <span style={s.titulo}>Cargos &amp; Permissões</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ProtegerPor permissao="cargos.criar">
            <button style={s.btnNovo} onClick={abrirNovo} disabled={setores.length === 0}>
              + Novo Cargo
            </button>
          </ProtegerPor>
          <button style={s.btnBack} onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>
      </header>

      {setores.length === 0 && !loading && (
        <div style={s.aviso}>
          Cadastre <a href="/admin/setores">setores</a> antes de criar cargos.
        </div>
      )}

      <div style={s.body}>
        <div style={s.grid} className="layout-sidebar">
          {/* COLUNA ESQUERDA: lista de cargos */}
          <div style={s.painelEsq}>
            <h3 style={s.painelTitulo}>Cargos por setor</h3>
            {loading ? (
              <p style={s.info}>Carregando...</p>
            ) : cargosAgrupados.length === 0 ? (
              <p style={s.info}>Nenhum setor cadastrado.</p>
            ) : (
              cargosAgrupados.map(grupo => (
                <div key={grupo.setor.id} style={{ marginBottom: 18 }}>
                  <div style={s.grupoTitulo}>{grupo.setor.nome}</div>
                  {grupo.cargos.length === 0 ? (
                    <p style={s.grupoVazio}>— sem cargos —</p>
                  ) : (
                    grupo.cargos.map(c => (
                      <div
                        key={c.id}
                        style={{
                          ...s.cargoItem,
                          background: selecionadoId === c.id ? "#dbeafe" : "#fff",
                          borderColor: selecionadoId === c.id ? "#1d4ed8" : "#e2e8f0",
                          opacity: c.status === "inativo" ? 0.5 : 1,
                        }}
                        onClick={() => setSelecionadoId(c.id)}
                      >
                        <div style={{ flex: 1 }}>
                          <strong>{c.nome}</strong>
                          <div style={{ fontSize: ".7rem", color: "#64748b" }}>
                            Nível {c.nivel ?? 1} · {(c.permissoes || []).length} permissões
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <ProtegerPor permissao="cargos.editar">
                            <button style={s.btnMiniEdit}
                              onClick={(ev) => { ev.stopPropagation(); abrirEditar(c); }}>✏</button>
                          </ProtegerPor>
                          <ProtegerPor permissao="cargos.excluir">
                            <button style={s.btnMiniDel}
                              onClick={(ev) => { ev.stopPropagation(); excluir(c); }}>×</button>
                          </ProtegerPor>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))
            )}
          </div>

          {/* COLUNA DIREITA: permissões do cargo */}
          <div style={s.painelDir}>
            {!selecionado ? (
              <div style={s.placeholder}>
                <p style={{ color: "#64748b" }}>Selecione um cargo para editar permissões.</p>
              </div>
            ) : (
              <>
                <div style={s.painelHeader}>
                  <div>
                    <h3 style={s.painelTitulo}>{selecionado.nome}</h3>
                    <p style={{ color: "#64748b", fontSize: ".8rem" }}>
                      {setores.find(x => x.id === selecionado.setor_id)?.nome} · Nível {selecionado.nivel ?? 1}
                    </p>
                  </div>
                  <ProtegerPor permissao="permissoes.editar">
                    <button
                      style={s.btnSalvar}
                      onClick={salvarPermissoes}
                      disabled={salvandoPerms}
                    >
                      {salvandoPerms ? "Salvando..." : "💾 Salvar permissões"}
                    </button>
                  </ProtegerPor>
                </div>

                <div style={s.permGrid}>
                  {PERMISSOES_POR_MODULO.map(grupo => {
                    return (
                      <div key={grupo.modulo.id} style={s.permGrupo}>
                        <div style={s.permGrupoHeader}>
                          <strong>{grupo.modulo.label}</strong>
                          <ProtegerPor permissao="permissoes.editar">
                            <div style={{ display: "flex", gap: 4 }}>
                              <button style={s.btnMini}
                                onClick={() => marcarTodasModulo(grupo.modulo.id, true)}>
                                Marcar tudo
                              </button>
                              <button style={s.btnMiniClear}
                                onClick={() => marcarTodasModulo(grupo.modulo.id, false)}>
                                Limpar
                              </button>
                            </div>
                          </ProtegerPor>
                        </div>
                        <div style={s.permItens}>
                          {grupo.itens.map(p => (
                            <label key={p.nome} style={s.permLabel}>
                              <input
                                type="checkbox"
                                checked={permsLocal.includes(p.nome)}
                                onChange={() => togglePerm(p.nome)}
                                disabled={!temPermissao("permissoes.editar")}
                              />
                              <span>{p.descricao}</span>
                              <code style={s.permCode}>{p.nome}</code>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={fechar}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
            <div style={s.mh}>
              <h3 style={{ color: "#fff", fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                {editId ? "Editar Cargo" : "Novo Cargo"}
              </h3>
              <button style={s.mclose} onClick={fechar}>×</button>
            </div>
            <form onSubmit={salvar} style={s.mform}>
              <label style={s.mlbl}>
                Setor *
                <select style={s.minp} value={form.setor_id}
                  onChange={e => setForm({ ...form, setor_id: e.target.value })} required>
                  <option value="">Selecione...</option>
                  {setores.map(set => <option key={set.id} value={set.id}>{set.nome}</option>)}
                </select>
              </label>
              <label style={s.mlbl}>
                Nome *
                <input style={s.minp} value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Supervisor" required />
              </label>
              <label style={s.mlbl}>
                Nível (1 = baixo, 5 = alto)
                <input style={s.minp} type="number" min={1} max={10} value={form.nivel}
                  onChange={e => setForm({ ...form, nivel: e.target.value })} />
              </label>
              <label style={s.mlbl}>
                Descrição
                <input style={s.minp} value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })} />
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
  aviso:   { background: "#fef9c3", borderLeft: "4px solid #f5c318", padding: "10px 20px", margin: "12px 24px", borderRadius: 6, color: "#854d0e", fontWeight: 600, fontSize: ".88rem" },
  body:    { padding: 24, maxWidth: 1400, margin: "0 auto" },
  grid:    { display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" },
  painelEsq: { background: "#fff", padding: 16, borderRadius: 10, border: "1px solid #e2e8f0", maxHeight: "calc(100vh - 200px)", overflowY: "auto" },
  painelDir: { background: "#fff", padding: 20, borderRadius: 10, border: "1px solid #e2e8f0", minHeight: 400 },
  painelHeader: { display: "flex", justifyContent: "space-between", alignItems: "start", borderBottom: "1px solid #f1f5f9", paddingBottom: 12, marginBottom: 16 },
  painelTitulo: { color: "#1a3a5c", margin: 0, fontSize: "1rem" },
  grupoTitulo: { fontSize: ".75rem", textTransform: "uppercase", fontWeight: 700, color: "#1a3a5c", marginBottom: 8, letterSpacing: ".5px" },
  grupoVazio:  { fontSize: ".78rem", color: "#94a3b8", fontStyle: "italic", margin: "4px 0 0 8px" },
  cargoItem:   { display: "flex", alignItems: "center", padding: "8px 10px", border: "1px solid", borderRadius: 6, marginBottom: 4, cursor: "pointer", fontSize: ".85rem", gap: 8 },
  btnMiniEdit: { background: "#dbeafe", color: "#1d4ed8", border: "none", padding: "3px 7px", borderRadius: 4, cursor: "pointer", fontSize: ".7rem" },
  btnMiniDel:  { background: "#fee2e2", color: "#dc2626", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: ".8rem", fontWeight: 700 },
  placeholder: { padding: 60, textAlign: "center" },
  permGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 },
  permGrupo:   { border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, background: "#f8fafc" },
  permGrupoHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, color: "#1a3a5c" },
  permItens:   { display: "flex", flexDirection: "column", gap: 4 },
  permLabel:   { display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 8, fontSize: ".8rem", cursor: "pointer", padding: "4px 6px", borderRadius: 4 },
  permCode:    { fontSize: ".68rem", color: "#94a3b8", fontFamily: "monospace" },
  btnMini:     { background: "#dcfce7", color: "#15803d", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: ".7rem", fontWeight: 600 },
  btnMiniClear:{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: ".7rem", fontWeight: 600 },
  btnSalvar:   { padding: "7px 20px", background: "#f5c318", color: "#1a3a5c", border: "none", borderRadius: 7, fontWeight: 700, cursor: "pointer", fontSize: ".85rem" },
  info:        { color: "#94a3b8", textAlign: "center", marginTop: 20, fontSize: ".88rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modal:   { background: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,.2)" },
  mh:      { background: "#1a3a5c", padding: "14px 20px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  mclose:  { background: "none", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer" },
  mform:   { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  mlbl:    { display: "flex", flexDirection: "column", gap: 5, fontSize: ".82rem", fontWeight: 600, color: "#374151" },
  minp:    { padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: ".9rem", outline: "none", fontFamily: "inherit" },
  mfoot:   { display: "flex", gap: 10, justifyContent: "flex-end" },
  mbtnCancel: { padding: "8px 18px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".85rem", color: "#475569" },
  mbtnSave:   { padding: "8px 24px", background: "#f5c318", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: ".85rem", color: "#1a3a5c" },
};
