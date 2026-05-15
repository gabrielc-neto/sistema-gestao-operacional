import { useEffect, useState, useRef } from "react";
import { collection, getDocs, query, orderBy, setDoc, deleteDoc, doc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LogoPontual from "../components/LogoPontual";

const MOTIVOS_BLOQUEIO = ["CIV", "CIPP", "Manutenção", "Documentos vencidos", "Revisão", "Outro"];

const TIPOS = ["—", "LS", "Bitrem", "Rodotrem", "4° Eixo"];
const STATUS_OPTS = ["ativo", "disponivel", "em_viagem", "manutencao", "inativo"];
const STATUS_LABEL = { ativo:"Ativo", disponivel:"Disponível", em_viagem:"Em Viagem", manutencao:"Manutenção", inativo:"Inativo" };
const STATUS_COR   = { ativo:"#dcfce7", disponivel:"#dcfce7", em_viagem:"#dbeafe", manutencao:"#fffbeb", inativo:"#f1f5f9" };
const STATUS_TEXT  = { ativo:"#15803d", disponivel:"#15803d", em_viagem:"#1d4ed8", manutencao:"#b45309", inativo:"#94a3b8" };

const VAZIO = {
  placa:"", status:"disponivel", modelo:"", fabricante:"", ano_modelo:"", motorista:"",
  // Carreta 1
  c1:"", t1:"—", c1_chassi:"", c1_renavam:"", c1_tara:"", c1_ano_fab:"", c1_ano_mod:"",
  // Carreta 2 (opcional)
  c2:"", t2:"—", c2_chassi:"", c2_renavam:"", c2_tara:"", c2_ano_fab:"", c2_ano_mod:"",
  // Cavalo
  cap:"", comp:"", obs:"", chassi:"", renavam:"", tara:"", ano_fab:"", tipo_conjunto:"",
};

function corFab(fab) {
  const f = (fab||"").toUpperCase();
  if (f.includes("MERCEDES") || f.includes("M.BENZ") || f.includes("ACTROS")) return "#0066b2";
  if (f.includes("VOLVO"))    return "#003057";
  if (f.includes("SCANIA"))   return "#0e3a70";
  if (f.includes("DAF"))      return "#ff6600";
  return "#64748b";
}

function MotoristaSearch({ value, lista, feriasAtivas, onChange }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);

  const filtrados = lista.filter(n =>
    n.toLowerCase().includes(busca.toLowerCase())
  );

  function selecionar(nome) {
    if (feriasAtivas.has(nome)) return;
    onChange(nome);
    setBusca("");
    setAberto(false);
  }

  const emFerias = value && feriasAtivas.has(value);

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <label style={{ fontSize: ".7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 3, display: "block" }}>
        Motorista
      </label>
      <div
        style={{ padding: "8px 10px", borderRadius: 7, border: `1px solid ${emFerias ? "#fca5a5" : "#e2e8f0"}`, fontSize: ".88rem", background: "var(--card-bg)", cursor: "pointer", color: value ? "#1e293b" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        onClick={() => setAberto(a => !a)}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {value || "— Selecionar motorista —"}
          {emFerias && <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: ".68rem", fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>Em Férias</span>}
        </span>
      </div>
      {emFerias && (
        <div style={{ marginTop: 4, fontSize: ".75rem", color: "#dc2626", fontWeight: 600 }}>
          ⚠️ Este motorista está de férias. Selecione outro ou remova o atrelamento.
        </div>
      )}
      {aberto && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 7, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 200, overflow: "hidden" }}>
          <input
            autoFocus
            style={{ width: "100%", padding: "9px 12px", border: "none", borderBottom: "1px solid var(--border)", fontSize: ".88rem", outline: "none", boxSizing: "border-box" }}
            placeholder="Buscar motorista..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {value && (
              <div
                style={{ padding: "8px 12px", fontSize: ".85rem", color: "#94a3b8", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
                onClick={() => { onChange(""); setBusca(""); setAberto(false); }}
              >
                — Remover motorista —
              </div>
            )}
            {filtrados.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: ".85rem", color: "#94a3b8" }}>Nenhum encontrado</div>
            ) : filtrados.map(nome => {
              const ef = feriasAtivas.has(nome);
              return (
                <div
                  key={nome}
                  title={ef ? "Motorista em férias — seleção bloqueada" : ""}
                  style={{
                    padding: "8px 12px", fontSize: ".85rem",
                    cursor: ef ? "not-allowed" : "pointer",
                    background: nome === value ? "#eff6ff" : ef ? "#fff5f5" : "#fff",
                    color: ef ? "#f87171" : nome === value ? "#1d4ed8" : "#1e293b",
                    fontWeight: nome === value ? 700 : 400,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    opacity: ef ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!ef) e.currentTarget.style.background = nome === value ? "#eff6ff" : "#f8fafc"; }}
                  onMouseLeave={e => { if (!ef) e.currentTarget.style.background = nome === value ? "#eff6ff" : "#fff"; }}
                  onClick={() => selecionar(nome)}
                >
                  <span>{nome}</span>
                  {ef && <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: ".65rem", fontWeight: 700, padding: "1px 6px", borderRadius: 10, whiteSpace: "nowrap" }}>Em Férias</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Frota() {
  const [veiculos, setVeiculos]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtro, setFiltro]       = useState("");
  const [statusFiltro, setStatusFiltro] = useState("ativo");
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(VAZIO);
  const [editId, setEditId]       = useState(null);
  const [salvando, setSalvando]   = useState(false);
  const [listaMotoristas, setListaMotoristas] = useState([]);
  const [feriasAtivas, setFeriasAtivas] = useState(new Set());
  const { profile } = useAuth();
  const navigate = useNavigate();
  const role      = profile?.role || "";
  const isAdmin   = ["master","admin"].includes(role);
  const canBlock   = ["master","admin","manutencao","logistica"].includes(role);
  const canUnblock = ["master","admin","manutencao"].includes(role);

  const [bloqueioModal, setBloqueioModal] = useState(null); // { veiculo, modo: "bloquear"|"desbloquear" }
  const [bmMotivo,   setBmMotivo]   = useState(MOTIVOS_BLOQUEIO[0]);
  const [bmDesc,     setBmDesc]     = useState("");
  const [bmVigencia, setBmVigencia] = useState("");
  const [bmSalvando, setBmSalvando] = useState(false);

  function carregar() {
    getDocs(query(collection(db, "veiculos"), orderBy("placa")))
      .then(snap => {
        const seen = new Set();
        setVeiculos(snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(v => v.tipo !== "carreta")
          .filter(v => {
            const norm = (v.placa || v.id).toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (seen.has(norm)) return false;
            seen.add(norm);
            return true;
          })
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    carregar();
    getDocs(query(collection(db, "motoristas"), orderBy("nome")))
      .then(snap => setListaMotoristas(snap.docs.map(d => d.data().nome).filter(Boolean)));
    const hoje = new Date();
    getDocs(collection(db, "ferias")).then(snap => {
      const ativos = new Set();
      snap.docs.forEach(d => {
        const { motorista, inicio, fim } = d.data();
        if (!motorista || !inicio || !fim) return;
        const ini = new Date(inicio + "T00:00:00");
        const end = new Date(fim    + "T00:00:00");
        if (hoje >= ini && hoje <= end) ativos.add(motorista);
      });
      setFeriasAtivas(ativos);
    });
  }, []);

  function abrirNovo() { setForm(VAZIO); setEditId(null); setModal(true); }
  async function abrirEditar(v) {
    const base = { ...VAZIO, ...v };
    for (const n of ["1","2"]) {
      const placa = v[`c${n}`];
      if (!placa) continue;
      if (base[`c${n}_chassi`]) continue;
      // normaliza placa antes de buscar (ex: "AKC-4906" → "AKC4906")
      const placaNorm = placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      const snap = await getDocs(query(collection(db,"veiculos"), where("placa","==", placaNorm)));
      if (!snap.empty) {
        const d = snap.docs[0].data();
        base[`c${n}_chassi`]  = d.chassi  || "";
        base[`c${n}_renavam`] = d.renavam || "";
        base[`c${n}_tara`]    = d.tara    || "";
        base[`c${n}_ano_fab`] = d.ano_fab || "";
        base[`c${n}_ano_mod`] = d.ano_mod || d.ano_modelo || "";
      }
    }
    setForm(base);
    setEditId(v.id);
    setModal(true);
  }
  function fecharModal() { setModal(false); setForm(VAZIO); setEditId(null); }

  function campo(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function buscarCarreta(n, placa) {
    const p = placa.trim().toUpperCase();
    if (!p || p.length < 5) return;
    const snap = await getDocs(query(collection(db,"veiculos"), where("placa","==", p)));
    if (!snap.empty) {
      const d = snap.docs[0].data();
      setForm(f => ({
        ...f,
        [`c${n}_chassi`]:  d.chassi  || f[`c${n}_chassi`]  || "",
        [`c${n}_renavam`]: d.renavam || f[`c${n}_renavam`] || "",
        [`c${n}_tara`]:    d.tara    || f[`c${n}_tara`]    || "",
        [`c${n}_ano_fab`]: d.ano_fab || f[`c${n}_ano_fab`] || "",
        [`c${n}_ano_mod`]: d.ano_mod || d.ano_modelo || f[`c${n}_ano_mod`] || "",
      }));
    }
  }

  async function salvar() {
    const placa = form.placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!placa) return alert("Informe a placa!");
    setSalvando(true);
    try {
      await setDoc(doc(db, "veiculos", placa), { ...form, placa, empresa: "PONTUAL" }, { merge: true });
      for (const n of ["1","2"]) {
        const cPlaca = form[`c${n}`]?.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
        if (!cPlaca) continue;
        await setDoc(doc(db,"veiculos", cPlaca), {
          placa: cPlaca, empresa:"PONTUAL",
          chassi:   form[`c${n}_chassi`]  || null,
          renavam:  form[`c${n}_renavam`] || null,
          tara:     form[`c${n}_tara`]    || null,
          ano_fab:  form[`c${n}_ano_fab`] || null,
          ano_mod:  form[`c${n}_ano_mod`] || null,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
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
    if (!window.confirm("Excluir este veículo?")) return;
    try {
      await deleteDoc(doc(db, "veiculos", id));
      carregar();
    } catch(e) {
      alert("Erro ao excluir: " + e.message);
    }
  }

  function abrirBloqueio(v, e) {
    e.stopPropagation();
    const modo = v.bloqueio?.ativo ? "desbloquear" : "bloquear";
    setBmMotivo(MOTIVOS_BLOQUEIO[0]);
    setBmDesc("");
    setBmVigencia("");
    setBloqueioModal({ veiculo: v, modo });
  }

  async function confirmarBloqueio() {
    if (!bloqueioModal) return;
    setBmSalvando(true);
    const { veiculo, modo } = bloqueioModal;
    const agora = new Date().toISOString();
    try {
      if (modo === "bloquear") {
        await updateDoc(doc(db, "veiculos", veiculo.id), {
          bloqueio: {
            ativo: true,
            motivo: bmMotivo,
            descricao: bmDesc,
            bloqueadoPor: profile?.nome || profile?.email || role,
            bloqueadoEm: agora,
          }
        });
      } else {
        if (!bmVigencia) { alert("Informe a nova vigência dos documentos."); setBmSalvando(false); return; }
        await updateDoc(doc(db, "veiculos", veiculo.id), {
          bloqueio: {
            ativo: false,
            novaVigencia: bmVigencia,
            desbloqueadoPor: profile?.nome || profile?.email || role,
            desbloqueadoEm: agora,
          }
        });
      }
      setBloqueioModal(null);
      carregar();
    } catch(e) {
      alert("Erro: " + e.message);
    } finally {
      setBmSalvando(false);
    }
  }

  const lista = veiculos.filter(v => {
    const txt = filtro.toLowerCase();
    const ok = !txt || v.placa?.toLowerCase().includes(txt) || v.modelo?.toLowerCase().includes(txt) || v.fabricante?.toLowerCase().includes(txt) || v.motorista?.toLowerCase().includes(txt) || v.c1?.toLowerCase().includes(txt) || v.c2?.toLowerCase().includes(txt) || v.c3?.toLowerCase().includes(txt);
    const st = statusFiltro === "todos" || v.status === statusFiltro || (statusFiltro === "ativo" && (v.status === "ativo" || v.status === "disponivel"));
    return ok && st;
  });

  const counts = { todos: veiculos.length, ativo: veiculos.filter(v => ["ativo","disponivel"].includes(v.status)).length, inativo: veiculos.filter(v => v.status === "inativo").length };

  return (
    <div style={s.wrap}>
      <header style={s.header} className="pg-header">
        <div className="pg-logo"><LogoPontual height={36} /></div>
        <span style={s.titulo}>Frota</span>
        <span style={s.sub} className="hide-mobile">{lista.length} veículos</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }} className="pg-header-actions">
          {isAdmin && <button style={s.btnNovo} onClick={abrirNovo}>+ Novo</button>}
          <button style={s.back} onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>
      </header>

      <div style={s.toolbar} className="pg-toolbar">
        <input style={s.busca} placeholder="Buscar cavalo, carreta, motorista..." value={filtro} onChange={e => setFiltro(e.target.value)} />
        <div style={s.tabs}>
          {[["ativo","Ativos"], ["inativo","Inativos"]].map(([v,l]) => (
            <button key={v} style={{ ...s.tab, ...(statusFiltro===v ? s.tabAtivo : {}) }} onClick={() => setStatusFiltro(v)}>
              {l} ({counts[v] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={s.loading}>Carregando...</p> : (
        <div style={s.grid} className="pg-grid">
          {lista.map(v => {
            const bloqueado = v.bloqueio?.ativo;
            return (
              <div
                key={v.id}
                style={{ ...s.card, opacity: v.status === "inativo" ? 0.55 : 1, border: bloqueado ? "2px solid #dc2626" : s.card.border, position:"relative" }}
                onClick={() => abrirEditar(v)}
              >
                {bloqueado && (
                  <div style={s.lockBanner}>
                    🔒 {v.bloqueio.motivo}
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ ...s.fabBadge, background: corFab(v.fabricante) }}>{(v.fabricante||"—").split("/")[0].split(" ")[0]}</div>
                  {(canBlock || canUnblock) && (
                    <button
                      style={{ ...s.lockBtn, background: bloqueado ? "#fee2e2" : "#f1f5f9", color: bloqueado ? "#dc2626" : "#64748b" }}
                      onClick={(e) => abrirBloqueio(v, e)}
                      title={bloqueado ? "Desbloquear veículo" : "Bloquear veículo"}
                    >
                      {bloqueado ? "🔒" : "🔓"}
                    </button>
                  )}
                </div>
                <div style={s.placa}>{v.placa}</div>
                <div style={s.modelo}>{v.modelo || "—"}</div>
                {v.tara && <div style={s.cardInfo}>⚖️ Tara: {v.tara} kg</div>}
                {v.chassi && <div style={s.cardInfo}>🔑 Chassi: <span style={s.cardInfoVal}>{v.chassi.slice(-8)}</span></div>}
                {v.renavam && <div style={s.cardInfo}>📄 RENAVAM: <span style={s.cardInfoVal}>{v.renavam}</span></div>}
                {v.ano_fab && <div style={s.cardInfo}>📅 {v.ano_fab}{v.ano_mod && v.ano_mod !== v.ano_fab ? `/${v.ano_mod}` : ""}</div>}
                {v.motorista && <div style={s.motoristaNome}>👤 {v.motorista}</div>}
                {v.c1 && <div style={s.carreta}>🔗 {[v.c1, v.c2, v.c3].filter(Boolean).join(" · ")}</div>}
                {v.cap && <div style={s.cap}>⛽ {v.cap}L{v.comp ? ` · ${v.comp}` : ""}</div>}
                {v.tipo_conjunto && <div style={s.cardInfo}>🚛 {v.tipo_conjunto}</div>}
                {v.compartimentos && <div style={{ ...s.cardInfo, fontSize:".7rem" }}>🗂 {v.compartimentos}</div>}
                <div style={{ ...s.statusPill, background: STATUS_COR[v.status]||"#f1f5f9", color: STATUS_TEXT[v.status]||"#94a3b8" }}>
                  {STATUS_LABEL[v.status] || v.status}
                </div>
              </div>
            );
          })}
          {lista.length === 0 && <p style={s.vazio}>Nenhum veículo encontrado.</p>}
        </div>
      )}

      {bloqueioModal && (
        <div style={s.overlay} onClick={() => setBloqueioModal(null)}>
          <div style={{ ...s.modal, maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span>{bloqueioModal.modo === "bloquear" ? "🔒 Bloquear Veículo" : "🔓 Desbloquear Veículo"}</span>
              <button style={s.closeBtn} onClick={() => setBloqueioModal(null)}>×</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ padding:"10px 14px", borderRadius:8, background: bloqueioModal.modo === "bloquear" ? "#fef2f2" : "#f0fdf4", border:`1px solid ${bloqueioModal.modo === "bloquear" ? "#fca5a5" : "#86efac"}`, fontSize:".85rem", fontWeight:600, color: bloqueioModal.modo === "bloquear" ? "#dc2626" : "#15803d" }}>
                Veículo: <strong>{bloqueioModal.veiculo.placa}</strong> — {bloqueioModal.veiculo.modelo || ""}
              </div>

              {bloqueioModal.modo === "bloquear" ? (
                <>
                  <div style={s.fg}>
                    <label style={s.lbl}>Motivo do bloqueio *</label>
                    <select style={s.inp} value={bmMotivo} onChange={e => setBmMotivo(e.target.value)}>
                      {MOTIVOS_BLOQUEIO.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div style={s.fg}>
                    <label style={s.lbl}>Descrição (opcional)</label>
                    <textarea style={{ ...s.inp, height:70, resize:"vertical" }} value={bmDesc} onChange={e => setBmDesc(e.target.value)} placeholder="Detalhe o problema..." />
                  </div>
                  <div style={{ padding:"10px 14px", borderRadius:8, background:"#fffbeb", border:"1px solid #fcd34d", fontSize:".8rem", color:"#92400e" }}>
                    ⚠️ Após o bloqueio, nenhuma OC poderá ser gerada para este veículo até que seja liberado por um Administrador ou pela Manutenção.
                  </div>
                </>
              ) : (
                <>
                  <div style={s.fg}>
                    <label style={s.lbl}>Motivo do bloqueio anterior</label>
                    <div style={{ padding:"8px 10px", borderRadius:7, background:"#fef2f2", border:"1px solid #fca5a5", fontSize:".85rem", color:"#dc2626", fontWeight:600 }}>
                      {bloqueioModal.veiculo.bloqueio?.motivo} — bloqueado por {bloqueioModal.veiculo.bloqueio?.bloqueadoPor}
                    </div>
                  </div>
                  <div style={s.fg}>
                    <label style={s.lbl}>Nova vigência dos documentos *</label>
                    <input type="date" style={s.inp} value={bmVigencia} onChange={e => setBmVigencia(e.target.value)} />
                  </div>
                  <div style={s.fg}>
                    <label style={s.lbl}>Observação (opcional)</label>
                    <textarea style={{ ...s.inp, height:60, resize:"vertical" }} value={bmDesc} onChange={e => setBmDesc(e.target.value)} placeholder="Ex: CIV renovada, documentos regularizados..." />
                  </div>
                </>
              )}
            </div>
            <div style={s.modalFooter}>
              <button style={s.btnCancelar} onClick={() => setBloqueioModal(null)}>Cancelar</button>
              <button
                style={{ ...s.btnSalvar, background: bloqueioModal.modo === "bloquear" ? "#dc2626" : "#15803d", opacity: bmSalvando ? 0.6 : 1 }}
                onClick={confirmarBloqueio}
                disabled={bmSalvando}
              >
                {bmSalvando ? "Aguarde..." : bloqueioModal.modo === "bloquear" ? "🔒 Confirmar Bloqueio" : "🔓 Liberar Veículo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div style={s.overlay} onClick={fecharModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span>{editId ? `Editar — ${form.placa}` : "Novo Veículo"}</span>
              <button style={s.closeBtn} onClick={fecharModal}>×</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.row}>
                <div style={s.fg}>
                  <label style={s.lbl}>Placa Cavalo *</label>
                  <input style={s.inp} value={form.placa} onChange={e => campo("placa", e.target.value.toUpperCase())} disabled={!!editId} placeholder="AKD5988" />
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Status</label>
                  <select style={s.inp} value={form.status} onChange={e => campo("status", e.target.value)}>
                    {STATUS_OPTS.map(o => <option key={o} value={o}>{STATUS_LABEL[o]}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.row}>
                <div style={{ ...s.fg, flex:2 }}>
                  <label style={s.lbl}>Modelo</label>
                  <input style={s.inp} value={form.modelo} onChange={e => campo("modelo", e.target.value)} placeholder="Mercedes AXOR 2536 S/LS" />
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Fabricante</label>
                  <input style={s.inp} value={form.fabricante} onChange={e => campo("fabricante", e.target.value)} placeholder="Mercedes-Benz" />
                </div>
              </div>
              <MotoristaSearch
                value={form.motorista}
                lista={listaMotoristas}
                feriasAtivas={feriasAtivas}
                onChange={v => campo("motorista", v)}
              />
              {/* ── Carreta 1 ── */}
              <div style={s.secTitle}>Carreta 1</div>
              <div style={s.row}>
                <div style={{ ...s.fg, flex:2 }}>
                  <label style={s.lbl}>Placa</label>
                  <input
                    style={s.inp}
                    value={form.c1}
                    onChange={e => campo("c1", e.target.value.toUpperCase())}
                    onBlur={e => buscarCarreta("1", e.target.value)}
                    placeholder="AKC4906"
                  />
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Tipo</label>
                  <select style={s.inp} value={form.t1} onChange={e => campo("t1", e.target.value)}>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.row}>
                <div style={{ ...s.fg, flex:3 }}>
                  <label style={s.lbl}>Chassi</label>
                  <input style={s.inp} value={form.c1_chassi||""} onChange={e => campo("c1_chassi", e.target.value.toUpperCase())} placeholder="9ADV113322M174102" />
                </div>
                <div style={{ ...s.fg, flex:2 }}>
                  <label style={s.lbl}>RENAVAM</label>
                  <input style={s.inp} value={form.c1_renavam||""} onChange={e => campo("c1_renavam", e.target.value)} placeholder="00777402068" />
                </div>
              </div>
              <div style={s.row}>
                <div style={s.fg}>
                  <label style={s.lbl}>Tara (kg)</label>
                  <input style={s.inp} value={form.c1_tara||""} onChange={e => campo("c1_tara", e.target.value)} placeholder="8700" />
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Ano Fab.</label>
                  <input style={s.inp} value={form.c1_ano_fab||""} onChange={e => campo("c1_ano_fab", e.target.value)} placeholder="2011" />
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Ano Mod.</label>
                  <input style={s.inp} value={form.c1_ano_mod||""} onChange={e => campo("c1_ano_mod", e.target.value)} placeholder="2011" />
                </div>
              </div>

              {/* ── Carreta 2 (opcional) ── */}
              <div style={s.secTitle}>Carreta 2 <span style={{ fontWeight:400, fontSize:".75rem", color:"var(--text-muted)" }}>(opcional)</span></div>
              <div style={s.row}>
                <div style={{ ...s.fg, flex:2 }}>
                  <label style={s.lbl}>Placa</label>
                  <input
                    style={s.inp}
                    value={form.c2}
                    onChange={e => campo("c2", e.target.value.toUpperCase())}
                    onBlur={e => buscarCarreta("2", e.target.value)}
                    placeholder="—"
                  />
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Tipo</label>
                  <select style={s.inp} value={form.t2} onChange={e => campo("t2", e.target.value)}>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {form.c2 && (
                <>
                  <div style={s.row}>
                    <div style={{ ...s.fg, flex:3 }}>
                      <label style={s.lbl}>Chassi</label>
                      <input style={s.inp} value={form.c2_chassi||""} onChange={e => campo("c2_chassi", e.target.value.toUpperCase())} placeholder="9ADV..." />
                    </div>
                    <div style={{ ...s.fg, flex:2 }}>
                      <label style={s.lbl}>RENAVAM</label>
                      <input style={s.inp} value={form.c2_renavam||""} onChange={e => campo("c2_renavam", e.target.value)} />
                    </div>
                  </div>
                  <div style={s.row}>
                    <div style={s.fg}>
                      <label style={s.lbl}>Tara (kg)</label>
                      <input style={s.inp} value={form.c2_tara||""} onChange={e => campo("c2_tara", e.target.value)} />
                    </div>
                    <div style={s.fg}>
                      <label style={s.lbl}>Ano Fab.</label>
                      <input style={s.inp} value={form.c2_ano_fab||""} onChange={e => campo("c2_ano_fab", e.target.value)} />
                    </div>
                    <div style={s.fg}>
                      <label style={s.lbl}>Ano Mod.</label>
                      <input style={s.inp} value={form.c2_ano_mod||""} onChange={e => campo("c2_ano_mod", e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {/* ── Outros ── */}
              <div style={s.row}>
                <div style={s.fg}>
                  <label style={s.lbl}>Capacidade (L)</label>
                  <input style={s.inp} value={form.cap} onChange={e => campo("cap", e.target.value)} placeholder="35000" />
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Bocas / Compartimentos</label>
                  <input style={s.inp} value={form.comp} onChange={e => campo("comp", e.target.value)} placeholder="7 bocas · 5/5/5/5/5/5/5" />
                </div>
              </div>
              <div style={s.fg}>
                <label style={s.lbl}>Observação</label>
                <textarea style={{ ...s.inp, height:60, resize:"vertical" }} value={form.obs} onChange={e => campo("obs", e.target.value)} />
              </div>

              {/* ── Dados técnicos do cavalo ── */}
              <div style={s.secTitle}>Dados Técnicos — Cavalo</div>
              <div style={s.row}>
                <div style={{ ...s.fg, flex:3 }}>
                  <label style={s.lbl}>Chassi</label>
                  <input style={s.inp} value={form.chassi||""} onChange={e => campo("chassi", e.target.value.toUpperCase())} placeholder="9BM958443JB075488" />
                </div>
                <div style={{ ...s.fg, flex:2 }}>
                  <label style={s.lbl}>RENAVAM</label>
                  <input style={s.inp} value={form.renavam||""} onChange={e => campo("renavam", e.target.value)} placeholder="01131219756" />
                </div>
              </div>
              <div style={s.row}>
                <div style={s.fg}>
                  <label style={s.lbl}>Tara (kg)</label>
                  <input style={s.inp} value={form.tara||""} onChange={e => campo("tara", e.target.value)} placeholder="9165" />
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Ano Fab.</label>
                  <input style={s.inp} value={form.ano_fab||""} onChange={e => campo("ano_fab", e.target.value)} placeholder="2022" />
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Ano Mod.</label>
                  <input style={s.inp} value={form.ano_mod||""} onChange={e => campo("ano_mod", e.target.value)} placeholder="2023" />
                </div>
              </div>
              <div style={s.row}>
                <div style={s.fg}>
                  <label style={s.lbl}>Tipo Conjunto</label>
                  <select style={s.inp} value={form.tipo_conjunto||""} onChange={e => campo("tipo_conjunto", e.target.value)}>
                    {["","TRUCADO","TRAÇADO","BITREM","9° EIXOS","4° EIXO"].map(t => <option key={t} value={t}>{t||"—"}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={s.modalFooter}>
              {isAdmin && editId && (
                <button style={s.btnExcluir} onClick={() => { excluir(editId); fecharModal(); }}>🗑 Excluir</button>
              )}
              <button style={s.btnCancelar} onClick={fecharModal}>Cancelar</button>
              <button
                style={{ ...s.btnSalvar, opacity: (salvando || feriasAtivas.has(form.motorista)) ? 0.5 : 1 }}
                onClick={salvar}
                disabled={salvando || feriasAtivas.has(form.motorista)}
                title={feriasAtivas.has(form.motorista) ? "Motorista em férias — remova o atrelamento para salvar" : ""}
              >
                {salvando ? "Salvando..." : "💾 Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:        { minHeight:"100vh", background:"var(--bg)" },
  header:      { background:"#1a3a5c", borderBottom:"4px solid transparent", borderImage:"linear-gradient(90deg, #3d6b47, #6aaa5e, #b5d947, #f5c318, #f0a500) 1", padding:"10px 20px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,.15)" },
  titulo:      { color:"#fff", fontWeight:700, fontSize:"1.1rem" },
  sub:         { color:"rgba(255,255,255,.6)", fontSize:".8rem" },
  back:        { background:"#f5c318", border:"none", color:"#1a3a5c", borderRadius:6, padding:"5px 14px", cursor:"pointer", fontSize:".82rem", fontWeight:700 },
  btnNovo:     { background:"var(--card-bg)", border:"none", color:"#1a3a5c", borderRadius:6, padding:"5px 14px", cursor:"pointer", fontSize:".82rem", fontWeight:700 },
  toolbar:     { padding:"14px 20px", display:"flex", gap:12, flexWrap:"wrap", alignItems:"center", background:"var(--card-bg)", borderBottom:"1px solid var(--border)" },
  busca:       { flex:1, minWidth:200, padding:"8px 14px", borderRadius:7, border:"1px solid var(--border)", fontSize:".9rem", outline:"none" },
  tabs:        { display:"flex", gap:6 },
  tab:         { padding:"6px 14px", borderRadius:20, border:"1px solid var(--border)", background:"var(--bg)", fontSize:".78rem", cursor:"pointer", fontWeight:600, color:"var(--text-muted)" },
  tabAtivo:    { background:"#1a3a5c", color:"#fff", borderColor:"#1a3a5c" },
  grid:        { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, padding:20 },
  card:        { background:"var(--card-bg)", borderRadius:12, padding:16, border:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:5, cursor:"pointer", transition:"box-shadow .15s" },
  fabBadge:    { display:"inline-block", padding:"2px 8px", borderRadius:4, fontSize:".65rem", fontWeight:700, color:"#fff", alignSelf:"flex-start" },
  placa:       { fontWeight:800, fontSize:"1.1rem", color:"#1a3a5c", letterSpacing:1 },
  modelo:      { fontSize:".75rem", color:"#475569" },
  motoristaNome:{ fontSize:".72rem", color:"#0369a1" },
  cardInfo:    { fontSize:".72rem", color:"var(--text-muted)" },
  cardInfoVal: { fontWeight:600, color:"var(--text)", fontFamily:"monospace" },
  secTitle:    { fontSize:".75rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".06em", paddingTop:8, borderTop:"1px solid var(--border)", marginTop:4 },
  carreta:     { fontSize:".72rem", color:"var(--text-muted)" },
  cap:         { fontSize:".72rem", color:"var(--text-muted)" },
  statusPill:  { display:"inline-block", padding:"2px 8px", borderRadius:10, fontSize:".7rem", fontWeight:600, alignSelf:"flex-start", marginTop:4 },
  loading:     { padding:40, textAlign:"center", color:"var(--text-muted)" },
  vazio:       { padding:40, textAlign:"center", color:"#94a3b8", gridColumn:"1/-1" },
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal:       { background:"var(--card-bg)", borderRadius:14, width:"100%", maxWidth:620, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 8px 40px rgba(0,0,0,.2)" },
  modalHeader: { padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", fontWeight:700, color:"#1a3a5c", fontSize:"1rem" },
  closeBtn:    { background:"none", border:"none", fontSize:"1.4rem", cursor:"pointer", color:"#94a3b8", lineHeight:1 },
  modalBody:   { padding:"20px", overflowY:"auto", display:"flex", flexDirection:"column", gap:12 },
  modalFooter: { padding:"14px 20px", borderTop:"1px solid var(--border)", display:"flex", gap:8, justifyContent:"flex-end" },
  row:         { display:"flex", gap:10, flexWrap:"wrap" },
  fg:          { display:"flex", flexDirection:"column", flex:1, minWidth:120 },
  lbl:         { fontSize:".7rem", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", marginBottom:3 },
  inp:         { padding:"8px 10px", borderRadius:7, border:"1px solid var(--border)", fontSize:".88rem", outline:"none", width:"100%", boxSizing:"border-box" },
  btnSalvar:   { padding:"8px 20px", background:"#1a3a5c", color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer", fontSize:".88rem" },
  btnCancelar: { padding:"8px 16px", background:"#f1f5f9", color:"var(--text-muted)", border:"none", borderRadius:7, cursor:"pointer", fontSize:".88rem" },
  btnExcluir:  { padding:"8px 16px", background:"#fef2f2", color:"#dc2626", border:"none", borderRadius:7, cursor:"pointer", fontSize:".88rem", marginRight:"auto" },
  lockBanner:  { background:"#fef2f2", color:"#dc2626", fontSize:".72rem", fontWeight:700, padding:"3px 8px", borderRadius:6, marginBottom:4, textAlign:"center" },
  lockBtn:     { border:"none", borderRadius:6, padding:"3px 7px", cursor:"pointer", fontSize:".85rem", lineHeight:1 },
};
