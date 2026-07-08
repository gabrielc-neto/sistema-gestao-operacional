// CRUD de Cargos + gerenciamento de permissões, organizado por setor.
//
// Layout centralizado (coluna única): cada setor é uma seção com seus cargos
// em cards (Editar · Permissões · Excluir). No topo, criar Setor e criar Cargo.
// As permissões de cada cargo são editadas num modal dedicado.
//
// Cada cargo armazena seu próprio array `permissoes` (denormalizado).

import { useState, useEffect, useMemo } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useRBAC } from "../../rbac/RBACContext";
import ProtegerPor from "../../rbac/ProtegerPor";
import { PERMISSOES_POR_MODULO } from "../../rbac/permissoes-catalogo";
import ModuleHeader from "../../components/ModuleHeader";
import ExportBar from "../../components/ExportBar";
import { Save, Pencil, Trash2, ShieldCheck, Plus, Building2, X } from "lucide-react";

const VAZIO = { nome: "", setor_id: "", nivel: 1, descricao: "", status: "ativo", permissoes: [] };
const SETOR_VAZIO = { nome: "", descricao: "", status: "ativo" };

export default function Cargos() {
  const { temPermissao } = useRBAC();

  const [setores, setSetores]     = useState([]);
  const [cargos, setCargos]       = useState([]);
  const [loading, setLoading]     = useState(true);

  // modal de cargo (criar/editar dados)
  const [modal, setModal]         = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(VAZIO);
  const [salvando, setSalvando]   = useState(false);
  const [erro, setErro]           = useState("");

  // modal de setor (criar)
  const [setorModal, setSetorModal]     = useState(false);
  const [setorForm, setSetorForm]       = useState(SETOR_VAZIO);
  const [salvandoSetor, setSalvandoSetor] = useState(false);
  const [erroSetor, setErroSetor]       = useState("");

  // modal de permissões (do cargo selecionado)
  const [permCargo, setPermCargo]       = useState(null);
  const [permsLocal, setPermsLocal]     = useState([]);
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

  const cargosAgrupados = useMemo(() => {
    return setores.map(set => ({
      setor: set,
      cargos: cargos.filter(c => c.setor_id === set.id),
    }));
  }, [setores, cargos]);

  // ── Cargo: criar/editar/excluir ────────────────────────────────────────────
  function abrirNovo(setorId) {
    setForm({ ...VAZIO, setor_id: setorId || setores[0]?.id || "" });
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
      if (permCargo?.id === c.id) setPermCargo(null);
      carregar();
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  }

  // ── Setor: criar ───────────────────────────────────────────────────────────
  function abrirNovoSetor() { setSetorForm(SETOR_VAZIO); setErroSetor(""); setSetorModal(true); }
  function fecharSetor() { setSetorModal(false); setSetorForm(SETOR_VAZIO); setErroSetor(""); }

  async function salvarSetor(e) {
    e.preventDefault();
    if (!setorForm.nome.trim()) return setErroSetor("Nome é obrigatório.");
    setSalvandoSetor(true); setErroSetor("");
    try {
      await addDoc(collection(db, "setores"), {
        nome: setorForm.nome.trim(),
        descricao: setorForm.descricao.trim(),
        status: setorForm.status,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      await carregar();
      fecharSetor();
    } catch (err) {
      setErroSetor("Erro ao salvar: " + err.message);
    } finally {
      setSalvandoSetor(false);
    }
  }

  // ── Permissões: modal ──────────────────────────────────────────────────────
  function abrirPerms(c) {
    setPermCargo(c);
    setPermsLocal(Array.isArray(c.permissoes) ? [...c.permissoes] : []);
  }
  function fecharPerms() { setPermCargo(null); setPermsLocal([]); }

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
    if (!permCargo) return;
    setSalvandoPerms(true);
    try {
      await updateDoc(doc(db, "cargos", permCargo.id), {
        permissoes: permsLocal,
        updated_at: serverTimestamp(),
      });
      await carregar();
      fecharPerms();
    } catch (e) {
      alert("Erro ao salvar permissões: " + e.message);
    } finally {
      setSalvandoPerms(false);
    }
  }

  const totalCargosVisiveis = cargos.length;

  return (
    <div style={s.wrap}>
      <ModuleHeader
        title="Cargos & Permissões"
        actions={
          <>
            <ProtegerPor permissao="setores.criar">
              <button className="mod-hbtn-alt" onClick={abrirNovoSetor}>
                <Building2 size={15} /> Novo Setor
              </button>
            </ProtegerPor>
            <ProtegerPor permissao="cargos.criar">
              <button className="mod-hbtn-alt" onClick={() => abrirNovo()} disabled={setores.length === 0}>
                <Plus size={15} /> Novo Cargo
              </button>
            </ProtegerPor>
          </>
        }
      />

      {setores.length === 0 && !loading && (
        <div style={s.aviso}>
          Nenhum setor cadastrado ainda. Use <strong>“Novo Setor”</strong> acima para começar.
        </div>
      )}

      <div style={s.body}>
        <ExportBar
          titulo="Cargos & Permissões"
          arquivo="cargos"
          subtitulo={() => `${totalCargosVisiveis} cargo(s) · ${setores.length} setor(es)`}
          dados={() => ({
            colunas: ["Cargo", "Setor", "Nível", "Status", "Nº permissões", "Descrição"],
            linhas: cargos.map((c) => [
              c.nome || "",
              setores.find((st) => st.id === c.setor_id)?.nome || "—",
              c.nivel ?? 1,
              c.status === "inativo" ? "Inativo" : "Ativo",
              (c.permissoes || []).length,
              c.descricao || "",
            ]),
          })}
        />

        {loading ? (
          <p style={s.info}>Carregando...</p>
        ) : cargosAgrupados.length === 0 ? (
          <p style={s.info}>Nenhum setor cadastrado.</p>
        ) : (
          cargosAgrupados.map(grupo => (
            <section key={grupo.setor.id} style={s.setorSection}>
              <div style={s.setorHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={s.setorIcon}><Building2 size={16} /></span>
                  <span style={s.setorNome}>{grupo.setor.nome}</span>
                  <span style={s.setorCount}>{grupo.cargos.length} cargo{grupo.cargos.length === 1 ? "" : "s"}</span>
                </div>
                <ProtegerPor permissao="cargos.criar">
                  <button style={s.btnAddCargo} onClick={() => abrirNovo(grupo.setor.id)}>
                    <Plus size={13} /> Cargo
                  </button>
                </ProtegerPor>
              </div>

              {grupo.cargos.length === 0 ? (
                <p style={s.grupoVazio}>Nenhum cargo neste setor ainda.</p>
              ) : (
                <div style={s.cargosGrid}>
                  {grupo.cargos.map(c => {
                    const inativo = c.status === "inativo";
                    return (
                      <div key={c.id} style={{ ...s.cargoCard, opacity: inativo ? 0.6 : 1 }}>
                        <div style={s.cargoTop}>
                          <strong style={s.cargoNome}>{c.nome}</strong>
                          <span style={{ ...s.badge, background: inativo ? "var(--danger-bg)" : "var(--success-bg)", color: inativo ? "var(--danger)" : "var(--success)" }}>
                            {inativo ? "Inativo" : "Ativo"}
                          </span>
                        </div>
                        <div style={s.cargoMeta}>
                          Nível {c.nivel ?? 1} · {(c.permissoes || []).length} permiss{(c.permissoes || []).length === 1 ? "ão" : "ões"}
                        </div>
                        {c.descricao && <div style={s.cargoDesc}>{c.descricao}</div>}

                        <div style={s.cargoActions}>
                          <button style={s.btnPerms} onClick={() => abrirPerms(c)}>
                            <ShieldCheck size={14} /> Permissões
                          </button>
                          <ProtegerPor permissao="cargos.editar">
                            <button style={s.btnEditar} onClick={() => abrirEditar(c)}>
                              <Pencil size={14} /> Editar
                            </button>
                          </ProtegerPor>
                          <ProtegerPor permissao="cargos.excluir">
                            <button style={s.btnExcluir} onClick={() => excluir(c)}>
                              <Trash2 size={14} /> Excluir
                            </button>
                          </ProtegerPor>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))
        )}
      </div>

      {/* MODAL CARGO */}
      {modal && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={fechar}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
            <div style={s.mh}>
              <h3 style={{ color: "#fff", fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                {editId ? "Editar Cargo" : "Novo Cargo"}
              </h3>
              <button style={s.mclose} onClick={fechar}><X size={18} /></button>
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

              {erro && <p style={s.erroMsg}>{erro}</p>}

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

      {/* MODAL SETOR */}
      {setorModal && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={fecharSetor}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
            <div style={s.mh}>
              <h3 style={{ color: "#fff", fontSize: "1rem", fontWeight: 700, margin: 0 }}>Novo Setor</h3>
              <button style={s.mclose} onClick={fecharSetor}><X size={18} /></button>
            </div>
            <form onSubmit={salvarSetor} style={s.mform}>
              <label style={s.mlbl}>
                Nome *
                <input style={s.minp} value={setorForm.nome}
                  onChange={e => setSetorForm({ ...setorForm, nome: e.target.value })}
                  placeholder="Ex: Logística" required />
              </label>
              <label style={s.mlbl}>
                Descrição
                <input style={s.minp} value={setorForm.descricao}
                  onChange={e => setSetorForm({ ...setorForm, descricao: e.target.value })}
                  placeholder="Descreva o setor..." />
              </label>
              <label style={s.mlbl}>
                Status
                <select style={s.minp} value={setorForm.status}
                  onChange={e => setSetorForm({ ...setorForm, status: e.target.value })}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>

              {erroSetor && <p style={s.erroMsg}>{erroSetor}</p>}

              <div style={s.mfoot}>
                <button type="button" style={s.mbtnCancel} onClick={fecharSetor}>Cancelar</button>
                <button type="submit" style={s.mbtnSave} disabled={salvandoSetor}>
                  {salvandoSetor ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PERMISSÕES */}
      {permCargo && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={fecharPerms}>
          <div style={s.permModal} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
            <div style={s.mh}>
              <div>
                <h3 style={{ color: "#fff", fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                  Permissões · {permCargo.nome}
                </h3>
                <div style={{ color: "rgba(255,255,255,.7)", fontSize: ".75rem", marginTop: 2 }}>
                  {setores.find(x => x.id === permCargo.setor_id)?.nome} · Nível {permCargo.nivel ?? 1} · {permsLocal.length} marcadas
                </div>
              </div>
              <button style={s.mclose} onClick={fecharPerms}><X size={18} /></button>
            </div>

            <div style={s.permBody}>
              <div style={s.permGrid}>
                {PERMISSOES_POR_MODULO.map(grupo => (
                  <div key={grupo.modulo.id} style={s.permGrupo}>
                    <div style={s.permGrupoHeader}>
                      <strong>{grupo.modulo.label}</strong>
                      <ProtegerPor permissao="permissoes.editar">
                        <div style={{ display: "flex", gap: 4 }}>
                          <button style={s.btnMini} onClick={() => marcarTodasModulo(grupo.modulo.id, true)}>Marcar tudo</button>
                          <button style={s.btnMiniClear} onClick={() => marcarTodasModulo(grupo.modulo.id, false)}>Limpar</button>
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
                ))}
              </div>
            </div>

            <div style={s.permFoot}>
              <button type="button" style={s.mbtnCancel} onClick={fecharPerms}>Fechar</button>
              <ProtegerPor permissao="permissoes.editar">
                <button style={s.btnSalvar} onClick={salvarPermissoes} disabled={salvandoPerms}>
                  {salvandoPerms ? "Salvando..." : <><Save size={14} /> Salvar permissões</>}
                </button>
              </ProtegerPor>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:    { minHeight: "100vh", background: "var(--bg, #f0f4f8)", fontFamily: "var(--font)" },
  aviso:   { background: "var(--warning-bg)", borderLeft: "4px solid var(--warning)", padding: "10px 20px", margin: "12px 24px", borderRadius: 6, color: "var(--warning)", fontWeight: 600, fontSize: ".88rem" },
  body:    { padding: 24, maxWidth: 1100, margin: "0 auto" },
  info:    { color: "var(--text-subtle)", textAlign: "center", marginTop: 30, fontSize: ".9rem" },

  // setor section
  setorSection: { marginBottom: 24 },
  setorHeader:  { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 8, marginBottom: 12, borderBottom: "2px solid var(--border)" },
  setorIcon:    { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", flexShrink: 0 },
  setorNome:    { fontSize: "1rem", fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-display)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  setorCount:   { fontSize: ".7rem", fontWeight: 700, color: "var(--text-muted)", background: "var(--surface-3)", padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap" },
  btnAddCargo:  { display: "inline-flex", alignItems: "center", gap: 5, background: "var(--accent-soft)", color: "var(--accent)", border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: ".78rem", fontWeight: 700, whiteSpace: "nowrap" },
  grupoVazio:   { fontSize: ".82rem", color: "var(--text-subtle)", fontStyle: "italic", margin: "2px 0 4px 2px" },

  // cards
  cargosGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 },
  cargoCard:  { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 14, boxShadow: "var(--sh-sm)", display: "flex", flexDirection: "column", gap: 7 },
  cargoTop:   { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cargoNome:  { color: "var(--text)", fontSize: ".95rem", fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  badge:      { fontSize: ".68rem", fontWeight: 700, padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0 },
  cargoMeta:  { fontSize: ".74rem", color: "var(--text-muted)", fontWeight: 600 },
  cargoDesc:  { fontSize: ".78rem", color: "var(--text-subtle)", lineHeight: 1.35 },
  cargoActions:{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--border)" },
  btnPerms:   { display: "inline-flex", alignItems: "center", gap: 5, background: "var(--accent-soft)", color: "var(--accent)", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: ".75rem", fontWeight: 700 },
  btnEditar:  { display: "inline-flex", alignItems: "center", gap: 5, background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: ".75rem", fontWeight: 600 },
  btnExcluir: { display: "inline-flex", alignItems: "center", gap: 5, background: "var(--danger-bg)", color: "var(--danger)", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: ".75rem", fontWeight: 700 },

  // modais base
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modal:   { background: "var(--card-bg)", borderRadius: 12, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,.2)" },
  mh:      { background: "var(--accent)", padding: "14px 20px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  mclose:  { background: "none", border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", padding: 2, flexShrink: 0 },
  mform:   { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  mlbl:    { display: "flex", flexDirection: "column", gap: 5, fontSize: ".82rem", fontWeight: 600, color: "var(--text)" },
  minp:    { padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: ".9rem", outline: "none", fontFamily: "inherit", background: "var(--card-bg)", color: "var(--text)" },
  erroMsg: { color: "var(--danger)", fontSize: ".82rem", fontWeight: 600, background: "var(--danger-bg)", padding: "6px 10px", borderRadius: 6, margin: 0 },
  mfoot:   { display: "flex", gap: 10, justifyContent: "flex-end" },
  mbtnCancel: { padding: "8px 18px", background: "var(--surface-3)", border: "1px solid var(--border-strong)", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".85rem", color: "var(--text-muted)" },
  mbtnSave:   { padding: "8px 24px", background: "var(--accent)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: ".85rem", color: "#fff" },

  // modal de permissões (maior + rolável)
  permModal: { background: "var(--card-bg)", borderRadius: 12, width: "100%", maxWidth: 860, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.25)" },
  permBody:  { padding: 18, overflowY: "auto", flex: 1 },
  permGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 },
  permGrupo: { border: "1px solid var(--border)", borderRadius: 8, padding: 12, background: "var(--surface-2)" },
  permGrupoHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, color: "var(--accent)" },
  permItens: { display: "flex", flexDirection: "column", gap: 4 },
  permLabel: { display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 8, fontSize: ".8rem", cursor: "pointer", padding: "4px 6px", borderRadius: 4 },
  permCode:  { fontSize: ".68rem", color: "var(--text-subtle)", fontFamily: "monospace" },
  btnMini:      { background: "var(--success-bg)", color: "var(--success)", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: ".7rem", fontWeight: 600 },
  btnMiniClear: { background: "var(--danger-bg)", color: "var(--danger)", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: ".7rem", fontWeight: 600 },
  permFoot:  { display: "flex", gap: 10, justifyContent: "flex-end", padding: "12px 18px", borderTop: "1px solid var(--border)" },
  btnSalvar: { padding: "8px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, cursor: "pointer", fontSize: ".85rem", display: "inline-flex", alignItems: "center", gap: 6 },
};
