import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, MapPin, AlertTriangle, Truck, Map as MapIcon, Table, Search, X, WifiOff, Bell, LogIn, LogOut, ChevronDown, ChevronUp } from "lucide-react";
import { useSascarPosicoes } from "../hooks/useSascarPosicoes";
import { useOcsAtivas } from "../hooks/useOcsAtivas";
import { useEventosCerca } from "../hooks/useEventosCerca";
import MapaFrota from "../components/MapaFrota";
import { capitalizarNome, tempoDecorrido } from "../utils/format";

const STATUS_STYLE = {
  EM_MOVIMENTO:   { bg: "#dcfce7", color: "#166534", label: "Em movimento" },
  PARADO_LIGADO:  { bg: "#fef9c3", color: "#854d0e", label: "Parado / ligado" },
  ESTACIONADO:    { bg: "#e2e8f0", color: "#334155", label: "Estacionado" },
  SEM_DADOS:      { bg: "#f1f5f9", color: "#64748b", label: "Sem comunicação" },
};

function StatusBadge({ s }) {
  const cfg = STATUS_STYLE[s] || { bg: "#f1f5f9", color: "#475569", label: s };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: 6,
      fontSize: ".72rem", fontWeight: 700, whiteSpace: "nowrap"
    }}>{cfg.label}</span>
  );
}

