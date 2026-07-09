import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import LogoPontual from "../components/LogoPontual";
import { ArrowLeft, Package, MapPin, RefreshCw, ClipboardCheck, Plus, Calendar } from "lucide-react";
import { VIDAS, STATUS_PNEU } from "../pneus/esquemas";

const fmtBRL = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR"); } catch { return iso; }
};

const s = {
  root: { minHeight: "100vh", background: "var(--bg)", fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 5 },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  backBtn: { padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #cbd5e1", color: "#475569", cursor: "pointer", fontWeight: 600, fontSize: ".82rem", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 },

  main: { padding: 20, maxWidth: 1200, margin: "0 auto" },

  card: { background: "#fff", borderRadius: 12, padding: "1.25rem 1.5rem", boxShadow: "0 1px 3px rgba(15,23,42,.05), 0 4px 12px -8px rgba(15,23,42,.10)", marginBottom: 16 },

  headerCard: { background: "linear-gradient(135deg, #1a3a5c, #234775)", color: "#fff", borderRadius: 14, padding: "1.5rem 1.75rem", marginBottom: 16, boxShadow: "0 4px 20px rgba(26,58,92,.25)" },
  fogo: { fontSize: "2rem", fontWeight: 900, letterSpacing: "0.03em", marginBottom: 4 },
  marca: { fontSize: "1.15rem", fontWeight: 700, opacity: 0.95 },
  spec: { fontSize: ".88rem", opacity: 0.85, marginTop: 6 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 },
  kpiCard: (bg) => ({ background: bg, borderRadius: 10, padding: "12px 16px", boxShadow: "0 1px 3px rgba(15,23,42,.05)" }),
  kpiLbl: { fontSize: ".72rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, opacity: 0.85, marginBottom: 4 },
  kpiVal: { fontSize: "1.4rem", fontWeight: 800, lineHeight: 1 },

  sectionTitle: { display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px", color: "#1a3a5c", fontSize: "1rem", fontWeight: 800 },

  timeline: { position: "relative", paddingLeft: 30 },
  timeLine: { position: "absolute", left: 12, top: 6, bottom: 6, width: 2, background: "#e2e8f0" },
  event: { position: "relative", marginBottom: 20 },
  eventDot: (cor) => ({ position: "absolute", left: -22, top: 4, width: 20, height: 20, borderRadius: "50%", background: cor, border: "3px solid #fff", boxShadow: "0 0 0 1px " + cor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }),
  eventBody: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px" },
  eventTop: { display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 },
  eventTitle: { fontSize: ".92rem", fontWeight: 800, color: "#1a3a5c" },
  eventData: { fontSize: ".72rem", color: "#94a3b8", fontWeight: 600 },
  eventContent: { fontSize: ".82rem", color: "#475569", marginTop: 4, lineHeight: 1.45 },

  empty: { padding: "3rem 1rem", textAlign: "center", color: "#94a3b8" },
};

// ── COR DA VIDA ──
function vidaCor(vida) {
  return {
    novo:       { bg: "#dcfce7", cor: "#14532d" },
    recapado_1: { bg: "#cffafe", cor: "#155e75" },
    recapado_2: { bg: "#fef3c7", cor: "#78350f" },
    recapado_3: { bg: "#fee2e2", cor: "#7f1d1d" },
  }[vida] || { bg: "#f1f5f9", cor: "#475569" };
}

// ── SULCO STATUS ──
function sulcoStatus(sulco) {
  const v = Number(sulco);
  if (!Number.isFinite(v) || v <= 0) return { bg: "#f1f5f9", cor: "#64748b", label: "Sem medida" };
  if (v <= 4)  return { bg: "#fee2e2", cor: "#7f1d1d", label: "Trocar" };       // ≤ 4 mm
  if (v <= 6)  return { bg: "#ffedd5", cor: "#7c2d12", label: "Atenção" };      // 5-6 mm
  if (v <  15) return { bg: "#fef3c7", cor: "#78350f", label: "Bom" };          // 7-14 mm
  return { bg: "#dcfce7", cor: "#14532d", label: "Novo" };                       // ≥ 15 mm
}

export default function FichaPneu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pneu, setPneu] = useState(null);
  const [inspecoes, setInspecoes] = useState([]);
  const [recapagens, setRecapagens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const [snapPneu, snapInsp, snapRecap] = await Promise.all([
          getDoc(doc(db, "pneus", id)),
          getDocs(collection(db, "pneu_inspecoes")),
          getDocs(query(collection(db, "pneu_recapagens"), where("pneuId", "==", id))),
        ]);
        if (snapPneu.exists()) setPneu({ id: snapPneu.id, ...snapPneu.data() });
        // Filtra inspecoes que tenham o fogo desse pneu em algum veic/posicao
        setInspecoes(snapInsp.docs.map(d => ({ id: d.id, ...d.data() })));
        setRecapagens(snapRecap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn("[ficha-pneu] falha:", e);
      } finally { setLoading(false); }
    }
    carregar();
  }, [id]);

  const eventos = useMemo(() => {
    if (!pneu) return [];
    const list = [];

    // Cadastro
    if (pneu.criadoEm) {
      list.push({
        id: "cadastro",
        data: pneu.criadoEm,
        tipo: "cadastro",
        titulo: "Pneu cadastrado no estoque",
        cor: "#0891b2",
        Icon: Plus,
        conteudo: `${pneu.marca} ${pneu.modelo || ""} · Medida ${pneu.medida} · DOT ${pneu.dot || "—"} · Sulco original ${pneu.sulcoOriginal ?? "—"} mm · Custo ${fmtBRL(pneu.custoAquisicao)} · Fornecedor ${pneu.fornecedor || "—"}`,
      });
    }

    // Inspeções onde o fogo aparece
    const fogoAlvo = String(pneu.fogo || "").trim().toUpperCase();
    for (const insp of inspecoes) {
      let achado = null;
      for (const veic of (insp.veiculos || [])) {
        // Estepe
        if (veic.estepe?.fogo && String(veic.estepe.fogo).trim().toUpperCase() === fogoAlvo) {
          achado = { posicao: "ESTEPE", placa: veic.placa, sulco: veic.estepe.sulco, psi: veic.estepe.psi };
          break;
        }
        // Posições
        for (const [pos, d] of Object.entries(veic.pneus || {})) {
          if (String(d?.fogo || "").trim().toUpperCase() === fogoAlvo) {
            achado = { posicao: pos, placa: veic.placa, sulco: d.sulco, psi: d.psi };
            break;
          }
        }
        if (achado) break;
      }
      if (achado) {
        list.push({
          id: `insp-${insp.id}`,
          data: insp.criadoEm,
          tipo: "inspecao",
          titulo: `Inspeção nº ${insp.numero} · ${achado.placa} · ${achado.posicao}`,
          cor: "#7c3aed",
          Icon: ClipboardCheck,
          conteudo: `Sulco medido: ${achado.sulco != null ? achado.sulco + " mm" : "—"} · PSI: ${achado.psi ?? "—"} · Supervisor: ${insp.supervisor?.nome || "—"}${insp.motorista?.nome ? " · Motorista: " + insp.motorista.nome : ""}`,
        });
      }
    }

    // Recapagens (envios + retornos)
    for (const r of recapagens) {
      if (r.tipo === "envio") {
        list.push({
          id: `env-${r.id}`,
          data: r.criadoEm || r.dataEnvio,
          tipo: "envio_recap",
          titulo: `Enviado pra recapagem — ${r.fornecedor}`,
          cor: "#b45309",
          Icon: RefreshCw,
          conteudo: `Vida antes: ${VIDAS.find(v => v.id === r.vidaAntes)?.label || r.vidaAntes} · Sulco antes: ${r.sulcoAntes ?? "—"} mm · Custo estimado: ${fmtBRL(r.custoEstimado)}${r.obs ? " · " + r.obs : ""}`,
        });
      } else if (r.tipo === "retorno") {
        list.push({
          id: `ret-${r.id}`,
          data: r.criadoEm || r.dataRetorno,
          tipo: "retorno_recap",
          titulo: `Retornou da recapagem`,
          cor: "#059669",
          Icon: Package,
          conteudo: `Nova vida: ${VIDAS.find(v => v.id === r.vidaDepois)?.label || r.vidaDepois} · Novo sulco: ${r.sulcoDepois ?? "—"} mm · Custo real: ${fmtBRL(r.custoReal)}${r.obsRetorno ? " · " + r.obsRetorno : ""}`,
        });
      }
    }

    // Ordena por data DESC
    list.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    return list;
  }, [pneu, inspecoes, recapagens]);

  const stats = useMemo(() => {
    if (!pneu) return {};
    const custoOriginal = Number(pneu.custoAquisicao) || 0;
    const custoRecap = (pneu.historicoRecapagens || []).reduce((s, r) => s + (Number(r.custoReal) || 0), 0);
    return {
      custoTotal: custoOriginal + custoRecap,
      qtdRecap: (pneu.historicoRecapagens || []).length,
      qtdInspecoes: eventos.filter(e => e.tipo === "inspecao").length,
    };
  }, [pneu, eventos]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Carregando…</div>;
  if (!pneu)   return (
    <div style={s.root}>
      <header style={s.header}>
        <div style={s.headerLeft}><LogoPontual height={30} /></div>
        <button style={s.backBtn} onClick={() => navigate("/pneus")}><ArrowLeft size={14} /> Voltar</button>
      </header>
      <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Pneu não encontrado.</div>
    </div>
  );

  const vc = vidaCor(pneu.vida);
  const sc = sulcoStatus(pneu.sulcoAtual);
  const statusInfo = STATUS_PNEU.find(x => x.id === pneu.status) || { label: pneu.status, cor: "#64748b", bg: "#f1f5f9" };

  return (
    <div style={s.root}>
      <header style={s.header} className="pg-header">
        <div style={s.headerLeft} className="pg-header-center">
          <LogoPontual height={30} />
          <div>
            <h1 style={{ margin: 0, color: "#1a3a5c", fontSize: "1.05rem", fontWeight: 800 }}>Ficha do Pneu</h1>
            <p style={{ margin: 0, fontSize: ".72rem", color: "#64748b" }}>Histórico completo</p>
          </div>
        </div>
        <div className="pg-header-actions">
          <button style={s.backBtn} onClick={() => navigate("/pneus")}><ArrowLeft size={14} /> Voltar</button>
        </div>
      </header>

      <main style={s.main} className="pg-body">
        {/* HEADER DO PNEU */}
        <div style={s.headerCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: ".72rem", opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>Nº de Fogo</div>
              <div style={s.fogo}>{pneu.fogo}</div>
              <div style={s.marca}>{pneu.marca} {pneu.modelo || ""}</div>
              <div style={s.spec}>Medida {pneu.medida} · DOT {pneu.dot || "—"} · Fornecedor {pneu.fornecedor || "—"}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
              <span style={{ background: statusInfo.bg, color: statusInfo.cor, padding: "3px 12px", borderRadius: 20, fontSize: ".78rem", fontWeight: 800 }}>{statusInfo.label}</span>
              <span style={{ background: vc.bg, color: vc.cor, padding: "3px 12px", borderRadius: 20, fontSize: ".78rem", fontWeight: 800 }}>{VIDAS.find(v => v.id === pneu.vida)?.label || pneu.vida}</span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={s.kpiGrid}>
          <div style={s.kpiCard(sc.bg)}>
            <div style={{ ...s.kpiLbl, color: sc.cor }}>Sulco atual</div>
            <div style={{ ...s.kpiVal, color: sc.cor }}>{pneu.sulcoAtual != null ? `${pneu.sulcoAtual} mm` : "—"}</div>
            <div style={{ fontSize: ".7rem", color: sc.cor, marginTop: 2, fontWeight: 700 }}>{sc.label}</div>
          </div>
          <div style={s.kpiCard("#dbeafe")}>
            <div style={{ ...s.kpiLbl, color: "#1e40af" }}>Custo total investido</div>
            <div style={{ ...s.kpiVal, color: "#1e3a8a" }}>{fmtBRL(stats.custoTotal)}</div>
            <div style={{ fontSize: ".7rem", color: "#1e40af", marginTop: 2, fontWeight: 600 }}>Compra + recapagens</div>
          </div>
          <div style={s.kpiCard("#fef3c7")}>
            <div style={{ ...s.kpiLbl, color: "#92400e" }}>Recapagens já feitas</div>
            <div style={{ ...s.kpiVal, color: "#78350f" }}>{stats.qtdRecap}</div>
            <div style={{ fontSize: ".7rem", color: "#92400e", marginTop: 2, fontWeight: 600 }}>Vidas ganhas</div>
          </div>
          <div style={s.kpiCard("#ede9fe")}>
            <div style={{ ...s.kpiLbl, color: "#5b21b6" }}>Inspeções</div>
            <div style={{ ...s.kpiVal, color: "#4c1d95" }}>{stats.qtdInspecoes}</div>
            <div style={{ fontSize: ".7rem", color: "#5b21b6", marginTop: 2, fontWeight: 600 }}>Medições registradas</div>
          </div>
        </div>

        {/* POSIÇÃO ATUAL */}
        {pneu.posicaoAtual && (
          <div style={s.card}>
            <h3 style={s.sectionTitle}><MapPin size={16} /> Onde está agora</h3>
            <div style={{ fontSize: ".9rem", color: "#334155" }}>
              Veículo <strong style={{ color: "#0f172a" }}>{pneu.posicaoAtual.veiculoPlaca}</strong> · Posição <strong style={{ color: "#0f172a" }}>{pneu.posicaoAtual.posicao}</strong>
              {pneu.posicaoAtual.atualizadoEm && (
                <span style={{ color: "#64748b" }}> · Atualizado em {fmtDateTime(pneu.posicaoAtual.atualizadoEm)}</span>
              )}
            </div>
          </div>
        )}

        {/* LINHA DO TEMPO */}
        <div style={s.card}>
          <h3 style={s.sectionTitle}><Calendar size={16} /> Linha do tempo ({eventos.length})</h3>
          {eventos.length === 0 ? (
            <div style={s.empty}>Sem eventos registrados ainda.</div>
          ) : (
            <div style={s.timeline}>
              <div style={s.timeLine} />
              {eventos.map(ev => (
                <div key={ev.id} style={s.event}>
                  <div style={s.eventDot(ev.cor)}>
                    <ev.Icon size={11} />
                  </div>
                  <div style={s.eventBody}>
                    <div style={s.eventTop}>
                      <div style={s.eventTitle}>{ev.titulo}</div>
                      <div style={s.eventData}>{fmtDateTime(ev.data)}</div>
                    </div>
                    <div style={s.eventContent}>{ev.conteudo}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
