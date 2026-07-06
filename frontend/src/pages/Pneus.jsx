import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import LogoPontual from "../components/LogoPontual";
import { Package, MapPin, ClipboardCheck, RefreshCw, LayoutDashboard } from "lucide-react";
import { STATUS_PNEU } from "../pneus/esquemas";

// ── Estilos base compartilhados ───────────────────────────────────────
const s = {
  root: { minHeight: "100vh", background: "var(--bg)", fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#fff", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(15,23,42,.03)", position: "sticky", top: 0, zIndex: 5, flexWrap: "wrap", gap: 10 },
  headerLeft:  { display: "flex", alignItems: "center", gap: 14 },
  headerRight: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  backBtn: { padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #cbd5e1", color: "#475569", cursor: "pointer", fontWeight: 600, fontSize: ".82rem", fontFamily: "inherit" },
  navGroups: { display: "flex", gap: 6, background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "10px 20px", overflowX: "auto", flexWrap: "wrap", boxShadow: "0 1px 3px rgba(15,23,42,.03)" },
  navTab: (active) => ({
    padding: "8px 14px", border: "1px solid " + (active ? "#1a3a5c" : "transparent"), borderRadius: 10,
    background: active ? "#1a3a5c" : "transparent",
    color: active ? "#fff" : "#475569",
    cursor: "pointer", fontSize: ".84rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8,
    fontFamily: "inherit", whiteSpace: "nowrap", transition: "all .15s",
    boxShadow: active ? "0 4px 12px rgba(26,58,92,.25)" : "none",
  }),
  main: { padding: "20px", maxWidth: 1400, margin: "0 auto" },
  emptyBox: { background: "#fff", borderRadius: 12, padding: "3rem", textAlign: "center", color: "#94a3b8", boxShadow: "0 1px 3px rgba(15,23,42,.05)" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 },
  kpiCard: (bg, color) => ({ background: bg, borderRadius: 12, padding: "16px 18px", color, boxShadow: "0 1px 3px rgba(15,23,42,.05)" }),
  kpiLabel: { fontSize: ".72rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, opacity: 0.85, marginBottom: 6 },
  kpiValor: { fontSize: "1.5rem", fontWeight: 800, lineHeight: 1 },
};

const ABAS = [
  { id: "estoque",    label: "Estoque",     icon: Package,        accent: "#059669" },
  { id: "frota",      label: "Frota",       icon: MapPin,         accent: "#2563eb" },
  { id: "inspecao",   label: "Inspeção",    icon: ClipboardCheck, accent: "#7c3aed" },
  { id: "recapagem",  label: "Recapagem",   icon: RefreshCw,      accent: "#b45309" },
  { id: "dashboard",  label: "Dashboard",   icon: LayoutDashboard, accent: "#0891b2" },
];

export default function Pneus() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const abaUrl = searchParams.get("aba");
  const [aba, setAba] = useState(abaUrl && ABAS.some(a => a.id === abaUrl) ? abaUrl : "estoque");

  const [pneus, setPneus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "pneus"), orderBy("criadoEm", "desc"))).then(snap => {
      setPneus(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(e => console.warn("[pneus] falha ao carregar:", e))
      .finally(() => setLoading(false));
  }, []);

  const contadores = useMemo(() => ({
    total:      pneus.length,
    estoque:    pneus.filter(p => p.status === "estoque").length,
    em_uso:     pneus.filter(p => p.status === "em_uso").length,
    recapagem:  pneus.filter(p => p.status === "recapagem").length,
    sucata:     pneus.filter(p => p.status === "sucata").length,
    investido:  pneus.reduce((s, p) => s + (Number(p.custoAquisicao) || 0), 0),
  }), [pneus]);

  const fmtBRL = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div style={s.root}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <LogoPontual height={34} />
          <div>
            <h1 style={{ margin: 0, color: "#1a3a5c", fontSize: "1.15rem", fontWeight: 800 }}>Gestão de Pneus</h1>
            <p style={{ margin: 0, fontSize: ".72rem", color: "#64748b" }}>
              {loading ? "Carregando…" : `${contadores.total} pneu${contadores.total === 1 ? "" : "s"} cadastrado${contadores.total === 1 ? "" : "s"} · ${fmtBRL(contadores.investido)} investido`}
            </p>
          </div>
        </div>
        <div style={s.headerRight}>
          <button style={s.backBtn} onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>
      </header>

      {/* Navbar de abas */}
      <div style={s.navGroups} className="pneus-nav">
        {ABAS.map(a => {
          const Icon = a.icon;
          const active = aba === a.id;
          const style = { ...s.navTab(active), background: active ? a.accent : "transparent", borderColor: active ? a.accent : "transparent", boxShadow: active ? `0 4px 12px ${a.accent}40` : "none" };
          return (
            <button key={a.id} style={style} onClick={() => setAba(a.id)}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = a.accent; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; } }}>
              <Icon size={16} strokeWidth={2.2} />
              <span>{a.label}</span>
              {a.id === "estoque"   && contadores.estoque   > 0 && <PillCount cor="#059669" bg="rgba(255,255,255,.25)" active={active}>{contadores.estoque}</PillCount>}
              {a.id === "frota"     && contadores.em_uso    > 0 && <PillCount cor="#2563eb" bg="rgba(255,255,255,.25)" active={active}>{contadores.em_uso}</PillCount>}
              {a.id === "recapagem" && contadores.recapagem > 0 && <PillCount cor="#b45309" bg="rgba(255,255,255,.25)" active={active}>{contadores.recapagem}</PillCount>}
            </button>
          );
        })}
      </div>

      <main style={s.main}>
        {/* KPIs sempre visíveis no topo */}
        <div style={s.kpiGrid}>
          <div style={s.kpiCard("linear-gradient(135deg, #1a3a5c, #234775)", "#fff")}>
            <div style={s.kpiLabel}>Total de pneus</div>
            <div style={s.kpiValor}>{contadores.total}</div>
          </div>
          <div style={s.kpiCard("#dcfce7", "#14532d")}>
            <div style={{ ...s.kpiLabel, color: "#166534" }}>Em estoque</div>
            <div style={s.kpiValor}>{contadores.estoque}</div>
          </div>
          <div style={s.kpiCard("#dbeafe", "#0c4a6e")}>
            <div style={{ ...s.kpiLabel, color: "#0369a1" }}>Em uso na frota</div>
            <div style={s.kpiValor}>{contadores.em_uso}</div>
          </div>
          <div style={s.kpiCard("#fef3c7", "#78350f")}>
            <div style={{ ...s.kpiLabel, color: "#92400e" }}>Em recapagem</div>
            <div style={s.kpiValor}>{contadores.recapagem}</div>
          </div>
        </div>

        {/* Conteúdo por aba — placeholders serão substituídos nas próximas fases */}
        {aba === "estoque"   && <PlaceholderAba titulo="Estoque de pneus" desc="Cadastro de pneus (fogo, marca, medida, DOT, custo). Filtros por marca/medida. Instalar de aqui na aba Frota." fase="Fase 2" />}
        {aba === "frota"     && <PlaceholderAba titulo="Mapa da frota" desc="Escolha uma placa e visualize o esquema de posições. Clique em qualquer posição pra instalar, remover, rodizar ou enviar pra recapagem." fase="Fase 3" />}
        {aba === "inspecao"  && <PlaceholderAba titulo="Inspeção semanal (mobile)" desc="Otimizado pra celular. Escolhe veículo, mede sulco e pressão de cada posição, salva. Alerta automático em sulco < 3mm." fase="Fase 4" />}
        {aba === "recapagem" && <PlaceholderAba titulo="Recapagem" desc="Pneus que estão na recapadora. Envia com data e custo, recebe com nova vida e sulco atualizado." fase="Fase 5" />}
        {aba === "dashboard" && <PlaceholderAba titulo="Analytics de pneus" desc="CPK médio, custo por marca, ranking de fornecedores, top 10 pneus com pior CPK, sugestão de rodízio." fase="Fase 6" />}
      </main>
    </div>
  );
}

function PillCount({ children, cor, bg, active }) {
  return <span style={{ background: active ? "rgba(255,255,255,.22)" : bg, color: active ? "#fff" : cor, borderRadius: 20, padding: "1px 7px", fontSize: ".68rem", fontWeight: 800 }}>{children}</span>;
}

function PlaceholderAba({ titulo, desc, fase }) {
  return (
    <div style={s.emptyBox}>
      <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1a3a5c" }}>{titulo}</div>
      <p style={{ margin: "8px 0 4px", fontSize: ".88rem", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>{desc}</p>
      <div style={{ display: "inline-block", marginTop: 12, padding: "4px 12px", background: "#e0f2fe", color: "#075985", borderRadius: 20, fontSize: ".72rem", fontWeight: 700 }}>
        {fase} — em construção
      </div>
    </div>
  );
}
