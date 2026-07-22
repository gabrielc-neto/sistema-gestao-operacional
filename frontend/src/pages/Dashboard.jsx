import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LogoPontual from "../components/LogoPontual";
import MenuNavegacao from "../components/MenuNavegacao";
import MapaFrota from "../components/MapaFrota";
import GraficoEvolucaoCustos from "../components/GraficoEvolucaoCustos";
import { useSascarPosicoes } from "../hooks/useSascarPosicoes";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import { ClipboardList, Wrench, MapPin, Navigation, AlertTriangle, Activity, Truck, CheckCircle2, Lock, WifiOff } from "lucide-react";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function fmtData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const ROLE_LABEL = {
  master:"Administrador", admin:"Administrador", diretor:"Diretor",
  superintendente:"Superintendente", gestao:"Gestão", logistica:"Logística",
  comercial:"Comercial", faturamento:"Faturamento", rh:"RH", motorista:"Motorista",
};

/* ─── Donut (gráfico SVG, sem dependências) ───────────────────────────────── */
function Donut({ segments, size = 148, stroke = 20 }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {total > 0 && segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
              strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} strokeLinecap="butt" />
          );
          acc += len;
          return el;
        })}
      </g>
    </svg>
  );
}

/* ─── KPI de topo (mesma linguagem visual dos cards do sistema) ───────────── */
function KpiTile({ Icon, label, value, cor, bg, sub, alerta, total, onClick, ativo }) {
  // Bullet chart: se total > 0, mostra barra de progresso value/total (padrão dashboard denso - ui-ux-pro-max)
  const temBullet = Number.isFinite(total) && total > 0 && Number.isFinite(value);
  const pct = temBullet ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  const clickable = typeof onClick === "function";
  // Borda destacada quando ativo (filtro aplicado) — usa a cor do próprio KPI
  const borderColor = ativo ? cor : (alerta ? "var(--warning-border)" : "var(--border)");
  const borderWidth = ativo ? 2 : 1;
  return (
    <div
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={clickable ? ativo : undefined}
      title={clickable ? (ativo ? `Remover filtro "${label}"` : `Filtrar por ${label}`) : undefined}
      style={{
        background:"var(--card-bg)",
        border:`${borderWidth}px solid ${borderColor}`,
        borderRadius:"var(--r-lg)",
        boxShadow: ativo ? "0 0 0 3px " + bg : "var(--sh-sm)",
        padding: ativo ? `${13-(borderWidth-1)}px ${15-(borderWidth-1)}px` : "14px 16px",
        display:"flex", alignItems:"center", gap:12, minWidth:0,
        cursor: clickable ? "pointer" : "default",
        transition:"transform .15s ease, box-shadow .15s ease, border-color .15s ease",
      }}
      onMouseEnter={clickable ? (e) => { e.currentTarget.style.transform = "translateY(-1px)"; } : undefined}
      onMouseLeave={clickable ? (e) => { e.currentTarget.style.transform = "translateY(0)"; } : undefined}
    >
      <div style={{ width:40, height:40, borderRadius:10, background:bg, color:cor, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon size={20} />
      </div>
      <div style={{ minWidth:0, flex:1 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
          <div className="kpi-value numero-tabular" style={{ fontSize:"1.5rem", fontWeight:800, color: alerta ? "var(--warning)" : "var(--text)", lineHeight:1 }}>{value}</div>
          {temBullet && <div className="numero-tabular" style={{ fontSize:".82rem", color:"var(--text-muted)", fontWeight:600 }}>/ {total}</div>}
        </div>
        <div style={{ fontSize:".72rem", color:"var(--text-muted)", fontWeight:600, marginTop:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {label}{sub ? <span style={{ color:"var(--text-subtle)", fontWeight:500 }}> · {sub}</span> : null}
        </div>
        {temBullet && (
          <div style={{ marginTop:6, height:4, background:"var(--border)", borderRadius:2, overflow:"hidden" }} role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax={total} aria-label={`${label}: ${value} de ${total}`}>
            <div style={{ width:`${pct}%`, height:"100%", background:cor, transition:"width .4s ease" }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Dashboard — visão geral (mapa + frota + históricos) ─────────────────── */
export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: sascar, error: sascarErro } = useSascarPosicoes();

  const [frota,     setFrota]     = useState({});
  const [recentOCs, setRecentOCs] = useState([]);
  const [recentOS,  setRecentOS]  = useState([]);
  const [erro,      setErro]      = useState(false);
  const [buscaMapa, setBuscaMapa] = useState(""); // busca no widget do mapa
  const [filtroStatus, setFiltroStatus] = useState(null); // null | 'EM_MOVIMENTO' | 'SEM_DADOS' | 'PARADO_LIGADO' | 'ESTACIONADO' — filtro clicando nos KPIs
  // Toggle: clicar de novo remove o filtro
  const toggleFiltro = (status) => setFiltroStatus(cur => cur === status ? null : status);

  useEffect(() => { document.title = "Gestão Operacional - Pontual Brasil Petróleo"; }, []);

  useEffect(() => {
    function fetchDados() {
      const falhas = { v:false, oc:false, os:false };
      const marcarErro = () => setErro(falhas.oc && falhas.os);

      getDocs(collection(db, "veiculos")).then(snap => {
        const veiculos = snap.docs.map(d => d.data());
        setFrota({
          frotaAtiva: veiculos.filter(v => ["ativo","disponivel"].includes(v.status) && v.tipo !== "carreta").length,
          totalFrota: veiculos.filter(v => v.tipo !== "carreta").length,
          bloqueados: veiculos.filter(v => v.bloqueio?.ativo && v.tipo !== "carreta").length,
        });
      }).catch(() => { falhas.v = true; });

      getDocs(query(collection(db, "ordens_carregamento"), orderBy("data", "desc"), limit(5)))
        .then(snap => setRecentOCs(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 5)))
        .catch(() => { falhas.oc = true; marcarErro(); });

      getDocs(query(collection(db, "ordens_servico"), orderBy("criadoEm", "desc"), limit(5)))
        .then(snap => setRecentOS(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        .catch(() => { falhas.os = true; marcarErro(); });
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
  const agora     = new Date();
  const dataFmt   = agora.toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long" });

  // ── Rastreamento (SASCAR) para o mapa embutido ──
  const posicoes = sascar?.posicoes ?? [];
  const emMovimento = useMemo(
    () => posicoes.filter(p => p.statusTexto === "EM_MOVIMENTO").length,
    [posicoes]
  );

  // ── Segmentos do gráfico de controle de frota ──
  const ativos = frota.frotaAtiva ?? 0;
  const bloq   = frota.bloqueados ?? 0;
  const outros = Math.max(0, (frota.totalFrota ?? 0) - ativos - bloq);
  const frotaSeg = [
    { label: "Ativos / Disponíveis", value: ativos, color: "var(--accent)" },
    { label: "Bloqueados",           value: bloq,   color: "var(--danger)" },
    { label: "Outros",               value: outros, color: "var(--chart-8)" },
  ];

  // ── Status da frota em tempo real (SASCAR) para os KPIs de topo ──
  const statusFrota = useMemo(() => {
    const c = { EM_MOVIMENTO: 0, PARADO_LIGADO: 0, ESTACIONADO: 0, SEM_DADOS: 0 };
    for (const p of posicoes) c[p.statusTexto] = (c[p.statusTexto] || 0) + 1;
    return c;
  }, [posicoes]);

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", fontFamily:"var(--font)" }}>

      {/* Mobile: mantém logo + menu na MESMA linha (evita quebra do pg-header-actions) */}
      <style>{`
        @media (max-width: 640px) {
          .pg-header.dash-header { flex-wrap: nowrap !important; }
          .dash-header .pg-header-actions { width: auto !important; margin-left: auto !important; justify-content: flex-end !important; }
        }
      `}</style>

      {/* HEADER */}
      <header style={st.header} className="pg-header dash-header">
        <div style={{ display:"flex", alignItems:"center", gap:14 }} className="pg-logo">
          <LogoPontual height={40} variant="white" />
          <div style={{ display:"flex", flexDirection:"column", gap:1 }} className="hide-mobile">
            <span style={{ color:"#fff", fontWeight:700, fontSize:"1rem", letterSpacing:"-0.01em" }}>Logística</span>
            <span style={{ color:"rgba(255,255,255,.6)", fontSize:".72rem", fontWeight:500 }}>Gestão Operacional</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginLeft:"auto" }} className="pg-header-actions">
          <div style={{ textAlign:"right" }} className="hide-mobile">
            <div style={{ color:"#fff", fontSize:".85rem", fontWeight:600 }}>{profile?.nome || user?.email}</div>
            <div style={{ color:"rgba(255,255,255,.6)", fontSize:".7rem" }}>
              <span style={{ background:"rgba(255,255,255,.14)", color:"#fff", borderRadius:5, padding:"1px 8px", fontSize:".65rem", fontWeight:700, marginRight:6 }}>{roleLabel}</span>
              {dataFmt}
            </div>
          </div>
          <MenuNavegacao />
        </div>
      </header>

      <div style={{ maxWidth:1400, margin:"0 auto", padding:"28px 24px" }} className="pg-body">

        {/* Título da visão geral */}
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:"1.35rem", fontWeight:700, color:"var(--text)", letterSpacing:"-0.02em", margin:0 }}>Visão Geral</h1>
          <p style={{ fontSize:".85rem", color:"var(--text-muted)", marginTop:4 }}>
            Olá, {profile?.nome?.split(" ")[0] || "usuário"} — rastreamento e histórico operacional em tempo real.
          </p>
        </div>

        {/* KPIs de topo — resumo da frota + rastreamento em tempo real */}
        <div className="dash-kpi" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))", gap:14, marginBottom:20 }}>
          <KpiTile Icon={Truck}        label="Frota total"       value={frota.totalFrota ?? "…"} cor="var(--accent)"  bg="var(--accent-soft)"
                   onClick={() => navigate("/frota")} />
          <KpiTile Icon={CheckCircle2} label="Disponíveis"       value={ativos}                   total={frota.totalFrota}  cor="var(--success)" bg="var(--success-bg)"
                   onClick={() => navigate("/frota?status=disponivel")} />
          <KpiTile Icon={Navigation}   label="Em movimento"      value={statusFrota.EM_MOVIMENTO} total={frota.totalFrota}  cor="#EA580C"        bg="#fff7ed" sub="tempo real"
                   onClick={() => toggleFiltro("EM_MOVIMENTO")} ativo={filtroStatus === "EM_MOVIMENTO"} />
          <KpiTile Icon={Lock}         label="Bloqueados"        value={bloq}                     total={frota.totalFrota}  cor="var(--danger)"  bg="var(--danger-bg)"
                   onClick={() => navigate("/frota?status=bloqueado")} />
          <KpiTile Icon={WifiOff}      label="Sem comunicação"   value={statusFrota.SEM_DADOS}    total={frota.totalFrota}  cor="var(--warning)" bg="var(--warning-bg)" alerta={statusFrota.SEM_DADOS > 0}
                   onClick={() => toggleFiltro("SEM_DADOS")} ativo={filtroStatus === "SEM_DADOS"} />
        </div>

        {/* Topo: Evolução de custos (esq) + Controle de Frota (dir) */}
        <div className="dash-grid-2" style={{ display:"grid", gridTemplateColumns:"1.7fr 1fr", gap:14, marginBottom:20, alignItems:"stretch" }}>
          {/* Resumo de evolução de custos mensais (módulo de manutenção) */}
          <GraficoEvolucaoCustos style={{ height:"100%" }} />

          {/* Controle de frota (gráfico) */}
          <div style={st.panel}>
            <div style={st.panelHeader}>
              <Activity size={16} color="var(--accent)" />
              <span style={st.panelTitle}>Controle de Frota</span>
              <button style={st.panelLink} onClick={() => navigate("/frota")}>Abrir →</button>
            </div>
            <div style={{ padding:"22px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
              <div style={{ position:"relative", width:148, height:148 }}>
                <Donut segments={frotaSeg} />
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:"1.9rem", fontWeight:800, color:"var(--text)", lineHeight:1 }}>{frota.totalFrota ?? "…"}</span>
                  <span style={{ fontSize:".68rem", color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" }}>cavalos</span>
                </div>
              </div>
              <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:9 }}>
                {frotaSeg.map(s => (
                  <div key={s.label} style={{ display:"flex", alignItems:"center", gap:10, fontSize:".82rem" }}>
                    <span style={{ width:10, height:10, borderRadius:3, background:s.color, flexShrink:0 }} />
                    <span style={{ color:"var(--text-muted)", flex:1 }}>{s.label}</span>
                    <span style={{ color:"var(--text)", fontWeight:700 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rastreamento em tempo real — bloco exclusivo, estendido (largura total) */}
        <div style={{ ...st.panel, marginBottom:20 }}>
          <div style={st.panelHeader}>
            <MapPin size={16} color="var(--accent)" />
            <span style={st.panelTitle}>Rastreamento em tempo real</span>
            <span style={st.chip}><Navigation size={11} /> {emMovimento} em movimento</span>
            {filtroStatus && (
              <button
                onClick={() => setFiltroStatus(null)}
                title="Remover filtro"
                style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#fff7ed", color:"#EA580C", border:"1px solid #fed7aa", borderRadius:999, padding:"3px 10px", fontSize:".72rem", fontWeight:700, cursor:"pointer" }}
              >
                Filtro: {filtroStatus === "EM_MOVIMENTO" ? "Em movimento" : filtroStatus === "SEM_DADOS" ? "Sem comunicação" : filtroStatus} ✕
              </button>
            )}
            <div className="dash-busca-mapa" style={{ display:"flex", alignItems:"center", gap:6, marginLeft:"auto", background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:8, padding:"4px 10px", minWidth:0, flex:"1 1 220px", maxWidth:320 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color:"var(--text-muted)", flexShrink:0 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={buscaMapa}
                onChange={(e) => setBuscaMapa(e.target.value)}
                placeholder="Buscar placa, motorista ou cidade"
                aria-label="Buscar veículo no mapa"
                style={{ border:"none", background:"transparent", outline:"none", color:"var(--text)", fontSize:".82rem", fontFamily:"inherit", flex:1, minWidth:0, width:"100%" }}
              />
              {buscaMapa && (
                <button onClick={() => setBuscaMapa("")} style={{ border:"none", background:"transparent", cursor:"pointer", color:"var(--text-muted)", fontSize:".9rem", padding:0, lineHeight:1, flexShrink:0 }} aria-label="Limpar busca">✕</button>
              )}
            </div>
            <button style={st.panelLink} onClick={() => navigate("/rastreamento")}>Abrir →</button>
          </div>
          {sascarErro ? (
            <div style={{ ...st.emptyMsg, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"40px 16px" }}>
              <AlertTriangle size={16} color="var(--danger)" /> Falha ao carregar posições SASCAR.
            </div>
          ) : (
            <MapaFrota
              posicoes={(() => {
                let filtradas = posicoes;
                if (filtroStatus) filtradas = filtradas.filter(p => p.statusTexto === filtroStatus);
                if (buscaMapa) {
                  const t = buscaMapa.trim().toUpperCase();
                  filtradas = filtradas.filter(p =>
                    (p.placa || "").toUpperCase().includes(t)
                    || (p.motorista || "").toUpperCase().includes(t)
                    || (p.cidade || "").toUpperCase().includes(t)
                  );
                }
                return filtradas;
              })()}
              focusPlaca={buscaMapa.trim().toUpperCase() || null}
              height={520}
            />
          )}
        </div>

        {erro && (
          <div role="alert" style={{ display:"flex", alignItems:"center", gap:8, background:"var(--danger-bg)", border:"1px solid var(--danger-border)", color:"var(--danger)", borderRadius:10, padding:"10px 14px", marginBottom:20, fontSize:".82rem", fontWeight:600 }}>
            <AlertTriangle size={16} /> Não foi possível carregar os históricos. Verifique a conexão e tente novamente.
          </div>
        )}

        {/* Últimas OCs + Últimas OS lado a lado */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(420px,1fr))", gap:14 }}>
          <div style={st.panel}>
            <div style={st.panelHeader}>
              <ClipboardList size={16} color="var(--accent)" />
              <span style={st.panelTitle}>Últimas Ordens de Carregamento</span>
              <button style={st.panelLink} onClick={() => navigate("/oc")}>Ver todas →</button>
            </div>
            {recentOCs.length === 0 ? (
              <div style={st.emptyMsg}>Nenhuma OC registrada</div>
            ) : (
              <div className="dash-table-wrap">
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".78rem", minWidth:420 }}>
                <thead>
                  <tr style={{ background:"var(--surface-2)" }}>
                    {["Nº","Data","Cavalo","Motorista","Base"].map(h => (
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:"var(--text-muted)", fontSize:".7rem", textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOCs.map((oc, i) => (
                    <tr key={oc.id} style={{ borderTop:"1px solid var(--border)", background: i % 2 === 0 ? "var(--card-bg)" : "var(--surface-2)" }}>
                      <td style={{ padding:"9px 12px", fontWeight:800, color:"var(--accent)" }}>{oc.num}</td>
                      <td style={{ padding:"9px 12px", color:"var(--text-muted)" }}>{fmtData(oc.data)}</td>
                      <td style={{ padding:"9px 12px", fontWeight:600 }}>{oc.cavaloPlaca || "—"}</td>
                      <td style={{ padding:"9px 12px", color:"var(--text-muted)", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{oc.motoristaNome || "—"}</td>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ background: oc.base === "REPLAN" ? "var(--success-bg)" : "var(--accent-soft)", color: oc.base === "REPLAN" ? "var(--success)" : "var(--accent)", borderRadius:4, padding:"2px 7px", fontWeight:700, fontSize:".68rem" }}>
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
              <Wrench size={16} color="var(--accent)" />
              <span style={st.panelTitle}>Últimas Ordens de Serviço</span>
              <button style={st.panelLink} onClick={() => navigate("/manutencao")}>Ver todas →</button>
            </div>
            {recentOS.length === 0 ? (
              <div style={st.emptyMsg}>Nenhuma OS registrada</div>
            ) : (
              <div className="dash-table-wrap">
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".78rem", minWidth:420 }}>
                <thead>
                  <tr style={{ background:"var(--surface-2)" }}>
                    {["Nº","Data","Placa","Motorista","Status"].map(h => (
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:"var(--text-muted)", fontSize:".7rem", textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOS.map((os, i) => {
                    const stCfg = os.status === "concluida" ? { bg:"var(--success-bg)", fg:"var(--success)", label:"Concluída" }
                                : os.status === "cancelada" ? { bg:"var(--surface-3)", fg:"var(--text-muted)", label:"Cancelada" }
                                : { bg:"var(--warning-bg)", fg:"var(--warning)", label:"Aberta" };
                    return (
                      <tr key={os.id} style={{ borderTop:"1px solid var(--border)", background: i % 2 === 0 ? "var(--card-bg)" : "var(--surface-2)" }}>
                        <td style={{ padding:"9px 12px", fontWeight:800, color:"var(--accent)" }}>{os.numero || "—"}</td>
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

      </div>

      <style>{`
        @media (max-width: 900px) {
          .dash-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const st = {
  header: {
    background:"var(--header-bg)",
    borderBottom:"1px solid var(--header-border)",
    padding:"14px 28px",
    display:"flex", alignItems:"center", gap:16,
    boxShadow:"var(--sh-md)",
    position:"sticky", top:0, zIndex:100,
  },
  panel: {
    background:"var(--card-bg)",
    borderRadius:"var(--r-lg)",
    border:"1px solid var(--border)",
    overflow:"hidden",
    boxShadow:"var(--sh-sm)",
  },
  panelHeader: {
    display:"flex", alignItems:"center", gap:8,
    padding:"14px 16px",
    borderBottom:"1px solid var(--border)",
    background:"var(--card-bg)",
    flexWrap:"wrap",  /* mobile: quebra pra próxima linha em vez de vazar */
  },
  panelTitle: { fontWeight:700, fontSize:".88rem", color:"var(--text)", flex:1, minWidth:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  panelLink:  { background:"none", border:"none", color:"var(--accent)", fontSize:".75rem", fontWeight:700, cursor:"pointer", padding:0, whiteSpace:"nowrap", flexShrink:0 },
  emptyMsg:   { padding:"28px 16px", textAlign:"center", color:"var(--text-subtle)", fontSize:".82rem" },
  chip: {
    display:"inline-flex", alignItems:"center", gap:4,
    background:"var(--tech-soft)", color:"var(--tech-text)", border:"1px solid var(--tech-border)",
    fontSize:".68rem", fontWeight:700, padding:"3px 9px", borderRadius:"var(--r-full)",
    whiteSpace:"nowrap",
  },
};