export default function Rastreamento() {
  const navigate = useNavigate();
  const { data, loading, error, lastFetch, refetch } = useSascarPosicoes();
  const { ocsPorPlaca } = useOcsAtivas();
  const { eventos: eventosCerca } = useEventosCerca({ horasAtras: 12, limite: 100 });
  const [view, setView] = useState("mapa"); // "mapa" | "tabela"
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState(null); // null | EM_MOVIMENTO | ...
  const [eventosAbertos, setEventosAbertos] = useState(false);

  // Tick a cada 30s pra "Sem comunicação" reagir mesmo quando SASCAR não retorna posições novas
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const posicoes = data?.posicoes ?? [];
  const counts = useMemo(() => {
    const c = { EM_MOVIMENTO: 0, PARADO_LIGADO: 0, ESTACIONADO: 0, SEM_DADOS: 0, SINAL_VELHO: 0 };
    for (const p of posicoes) {
      c[p.statusTexto] = (c[p.statusTexto] || 0) + 1;
      if (p.dataPosicao) {
        const ageMin = (nowMs - new Date(p.dataPosicao.replace("T", " ")).getTime()) / 60000;
        if (ageMin > 15 && p.statusTexto !== "SEM_DADOS") c.SINAL_VELHO++;
      }
    }
    return c;
  }, [posicoes, nowMs]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toUpperCase();
    return posicoes.filter(p => {
      // Filtro "Sem comunicação" cobre SEM_DADOS + sinal velho (>15 min sem posição)
      if (filtroStatus === "SEM_DADOS") {
        const sinalVelho = p.dataPosicao &&
          (nowMs - new Date(p.dataPosicao.replace("T", " ")).getTime()) / 60000 > 15;
        if (p.statusTexto !== "SEM_DADOS" && !sinalVelho) return false;
      } else if (filtroStatus && p.statusTexto !== filtroStatus) return false;
      if (termo) {
        const placa = (p.placa || "").toUpperCase();
        const cidade = (p.cidade || "").toUpperCase();
        const motorista = (p.motoristaLogado || "").toUpperCase();
        if (!placa.includes(termo) && !cidade.includes(termo) && !motorista.includes(termo)) return false;
      }
      return true;
    });
  }, [posicoes, busca, filtroStatus, nowMs]);

  const ordenadas = useMemo(
    () => [...filtradas].sort((a, b) => (a.placa || "").localeCompare(b.placa || "")),
    [filtradas]
  );

  return (
    <div className="r-page" style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "system-ui" }}>
      <div className="r-container" style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Header */}
        <div className="r-header">
          <div className="r-header-left">
            <button onClick={() => navigate("/dashboard")} style={btnGhost} className="r-back-btn">
              <ArrowLeft size={18} /> <span className="r-back-text">Dashboard</span>
            </button>
            <h1 className="r-title">
              <MapPin size={20} color="#ea580c" /> <span>Rastreamento</span>
            </h1>
            <button onClick={() => navigate("/cercas")} style={btnGhost} className="r-back-btn" title="Gerenciar cercas eletrônicas">
              Cercas
            </button>
          </div>
          <div className="r-header-right">
            <div style={{ display: "inline-flex", border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden" }}>
              <button onClick={() => setView("mapa")} style={view === "mapa" ? btnToggleOn : btnToggleOff}>
                <MapIcon size={14} /> Mapa
              </button>
              <button onClick={() => setView("tabela")} style={view === "tabela" ? btnToggleOn : btnToggleOff}>
                <Table size={14} /> Tabela
              </button>
            </div>
            <span className="r-update-text">
              {lastFetch ? `Atualizado ${lastFetch.toLocaleTimeString("pt-BR")}` : "Carregando..."}
              {data?.cache?.fresh === false && <span style={{ marginLeft: 6, color: "#94a3b8" }}>(cache)</span>}
            </span>
            <button onClick={refetch} disabled={loading} style={btnPrimary} className="r-refresh-btn">
              <RefreshCw size={16} className={loading ? "spin" : ""} /> <span className="r-refresh-text">Atualizar</span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} /> Erro ao consultar SASCAR: {error}
          </div>
        )}

        {/* KPIs — clicáveis pra filtrar */}
        <div className="r-kpis">
          <KPI Icon={Truck}   color="#166534" bg="#dcfce7" label="Em movimento"     value={counts.EM_MOVIMENTO}  active={filtroStatus === "EM_MOVIMENTO"}  onClick={() => setFiltroStatus(filtroStatus === "EM_MOVIMENTO" ? null : "EM_MOVIMENTO")} />
          <KPI Icon={Truck}   color="#854d0e" bg="#fef9c3" label="Parados / ligados" value={counts.PARADO_LIGADO} active={filtroStatus === "PARADO_LIGADO"} onClick={() => setFiltroStatus(filtroStatus === "PARADO_LIGADO" ? null : "PARADO_LIGADO")} />
          <KPI Icon={Truck}   color="#334155" bg="#e2e8f0" label="Estacionados"     value={counts.ESTACIONADO}   active={filtroStatus === "ESTACIONADO"}   onClick={() => setFiltroStatus(filtroStatus === "ESTACIONADO" ? null : "ESTACIONADO")} />
          <KPI Icon={WifiOff} color="#64748b" bg="#f1f5f9" label="Sem comunicação"  value={counts.SEM_DADOS + counts.SINAL_VELHO} active={filtroStatus === "SEM_DADOS"} onClick={() => setFiltroStatus(filtroStatus === "SEM_DADOS" ? null : "SEM_DADOS")} alert={(counts.SEM_DADOS + counts.SINAL_VELHO) > 0} />
        </div>

        {/* Busca */}
        <div className="r-search">
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Buscar placa, cidade ou motorista"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ flex: 1, border: "none", outline: "none", fontSize: ".95rem", color: "#1a3a5c", background: "transparent", minWidth: 0 }}
          />
          {(busca || filtroStatus) && (
            <button onClick={() => { setBusca(""); setFiltroStatus(null); }} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: ".82rem" }}>
              <X size={16} /> Limpar
            </button>
          )}
          <span style={{ color: "#94a3b8", fontSize: ".82rem", whiteSpace: "nowrap" }}>
            {filtradas.length} / {posicoes.length}
          </span>
        </div>

        {/* Eventos de cerca (colapsável) */}
        <EventosCercaPanel
          eventos={eventosCerca}
          aberto={eventosAbertos}
          onToggle={() => setEventosAbertos(v => !v)}
        />

        {/* Mapa */}
        {view === "mapa" && (
          <div className="r-mapa-wrap">
            <MapaFrota posicoes={filtradas} height="100%" focusPlaca={busca.trim().toUpperCase() || null} ocsPorPlaca={ocsPorPlaca} />
          </div>
        )}

        {/* Tabela */}
        {view === "tabela" && (
        <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <Th>Placa</Th>
                  <Th>Motorista</Th>
                  <Th>Status</Th>
                  <Th align="right">Velocidade</Th>
                  <Th>Cidade / UF</Th>
                  <Th>Endereço</Th>
                  <Th align="right">Última posição</Th>
                </tr>
              </thead>
              <tbody>
                {loading && posicoes.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Carregando posições da SASCAR...</td></tr>
                ) : ordenadas.length === 0 && !error ? (
                  <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Nenhuma posição retornada</td></tr>
                ) : ordenadas.map(p => (
                  <tr key={p.idVeiculo} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <Td><strong style={{ color: "#1a3a5c" }}>{p.placa || `id ${p.idVeiculo}`}</strong></Td>
                    <Td style={{ color: p.motoristaLogado ? "#1a3a5c" : "#94a3b8", fontSize: ".84rem", fontWeight: p.motoristaLogado ? 600 : 400 }}>
                      {p.motoristaLogado ? capitalizarNome(p.motoristaLogado) : "—"}
                    </Td>
                    <Td><StatusBadge s={p.statusTexto} /></Td>
                    <Td align="right">{p.velocidade ?? 0} km/h</Td>
                    <Td>{p.cidade}/{p.uf}</Td>
                    <Td style={{ color: "#475569", fontSize: ".82rem" }}>{p.rua || "—"}</Td>
                    <Td align="right" style={{ color: "#64748b", fontSize: ".82rem" }}>{tempoDecorrido(p.dataPosicao)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        <p style={{ marginTop: "1rem", color: "#94a3b8", fontSize: ".78rem", textAlign: "center" }}>
          Dados via SASCAR SasIntegra · atualização automática a cada 30s · cache servidor 30s
        </p>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

        .r-page { padding: 1.5rem; }
        .r-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .r-header-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .r-header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .r-title { margin: 0; color: #1a3a5c; font-size: 1.4rem; display: flex; align-items: center; gap: 8px; }
        .r-update-text { color: #64748b; font-size: .82rem; }

        .r-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 1rem; }
        .r-search { display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; background: #fff; padding: 0.5rem 0.75rem; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .r-mapa-wrap { height: 560px; }

        /* Tablet */
        @media (max-width: 900px) {
          .r-kpis { grid-template-columns: repeat(2, 1fr); }
        }

        /* Celular */
        @media (max-width: 640px) {
          .r-page { padding: .75rem; }
          .r-title { font-size: 1.1rem; }
          .r-title span { display: none; }
          .r-back-text, .r-refresh-text { display: none; }
          .r-update-text { font-size: .72rem; flex-basis: 100%; order: 99; text-align: center; }
          .r-kpis { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .r-mapa-wrap { height: 70vh; }
          /* Markers menores no celular pra não cobrir o mapa */
          .leaflet-marker-icon.truck-icon { transform-origin: center !important; }
          .truck-wrap { transform: scale(0.78); transform-origin: center 60%; }
          .truck-driver { max-width: 90px !important; }
        }

        /* Tabela: deixa rolar lateralmente no mobile */
        .r-page table { min-width: 700px; }
      `}</style>
    </div>
  );
}

function tempoRelativoMs(ms) {
  if (!Number.isFinite(ms)) return "—";
  const diff = Date.now() - ms;
  if (diff < 0) return "agora";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function EventosCercaPanel({ eventos, aberto, onToggle }) {
  const total = eventos.length;
  const ultima = eventos[0];

  return (
    <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "1rem", overflow: "hidden" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "0.6rem 0.9rem", background: "transparent", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <Bell size={16} color="#ea580c" />
        <strong style={{ color: "#1a3a5c", fontSize: ".9rem" }}>Eventos de cerca</strong>
        <span style={{ background: total > 0 ? "#fee2e2" : "#f1f5f9", color: total > 0 ? "#991b1b" : "#64748b", padding: "1px 8px", borderRadius: 10, fontSize: ".72rem", fontWeight: 700 }}>
          {total} {total === 1 ? "evento" : "eventos"} / 12h
        </span>
        {ultima && !aberto && (
          <span style={{ color: "#64748b", fontSize: ".78rem", marginLeft: "auto", marginRight: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50%" }}>
            último: {ultima.placa} {ultima.tipo === "ENTRADA" ? "entrou em" : "saiu de"} {ultima.cercaNome} · {tempoRelativoMs(ultima.criadoEmMs)} atrás
          </span>
        )}
        <span style={{ marginLeft: aberto ? "auto" : 0, color: "#64748b" }}>
          {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {aberto && (
        <div style={{ borderTop: "1px solid #e2e8f0", maxHeight: 320, overflowY: "auto" }}>
          {total === 0 && (
            <div style={{ padding: "1rem", color: "#94a3b8", fontSize: ".84rem", textAlign: "center" }}>
              Sem eventos de cerca nas últimas 12h.
            </div>
          )}
          {eventos.map(e => {
            const entrou = e.tipo === "ENTRADA";
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.55rem 0.9rem", borderBottom: "1px solid #f1f5f9", fontSize: ".84rem" }}>
                <span style={{
                  background: entrou ? "#dcfce7" : "#ffedd5",
                  color: entrou ? "#166534" : "#9a3412",
                  borderRadius: 6, padding: "2px 6px", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: ".72rem", flexShrink: 0
                }}>
                  {entrou ? <LogIn size={12} /> : <LogOut size={12} />}
                  {entrou ? "ENTRADA" : "SAÍDA"}
                </span>
                <strong style={{ color: "#1a3a5c", flexShrink: 0 }}>{e.placa}</strong>
                <span style={{ color: "#475569", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {entrou ? "entrou em" : "saiu de"} <strong>{e.cercaNome}</strong>
                  {e.cercaTipo ? <span style={{ color: "#94a3b8" }}> · {e.cercaTipo}</span> : null}
                </span>
                <span style={{ color: "#64748b", fontSize: ".74rem", flexShrink: 0 }}>{tempoRelativoMs(e.criadoEmMs)} atrás</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KPI({ Icon, color, bg, label, value, active, onClick, alert }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        padding: "0.9rem 1rem",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: active ? `0 0 0 2px ${color}` : alert ? "0 0 0 1px #f59e0b" : "0 1px 3px rgba(0,0,0,0.05)",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow .15s ease",
      }}
    >
      <div style={{ background: bg, width: 38, height: 38, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: ".74rem", color: "#64748b", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: alert ? "#b45309" : "#1a3a5c", lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}

const Th = ({ children, align }) => (
  <th style={{ textAlign: align || "left", padding: "0.7rem 0.9rem", fontSize: ".74rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" }}>{children}</th>
);
const Td = ({ children, align, style }) => (
  <td style={{ textAlign: align || "left", padding: "0.7rem 0.9rem", verticalAlign: "middle", ...(style || {}) }}>{children}</td>
);

const btnPrimary = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "0.5rem 0.9rem",
  background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: ".86rem"
};
const btnGhost = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "0.45rem 0.8rem",
  background: "transparent", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: ".84rem"
};
const btnToggleOn = {
  display: "inline-flex", alignItems: "center", gap: 5, padding: "0.42rem 0.75rem",
  background: "#1a3a5c", color: "#fff", border: "none", cursor: "pointer", fontSize: ".82rem", fontWeight: 600
};
const btnToggleOff = {
  display: "inline-flex", alignItems: "center", gap: 5, padding: "0.42rem 0.75rem",
  background: "#fff", color: "#475569", border: "none", cursor: "pointer", fontSize: ".82rem", fontWeight: 600
};
