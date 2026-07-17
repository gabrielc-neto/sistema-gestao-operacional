import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, LayersControl, LayerGroup, Polyline, CircleMarker } from "react-leaflet";
import { divIcon } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import CercaEletronica, { areaDoPonto } from "./CercaEletronica";
import { useCercas } from "../hooks/useCercas";
import { buscarSugestoes, calcularRotaCaminhao, fmtDistancia, fmtDuracao } from "../utils/roteamento";
import { tempoDecorrido } from "../utils/format";
import { Camera, Map as MapIcon, MapPin, Ruler } from "lucide-react";

// Distância em graus acima da qual consideramos "teleport" (≈ 5 km) — sem animar
const TELEPORT_THRESHOLD_DEG = 0.045;
// Limites da duração calculada a partir da velocidade real
const MIN_ANIM_MS = 1500;     // garante uma transição perceptível mesmo em saltos curtos
const MAX_ANIM_MS = 45000;    // teto generoso (≈ intervalo de polling + folga) pra evitar marker andando por minutos
const FALLBACK_ANIM_MS = 20000; // quando não há velocidade confiável

// Haversine — distância em metros entre dois pontos (lat,lng)
function distMetros(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Marker que interpola suavemente da posição atual até a próxima leitura SASCAR.
 * Duração da animação = distância / velocidade real do pacote SASCAR.
 * Limita entre MIN_ANIM_MS e MAX_ANIM_MS para evitar tremulação ou marker que anda por minutos.
 * Usa requestAnimationFrame + setLatLng direto no marker — sem re-render do React.
 * Quando o salto é > ~5 km (teleport, filtro mudou, GPS pulou) faz move instantâneo.
 */
function AnimatedTruckMarker({ posicao, icon, children, ...rest }) {
  const markerRef = useRef(null);
  const animFrame = useRef(null);
  // capturado 1x no mount; updates vão via setLatLng() no useEffect (bypass React)
  const [initialPos] = useState([posicao.latitude, posicao.longitude]);

  useEffect(() => {
    const m = markerRef.current;
    if (!m) return;
    const target = [posicao.latitude, posicao.longitude];
    const cur = m.getLatLng();
    const start = [cur.lat, cur.lng];
    const dLat = target[0] - start[0];
    const dLng = target[1] - start[1];

    // Sem mudança real → não anima
    if (Math.abs(dLat) < 1e-7 && Math.abs(dLng) < 1e-7) return;

    // Salto grande → teleport
    if (Math.hypot(dLat, dLng) > TELEPORT_THRESHOLD_DEG) {
      m.setLatLng(target);
      return;
    }

    // Duração baseada na velocidade real (km/h) do último pacote SASCAR.
    // distância (m) / velocidade (m/s) = tempo (s)
    const velKmh = Number(posicao.velocidade) || 0;
    let duration;
    if (velKmh >= 3) {
      const distM = distMetros(start, target);
      const velMs = velKmh / 3.6;
      duration = (distM / velMs) * 1000;
      duration = Math.max(MIN_ANIM_MS, Math.min(MAX_ANIM_MS, duration));
    } else {
      // Parado ou quase parado: usa fallback curto pra acomodar GPS jitter
      duration = FALLBACK_ANIM_MS;
    }

    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    const t0 = performance.now();

    function step(now) {
      const t = Math.min((now - t0) / duration, 1);
      const e = 1 - (1 - t) * (1 - t); // ease-out quad
      m.setLatLng([start[0] + dLat * e, start[1] + dLng * e]);
      if (t < 1) {
        animFrame.current = requestAnimationFrame(step);
      } else {
        animFrame.current = null;
      }
    }
    animFrame.current = requestAnimationFrame(step);

    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, [posicao.latitude, posicao.longitude, posicao.velocidade]);

  return (
    <Marker ref={markerRef} position={initialPos} icon={icon} {...rest}>
      {children}
    </Marker>
  );
}

const STATUS = {
  EM_MOVIMENTO:  { color: "#16a34a", label: "Em movimento",   pulse: true  },
  PARADO_LIGADO: { color: "#eab308", label: "Parado / ligado", pulse: false },
  ESTACIONADO:   { color: "var(--text-muted)", label: "Estacionado",     pulse: false },
  SEM_DADOS:     { color: "var(--text-subtle)", label: "Sem comunicação", pulse: false },
};

function minutosDecorridos(iso) {
  if (!iso) return Infinity;
  const t = new Date(iso.replace("T", " ")).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return Math.floor((Date.now() - t) / 60000);
}

// Centro padrão = base Pontual em Araucária/PR
const CENTRO_PADRAO = [-25.5504, -49.3682];

// SVG truck vista superior. Cabine na frente (norte por padrão), baú atrás.
// Rotação pelo campo direcao (0=N, 90=L, 180=S, 270=O).
function svgCaminhao(color) {
  return `<svg viewBox="0 0 30 38" width="30" height="38" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="15" cy="35" rx="8" ry="1.6" fill="rgba(0,0,0,0.18)"/>
    <rect x="9" y="2" width="12" height="9" rx="2" fill="${color}" stroke="#fff" stroke-width="1.6"/>
    <rect x="11" y="3.5" width="8" height="3" rx="0.6" fill="rgba(255,255,255,0.65)"/>
    <rect x="7.5" y="11" width="15" height="20" rx="1.6" fill="${color}" stroke="#fff" stroke-width="1.6"/>
    <line x1="15" y1="12" x2="15" y2="30" stroke="rgba(255,255,255,0.55)" stroke-width="0.8"/>
    <circle cx="15" cy="3.6" r="1.1" fill="#fff"/>
  </svg>`;
}

// Capitaliza e pega 2 primeiros nomes (ex: "LUIS FERNANDO RAMALHO" -> "Luis Fernando")
function formatarMotorista(nome) {
  if (!nome) return "";
  const partes = nome.trim().split(/\s+/).slice(0, 2);
  return partes
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// HTML do marker. Truck rotaciona; placa, motorista e velocidade ficam fixos.
function buildMarkerHtml(p) {
  const cfg = STATUS[p.statusTexto] || STATUS.ESTACIONADO;
  const direcao = Number.isFinite(p.direcao) ? p.direcao : 0;
  const vel = Number(p.velocidade) || 0;
  const placa = p.placa || `#${p.idVeiculo}`;
  const motorista = formatarMotorista(p.motoristaLogado);
  const idadeMin = minutosDecorridos(p.dataPosicao);
  const stale = idadeMin > 15;          // sinal velho
  const veryStale = idadeMin > 60;      // sem comunicação há mais de 1h
  const pulse = cfg.pulse && !stale ? "pulse" : "";
  const opacityClass = veryStale ? "very-stale" : stale ? "stale" : "";

  return `
    <div class="truck-wrap ${pulse} ${opacityClass}">
      <div class="truck-labels">
        <div class="truck-placa">${placa}</div>
        ${motorista ? `<div class="truck-driver">${motorista}</div>` : ""}
      </div>
      <div class="truck-svg" style="transform: rotate(${direcao}deg);">
        ${svgCaminhao(cfg.color)}
      </div>
      ${vel > 0 ? `<div class="truck-vel">${vel}</div>` : ""}
      ${stale ? `<div class="truck-stale" title="Sem comunicação há ${idadeMin} min">${idadeMin > 999 ? "999+" : idadeMin}m</div>` : ""}
    </div>
  `;
}

function makeIcon(p) {
  return divIcon({
    html: buildMarkerHtml(p),
    className: "truck-icon",
    iconSize: [110, 78],
    iconAnchor: [55, 40],
    popupAnchor: [0, -34],
  });
}

function FitBounds({ posicoes }) {
  const map = useMap();
  useEffect(() => {
    const pontos = posicoes
      .filter(p => p.latitude && p.longitude)
      .map(p => [p.latitude, p.longitude]);
    if (pontos.length === 0) return;
    if (pontos.length === 1) {
      map.setView(pontos[0], 14);
      return;
    }
    map.fitBounds(pontos, { padding: [60, 60], maxZoom: 14 });
  }, [map, posicoes]);
  return null;
}

function bussola(graus) {
  if (!Number.isFinite(graus)) return "—";
  const labels = ["N","NE","L","SE","S","SO","O","NO"];
  return labels[Math.round((graus % 360) / 45) % 8] + ` (${graus}°)`;
}

// Normaliza placa para lookup
function normPlaca(p) { return (p || "").trim().toUpperCase().replace(/-/g, ""); }

export default function MapaFrota({ posicoes, height = 560, focusPlaca = null, ocsPorPlaca = null }) {
  const { cercas } = useCercas();
  const validas = useMemo(
    () => (posicoes || []).filter(p => p.latitude && p.longitude),
    [posicoes]
  );

  // Destinos definidos por veículo (ad-hoc — não persiste entre sessões).
  // Map<placaNormalizada, { endereco, lat, lng, dist?, dur?, coords?, perfil?, loading?, erro? }>
  const [destinos, setDestinos] = useState(() => new Map());

  function definirDestino(p, dest) {
    setDestinos(prev => {
      const next = new Map(prev);
      next.set(normPlaca(p.placa), { ...dest, loading: true, erro: null });
      return next;
    });
    calcularRotaCaminhao(
      { lat: p.latitude, lng: p.longitude },
      { lat: dest.lat, lng: dest.lng }
    )
      .then(rota => setDestinos(prev => {
        const next = new Map(prev);
        next.set(normPlaca(p.placa), { ...dest, ...rota, loading: false, erro: null });
        return next;
      }))
      .catch(err => setDestinos(prev => {
        const next = new Map(prev);
        next.set(normPlaca(p.placa), { ...dest, loading: false, erro: err.message || "falha ao calcular rota" });
        return next;
      }));
  }

  function limparDestino(p) {
    setDestinos(prev => {
      const next = new Map(prev);
      next.delete(normPlaca(p.placa));
      return next;
    });
  }

  // Chave que muda quando o conjunto filtrado muda (re-fit no mapa)
  const fitKey = useMemo(
    () => validas.map(p => p.placa || p.idVeiculo).sort().join(","),
    [validas]
  );

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.12)", position: "relative" }}>
      <MapContainer center={CENTRO_PADRAO} zoom={7} style={{ height: "100%", width: "100%" }} preferCanvas>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Mapa">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satélite">
            {/* Híbrido: OSM por baixo serve de fallback quando o Esri não tem foto */}
            <LayerGroup>
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <TileLayer
                attribution='Tiles &copy; Esri World Imagery'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
              />
            </LayerGroup>
          </LayersControl.BaseLayer>
        </LayersControl>
        <FitBounds posicoes={validas} key={fitKey} />

        <CercaEletronica cercas={cercas} />

        {validas.map(p => {
          const oc = ocsPorPlaca?.get(normPlaca(p.placa));
          const area = areaDoPonto(p.latitude, p.longitude, cercas);
          return (
          <AnimatedTruckMarker
            key={p.idVeiculo}
            posicao={p}
            icon={makeIcon(p)}
            zIndexOffset={p.placa === focusPlaca ? 1000 : 0}
          >
            <Popup>
              <div style={{ fontFamily: "var(--font)", minWidth: 230 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <strong style={{ fontSize: "1.02rem", color: "var(--accent)" }}>{p.placa || `id ${p.idVeiculo}`}</strong>
                  <span style={{
                    background: (STATUS[p.statusTexto] || STATUS.ESTACIONADO).color,
                    color: "#fff", padding: "2px 8px", borderRadius: 6,
                    fontSize: ".7rem", fontWeight: 700
                  }}>
                    {(STATUS[p.statusTexto] || STATUS.ESTACIONADO).label}
                  </span>
                </div>
                <div style={{ fontSize: ".84rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                  <Row label="Motorista" value={p.motoristaLogado ? formatarMotorista(p.motoristaLogado) : "Não logado"} highlight={!!p.motoristaLogado} />
                  <Row label="Velocidade" value={`${p.velocidade ?? 0} km/h`} highlight={p.velocidade > 0} />
                  <Row label="Direção" value={bussola(p.direcao)} extra />
                  <Row label="Ignição" value={p.ignicao === 1 ? "Ligada" : "Desligada"} highlight={p.ignicao === 1} extra />
                  {/* Campo `bloqueio` da SASCAR ficou removido — é estado de saída elétrica, não comando pendente */}
                  <Row label="GPS" value={p.gps === 1 ? "Sinal OK" : "Sem sinal"} alert={p.gps !== 1} extra />
                  <Row label="Área" value={area ? area.nome : "—"} highlight={!!area} extra />
                  <Row label="Local" value={`${p.cidade}/${p.uf}`} />
                  {p.rua && <Row label="Endereço" value={p.rua} />}
                  {p.pontoReferencia && <Row label="Referência" value={p.pontoReferencia} />}
                  <Row label="Última posição" value={tempoDecorrido(p.dataPosicao)} />
                  <Row label="Odômetro" value={p.odometro != null ? `${p.odometro.toLocaleString("pt-BR")} km` : "—"} extra />
                  <Row label="Bateria" value={`${p.tensao ?? "—"}V`} alert={(p.tensao ?? 0) < 11} extra />
                </div>
                {/* Atalhos de mapa externo */}
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <a
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${p.latitude},${p.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    style={btnExt}
                  >
                    <Camera size={14} /> Street View
                  </a>
                  <a
                    href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    style={btnExt}
                  >
                    <MapIcon size={14} /> Google Maps
                  </a>
                </div>

                <PainelDestino
                  destino={destinos.get(normPlaca(p.placa))}
                  onDefinir={(d) => definirDestino(p, d)}
                  onLimpar={() => limparDestino(p)}
                />

                {oc && (
                  <div style={{ marginTop: 10, padding: "8px 10px", background: "var(--surface-2)", borderLeft: "3px solid #d97706", borderRadius: 4 }}>
                    <div style={{ fontSize: ".72rem", color: "#854d0e", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 4 }}>
                      OC ativa · {oc.num}
                    </div>
                    <div style={{ fontSize: ".78rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                      <div><strong>Responsável:</strong> {oc.resp || "—"}</div>
                      <div><strong>Carga:</strong> {(oc.totalLitros ?? 0).toLocaleString("pt-BR")} L · {oc.entregas?.length || 0} entrega(s)</div>
                      <div><strong>Base:</strong> {oc.base || "—"}</div>
                      <div><strong>Saída:</strong> {oc.data} {oc.hora}</div>
                    </div>
                    <a href={`/oc?q=${encodeURIComponent(oc.num)}`} style={{ display: "inline-block", marginTop: 6, color: "#d97706", textDecoration: "none", fontSize: ".74rem", fontWeight: 700 }}>
                      Abrir OC →
                    </a>
                  </div>
                )}
              </div>
            </Popup>
            <Tooltip direction="top" offset={[0, -28]} opacity={0.9}>
              <div style={{ fontWeight: 700, fontSize: ".78rem" }}>
                {p.placa} {p.velocidade > 0 ? `· ${p.velocidade} km/h` : ""}
                {oc && <div style={{ color: "#d97706", fontSize: ".7rem" }}>OC {oc.num}</div>}
              </div>
            </Tooltip>
          </AnimatedTruckMarker>
        );
        })}

        {/* Rotas até destinos definidos por veículo */}
        {Array.from(destinos.entries()).map(([placa, d]) => {
          if (!d || !d.coords || !d.coords.length) return null;
          return (
            <Polyline
              key={`rota-${placa}`}
              positions={d.coords}
              pathOptions={{ color: "#0284c7", weight: 4, opacity: 0.75, dashArray: "8 6" }}
            />
          );
        })}
        {Array.from(destinos.entries()).map(([placa, d]) => {
          if (!d || d.lat == null || d.lng == null) return null;
          return (
            <CircleMarker
              key={`dest-${placa}`}
              center={[d.lat, d.lng]}
              radius={7}
              pathOptions={{ color: "#0284c7", fillColor: "#fff", fillOpacity: 1, weight: 3 }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <div style={{ fontSize: ".75rem" }}>
                  <strong>Destino {placa}</strong>
                  {d.dist != null && <div>{fmtDistancia(d.dist)} · {fmtDuracao(d.dur)}</div>}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <Legenda />

      {/* Estilos do marker e animação */}
      <style>{`
        .leaflet-marker-icon.truck-icon {
          background: transparent;
          border: 0;
          /* sem CSS transition aqui — interpolação é feita por RAF em AnimatedTruckMarker */
        }
        .truck-wrap {
          position: relative;
          width: 110px;
          height: 78px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          pointer-events: auto;
        }
        .truck-labels {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2px;
          gap: 1px;
        }
        .truck-placa {
          background: var(--accent);
          color: #fff;
          font-size: 10.5px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
          letter-spacing: .02em;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
          font-family: system-ui, sans-serif;
        }
        .truck-driver {
          background: rgba(255,255,255,0.95);
          color: var(--accent);
          font-size: 9.5px;
          font-weight: 600;
          padding: 0px 5px;
          border-radius: 3px;
          white-space: nowrap;
          max-width: 108px;
          overflow: hidden;
          text-overflow: ellipsis;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
          border: 1px solid rgba(26,58,92,0.15);
          font-family: system-ui, sans-serif;
        }
        .truck-svg {
          width: 30px;
          height: 38px;
          transform-origin: 50% 50%;
          transition: transform 600ms ease-out;
        }
        .truck-vel {
          position: absolute;
          right: 6px;
          top: 12px;
          background: #16a34a;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 8px;
          border: 1.5px solid #fff;
          font-family: system-ui, sans-serif;
          box-shadow: 0 1px 2px rgba(0,0,0,0.25);
        }
        .truck-stale {
          position: absolute;
          right: 6px;
          top: 12px;
          background: #f59e0b;
          color: #fff;
          font-size: 9.5px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 8px;
          border: 1.5px solid #fff;
          font-family: system-ui, sans-serif;
          box-shadow: 0 1px 2px rgba(0,0,0,0.25);
        }
        .truck-wrap.stale .truck-svg { opacity: 0.55; }
        .truck-wrap.very-stale .truck-svg { opacity: 0.35; filter: grayscale(0.6); }
        .truck-wrap.very-stale .truck-stale { background: #6b7280; }
        .truck-lock {
          position: absolute;
          left: 4px;
          top: 14px;
          background: #fff;
          font-size: 12px;
          line-height: 14px;
          padding: 1px 3px;
          border-radius: 4px;
          border: 1px solid #dc2626;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        .truck-wrap.pulse::before {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 14px;
          width: 26px;
          height: 26px;
          margin-left: -13px;
          border-radius: 50%;
          background: rgba(22,163,74,0.45);
          animation: truckpulse 1.5s ease-out infinite;
        }
        @keyframes truckpulse {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}

const btnExt = {
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "5px 9px",
  background: "var(--accent)", color: "#fff",
  borderRadius: 6, fontSize: ".74rem", fontWeight: 600,
  textDecoration: "none",
};

function Row({ label, value, highlight, alert, extra }) {
  return (
    <div
      className={extra ? "popup-row popup-row-extra" : "popup-row"}
      style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{
        fontWeight: 600,
        color: alert ? "#dc2626" : highlight ? "#16a34a" : "var(--accent)"
      }}>{value}</span>
    </div>
  );
}

/**
 * Painel de "Definir destino" dentro do Popup do veículo.
 * Faz autocomplete via Nominatim e dispara o cálculo de rota Valhalla (truck+hazmat).
 */
function PainelDestino({ destino, onDefinir, onLimpar }) {
  const [q, setQ] = useState("");
  const [sugest, setSugest] = useState([]);
  const [open, setOpen] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef(null);

  function onChangeInput(v) {
    setQ(v);
    setBuscando(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const lista = await buscarSugestoes(v);
        setSugest(lista);
        setOpen(lista.length > 0);
      } catch {
        setSugest([]); setOpen(false);
      } finally {
        setBuscando(false);
      }
    }, 350);
  }

  function escolher(item) {
    setQ(item.label);
    setSugest([]);
    setOpen(false);
    onDefinir({ endereco: item.label, lat: item.lat, lng: item.lng });
  }

  const labelRotulo = { fontSize: ".7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 4 };
  const inputStyle = { width: "100%", padding: "6px 8px", border: "1px solid var(--border-strong)", borderRadius: 5, fontSize: ".82rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const sugStyle = { padding: "5px 8px", fontSize: ".78rem", cursor: "pointer", borderBottom: "1px solid #f1f5f9", color: "var(--accent)" };

  return (
    <div style={{ marginTop: 10, padding: "8px 10px", background: "#f0f9ff", borderLeft: "3px solid #0284c7", borderRadius: 4 }}>
      <div style={{ ...labelRotulo, display: "inline-flex", alignItems: "center", gap: 6 }}><MapPin size={14} /> Destino · ETA</div>

      {destino ? (
        <div>
          <div style={{ fontSize: ".78rem", color: "var(--accent)", lineHeight: 1.4, marginBottom: 6 }}>
            <strong>Para:</strong> {destino.endereco}
          </div>
          {destino.loading && <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>Calculando rota…</div>}
          {destino.erro && <div style={{ fontSize: ".78rem", color: "#dc2626" }}>Erro: {destino.erro}</div>}
          {!destino.loading && !destino.erro && destino.dist != null && (
            <div style={{ display: "flex", gap: 10, fontSize: ".88rem", fontWeight: 700, color: "#0284c7", marginBottom: 4 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Ruler size={14} /> {fmtDistancia(destino.dist)}</span>
              <span>⏱ {fmtDuracao(destino.dur)}</span>
            </div>
          )}
          {destino.perfil && (
            <div style={{ fontSize: ".68rem", color: "var(--text-muted)", fontStyle: "italic" }}>{destino.perfil}</div>
          )}
          <button
            onClick={() => { onLimpar(); setQ(""); }}
            style={{ marginTop: 6, background: "transparent", border: "1px solid var(--border-strong)", color: "var(--text-muted)", padding: "3px 10px", borderRadius: 4, fontSize: ".72rem", cursor: "pointer" }}
          >
            Limpar destino
          </button>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Digite endereço, cidade ou CEP…"
            value={q}
            onChange={e => onChangeInput(e.target.value)}
            onFocus={() => { if (sugest.length) setOpen(true); }}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            style={inputStyle}
          />
          {buscando && <div style={{ fontSize: ".7rem", color: "var(--text-subtle)", marginTop: 3 }}>Buscando…</div>}
          {open && sugest.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, marginTop: 2,
              background: "var(--card-bg)", border: "1px solid var(--border-strong)", borderRadius: 5,
              maxHeight: 180, overflowY: "auto", zIndex: 1100, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              {sugest.map((s, i) => (
                <div
                  key={`${s.lat},${s.lng},${i}`}
                  onMouseDown={() => escolher(s)}
                  style={sugStyle}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  {s.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Legenda() {
  const itens = [
    ["#16a34a", "Em movimento"],
    ["#eab308", "Parado / ligado"],
    ["var(--text-muted)", "Estacionado"],
    ["#dc2626", "Bloqueado"],
  ];
  return (
    <div className="mapa-legenda" style={{
      position: "absolute",
      right: 12,
      bottom: 12,
      background: "rgba(255,255,255,0.95)",
      borderRadius: 8,
      padding: "8px 12px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
      fontSize: ".74rem",
      fontFamily: "var(--font)",
      zIndex: 400,   /* baixo pra não vazar sobre drawers/modais que ficam em >=3000 */
    }}>
      <div style={{ fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Status</div>
      {itens.map(([c, l]) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, lineHeight: 1.6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: "inline-block" }} />
          <span style={{ color: "var(--text-muted)" }}>{l}</span>
        </div>
      ))}
    </div>
  );
}
