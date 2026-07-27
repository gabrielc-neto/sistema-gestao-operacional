import { useEffect, useState } from "react";
import {
  watchVeiculos, saveVeiculo, patchVeiculo, removeVeiculo, listVeiculos,
} from "../services/frotaDataSource";
import { list as dsList, watch as dsWatch } from "../services/genericDataSource";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LogoPontual from "../components/LogoPontual";
import VeiculoQR from "../components/VeiculoQR";
import { QrCode, Rows3, LayoutGrid, Columns2, Lock as LockIco, Unlock as UnlockIco, Edit3 } from "lucide-react";
import { usuarioPontual } from "../utils/format";

const MOTIVOS_BLOQUEIO = ["CIV", "CIPP", "Manutenção", "Documentos vencidos", "Revisão", "Outro"];

const TIPOS = ["—", "LS", "Bitrem", "Rodotrem", "4° Eixo"];
const STATUS_OPTS = ["ativo", "disponivel", "em_viagem", "manutencao", "inativo"];
const STATUS_LABEL = { ativo:"Ativo", disponivel:"Disponível", em_viagem:"Em Viagem", manutencao:"Manutenção", inativo:"Inativo" };
const STATUS_COR    = { ativo:"#dcfce7", disponivel:"#dcfce7", em_viagem:"#dbeafe", manutencao:"#fffbeb", inativo:"#f1f5f9" };
const STATUS_TEXT   = { ativo:"#15803d", disponivel:"#15803d", em_viagem:"#1d4ed8", manutencao:"#b45309", inativo:"#94a3b8" };
const STATUS_STRIPE = { ativo:"#22c55e", disponivel:"#22c55e", em_viagem:"#3b82f6", manutencao:"#f59e0b", inativo:"#cbd5e1" };

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
  Edit:   (p) => <Sv {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></Sv>,
  Cog:    (p) => <Sv {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Sv>,
};

// Linha de especificação no card de veículo (estilo guia pontual-frota)
function SpecRow({ icon: Icon, label, value, accent }) {
  if (value == null || value === "") return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ marginTop: 2, flexShrink: 0, color: "#94a3b8", display: "inline-flex" }}>
        <Icon size={14} />
      </span>
      <p style={{ fontSize: 13, lineHeight: 1.45, color: "#64748b", margin: 0 }}>
        <span>{label} </span>
        <span style={{ fontWeight: 600, color: accent ? "#1d4ed8" : "#1e293b" }}>{value}</span>
      </p>
    </div>
  );
}

