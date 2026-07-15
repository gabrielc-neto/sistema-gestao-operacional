import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { calcularRota, distanciaHaversine, fmtKm } from "../services/geocoding";
import { pedagiosNaRota, PEDAGIOS_META } from "../services/pedagios";
import { violacoesEmLote } from "../services/violacaoRota";
import BuscaEndereco from "../components/BuscaEndereco";
import { PageHeader, Section, Btn, KpiCard, Tag, DataTable } from "../theme/ui";
import { COLORS, SPACING, TYPO, RADIUS } from "../theme/tokens";
import { ArrowLeft, MapPin, Route, Clock, Fuel, DollarSign, Coins } from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Ícones custom
const iconOrigem = L.divIcon({ className: "", html: `<div style="background:#0f766e;color:#fff;padding:4px 8px;border-radius:12px;font-weight:700;font-size:12px;box-shadow:0 2px 4px rgba(0,0,0,0.3)">A</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
const iconDestino = L.divIcon({ className: "", html: `<div style="background:#b91c1c;color:#fff;padding:4px 8px;border-radius:12px;font-weight:700;font-size:12px;box-shadow:0 2px 4px rgba(0,0,0,0.3)">B</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
const iconPedagio = L.divIcon({ className: "", html: `<div style="background:#b45309;color:#fff;padding:2px 5px;border-radius:6px;font-weight:700;font-size:10px;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:1px solid #fff">🛑</div>`, iconSize: [24, 24], iconAnchor: [12, 12] });
const iconVeicOk = L.divIcon({ className: "", html: `<div style="background:#0f766e;color:#fff;padding:2px 5px;border-radius:12px;font-weight:700;font-size:10px;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:1px solid #fff">🚛</div>`, iconSize: [24, 24], iconAnchor: [12, 12] });
const iconVeicFora = L.divIcon({ className: "", html: `<div style="background:#b91c1c;color:#fff;padding:2px 5px;border-radius:12px;font-weight:700;font-size:10px;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:1px solid #fff">⚠️</div>`, iconSize: [24, 24], iconAnchor: [12, 12] });

// Estimativa de CPK padrão da frota (pode vir do CTA mais tarde)
const CPK_PADRAO = 1.20;   // R$/km (média histórica)
const KM_POR_L   = 2.5;    // km/L padrão do bitrem

export default function Rotas() {
  const navigate = useNavigate();
  const [origem, setOrigem]   = useState(null);
  const [destino, setDestino] = useState(null);
  const [rota, setRota]       = useState(null);
  const [calculando, setCalc] = useState(false);
  const [erro, setErro]       = useState("");
  const [sascarPos, setSascarPos] = useState([]);
  const [tolerKm, setTolerKm]     = useState(3);
  const [placaMonitor, setPlacaMonitor] = useState("");   // filtrar 1 placa específica (opcional)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sascar_posicoes"), snap => {
      const arr = [];
      snap.docs.forEach(d => {
        const x = d.data();
        const p = x.ultimaPosicao || {};
        if (p.latitude && p.longitude) {
          arr.push({
            placa: x.placa || p.placa || "",
            lat: Number(p.latitude),
            lng: Number(p.longitude),
            dataHora: p.dataPosicao || p.dataPacote,
            velocidade: p.velocidade,
            motorista: p.nomeMotorista,
            cidade: p.cidade,
            uf: p.uf,
          });
        }
      });
      setSascarPos(arr);
    }, err => console.warn("sascar_posicoes:", err));
    return () => unsub();
  }, []);

  async function calcular() {
    if (!origem || !destino) { setErro("Selecione origem e destino"); return; }
    setCalc(true); setErro(""); setRota(null);
    try {
      const r = await calcularRota([[origem.lng, origem.lat], [destino.lng, destino.lat]]);
      setRota(r);
    } catch (e) {
      setErro(e.message || String(e));
    } finally {
      setCalc(false);
    }
  }

  function inverter() {
    setOrigem(destino);
    setDestino(origem);
    setRota(null);
  }

  const custoEstimado = rota ? rota.distanciaKm * CPK_PADRAO : 0;
  const litrosEstimados = rota ? rota.distanciaKm / KM_POR_L : 0;
  const linhaReta = origem && destino ? distanciaHaversine(origem.lat, origem.lng, destino.lat, destino.lng) : 0;
  const desvio = rota && linhaReta ? ((rota.distanciaKm - linhaReta) / linhaReta) * 100 : 0;
  const pedagios = rota ? pedagiosNaRota(rota.coords, 1.2) : [];

  const violacoes = rota ? violacoesEmLote(
    rota.coords,
    placaMonitor ? sascarPos.filter(v => v.placa === placaMonitor) : sascarPos,
    tolerKm
  ) : [];
  const forasDaRota = violacoes.filter(v => v.violando);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: TYPO.family }}>
      <PageHeader
        breadcrumb="Operacional › Roteirização"
        title="Cálculo de Rotas"
        subtitle="Distância real e estimativa de custo (OSM/OSRM)"
        actions={<Btn variant="secondary" size="sm" icon={<ArrowLeft size={14}/>} onClick={() => navigate("/dashboard")}>Dashboard</Btn>}
      />

      <main style={{ padding: SPACING.xl, maxWidth: 1400, margin: "0 auto" }}>
        <Section title="Origem e destino" subtitle="Digite o endereço e escolha nos resultados">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SPACING.md, marginBottom: SPACING.md }}>
            <div>
              <div style={{ fontSize: TYPO.xxs, color: COLORS.textMuted, fontWeight: TYPO.w600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>A · Origem</div>
              <BuscaEndereco placeholder="Ex: Rua Luiz Franceschi, Araucária PR" onSelect={setOrigem} />
              {origem && <div style={{ fontSize: TYPO.xxs, color: COLORS.textMuted, marginTop: 4 }}>📍 {origem.display}</div>}
            </div>
            <div>
              <div style={{ fontSize: TYPO.xxs, color: COLORS.textMuted, fontWeight: TYPO.w600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>B · Destino</div>
              <BuscaEndereco placeholder="Ex: Ponta Grossa PR" onSelect={setDestino} />
              {destino && <div style={{ fontSize: TYPO.xxs, color: COLORS.textMuted, marginTop: 4 }}>📍 {destino.display}</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: SPACING.sm }}>
            <Btn variant="primary" onClick={calcular} disabled={!origem || !destino || calculando} icon={<Route size={14}/>}>
              {calculando ? "Calculando..." : "Calcular rota"}
            </Btn>
            <Btn variant="secondary" onClick={inverter} disabled={!origem || !destino}>↔ Inverter</Btn>
          </div>
          {erro && <div style={{ color: COLORS.danger, fontSize: TYPO.sm, marginTop: SPACING.sm }}>{erro}</div>}
        </Section>

        {rota && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: SPACING.sm, marginBottom: SPACING.md }}>
              <KpiCard label="Distância real" value={fmtKm(rota.distanciaKm)} icon={<Route size={16}/>} tone="primary" sub={`Linha reta: ${fmtKm(linhaReta)} · ${desvio > 0 ? "+" : ""}${desvio.toFixed(0)}% de desvio`} />
              <KpiCard label="Tempo estimado" value={`${Math.floor(rota.duracaoMin / 60)}h ${Math.round(rota.duracaoMin % 60)}min`} icon={<Clock size={16}/>} />
              <KpiCard label="Diesel estimado" value={`${litrosEstimados.toFixed(1)} L`} icon={<Fuel size={16}/>} sub={`${KM_POR_L} km/L (frota média)`} />
              <KpiCard label="Custo estimado" value={`R$ ${custoEstimado.toFixed(2)}`} icon={<DollarSign size={16}/>} tone="primary" sub={`${CPK_PADRAO.toFixed(2)} R$/km (CPK padrão)`} />
              <KpiCard label="Praças de pedágio" value={pedagios.length} icon={<Coins size={16}/>} tone={pedagios.length > 0 ? "warning" : "success"} sub={pedagios.length > 0 ? "Apenas federais (ANTT)" : "Sem pedágios federais"} />
            </div>

            {/* Monitoramento de violação */}
            <Section
              title={`Monitoramento — Violação de rota`}
              subtitle={`${sascarPos.length} veículo(s) SASCAR ativos · tolerância ${tolerKm} km`}
              actions={
                <>
                  <select value={placaMonitor} onChange={e => setPlacaMonitor(e.target.value)} style={{ padding: "6px 10px", border: `1px solid ${COLORS.borderHeavy}`, borderRadius: RADIUS.md, fontSize: TYPO.sm, fontFamily: TYPO.family }}>
                    <option value="">Todas as placas</option>
                    {[...new Set(sascarPos.map(p => p.placa).filter(Boolean))].sort().map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={tolerKm} onChange={e => setTolerKm(Number(e.target.value))} style={{ padding: "6px 10px", border: `1px solid ${COLORS.borderHeavy}`, borderRadius: RADIUS.md, fontSize: TYPO.sm, fontFamily: TYPO.family }}>
                    <option value="1">1 km</option>
                    <option value="2">2 km</option>
                    <option value="3">3 km</option>
                    <option value="5">5 km</option>
                    <option value="10">10 km</option>
                  </select>
                </>
              }
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: SPACING.sm, marginBottom: SPACING.md }}>
                <KpiCard label="Veículos analisados" value={violacoes.length} icon={<MapPin size={16}/>} />
                <KpiCard label="Fora da rota" value={forasDaRota.length} tone={forasDaRota.length > 0 ? "danger" : "success"} sub={forasDaRota.length > 0 ? "Requer atenção" : "Tudo dentro"} />
                <KpiCard label="Dentro da rota" value={violacoes.length - forasDaRota.length} tone="success" />
              </div>
              <DataTable
                columns={[
                  { key: "status", label: "", render: v => v.violando ? <Tag tone="danger">FORA</Tag> : <Tag tone="success">OK</Tag> },
                  { key: "placa", label: "Placa", render: v => <strong>{v.placa}</strong> },
                  { key: "motorista", label: "Motorista", render: v => v.motorista || "—" },
                  { key: "dist", label: "Dist. da rota", align: "right", render: v => <strong style={{ color: v.violando ? COLORS.danger : COLORS.success }}>{fmtKm(v.distanciaKm)}</strong> },
                  { key: "progresso", label: "Progresso rota", align: "right", render: v => `${v.progressoPct}%` },
                  { key: "vel", label: "Velocidade", align: "right", render: v => v.velocidade != null ? `${v.velocidade} km/h` : "—" },
                  { key: "local", label: "Cidade", render: v => `${v.cidade || "—"}${v.uf ? "/"+v.uf : ""}` },
                  { key: "hora", label: "Última posição", render: v => v.dataHora ? new Date(v.dataHora).toLocaleString("pt-BR") : "—" },
                ]}
                rows={violacoes.slice(0, 100)}
                keyFn={v => v.placa || Math.random()}
                empty="Nenhum veículo SASCAR com posição válida"
              />
              <div style={{ padding: SPACING.sm, fontSize: TYPO.xxs, color: COLORS.textLight, background: COLORS.bgAlt, borderTop: `1px solid ${COLORS.border}` }}>
                💡 Tolerância maior é indicado pra rotas urbanas (motorista faz desvios de trânsito). Tolerância menor é rígida — bom pra bitrem em rodovia principal.
              </div>
            </Section>

            {pedagios.length > 0 && (
              <Section title={`Pedágios detectados na rota · ${pedagios.length}`} subtitle="Base ANTT — praças federais ativas dentro de 1,2 km do traçado">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: SPACING.sm }}>
                  {pedagios.map((p, i) => (
                    <div key={i} style={{ padding: SPACING.sm, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, background: COLORS.warningBg }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: SPACING.sm }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: TYPO.w700, fontSize: TYPO.sm, color: COLORS.text }}>{p.praca}</div>
                          <div style={{ fontSize: TYPO.xxs, color: COLORS.textMuted, marginTop: 2 }}>
                            {p.rodovia} · km {p.km} · {p.municipio}/{p.uf}
                          </div>
                          <div style={{ fontSize: TYPO.xxs, color: COLORS.textLight, marginTop: 2 }}>{p.concessionaria}</div>
                        </div>
                        <Tag tone="warning" size="sm">{fmtKm(p.distanciaKm)}</Tag>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Traçado da rota" subtitle="Powered by OpenStreetMap + OSRM" dense>
              <div style={{ height: 500 }}>
                <MapContainer center={[origem.lat, origem.lng]} zoom={9} style={{ height: "100%", width: "100%" }}>
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[origem.lat, origem.lng]} icon={iconOrigem}>
                    <Popup>{origem.display}</Popup>
                  </Marker>
                  <Marker position={[destino.lat, destino.lng]} icon={iconDestino}>
                    <Popup>{destino.display}</Popup>
                  </Marker>
                  <Polyline positions={rota.coords.map(([lng, lat]) => [lat, lng])} color="#1a3a5c" weight={4} opacity={0.8} />
                  {violacoes.map((v, i) => (
                    <Marker key={`v${i}`} position={[v.lat, v.lng]} icon={v.violando ? iconVeicFora : iconVeicOk}>
                      <Popup>
                        <div style={{ minWidth: 200 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{v.violando ? "⚠️ FORA DA ROTA" : "🚛 Na rota"}</div>
                          <div style={{ fontSize: 12 }}><strong>{v.placa}</strong></div>
                          <div style={{ fontSize: 11 }}>{v.motorista || "—"}</div>
                          <div style={{ fontSize: 11, color: "#666" }}>{v.cidade}/{v.uf} · {v.velocidade || 0} km/h</div>
                          <div style={{ fontSize: 11, color: v.violando ? "#b91c1c" : "#0f766e", marginTop: 4, fontWeight: 600 }}>
                            {fmtKm(v.distanciaKm)} da rota planejada
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {pedagios.map((p, i) => (
                    <Marker key={i} position={[p.lat, p.lng]} icon={iconPedagio}>
                      <Popup>
                        <div style={{ minWidth: 200 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>🛑 {p.praca}</div>
                          <div style={{ fontSize: 11 }}>{p.rodovia} · km {p.km}</div>
                          <div style={{ fontSize: 11, color: "#666" }}>{p.municipio}/{p.uf}</div>
                          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{p.concessionaria}</div>
                          <div style={{ fontSize: 10, color: "#999", marginTop: 4 }}>Distância à rota: {fmtKm(p.distanciaKm)}</div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </Section>
          </>
        )}

        <Section title="Como usar" dense>
          <div style={{ padding: SPACING.md, fontSize: TYPO.sm, color: COLORS.textMuted, lineHeight: 1.6 }}>
            <p><strong>Origem/Destino:</strong> comece a digitar (mínimo 4 letras). Aparecem sugestões — clica na que quiser.</p>
            <p><strong>Distância real:</strong> segue o traçado real das estradas. Linha reta é referência (voo de pássaro).</p>
            <p><strong>Custo estimado:</strong> baseado em <code>CPK padrão de R$ {CPK_PADRAO.toFixed(2)}/km</code> — ajuste no código conforme dados reais do CTA. Um dia isso vem automático do consumo médio da placa selecionada.</p>
            <p><strong>Precisão:</strong> Nominatim e OSRM são bases abertas (OpenStreetMap). Melhor com endereços completos (rua + número + cidade + UF).</p>
          </div>
        </Section>
      </main>
    </div>
  );
}
