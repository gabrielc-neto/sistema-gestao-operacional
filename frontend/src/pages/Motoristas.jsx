import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  collection, getDocs, setDoc, deleteDoc,
  doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import ModuleHeader from "../components/ModuleHeader";
import ExportBar from "../components/ExportBar";

// ── helpers ────────────────────────────────────────────────────────────────
const toId = (nome) =>
  nome.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

const STATUS_COLORS = {
  ativo:     { bg: "var(--success-bg)", color: "var(--success)", label: "Ativo" },
  inativo:   { bg: "var(--warning-bg)", color: "var(--warning)", label: "Inativo" },
  desligado: { bg: "var(--danger-bg)", color: "var(--danger)", label: "Desligado" },
};

const DOCS_MOTORISTA = [
  { campo: "cnh_venc",  label: "CNH" },
  { campo: "mopp_venc", label: "MOPP" },
  { campo: "nr20_venc", label: "NR-20" },
  { campo: "nr35_venc", label: "NR-35" },
];

function calcStatus(vencStr) {
  if (!vencStr) return "sem_data";
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const venc = new Date(vencStr + "T00:00:00");
  const diff = Math.ceil((venc - hoje) / 86400000);
  if (diff < 0)   return "vencido";
  if (diff <= 30) return "alerta";
  return "ok";
}

const STATUS_STYLE = {
  vencido:  { bg: "var(--danger)", color: "#fff" },
  alerta:   { bg: "var(--warning)", color: "#fff" },
  ok:       { bg: "var(--success)", color: "#fff" },
  sem_data: { bg: "var(--border)", color: "var(--text-subtle)" },
};

function fmtDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

const EMPTY_FORM = {
  nome: "", cnh: "", cat: "", tel: "", status: "ativo", obs: "",
  cnh_venc: "", mopp_venc: "", nr20_venc: "", nr35_venc: "",
  tipoContrato: "interno", // "interno" (CLT/frota Pontual) | "px" (PJ/agregado)
};