export default function Frota() {
  const [veiculos, setVeiculos]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtro, setFiltro]       = useState("");
  const [statusFiltro, setStatusFiltro] = useState("ativo");
  const [modal, setModal]         = useState(false);
  const [qrModal, setQrModal]     = useState(null); // placa do veículo pra mostrar QR
  const [modoView, setModoView]   = useState(() => localStorage.getItem("frota_view") || "cards"); // cards | tabela | split
  const [splitSel, setSplitSel]   = useState(null); // veículo selecionado no modo split
  useEffect(() => { localStorage.setItem("frota_view", modoView); }, [modoView]);
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

  const [flipped, setFlipped] = useState(() => new Set()); // ids de cards virados
  const toggleFlip = (id) => setFlipped(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const [bloqueioModal, setBloqueioModal] = useState(null); // { veiculo, modo: "bloquear"|"desbloquear" }
  const [bmMotivo,   setBmMotivo]   = useState(MOTIVOS_BLOQUEIO[0]);
  const [bmDesc,     setBmDesc]     = useState("");
  const [bmVigencia, setBmVigencia] = useState("");
  const [bmSalvando, setBmSalvando] = useState(false);

  // no-op — mantida por compat com chamadas espalhadas. onSnapshot já atualiza.
  function carregar() { return Promise.resolve(); }

  useEffect(() => {
    const unsubVeic = watchVeiculos(
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
          })
        );
        setLoading(false);
      }
    );
    const unsubMot = dsWatch("motoristas", snap => {
      setListaMotoristas(snap.docs.map(d => d.data().nome).filter(Boolean));
    }, { orderBy: "nome" });
    // Férias em tempo real também
    const unsubFerias = dsWatch("ferias", snap => {
      const hoje = new Date();
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
    return () => {
      try { unsubVeic(); }   catch {}
      try { unsubMot(); }    catch {}
      try { unsubFerias(); } catch {}
    };
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
      const todos = await listVeiculos();
      const d = todos.find(v => (v.placa || "").toUpperCase() === placaNorm);
      if (d) {
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
    const todos = await listVeiculos();
    const d = todos.find(v => (v.placa || "").toUpperCase() === p);
    if (d) {
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
      await saveVeiculo(placa, { ...form, placa, empresa: "PONTUAL" });
      for (const n of ["1","2"]) {
        const cPlaca = form[`c${n}`]?.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
        if (!cPlaca) continue;
        await saveVeiculo(cPlaca, {
          placa: cPlaca, empresa:"PONTUAL",
          chassi:   form[`c${n}_chassi`]  || null,
          renavam:  form[`c${n}_renavam`] || null,
          tara:     form[`c${n}_tara`]    || null,
          ano_fab:  form[`c${n}_ano_fab`] || null,
          ano_mod:  form[`c${n}_ano_mod`] || null,
          updatedAt: new Date().toISOString(),
        });
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
      await removeVeiculo(id);
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
        await patchVeiculo(veiculo.id, {
          bloqueio: {
            ativo: true,
            motivo: bmMotivo,
            descricao: bmDesc,
            bloqueadoPor: usuarioPontual(profile),
            bloqueadoEm: agora,
          }
        });
      } else {
        if (!bmVigencia) { alert("Informe a nova vigência dos documentos."); setBmSalvando(false); return; }
        await patchVeiculo(veiculo.id, {
          bloqueio: {
            ativo: false,
            novaVigencia: bmVigencia,
            desbloqueadoPor: usuarioPontual(profile),
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

  // estatísticas pra linha do topo (inspirado no guia)
  const stats = {
    total: veiculos.length,
    disponivel: veiculos.filter(v => v.status === "disponivel" || v.status === "ativo").length,
    emViagem: veiculos.filter(v => v.status === "em_viagem").length,
    manutencao: veiculos.filter(v => v.status === "manutencao").length,
  };
  const statItems = [
    { label:"Total da frota", value:stats.total,       Icon:Ico.Truck,  bg:"#e0e7ff", color:"#4338ca", filtro:"todos" },
    { label:"Disponíveis",     value:stats.disponivel, Icon:Ico.Check,  bg:"#dcfce7", color:"#15803d", filtro:"ativo" },
    { label:"Em viagem",       value:stats.emViagem,   Icon:Ico.Route,  bg:"#dbeafe", color:"#1d4ed8", filtro:"em_viagem" },
    { label:"Em manutenção",   value:stats.manutencao, Icon:Ico.Wrench, bg:"#fef3c7", color:"#b45309", filtro:"manutencao" },
  ];

  return (
    <div style={s.wrap} className="frota-page-root">
      <style>{`
        .frota-card { position: relative; }
        .frota-card:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(15,23,42,.10) !important; }
        .frota-card:hover .frota-card-action { opacity: 1 !important; }
        .frota-page-root { font-family: "Manrope", system-ui, -apple-system, sans-serif; }
        .frota-page-root .frota-display { font-family: "Space Grotesk", "Manrope", system-ui, sans-serif; letter-spacing: -.01em; }
        .frota-header-btn { transition: transform .15s, background .15s, box-shadow .15s; }
        .frota-header-btn:hover { transform: translateY(-1px); }
      `}</style>
      <header style={s.header} className="pg-header">
        <div className="pg-logo"><LogoPontual height={36} variant="white" /></div>
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          <span style={{ ...s.titulo }} className="frota-display">FROTA</span>
          <span style={s.sub} className="hide-mobile">{lista.length} veículos cadastrados</span>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }} className="pg-header-actions">
          {isAdmin && (
            <button style={s.btnNovo} className="frota-header-btn" onClick={abrirNovo}>
              <Ico.Plus size={16} />
              <span className="hide-mobile">Novo veículo</span>
            </button>
          )}
          <button style={s.back} className="frota-header-btn" onClick={() => navigate("/dashboard")}>
            <Ico.Dash size={16} />
            <span className="hide-mobile">Dashboard</span>
          </button>
        </div>
      </header>

      {/* Linha de estatísticas — clicáveis, sincronizam com statusFiltro */}
      <div style={s.statsRow}>
        {statItems.map(({ label, value, Icon, bg, color, filtro: kpiFiltro }) => {
          const ativo = statusFiltro === kpiFiltro;
          const onClick = () => setStatusFiltro(ativo ? "todos" : kpiFiltro);
          return (
            <div
              key={label}
              onClick={onClick}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
              role="button"
              tabIndex={0}
              aria-pressed={ativo}
              title={ativo ? `Remover filtro "${label}"` : `Filtrar por ${label}`}
              style={{
                ...s.statCard,
                border: ativo ? `2px solid ${color}` : (s.statCard?.border || "1px solid transparent"),
                boxShadow: ativo ? `0 0 0 3px ${bg}` : (s.statCard?.boxShadow || undefined),
                cursor: "pointer",
                transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
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

      <div style={s.toolbar} className="pg-toolbar">
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#94a3b8", display:"inline-flex", pointerEvents:"none" }}>
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
            <button key={v} style={{ ...s.tab, ...(statusFiltro===v ? s.tabAtivo : {}) }} onClick={() => setStatusFiltro(v)}>
              {l}
              <span style={{
                marginLeft:6, padding:"1px 7px", borderRadius:6, fontSize:".68rem", fontWeight:800,
                background: statusFiltro===v ? "rgba(255,255,255,.22)" : "#e2e8f0",
                color:     statusFiltro===v ? "#fff" : "#475569",
              }}>{counts[v] ?? 0}</span>
            </button>
          ))}
        </div>
        {/* Toggle modo de visualização — cards | tabela | split */}
        <div style={{ display:"inline-flex", gap:2, background:"#f1f5f9", padding:3, borderRadius:8, marginLeft:8 }}>
          {[
            { id:"cards",  icon:LayoutGrid, label:"Cards"  },
            { id:"tabela", icon:Rows3,      label:"Tabela" },
            { id:"split",  icon:Columns2,   label:"Split"  },
          ].map(({ id, icon:Ic, label }) => (
            <button
              key={id}
              onClick={() => setModoView(id)}
              title={`Visualização: ${label}`}
              style={{
                padding:"6px 10px", borderRadius:6, border:"none",
                background: modoView === id ? "#fff" : "transparent",
                color: modoView === id ? "#1a3a5c" : "#64748b",
                boxShadow: modoView === id ? "0 1px 3px rgba(15,23,42,.1)" : "none",
                cursor:"pointer", fontWeight:700, fontSize:".78rem",
                display:"inline-flex", alignItems:"center", gap:5, fontFamily:"inherit",
              }}
            >
              <Ic size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={s.loading}>Carregando...</p> : modoView === "cards" ? (
        <div style={s.grid} className="pg-grid">
          {lista.map(v => {
            const bloqueado = v.bloqueio?.ativo;
            const isFlipped = flipped.has(v.id);
            const cardBorder = bloqueado ? "2px solid #dc2626" : s.card.border;
            const marca = (v.fabricante || "").split("/")[0].split(" ")[0] || "—";
            return (
              <div
                key={v.id}
                className="frota-card-flip"
                style={{ perspective: 1200, opacity: v.status === "inativo" ? 0.55 : 1 }}
                onClick={() => toggleFlip(v.id)}
              >
                <div
                  className="frota-card-flip-inner"
                  style={{
                    position: "relative",
                    width: "100%",
                    minHeight: 300,
                    transformStyle: "preserve-3d",
                    transition: "transform .6s cubic-bezier(.4,.2,.2,1)",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    cursor: "pointer",
                  }}
                >
                  {/* ===== FRENTE ===== */}
                  <div
                    className="frota-card"
                    style={{
                      ...s.card,
                      border: cardBorder,
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ ...s.cardStripe, background: STATUS_STRIPE[v.status] || "#cbd5e1" }} aria-hidden />
                    {bloqueado && (
                      <div style={s.lockBanner}>
                        <Ico.Lock size={12} /> {v.bloqueio.motivo}
                      </div>
                    )}

                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div style={{ ...s.fabBadge, background: corFab(v.fabricante) }}>{marca}</div>
                        <div style={{ fontSize:".62rem", color:"#94a3b8", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                          <Ico.Truck size={12} /> clique pra virar
                        </div>
                      </div>

                      <div style={{ marginTop: 14 }}>
                        <div style={{ ...s.placa, fontSize:"1.8rem", letterSpacing:"0.02em" }} className="frota-display">{v.placa}</div>
                        <div style={{ ...s.modelo, fontSize:".95rem", marginTop:4 }}>{v.modelo || "—"}</div>
                        <div style={{ fontSize:".78rem", color:"#64748b", marginTop:6, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.02em" }}>{v.fabricante || "—"}</div>
                      </div>
                    </div>

                    <div style={{ ...s.cardFooter, marginTop:0 }}>
                      <span style={{ ...s.statusPill, background: STATUS_COR[v.status]||"#f1f5f9", color: STATUS_TEXT[v.status]||"#94a3b8" }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background: STATUS_STRIPE[v.status]||"#cbd5e1", display:"inline-block" }} />
                        {STATUS_LABEL[v.status] || v.status}
                      </span>
                    </div>
                  </div>

                  {/* ===== VERSO ===== */}
                  <div
                    className="frota-card"
                    style={{
                      ...s.card,
                      border: cardBorder,
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <span style={{ ...s.cardStripe, background: STATUS_STRIPE[v.status] || "#cbd5e1" }} aria-hidden />

                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 8 }}>
                      <div style={{ fontSize:".82rem", fontWeight:800, color:"#1a3a5c", letterSpacing:"0.02em" }}>
                        {v.placa} <span style={{ color:"#94a3b8", fontWeight:500 }}>· detalhes</span>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        {(canBlock || canUnblock) && (
                          <button
                            className="frota-card-action"
                            style={{ ...s.lockBtn, background: bloqueado ? "#fee2e2" : "#f1f5f9", color: bloqueado ? "#dc2626" : "#64748b", opacity: 1 }}
                            onClick={(e) => { e.stopPropagation(); abrirBloqueio(v, e); }}
                            title={bloqueado ? "Desbloquear veículo" : "Bloquear veículo"}
                          >
                            {bloqueado ? <Ico.Lock size={15} /> : <Ico.Unlock size={15} />}
                          </button>
                        )}
                        <button
                          className="frota-card-action"
                          style={{ ...s.lockBtn, background: "#f3e8ff", color: "#7c3aed", opacity: 1 }}
                          onClick={(e) => { e.stopPropagation(); setQrModal(v.placa); }}
                          title="Ver QR Code do veículo"
                        >
                          <QrCode size={15} />
                        </button>
                        <button
                          className="frota-card-action"
                          style={{ ...s.lockBtn, background: "#dbeafe", color: "#1d4ed8", opacity: 1 }}
                          onClick={(e) => { e.stopPropagation(); abrirEditar(v); }}
                          title="Editar veículo"
                        >
                          <Ico.Edit size={15} />
                        </button>
                      </div>
                    </div>

                    <div style={{ height:1, background:"#e2e8f0", margin:"0 0 10px" }} />

                    <div style={{ display:"flex", flexDirection:"column", gap:6, flex:1, overflowY:"auto" }}>
                      <SpecRow icon={Ico.Scale} label="Tara:"     value={v.tara ? `${v.tara} kg` : ""} />
                      <SpecRow icon={Ico.Key}   label="Chassi:"   value={v.chassi ? v.chassi.slice(-8) : ""} />
                      <SpecRow icon={Ico.File}  label="RENAVAM:"  value={v.renavam || ""} />
                      <SpecRow icon={Ico.Cal}   label="Ano:"      value={v.ano_fab ? `${v.ano_fab}${v.ano_mod && v.ano_mod !== v.ano_fab ? `/${v.ano_mod}` : ""}` : ""} />
                      <SpecRow icon={Ico.User}  label="Motorista:" value={v.motorista || ""} accent />
                      <SpecRow icon={Ico.Link}  label="Carretas:"  value={[v.c1, v.c2, v.c3].filter(Boolean).join(" · ")} accent />
                      <SpecRow icon={Ico.Drop}  label="Capacidade:" value={v.cap ? `${v.cap}L${v.comp ? ` · ${v.comp}` : ""}` : ""} />
                      <SpecRow icon={Ico.Truck} label="Config.:"   value={v.tipo_conjunto || ""} />
                    </div>

                    <div style={{ fontSize:".65rem", color:"#94a3b8", textAlign:"center", marginTop:6, fontWeight:600 }}>
                      clique pra voltar
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {lista.length === 0 && <p style={s.vazio}>Nenhum veículo encontrado.</p>}
        </div>
      ) : modoView === "tabela" ? (
        // ═══ MODO TABELA (SAP/Totvs-like) ═══
        <div style={{ background:"#fff", borderRadius:10, overflow:"hidden", border:"1px solid #e2e8f0" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".85rem", fontVariantNumeric:"tabular-nums" }}>
              <thead>
                <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                  <th style={{ padding:"10px 12px", textAlign:"left", fontSize:".72rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Placa</th>
                  <th style={{ padding:"10px 12px", textAlign:"left", fontSize:".72rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Tipo</th>
                  <th style={{ padding:"10px 12px", textAlign:"left", fontSize:".72rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Modelo</th>
                  <th style={{ padding:"10px 12px", textAlign:"left", fontSize:".72rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Fabricante</th>
                  <th style={{ padding:"10px 12px", textAlign:"left", fontSize:".72rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Ano</th>
                  <th style={{ padding:"10px 12px", textAlign:"left", fontSize:".72rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Motorista</th>
                  <th style={{ padding:"10px 12px", textAlign:"left", fontSize:".72rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Status</th>
                  <th style={{ padding:"10px 12px", textAlign:"right", fontSize:".72rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding:"40px 16px", textAlign:"center", color:"#94a3b8" }}>Nenhum veículo encontrado.</td></tr>
                ) : lista.map((v, i) => {
                  const bloqueado = v.bloqueio?.ativo;
                  return (
                    <tr key={v.id} style={{ borderBottom:"1px solid #f1f5f9", background: i % 2 ? "#fafcff" : "#fff", opacity: v.status === "inativo" ? 0.55 : 1 }}>
                      <td style={{ padding:"9px 12px", fontWeight:700, color:"#1a3a5c", letterSpacing:".02em" }}>
                        {bloqueado && <LockIco size={12} style={{ color:"#dc2626", marginRight:6, verticalAlign:"middle" }} />}
                        {v.placa}
                      </td>
                      <td style={{ padding:"9px 12px", color:"#475569" }}>{v.tipo || "—"}</td>
                      <td style={{ padding:"9px 12px", color:"#1a3a5c" }}>{v.modelo || "—"}</td>
                      <td style={{ padding:"9px 12px", color:"#475569" }}>{(v.fabricante || "—").split("/")[0]}</td>
                      <td style={{ padding:"9px 12px", color:"#475569" }}>{v.ano || "—"}</td>
                      <td style={{ padding:"9px 12px", color:"#475569" }}>{v.motorista || "—"}</td>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ background:STATUS_COR[v.status]||"#f1f5f9", color:STATUS_TEXT[v.status]||"#94a3b8", padding:"2px 8px", borderRadius:999, fontSize:".72rem", fontWeight:700, display:"inline-flex", alignItems:"center", gap:4 }}>
                          <span style={{ width:6, height:6, borderRadius:"50%", background: STATUS_STRIPE[v.status]||"#cbd5e1" }} />
                          {STATUS_LABEL[v.status] || v.status}
                        </span>
                      </td>
                      <td style={{ padding:"9px 12px", textAlign:"right" }}>
                        <div style={{ display:"inline-flex", gap:4 }}>
                          {(canBlock || canUnblock) && (
                            <button onClick={() => abrirBloqueio(v)} title={bloqueado ? "Desbloquear" : "Bloquear"}
                              style={{ background: bloqueado ? "#fee2e2" : "#f1f5f9", color: bloqueado ? "#dc2626" : "#64748b", border:"none", padding:"5px 7px", borderRadius:5, cursor:"pointer", display:"inline-flex" }}>
                              {bloqueado ? <LockIco size={13} /> : <UnlockIco size={13} />}
                            </button>
                          )}
                          <button onClick={() => setQrModal(v.placa)} title="QR Code"
                            style={{ background:"#f3e8ff", color:"#7c3aed", border:"none", padding:"5px 7px", borderRadius:5, cursor:"pointer", display:"inline-flex" }}>
                            <QrCode size={13} />
                          </button>
                          <button onClick={() => abrirEditar(v)} title="Editar"
                            style={{ background:"#dbeafe", color:"#1d4ed8", border:"none", padding:"5px 7px", borderRadius:5, cursor:"pointer", display:"inline-flex" }}>
                            <Edit3 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding:"8px 14px", background:"#f8fafc", borderTop:"1px solid #e2e8f0", fontSize:".75rem", color:"#64748b" }}>
            {lista.length} registro{lista.length === 1 ? "" : "s"}
          </div>
        </div>
      ) : (
        // ═══ MODO SPLIT (Salesforce-like) ═══
        <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:14, minHeight:500 }}>
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden", maxHeight:"70vh", overflowY:"auto" }}>
            <div style={{ padding:"10px 14px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0", fontSize:".72rem", fontWeight:700, color:"#64748b", textTransform:"uppercase" }}>
              {lista.length} veículo{lista.length === 1 ? "" : "s"}
            </div>
            {lista.length === 0 ? (
              <div style={{ padding:30, textAlign:"center", color:"#94a3b8" }}>Nenhum veículo</div>
            ) : lista.map(v => {
              const sel = splitSel?.id === v.id;
              const bloq = v.bloqueio?.ativo;
              return (
                <button key={v.id} onClick={() => setSplitSel(v)} style={{
                  display:"block", width:"100%", textAlign:"left", padding:"10px 14px",
                  background: sel ? "#eff6ff" : "transparent",
                  borderLeft: sel ? "3px solid #1d4ed8" : "3px solid transparent",
                  border:"none", borderBottom:"1px solid #f1f5f9", cursor:"pointer", fontFamily:"inherit",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background: STATUS_STRIPE[v.status]||"#cbd5e1" }} />
                    <span style={{ fontWeight:700, color:"#1a3a5c", letterSpacing:".02em" }}>{v.placa}</span>
                    {bloq && <LockIco size={11} color="#dc2626" />}
                  </div>
                  <div style={{ fontSize:".76rem", color:"#64748b", marginTop:2 }}>{v.modelo || "—"} · {v.fabricante?.split("/")[0] || "—"}</div>
                </button>
              );
            })}
          </div>

          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding: splitSel ? 20 : 0, minHeight:400 }}>
            {!splitSel ? (
              <div style={{ padding:60, textAlign:"center", color:"#94a3b8" }}>
                Selecione um veículo à esquerda pra ver detalhes
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:"1.6rem", fontWeight:800, color:"#1a3a5c", letterSpacing:".02em" }}>{splitSel.placa}</div>
                    <div style={{ fontSize:".92rem", color:"#475569", marginTop:2 }}>{splitSel.modelo || "—"} · {splitSel.fabricante?.split("/")[0] || "—"} {splitSel.ano ? `· ${splitSel.ano}` : ""}</div>
                  </div>
                  <span style={{ background:STATUS_COR[splitSel.status]||"#f1f5f9", color:STATUS_TEXT[splitSel.status]||"#94a3b8", padding:"4px 12px", borderRadius:999, fontSize:".78rem", fontWeight:700 }}>
                    {STATUS_LABEL[splitSel.status] || splitSel.status}
                  </span>
                </div>

                {splitSel.bloqueio?.ativo && (
                  <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:6, padding:"8px 12px", marginBottom:14, color:"#991b1b", fontSize:".85rem", display:"inline-flex", alignItems:"center", gap:6 }}>
                    <LockIco size={14} /> Bloqueado: {splitSel.bloqueio.motivo}
                  </div>
                )}

                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginTop:12 }}>
                  {[
                    ["Tipo",        splitSel.tipo || "—"],
                    ["Chassi",      splitSel.chassi ? splitSel.chassi.slice(-8) : "—"],
                    ["Renavam",     splitSel.renavam || "—"],
                    ["Tara",        splitSel.tara ? `${splitSel.tara} kg` : "—"],
                    ["Capacidade",  splitSel.capacidadeTotal ? `${splitSel.capacidadeTotal} L` : "—"],
                    ["Motorista",   splitSel.motorista || "—"],
                    ["Eixos",       splitSel.eixos || "—"],
                    ["Rastreador",  splitSel.rastreador || "—"],
                  ].map(([k,val]) => (
                    <div key={k}>
                      <div style={{ fontSize:".7rem", color:"#94a3b8", textTransform:"uppercase", letterSpacing:".04em", fontWeight:700 }}>{k}</div>
                      <div style={{ fontSize:".95rem", color:"#1a3a5c", fontWeight:600, marginTop:2 }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display:"flex", gap:8, marginTop:24, paddingTop:16, borderTop:"1px solid #e2e8f0", flexWrap:"wrap" }}>
                  <button onClick={() => abrirEditar(splitSel)} style={{ background:"#1a3a5c", color:"#fff", border:"none", padding:"8px 16px", borderRadius:6, cursor:"pointer", fontWeight:600, display:"inline-flex", alignItems:"center", gap:6 }}>
                    <Edit3 size={14} /> Editar
                  </button>
                  {(canBlock || canUnblock) && (
                    <button onClick={() => abrirBloqueio(splitSel)} style={{ background: splitSel.bloqueio?.ativo ? "#fee2e2" : "#f1f5f9", color: splitSel.bloqueio?.ativo ? "#dc2626" : "#475569", border:"none", padding:"8px 16px", borderRadius:6, cursor:"pointer", fontWeight:600, display:"inline-flex", alignItems:"center", gap:6 }}>
                      {splitSel.bloqueio?.ativo ? <><UnlockIco size={14} /> Desbloquear</> : <><LockIco size={14} /> Bloquear</>}
                    </button>
                  )}
                  <button onClick={() => setQrModal(splitSel.placa)} style={{ background:"#f3e8ff", color:"#7c3aed", border:"none", padding:"8px 16px", borderRadius:6, cursor:"pointer", fontWeight:600, display:"inline-flex", alignItems:"center", gap:6 }}>
                    <QrCode size={14} /> QR Code
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {bloqueioModal && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={() => setBloqueioModal(null)}>
          <div style={{ ...s.modal, maxWidth:420 }} className="modal-mobile-sheet" onClick={e => e.stopPropagation()}>
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
                    <label style={s.lbl}>Motivo do bloqueio</label>
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
                  <input style={s.inp} value={form.placa} onChange={e => campo("placa", e.target.value.toUpperCase())} disabled={!!editId} placeholder="AKD5988" autoCapitalize="characters" autoComplete="off" maxLength={7} inputMode="text" spellCheck={false} />
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
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {qrModal && <VeiculoQR placa={qrModal} onClose={() => setQrModal(null)} />}
    </div>
  );
}

const s = {
  wrap:        { minHeight:"100vh", background:"#f5f7fb" },
  header:      { background:"linear-gradient(105deg, #1a3a5c, #234775)", color:"#fff", borderBottom:"4px solid transparent", borderImage:"linear-gradient(90deg, #3d6b47, #6aaa5e, #b5d947, #f5c318, #f0a500) 1", padding:"14px 24px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 4px 14px rgba(15,23,42,.18)" },
  titulo:      { color:"#fff", fontWeight:700, fontSize:"1.15rem", lineHeight:1.1 },
  sub:         { color:"rgba(255,255,255,.62)", fontSize:".72rem", marginTop:2 },
  back:        { background:"#f5c318", border:"none", color:"#1a3a5c", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:".82rem", fontWeight:700, display:"inline-flex", alignItems:"center", gap:8, boxShadow:"0 1px 3px rgba(0,0,0,.1)" },
  btnNovo:     { background:"rgba(255,255,255,.14)", border:"none", color:"#fff", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:".82rem", fontWeight:700, display:"inline-flex", alignItems:"center", gap:8, backdropFilter:"blur(4px)" },
  toolbar:     { padding:"14px 24px", display:"flex", gap:12, flexWrap:"wrap", alignItems:"center", background:"transparent" },
  busca:       { width:"100%", minWidth:200, padding:"10px 14px", borderRadius:10, border:"1px solid #e2e8f0", fontSize:".9rem", outline:"none", background:"#fff", boxShadow:"0 1px 3px rgba(15,23,42,.04)", color:"#1e293b", fontFamily:"inherit" },
  tabs:        { display:"flex", gap:4, padding:4, background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, boxShadow:"0 1px 3px rgba(15,23,42,.04)" },
  tab:         { padding:"6px 14px", borderRadius:8, border:"none", background:"transparent", fontSize:".82rem", cursor:"pointer", fontWeight:700, color:"#64748b", display:"inline-flex", alignItems:"center", fontFamily:"inherit" },
  tabAtivo:    { background:"#1a3a5c", color:"#fff" },
  grid:        { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:16, padding:"4px 24px 24px" },
  card:        { background:"#fff", borderRadius:16, padding:"18px 16px 0", border:"1px solid #e2e8f0", display:"flex", flexDirection:"column", cursor:"pointer", overflow:"hidden", transition:"transform .25s ease, box-shadow .25s ease", boxShadow:"0 1px 3px rgba(15,23,42,.05), 0 8px 24px -16px rgba(15,23,42,.12)" },
  cardStripe:  { position:"absolute", left:0, right:0, top:0, height:4 },
  cardFooter:  { display:"flex", alignItems:"center", justifyContent:"space-between", borderTop:"1px solid #e2e8f0", padding:"10px 0 12px", marginTop:12, marginLeft:0, marginRight:0 },
  fabBadge:    { display:"inline-block", padding:"3px 9px", borderRadius:5, fontSize:".64rem", fontWeight:800, color:"#fff", alignSelf:"flex-start", letterSpacing:".06em", textTransform:"uppercase" },
  placa:       { fontWeight:700, fontSize:"1.5rem", color:"#1a3a5c", letterSpacing:".5px", marginTop:8, lineHeight:1.1 },
  // Stat cards (linha de estatística no topo)
  statsRow:    { padding:"18px 24px 0", display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12 },
  statCard:    { display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:14, background:"#fff", border:"1px solid #e2e8f0", boxShadow:"0 1px 3px rgba(15,23,42,.04), 0 6px 18px -10px rgba(15,23,42,.10)" },
  statIcon:    { width:44, height:44, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  statValue:   { fontWeight:700, fontSize:"1.7rem", color:"#1a3a5c", lineHeight:1, letterSpacing:"-.02em" },
  statLabel:   { fontSize:".7rem", color:"#64748b", fontWeight:600, marginTop:4 },
  modelo:      { fontSize:".82rem", color:"#64748b", fontWeight:500, marginTop:2 },
  motoristaNome:{ fontSize:".72rem", color:"#0369a1" },
  cardInfo:    { fontSize:".72rem", color:"var(--text-muted)" },
  cardInfoVal: { fontWeight:600, color:"var(--text)", fontFamily:"monospace" },
  secTitle:    { fontSize:".75rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".06em", paddingTop:8, borderTop:"1px solid var(--border)", marginTop:4 },
  carreta:     { fontSize:".72rem", color:"var(--text-muted)" },
  cap:         { fontSize:".72rem", color:"var(--text-muted)" },
  statusPill:  { display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, fontSize:".72rem", fontWeight:700 },
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
  lockBanner:  { background:"#fef2f2", color:"#dc2626", fontSize:".7rem", fontWeight:700, padding:"4px 8px", borderRadius:6, marginBottom:8, textAlign:"center", display:"inline-flex", alignItems:"center", gap:5, alignSelf:"flex-start" },
  lockBtn:     { border:"none", borderRadius:6, padding:"5px 7px", cursor:"pointer", lineHeight:1, display:"inline-flex", alignItems:"center", justifyContent:"center", transition:"background .15s, opacity .2s" },
};
