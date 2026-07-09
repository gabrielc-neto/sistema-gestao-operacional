import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import LogoPontual from "../components/LogoPontual";
import { Package, MapPin, ClipboardCheck, RefreshCw, LayoutDashboard } from "lucide-react";
import { STATUS_PNEU } from "../pneus/esquemas";
import AbaEstoque from "../pneus/AbaEstoque";
import AbaFrota from "../pneus/AbaFrota";
import AbaInspecao from "../pneus/AbaInspecao";
import AbaRecapagem from "../pneus/AbaRecapagem";
import AbaDashboard from "../pneus/AbaDashboard";

// Normaliza nome pra comparação (case + espaço)
const normNome = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

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
  const [fornecedores, setFornecedores] = useState([]); // catálogo (reusa itens_manutencao tipo=fornecedor)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tempo real (onSnapshot) — instalação/remoção/rodízio em outra máquina
    // atualiza automaticamente essa tela.
    let carregouPneus = false, carregouForn = false;
    const marcaOk = () => { if (carregouPneus && carregouForn) setLoading(false); };
    const unsubPneus = onSnapshot(
      query(collection(db, "pneus"), orderBy("criadoEm", "desc")),
      snap => {
        setPneus(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        carregouPneus = true; marcaOk();
      },
      err => { console.warn("pneus onSnapshot:", err); carregouPneus = true; marcaOk(); }
    );
    const unsubItens = onSnapshot(
      collection(db, "itens_manutencao"),
      snap => {
        const forn = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(i => i.tipo === "fornecedor")
          .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        setFornecedores(forn);
        carregouForn = true; marcaOk();
      },
      err => { console.warn("itens_manutencao onSnapshot:", err); carregouForn = true; marcaOk(); }
    );
    return () => {
      try { unsubPneus(); } catch {}
      try { unsubItens(); } catch {}
    };
  }, []);

  // Helper: garante fornecedor no catálogo (cria se novo; atualiza CNPJ se antes vazio)
  const garantirFornecedor = useCallback(async (nome, cnpj) => {
    const nm = (nome || "").trim();
    if (!nm) return;
    const existente = fornecedores.find(f => normNome(f.nome) === normNome(nm));
    if (existente) {
      if (cnpj && !existente.cnpj) {
        try {
          await updateDoc(doc(db, "itens_manutencao", existente.id), { cnpj });
          setFornecedores(prev => prev.map(f => f.id === existente.id ? { ...f, cnpj } : f));
        } catch (e) { console.warn("[fornecedores] falha update cnpj:", e); }
      }
      return;
    }
    try {
      const payload = { tipo: "fornecedor", nome: nm, criadoEm: new Date().toISOString(), criadoPor: quemSou() };
      if (cnpj) payload.cnpj = cnpj;
      const ref = await addDoc(collection(db, "itens_manutencao"), payload);
      setFornecedores(prev => [...prev, { id: ref.id, ...payload }].sort((a, b) => (a.nome || "").localeCompare(b.nome || "")));
    } catch (e) { console.warn("[fornecedores] falha cadastro:", e); }
  }, [fornecedores]); // eslint-disable-line react-hooks/exhaustive-deps

  const quemSou = () => profile?.email || profile?.nome || "—";

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
        {aba === "estoque"   && <AbaEstoque pneus={pneus} setPneus={setPneus} fornecedores={fornecedores} garantirFornecedor={garantirFornecedor} quemSou={quemSou} />}
        {aba === "frota"     && <AbaFrota pneus={pneus} setPneus={setPneus} profile={profile} />}
        {aba === "inspecao"  && <AbaInspecao pneus={pneus} setPneus={setPneus} profile={profile} />}
        {aba === "recapagem" && <AbaRecapagem pneus={pneus} setPneus={setPneus} fornecedores={fornecedores} garantirFornecedor={garantirFornecedor} quemSou={quemSou} />}
        {aba === "dashboard" && <AbaDashboard pneus={pneus} />}
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
