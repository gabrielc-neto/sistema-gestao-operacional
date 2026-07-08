// Aba "Frota" — mapa visual do veículo com posições clicáveis.
// Fluxos: instalar pneu do estoque | remover pneu | rodízio.

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { ESQUEMAS, sugerirEsquema, VIDAS, MOTIVOS_REMOCAO } from "./esquemas";
import { instalarPneu, removerPneu, rodizioPneu, pneusDoVeiculo } from "./movimentacoes";
import { Truck, Package, X, ArrowLeftRight, Trash2, Plus, AlertCircle } from "lucide-react";

const normPlaca = (p) => String(p || "").trim().toUpperCase().replace(/[-\s]\d+$/, "").replace(/[^A-Z0-9]/g, "");

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },
  toolbar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", background: "#fff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" },
  select: { padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: ".9rem", minWidth: 260, background: "#fff" },
  info: { padding: "8px 12px", borderRadius: 8, background: "#dbeafe", color: "#1e40af", fontSize: ".82rem", fontWeight: 600 },
  quadro: { background: "#fff", border: "1.5px solid #1a3a5c", borderRadius: 12, padding: "14px", overflow: "hidden" },
  qHead: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 12, borderBottom: "1.5px solid #1a3a5c" },
  qTit: { fontSize: ".95rem", fontWeight: 800, color: "#1a3a5c", textTransform: "uppercase", letterSpacing: ".03em", display: "inline-flex", alignItems: "center", gap: 8 },
  legend: { display: "flex", gap: 12, flexWrap: "wrap", padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: ".76rem", color: "#475569" },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 6 },
  chip: { width: 14, height: 14, borderRadius: 3, border: "1px solid #cbd5e1" },
  desenho: { position: "relative", background: "linear-gradient(180deg, #dbeafe, #eef2f7)", border: "1.5px solid #cbd5e1", borderRadius: 12, padding: "20px", minHeight: 420, display: "flex", flexDirection: "column", justifyContent: "space-around" },
  err: { padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", fontSize: ".85rem", fontWeight: 600 },
  ok:  { padding: "10px 14px", borderRadius: 8, background: "#dcfce7", color: "#166534", border: "1px solid #86efac", fontSize: ".85rem", fontWeight: 600 },
};

