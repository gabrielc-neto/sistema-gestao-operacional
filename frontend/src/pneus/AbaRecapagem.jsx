import { useState, useMemo } from "react";
import { addDoc, updateDoc, doc, collection } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import { Send, PackageCheck, X, RefreshCw, ExternalLink } from "lucide-react";
import { VIDAS } from "./esquemas";

const fmtBRL = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return iso; }
};

const proximaVida = (atual) => {
  const idx = VIDAS.findIndex(v => v.id === atual);
  return VIDAS[idx + 1]?.id || VIDAS[VIDAS.length - 1].id;
};

const s = {
  toolbar: { display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" },
  primaryBtn: { padding: "10px 18px", borderRadius: 10, border: "none", background: "#b45309", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: ".88rem", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" },

  section: { background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(15,23,42,.05)", marginBottom: 16, overflow: "hidden" },
  sectionHead: { padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 },
  sectionTitle: { margin: 0, fontSize: ".95rem", fontWeight: 800, color: "#1a3a5c" },
  sectionCount: { background: "#fef3c7", color: "#78350f", padding: "2px 10px", borderRadius: 20, fontSize: ".7rem", fontWeight: 800 },

  emptyBox: { padding: "3rem", textAlign: "center", color: "#94a3b8" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, padding: 14 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, position: "relative" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 },
  cardFogo: { fontSize: ".82rem", fontWeight: 800, color: "#1a3a5c", letterSpacing: ".02em" },
  cardMarca: { fontSize: ".78rem", color: "#475569", fontWeight: 600, marginTop: 2 },
  cardRow: { display: "flex", justifyContent: "space-between", fontSize: ".76rem", color: "#475569", marginTop: 6 },
  actionBtn: { padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: ".78rem", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "inherit" },

  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" },
  modal: { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 520, boxShadow: "0 24px 60px rgba(0,0,0,.35)", overflow: "hidden" },
  modalHead: { padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  modalTit: { margin: 0, fontSize: "1rem", fontWeight: 800, color: "#1a3a5c" },
  modalBody: { padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 },
  modalFoot: { padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 10 },

  field: { display: "flex", flexDirection: "column", gap: 4 },
  fieldLbl: { fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" },
  fieldInp: { padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontFamily: "inherit", fontSize: ".9rem", MozAppearance: "textfield" },

  saveBtn:   { padding: "10px 22px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  cancelBtn: { padding: "10px 18px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  err: { color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: 6, fontSize: ".85rem", fontWeight: 600 },
};

export default function AbaRecapagem({ pneus, setPneus, fornecedores, garantirFornecedor, quemSou }) {
  const navigate = useNavigate();
  const emRecapagem = useMemo(() => pneus.filter(p => p.status === "recapagem"), [pneus]);
  const emUso       = useMemo(() => pneus.filter(p => p.status === "em_uso"), [pneus]);

  const [modal, setModal] = useState(null); // { modo: "enviar" | "receber", pneu }

  return (
    <div>
      <div style={s.toolbar}>
        <button style={s.primaryBtn} onClick={() => setModal({ modo: "enviar", pneu: null })}>
          <Send size={16} /> Enviar pneu pra recapadora
        </button>
      </div>

      {/* Em recapagem */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <RefreshCw size={16} color="#b45309" />
          <h3 style={s.sectionTitle}>Pneus na recapadora</h3>
          {emRecapagem.length > 0 && <span style={s.sectionCount}>{emRecapagem.length}</span>}
        </div>
        {emRecapagem.length === 0 ? (
          <div style={s.emptyBox}>
            Nenhum pneu em recapagem no momento.
          </div>
        ) : (
          <div style={s.grid}>
            {emRecapagem.map(p => (
              <div key={p.id} style={s.card}>
                <div style={s.cardTop}>
                  <div>
                    <div style={s.cardFogo} onClick={() => navigate(`/pneus/${p.id}`)} title="Abrir ficha" role="button" tabIndex={0}>
                      Fogo · {p.fogo} <ExternalLink size={11} style={{ marginLeft: 3, verticalAlign: "-1px", color: "#94a3b8" }} />
                    </div>
                    <div style={s.cardMarca}>{p.marca} {p.modelo}</div>
                  </div>
                  <button style={{ ...s.actionBtn, background: "#dcfce7", color: "#166534" }} onClick={() => setModal({ modo: "receber", pneu: p })}>
                    <PackageCheck size={14} /> Receber
                  </button>
                </div>
                <div style={s.cardRow}><span>Recapadora</span><strong style={{ color: "#0f172a" }}>{p.recapagemAtual?.fornecedor || "—"}</strong></div>
                <div style={s.cardRow}><span>Enviado em</span><span>{fmtDate(p.recapagemAtual?.dataEnvio)}</span></div>
                <div style={s.cardRow}><span>Vida atual</span><span>{VIDAS.find(v => v.id === p.vida)?.label || p.vida}</span></div>
                <div style={s.cardRow}><span>Custo estimado</span><strong>{fmtBRL(p.recapagemAtual?.custoEstimado)}</strong></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico de recapagens recentes */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <PackageCheck size={16} color="#059669" />
          <h3 style={s.sectionTitle}>Pneus em uso na frota</h3>
          {emUso.length > 0 && <span style={{ ...s.sectionCount, background: "#dbeafe", color: "#1e40af" }}>{emUso.length}</span>}
        </div>
        {emUso.length === 0 ? (
          <div style={s.emptyBox}>Nenhum pneu em uso registrado.</div>
        ) : (
          <div style={s.grid}>
            {emUso.slice(0, 12).map(p => (
              <div key={p.id} style={s.card}>
                <div style={s.cardTop}>
                  <div>
                    <div style={s.cardFogo} onClick={() => navigate(`/pneus/${p.id}`)} title="Abrir ficha" role="button" tabIndex={0}>
                      Fogo · {p.fogo} <ExternalLink size={11} style={{ marginLeft: 3, verticalAlign: "-1px", color: "#94a3b8" }} />
                    </div>
                    <div style={s.cardMarca}>{p.marca} {p.modelo}</div>
                  </div>
                  <button style={{ ...s.actionBtn, background: "#fef3c7", color: "#78350f" }} onClick={() => setModal({ modo: "enviar", pneu: p })}>
                    <Send size={14} /> Enviar
                  </button>
                </div>
                <div style={s.cardRow}><span>Vida atual</span><span>{VIDAS.find(v => v.id === p.vida)?.label || p.vida}</span></div>
                <div style={s.cardRow}><span>Sulco atual</span><span>{p.sulcoAtual != null ? `${p.sulcoAtual} mm` : "—"}</span></div>
                <div style={s.cardRow}><span>Onde está</span><span>{p.posicaoAtual?.veiculoPlaca || "—"} {p.posicaoAtual?.posicao ? `· ${p.posicaoAtual.posicao}` : ""}</span></div>
              </div>
            ))}
            {emUso.length > 12 && (
              <div style={{ ...s.card, textAlign: "center", color: "#64748b", fontSize: ".82rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                + {emUso.length - 12} pneus em uso
              </div>
            )}
          </div>
        )}
      </div>

      {modal?.modo === "enviar" && (
        <ModalEnviar
          pneuInicial={modal.pneu}
          pneus={pneus} setPneus={setPneus}
          fornecedores={fornecedores}
          garantirFornecedor={garantirFornecedor}
          quemSou={quemSou}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.modo === "receber" && (
        <ModalReceber
          pneu={modal.pneu}
          setPneus={setPneus}
          quemSou={quemSou}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── MODAL ENVIAR ─────────────────────────────────────────────────────────
function ModalEnviar({ pneuInicial, pneus, setPneus, fornecedores, garantirFornecedor, quemSou, onClose }) {
  const [pneuId, setPneuId] = useState(pneuInicial?.id || "");
  const [fornecedor, setFornecedor] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [custoEstimado, setCustoEstimado] = useState("");
  const [dataEnvio, setDataEnvio] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const emUso = pneus.filter(p => p.status === "em_uso");
  const pneu = pneus.find(p => p.id === pneuId);

  function onChangeForn(nome) {
    const c = fornecedores.find(f => f.nome === nome)?.cnpj || "";
    setFornecedor(nome);
    if (c) setCnpj(c);
  }

  async function salvar() {
    setErro("");
    if (!pneuId)     { setErro("Selecione o pneu."); return; }
    if (!fornecedor) { setErro("Informe a recapadora."); return; }
    setSalvando(true);
    try {
      if (fornecedor.trim()) await garantirFornecedor(fornecedor.trim(), cnpj.trim());
      const recapagem = {
        fornecedor: fornecedor.trim(),
        cnpj: cnpj.trim(),
        dataEnvio,
        custoEstimado: Number(custoEstimado) || 0,
        vidaAntes: pneu.vida,
        sulcoAntes: pneu.sulcoAtual ?? null,
        obs: obs.trim(),
        registradoPor: quemSou(),
      };
      await updateDoc(doc(db, "pneus", pneuId), {
        status: "recapagem",
        recapagemAtual: recapagem,
        posicaoAtual: null,
      });
      // Log em pneu_recapagens
      await addDoc(collection(db, "pneu_recapagens"), {
        pneuId, fogo: pneu.fogo,
        tipo: "envio",
        ...recapagem,
        criadoEm: new Date().toISOString(),
      });
      setPneus(prev => prev.map(p => p.id === pneuId ? { ...p, status: "recapagem", recapagemAtual: recapagem, posicaoAtual: null } : p));
      onClose();
    } catch (e) {
      setErro("Erro ao salvar: " + e.message);
    } finally { setSalvando(false); }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <h3 style={s.modalTit}>Enviar pneu pra recapadora</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
        </div>
        <div style={s.modalBody}>
          {erro && <div style={s.err}>{erro}</div>}

          {!pneuInicial && (
            <div style={s.field}>
              <label style={s.fieldLbl}>Pneu (em uso)</label>
              <select style={s.fieldInp} value={pneuId} onChange={e => setPneuId(e.target.value)}>
                <option value="">— Selecione o pneu —</option>
                {emUso.map(p => (
                  <option key={p.id} value={p.id}>{p.fogo} · {p.marca} {p.modelo} · {p.medida} {p.posicaoAtual?.veiculoPlaca ? `(${p.posicaoAtual.veiculoPlaca})` : ""}</option>
                ))}
              </select>
            </div>
          )}
          {pneu && (
            <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: ".85rem", color: "#334155" }}>
              <strong>Fogo {pneu.fogo}</strong> · {pneu.marca} {pneu.modelo} · Vida atual: {VIDAS.find(v => v.id === pneu.vida)?.label} · Sulco: {pneu.sulcoAtual ?? "—"} mm
            </div>
          )}

          <div style={s.field}>
            <label style={s.fieldLbl}>Recapadora</label>
            <input style={s.fieldInp} value={fornecedor} onChange={e => onChangeForn(e.target.value)} placeholder="Buscar ou digitar" list="recap-fornecedores" />
            <datalist id="recap-fornecedores">
              {fornecedores.map(f => <option key={f.id} value={f.nome} />)}
            </datalist>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={s.field}>
              <label style={s.fieldLbl}>CNPJ</label>
              <input style={s.fieldInp} value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="Opcional" />
            </div>
            <div style={s.field}>
              <label style={s.fieldLbl}>Data envio</label>
              <input type="date" style={s.fieldInp} value={dataEnvio} onChange={e => setDataEnvio(e.target.value)} />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.fieldLbl}>Custo estimado (R$)</label>
            <input type="number" step="0.01" style={s.fieldInp} value={custoEstimado} onChange={e => setCustoEstimado(e.target.value)} placeholder="Ex: 850.00" />
          </div>
          <div style={s.field}>
            <label style={s.fieldLbl}>Observações</label>
            <textarea style={{ ...s.fieldInp, resize: "vertical", minHeight: 60 }} value={obs} onChange={e => setObs(e.target.value)} placeholder="Motivo, urgência, etc" />
          </div>
        </div>
        <div style={s.modalFoot}>
          <button style={s.cancelBtn} onClick={onClose}>Cancelar</button>
          <button style={{ ...s.saveBtn, opacity: salvando ? 0.6 : 1 }} onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL RECEBER ────────────────────────────────────────────────────────
function ModalReceber({ pneu, setPneus, quemSou, onClose }) {
  const [dataRetorno, setDataRetorno] = useState(new Date().toISOString().slice(0, 10));
  const [custoReal, setCustoReal] = useState(pneu?.recapagemAtual?.custoEstimado ?? "");
  const [novaVida, setNovaVida] = useState(proximaVida(pneu?.vida || "novo"));
  const [novoSulco, setNovoSulco] = useState("15");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro("");
    if (!dataRetorno) { setErro("Informe a data de retorno."); return; }
    if (!novaVida)    { setErro("Selecione a nova vida do pneu."); return; }
    if (!novoSulco)   { setErro("Informe o novo sulco."); return; }

    setSalvando(true);
    try {
      const agora = new Date();
      const recapCompleta = {
        ...(pneu.recapagemAtual || {}),
        dataRetorno,
        custoReal: Number(custoReal) || 0,
        vidaDepois: novaVida,
        sulcoDepois: Number(novoSulco) || 0,
        obsRetorno: obs.trim(),
        recebidoPor: quemSou(),
      };
      const historicoAnterior = pneu.historicoRecapagens || [];
      const patch = {
        status: "estoque", // volta pro estoque, disponível pra instalação
        vida: novaVida,
        sulcoOriginal: Number(novoSulco) || 0, // referência de vida útil dessa "geração"
        sulcoAtual: Number(novoSulco) || 0,
        recapagemAtual: null,
        historicoRecapagens: [...historicoAnterior, recapCompleta],
        ultimaRecapagemEm: agora.toISOString(),
      };
      await updateDoc(doc(db, "pneus", pneu.id), patch);
      await addDoc(collection(db, "pneu_recapagens"), {
        pneuId: pneu.id, fogo: pneu.fogo,
        tipo: "retorno",
        ...recapCompleta,
        criadoEm: agora.toISOString(),
      });
      setPneus(prev => prev.map(x => x.id === pneu.id ? { ...x, ...patch } : x));
      onClose();
    } catch (e) {
      setErro("Erro ao salvar: " + e.message);
    } finally { setSalvando(false); }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <h3 style={s.modalTit}>Receber pneu {pneu.fogo}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
        </div>
        <div style={s.modalBody}>
          {erro && <div style={s.err}>{erro}</div>}

          <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: ".85rem", color: "#334155" }}>
            <div><strong>{pneu.marca} {pneu.modelo}</strong> · {pneu.medida}</div>
            <div style={{ fontSize: ".78rem", marginTop: 3 }}>
              Enviado em <strong>{fmtDate(pneu.recapagemAtual?.dataEnvio)}</strong> pra <strong>{pneu.recapagemAtual?.fornecedor}</strong>
            </div>
            <div style={{ fontSize: ".78rem" }}>
              Vida antes: {VIDAS.find(v => v.id === pneu.vida)?.label} · Sulco antes: {pneu.sulcoAtual ?? "—"} mm
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={s.field}>
              <label style={s.fieldLbl}>Data retorno</label>
              <input type="date" style={s.fieldInp} value={dataRetorno} onChange={e => setDataRetorno(e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.fieldLbl}>Custo real (R$)</label>
              <input type="number" step="0.01" style={s.fieldInp} value={custoReal} onChange={e => setCustoReal(e.target.value)} placeholder="Ex: 900.00" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={s.field}>
              <label style={s.fieldLbl}>Nova vida</label>
              <select style={s.fieldInp} value={novaVida} onChange={e => setNovaVida(e.target.value)}>
                {VIDAS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.fieldLbl}>Novo sulco (mm)</label>
              <input type="number" step="0.1" style={s.fieldInp} value={novoSulco} onChange={e => setNovoSulco(e.target.value)} placeholder="Ex: 15" />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.fieldLbl}>Observações do retorno</label>
            <textarea style={{ ...s.fieldInp, resize: "vertical", minHeight: 60 }} value={obs} onChange={e => setObs(e.target.value)} placeholder="Qualidade da recapagem, avarias, garantia, etc" />
          </div>
        </div>
        <div style={s.modalFoot}>
          <button style={s.cancelBtn} onClick={onClose}>Cancelar</button>
          <button style={{ ...s.saveBtn, opacity: salvando ? 0.6 : 1 }} onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : "Receber e liberar pra estoque"}
          </button>
        </div>
      </div>
    </div>
  );
}
