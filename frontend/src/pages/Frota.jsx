import { useEffect, useState } from "react";
import { collection, getDocs, onSnapshot, query, orderBy, setDoc, deleteDoc, doc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ModuleHeader from "../components/ModuleHeader";
import ExportBar from "../components/ExportBar";
import { AlertTriangle, Trash2, Save } from "lucide-react";

const MOTIVOS_BLOQUEIO = ["CIV", "CIPP", "Manutenção", "Documentos vencidos", "Revisão", "Outro"];

const TIPOS = ["—", "LS", "Bitrem", "Rodotrem", "4° Eixo"];
const STATUS_OPTS = ["ativo", "disponivel", "em_viagem", "manutencao", "inativo"];
const STATUS_LABEL = { ativo:"Ativo", disponivel:"Disponível", em_viagem:"Em Viagem", manutencao:"Manutenção", inativo:"Inativo" };
const STATUS_COR    = { ativo:"var(--success-bg)", disponivel:"var(--success-bg)", em_viagem:"var(--accent-soft)", manutencao:"var(--warning-bg)", inativo:"var(--surface-3)" };
const STATUS_TEXT   = { ativo:"var(--success)", disponivel:"var(--success)", em_viagem:"var(--accent)", manutencao:"var(--warning)", inativo:"var(--text-subtle)" };
const STATUS_STRIPE = { ativo:"#22c55e", disponivel:"#22c55e", em_viagem:"#3b82f6", manutencao:"var(--warning)", inativo:"var(--border-strong)" };

const VAZIO = {
  placa:"", status:"disponivel", modelo:"", fabricante:"", ano_modelo:"", motorista:"",
  // Carreta 1
  c1:"", t1:"—", c1_chassi:"", c1_renavam:"", c1_tara:"", c1_ano_fab:"", c1_ano_mod:"",
  // Carreta 2 (opcional)
  c2:"", t2:"—", c2_chassi:"", c2_renavam:"", c2_tara:"", c2_ano_fab:"", c2_ano_mod:"",
  // Cavalo
  cap:"", comp:"", obs:"", chassi:"", renavam:"", tara:"", ano_fab:"", tipo_conjunto:"",
};

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
        style={{ padding: "8px 10px", borderRadius: 7, border: `1px solid ${emFerias ? "var(--danger-border)" : "var(--border)"}`, fontSize: ".88rem", background: "var(--card-bg)", cursor: "pointer", color: value ? "var(--text)" : "var(--text-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        onClick={() => setAberto(a => !a)}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {value || "— Selecionar motorista —"}
          {emFerias && <span style={{ background: "var(--danger-bg)", color: "var(--danger)", fontSize: ".68rem", fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>Em Férias</span>}
        </span>
      </div>
      {emFerias && (
        <div style={{ marginTop: 4, fontSize: ".75rem", color: "var(--danger)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={13} /> Este motorista está de férias. Selecione outro ou remova o atrelamento.
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
                style={{ padding: "8px 12px", fontSize: ".85rem", color: "var(--text-subtle)", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
                onClick={() => { onChange(""); setBusca(""); setAberto(false); }}
              >
                — Remover motorista —
              </div>
            )}
            {filtrados.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: ".85rem", color: "var(--text-subtle)" }}>Nenhum encontrado</div>
            ) : filtrados.map(nome => {
              const ef = feriasAtivas.has(nome);
              return (
                <div
                  key={nome}
                  title={ef ? "Motorista em férias — seleção bloqueada" : ""}
                  style={{
                    padding: "8px 12px", fontSize: ".85rem",
                    cursor: ef ? "not-allowed" : "pointer",
                    background: nome === value ? "var(--accent-soft)" : ef ? "var(--danger-bg)" : "var(--card-bg)",
                    color: ef ? "#f87171" : nome === value ? "var(--accent)" : "var(--text)",
                    fontWeight: nome === value ? 700 : 400,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    opacity: ef ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!ef) e.currentTarget.style.background = nome === value ? "var(--accent-soft)" : "var(--surface-2)"; }}
                  onMouseLeave={e => { if (!ef) e.currentTarget.style.background = nome === value ? "var(--accent-soft)" : "var(--card-bg)"; }}
                  onClick={() => selecionar(nome)}
                >
                  <span>{nome}</span>
                  {ef && <span style={{ background: "var(--danger-bg)", color: "var(--danger)", fontSize: ".65rem", fontWeight: 700, padding: "1px 6px", borderRadius: 10, whiteSpace: "nowrap" }}>Em Férias</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ícones SVG inline (estilo lucide) ──────────────────────────────────────
const Sv = ({ size = 16, color = "currentColor", style, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
    {children}
  </svg>
);
const Ico = {
  Truck:  (p) => <Sv {...p}><path d="M5 18H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11"/><path d="M15 18H9"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M14 9h4l4 4v5h-2"/></Sv>,
  Check:  (p) => <Sv {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Sv>,
  Route:  (p) => <Sv {...p}><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></Sv>,
  Wrench: (p) => <Sv {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/></Sv>,
  Scale:  (p) => <Sv {...p}><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></Sv>,
  Key:    (p) => <Sv {...p}><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></Sv>,
  File:   (p) => <Sv {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Sv>,
  Cal:    (p) => <Sv {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Sv>,
  User:   (p) => <Sv {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Sv>,
  Link:   (p) => <Sv {...p}><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></Sv>,
  Drop:   (p) => <Sv {...p}><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></Sv>,
  Search: (p) => <Sv {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Sv>,
  Plus:   (p) => <Sv {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Sv>,
  Lock:   (p) => <Sv {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Sv>,
  Unlock: (p) => <Sv {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></Sv>,
  Dash:   (p) => <Sv {...p}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></Sv>,
  Cog:    (p) => <Sv {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Sv>,
  Flip:   (p) => <Sv {...p}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></Sv>,
  Edit:   (p) => <Sv {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Sv>,
  Info:   (p) => <Sv {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Sv>,
};

// Linha de especificação no card de veículo (estilo guia pontual-frota)
function SpecRow({ icon: Icon, label, value, accent }) {
  if (value == null || value === "") return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ marginTop: 2, flexShrink: 0, color: "var(--text-subtle)", display: "inline-flex" }}>
        <Icon size={14} />
      </span>
      <p style={{ fontSize: 13, lineHeight: 1.45, color: "var(--text-muted)", margin: 0 }}>
        <span>{label} </span>
        <span style={{ fontWeight: 600, color: accent ? "var(--accent)" : "var(--text)" }}>{value}</span>
      </p>
    </div>
  );
}

export default function Frota() {
  const [veiculos, setVeiculos]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtro, setFiltro]       = useState("");
  const [statusFiltro, setStatusFiltro] = useState("ativo");
  const [statFiltro, setStatFiltro]     = useState("todos"); // filtro clicável dos cards de estatística
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(VAZIO);
  const [editId, setEditId]       = useState(null);
  const [salvando, setSalvando]   = useState(false);
  const [listaMotoristas, setListaMotoristas] = useState([]);
  const [feriasAtivas, setFeriasAtivas] = useState(new Set());
  const [flippedIds, setFlippedIds] = useState(() => new Set());
  const toggleFlip = (id) => setFlippedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
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
    // Tempo real: reflete mudanças de qualquer módulo (ex.: OS de manutenção que bloqueia o veículo)
    const unsub = onSnapshot(
      query(collection(db, "veiculos"), orderBy("placa")),
      snap => {
        const seen = new Set();
        setVeiculos(snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(v => v.tipo !== "carreta")
          .filter(v => {
            const norm = (v.placa || v.id).toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (seen.has(norm)) return false;
            seen.add(norm);
            return true;
          }));
        setLoading(false);
      },
      () => setLoading(false)
    );
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
    return () => unsub();
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

  // Um veículo está "em manutenção" tanto pelo status quanto por bloqueio de OS/manutenção
  const emManutencao = (v) =>
    v.status === "manutencao" ||
    (v.bloqueio?.ativo && (v.bloqueio.origem === "os" || /manuten/i.test(v.bloqueio.motivo || "")));
  const ehDisponivel = (v) => (v.status === "disponivel" || v.status === "ativo") && !emManutencao(v) && !v.bloqueio?.ativo;

  const lista = veiculos.filter(v => {
    const txt = filtro.toLowerCase();
    const ok = !txt || v.placa?.toLowerCase().includes(txt) || v.modelo?.toLowerCase().includes(txt) || v.fabricante?.toLowerCase().includes(txt) || v.motorista?.toLowerCase().includes(txt) || v.c1?.toLowerCase().includes(txt) || v.c2?.toLowerCase().includes(txt) || v.c3?.toLowerCase().includes(txt);
    let st;
    if (statFiltro === "total")           st = true;                       // frota inteira, ignora a aba
    else if (statFiltro === "disponivel") st = ehDisponivel(v);
    else if (statFiltro === "emViagem")   st = v.status === "em_viagem";
    else if (statFiltro === "manutencao") st = emManutencao(v);
    else st = statusFiltro === "todos" || v.status === statusFiltro || (statusFiltro === "ativo" && (v.status === "ativo" || v.status === "disponivel"));
    return ok && st;
  });

  const counts = { todos: veiculos.length, ativo: veiculos.filter(v => ["ativo","disponivel"].includes(v.status)).length, inativo: veiculos.filter(v => v.status === "inativo").length };

  // estatísticas pra linha do topo — clicáveis para filtrar a lista
  const stats = {
    total: veiculos.length,
    disponivel: veiculos.filter(ehDisponivel).length,
    emViagem: veiculos.filter(v => v.status === "em_viagem").length,
    manutencao: veiculos.filter(emManutencao).length,
  };
  const statItems = [
    { key:"total",      label:"Total da frota", value:stats.total,       Icon:Ico.Truck,  bg:"var(--accent-soft)", color:"var(--accent)" },
    { key:"disponivel", label:"Disponíveis",     value:stats.disponivel, Icon:Ico.Check,  bg:"var(--success-bg)", color:"var(--success)" },
    { key:"emViagem",   label:"Em viagem",       value:stats.emViagem,   Icon:Ico.Route,  bg:"var(--accent-soft)", color:"var(--accent)" },
    { key:"manutencao", label:"Em manutenção",   value:stats.manutencao, Icon:Ico.Wrench, bg:"var(--warning-bg)", color:"var(--warning)" },
  ];

  return (
    <div style={s.wrap} className="frota-page-root">
      <style>{`
        .frota-card { position: relative; }
        .frota-card:hover .frota-card-action { opacity: 1 !important; }
        /* Fonte unificada com o restante do sistema */
        .frota-page-root { font-family: var(--font); }
        .frota-page-root .frota-display { font-family: var(--font-display); letter-spacing: -.01em; }

        /* ── Card flip 3D ─────────────────────────────────────── */
        .frota-flip { perspective: 1400px; background: transparent; border: none; box-shadow: none; padding: 0; cursor: pointer; }
        .frota-flip:hover { transform: translateY(-2px); }
        .frota-flip-inner {
          position: relative; display: grid; grid-template-rows: 1fr;
          height: 300px;                     /* altura fixa → todos os cards iguais */
          transform-style: preserve-3d;
          transition: transform .6s cubic-bezier(.22,1,.36,1);
        }
        .frota-flip.is-flipped .frota-flip-inner { transform: rotateY(180deg); }
        .frota-face {
          grid-area: 1 / 1; min-width: 0; position: relative;
          -webkit-backface-visibility: hidden; backface-visibility: hidden;
        }
        .frota-flip:hover .frota-face { box-shadow: 0 14px 30px rgba(15,23,42,.12) !important; }
        .frota-back { transform: rotateY(180deg); }
        @media (prefers-reduced-motion: reduce) {
          .frota-flip-inner { transition: none; }
        }
        .frota-header-btn { transition: transform .15s, background .15s, box-shadow .15s; }
        .frota-header-btn:hover { transform: translateY(-1px); }
      `}</style>
      <ModuleHeader
        title="Frota"
        subtitle={`${lista.length} veículos cadastrados`}
        actions={isAdmin && (
          <button className="mod-hbtn-alt" onClick={abrirNovo}>
            <Ico.Plus size={16} />
            <span className="hide-mobile">Novo veículo</span>
          </button>
        )}
      />

      {/* Linha de estatísticas (inspirado no guia pontual-frota) */}
      <div style={s.statsRow}>
        {statItems.map(({ key, label, value, Icon, bg, color }) => {
          const ativo = statFiltro === key;
          const toggle = () => setStatFiltro(prev => (prev === key ? "todos" : key));
          return (
            <div
              key={label}
              style={{
                ...s.statCard, cursor:"pointer", outline:"none", WebkitTapHighlightColor:"transparent",
                borderColor: ativo ? color : s.statCard.border,
                boxShadow: ativo ? `0 0 0 1.5px ${color}, ${s.statCard.boxShadow}` : s.statCard.boxShadow,
                transition: "border-color .15s, box-shadow .15s, transform .15s",
              }}
              onClick={toggle}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
              title={key === "todos" ? "Mostrar todos os veículos" : `Filtrar: ${label}`}
              aria-pressed={ativo}
            >
              <div style={{ ...s.statIcon, background: bg, color }}>
                <Icon size={20} />
              </div>
              <div style={{ minWidth:0 }}>
                <div style={s.statValue} className="frota-display">{value}</div>
                <div style={s.statLabel}>{label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "14px 24px 0" }}>
        <ExportBar
          titulo="Frota"
          arquivo="frota"
          subtitulo={() => `${lista.length} veículo(s)${statFiltro !== "todos" ? ` · filtro: ${statFiltro}` : ""}${filtro ? ` · busca: "${filtro}"` : ""}`}
          dados={() => ({
            colunas: ["Placa", "Tipo", "Modelo", "Fabricante", "Ano", "Status", "Motorista", "Carretas", "Bloqueio"],
            linhas: lista.map((v) => [
              v.placa || "",
              v.tipo || "",
              v.modelo || "",
              v.fabricante || "",
              v.ano || "",
              v.status || "",
              v.motorista || "",
              [v.c1, v.c2, v.c3].filter(Boolean).join(", "),
              v.bloqueio?.ativo ? (v.bloqueio.motivo || "Bloqueado") : "",
            ]),
          })}
        />
      </div>

      <div style={s.toolbar} className="pg-toolbar">
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--text-subtle)", display:"inline-flex", pointerEvents:"none" }}>
            <Ico.Search size={16} />
          </span>
          <input
            style={{ ...s.busca, paddingLeft:38 }}
            placeholder="Buscar por placa, modelo, chassi ou motorista…"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
        </div>
        <div style={s.tabs}>
          {[["ativo","Ativos"], ["inativo","Inativos"]].map(([v,l]) => (
            <button key={v} style={{ ...s.tab, ...(statusFiltro===v ? s.tabAtivo : {}) }} onClick={() => { setStatusFiltro(v); setStatFiltro("todos"); }}>
              {l}
              <span style={{
                marginLeft:6, padding:"1px 7px", borderRadius:6, fontSize:".68rem", fontWeight:800,
                background: statusFiltro===v ? "rgba(255,255,255,.22)" : "var(--border)",
                color:     statusFiltro===v ? "#fff" : "var(--text-muted)",
              }}>{counts[v] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={s.loading}>Carregando...</p> : (
        <div style={s.grid} className="pg-grid">
          {lista.map(v => {
            const bloqueado = v.bloqueio?.ativo;
            const flipped = flippedIds.has(v.id);
            const marca = (v.fabricante || "—").split("/")[0].split(" ")[0];
            const faceBorder = bloqueado ? "2px solid var(--danger)" : s.card.border;
            return (
              <div
                key={v.id}
                className={"frota-card frota-flip" + (flipped ? " is-flipped" : "")}
                style={{ opacity: v.status === "inativo" ? 0.55 : 1 }}
                onClick={() => toggleFlip(v.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFlip(v.id); } }}
                aria-label={`Veículo ${v.placa}. ${flipped ? "Detalhes" : "Resumo"}. Toque para virar o card.`}
              >
                <div className="frota-flip-inner">
                  {/* ─────────── FRENTE: resumo essencial ─────────── */}
                  <div className="frota-face frota-front" style={{ ...s.card, border: faceBorder }}>
                    {!bloqueado && <span style={{ ...s.cardStripe, background: "var(--accent)" }} aria-hidden />}
                    {bloqueado && (
                      <div style={s.lockBanner}><Ico.Lock size={12} /> {v.bloqueio.motivo}</div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ ...s.fabBadge, background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-200)" }}>{marca}</div>
                      {(canBlock || canUnblock) && (
                        <button
                          className="frota-card-action"
                          style={{ ...s.lockBtn, background: bloqueado ? "var(--danger-bg)" : "transparent", color: bloqueado ? "var(--danger)" : "var(--text-muted)", opacity: bloqueado ? 1 : 0 }}
                          onClick={(e) => abrirBloqueio(v, e)}
                          title={bloqueado ? "Desbloquear veículo" : "Bloquear veículo"}
                        >
                          {bloqueado ? <Ico.Lock size={15} /> : <Ico.Unlock size={15} />}
                        </button>
                      )}
                    </div>
                    <div style={s.placa} className="frota-display">{v.placa}</div>
                    <div style={s.modelo}>{v.modelo || "—"}</div>

                    <div style={{ flex:1 }} />

                    {/* Motorista — informação essencial */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:16 }}>
                      <span style={{ color:"var(--text-subtle)", display:"inline-flex", flexShrink:0 }}><Ico.User size={15} /></span>
                      <span style={{ fontSize:".88rem", fontWeight:600, color: v.motorista ? "var(--accent)" : "var(--text-subtle)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {v.motorista || "Sem motorista"}
                      </span>
                    </div>

                    <div style={s.cardFooter}>
                      <span style={{ ...s.statusPill, background: STATUS_COR[v.status]||"var(--surface-3)", color: STATUS_TEXT[v.status]||"var(--text-subtle)" }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background: STATUS_STRIPE[v.status]||"var(--border-strong)", display:"inline-block" }} />
                        {STATUS_LABEL[v.status] || v.status}
                      </span>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:".68rem", fontWeight:600, color:"var(--tech-text)" }}>
                        <Ico.Info size={12} /> detalhes
                      </span>
                    </div>
                  </div>

                  {/* ─────────── VERSO: detalhes ─────────── */}
                  <div className="frota-face frota-back" style={{ ...s.card, border: faceBorder }}>
                    {!bloqueado && <span style={{ ...s.cardStripe, background: "var(--accent)" }} aria-hidden />}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:2 }}>
                      <div style={{ ...s.placa, marginTop:0, fontSize:"1.2rem" }} className="frota-display">{v.placa}</div>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:".68rem", fontWeight:700, color:"var(--tech-text)" }}>
                        <Ico.Flip size={12} /> voltar
                      </span>
                    </div>
                    <div style={{ height:1, background:"var(--border)", margin:"8px 0" }} />

                    <div style={{ display:"flex", flexDirection:"column", gap:6, flex:1, minHeight:0, overflowY:"auto" }}>
                      <SpecRow icon={Ico.Scale} label="Tara:"     value={v.tara ? `${v.tara} kg` : ""} />
                      <SpecRow icon={Ico.Key}   label="Chassi:"   value={v.chassi ? v.chassi.slice(-8) : ""} />
                      <SpecRow icon={Ico.File}  label="RENAVAM:"  value={v.renavam || ""} />
                      <SpecRow icon={Ico.Cal}   label="Ano:"      value={v.ano_fab ? `${v.ano_fab}${v.ano_mod && v.ano_mod !== v.ano_fab ? `/${v.ano_mod}` : ""}` : ""} />
                      <SpecRow icon={Ico.Link}  label="Carretas:"  value={[v.c1, v.c2, v.c3].filter(Boolean).join(" · ")} accent />
                      <SpecRow icon={Ico.Drop}  label="Capacidade:" value={v.cap ? `${v.cap}L${v.comp ? ` · ${v.comp}` : ""}` : ""} />
                      <SpecRow icon={Ico.Truck} label="Config.:"   value={v.tipo_conjunto || ""} />
                    </div>

                    <div style={{ padding:"10px 0 14px" }}>
                      <button
                        style={{ ...s.btnSalvar, width:"100%", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8 }}
                        onClick={(e) => { e.stopPropagation(); abrirEditar(v); }}
                      >
                        <Ico.Edit size={15} /> Editar veículo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {lista.length === 0 && <p style={s.vazio}>Nenhum veículo encontrado.</p>}
        </div>
      )}

      {bloqueioModal && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={() => setBloqueioModal(null)}>
          <div style={{ ...s.modal, maxWidth:420 }} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
                {bloqueioModal.modo === "bloquear" ? <><Ico.Lock size={16} /> Bloquear Veículo</> : <><Ico.Unlock size={16} /> Desbloquear Veículo</>}
              </span>
              <button style={s.closeBtn} onClick={() => setBloqueioModal(null)}>×</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ padding:"10px 14px", borderRadius:8, background: bloqueioModal.modo === "bloquear" ? "var(--danger-bg)" : "var(--success-bg)", border:`1px solid ${bloqueioModal.modo === "bloquear" ? "var(--danger-border)" : "var(--success-border)"}`, fontSize:".85rem", fontWeight:600, color: bloqueioModal.modo === "bloquear" ? "var(--danger)" : "var(--success)" }}>
                Veículo: <strong>{bloqueioModal.veiculo.placa}</strong> — {bloqueioModal.veiculo.modelo || ""}
              </div>

              {bloqueioModal.modo === "bloquear" ? (
                <>
                  <div style={s.fg}>
                    <label style={s.lbl}>Motivo do bloqueio</label>
                    <select style={s.inp} value={bmMotivo} onChange={e => setBmMotivo(e.target.value)}>
                      {MOTIVOS_BLOQUEIO.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div style={s.fg}>
                    <label style={s.lbl}>Descrição (opcional)</label>
                    <textarea style={{ ...s.inp, height:70, resize:"vertical" }} value={bmDesc} onChange={e => setBmDesc(e.target.value)} placeholder="Detalhe o problema..." />
                  </div>
                  <div style={{ padding:"10px 14px", borderRadius:8, background:"var(--warning-bg)", border:"1px solid #fcd34d", fontSize:".8rem", color:"var(--warning)", display:"flex", alignItems:"flex-start", gap:6 }}>
                    <AlertTriangle size={14} style={{ flexShrink:0, marginTop:2 }} /> Após o bloqueio, nenhuma OC poderá ser gerada para este veículo até que seja liberado por um Administrador ou pela Manutenção.
                  </div>
                </>
              ) : (
                <>
                  <div style={s.fg}>
                    <label style={s.lbl}>Motivo do bloqueio anterior</label>
                    <div style={{ padding:"8px 10px", borderRadius:7, background:"var(--danger-bg)", border:"1px solid #fca5a5", fontSize:".85rem", color:"var(--danger)", fontWeight:600 }}>
                      {bloqueioModal.veiculo.bloqueio?.motivo} — bloqueado por {bloqueioModal.veiculo.bloqueio?.bloqueadoPor}
                    </div>
                  </div>
                  <div style={s.fg}>
                    <label style={s.lbl}>Nova vigência dos documentos</label>
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
                style={{ ...s.btnSalvar, background: bloqueioModal.modo === "bloquear" ? "var(--danger)" : "var(--success)", opacity: bmSalvando ? 0.6 : 1, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8 }}
                onClick={confirmarBloqueio}
                disabled={bmSalvando}
              >
                {bmSalvando ? "Aguarde..." : bloqueioModal.modo === "bloquear" ? <><Ico.Lock size={15} /> Confirmar Bloqueio</> : <><Ico.Unlock size={15} /> Liberar Veículo</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={fecharModal}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span>{editId ? `Editar — ${form.placa}` : "Novo Veículo"}</span>
              <button style={s.closeBtn} onClick={fecharModal}>×</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.row}>
                <div style={s.fg}>
                  <label style={s.lbl}>Placa Cavalo</label>
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
                <button style={{ ...s.btnExcluir, display:"inline-flex", alignItems:"center", gap:6 }} onClick={() => { excluir(editId); fecharModal(); }}><Trash2 size={15} /> Excluir</button>
              )}
              <button style={s.btnCancelar} onClick={fecharModal}>Cancelar</button>
              <button
                style={{ ...s.btnSalvar, opacity: (salvando || feriasAtivas.has(form.motorista)) ? 0.5 : 1, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8 }}
                onClick={salvar}
                disabled={salvando || feriasAtivas.has(form.motorista)}
                title={feriasAtivas.has(form.motorista) ? "Motorista em férias — remova o atrelamento para salvar" : ""}
              >
                {salvando ? "Salvando..." : <><Save size={15} /> Salvar</>}
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
  header:      { background:"var(--header-bg)", color:"#fff", borderBottom: "1px solid var(--accent-800)", padding:"14px 24px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 4px 14px rgba(15,23,42,.18)" },
  titulo:      { color:"#fff", fontWeight:700, fontSize:"1.15rem", lineHeight:1.1 },
  sub:         { color:"rgba(255,255,255,.62)", fontSize:".72rem", marginTop:2 },
  back:        { background:"var(--header-btn-bg)", border:"none", color:"var(--accent)", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:".82rem", fontWeight:700, display:"inline-flex", alignItems:"center", gap:8, boxShadow:"0 1px 3px rgba(0,0,0,.1)" },
  btnNovo:     { background:"rgba(255,255,255,.14)", border:"none", color:"#fff", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:".82rem", fontWeight:700, display:"inline-flex", alignItems:"center", gap:8, backdropFilter:"blur(4px)" },
  toolbar:     { padding:"14px 24px", display:"flex", gap:12, flexWrap:"wrap", alignItems:"center", background:"transparent" },
  busca:       { width:"100%", minWidth:200, padding:"10px 14px", borderRadius:10, border:"1px solid var(--border)", fontSize:".9rem", outline:"none", background:"var(--card-bg)", boxShadow:"0 1px 3px rgba(15,23,42,.04)", color:"var(--text)", fontFamily:"inherit" },
  tabs:        { display:"flex", gap:4, padding:4, background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:12, boxShadow:"0 1px 3px rgba(15,23,42,.04)" },
  tab:         { padding:"6px 14px", borderRadius:8, border:"none", background:"transparent", fontSize:".82rem", cursor:"pointer", fontWeight:700, color:"var(--text-muted)", display:"inline-flex", alignItems:"center", fontFamily:"inherit" },
  tabAtivo:    { background:"var(--accent)", color:"#fff" },
  grid:        { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:16, padding:"4px 24px 24px" },
  card:        { background:"var(--card-bg)", borderRadius:16, padding:"18px 16px 0", border:"1px solid var(--border)", display:"flex", flexDirection:"column", cursor:"pointer", overflow:"hidden", transition:"transform .25s ease, box-shadow .25s ease", boxShadow:"0 1px 3px rgba(15,23,42,.05), 0 8px 24px -16px rgba(15,23,42,.12)" },
  cardStripe:  { position:"absolute", left:0, right:0, top:0, height:4 },
  cardFooter:  { display:"flex", alignItems:"center", justifyContent:"space-between", borderTop:"1px solid var(--border)", padding:"10px 0 12px", marginTop:12, marginLeft:0, marginRight:0 },
  fabBadge:    { display:"inline-block", padding:"3px 9px", borderRadius:5, fontSize:".64rem", fontWeight:800, color:"#fff", alignSelf:"flex-start", letterSpacing:".06em", textTransform:"uppercase" },
  placa:       { fontWeight:700, fontSize:"1.5rem", color:"var(--accent)", letterSpacing:".5px", marginTop:8, lineHeight:1.1 },
  // Stat cards (linha de estatística no topo)
  statsRow:    { padding:"18px 24px 0", display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12 },
  statCard:    { display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:14, background:"var(--card-bg)", border:"1px solid var(--border)", boxShadow:"0 1px 3px rgba(15,23,42,.04), 0 6px 18px -10px rgba(15,23,42,.10)" },
  statIcon:    { width:44, height:44, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  statValue:   { fontWeight:700, fontSize:"1.7rem", color:"var(--accent)", lineHeight:1, letterSpacing:"-.02em" },
  statLabel:   { fontSize:".7rem", color:"var(--text-muted)", fontWeight:600, marginTop:4 },
  modelo:      { fontSize:".82rem", color:"var(--text-muted)", fontWeight:500, marginTop:2 },
  motoristaNome:{ fontSize:".72rem", color:"var(--accent)" },
  cardInfo:    { fontSize:".72rem", color:"var(--text-muted)" },
  cardInfoVal: { fontWeight:600, color:"var(--text)", fontFamily:"monospace" },
  secTitle:    { fontSize:".75rem", fontWeight:700, color:"var(--text-subtle)", textTransform:"uppercase", letterSpacing:".06em", paddingTop:8, borderTop:"1px solid var(--border)", marginTop:4 },
  carreta:     { fontSize:".72rem", color:"var(--text-muted)" },
  cap:         { fontSize:".72rem", color:"var(--text-muted)" },
  statusPill:  { display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, fontSize:".72rem", fontWeight:700 },
  loading:     { padding:40, textAlign:"center", color:"var(--text-muted)" },
  vazio:       { padding:40, textAlign:"center", color:"var(--text-subtle)", gridColumn:"1/-1" },
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal:       { background:"var(--card-bg)", borderRadius:14, width:"100%", maxWidth:620, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 8px 40px rgba(0,0,0,.2)" },
  modalHeader: { padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", fontWeight:700, color:"var(--accent)", fontSize:"1rem" },
  closeBtn:    { background:"none", border:"none", fontSize:"1.4rem", cursor:"pointer", color:"var(--text-subtle)", lineHeight:1 },
  modalBody:   { padding:"20px", overflowY:"auto", display:"flex", flexDirection:"column", gap:12 },
  modalFooter: { padding:"14px 20px", borderTop:"1px solid var(--border)", display:"flex", gap:8, justifyContent:"flex-end" },
  row:         { display:"flex", gap:10, flexWrap:"wrap" },
  fg:          { display:"flex", flexDirection:"column", flex:1, minWidth:120 },
  lbl:         { fontSize:".7rem", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", marginBottom:3 },
  inp:         { padding:"8px 10px", borderRadius:7, border:"1px solid var(--border)", fontSize:".88rem", outline:"none", width:"100%", boxSizing:"border-box" },
  btnSalvar:   { padding:"8px 20px", background:"var(--accent)", color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer", fontSize:".88rem" },
  btnCancelar: { padding:"8px 16px", background:"var(--surface-3)", color:"var(--text-muted)", border:"none", borderRadius:7, cursor:"pointer", fontSize:".88rem" },
  btnExcluir:  { padding:"8px 16px", background:"var(--danger-bg)", color:"var(--danger)", border:"none", borderRadius:7, cursor:"pointer", fontSize:".88rem", marginRight:"auto" },
  lockBanner:  { background:"var(--danger-bg)", color:"var(--danger)", fontSize:".7rem", fontWeight:700, padding:"4px 8px", borderRadius:6, marginBottom:8, textAlign:"center", display:"inline-flex", alignItems:"center", gap:5, alignSelf:"flex-start" },
  lockBtn:     { border:"none", borderRadius:6, padding:"5px 7px", cursor:"pointer", lineHeight:1, display:"inline-flex", alignItems:"center", justifyContent:"center", transition:"background .15s, opacity .2s" },
};