// ── componente ──────────────────────────────────────────────────────────────
export default function Motoristas() {
  const { profile } = useAuth();
  const canDelete   = ["master", "admin"].includes(profile?.role);

  const [motoristas, setMotoristas]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [busca, setBusca]             = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [modalOpen, setModalOpen]     = useState(false);
  const [editando, setEditando]       = useState(null); // id do doc em edição
  const [form, setForm]               = useState(EMPTY_FORM);
  const [salvando, setSalvando]       = useState(false);
  const [erro, setErro]               = useState("");

  // ── load ──────────────────────────────────────────────────────────────────
  async function carregar() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "motoristas"), orderBy("nome"))
      );
      setMotoristas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // carrega ao montar; loader reusado no refresh
  useEffect(() => { carregar(); }, []);

  // ── alertas vencimentos ───────────────────────────────────────────────────
  const alertasBanner = motoristas
    .filter(m => m.status === "ativo")
    .flatMap(m =>
      DOCS_MOTORISTA
        .map(({ campo, label }) => ({ st: calcStatus(m[campo]), venc: m[campo], nome: m.nome, label }))
        .filter(({ st }) => st === "vencido" || st === "alerta")
    )
    .sort((a, b) => (a.venc || "").localeCompare(b.venc || ""));

  // ── filtro ────────────────────────────────────────────────────────────────
  const lista = motoristas.filter((m) => {
    const matchBusca =
      m.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      m.cnh?.includes(busca) ||
      m.tel?.includes(busca);
    const matchStatus =
      filtroStatus === "todos" || m.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  // ── modal helpers ─────────────────────────────────────────────────────────
  function abrirNovo() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setErro("");
    setModalOpen(true);
  }

  function abrirEditar(m) {
    setEditando(m.id);
    setForm({
      nome:     m.nome     || "",
      cnh:      m.cnh      || "",
      cat:      m.cat      || "",
      tel:      m.tel      || "",
      status:   m.status   || "ativo",
      obs:      m.obs      || "",
      cnh_venc:  m.cnh_venc  || "",
      mopp_venc: m.mopp_venc || "",
      nr20_venc: m.nr20_venc || "",
      nr35_venc: m.nr35_venc || "",
      tipoContrato: m.tipoContrato || "interno",
    });
    setErro("");
    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
    setEditando(null);
    setForm(EMPTY_FORM);
    setErro("");
  }

  // ── salvar ────────────────────────────────────────────────────────────────
  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) { setErro("Nome é obrigatório."); return; }

    setSalvando(true);
    setErro("");
    try {
      const nomeUp = form.nome.trim().toUpperCase();
      const id     = editando || toId(form.nome.trim());
      const data   = {
        nome:      nomeUp,
        cnh:       form.cnh.trim(),
        cat:       form.cat.trim().toUpperCase(),
        tel:       form.tel.trim(),
        status:    form.status,
        obs:       form.obs.trim(),
        cnh_venc:  form.cnh_venc  || null,
        mopp_venc: form.mopp_venc || null,
        nr20_venc: form.nr20_venc || null,
        nr35_venc: form.nr35_venc || null,
        tipoContrato: form.tipoContrato || "interno",
        updatedAt: new Date().toISOString(),
      };
      if (!editando) data.createdAt = new Date().toISOString();

      await setDoc(doc(db, "motoristas", id), data, { merge: true });
      await carregar();
      fecharModal();
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  // ── excluir ───────────────────────────────────────────────────────────────
  async function excluir(id, nome) {
    if (!window.confirm(`Excluir motorista "${nome}"?`)) return;
    try {
      await deleteDoc(doc(db, "motoristas", id));
      setMotoristas((prev) => prev.filter((m) => m.id !== id));
    } catch {
      alert("Erro ao excluir.");
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>

      {/* HEADER */}
      <ModuleHeader title="Motoristas" />

      {/* TOOLBAR */}
      <div style={s.toolbar} className="pg-toolbar">
        <input
          style={s.input}
          placeholder="Buscar por nome, CNH ou telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div style={s.filtros}>
          {["todos", "ativo", "inativo", "desligado"].map((f) => (
            <button
              key={f}
              style={{
                ...s.filtroBtn,
                ...(filtroStatus === f ? s.filtroBtnAtivo : {}),
              }}
              onClick={() => setFiltroStatus(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button style={s.newBtn} onClick={abrirNovo}>
          + Novo Motorista
        </button>
      </div>

      {/* BANNER ALERTAS */}
      {alertasBanner.length > 0 && (
        <div style={{ background: "var(--danger-bg)", borderBottom: "1px solid #fca5a5", padding: "10px 24px" }}>
          <strong style={{ color: "var(--danger)", fontSize: 13 }}>Atenção — Documentos vencidos ou próximos do vencimento:</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {alertasBanner.map((a, i) => (
              <span key={i} style={{
                background: a.st === "vencido" ? "var(--danger-bg)" : "var(--warning-bg)",
                border: `1px solid ${a.st === "vencido" ? "var(--danger-border)" : "var(--warning-border)"}`,
                color: a.st === "vencido" ? "var(--danger)" : "var(--warning)",
                borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600,
              }}>
                {a.nome} — {a.label}: {fmtDate(a.venc)}
                <span style={{ marginLeft: 6, fontWeight: 700 }}>
                  [{a.st === "vencido" ? "VENCIDO" : "ALERTA"}]
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CONTEÚDO */}
      <main style={s.main} className="pg-body">
        <ExportBar
          titulo="Motoristas"
          arquivo="motoristas"
          subtitulo={() => `${lista.length} motorista(s)${filtroStatus !== "todos" ? ` · filtro: ${filtroStatus}` : ""}${busca ? ` · busca: "${busca}"` : ""}`}
          dados={() => ({
            colunas: ["Nome", "Contrato", "CNH", "Categoria", "Telefone", "Status", "CNH venc.", "MOPP venc.", "NR-20 venc.", "NR-35 venc.", "Observações"],
            linhas: lista.map((m) => [
              m.nome || "",
              m.tipoContrato === "px" ? "PX (agregado/PJ)" : "Interno (CLT)",
              m.cnh || "",
              m.cat || "",
              m.tel || "",
              STATUS_COLORS[m.status]?.label || m.status || "",
              fmtDate(m.cnh_venc),
              fmtDate(m.mopp_venc),
              fmtDate(m.nr20_venc),
              fmtDate(m.nr35_venc),
              m.obs || "",
            ]),
          })}
        />
        {loading ? (
          <p style={s.info}>Carregando...</p>
        ) : lista.length === 0 ? (
          <p style={s.info}>Nenhum motorista encontrado.</p>
        ) : (
          <div style={s.grid}>
            {lista.map((m) => {
              const sc = STATUS_COLORS[m.status] || STATUS_COLORS.inativo;
              return (
                <div key={m.id} style={s.card}>
                  <div style={s.cardHeader}>
                    <span style={s.cardNome}>{m.nome}</span>
                    <span style={{ ...s.badge, background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    {m.tipoContrato === "px" ? (
                      <span style={{ ...s.badge, background: "var(--accent-soft)", color: "var(--accent)" }}>PX · agregado (PJ)</span>
                    ) : (
                      <span style={{ ...s.badge, background: "var(--accent-soft)", color: "var(--accent)" }}>Interno · frota (CLT)</span>
                    )}
                  </div>
                  <div style={s.cardRow}>
                    <span style={s.cardLabel}>CNH</span>
                    <span style={s.cardVal}>{m.cnh || "—"}</span>
                  </div>
                  <div style={s.cardRow}>
                    <span style={s.cardLabel}>Categoria</span>
                    <span style={s.cardVal}>{m.cat || "—"}</span>
                  </div>
                  <div style={s.cardRow}>
                    <span style={s.cardLabel}>Telefone</span>
                    <span style={s.cardVal}>{m.tel || "—"}</span>
                  </div>
                  {/* Vencimentos */}
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed #e2e8f0" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-subtle)", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Documentos</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {DOCS_MOTORISTA.map(({ campo, label }) => {
                        const st = calcStatus(m[campo]);
                        const sty = STATUS_STYLE[st];
                        return (
                          <span key={campo} style={{
                            fontSize: 11, fontWeight: 700,
                            background: sty.bg, color: sty.color,
                            borderRadius: 4, padding: "2px 7px",
                          }} title={m[campo] ? fmtDate(m[campo]) : "Sem data"}>
                            {label}{m[campo] ? ` ${fmtDate(m[campo])}` : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {m.obs && (
                    <div style={s.cardObs}>{m.obs}</div>
                  )}
                  <div style={s.cardActions}>
                    <button style={s.editBtn} onClick={() => abrirEditar(m)}>
                      Editar
                    </button>
                    {canDelete && (
                      <button
                        style={s.delBtn}
                        onClick={() => excluir(m.id, m.nome)}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL */}
      {modalOpen && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={fecharModal}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>
                {editando ? "Editar Motorista" : "Novo Motorista"}
              </h2>
              <button style={s.closeBtn} onClick={fecharModal}><X size={18}/></button>
            </div>

            <form onSubmit={salvar} style={s.form}>
              {/* Nome */}
              <label style={s.label}>
                Nome
                <input
                  style={s.fieldInput}
                  value={form.nome}
                  onChange={(e) =>
                    setForm({ ...form, nome: e.target.value.toUpperCase() })
                  }
                  placeholder="NOME COMPLETO"
                  autoCapitalize="characters"
                  autoComplete="name"
                  required
                />
              </label>

              {/* CNH */}
              <label style={s.label}>
                Número CNH
                <input
                  style={s.fieldInput}
                  value={form.cnh}
                  onChange={(e) => setForm({ ...form, cnh: e.target.value.replace(/\D/g, "") })}
                  placeholder="00000000000"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  autoComplete="off"
                />
              </label>

              {/* Categoria + Status (linha) */}
              <div style={s.row2}>
                <label style={{ ...s.label, flex: 1 }}>
                  Categoria CNH
                  <input
                    style={s.fieldInput}
                    value={form.cat}
                    onChange={(e) => setForm({ ...form, cat: e.target.value.toUpperCase() })}
                    placeholder="Ex: E, AE, D..."
                    maxLength={5}
                    autoCapitalize="characters"
                    autoComplete="off"
                  />
                </label>
                <label style={{ ...s.label, flex: 1 }}>
                  Status
                  <select
                    style={s.fieldInput}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="desligado">Desligado</option>
                  </select>
                </label>
              </div>

              {/* Tipo de contrato: Interno (CLT) ou PX (PJ) */}
              <label style={s.label}>
                Tipo de motorista
                <select
                  style={s.fieldInput}
                  value={form.tipoContrato}
                  onChange={(e) => setForm({ ...form, tipoContrato: e.target.value })}
                >
                  <option value="interno">Interno (frota Pontual — CLT, jornada 9h30 + extras)</option>
                  <option value="px">PX (agregado — PJ, jornada até 13h, sem horas extras)</option>
                </select>
              </label>

              {/* Vencimentos */}
              <div style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2 }}>
                Vencimentos de Documentos
              </div>
              <div style={s.row2}>
                <label style={{ ...s.label, flex: 1 }}>
                  CNH — Validade
                  <input type="date" style={s.fieldInput} value={form.cnh_venc}
                    onChange={(e) => setForm({ ...form, cnh_venc: e.target.value })} />
                </label>
                <label style={{ ...s.label, flex: 1 }}>
                  MOPP — Validade
                  <input type="date" style={s.fieldInput} value={form.mopp_venc}
                    onChange={(e) => setForm({ ...form, mopp_venc: e.target.value })} />
                </label>
              </div>
              <div style={s.row2}>
                <label style={{ ...s.label, flex: 1 }}>
                  NR-20 — Validade
                  <input type="date" style={s.fieldInput} value={form.nr20_venc}
                    onChange={(e) => setForm({ ...form, nr20_venc: e.target.value })} />
                </label>
                <label style={{ ...s.label, flex: 1 }}>
                  NR-35 — Validade
                  <input type="date" style={s.fieldInput} value={form.nr35_venc}
                    onChange={(e) => setForm({ ...form, nr35_venc: e.target.value })} />
                </label>
              </div>

              {/* Telefone */}
              <label style={s.label}>
                Telefone
                <input
                  style={s.fieldInput}
                  value={form.tel}
                  onChange={(e) => setForm({ ...form, tel: e.target.value })}
                  placeholder="(00) 90000-0000"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </label>

              {/* Obs */}
              <label style={s.label}>
                Observações
                <textarea
                  style={{ ...s.fieldInput, resize: "vertical", minHeight: 72 }}
                  value={form.obs}
                  onChange={(e) => setForm({ ...form, obs: e.target.value })}
                  placeholder="Informações adicionais..."
                />
              </label>

              {erro && <p style={s.erroMsg}>{erro}</p>}

              <div style={s.formFooter}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={fecharModal}
                >
                  Cancelar
                </button>
                <button type="submit" style={s.saveBtn} disabled={salvando}>
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

// ── estilos ──────────────────────────────────────────────────────────────────
const s = {
  wrap:        { minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)" },

  // header
  header:      { background: "var(--header-bg)", borderBottom: "1px solid var(--header-border)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,.15)" },
  logo:        { height: 36, objectFit: "contain" },
  headerTitle: { color: "#fff", fontSize: "1.15rem", fontWeight: 700, margin: 0, flex: 1, textAlign: "center" },
  backBtn:     { padding: "6px 16px", background: "var(--header-btn-bg)", border: "none", borderRadius: 6, fontSize: ".82rem", cursor: "pointer", color: "var(--accent)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 },

  // toolbar
  toolbar:     { display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", background: "var(--card-bg)", borderBottom: "1px solid var(--border)", flexWrap: "wrap" },
  input:       { flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: ".9rem", outline: "none" },
  filtros:     { display: "flex", gap: 6 },
  filtroBtn:   { padding: "6px 14px", border: "1px solid var(--border-strong)", borderRadius: 20, background: "var(--bg)", cursor: "pointer", fontSize: ".8rem", color: "var(--text-muted)" },
  filtroBtnAtivo: { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" },
  newBtn:      { padding: "7px 18px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".85rem" },

  // main / grid
  main:        { padding: "24px", maxWidth: 1200, margin: "0 auto" },
  info:        { color: "var(--text-muted)", textAlign: "center", marginTop: 40 },
  grid:        { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },

  // card
  card:        { background: "var(--card-bg)", borderRadius: 10, padding: 18, border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,.06)" },
  cardHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardNome:    { fontWeight: 700, color: "var(--accent)", fontSize: "1rem", lineHeight: 1.3 },
  badge:       { padding: "2px 10px", borderRadius: 20, fontSize: ".72rem", fontWeight: 700, whiteSpace: "nowrap" },
  cardRow:     { display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: ".84rem" },
  cardLabel:   { color: "var(--text-subtle)", fontWeight: 500 },
  cardVal:     { color: "var(--text)", fontWeight: 500 },
  cardObs:     { marginTop: 8, fontSize: ".78rem", color: "var(--text-muted)", background: "var(--bg)", padding: "6px 8px", borderRadius: 6, lineHeight: 1.4 },
  cardActions: { display: "flex", gap: 8, marginTop: 14 },
  editBtn:     { flex: 1, padding: "6px 0", background: "var(--accent-soft)", color: "var(--accent)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".82rem" },
  delBtn:      { flex: 1, padding: "6px 0", background: "var(--danger-bg)", color: "var(--danger)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".82rem" },

  // modal / overlay
  overlay:     { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modal:       { background: "var(--card-bg)", borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.25)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px 0" },
  modalTitle:  { fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)", margin: 0 },
  closeBtn:    { background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "var(--text-muted)" },

  // form
  form:        { padding: 24, display: "flex", flexDirection: "column", gap: 14 },
  label:       { display: "flex", flexDirection: "column", gap: 5, fontSize: ".85rem", fontWeight: 600, color: "var(--text)" },
  required:    { color: "var(--danger)" },
  fieldInput:  { padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: ".9rem", outline: "none", fontFamily: "inherit" },
  row2:        { display: "flex", gap: 12 },
  erroMsg:     { color: "var(--danger)", fontSize: ".82rem", background: "var(--danger-bg)", padding: "6px 10px", borderRadius: 6 },
  formFooter:  { display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 },
  cancelBtn:   { padding: "8px 20px", background: "var(--surface-3)", border: "1px solid var(--border-strong)", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".85rem", color: "var(--text-muted)" },
  saveBtn:     { padding: "8px 24px", background: "var(--accent)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: ".85rem", color: "#fff" },
};
