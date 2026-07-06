import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { ESQUEMAS, sugerirEsquema, SULCO_ALERTA, SULCO_CRITICO } from "./esquemas";
import { Check, X, Save, Pen, FileDown } from "lucide-react";

const CHECKLIST_ITENS = [
  "Alinhamento",
  "Balanceamento",
  "Calibragem geral",
  "Pneus (conserto, T.C.)",
  "Reaperto de porcas",
  "Rodas e aros",
];

const normPlaca = (p) => String(p || "").trim().toUpperCase().replace(/[-\s]\d+$/, "").replace(/[^A-Z0-9]/g, "");

// ── ESTILOS ────────────────────────────────────────────────────────────
const s = {
  info: { background: "#dbeafe", border: "1px solid #93c5fd", color: "#1e40af", padding: "10px 14px", borderRadius: 8, fontSize: ".82rem", fontWeight: 600, marginBottom: 14 },

  ficha: { background: "#fff", border: "2px solid #1a3a5c", borderRadius: 10, overflow: "hidden", boxShadow: "0 10px 40px rgba(15,23,42,.10)" },

  fichaHeader: { display: "grid", gridTemplateColumns: "1fr 180px", gap: 0, borderBottom: "2px solid #1a3a5c", background: "linear-gradient(180deg, #f8fafc, #fff)" },
  hData: { padding: "14px 20px", display: "flex", flexDirection: "column", gap: 8 },
  hRow: { display: "grid", gridTemplateColumns: "180px 1fr 110px 130px", gap: 10, alignItems: "center" },
  lbl: { fontSize: ".7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" },
  inp: { padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontFamily: "inherit", fontSize: ".88rem" },
  inpRO: { padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontFamily: "inherit", fontSize: ".88rem", background: "#f1f5f9", color: "#334155" },
  hNumero: { padding: "14px 18px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, #fef2f2, #fff)" },
  hNumeroValor: { fontSize: "2.2rem", fontWeight: 900, color: "#dc2626", letterSpacing: ".04em" },

  rowMid: { display: "grid", gridTemplateColumns: "620px 1fr", borderBottom: "2px solid #1a3a5c" },
  checklist: { padding: "14px 16px", borderRight: "1.5px solid #cbd5e1" },
  h4: { margin: "0 0 10px", fontSize: ".82rem", textTransform: "uppercase", letterSpacing: ".05em", color: "#1a3a5c", fontWeight: 800, textAlign: "center", paddingBottom: 6, borderBottom: "1.5px solid #e2e8f0" },
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: ".82rem" },
  th: { background: "#1a3a5c", color: "#fff", fontWeight: 700, fontSize: ".68rem", padding: "6px 8px", textAlign: "center", border: "1px solid #cbd5e1", textTransform: "uppercase", letterSpacing: ".04em" },
  td: { padding: "6px 8px", textAlign: "center", border: "1px solid #cbd5e1", fontSize: ".82rem" },
  tdItem: { padding: "6px 8px", textAlign: "left", border: "1px solid #cbd5e1", fontWeight: 600, color: "#0f172a" },
  chk: { width: 18, height: 18, cursor: "pointer", accentColor: "#1a3a5c" },
  aviso: { fontSize: ".72rem", color: "#dc2626", fontStyle: "italic", textAlign: "right", marginTop: 6, fontWeight: 700 },
  obs: { padding: "14px 16px", display: "flex", flexDirection: "column" },
  txt: { flex: 1, width: "100%", minHeight: 190, border: "1px solid #cbd5e1", borderRadius: 6, padding: "10px 12px", fontFamily: "inherit", fontSize: ".88rem", resize: "vertical" },

  gridVeic: { display: "grid", gridTemplateColumns: "1fr 1fr" },
  quadro: { borderRight: "1.5px solid #1a3a5c", borderBottom: "1.5px solid #1a3a5c", padding: "12px 14px" },
  qHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: "1.5px solid #1a3a5c" },
  qTit: { fontSize: ".88rem", fontWeight: 800, color: "#1a3a5c", textTransform: "uppercase", letterSpacing: ".03em", display: "inline-flex", alignItems: "center", gap: 8 },
  qNum: { display: "inline-block", background: "#1a3a5c", color: "#fff", padding: "3px 12px", borderRadius: 6, fontSize: ".82rem" },
  qPlacaWrap: { display: "flex", alignItems: "center", gap: 8 },
  qPlaca: { padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontFamily: "inherit", fontSize: ".92rem", fontWeight: 800, color: "#1a3a5c", letterSpacing: ".04em", textTransform: "uppercase", textAlign: "center", width: 130 },

  odomBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px", background: "linear-gradient(90deg, #fff7ed, #fef3c7)", border: "1.5px solid #f59e0b", borderRadius: 10, marginBottom: 12 },
  odomLabel: { fontSize: ".78rem", color: "#7c2d12", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em" },
  odomInp: { padding: "8px 14px", border: "1.5px solid #f59e0b", borderRadius: 8, fontFamily: "inherit", fontSize: "1.05rem", fontWeight: 800, textAlign: "center", background: "#fff", color: "#7c2d12", width: 150, MozAppearance: "textfield" },

  estepeWrap: { background: "linear-gradient(180deg, #f8fafc, #fff)", border: "1.5px dashed #94a3b8", borderRadius: 10, padding: "10px 12px", marginBottom: 10, display: "grid", gridTemplateColumns: "80px 1fr", gap: 10, alignItems: "center" },
  estepeLbl: { fontSize: ".82rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em", textAlign: "center" },

  eixo: { marginBottom: 10, border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fafbfc" },
  eixoHead: { background: "linear-gradient(180deg, #f1f5f9, #f8fafc)", padding: "6px 12px", fontSize: ".72rem", fontWeight: 800, color: "#1a3a5c", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 },
  eixoBody: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: 10 },

  footer: { padding: "18px 24px", display: "grid", gridTemplateColumns: "1fr 320px 1fr", gap: 20, alignItems: "end", background: "linear-gradient(180deg, #f8fafc, #fff)" },
  assinatura: { textAlign: "center" },
  assBox: { border: "2px dashed #94a3b8", borderRadius: 8, height: 90, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: ".82rem", cursor: "pointer" },
  assLbl: { display: "block", fontSize: ".74rem", color: "#1a3a5c", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", marginTop: 6, borderTop: "1px solid #94a3b8", paddingTop: 4 },
  ordem: { textAlign: "center", padding: "8px 12px", background: "#fff", border: "2px solid #1a3a5c", borderRadius: 10 },
  ordemP: { fontSize: ".88rem", fontWeight: 800, color: "#1a3a5c", marginBottom: 10 },
  btnSim: { padding: "10px 28px", borderRadius: 8, border: "2px solid #22c55e", background: "#fff", color: "#14532d", fontWeight: 800, fontSize: "1rem", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 },
  btnSimAct: { padding: "10px 28px", borderRadius: 8, border: "2px solid #22c55e", background: "#22c55e", color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 },
  btnNao: { padding: "10px 28px", borderRadius: 8, border: "2px solid #dc2626", background: "#fff", color: "#7f1d1d", fontWeight: 800, fontSize: "1rem", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 },
  btnNaoAct: { padding: "10px 28px", borderRadius: 8, border: "2px solid #dc2626", background: "#dc2626", color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 },
  horaFinal: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fef2f2", border: "1.5px solid #dc2626", borderRadius: 8, marginTop: 10, justifyContent: "center" },

  actions: { marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" },
  btnCancel: { padding: "12px 26px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#f1f5f9", color: "#475569", fontWeight: 700, cursor: "pointer", fontSize: ".95rem", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 },
  btnPdf:    { padding: "12px 26px", borderRadius: 10, border: "none", background: "#1a3a5c", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: ".95rem", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 },
  btnSalvar: { padding: "12px 26px", borderRadius: 10, border: "none", background: "#059669", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: ".95rem", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 },
  err: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, fontWeight: 600, fontSize: ".85rem", marginTop: 12 },
  ok:  { background: "#dcfce7", border: "1px solid #86efac", color: "#14532d", padding: "10px 14px", borderRadius: 8, fontWeight: 600, fontSize: ".85rem", marginTop: 12 },
};

// ── CARD DO PNEU (formato de pneu real — retângulo com cantos arredondados) ─
function CardPneu({ posicao, dados, onChange }) {
  const sulcoNum = Number(dados?.sulco);
  const status = !Number.isFinite(sulcoNum) || sulcoNum <= 0
    ? "vazio"
    : sulcoNum < SULCO_CRITICO ? "critico"
    : sulcoNum < SULCO_ALERTA  ? "atencao"
    : "ok";

  const cores = {
    vazio:   { border: "#94a3b8", bg: "#f8fafc",           accent: "#94a3b8" },
    ok:      { border: "#16a34a", bg: "linear-gradient(180deg, #f0fdf4, #fff)", accent: "#16a34a" },
    atencao: { border: "#d97706", bg: "linear-gradient(180deg, #fffbeb, #fff)", accent: "#d97706" },
    critico: { border: "#dc2626", bg: "linear-gradient(180deg, #fef2f2, #fff)", accent: "#dc2626" },
  }[status];

  return (
    <div style={{
      border: `2px solid ${cores.border}`,
      borderRadius: 10,
      background: cores.bg,
      padding: "5px 6px",
      display: "flex", flexDirection: "column", gap: 3,
      minHeight: 118, width: "100%",
      boxShadow: "inset 0 -2px 4px rgba(0,0,0,.05)",
      position: "relative",
    }}>
      {/* etiqueta da posição no topo */}
      <div style={{
        background: cores.accent, color: "#fff",
        fontSize: ".64rem", fontWeight: 900, textAlign: "center",
        padding: "2px 4px", borderRadius: 5, letterSpacing: ".04em",
        marginBottom: 2,
      }}>{posicao}</div>

      {/* PSI */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 1 }}>
        <span style={{ fontSize: ".52rem", color: "#64748b", fontWeight: 800, letterSpacing: ".05em", textAlign: "center" }}>PSI</span>
        <NumericInput value={dados?.psi ?? ""} onChange={v => onChange({ ...dados, psi: v })} small />
      </div>

      {/* SULCO */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 1 }}>
        <span style={{ fontSize: ".52rem", color: "#64748b", fontWeight: 800, letterSpacing: ".05em", textAlign: "center" }}>SULCO (mm)</span>
        <NumericInput value={dados?.sulco ?? ""} step="0.1" onChange={v => onChange({ ...dados, sulco: v })} small />
      </div>

      {/* FOGO */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 1, marginTop: 2, paddingTop: 3, borderTop: "1px dashed #e2e8f0" }}>
        <span style={{ fontSize: ".52rem", color: "#64748b", fontWeight: 800, letterSpacing: ".05em", textAlign: "center" }}>Nº FOGO</span>
        <input
          type="text"
          value={dados?.fogo ?? ""}
          onChange={e => onChange({ ...dados, fogo: e.target.value.toUpperCase() })}
          placeholder="—"
          style={{ width: "100%", padding: "3px 4px", border: "1px dashed #cbd5e1", borderRadius: 3, fontSize: ".78rem", fontWeight: 700, textAlign: "center", color: "#1a3a5c", background: "#fff", fontFamily: "inherit" }}
        />
      </div>
    </div>
  );
}

