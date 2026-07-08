import { useState, useMemo } from "react";
import { addDoc, updateDoc, deleteDoc, doc, collection } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Package, Edit3, Trash2, X, ExternalLink } from "lucide-react";
import { VIDAS } from "./esquemas";

// Estilos compartilhados na aba
const st = {
  toolbar: { display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" },
  searchWrap: { position: "relative", flex: 1, minWidth: 220 },
  searchInput: { width: "100%", padding: "9px 14px 9px 36px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: ".9rem", fontFamily: "inherit", background: "#fff" },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" },
  filterSelect: { padding: "9px 12px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: ".85rem", background: "#fff", fontFamily: "inherit", color: "#334155" },
  primaryBtn: { padding: "10px 18px", borderRadius: 10, border: "none", background: "#059669", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: ".88rem", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 },
  card: { background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 1px 3px rgba(15,23,42,.05), 0 4px 12px -8px rgba(15,23,42,.10)", border: "1px solid #e2e8f0", position: "relative" },
  cardFogo: { fontSize: ".82rem", fontWeight: 800, color: "#1a3a5c", letterSpacing: "0.02em", marginBottom: 2 },
  cardMarca: { fontSize: ".95rem", fontWeight: 700, color: "#0f172a" },
  cardModelo: { fontSize: ".78rem", color: "#64748b" },
  cardRow: { display: "flex", justifyContent: "space-between", fontSize: ".76rem", color: "#475569", marginTop: 6 },
  cardActions: { position: "absolute", top: 10, right: 10, display: "flex", gap: 4 },
  iconBtn: { background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4, borderRadius: 6, display: "inline-flex" },

  emptyBox: { background: "#fff", borderRadius: 12, padding: "3rem", textAlign: "center", color: "#94a3b8", boxShadow: "0 1px 3px rgba(15,23,42,.05)" },

  // modal
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" },
  modal: { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 540, boxShadow: "0 24px 60px rgba(0,0,0,.35)", overflow: "hidden", maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column" },
  modalHeader: { padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  modalTitulo: { fontSize: "1rem", fontWeight: 800, color: "#1a3a5c" },
  modalBody: { padding: "16px 20px", overflowY: "auto" },
  modalFooter: { padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" },

  field: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 },
  fieldLabel: { fontSize: ".78rem", fontWeight: 600, color: "#475569" },
  fieldInput: { padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: ".88rem", fontFamily: "inherit", color: "#0f172a", outline: "none", background: "#fff" },

  saveBtn:   { padding: "10px 22px", borderRadius: 10, border: "none", background: "#059669", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: ".9rem", fontFamily: "inherit" },
  cancelBtn: { padding: "10px 18px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: ".88rem", fontFamily: "inherit" },
  deleteBtn: { padding: "8px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontWeight: 700, cursor: "pointer", fontSize: ".82rem", fontFamily: "inherit" },
  errMsg:    { color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: 8, fontSize: ".82rem", marginBottom: 8 },
};

const EMPTY_PNEU = {
  fogo: "",
  marca: "",
  modelo: "",
  medida: "",
  dot: "",
  vida: "novo",
  sulcoOriginal: "",
  fornecedor: "",
  fornecedorCnpj: "",
  custoAquisicao: "",
  dataCompra: new Date().toISOString().slice(0, 10),
  obs: "",
};

const fmtBRL = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AbaEstoque({ pneus, setPneus, fornecedores, garantirFornecedor, quemSou }) {
  const navigate = useNavigate();
  const [busca,    setBusca]    = useState("");
  const [filtroMarca,  setFiltroMarca]  = useState("todas");
  const [filtroMedida, setFiltroMedida] = useState("todas");
  const [filtroVida,   setFiltroVida]   = useState("todas");

  const [modal, setModal] = useState(null);   // null | { modo: "novo"|"edit", pneu }
  const [form,  setForm]  = useState({ ...EMPTY_PNEU });
  const [erro,  setErro]  = useState("");
  const [salvando, setSalvando] = useState(false);

  const emEstoque = useMemo(() => pneus.filter(p => p.status === "estoque"), [pneus]);

  const marcasDistintas  = useMemo(() => Array.from(new Set(pneus.map(p => p.marca).filter(Boolean))).sort(), [pneus]);
  const medidasDistintas = useMemo(() => Array.from(new Set(pneus.map(p => p.medida).filter(Boolean))).sort(), [pneus]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return emEstoque.filter(p => {
      if (q) {
        const alvo = `${p.fogo} ${p.marca} ${p.modelo} ${p.medida} ${p.fornecedor}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      if (filtroMarca  !== "todas" && p.marca  !== filtroMarca)  return false;
      if (filtroMedida !== "todas" && p.medida !== filtroMedida) return false;
      if (filtroVida   !== "todas" && p.vida   !== filtroVida)   return false;
      return true;
    });
  }, [emEstoque, busca, filtroMarca, filtroMedida, filtroVida]);

  function abrirNovo() {
    setForm({ ...EMPTY_PNEU });
    setErro("");
    setModal({ modo: "novo", pneu: null });
  }
  function abrirEdit(pneu) {
    setForm({
      fogo: pneu.fogo || "",
      marca: pneu.marca || "",
      modelo: pneu.modelo || "",
      medida: pneu.medida || "",
      dot: pneu.dot || "",
      vida: pneu.vida || "novo",
      sulcoOriginal: pneu.sulcoOriginal != null ? String(pneu.sulcoOriginal) : "",
      fornecedor: pneu.fornecedor || "",
      fornecedorCnpj: pneu.fornecedorCnpj || "",
      custoAquisicao: pneu.custoAquisicao != null ? String(pneu.custoAquisicao) : "",
      dataCompra: pneu.dataCompra || "",
      obs: pneu.obs || "",
    });
    setErro("");
    setModal({ modo: "edit", pneu });
  }
  function fechar() { setModal(null); setErro(""); }

  // Auto-preenche CNPJ ao selecionar fornecedor existente
  function onChangeFornecedor(nome) {
    const cnpjExistente = fornecedores.find(f => f.nome === nome)?.cnpj || "";
    setForm(f => ({ ...f, fornecedor: nome, fornecedorCnpj: cnpjExistente || f.fornecedorCnpj }));
  }

  async function salvar() {
    const fogo = (form.fogo || "").trim().toUpperCase();
    if (!fogo)         { setErro("Informe o número de fogo do pneu."); return; }
    if (!form.marca)   { setErro("Informe a marca.");                   return; }
    if (!form.medida)  { setErro("Informe a medida (ex: 295/80R22.5)."); return; }

    // Verifica duplicidade de fogo (só ao cadastrar novo, ou ao editar se o fogo mudou)
    const dup = pneus.find(p => p.fogo === fogo && p.id !== modal?.pneu?.id);
    if (dup) { setErro(`Fogo ${fogo} já cadastrado (id ${dup.id.slice(-6)}).`); return; }

    setSalvando(true);
    try {
      const nome = (form.fornecedor || "").trim();
      const cnpj = (form.fornecedorCnpj || "").trim();
      if (nome) await garantirFornecedor(nome, cnpj);

      const payload = {
        fogo,
        marca:          form.marca.trim(),
        modelo:         (form.modelo || "").trim(),
        medida:         form.medida.trim(),
        dot:            (form.dot || "").trim(),
        vida:           form.vida || "novo",
        sulcoOriginal:  Number(form.sulcoOriginal) || 0,
        sulcoAtual:     Number(form.sulcoOriginal) || 0, // ao cadastrar, atual = original
        fornecedor:     nome,
        fornecedorCnpj: cnpj,
        custoAquisicao: Number(form.custoAquisicao) || 0,
        dataCompra:     form.dataCompra || "",
        obs:            (form.obs || "").trim(),
      };

      if (modal.modo === "novo") {
        payload.status    = "estoque";
        payload.criadoEm  = new Date().toISOString();
        payload.criadoPor = quemSou();
        const ref = await addDoc(collection(db, "pneus"), payload);
        setPneus(prev => [{ id: ref.id, ...payload }, ...prev]);
      } else {
        payload.editadoEm  = new Date().toISOString();
        payload.editadoPor = quemSou();
        // Preserva status e vínculo se estava em uso
        delete payload.sulcoAtual; // não sobrescreve sulco atual na edição
        await updateDoc(doc(db, "pneus", modal.pneu.id), payload);
        setPneus(prev => prev.map(p => p.id === modal.pneu.id ? { ...p, ...payload } : p));
      }
      fechar();
    } catch (e) {
      setErro("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!modal?.pneu) return;
    if (modal.pneu.status !== "estoque") {
      alert("Só é possível excluir pneus em estoque. Este está em uso ou em recapagem — remova antes.");
      return;
    }
    if (!confirm(`Excluir permanentemente o pneu ${modal.pneu.fogo}? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteDoc(doc(db, "pneus", modal.pneu.id));
      setPneus(prev => prev.filter(p => p.id !== modal.pneu.id));
      fechar();
    } catch (e) {
      setErro("Erro ao excluir: " + e.message);
    }
  }

  return (
    <div>
      <div style={st.toolbar}>
        <div style={st.searchWrap}>
          <Search size={16} style={st.searchIcon} />
          <input style={st.searchInput} placeholder="Buscar por fogo, marca, modelo, medida, fornecedor…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select style={st.filterSelect} value={filtroMarca} onChange={e => setFiltroMarca(e.target.value)}>
          <option value="todas">Todas marcas</option>
          {marcasDistintas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select style={st.filterSelect} value={filtroMedida} onChange={e => setFiltroMedida(e.target.value)}>
          <option value="todas">Todas medidas</option>
          {medidasDistintas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select style={st.filterSelect} value={filtroVida} onChange={e => setFiltroVida(e.target.value)}>
          <option value="todas">Todas vidas</option>
          {VIDAS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
        <button style={st.primaryBtn} onClick={abrirNovo}>
          <Plus size={16} /> Novo pneu
        </button>
      </div>

      {lista.length === 0 ? (
        <div style={st.emptyBox}>
          <Package size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#475569" }}>
            {emEstoque.length === 0 ? "Nenhum pneu em estoque" : "Nenhum pneu com esses filtros"}
          </div>
          {emEstoque.length === 0 && (
            <p style={{ margin: "8px 0 0", fontSize: ".85rem" }}>
              Clique em <strong>+ Novo pneu</strong> pra cadastrar o primeiro.
            </p>
          )}
        </div>
      ) : (
        <div style={st.grid}>
          {lista.map(p => (
            <div key={p.id} style={st.card}>
              <div style={st.cardActions}>
                <button style={st.iconBtn} onClick={() => navigate(`/pneus/${p.id}`)} title="Ver ficha completa">
                  <ExternalLink size={15} />
                </button>
                <button style={st.iconBtn} onClick={() => abrirEdit(p)} title="Editar">
                  <Edit3 size={15} />
                </button>
              </div>
              <div style={st.cardFogo}>Fogo · {p.fogo}</div>
              <div style={st.cardMarca}>{p.marca}</div>
              {p.modelo && <div style={st.cardModelo}>{p.modelo}</div>}
              <div style={{ ...st.cardRow, marginTop: 10, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                <span>Medida</span>
                <strong style={{ color: "#0f172a" }}>{p.medida || "—"}</strong>
              </div>
              <div style={st.cardRow}>
                <span>DOT</span>
                <span>{p.dot || "—"}</span>
              </div>
              <div style={st.cardRow}>
                <span>Vida</span>
                <VidaTag vida={p.vida} />
              </div>
              <div style={st.cardRow}>
                <span>Sulco</span>
                <span>{p.sulcoOriginal ? `${p.sulcoOriginal} mm` : "—"}</span>
              </div>
              <div style={st.cardRow}>
                <span>Custo</span>
                <strong style={{ color: "#0f172a" }}>{p.custoAquisicao ? fmtBRL(p.custoAquisicao) : "—"}</strong>
              </div>
              {p.fornecedor && (
                <div style={{ ...st.cardRow, borderTop: "1px solid #f1f5f9", paddingTop: 6, marginTop: 8, fontSize: ".72rem" }}>
                  <span style={{ color: "#94a3b8" }}>{p.fornecedor}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div style={st.overlay} onClick={fechar}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={st.modalHeader}>
              <div style={st.modalTitulo}>{modal.modo === "novo" ? "Cadastrar pneu" : `Editar pneu ${modal.pneu.fogo}`}</div>
              <button style={st.iconBtn} onClick={fechar}><X size={18} /></button>
            </div>
            <div style={st.modalBody}>
              {erro && <div style={st.errMsg}>{erro}</div>}

              <div style={st.field}>
                <label style={st.fieldLabel}>Número de fogo *</label>
                <input style={st.fieldInput} value={form.fogo} onChange={e => setForm({ ...form, fogo: e.target.value.toUpperCase() })} placeholder="Ex: PN-00001 ou o número gravado no flanco" autoFocus />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={st.field}>
                  <label style={st.fieldLabel}>Marca *</label>
                  <input style={st.fieldInput} value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} placeholder="Michelin, Pirelli, Bridgestone…" list="pneus-marcas-list" />
                  <datalist id="pneus-marcas-list">
                    {marcasDistintas.map(m => <option key={m} value={m} />)}
                    <option value="Michelin" /><option value="Pirelli" /><option value="Bridgestone" /><option value="Goodyear" /><option value="Continental" /><option value="Firestone" />
                  </datalist>
                </div>
                <div style={st.field}>
                  <label style={st.fieldLabel}>Modelo</label>
                  <input style={st.fieldInput} value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} placeholder="XZE2+, XDA5, etc" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={st.field}>
                  <label style={st.fieldLabel}>Medida *</label>
                  <input style={st.fieldInput} value={form.medida} onChange={e => setForm({ ...form, medida: e.target.value })} placeholder="295/80R22.5" list="pneus-medidas-list" />
                  <datalist id="pneus-medidas-list">
                    {medidasDistintas.map(m => <option key={m} value={m} />)}
                    <option value="295/80R22.5" /><option value="275/80R22.5" /><option value="215/75R17.5" /><option value="385/65R22.5" />
                  </datalist>
                </div>
                <div style={st.field}>
                  <label style={st.fieldLabel}>DOT (semana/ano)</label>
                  <input style={st.fieldInput} value={form.dot} onChange={e => setForm({ ...form, dot: e.target.value.replace(/\D/g, "").slice(0,4) })} placeholder="Ex: 2325 (semana 23 de 2025)" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={st.field}>
                  <label style={st.fieldLabel}>Vida atual</label>
                  <select style={st.fieldInput} value={form.vida} onChange={e => setForm({ ...form, vida: e.target.value })}>
                    {VIDAS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>
                <div style={st.field}>
                  <label style={st.fieldLabel}>Sulco original (mm)</label>
                  <input style={st.fieldInput} type="number" step="0.1" min="0" value={form.sulcoOriginal} onChange={e => setForm({ ...form, sulcoOriginal: e.target.value })} placeholder="15" />
                </div>
              </div>

              <div style={{ height: 1, background: "#e2e8f0", margin: "8px 0" }} />

              <div style={st.field}>
                <label style={st.fieldLabel}>Fornecedor</label>
                <input style={st.fieldInput} value={form.fornecedor} onChange={e => onChangeFornecedor(e.target.value)} placeholder="Buscar ou digitar" list="pneus-fornecedores-list" />
                <datalist id="pneus-fornecedores-list">
                  {fornecedores.map(f => <option key={f.id} value={f.nome} />)}
                </datalist>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={st.field}>
                  <label style={st.fieldLabel}>CNPJ do fornecedor</label>
                  <input style={st.fieldInput} value={form.fornecedorCnpj} onChange={e => setForm({ ...form, fornecedorCnpj: e.target.value })} placeholder="12.345.678/0001-90" />
                </div>
                <div style={st.field}>
                  <label style={st.fieldLabel}>Data da compra</label>
                  <input style={st.fieldInput} type="date" value={form.dataCompra} onChange={e => setForm({ ...form, dataCompra: e.target.value })} />
                </div>
              </div>

              <div style={st.field}>
                <label style={st.fieldLabel}>Custo de aquisição (R$)</label>
                <input style={st.fieldInput} type="number" step="0.01" min="0" value={form.custoAquisicao} onChange={e => setForm({ ...form, custoAquisicao: e.target.value })} placeholder="Ex: 2350.00" />
              </div>

              <div style={st.field}>
                <label style={st.fieldLabel}>Observações</label>
                <textarea style={{ ...st.fieldInput, minHeight: 60, resize: "vertical" }} value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} placeholder="Nota fiscal, garantia, etc" />
              </div>
            </div>

            <div style={st.modalFooter}>
              <div>
                {modal.modo === "edit" && modal.pneu.status === "estoque" && (
                  <button style={st.deleteBtn} onClick={excluir}>
                    <Trash2 size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Excluir
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={st.cancelBtn} onClick={fechar}>Cancelar</button>
                <button style={{ ...st.saveBtn, opacity: salvando ? 0.6 : 1 }} onClick={salvar} disabled={salvando}>
                  {salvando ? "Salvando…" : (modal.modo === "novo" ? "Cadastrar" : "Salvar")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VidaTag({ vida }) {
  const v = VIDAS.find(x => x.id === vida) || VIDAS[0];
  const cor = vida === "novo" ? "#059669" : vida === "recapado_1" ? "#0891b2" : vida === "recapado_2" ? "#b45309" : "#dc2626";
  const bg  = vida === "novo" ? "#d1fae5" : vida === "recapado_1" ? "#cffafe" : vida === "recapado_2" ? "#fef3c7" : "#fee2e2";
  return <span style={{ background: bg, color: cor, padding: "2px 8px", borderRadius: 20, fontSize: ".7rem", fontWeight: 700 }}>{v.label}</span>;
}
