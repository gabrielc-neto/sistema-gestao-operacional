import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Circle, useMapEvents, useMap, Tooltip, LayersControl } from "react-leaflet";
import { divIcon } from "leaflet";
import { ArrowLeft, Trash2, X, Check, Search, Undo2, MapPin, Locate, Hexagon, Circle as CircleIcon, Pencil, Save } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useCercas } from "../hooks/useCercas";
import { useAuth } from "../contexts/AuthContext";

const CORES = [
  { v: "#2563eb", n: "Azul" },
  { v: "#16a34a", n: "Verde" },
  { v: "#ea580c", n: "Laranja" },
  { v: "#dc2626", n: "Vermelho" },
  { v: "#7c3aed", n: "Roxo" },
  { v: "#0891b2", n: "Ciano" },
];

const TIPOS = ["Base", "Cliente", "Restrita", "Posto", "Refinaria", "Oficina", "Outro"];

const CENTRO = [-25.5504, -49.3682]; // Araucária

// Ícones
function vertexIcon() {
  return divIcon({
    html: `<div style="width:12px;height:12px;background:#1a3a5c;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.5)"></div>`,
    className: "vertex-icon",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// Ícone maior pra modo edição (drag handle) — mais fácil de pegar no celular
function editHandleIcon() {
  return divIcon({
    html: `<div style="width:18px;height:18px;background:#ea580c;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.45);cursor:grab"></div>`,
    className: "edit-handle-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Ícone do centro durante edição de círculo
function centerHandleIcon() {
  return divIcon({
    html: `<div style="width:22px;height:22px;background:#1a3a5c;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.45);cursor:grab;display:flex;align-items:center;justify-content:center"><div style="width:6px;height:6px;background:#fff;border-radius:50%"></div></div>`,
    className: "center-handle-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function MapClickHandler({ drawing, formato, onClickPoligono, onClickCirculo }) {
  useMapEvents({
    click(e) {
      if (!drawing) return;
      if (formato === "circulo") onClickCirculo({ lat: e.latlng.lat, lng: e.latlng.lng });
      else onClickPoligono([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// Auto-fit nas cercas existentes (cobre polígono e círculo)
function AutoFit({ cercas, focus }) {
  const map = useMap();
  useEffect(() => {
    if (focus) { map.flyTo(focus, 16, { duration: 0.8 }); return; }
    if (!cercas || cercas.length === 0) return;
    const todos = [];
    for (const c of cercas) {
      if (c.formato === "circulo" && c.centro) todos.push([c.centro.lat, c.centro.lng]);
      else if (Array.isArray(c.pontos)) todos.push(...c.pontos);
    }
    if (todos.length === 0) return;
    map.fitBounds(todos, { padding: [60, 60], maxZoom: 15 });
  }, [map, cercas, focus]);
  return null;
}

// Centraliza no resultado de busca
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], 16, { duration: 0.8 });
  }, [target, map]);
  return null;
}

// Calcula área aproximada de polígono (m²) usando fórmula esférica simplificada
function calcularAreaPoligono(pontos) {
  if (!pontos || pontos.length < 3) return 0;
  const R = 6378137; // raio da Terra em metros
  let area = 0;
  for (let i = 0; i < pontos.length; i++) {
    const j = (i + 1) % pontos.length;
    const lat1 = pontos[i][0] * Math.PI / 180;
    const lat2 = pontos[j][0] * Math.PI / 180;
    const dLon = (pontos[j][1] - pontos[i][1]) * Math.PI / 180;
    area += dLon * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs(area * R * R / 2);
  return area;
}

function areaCerca(c) {
  if (!c) return 0;
  if (c.formato === "circulo" && Number.isFinite(c.raio)) return Math.PI * c.raio * c.raio;
  return calcularAreaPoligono(c.pontos);
}

function formatarArea(m2) {
  if (m2 < 10_000) return `${Math.round(m2).toLocaleString("pt-BR")} m²`;
  if (m2 < 1_000_000) return `${(m2 / 10_000).toFixed(2)} ha`;
  return `${(m2 / 1_000_000).toFixed(2)} km²`;
}

export default function Cercas() {
  const navigate = useNavigate();
  const { cercas, loading } = useCercas();
  const { user } = useAuth();

  const [drawing, setDrawing] = useState(false);
  const [formato, setFormato] = useState("poligono"); // "poligono" | "circulo"
  const [pontos, setPontos] = useState([]);
  const [centro, setCentro] = useState(null); // { lat, lng } para círculo
  const [raio, setRaio] = useState(200);      // metros (default 200m, range 50-5000)
  const [modal, setModal] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("Base");
  const [cor, setCor] = useState(CORES[0].v);
  const [salvando, setSalvando] = useState(false);

  // Modo edição de cerca existente
  const [editingId, setEditingId] = useState(null);
  const [editFormato, setEditFormato] = useState(null);   // "poligono" | "circulo"
  const [editPontos, setEditPontos] = useState([]);
  const [editCentro, setEditCentro] = useState(null);
  const [editRaio, setEditRaio] = useState(0);
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  // Busca de endereço
  const [buscaTxt, setBuscaTxt] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [destino, setDestino] = useState(null);
  const [focus, setFocus] = useState(null); // foco numa cerca existente

  // Filtro client-side das cercas já cadastradas
  const [filtroNome, setFiltroNome] = useState("");
  const cercasFiltradas = useMemo(() => {
    const termo = filtroNome.trim().toLowerCase();
    if (!termo) return cercas;
    return cercas.filter(c => {
      const nome = (c.nome || "").toLowerCase();
      const tipo = (c.tipo || "").toLowerCase();
      return nome.includes(termo) || tipo.includes(termo);
    });
  }, [cercas, filtroNome]);

  function iniciarDesenho(f = "poligono") {
    cancelarEdicao(); // não pode desenhar enquanto edita
    setFormato(f);
    setDrawing(true);
    setPontos([]);
    setCentro(null);
    setRaio(200);
    setResultados([]);
  }

  // ---- Edição de cerca existente ----
  function iniciarEdicao(c) {
    cancelarDesenho();
    setEditingId(c.id);
    if (c.formato === "circulo") {
      setEditFormato("circulo");
      setEditCentro(c.centro ? { lat: c.centro.lat, lng: c.centro.lng } : null);
      setEditRaio(Number(c.raio) || 0);
      setEditPontos([]);
    } else {
      setEditFormato("poligono");
      setEditPontos(Array.isArray(c.pontos) ? c.pontos.map(p => [...p]) : []);
      setEditCentro(null);
      setEditRaio(0);
    }
  }
  function cancelarEdicao() {
    setEditingId(null);
    setEditFormato(null);
    setEditPontos([]);
    setEditCentro(null);
    setEditRaio(0);
  }
  async function salvarEdicao() {
    if (!editingId) return;
    setSalvandoEdit(true);
    try {
      const ref = doc(db, "cercas_eletronicas", editingId);
      if (editFormato === "circulo") {
        if (!editCentro || !(editRaio > 0)) return;
        await updateDoc(ref, {
          centro: { lat: editCentro.lat, lng: editCentro.lng },
          raio: Math.round(editRaio),
          atualizadoEm: serverTimestamp(),
          atualizadoPor: user?.email || "—",
        });
      } else {
        if (!editPontos || editPontos.length < 3) return;
        await updateDoc(ref, {
          pontos: editPontos,
          atualizadoEm: serverTimestamp(),
          atualizadoPor: user?.email || "—",
        });
      }
      cancelarEdicao();
    } catch (e) {
      alert("Erro ao salvar edição: " + e.message);
    } finally {
      setSalvandoEdit(false);
    }
  }
  function moverVertice(i, latlng) {
    setEditPontos(prev => prev.map((p, idx) => idx === i ? [latlng.lat, latlng.lng] : p));
  }
  function removerVertice(i) {
    setEditPontos(prev => prev.length > 3 ? prev.filter((_, idx) => idx !== i) : prev);
  }
  function moverCentroEdicao(latlng) {
    setEditCentro({ lat: latlng.lat, lng: latlng.lng });
  }
  function cancelarDesenho() {
    setDrawing(false);
    setPontos([]);
    setCentro(null);
    setModal(false);
    setNome("");
  }
  function concluirDesenho() {
    if (formato === "circulo") {
      if (!centro || !(raio > 0)) return;
    } else {
      if (pontos.length < 3) return;
    }
    setModal(true);
    setDrawing(false);
  }
  function adicionarPonto(latlng) {
    setPontos(prev => [...prev, latlng]);
  }
  function definirCentro(latlng) {
    setCentro(latlng);
  }
  function desfazerPonto() {
    setPontos(prev => prev.slice(0, -1));
  }

  async function buscarEndereco(e) {
    e?.preventDefault();
    const qOriginal = buscaTxt.trim();
    if (!qOriginal) return;
    setBuscando(true);
    setResultados([]);

    // fetch com timeout — evita travar a UI se um provider hangar
    const fetchTimeout = (url, opts = {}, ms = 6000) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
    };

    try {
      // 1) Detecta CEP no input
      const cepMatch = qOriginal.match(/(\d{5})[- ]?(\d{3})/);
      let cepInfo = null;
      let numero = null;
      if (cepMatch) {
        const cep = cepMatch[1] + cepMatch[2];
        try {
          const r = await fetchTimeout(`https://viacep.com.br/ws/${cep}/json/`, {}, 4000);
          if (r.ok) {
            const j = await r.json();
            if (!j.erro) cepInfo = j;
          }
        } catch { /* ViaCEP é opcional, segue sem ele */ }
        const semCep = qOriginal.replace(cepMatch[0], "");
        const numMatch = semCep.match(/\b(\d{1,5})\b/);
        if (numMatch) numero = numMatch[1];
      }

      const mapNominatim = (data) => data.map(d => ({
        nome: d.display_name,
        lat: parseFloat(d.lat),
        lon: parseFloat(d.lon),
      }));

      let lista = [];

      // 2) Quando temos ViaCEP: query ESTRUTURADA no Nominatim (muito mais certeira)
      if (cepInfo) {
        const params = new URLSearchParams({
          format: "json",
          addressdetails: "1",
          limit: "5",
          country: "Brazil",
          state: cepInfo.uf,
          city: cepInfo.localidade,
          street: [numero, cepInfo.logradouro].filter(Boolean).join(" "),
          postalcode: cepInfo.cep || `${cepMatch[1]}-${cepMatch[2]}`,
        });
        try {
          const r = await fetchTimeout(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "Accept-Language": "pt-BR" } });
          if (r.ok) {
            const data = await r.json();
            lista = mapNominatim(data);
          }
        } catch { /* cai pra Nominatim livre com endereço oficial */ }

        // Se a estruturada falhar, tenta livre com o endereço oficial do ViaCEP
        if (lista.length === 0) {
          const txt = [numero, cepInfo.logradouro, cepInfo.bairro, cepInfo.localidade, cepInfo.uf].filter(Boolean).join(", ");
          try {
            const r = await fetchTimeout(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=5&q=${encodeURIComponent(txt)}`, { headers: { "Accept-Language": "pt-BR" } });
            if (r.ok) lista = mapNominatim(await r.json());
          } catch { /* cai pra busca livre normalizada (#3) */ }
        }
      }

      // 3) Sem ViaCEP ou sem hit: busca livre normalizada
      if (lista.length === 0) {
        const norm = qOriginal
          .replace(/\bR\.\s*/gi, "Rua ")
          .replace(/\bAv\.\s*/gi, "Avenida ")
          .replace(/\bAl\.\s*/gi, "Alameda ")
          .replace(/\bTv\.\s*/gi, "Travessa ")
          .replace(/\s*-\s*/g, ", "); // troca traços por vírgula
        try {
          const r = await fetchTimeout(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=5&q=${encodeURIComponent(norm)}`, { headers: { "Accept-Language": "pt-BR" } });
          if (r.ok) lista = mapNominatim(await r.json());
        } catch { /* cai pro fallback aproximado por CEP (#4) */ }
      }

      // 4) Último fallback: aproximado pelo CEP
      if (lista.length === 0 && cepMatch) {
        try {
          const r = await fetchTimeout(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=3&q=${cepMatch[1]}-${cepMatch[2]}`, { headers: { "Accept-Language": "pt-BR" } });
          if (r.ok) {
            const data = await r.json();
            lista = data.map(d => ({
              nome: `(aproximado pelo CEP) ${d.display_name}`,
              lat: parseFloat(d.lat),
              lon: parseFloat(d.lon),
            }));
          }
        } catch { /* todos os fallbacks falharam, alert mostrado abaixo */ }
      }

      if (lista.length === 0) {
        alert("Não achei esse endereço. Tenta: só 'rua, cidade, UF' (sem número, sem CEP, sem abreviações).");
      }
      setResultados(lista);
    } catch (err) {
      alert("Erro ao buscar: " + err.message);
    } finally {
      setBuscando(false);
    }
  }

  function escolherResultado(r) {
    setDestino({ lat: r.lat, lon: r.lon, nome: r.nome });
    setResultados([]);
  }

  async function salvar() {
    if (!nome.trim()) return;
    if (formato === "circulo" && (!centro || !(raio > 0))) return;
    if (formato === "poligono" && pontos.length < 3) return;
    setSalvando(true);
    try {
      const payload = {
        nome: nome.trim(),
        tipo, cor, formato,
        criadoEm: serverTimestamp(),
        criadoPor: user?.email || "—",
      };
      if (formato === "circulo") {
        payload.centro = { lat: centro.lat, lng: centro.lng };
        payload.raio = Math.round(raio);
      } else {
        payload.pontos = pontos;
      }
      await addDoc(collection(db, "cercas_eletronicas"), payload);
      cancelarDesenho();
    } catch (e) {
      alert("Erro ao salvar cerca: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(c) {
    if (!confirm(`Excluir cerca "${c.nome}"?`)) return;
    try {
      await deleteDoc(doc(db, "cercas_eletronicas", c.id));
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  }

  const areaAtual = useMemo(() => {
    if (formato === "circulo") return raio > 0 ? Math.PI * raio * raio : 0;
    return calcularAreaPoligono(pontos);
  }, [formato, pontos, raio]);

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "system-ui" }}>
      {/* Header */}
      <div style={{ padding: "0.6rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/rastreamento")} style={btnGhost}>
            <ArrowLeft size={16} /> Rastreamento
          </button>
          <h1 style={{ margin: 0, color: "#1a3a5c", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 6 }}>
            <MapPin size={18} color="#ea580c" /> Cercas Eletrônicas
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!drawing ? (
            <>
              <button onClick={() => iniciarDesenho("circulo")} style={btnPrimary} title="Cerca circular (centro + raio)">
                <CircleIcon size={14} /> Círculo
              </button>
              <button onClick={() => iniciarDesenho("poligono")} style={btnGhost} title="Cerca por desenho ponto a ponto">
                <Hexagon size={14} /> Polígono
              </button>
            </>
          ) : formato === "circulo" ? (
            <>
              <button onClick={concluirDesenho} disabled={!centro} style={{ ...btnPrimary, background: centro ? "#16a34a" : "#94a3b8" }}>
                <Check size={16} /> Concluir
              </button>
              <button onClick={cancelarDesenho} style={btnGhost}>
                <X size={16} /> Cancelar
              </button>
            </>
          ) : (
            <>
              <button onClick={desfazerPonto} disabled={pontos.length === 0} style={{ ...btnGhost, opacity: pontos.length === 0 ? 0.5 : 1 }}>
                <Undo2 size={14} /> Desfazer ponto
              </button>
              <button onClick={concluirDesenho} disabled={pontos.length < 3} style={{ ...btnPrimary, background: pontos.length >= 3 ? "#16a34a" : "#94a3b8" }}>
                <Check size={16} /> Concluir ({pontos.length})
              </button>
              <button onClick={cancelarDesenho} style={btnGhost}>
                <X size={16} /> Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="cercas-grid">
        {/* Sidebar */}
        <div className="cercas-sidebar">
          {/* Busca de endereço */}
          <div style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
              Buscar local
            </div>
            <form onSubmit={buscarEndereco} style={{ display: "flex", gap: 4 }}>
              <input
                type="text"
                value={buscaTxt}
                onChange={e => setBuscaTxt(e.target.value)}
                placeholder='Endereço, CEP ou local (ex: Replan, 83707-072)'
                style={inputBusca}
              />
              <button type="submit" disabled={buscando} style={{ ...btnPrimary, padding: "0.45rem 0.55rem" }}>
                <Search size={14} />
              </button>
            </form>
            {buscando && <div style={{ marginTop: 6, color: "#94a3b8", fontSize: ".78rem" }}>Buscando...</div>}
            {resultados.length > 0 && (
              <div style={{ marginTop: 6, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, maxHeight: 200, overflowY: "auto" }}>
                {resultados.map((r, i) => (
                  <button key={i} onClick={() => escolherResultado(r)} style={resultBtn}>
                    <Locate size={12} style={{ flexShrink: 0, marginTop: 2 }} color="#ea580c" />
                    <span style={{ fontSize: ".78rem", color: "#475569", textAlign: "left" }}>{r.nome}</span>
                  </button>
                ))}
              </div>
            )}
            {destino && (
              <div style={{ marginTop: 6, fontSize: ".74rem", color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={12} /> Mapa centralizado no local
              </div>
            )}
          </div>

          {/* Lista de cercas */}
          <div style={{ padding: "0.75rem", flex: 1, overflowY: "auto" }}>
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
              Cercas salvas ({cercasFiltradas.length}{filtroNome ? ` / ${cercas.length}` : ""})
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "0.3rem 0.5rem", marginBottom: 8 }}>
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                value={filtroNome}
                onChange={(e) => setFiltroNome(e.target.value)}
                placeholder="Filtrar por nome ou tipo"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: ".82rem", color: "#1a3a5c", minWidth: 0 }}
              />
              {filtroNome && (
                <button onClick={() => setFiltroNome("")} title="Limpar filtro" style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 0, display: "flex" }}>
                  <X size={14} />
                </button>
              )}
            </div>
            {loading && <div style={{ color: "#94a3b8" }}>Carregando...</div>}
            {!loading && cercas.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: ".82rem", padding: "0.75rem", background: "#f8fafc", borderRadius: 6 }}>
                Nenhuma cerca ainda.<br/>
                Use "Buscar local" pra ir pro endereço, depois "+ Nova cerca" e clica no mapa.
              </div>
            )}
            {!loading && cercas.length > 0 && cercasFiltradas.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: ".82rem", padding: "0.5rem", textAlign: "center" }}>
                Nenhuma cerca corresponde a "<strong>{filtroNome}</strong>"
              </div>
            )}
            {cercasFiltradas.map(c => {
              const focusPoint = c.formato === "circulo" && c.centro
                ? [c.centro.lat, c.centro.lng]
                : (c.pontos?.[0] || null);
              const descr = c.formato === "circulo"
                ? `Círculo · raio ${(c.raio || 0).toLocaleString("pt-BR")} m`
                : `Polígono · ${c.pontos?.length || 0} pontos`;
              const sendoEditada = editingId === c.id;
              return (
                <div key={c.id} style={{ padding: "0.55rem 0.65rem", background: sendoEditada ? "#fff7ed" : "#f8fafc", borderRadius: 6, marginBottom: 5, borderLeft: `3px solid ${c.cor}`, cursor: "pointer", boxShadow: sendoEditada ? "0 0 0 2px #ea580c" : "none" }}
                     onClick={() => setFocus(focusPoint)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#1a3a5c", fontSize: ".84rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nome}</div>
                      <div style={{ fontSize: ".7rem", color: "#64748b" }}>
                        {c.tipo} · {descr} · {formatarArea(areaCerca(c))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {sendoEditada ? (
                        <button onClick={(e) => { e.stopPropagation(); cancelarEdicao(); }} title="Cancelar edição" style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 2 }}>
                          <X size={14} />
                        </button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); iniciarEdicao(c); }} title="Editar forma" style={{ background: "transparent", border: "none", color: "#ea580c", cursor: "pointer", padding: 2 }}>
                          <Pencil size={13} />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); excluir(c); }} title="Excluir" style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", padding: 2 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {drawing && formato === "poligono" && (
            <div style={{ padding: "0.75rem", borderTop: "1px solid #e2e8f0", background: "#fef9c3", fontSize: ".8rem", color: "#854d0e" }}>
              <strong>Modo desenho (polígono):</strong> clique no mapa pra adicionar pontos<br/>
              <strong>Pontos:</strong> {pontos.length} {pontos.length < 3 ? `(mín. ${3 - pontos.length} a mais)` : "✓"}<br/>
              {pontos.length >= 3 && (<><strong>Área:</strong> {formatarArea(areaAtual)}</>)}
            </div>
          )}

          {editingId && (
            <div style={{ padding: "0.75rem", borderTop: "1px solid #e2e8f0", background: "#fff7ed", fontSize: ".8rem", color: "#9a3412" }}>
              <strong>Editando cerca</strong>
              <div style={{ fontSize: ".74rem", color: "#9a3412", marginTop: 4 }}>
                {editFormato === "circulo"
                  ? "Arraste o centro pra mover · ajuste o raio abaixo"
                  : "Arraste os pontos pra deformar · clique-direito num ponto pra remover (mín. 3)"}
              </div>
              {editFormato === "circulo" && editCentro && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginBottom: 4 }}><strong>Raio:</strong> {editRaio.toLocaleString("pt-BR")} m</div>
                  <input
                    type="range"
                    min={50}
                    max={5000}
                    step={50}
                    value={editRaio}
                    onChange={(e) => setEditRaio(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".7rem", color: "#a16207", marginBottom: 6 }}>
                    <span>50 m</span><span>5 km</span>
                  </div>
                  <label style={{ fontSize: ".74rem" }}>
                    Valor exato:&nbsp;
                    <input
                      type="number"
                      min={10}
                      max={50000}
                      value={editRaio}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v > 0) setEditRaio(v);
                      }}
                      style={{ width: 90, padding: "2px 6px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: ".8rem" }}
                    /> m
                  </label>
                </div>
              )}
              {editFormato === "poligono" && (
                <div style={{ marginTop: 6, fontSize: ".74rem" }}>
                  <strong>Pontos:</strong> {editPontos.length}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button onClick={salvarEdicao} disabled={salvandoEdit} style={{ ...btnPrimary, background: "#16a34a", flex: 1 }}>
                  <Save size={14} /> {salvandoEdit ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={cancelarEdicao} style={btnGhost}>
                  <X size={14} /> Cancelar
                </button>
              </div>
            </div>
          )}

          {drawing && formato === "circulo" && (
            <div style={{ padding: "0.75rem", borderTop: "1px solid #e2e8f0", background: "#fef9c3", fontSize: ".8rem", color: "#854d0e" }}>
              <strong>Modo desenho (círculo):</strong> {centro ? "centro definido — ajuste o raio abaixo (ou clique de novo no mapa pra mover)" : "clique no mapa pra definir o centro"}<br/>
              {centro && (
                <>
                  <div style={{ marginTop: 6, marginBottom: 4 }}>
                    <strong>Raio:</strong> {raio.toLocaleString("pt-BR")} m
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={5000}
                    step={50}
                    value={raio}
                    onChange={(e) => setRaio(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".7rem", color: "#a16207", marginBottom: 6 }}>
                    <span>50 m</span><span>5 km</span>
                  </div>
                  <label style={{ fontSize: ".74rem", color: "#854d0e" }}>
                    Valor exato:&nbsp;
                    <input
                      type="number"
                      min={10}
                      max={50000}
                      value={raio}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v > 0) setRaio(v);
                      }}
                      style={{ width: 90, padding: "2px 6px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: ".8rem" }}
                    /> m
                  </label>
                  <div style={{ marginTop: 6 }}>
                    <strong>Área:</strong> {formatarArea(areaAtual)}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mapa */}
        <div style={{ position: "relative" }}>
          <MapContainer center={CENTRO} zoom={13} style={{ height: "100%", width: "100%", cursor: drawing ? "crosshair" : "" }}>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Mapa">
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satélite">
                <TileLayer attribution='Tiles &copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
              </LayersControl.BaseLayer>
            </LayersControl>

            <AutoFit cercas={cercas} focus={focus} />
            <FlyTo target={destino} />
            <MapClickHandler
              drawing={drawing}
              formato={formato}
              onClickPoligono={adicionarPonto}
              onClickCirculo={definirCentro}
            />

            {/* Cercas existentes — exceto a que está sendo editada (renderizada com handles abaixo) */}
            {cercas.map(c => {
              if (c.id === editingId) return null;
              const corC = c.cor || "#2563eb";
              const style = { color: corC, weight: 2, fillColor: corC, fillOpacity: 0.2, dashArray: "6,4" };
              const tip = (
                <Tooltip sticky direction="center">
                  <strong>{c.nome}</strong><br/>
                  <span style={{ fontSize: ".74rem", color: "#64748b" }}>{c.tipo} · {formatarArea(areaCerca(c))} · clique pra editar</span>
                </Tooltip>
              );
              const handlers = { click: () => { if (!drawing) iniciarEdicao(c); } };
              if (c.formato === "circulo" && c.centro && Number.isFinite(c.raio)) {
                return (
                  <Circle key={c.id} center={[c.centro.lat, c.centro.lng]} radius={c.raio} pathOptions={style} eventHandlers={handlers}>
                    {tip}
                  </Circle>
                );
              }
              if (Array.isArray(c.pontos) && c.pontos.length >= 3) {
                return (
                  <Polygon key={c.id} positions={c.pontos} pathOptions={style} eventHandlers={handlers}>
                    {tip}
                  </Polygon>
                );
              }
              return null;
            })}

            {/* Cerca em edição — forma sólida + handles arrastáveis */}
            {editingId && editFormato === "circulo" && editCentro && editRaio > 0 && (
              <>
                <Circle
                  center={[editCentro.lat, editCentro.lng]}
                  radius={editRaio}
                  pathOptions={{ color: "#ea580c", weight: 3, fillColor: "#ea580c", fillOpacity: 0.15 }}
                />
                <Marker
                  position={[editCentro.lat, editCentro.lng]}
                  icon={centerHandleIcon()}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const ll = e.target.getLatLng();
                      moverCentroEdicao(ll);
                    },
                  }}
                />
              </>
            )}

            {editingId && editFormato === "poligono" && editPontos.length >= 3 && (
              <>
                <Polygon
                  positions={editPontos}
                  pathOptions={{ color: "#ea580c", weight: 3, fillColor: "#ea580c", fillOpacity: 0.15 }}
                />
                {editPontos.map((pt, i) => (
                  <Marker
                    key={`edit-${i}`}
                    position={pt}
                    icon={editHandleIcon()}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        moverVertice(i, e.target.getLatLng());
                      },
                      contextmenu: () => removerVertice(i),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                      <span style={{ fontSize: ".74rem" }}>Arrastar · clique-direito remove</span>
                    </Tooltip>
                  </Marker>
                ))}
              </>
            )}

            {/* Desenho em andamento — polígono */}
            {drawing && formato === "poligono" && pontos.length >= 2 && (
              <Polyline positions={pontos} pathOptions={{ color: cor, weight: 3, dashArray: "4,4" }} />
            )}
            {drawing && formato === "poligono" && pontos.length >= 3 && (
              <Polygon positions={pontos} pathOptions={{ color: cor, weight: 2, fillColor: cor, fillOpacity: 0.15 }} />
            )}
            {drawing && formato === "poligono" && pontos.map((pt, i) => (
              <Marker key={i} position={pt} icon={vertexIcon()} />
            ))}

            {/* Desenho em andamento — círculo */}
            {drawing && formato === "circulo" && centro && (
              <>
                <Circle center={[centro.lat, centro.lng]} radius={raio} pathOptions={{ color: cor, weight: 2, fillColor: cor, fillOpacity: 0.15, dashArray: "4,4" }} />
                <Marker position={[centro.lat, centro.lng]} icon={vertexIcon()} />
              </>
            )}

            {/* Marcador do destino da busca */}
            {destino && !drawing && (
              <Marker position={[destino.lat, destino.lon]} icon={divIcon({
                html: `<div style="background:#ea580c;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>`,
                className: "destino-pin",
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })}>
                <Tooltip permanent direction="top" offset={[0, -10]}>
                  <strong>{destino.nome.split(",")[0]}</strong>
                </Tooltip>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>

      {/* Modal salvar */}
      {modal && (
        <div style={overlay}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, color: "#1a3a5c", fontSize: "1.05rem" }}>Salvar cerca</h2>
              <button onClick={cancelarDesenho} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: "#f0fdf4", padding: "8px 10px", borderRadius: 6, marginBottom: 12, fontSize: ".82rem", color: "#166534" }}>
              {formato === "circulo"
                ? <><strong>Círculo</strong> · raio <strong>{raio.toLocaleString("pt-BR")} m</strong> · Área: <strong>{formatarArea(areaAtual)}</strong></>
                : <><strong>{pontos.length} pontos</strong> · Área: <strong>{formatarArea(areaAtual)}</strong></>
              }
            </div>

            <label style={lbl}>Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Replan, Base PONTUAL, Posto X..." style={inp} autoFocus />

            <label style={lbl}>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={inp}>
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>

            <label style={lbl}>Cor</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {CORES.map(c => (
                <button key={c.v} onClick={() => setCor(c.v)} style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: c.v,
                  border: cor === c.v ? "3px solid #1a3a5c" : "2px solid #e2e8f0",
                  cursor: "pointer",
                }} title={c.n} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={cancelarDesenho} style={btnGhost}>Cancelar</button>
              <button onClick={salvar} disabled={!nome.trim() || salvando} style={{ ...btnPrimary, opacity: !nome.trim() || salvando ? 0.5 : 1 }}>
                {salvando ? "Salvando..." : "Salvar cerca"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .cercas-grid { display: grid; grid-template-columns: 320px 1fr; height: calc(100vh - 48px); }
        .cercas-sidebar { background: #fff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
        @media (max-width: 700px) {
          .cercas-grid { grid-template-columns: 1fr; grid-template-rows: auto 1fr; height: auto; }
          .cercas-sidebar { max-height: 40vh; }
        }
      `}</style>
    </div>
  );
}

const btnPrimary = { display: "inline-flex", alignItems: "center", gap: 6, padding: "0.5rem 0.85rem", background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: ".84rem" };
const btnGhost = { display: "inline-flex", alignItems: "center", gap: 6, padding: "0.45rem 0.75rem", background: "#fff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: ".82rem" };
const inputBusca = { flex: 1, padding: "0.45rem 0.65rem", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: ".84rem", outline: "none" };
const resultBtn = { display: "flex", alignItems: "flex-start", gap: 6, padding: "0.55rem 0.7rem", width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", textAlign: "left" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
const card = { background: "#fff", borderRadius: 12, padding: "1.25rem", width: 380, maxWidth: "90vw", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" };
const lbl = { display: "block", fontSize: ".74rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 };
const inp = { width: "100%", padding: "0.55rem 0.7rem", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: ".92rem", marginBottom: 12, fontFamily: "system-ui", boxSizing: "border-box" };