function NumericInput({ value, onChange, step = "1", small = false }) {
  return (
    <input
      type="number" step={step} value={value} onChange={e => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: small ? "3px 3px" : "6px 4px",
        border: "1px solid #cbd5e1", borderRadius: 3,
        fontFamily: "inherit",
        fontSize: small ? ".84rem" : ".95rem",
        fontWeight: 700, textAlign: "center",
        background: "#fff", color: "#0f172a", MozAppearance: "textfield",
      }}
    />
  );
}

// ── QUADRO DE 1 VEÍCULO — layout tabular do preview v2 ───────────────────
function QuadroVeiculo({ ordem, titulo, veiculo, esquemaId, dados, onChange }) {
  if (!veiculo) {
    return (
      <div style={s.quadro}>
        <div style={s.qHead}>
          <div style={s.qTit}><span style={s.qNum}>{ordem}º</span>{titulo}</div>
          <div style={s.qPlacaWrap}>
            <span style={s.lbl}>Placa</span>
            <input type="text" placeholder="—" style={{ ...s.qPlaca, background: "#f1f5f9" }} disabled />
          </div>
        </div>
        <div style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8", fontSize: ".9rem", background: "repeating-linear-gradient(45deg, #f8fafc, #f8fafc 10px, #fff 10px, #fff 20px)", borderRadius: 10 }}>
          Sem carreta atrelada nesta posição
        </div>
      </div>
    );
  }
  const esquema = ESQUEMAS[esquemaId];
  if (!esquema) {
    return (
      <div style={s.quadro}>
        <div style={s.qHead}>
          <div style={s.qTit}><span style={s.qNum}>{ordem}º</span>{titulo}</div>
          <div style={s.qPlacaWrap}>
            <span style={s.lbl}>Placa</span>
            <input type="text" value={veiculo.placa || ""} style={s.qPlaca} readOnly />
          </div>
        </div>
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#dc2626" }}>
          Esquema de posição não identificado para este veículo. Ajuste o cadastro em /frota.
        </div>
      </div>
    );
  }

  const setPneu = (pos, v) => onChange({ ...dados, pneus: { ...(dados?.pneus || {}), [pos]: v } });
  const setEstepe = (v) => onChange({ ...dados, estepe: v });
  const setOdom = (v) => onChange({ ...dados, odometro: v });

  const eLado = esquema.estepeLado; // "esquerda" | "direita" | undefined
  const linhas = esquema.eixos;

  // Layout: grid 5 colunas
  //   col1: estepe (só no 1º eixo se lado=esquerda)
  //   col2: pneus esquerda do eixo
  //   col3: odômetro (só no 1º eixo)
  //   col4: pneus direita do eixo
  //   col5: estepe (só no 1º eixo se lado=direita)
  return (
    <div style={s.quadro}>
      <div style={s.qHead}>
        <div style={s.qTit}><span style={s.qNum}>{ordem}º</span>{titulo}</div>
        <div style={s.qPlacaWrap}>
          <span style={s.lbl}>Placa</span>
          <input type="text" value={veiculo.placa || ""} style={s.qPlaca} readOnly />
        </div>
      </div>

      {/* BLOCO DO ESTEPE (simplificado — só o número de fogo) */}
      {esquema.temEstepe && (
        <div style={{
          display: "flex",
          justifyContent: eLado === "direita" ? "flex-end" : "flex-start",
          marginBottom: 12,
        }}>
          <div style={{
            width: 180,
            border: "2px dashed #94a3b8",
            borderRadius: 10,
            padding: "8px 10px",
            background: "#f8fafc",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              background: "#94a3b8", color: "#fff",
              fontSize: ".62rem", fontWeight: 900,
              padding: "2px 8px", borderRadius: 5,
              letterSpacing: ".05em",
            }}>ESTEPE</div>
            <input
              type="text"
              value={dados?.estepe?.fogo ?? ""}
              onChange={e => setEstepe({ ...(dados?.estepe || {}), fogo: e.target.value.toUpperCase() })}
              placeholder="Nº de fogo"
              style={{
                flex: 1, padding: "5px 8px",
                border: "1px dashed #cbd5e1", borderRadius: 4,
                fontSize: ".82rem", fontWeight: 700, textAlign: "center",
                color: "#1a3a5c", background: "#fff", fontFamily: "inherit",
              }}
            />
          </div>
        </div>
      )}

      {/* GRID DE EIXOS — 3 colunas: pneus esq | odômetro | pneus dir */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 120px 1fr",
        gap: 14,
        alignItems: "start",
        padding: "6px 0",
        justifyContent: "center",
      }}>
        {linhas.map((eixo, i) => {
          const meio = Math.floor(eixo.posicoes.length / 2);
          const esq  = eixo.posicoes.slice(0, meio);
          const dir  = eixo.posicoes.slice(meio);

          return (
            <>
              {/* pneus esquerda */}
              <div key={`esq-${i}`} style={{ display: "grid", gridTemplateColumns: `repeat(${esq.length}, 1fr)`, gap: 8 }}>
                {esq.map(pos => (
                  <CardPneu key={pos} posicao={pos}
                    dados={(dados?.pneus || {})[pos] || {}}
                    onChange={v => setPneu(pos, v)} />
                ))}
              </div>

              {/* odômetro (só na primeira linha; nas outras: divisão do chassi) */}
              {i === 0 ? (
                <div key={`odom-${i}`} style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 4,
                  padding: 10, border: "1.5px solid #f59e0b",
                  borderRadius: 10, background: "linear-gradient(180deg, #fff7ed, #fef3c7)",
                  minHeight: 118, justifyContent: "center",
                }}>
                  <div style={s.odomLabel}>ODÔMETRO</div>
                  <input
                    type="number" value={dados?.odometro ?? ""}
                    onChange={e => setOdom(e.target.value)} placeholder="KM"
                    style={{ ...s.odomInp, width: "100%", fontSize: ".95rem" }}
                  />
                  <div style={{ fontSize: ".62rem", color: "#92400e", fontStyle: "italic" }}>Manual</div>
                </div>
              ) : (
                <div key={`odom-empty-${i}`} style={{
                  minHeight: 118,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{
                    width: 30, height: "80%",
                    background: "repeating-linear-gradient(180deg, #cbd5e1 0 6px, transparent 6px 12px)",
                    borderRadius: 4,
                  }} />
                </div>
              )}

              {/* pneus direita */}
              <div key={`dir-${i}`} style={{ display: "grid", gridTemplateColumns: `repeat(${dir.length}, 1fr)`, gap: 8 }}>
                {dir.map(pos => (
                  <CardPneu key={pos} posicao={pos}
                    dados={(dados?.pneus || {})[pos] || {}}
                    onChange={v => setPneu(pos, v)} />
                ))}
              </div>
            </>
          );
        })}
      </div>
    </div>
  );
}

