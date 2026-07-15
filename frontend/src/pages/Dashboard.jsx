import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { useNavigate } from "react-router-dom";
import SettingsMenu from "../components/SettingsMenu";
import LogoPontual from "../components/LogoPontual";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import {
  Truck, Link2, ClipboardList, Users, Wrench,
  History, Palmtree, MapPin, UserCog, ShieldCheck,
  Lock, AlertTriangle, ChevronRight, Building2, Briefcase, Clock,
  CircleDot, Fuel, Route, Star,
} from "lucide-react";
import { useRBAC } from "../rbac/RBACContext";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function dataHoje() { return new Date().toISOString().split("T")[0]; }

function fmtData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function calcManuStatus(vencStr) {
  if (!vencStr) return "ok";
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const venc  = new Date(vencStr + "T00:00:00");
  const diff  = Math.ceil((venc - hoje) / 86400000);
  if (diff < 0)   return "vencido";
  if (diff <= 30) return "alerta";
  return "ok";
}


const ROLE_LABEL = {
  master:"Administrador", admin:"Administrador", diretor:"Diretor",
  superintendente:"Superintendente", gestao:"Gestão", logistica:"Logística",
  comercial:"Comercial", faturamento:"Faturamento", rh:"RH", motorista:"Motorista",
};
const ROLE_COLOR = {
  master:"#1a3a5c", admin:"#1a3a5c", diretor:"#7c3aed", superintendente:"#6d28d9",
  gestao:"#0369a1", logistica:"#0e7490", comercial:"#b45309",
  faturamento:"#be185d", rh:"#15803d", motorista:"#166534",
};

/* ─── KPI Card ────────────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, color, bg, label, value, sub, alert, onClick }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={{
        background: alert ? "#fff5f5" : "var(--card-bg)",
        borderRadius: 14,
        padding: "20px 22px",
        border: `1px solid ${alert ? "#fca5a5" : "var(--border)"}`,
        borderLeft: `4px solid ${alert ? "#dc2626" : color}`,
        display: "flex", flexDirection: "column", gap: 6,
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow .15s",
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.06)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} color={color} strokeWidth={2} />
        </div>
        {alert && <AlertTriangle size={16} color="#dc2626" />}
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text)", lineHeight: 1, marginTop: 4 }}>
        {value ?? "…"}
      </div>
      <div style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>{label}</div>
      {sub && <div style={{ fontSize: ".72rem", color: alert ? "#dc2626" : "#94a3b8", fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

/* ─── Módulo Card ─────────────────────────────────────────────────────────── */
function ModuloCard({ Icon, color, bg, label, desc, stat, statAlert, link, onClick }) {
  return (
    <div
      onClick={onClick}
      role={link ? "button" : undefined}
      tabIndex={link ? 0 : undefined}
      onKeyDown={link ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={{
        background: "var(--card-bg)",
        borderRadius: 14,
        padding: "18px 20px",
        border: "1px solid var(--border)",
        display: "flex", flexDirection: "column", gap: 10,
        cursor: link ? "pointer" : "default",
        opacity: link ? 1 : .55,
        transition: "all .15s",
        boxShadow: "0 1px 4px rgba(0,0,0,.05)",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => { if (link) { e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,.1)"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.05)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "0 14px 0 80px", background: bg, opacity: .5 }} />
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={22} color={color} strokeWidth={1.8} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: ".95rem", color: "var(--text)" }}>{label}</div>
        <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: 2 }}>{desc}</div>
      </div>
      {stat && (
        <div style={{ fontSize: ".75rem", fontWeight: 700, color: statAlert ? "#dc2626" : color, background: statAlert ? "#fef2f2" : bg, padding: "3px 10px", borderRadius: 20, alignSelf: "flex-start" }}>
          {stat}
        </div>
      )}
      {link && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: color, fontSize: ".75rem", fontWeight: 700, marginTop: "auto" }}>
          Abrir <ChevronRight size={14} />
        </div>
      )}
      {!link && (
        <div style={{ fontSize: ".72rem", color: "#94a3b8", fontWeight: 600 }}>Em breve</div>
      )}
    </div>
  );
}