// Card visual de posição (ocupada ou vazia)
function CardPos({ posicao, pneu, onClick }) {
  const ocupada = !!pneu;
  return (
    <div onClick={onClick} style={{
      width: 60, height: 88, borderRadius: 6,
      border: ocupada ? "1.5px solid #1a3a5c" : "1.5px dashed #94a3b8",
      background: ocupada ? "linear-gradient(180deg, #1e293b, #0f172a)" : "repeating-linear-gradient(45deg, #f8fafc, #f8fafc 4px, #e2e8f0 4px, #e2e8f0 8px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      cursor: "pointer", position: "relative",
      color: ocupada ? "#fff" : "#64748b",
      transition: "transform .1s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <div style={{ fontSize: ".55rem", fontWeight: 800, opacity: .8, letterSpacing: ".03em" }}>{posicao}</div>
      {ocupada ? (
        <>
          <div style={{ fontSize: ".72rem", fontWeight: 800, marginTop: 4 }}>{pneu.fogo}</div>
          <div style={{ fontSize: ".55rem", opacity: .75, marginTop: 2 }}>{pneu.marca}</div>
        </>
      ) : (
        <Plus size={16} style={{ marginTop: 6, opacity: .5 }} />
      )}
    </div>
  );
}

function ModalInstalar({ veiculo, posicao, pneusEstoque, onConfirm, onClose }) {
  const [busca, setBusca] = useState("");
  const [pneuId, setPneuId] = useState("");
  const [km, setKm] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pneusEstoque.filter(p => !q || `${p.fogo} ${p.marca} ${p.modelo} ${p.medida}`.toLowerCase().includes(q));
  }, [pneusEstoque, busca]);

  const pneu = pneusEstoque.find(p => p.id === pneuId);

  async function salvar() {
    if (!pneu) { setErro("Selecione um pneu do estoque"); return; }
    if (!km)   { setErro("Informe o KM atual do veículo"); return; }
    setSalvando(true); setErro("");
    try {
      await onConfirm({ pneu, km, obs });
    } catch (e) {
      setErro(e.message || "Erro ao instalar");
      setSalvando(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 20, width: 520, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "#1a3a5c" }}>Instalar pneu · <span style={{ color: "#059669" }}>{posicao}</span></h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8, fontSize: ".82rem", marginBottom: 12 }}>
          Veículo <strong>{veiculo.placa}</strong> · Posição <strong>{posicao}</strong>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Buscar pneu no estoque</label>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nº fogo, marca, medida…" style={{ ...s.select, width: "100%", marginTop: 4 }} />
        </div>

        <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 12 }}>
          {filtrados.length === 0 && <div style={{ padding: 16, textAlign: "center", color: "#94a3b8", fontSize: ".85rem" }}>Nenhum pneu disponível no estoque</div>}
          {filtrados.map(p => (
            <div key={p.id} onClick={() => setPneuId(p.id)} style={{
              padding: "10px 12px", cursor: "pointer",
              background: p.id === pneuId ? "#dbeafe" : "#fff",
              borderBottom: "1px solid #f1f5f9",
              fontSize: ".85rem",
            }}>
              <strong>{p.fogo}</strong> · {p.marca} {p.modelo} · {p.medida} · {VIDAS.find(v => v.id === p.vida)?.label} · sulco {p.sulcoOriginal ?? "—"} mm
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>KM do veículo *</label>
            <input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="Ex: 245800" style={{ ...s.select, width: "100%", marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Obs (opcional)</label>
            <input value={obs} onChange={e => setObs(e.target.value)} placeholder="—" style={{ ...s.select, width: "100%", marginTop: 4 }} />
          </div>
        </div>

        {erro && <div style={{ ...s.err, marginTop: 12 }}>{erro}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
            {salvando ? "Instalando…" : "Instalar pneu"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalRemover({ pneu, veiculo, posicao, onConfirm, onClose }) {
  const [motivo, setMotivo] = useState(MOTIVOS_REMOCAO[0]);
  const [destino, setDestino] = useState("estoque");
  const [km, setKm] = useState("");
  const [sulcoFinal, setSulcoFinal] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!km) { setErro("Informe o KM atual"); return; }
    setSalvando(true); setErro("");
    try {
      await onConfirm({ motivo, destino, km, sulcoFinal, obs });
    } catch (e) {
      setErro(e.message || "Erro ao remover");
      setSalvando(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 20, width: 480, boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "#dc2626" }}>Remover pneu · <span style={{ color: "#1a3a5c" }}>{pneu.fogo}</span></h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: "8px 10px", background: "#fef2f2", borderRadius: 8, fontSize: ".82rem", marginBottom: 12 }}>
          {veiculo.placa} · Posição <strong>{posicao}</strong> · Instalado com {Number(pneu.posicaoAtual?.kmInstalacao || 0).toLocaleString("pt-BR")} km
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Motivo *</label>
            <select value={motivo} onChange={e => setMotivo(e.target.value)} style={{ ...s.select, width: "100%", marginTop: 4 }}>
              {MOTIVOS_REMOCAO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Destino *</label>
            <select value={destino} onChange={e => setDestino(e.target.value)} style={{ ...s.select, width: "100%", marginTop: 4 }}>
              <option value="estoque">Voltar ao estoque</option>
              <option value="recapagem">Enviar pra recapagem</option>
              <option value="sucata">Sucata</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>KM atual *</label>
            <input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="Ex: 320000" style={{ ...s.select, width: "100%", marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Sulco final (mm)</label>
            <input type="number" step="0.1" value={sulcoFinal} onChange={e => setSulcoFinal(e.target.value)} placeholder="Ex: 4.5" style={{ ...s.select, width: "100%", marginTop: 4 }} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Observação</label>
          <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="—" style={{ ...s.select, width: "100%", marginTop: 4, minHeight: 60, resize: "vertical" }} />
        </div>

        {erro && <div style={s.err}>{erro}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
            {salvando ? "Removendo…" : "Confirmar remoção"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalRodizio({ pneu, mapaPosicoes, esquema, km, onConfirm, onClose }) {
  const posOrigem = pneu.posicaoAtual.posicao;
  const posicoesLivres = esquema.posicoes.filter(pos => pos !== posOrigem);
  const [novaPos, setNovaPos] = useState("");
  const [kmAtual, setKmAtual] = useState(km || "");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const pneuNaNova = novaPos ? mapaPosicoes[novaPos] : null;

  async function salvar() {
    if (!novaPos) { setErro("Selecione a nova posição"); return; }
    if (!kmAtual) { setErro("Informe o KM atual"); return; }
    setSalvando(true); setErro("");
    try {
      await onConfirm({ novaPos, pneuB: pneuNaNova || null, km: kmAtual, obs });
    } catch (e) {
      setErro(e.message || "Erro no rodízio");
      setSalvando(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 20, width: 480, boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "#b45309" }}>Rodízio · <span style={{ color: "#1a3a5c" }}>{pneu.fogo}</span></h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: "8px 10px", background: "#fef3c7", borderRadius: 8, fontSize: ".82rem", marginBottom: 12 }}>
          Origem: <strong>{posOrigem}</strong> — para outra posição do mesmo veículo.
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Nova posição *</label>
          <select value={novaPos} onChange={e => setNovaPos(e.target.value)} style={{ ...s.select, width: "100%", marginTop: 4 }}>
            <option value="">— Selecione —</option>
            {posicoesLivres.map(pos => {
              const ocup = mapaPosicoes[pos];
              return <option key={pos} value={pos}>{pos}{ocup ? ` (troca com ${ocup.fogo})` : " (vazia)"}</option>;
            })}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>KM atual *</label>
          <input type="number" value={kmAtual} onChange={e => setKmAtual(e.target.value)} placeholder="Ex: 300000" style={{ ...s.select, width: "100%", marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Obs</label>
          <input value={obs} onChange={e => setObs(e.target.value)} style={{ ...s.select, width: "100%", marginTop: 4 }} />
        </div>

        {erro && <div style={s.err}>{erro}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#b45309", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
            {salvando ? "Aplicando…" : "Confirmar rodízio"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalAcao({ pneu, posicao, onInstalar, onRemover, onRodizio, onClose }) {
  const ocupada = !!pneu;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 20, width: 380, boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: "#1a3a5c" }}>Posição {posicao}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>
        {ocupada ? (
          <>
            <div style={{ padding: 10, background: "#f8fafc", borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontSize: ".85rem", fontWeight: 800 }}>Nº fogo {pneu.fogo}</div>
              <div style={{ fontSize: ".78rem", color: "#64748b", marginTop: 2 }}>{pneu.marca} {pneu.modelo} · {pneu.medida}</div>
              <div style={{ fontSize: ".72rem", color: "#64748b", marginTop: 4 }}>Instalado em {new Date(pneu.posicaoAtual?.dataInstalacao || "").toLocaleDateString("pt-BR")} · {Number(pneu.posicaoAtual?.kmInstalacao || 0).toLocaleString("pt-BR")} km</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={onRodizio} style={{ padding: "11px 14px", borderRadius: 8, border: "1px solid #b45309", background: "#fef3c7", color: "#7c2d12", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <ArrowLeftRight size={16} /> Rodízio
              </button>
              <button onClick={onRemover} style={{ padding: "11px 14px", borderRadius: 8, border: "1px solid #dc2626", background: "#fef2f2", color: "#991b1b", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Trash2 size={16} /> Remover
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: 10, background: "#f8fafc", borderRadius: 8, marginBottom: 14, fontSize: ".85rem", color: "#64748b", textAlign: "center" }}>
              Posição vazia — nenhum pneu instalado.
            </div>
            <button onClick={onInstalar} style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Plus size={16} /> Instalar pneu do estoque
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AbaFrota({ pneus, setPneus, profile }) {
  const [veiculos, setVeiculos] = useState([]);
  const [placa, setPlaca] = useState("");
  const [acao, setAcao] = useState(null); // { modo: "acao"|"instalar"|"remover"|"rodizio", posicao, pneu }
  const [msg, setMsg] = useState({ tipo: "", txt: "" });

  useEffect(() => {
    getDocs(collection(db, "veiculos"))
      .then(snap => setVeiculos(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setVeiculos([]));
  }, []);

  const cavalos = useMemo(() => veiculos.filter(v => v.tipo !== "carreta").sort((a, b) => (a.placa || "").localeCompare(b.placa || "")), [veiculos]);

  const cavalo = useMemo(() => {
    if (!placa) return null;
    return veiculos.find(v => normPlaca(v.placa) === normPlaca(placa)) || null;
  }, [placa, veiculos]);

  // Aplica mesma regra do AbaInspecao pra herdar tipo do conjunto (bitrem/rodotrem)
  const carretasDoCavalo = useMemo(() => {
    if (!cavalo) return { c1: null, c2: null, c3: null };
    const labels = [cavalo.t1, cavalo.t2, cavalo.t3, cavalo.tipo_conjunto].map(x => String(x || "").toLowerCase());
    const isBitrem   = labels.some(l => l.includes("bitrem"));
    const isRodotrem = labels.some(l => l.includes("rodotrem") || l.includes("rodo trem"));
    const tipoGlobal = isBitrem ? "Bitrem" : (isRodotrem ? "Rodotrem" : "");
    const tipoDe = (proprio) => tipoGlobal || proprio || cavalo.tipo_conjunto || "";
    const acha = (p, tipoLabel) => {
      if (!p) return null;
      const base = veiculos.find(v => normPlaca(v.placa) === normPlaca(p)) || { placa: p };
      return { ...base, tipo: "carreta", tipo_conjunto: tipoDe(tipoLabel) || base.tipo_conjunto || "" };
    };
    return {
      c1: acha(cavalo.c1, cavalo.t1),
      c2: acha(cavalo.c2, cavalo.t2),
      c3: acha(cavalo.c3, cavalo.t3),
    };
  }, [cavalo, veiculos]);

  const pneusEstoque = useMemo(() => pneus.filter(p => p.status === "estoque"), [pneus]);

  const autor = () => ({ uid: profile?.uid || "", nome: profile?.nome || profile?.email || "—", email: profile?.email || "" });

  // Handler central: refresha pneus após ação
  const refreshPneu = (pneuId, patch) => {
    setPneus(prev => prev.map(p => p.id === pneuId ? { ...p, ...patch } : p));
  };

  async function handleInstalar(veiculo, posicao, { pneu, km, obs }) {
    const pos = await instalarPneu({ pneu, veiculo, posicao, km, autor: autor(), obs });
    refreshPneu(pneu.id, { status: "em_uso", posicaoAtual: pos });
    setAcao(null);
    setMsg({ tipo: "ok", txt: `Pneu ${pneu.fogo} instalado em ${veiculo.placa} · ${posicao}.` });
    setTimeout(() => setMsg({ tipo: "", txt: "" }), 4000);
  }

  async function handleRemover(pneu, { motivo, destino, km, sulcoFinal, obs }) {
    await removerPneu({ pneu, motivo, destino, km, sulcoFinal: sulcoFinal || null, autor: autor(), obs });
    refreshPneu(pneu.id, { status: destino, posicaoAtual: null });
    setAcao(null);
    setMsg({ tipo: "ok", txt: `Pneu ${pneu.fogo} removido — destino: ${destino}.` });
    setTimeout(() => setMsg({ tipo: "", txt: "" }), 4000);
  }

  async function handleRodizio(pneuA, { novaPos, pneuB, km, obs }) {
    await rodizioPneu({ pneuA, pneuB, novaPosicaoA: novaPos, novaPosicaoB: pneuA.posicaoAtual.posicao, km, autor: autor(), obs });
    setPneus(prev => prev.map(p => {
      if (p.id === pneuA.id) return { ...p, posicaoAtual: { ...p.posicaoAtual, posicao: novaPos, dataInstalacao: new Date().toISOString(), kmInstalacao: Number(km) || 0 } };
      if (pneuB && p.id === pneuB.id) return { ...p, posicaoAtual: { ...p.posicaoAtual, posicao: pneuA.posicaoAtual.posicao, dataInstalacao: new Date().toISOString(), kmInstalacao: Number(km) || 0 } };
      return p;
    }));
    setAcao(null);
    setMsg({ tipo: "ok", txt: `Rodízio aplicado.` });
    setTimeout(() => setMsg({ tipo: "", txt: "" }), 4000);
  }

  return (
    <div style={s.wrap}>
      <div style={s.toolbar}>
        <Truck size={20} color="#1a3a5c" />
        <label style={{ fontSize: ".82rem", fontWeight: 700, color: "#1a3a5c" }}>Veículo:</label>
        <select value={placa} onChange={e => setPlaca(e.target.value)} style={s.select}>
          <option value="">— Selecione o cavalo —</option>
          {cavalos.map(v => <option key={v.id} value={v.placa}>{v.placa} · {v.modelo || "—"}</option>)}
        </select>
        {cavalo && (
          <span style={s.info}>
            <Package size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            {pneusEstoque.length} pneu{pneusEstoque.length === 1 ? "" : "s"} disponível{pneusEstoque.length === 1 ? "" : "is"} no estoque
          </span>
        )}
      </div>

      {msg.txt && <div style={msg.tipo === "ok" ? s.ok : s.err}>{msg.txt}</div>}

      {!cavalo ? (
        <div style={{ background: "#fff", borderRadius: 12, padding: 40, textAlign: "center", color: "#94a3b8" }}>
          Selecione um cavalo pra visualizar o mapa da frota.
        </div>
      ) : (
        <>
          <div style={s.legend}>
            <span style={s.legendItem}><span style={{ ...s.chip, background: "linear-gradient(180deg, #1e293b, #0f172a)", borderColor: "#1a3a5c" }} /> Pneu instalado (clique pra remover/rodízio)</span>
            <span style={s.legendItem}><span style={{ ...s.chip, background: "repeating-linear-gradient(45deg, #f8fafc, #f8fafc 4px, #e2e8f0 4px, #e2e8f0 8px)" }} /> Posição vazia (clique pra instalar)</span>
          </div>

          <QuadroVeiculo titulo="Cavalo Mecânico" veiculo={cavalo} pneus={pneus} onClickPos={(pos, pneu) => setAcao({ modo: "acao", posicao: pos, pneu, veiculo: cavalo })} />
          {carretasDoCavalo.c1 && <QuadroVeiculo titulo="1ª Carreta" veiculo={carretasDoCavalo.c1} pneus={pneus} onClickPos={(pos, pneu) => setAcao({ modo: "acao", posicao: pos, pneu, veiculo: carretasDoCavalo.c1 })} />}
          {carretasDoCavalo.c2 && <QuadroVeiculo titulo="2ª Carreta" veiculo={carretasDoCavalo.c2} pneus={pneus} onClickPos={(pos, pneu) => setAcao({ modo: "acao", posicao: pos, pneu, veiculo: carretasDoCavalo.c2 })} />}
          {carretasDoCavalo.c3 && <QuadroVeiculo titulo="3ª Carreta" veiculo={carretasDoCavalo.c3} pneus={pneus} onClickPos={(pos, pneu) => setAcao({ modo: "acao", posicao: pos, pneu, veiculo: carretasDoCavalo.c3 })} />}
        </>
      )}

      {/* MODAIS */}
      {acao?.modo === "acao" && (
        <ModalAcao
          pneu={acao.pneu} posicao={acao.posicao}
          onInstalar={() => setAcao({ ...acao, modo: "instalar" })}
          onRemover={() => setAcao({ ...acao, modo: "remover" })}
          onRodizio={() => setAcao({ ...acao, modo: "rodizio" })}
          onClose={() => setAcao(null)}
        />
      )}
      {acao?.modo === "instalar" && (
        <ModalInstalar veiculo={acao.veiculo} posicao={acao.posicao} pneusEstoque={pneusEstoque}
          onConfirm={(dados) => handleInstalar(acao.veiculo, acao.posicao, dados)}
          onClose={() => setAcao(null)}
        />
      )}
      {acao?.modo === "remover" && (
        <ModalRemover pneu={acao.pneu} veiculo={acao.veiculo} posicao={acao.posicao}
          onConfirm={(dados) => handleRemover(acao.pneu, dados)}
          onClose={() => setAcao(null)}
        />
      )}
      {acao?.modo === "rodizio" && (
        <ModalRodizio pneu={acao.pneu} esquema={ESQUEMAS[sugerirEsquema(acao.veiculo)]}
          mapaPosicoes={pneusDoVeiculo(pneus, acao.veiculo.placa)}
          onConfirm={(dados) => handleRodizio(acao.pneu, dados)}
          onClose={() => setAcao(null)}
        />
      )}
    </div>
  );
}

// Sub-componente: renderiza quadro (cavalo ou carreta) com posições clicáveis
function QuadroVeiculo({ titulo, veiculo, pneus, onClickPos }) {
  const esquemaId = sugerirEsquema(veiculo);
  const esquema = ESQUEMAS[esquemaId];
  const mapa = pneusDoVeiculo(pneus, veiculo.placa);

  if (!esquema) {
    return (
      <div style={s.quadro}>
        <div style={s.qHead}><div style={s.qTit}>{titulo} · {veiculo.placa}</div></div>
        <div style={{ padding: 24, textAlign: "center", color: "#dc2626" }}>
          <AlertCircle size={20} /> Esquema não identificado. Ajuste o cadastro em /frota.
        </div>
      </div>
    );
  }

  return (
    <div style={s.quadro}>
      <div style={s.qHead}>
        <div style={s.qTit}>{titulo}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: ".7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Placa</span>
          <span style={{ padding: "5px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontFamily: "monospace", fontWeight: 800, color: "#1a3a5c" }}>{veiculo.placa}</span>
        </div>
      </div>
      <div style={s.desenho}>
        {/* Chassi central */}
        <div style={{ position: "absolute", left: "50%", top: 20, bottom: 20, width: 16, transform: "translateX(-50%)", background: "linear-gradient(90deg, #cbd5e1, #94a3b8 50%, #cbd5e1)", border: "1px solid #64748b", borderRadius: 3, zIndex: 0 }} />

        {esquema.eixos.map((eixo, i) => {
          const meio = Math.floor(eixo.posicoes.length / 2);
          const esq = eixo.posicoes.slice(0, meio);
          const dir = eixo.posicoes.slice(meio);
          return (
            <div key={i} style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 24px 1fr", alignItems: "center", padding: "8px 0" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, zIndex: 2 }}>
                {esq.map(pos => <CardPos key={pos} posicao={pos} pneu={mapa[pos]} onClick={() => onClickPos(pos, mapa[pos])} />)}
              </div>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "radial-gradient(#64748b, #334155)", zIndex: 1 }} />
              <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, zIndex: 2 }}>
                {dir.map(pos => <CardPos key={pos} posicao={pos} pneu={mapa[pos]} onClick={() => onClickPos(pos, mapa[pos])} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