// ── ABA INSPEÇÃO (COMPONENTE PRINCIPAL) ─────────────────────────────────
export default function AbaInspecao({ pneus, setPneus, profile }) {
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState("");

  const [numero, setNumero] = useState(null);
  const [dataFicha]      = useState(new Date().toISOString().slice(0, 10));
  const [horaInicio]     = useState(new Date().toTimeString().slice(0, 5));
  const [horaFinal, setHoraFinal] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [placaCavalo, setPlacaCavalo] = useState("");
  const [checklist, setChecklist] = useState({}); // { alinhamento_1: true, ... }
  const [observacoes, setObservacoes] = useState("");
  const [dadosVeic, setDadosVeic] = useState({}); // { cavalo: {...}, carreta1: {...}, ... }
  const [ordemOK, setOrdemOK] = useState(null); // "sim" | "nao" | null

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, "veiculos"), orderBy("placa"))).catch(() => null),
      getDocs(collection(db, "motoristas")).catch(() => null),
      getDocs(query(collection(db, "pneu_inspecoes"), orderBy("numero", "desc"))).catch(() => null),
    ]).then(([vs, ms, ins]) => {
      if (vs) setVeiculos(vs.docs.map(d => ({ id: d.id, ...d.data() })));
      if (ms) {
        const lista = ms.docs.map(d => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
        setMotoristas(lista);
      }
      // próximo número = último + 1 (default 1)
      if (ins && ins.docs.length > 0) {
        const ultimo = ins.docs[0].data();
        setNumero(Number(ultimo.numero) + 1 || 1);
      } else {
        setNumero(1);
      }
      setCarregado(true);
    });
  }, []);

  // Cavalo selecionado + carretas atreladas
  const cavalo = useMemo(() => {
    if (!placaCavalo) return null;
    return veiculos.find(v => normPlaca(v.placa) === normPlaca(placaCavalo)) || null;
  }, [placaCavalo, veiculos]);

  const carretas = useMemo(() => {
    if (!cavalo) return { c1: null, c2: null, c3: null };
    const acha = (p) => {
      if (!p) return null;
      return veiculos.find(v => normPlaca(v.placa) === normPlaca(p)) || { placa: p };
    };
    return { c1: acha(cavalo.c1), c2: acha(cavalo.c2), c3: acha(cavalo.c3) };
  }, [cavalo, veiculos]);

  const cavalosFrota  = useMemo(() => veiculos.filter(v => v.tipo !== "carreta"), [veiculos]);

  function toggleCheck(item, coluna) {
    const key = `${item}_${coluna}`;
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const quemSou = () => ({
    uid:   profile?.uid || "",
    email: profile?.email || "",
    nome:  profile?.nome || profile?.email || "—",
  });

  async function salvar() {
    setErro(""); setSucesso("");
    if (!placaCavalo)     { setErro("Selecione o veículo (cavalo)."); return; }
    if (!motoristaId)     { setErro("Selecione o motorista.");        return; }
    if (ordemOK == null)  { setErro("Responda se o veículo está em ordem para seguir viagem."); return; }

    setSalvando(true);
    try {
      const agora = new Date();
      const supervisor = quemSou();
      const motorista = motoristas.find(m => m.id === motoristaId) || null;

      // Estrutura dos veículos
      const buildVeicPayload = (slot, v, esquemaId) => {
        const dv = dadosVeic[slot] || {};
        return {
          slot, placa: v?.placa || "", tipo: v?.tipo || "", esquemaId,
          odometro: dv.odometro ? Number(dv.odometro) : null,
          estepe: dv.estepe || null,
          pneus: dv.pneus || {},
        };
      };
      const veicsPayload = [];
      const esqCavalo = sugerirEsquema(cavalo);
      veicsPayload.push({ slot: "cavalo", ordem: 1, titulo: "Cavalo Mecânico", ...buildVeicPayload("cavalo", cavalo, esqCavalo) });
      if (carretas.c1) veicsPayload.push({ slot: "carreta1", ordem: 2, titulo: "1ª Carreta", ...buildVeicPayload("carreta1", carretas.c1, sugerirEsquema(carretas.c1)) });
      if (carretas.c2) veicsPayload.push({ slot: "carreta2", ordem: 3, titulo: "2ª Carreta", ...buildVeicPayload("carreta2", carretas.c2, sugerirEsquema(carretas.c2)) });
      if (carretas.c3) veicsPayload.push({ slot: "carreta3", ordem: 4, titulo: "3ª Carreta", ...buildVeicPayload("carreta3", carretas.c3, sugerirEsquema(carretas.c3)) });

      const payload = {
        numero,
        data: dataFicha,
        horaInicio,
        horaFinal: horaFinal || agora.toTimeString().slice(0, 5),
        supervisor,
        motorista: motorista ? { id: motorista.id, nome: motorista.nome } : null,
        checklist,
        observacoes: observacoes.trim(),
        veiculos: veicsPayload,
        respostaOrdem: ordemOK,
        status: "concluida",
        criadoEm: agora.toISOString(),
        criadoPor: supervisor.email || supervisor.nome,
      };

      const ref = await addDoc(collection(db, "pneu_inspecoes"), payload);

      // Efeito: atualiza sulcoAtual de cada pneu (matching por fogo)
      let atualizados = 0;
      for (const veic of veicsPayload) {
        const todosPneus = [];
        if (veic.estepe?.fogo) todosPneus.push({ ...veic.estepe, posicao: "EST" });
        Object.entries(veic.pneus || {}).forEach(([pos, d]) => {
          if (d?.fogo) todosPneus.push({ ...d, posicao: pos });
        });
        for (const p of todosPneus) {
          const fogo = String(p.fogo || "").trim().toUpperCase();
          if (!fogo) continue;
          const alvo = pneus.find(x => String(x.fogo || "").trim().toUpperCase() === fogo);
          if (!alvo) continue;
          const sulcoNovo = Number(p.sulco);
          if (!Number.isFinite(sulcoNovo)) continue;
          try {
            await updateDoc(doc(db, "pneus", alvo.id), {
              sulcoAtual: sulcoNovo,
              status: "em_uso",
              posicaoAtual: {
                veiculoPlaca: veic.placa, slot: veic.slot, posicao: p.posicao,
                atualizadoEm: agora.toISOString(),
              },
              ultimaInspecaoId: ref.id,
              ultimaInspecaoEm: agora.toISOString(),
            });
            atualizados++;
          } catch (e) { console.warn("[inspecao] falha update pneu", fogo, e); }
        }
      }
      // Reflete no state local
      setPneus(prev => prev.map(x => {
        const fogo = String(x.fogo || "").trim().toUpperCase();
        for (const veic of veicsPayload) {
          const pneus = veic.pneus || {};
          for (const [pos, d] of Object.entries(pneus)) {
            if (String(d?.fogo || "").trim().toUpperCase() === fogo) {
              return { ...x, sulcoAtual: Number(d.sulco), status: "em_uso", posicaoAtual: { veiculoPlaca: veic.placa, slot: veic.slot, posicao: pos, atualizadoEm: agora.toISOString() } };
            }
          }
          if (veic.estepe?.fogo && String(veic.estepe.fogo).trim().toUpperCase() === fogo) {
            return { ...x, sulcoAtual: Number(veic.estepe.sulco), status: "em_uso", posicaoAtual: { veiculoPlaca: veic.placa, slot: veic.slot, posicao: "EST", atualizadoEm: agora.toISOString() } };
          }
        }
        return x;
      }));

      setSucesso(`Ficha nº ${numero} salva. ${atualizados} pneu${atualizados === 1 ? "" : "s"} do estoque teve o sulco atualizado.`);
      // Reset parcial
      setPlacaCavalo(""); setMotoristaId(""); setChecklist({}); setObservacoes(""); setDadosVeic({}); setOrdemOK(null); setHoraFinal("");
      setNumero(numero + 1);
    } catch (e) {
      setErro("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  if (!carregado) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Carregando…</div>;

  return (
    <div>
      <div style={s.info}>
        Preencha a ficha. Ao salvar, o sulco de cada pneu identificado por fogo é atualizado automaticamente e a inspeção fica arquivada em <strong>pneu_inspecoes</strong>. Assinaturas digitais e PDF chegam em breve.
      </div>

      <div style={s.ficha}>
        {/* HEADER */}
        <div style={s.fichaHeader}>
          <div style={s.hData}>
            <div style={s.hRow}>
              <span style={s.lbl}>Data</span>
              <input type="date" value={dataFicha} readOnly style={s.inpRO} />
              <span style={s.lbl}>Hora início</span>
              <input type="time" value={horaInicio} readOnly style={s.inpRO} />
            </div>
            <div style={s.hRow}>
              <span style={s.lbl}>Supervisor de Manutenção</span>
              <input type="text" value={quemSou().nome} readOnly style={{ ...s.inpRO, gridColumn: "2 / -1" }} />
            </div>
            <div style={s.hRow}>
              <span style={s.lbl}>Motorista</span>
              <select value={motoristaId} onChange={e => setMotoristaId(e.target.value)} style={{ ...s.inp, gridColumn: "2 / -1" }}>
                <option value="">— Selecione —</option>
                {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <div style={s.hRow}>
              <span style={s.lbl}>Cavalo Mecânico (placa)</span>
              <select value={placaCavalo} onChange={e => setPlacaCavalo(e.target.value)} style={{ ...s.inp, gridColumn: "2 / -1" }}>
                <option value="">— Selecione o cavalo —</option>
                {cavalosFrota.map(v => (
                  <option key={v.id} value={v.placa}>{v.placa}{v.modelo ? ` — ${v.modelo}` : ""}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={s.hNumero}>
            <span style={s.lbl}>Nº</span>
            <div style={s.hNumeroValor}>{numero || "…"}</div>
          </div>
        </div>

        {/* CHECKLIST + OBSERVACOES */}
        <div style={s.rowMid}>
          <div style={s.checklist}>
            <h4 style={s.h4}>Itens a verificar</h4>
            <table style={s.tbl}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: 24 }}></th>
                  <th style={{ ...s.th, textAlign: "left" }}>Item</th>
                  <th style={s.th}>Item Nº</th>
                  <th style={s.th}>Aviso [X]</th>
                  <th style={s.th}>1º</th><th style={s.th}>2º</th><th style={s.th}>3º</th><th style={s.th}>4º</th>
                </tr>
              </thead>
              <tbody>
                {CHECKLIST_ITENS.map((item, i) => (
                  <tr key={item}>
                    <td style={{ ...s.td, background: "#f8fafc", fontWeight: 700, color: "#64748b" }}>{i + 1}</td>
                    <td style={s.tdItem}>{item}</td>
                    <td style={s.td}>{i + 1}</td>
                    <td style={s.td}><input type="checkbox" checked={!!checklist[`${item}_aviso`]} onChange={() => toggleCheck(item, "aviso")} style={s.chk} /></td>
                    {[1,2,3,4].map(n => (
                      <td key={n} style={s.td}><input type="checkbox" checked={!!checklist[`${item}_${n}`]} onChange={() => toggleCheck(item, n)} style={s.chk} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={s.aviso}>Assinale com [X] o Nº do veículo</div>
          </div>
          <div style={s.obs}>
            <h4 style={s.h4}>Observações</h4>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} style={s.txt} placeholder="Registre aqui qualquer particularidade da inspeção…" />
          </div>
        </div>

        {/* QUADROS */}
        <div style={s.gridVeic}>
          <QuadroVeiculo ordem={1} titulo="Cavalo Mecânico" veiculo={cavalo} esquemaId={sugerirEsquema(cavalo)} dados={dadosVeic.cavalo}   onChange={d => setDadosVeic(prev => ({ ...prev, cavalo: d }))} />
          <QuadroVeiculo ordem={2} titulo="1ª Carreta"      veiculo={carretas.c1} esquemaId={sugerirEsquema(carretas.c1)} dados={dadosVeic.carreta1} onChange={d => setDadosVeic(prev => ({ ...prev, carreta1: d }))} />
          <QuadroVeiculo ordem={3} titulo="2ª Carreta"      veiculo={carretas.c2} esquemaId={sugerirEsquema(carretas.c2)} dados={dadosVeic.carreta2} onChange={d => setDadosVeic(prev => ({ ...prev, carreta2: d }))} />
          <QuadroVeiculo ordem={4} titulo="3ª Carreta"      veiculo={carretas.c3} esquemaId={sugerirEsquema(carretas.c3)} dados={dadosVeic.carreta3} onChange={d => setDadosVeic(prev => ({ ...prev, carreta3: d }))} />
        </div>

        {/* RODAPÉ */}
        <div style={s.footer}>
          <div style={s.assinatura}>
            <div style={s.assBox} onClick={() => alert("Assinatura digital via canvas — chega em versão futura")}>
              <Pen size={18} style={{ marginRight: 6 }} />Toque para assinar
            </div>
            <label style={s.assLbl}>Assinatura do Supervisor de Manutenção</label>
          </div>
          <div style={s.ordem}>
            <div style={s.ordemP}>O veículo está em ordem para seguir viagem?</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button type="button" style={ordemOK === "sim" ? s.btnSimAct : s.btnSim} onClick={() => setOrdemOK("sim")}>
                <Check size={16} /> SIM
              </button>
              <button type="button" style={ordemOK === "nao" ? s.btnNaoAct : s.btnNao} onClick={() => setOrdemOK("nao")}>
                <X size={16} /> NÃO
              </button>
            </div>
            <div style={s.horaFinal}>
              <label style={{ fontSize: ".72rem", fontWeight: 800, color: "#dc2626", textTransform: "uppercase" }}>Hora Final:</label>
              <input type="time" value={horaFinal} onChange={e => setHoraFinal(e.target.value)} style={{ padding: "5px 8px", border: "1px solid #cbd5e1", borderRadius: 5, fontFamily: "inherit", fontSize: ".9rem", fontWeight: 700, width: 90 }} />
            </div>
          </div>
          <div style={s.assinatura}>
            <div style={s.assBox} onClick={() => alert("Assinatura digital via canvas — chega em versão futura")}>
              <Pen size={18} style={{ marginRight: 6 }} />Toque para assinar
            </div>
            <label style={s.assLbl}>Assinatura do Motorista</label>
          </div>
        </div>
      </div>

      {erro    && <div style={s.err}>{erro}</div>}
      {sucesso && <div style={s.ok}>{sucesso}</div>}

      <div style={s.actions}>
        <button type="button" style={s.btnCancel} onClick={() => { setPlacaCavalo(""); setMotoristaId(""); setChecklist({}); setObservacoes(""); setDadosVeic({}); setOrdemOK(null); }}>
          Limpar
        </button>
        <button type="button" style={s.btnPdf} onClick={() => alert("PDF idêntico ao papel chega na Fase 5")}>
          <FileDown size={16} /> Gerar PDF
        </button>
        <button type="button" style={{ ...s.btnSalvar, opacity: salvando ? 0.6 : 1 }} onClick={salvar} disabled={salvando}>
          <Save size={16} /> {salvando ? "Salvando…" : "Salvar Inspeção"}
        </button>
      </div>
    </div>
  );
}