/* ─── Dashboard ───────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user, profile } = useAuth();
  const { canView, isAdmin } = usePermissions();
  const { temPermissao } = useRBAC();
  const navigate = useNavigate();

  const [kpi,       setKpi]       = useState({});
  const [recentOCs, setRecentOCs] = useState([]);
  const [recentOS,  setRecentOS]  = useState([]);
  const [erro,      setErro]      = useState(false);

  useEffect(() => {
    function fetchDados() {
      const hoje = dataHoje();
      const now  = new Date(); now.setHours(0, 0, 0, 0);
      const merge = patch => setKpi(prev => ({ ...prev, ...patch }));
      const falhas = { v:false, m:false, f:false, oc:false, manu:false, os:false };
      const marcarErro = () => setErro(falhas.v && falhas.m && falhas.f && falhas.oc && falhas.manu && falhas.os);

      // Cada query atualiza sua fatia assim que volta — UI pinta em ondas.
      getDocs(collection(db, "veiculos")).then(snap => {
        const veiculos = snap.docs.map(d => d.data());
        merge({
          frotaAtiva: veiculos.filter(v => ["ativo","disponivel"].includes(v.status) && v.tipo !== "carreta").length,
          totalFrota: veiculos.filter(v => v.tipo !== "carreta").length,
          bloqueados: veiculos.filter(v => v.bloqueio?.ativo && v.tipo !== "carreta").length,
        });
      }).catch(() => { falhas.v = true; marcarErro(); });

      getDocs(collection(db, "motoristas")).then(snap => {
        merge({ mAtivos: snap.docs.map(d => d.data()).filter(m => m.status === "ativo").length });
      }).catch(() => { falhas.m = true; marcarErro(); });

      getDocs(collection(db, "ferias")).then(snap => {
        const emFerias = snap.docs.map(d => d.data()).filter(f => {
          if (!f.inicio || !f.fim) return false;
          const ini = new Date(f.inicio + "T00:00:00");
          const fim = new Date(f.fim   + "T00:00:00");
          return now >= ini && now <= fim;
        }).length;
        merge({ emFerias });
      }).catch(() => { falhas.f = true; marcarErro(); });

      getDocs(query(collection(db, "ordens_carregamento"), orderBy("data", "desc"), limit(5))).then(snap => {
        const ocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        merge({ ocsHoje: ocs.filter(o => o.data === hoje).length, totalOCs: ocs.length });
        setRecentOCs(ocs.slice(0, 5));
      }).catch(() => { falhas.oc = true; marcarErro(); });

      getDocs(collection(db, "manutencoes")).then(snap => {
        const manus = snap.docs.map(d => d.data());
        merge({
          manuPend: manus.filter(r => ["vencido","alerta"].includes(calcManuStatus(r.venc))).length,
          manuVenc: manus.filter(r => calcManuStatus(r.venc) === "vencido").length,
        });
      }).catch(() => { falhas.manu = true; marcarErro(); });

      // Puxa 20 mais recentes e filtra client-side pra pegar só ABERTAS (5 primeiras)
      getDocs(query(collection(db, "ordens_servico"), orderBy("criadoEm", "desc"), limit(20))).then(snap => {
        const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const abertas = todas.filter(o => o.status !== "finalizada" && o.status !== "cancelada").slice(0, 5);
        setRecentOS(abertas);
      }).catch(() => { falhas.os = true; marcarErro(); });
    }

    let interval = null;
    const start = () => { if (!interval) interval = setInterval(fetchDados, 60_000); };
    const stop  = () => { if (interval) { clearInterval(interval); interval = null; } };
    const onVisible = () => {
      if (document.visibilityState === "visible") { fetchDados(); start(); }
      else stop();
    };

    fetchDados();
    start();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      stop();
    };
  }, []);

  const role      = profile?.role || "visualizador";
  const roleLabel = ROLE_LABEL[role] || role;
  const roleColor = ROLE_COLOR[role] || "#64748b";

  const MODULES = useMemo(() => [
    { Icon:Truck,         color:"#2563eb", bg:"#dbeafe", label:"Frota",                  desc:"Gestão de veículos e bloqueios",    module:"frota",       link:"/frota",
      stat: kpi.frotaAtiva != null ? `${kpi.frotaAtiva} ativos${kpi.bloqueados > 0 ? ` · ${kpi.bloqueados} bloqueados` : ""}` : null,
      statAlert: kpi.bloqueados > 0 },
    { Icon:Link2,         color:"#7c3aed", bg:"#ede9fe", label:"Atrelamento",             desc:"Conjuntos cavalo + carreta",         module:"atrelamento", link:"/atrelamento", stat: null },
    { Icon:ClipboardList, color:"#d97706", bg:"#fef3c7", label:"Ordens de Carregamento",  desc:"Emitir e controlar OCs",             module:"oc",          link:"/oc",
      stat: kpi.ocsHoje != null ? `${kpi.ocsHoje} hoje · ${kpi.totalOCs} total` : null },
    { Icon:Users,         color:"#059669", bg:"#d1fae5", label:"Motoristas",              desc:"Cadastro, CNH e documentos",         module:"motoristas",  link:"/motoristas",
      stat: kpi.mAtivos != null ? `${kpi.mAtivos} ativos${kpi.emFerias > 0 ? ` · ${kpi.emFerias} em férias` : ""}` : null },
    { Icon:CircleDot,     color:"#0f172a", bg:"#e2e8f0", label:"Gestão de Pneus",         desc:"Estoque, mapa por posição e CPK",    module:"pneus",       link:"/pneus",         stat: null },
    { Icon:Wrench,        color:"#dc2626", bg:"#fee2e2", label:"Manutenção",              desc:"Vencimentos e revisões",             module:"manutencao",  link:"/manutencao",
      stat: kpi.manuPend != null ? (kpi.manuVenc > 0 ? `${kpi.manuVenc} vencidos · ${kpi.manuPend} pendentes` : kpi.manuPend > 0 ? `${kpi.manuPend} em alerta` : "Tudo em dia") : null,
      statAlert: kpi.manuVenc > 0 },
    { Icon:Fuel,          color:"#4338ca", bg:"#eef2ff", label:"Abastecimento",           desc:"CTA Smart · CPK real",               module:"manutencao",  link:"/abastecimento", stat: null },
    { Icon:Route,         color:"#0f766e", bg:"#ecfdf5", label:"Rotas & Distâncias",      desc:"OSM + OSRM · custo estimado",        module:"manutencao",  link:"/rotas",         stat: null },
    { Icon:Star,          color:"#0f766e", bg:"#ecfdf5", label:"Locais Favoritos",        desc:"Pátio, filiais, clientes, postos",   module:"manutencao",  link:"/locais",        stat: null },
    { Icon:History,       color:"#7c3aed", bg:"#f3e8ff", label:"Histórico",              desc:"Registro de todas as operações",     module:"historico",   link:"/historico", stat: null },
    { Icon:Palmtree,      color:"#0891b2", bg:"#cffafe", label:"Férias",                 desc:"Controle e alertas eSocial",         module:"ferias",      link:"/ferias",
      stat: kpi.emFerias > 0 ? `${kpi.emFerias} em férias hoje` : null },
    { Icon:MapPin,        color:"#ea580c", bg:"#ffedd5", label:"Rastreamento",           desc:"Posição em tempo real (SASCAR)",     module:null,          link:"/rastreamento",  stat: null },
    { Icon:Clock,         color:"#1d4ed8", bg:"#dbeafe", label:"Jornada & Extras",        desc:"Lei 13.103 + CLT (tablet SasMDT)",   module:null,          link:"/jornada",       stat: null },
    { Icon:Building2,     color:"#0891b2", bg:"#cffafe", label:"Setores",                desc:"Departamentos da empresa",           module:null,          link:"/admin/setores", perm:"setores.ver", stat: null },
    { Icon:Briefcase,     color:"#9333ea", bg:"#f3e8ff", label:"Cargos & Permissões",    desc:"Funções e seus acessos",             module:null,          link:"/admin/cargos",  perm:"cargos.ver", stat: null },
    { Icon:UserCog,       color:"#475569", bg:"#f1f5f9", label:"Usuários",               desc:"Contas e acessos",                   module:null,          link:"/usuarios",      perm:"usuarios.ver", stat: null },
    { Icon:ShieldCheck,   color:"#0f766e", bg:"#ccfbf1", label:"Permissões (legado)",    desc:"Matriz antiga role × módulo",        module:null,          link:"/permissoes",    perm:"permissoes.ver", stat: null },
  ], [kpi]);

  const visibleModules = useMemo(() =>
    MODULES.filter(m => {
      if (m.perm)   return temPermissao(m.perm);
      if (m.module) return canView(m.module);
      return isAdmin;
    }),
    [MODULES, isAdmin, canView, temPermissao]
  );

  const agora = new Date();
  const dataFmt = agora.toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long" });

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", fontFamily:"system-ui, sans-serif" }}>

      {/* HEADER */}
      <header style={st.header} className="pg-header">
        <div style={{ display:"flex", alignItems:"center", gap:14 }} className="pg-logo">
          <LogoPontual height={42} variant="white" />
          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
            <span style={{ color:"#fff", fontWeight:800, fontSize:"1rem", letterSpacing:.3 }}>PONTUAL LOGÍSTICA</span>
            <span style={{ color:"rgba(255,255,255,.55)", fontSize:".7rem", fontWeight:500 }}>Sistema de Gestão Operacional</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }} className="pg-header-actions">
          <div style={{ textAlign:"right" }} className="hide-mobile">
            <div style={{ color:"#fff", fontSize:".85rem", fontWeight:600 }}>{profile?.nome || user?.email}</div>
            <div style={{ color:"rgba(255,255,255,.6)", fontSize:".7rem" }}>
              <span style={{ background: roleColor, borderRadius:4, padding:"1px 7px", fontSize:".65rem", fontWeight:700, marginRight:6 }}>{roleLabel}</span>
              {dataFmt}
            </div>
          </div>
          <SettingsMenu />
        </div>
      </header>

      <div style={{ maxWidth:1400, margin:"0 auto", padding:"28px 24px" }} className="pg-body">

        {erro && (
          <div role="alert" style={{ display:"flex", alignItems:"center", gap:8, background:"#fef2f2", border:"1px solid #fca5a5", color:"#b91c1c", borderRadius:10, padding:"10px 14px", marginBottom:20, fontSize:".82rem", fontWeight:600 }}>
            <AlertTriangle size={16} /> Não foi possível carregar os dados. Verifique a conexão e tente novamente.
          </div>
        )}

        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14, marginBottom:28 }} className="dash-kpi">
          <KpiCard icon={Truck}         color="#2563eb" bg="#dbeafe" label="Frota Ativa"            value={kpi.frotaAtiva ?? "…"} sub={kpi.totalFrota != null ? `de ${kpi.totalFrota} cavalos` : null} onClick={() => navigate("/frota")} />
          <KpiCard icon={Lock}          color="#dc2626" bg="#fee2e2" label="Bloqueados"              value={kpi.bloqueados ?? "…"} alert={kpi.bloqueados > 0} sub={kpi.bloqueados == null ? null : kpi.bloqueados > 0 ? "Requer atenção" : "Nenhum"} onClick={() => navigate("/frota")} />
          <KpiCard icon={Users}         color="#059669" bg="#d1fae5" label="Motoristas Ativos"       value={kpi.mAtivos ?? "…"}   sub={kpi.emFerias == null ? null : kpi.emFerias > 0 ? `${kpi.emFerias} em férias` : "Sem férias hoje"} onClick={() => navigate("/motoristas")} />
          <KpiCard icon={ClipboardList} color="#d97706" bg="#fef3c7" label="OCs Hoje"                value={kpi.ocsHoje ?? "…"}   sub={kpi.totalOCs != null ? `${kpi.totalOCs} total` : null} onClick={() => navigate("/oc")} />
          <KpiCard icon={Palmtree}      color="#0891b2" bg="#cffafe" label="Em Férias Hoje"          value={kpi.emFerias ?? "…"}  sub={null} onClick={() => navigate("/ferias")} />
          <KpiCard icon={Wrench}        color={kpi.manuVenc > 0 ? "#dc2626" : "#f59e0b"} bg={kpi.manuVenc > 0 ? "#fee2e2" : "#fef3c7"} label="Manutenções Pendentes" value={kpi.manuPend ?? "…"} alert={kpi.manuVenc > 0} sub={kpi.manuVenc == null ? null : kpi.manuVenc > 0 ? `${kpi.manuVenc} vencida${kpi.manuVenc > 1 ? "s" : ""}` : "Sem vencidos"} onClick={() => navigate("/manutencao")} />
        </div>

        {/* Últimas OCs + Últimas OS lado a lado */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(420px,1fr))", gap:14, marginBottom:28 }}>
          <div style={st.panel}>
            <div style={st.panelHeader}>
              <ClipboardList size={16} color="#d97706" />
              <span style={st.panelTitle}>Últimas Ordens de Carregamento</span>
              <button style={st.panelLink} onClick={() => navigate("/oc")}>Ver todas →</button>
            </div>
            {recentOCs.length === 0 ? (
              <div style={st.emptyMsg}>Nenhuma OC registrada</div>
            ) : (
              <div className="dash-table-wrap">
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".78rem", minWidth:420 }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    {["Nº","Data","Cavalo","Motorista","Base"].map(h => (
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:"#64748b", fontSize:".7rem", textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOCs.map((oc, i) => (
                    <tr key={oc.id} style={{ borderTop:"1px solid var(--border)", background: i % 2 === 0 ? "var(--card-bg)" : "#f8fafc" }}>
                      <td style={{ padding:"9px 12px", fontWeight:800, color:"#1a3a5c" }}>{oc.num}</td>
                      <td style={{ padding:"9px 12px", color:"var(--text-muted)" }}>{fmtData(oc.data)}</td>
                      <td style={{ padding:"9px 12px", fontWeight:600 }}>{oc.cavaloPlaca || "—"}</td>
                      <td style={{ padding:"9px 12px", color:"var(--text-muted)", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{oc.motoristaNome || "—"}</td>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ background: oc.base === "REPLAN" ? "#dcfce7" : "#dbeafe", color: oc.base === "REPLAN" ? "#15803d" : "#1d4ed8", borderRadius:4, padding:"2px 7px", fontWeight:700, fontSize:".68rem" }}>
                          {oc.base || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

          <div style={st.panel}>
            <div style={st.panelHeader}>
              <Wrench size={16} color="#dc2626" />
              <span style={st.panelTitle}>
                Ordens de Serviço abertas
                {recentOS.length > 0 && <span style={{ marginLeft: 8, background: "#fee2e2", color: "#b91c1c", borderRadius: 20, padding: "2px 8px", fontSize: ".68rem", fontWeight: 800 }}>{recentOS.length}</span>}
              </span>
              <button style={st.panelLink} onClick={() => navigate("/manutencao?aba=os")}>Ver todas →</button>
            </div>
            {recentOS.length === 0 ? (
              <div style={st.emptyMsg}>Nenhuma OS aberta 🎉</div>
            ) : (
              <div className="dash-table-wrap">
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".78rem", minWidth:420 }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    {["Nº","Data","Placa","Motorista","Status"].map(h => (
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:"#64748b", fontSize:".7rem", textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOS.map((os, i) => {
                    const stCfg = os.status === "finalizada" ? { bg:"#dcfce7", fg:"#15803d", label:"Concluída" }
                                : os.status === "cancelada" ? { bg:"#f1f5f9", fg:"#475569", label:"Cancelada" }
                                : { bg:"#fef3c7", fg:"#b45309", label:"Aberta" };
                    return (
                      <tr key={os.id} style={{ borderTop:"1px solid var(--border)", background: i % 2 === 0 ? "var(--card-bg)" : "#f8fafc" }}>
                        <td style={{ padding:"9px 12px", fontWeight:800, color:"#1a3a5c" }}>{os.numero || "—"}</td>
                        <td style={{ padding:"9px 12px", color:"var(--text-muted)" }}>{fmtData(os.dataHora || os.criadoEm)}</td>
                        <td style={{ padding:"9px 12px", fontWeight:600 }}>{os.placa || "—"}</td>
                        <td style={{ padding:"9px 12px", color:"var(--text-muted)", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{os.motoristaNome || "—"}</td>
                        <td style={{ padding:"9px 12px" }}>
                          <span style={{ background: stCfg.bg, color: stCfg.fg, borderRadius:4, padding:"2px 7px", fontWeight:700, fontSize:".68rem" }}>
                            {stCfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>

        {/* MÓDULOS */}
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ height:2, width:24, background:"#1a3a5c", borderRadius:2 }} />
            <span style={{ fontWeight:800, fontSize:".8rem", letterSpacing:".1em", textTransform:"uppercase", color:"#64748b" }}>Módulos do Sistema</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14 }} className="dash-modules">
            {visibleModules.map((m) => (
              <ModuloCard
                key={m.label}
                Icon={m.Icon}
                color={m.color}
                bg={m.bg}
                label={m.label}
                desc={m.desc}
                stat={m.stat}
                statAlert={m.statAlert}
                link={m.link}
                onClick={() => m.link && navigate(m.link)}
              />
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

const st = {
  header: {
    background:"#1a3a5c",
    borderBottom:"4px solid transparent",
    borderImage:"linear-gradient(90deg,#3d6b47,#6aaa5e,#b5d947,#f5c318,#f0a500) 1",
    padding:"12px 28px",
    display:"flex", alignItems:"center", justifyContent:"space-between",
    boxShadow:"0 2px 12px rgba(0,0,0,.2)",
    position:"sticky", top:0, zIndex:100,
  },
  panel: {
    background:"var(--card-bg)",
    borderRadius:14,
    border:"1px solid var(--border)",
    overflow:"hidden",
    boxShadow:"0 1px 4px rgba(0,0,0,.06)",
  },
  panelHeader: {
    display:"flex", alignItems:"center", gap:8,
    padding:"14px 16px",
    borderBottom:"1px solid var(--border)",
    background:"var(--card-bg)",
  },
  panelTitle: { fontWeight:700, fontSize:".88rem", color:"var(--text)", flex:1 },
  panelLink:  { background:"none", border:"none", color:"#2563eb", fontSize:".75rem", fontWeight:700, cursor:"pointer", padding:0 },
  emptyMsg:   { padding:"28px 16px", textAlign:"center", color:"#94a3b8", fontSize:".82rem" },
};
