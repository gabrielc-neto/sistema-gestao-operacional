// AbaVistoria — checklist DVIR antes/depois viagem
// Coleção: vistorias
// 10 itens padrão + observação + foto por item (opcional)
// Se item marcado com PROBLEMA, alerta pra abrir OS

import { useState, useEffect, useMemo, useRef } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, limit } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { watch as dsWatch, insert as dsInsert, remove as dsRemove } from "../services/genericDataSource";
import { ClipboardCheck, Plus, X, Trash2, CheckCircle2, AlertTriangle, Circle, Camera, Truck } from "lucide-react";
import PadAssinatura from "../components/PadAssinatura";

const ITENS_PADRAO = [
  { id: "pneus",         label: "Pneus (calibragem, cortes, desgaste)" },
  { id: "luzes",         label: "Luzes (farol, seta, freio, ré)" },
  { id: "freios",        label: "Freios (funcionando, sem ruído)" },
  { id: "oleo",          label: "Nível de óleo motor" },
  { id: "arrefecimento", label: "Água/aditivo do radiador" },
  { id: "combustivel",   label: "Combustível suficiente pra saída" },
  { id: "espelhos",      label: "Espelhos alinhados e limpos" },
  { id: "extintor",      label: "Extintor dentro da validade e pressurizado" },
  { id: "docs",          label: "Documentação em dia (CRLV, MOPP, CIV/CIPP)" },
  { id: "vazamentos",    label: "Sem vazamentos aparentes (chassi/motor)" },
];

const STATUS = {
  ok:       { cor: "var(--success)", bg: "var(--success-bg)", label: "OK", icon: CheckCircle2 },
  problema: { cor: "var(--danger)", bg: "var(--danger-bg)", label: "PROBLEMA", icon: AlertTriangle },
  na:       { cor: "var(--text-muted)", bg: "var(--surface-2)", label: "N/A", icon: Circle },
};

const fmtDT = (iso) => iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function AbaVistoria({ veiculos = [], motoristas = [], quemSou }) {
  const [vistorias, setVistorias] = useState([]);
  const [modal, setModal] = useState(null); // null | "nova" | obj (visualizar)
  const [form, setForm] = useState(criarFormVazio());
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [uploadingItem, setUploadingItem] = useState(null); // id do item sendo uploadado

  function criarFormVazio() {
    return {
      placa: "",
      motorista: "",
      tipo: "antes",
      km: "",
      itens: ITENS_PADRAO.map(i => ({ ...i, status: "", obs: "", foto: null })),
      obsGeral: "",
      assinatura: null,
    };
  }

  useEffect(() => {
    const un = dsWatch("vistorias", snap => setVistorias(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      { orderBy: "criadoEm", order: "desc", limit: 200 });
    return () => un();
  }, []);

  const kpi = useMemo(() => {
    const total = vistorias.length;
    const hoje = new Date().toISOString().slice(0, 10);
    const hojeCount = vistorias.filter(v => (v.criadoEm || "").slice(0, 10) === hoje).length;
    const comProblema = vistorias.filter(v => (v.itens || []).some(i => i.status === "problema")).length;
    return { total, hoje: hojeCount, comProblema };
  }, [vistorias]);

  function abrirNova() {
    setForm(criarFormVazio());
    setModal("nova");
    setErro("");
  }

  function fechar() { setModal(null); setErro(""); }

  function setStatusItem(idx, status) {
    setForm(f => ({ ...f, itens: f.itens.map((it, i) => i === idx ? { ...it, status } : it) }));
  }

  function setObsItem(idx, obs) {
    setForm(f => ({ ...f, itens: f.itens.map((it, i) => i === idx ? { ...it, obs } : it) }));
  }

  async function uploadFotoItem(idx, file) {
    if (!file) return;
    setUploadingItem(idx);
    try {
      const ts = Date.now();
      const path = `vistorias/${form.placa || "sem-placa"}/${ts}_${form.itens[idx].id}.jpg`;
      // Compressão simples
      const canvas = document.createElement("canvas");
      const img = new Image();
      const dataUrl = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      img.src = dataUrl;
      await new Promise(res => { img.onload = res; });
      const escala = Math.min(1, 1200 / Math.max(img.width, img.height));
      canvas.width = img.width * escala; canvas.height = img.height * escala;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.8));
      const ref = storageRef(storage, path);
      await uploadBytes(ref, blob, { contentType: "image/jpeg" });
      const url = await getDownloadURL(ref);
      setForm(f => ({ ...f, itens: f.itens.map((it, i) => i === idx ? { ...it, foto: { url, path } } : it) }));
    } catch (e) {
      setErro("Foto: " + (e?.message || e));
    } finally {
      setUploadingItem(null);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.placa) { setErro("Selecione o veículo."); return; }
    if (!form.motorista) { setErro("Informe o motorista."); return; }
    const semStatus = form.itens.filter(i => !i.status).length;
    if (semStatus > 0) { setErro(`${semStatus} item(ns) sem marcar (OK/PROBLEMA/N/A).`); return; }
    if (!form.assinatura) { setErro("Assinatura do motorista obrigatória."); return; }
    setSalvando(true); setErro("");
    try {
      const dados = {
        placa: form.placa,
        motorista: form.motorista,
        tipo: form.tipo,
        km: Number(form.km) || null,
        itens: form.itens,
        obsGeral: form.obsGeral.trim() || null,
        assinatura: form.assinatura,
        problemas: form.itens.filter(i => i.status === "problema").length,
        criadoEm: new Date().toISOString(),
        criadoPor: quemSou?.() || "—",
      };
      await dsInsert("vistorias", dados);
      fechar();
    } catch (e) { setErro("Salvar: " + (e?.message || e)); }
    finally { setSalvando(false); }
  }

  async function apagar(v) {
    if (!window.confirm(`Excluir vistoria de ${v.placa} (${fmtDT(v.criadoEm)})?`)) return;
    for (const it of (v.itens || [])) {
      if (it.foto?.path) { try { await deleteObject(storageRef(storage, it.foto.path)); } catch {} }
    }
    await dsRemove("vistorias", v.id);
  }

  const S = {
    wrap: { padding: 20, display: "flex", flexDirection: "column", gap: 16 },
    kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 },
    kpiCard: (cor, bg) => ({ background: bg, borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }),
    kpiN: (cor) => ({ fontSize: "1.5rem", fontWeight: 800, color: cor }),
    kpiL: (cor) => ({ fontSize: ".72rem", fontWeight: 700, color: cor, textTransform: "uppercase" }),
    input: { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", fontSize: ".88rem" },
    btn: (bg) => ({ padding: "8px 14px", borderRadius: 8, background: bg, color: "#fff", border: "none", cursor: "pointer", fontSize: ".85rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }),
    table: { width: "100%", borderCollapse: "collapse", background: "var(--card-bg)", fontSize: ".88rem", borderRadius: 10, overflow: "hidden" },
    th: { padding: "9px 12px", fontSize: ".72rem", fontWeight: 600, color: "var(--text-muted)", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", textAlign: "left" },
    td: { padding: "10px 12px", fontSize: ".85rem", borderBottom: "1px solid var(--border)" },
    statusBtn: (chave, ativo) => {
      const st = STATUS[chave];
      return {
        background: ativo ? st.bg : "var(--card-bg)",
        color: ativo ? st.cor : "var(--text-subtle)",
        border: ativo ? `2px solid ${st.cor}` : "1px solid var(--border-strong)",
        padding: "5px 12px", borderRadius: 6, fontSize: ".78rem", fontWeight: 700,
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
      };
    },
  };

  return (
    <div style={S.wrap}>
      <div style={S.kpiRow}>
        <div style={S.kpiCard("var(--text)", "var(--surface-2)")}><div style={S.kpiN("var(--text)")}>{kpi.total}</div><div style={S.kpiL("var(--text)")}>Total vistorias</div></div>
        <div style={S.kpiCard("var(--success)", "var(--success-bg)")}><div style={S.kpiN("var(--success)")}>{kpi.hoje}</div><div style={S.kpiL("var(--success)")}>Hoje</div></div>
        <div style={S.kpiCard("var(--danger)", "var(--danger-bg)")}><div style={S.kpiN("var(--danger)")}>{kpi.comProblema}</div><div style={S.kpiL("var(--danger)")}>Com problema</div></div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={S.btn("var(--tech)")} onClick={abrirNova}><Plus size={14} /> Nova vistoria</button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Data</th>
              <th style={S.th}>Placa</th>
              <th style={S.th}>Motorista</th>
              <th style={S.th}>Tipo</th>
              <th style={S.th}>KM</th>
              <th style={S.th}>Problemas</th>
              <th style={S.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {vistorias.length === 0 ? (
              <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "var(--text-subtle)", padding: 30 }}>Nenhuma vistoria.</td></tr>
            ) : vistorias.map(v => (
              <tr key={v.id}>
                <td style={S.td}>{fmtDT(v.criadoEm)}</td>
                <td style={{ ...S.td, fontWeight: 700 }}>{v.placa}</td>
                <td style={S.td}>{v.motorista || "—"}</td>
                <td style={S.td}><span style={{ fontSize: ".72rem", padding: "2px 6px", background: v.tipo === "depois" ? "#dbeafe" : "#f3e8ff", color: v.tipo === "depois" ? "#1d4ed8" : "var(--chart-6)", borderRadius: 4, fontWeight: 700, textTransform: "uppercase" }}>{v.tipo}</span></td>
                <td style={S.td}>{v.km ? v.km.toLocaleString("pt-BR") : "—"}</td>
                <td style={S.td}>
                  {v.problemas > 0
                    ? <span style={{ background: "var(--danger-bg)", color: "var(--danger)", fontWeight: 700, padding: "3px 8px", borderRadius: 999, fontSize: ".78rem" }}>{v.problemas}</span>
                    : <span style={{ color: "var(--success)", fontWeight: 700 }}>OK</span>}
                </td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setModal(v)} style={{ background: "#dbeafe", color: "#1d4ed8", border: "none", padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: ".76rem", fontWeight: 600 }}>Ver</button>
                    <button onClick={() => apagar(v)} style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "none", padding: "4px 8px", borderRadius: 5, cursor: "pointer" }}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === "nova" && (
        <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--card-bg)", borderRadius: 12, padding: 20, maxWidth: 720, width: "100%", maxHeight: "92vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ margin: 0, color: "var(--text)", fontSize: "1.1rem", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <ClipboardCheck size={20} /> Nova vistoria
              </h2>
              <button onClick={fechar} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            </div>

            <form onSubmit={salvar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--text-muted)" }}>Placa *</span>
                  <select style={S.input} value={form.placa} onChange={e => setForm({ ...form, placa: e.target.value })} required>
                    <option value="">—</option>
                    {veiculos.map(v => <option key={v.id} value={v.placa}>{v.placa}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--text-muted)" }}>Motorista *</span>
                  <select style={S.input} value={form.motorista} onChange={e => setForm({ ...form, motorista: e.target.value })} required>
                    <option value="">—</option>
                    {motoristas.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--text-muted)" }}>Tipo *</span>
                  <select style={S.input} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    <option value="antes">Antes da viagem</option>
                    <option value="depois">Depois da viagem</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--text-muted)" }}>KM atual</span>
                  <input type="number" min="0" style={S.input} value={form.km} onChange={e => setForm({ ...form, km: e.target.value.replace(/\D/g, "") })} placeholder="opcional" />
                </label>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {form.itens.map((it, idx) => (
                  <div key={it.id} style={{ background: "var(--surface-2)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)", fontSize: ".9rem", flex: 1, minWidth: 200 }}>
                        {idx + 1}. {it.label}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {Object.entries(STATUS).map(([k, st]) => (
                          <button key={k} type="button" onClick={() => setStatusItem(idx, k)} style={S.statusBtn(k, it.status === k)}>
                            <st.icon size={11} /> {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {it.status === "problema" && (
                      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                        <input
                          style={{ ...S.input, background: "var(--card-bg)" }}
                          value={it.obs}
                          onChange={e => setObsItem(idx, e.target.value)}
                          placeholder="Descrever problema (obrigatório se marcou PROBLEMA)"
                        />
                        <label style={{ background: "#f0f9ff", color: "#0369a1", padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: ".78rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Camera size={12} /> {uploadingItem === idx ? "..." : it.foto ? "Foto ✓" : "Foto"}
                          <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => uploadFotoItem(idx, e.target.files?.[0])} />
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Observação geral</span>
                <textarea style={{ ...S.input, resize: "vertical", minHeight: 60 }} value={form.obsGeral} onChange={e => setForm({ ...form, obsGeral: e.target.value })} />
              </label>

              <PadAssinatura label="Assinatura do motorista *" value={form.assinatura} onChange={png => setForm({ ...form, assinatura: png })} />

              {erro && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "8px 12px", borderRadius: 6, fontSize: ".85rem" }}>{erro}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={fechar} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--surface-2)", color: "var(--text-muted)", border: "none", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
                <button type="submit" disabled={salvando} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--tech)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>
                  {salvando ? "Salvando..." : "Salvar vistoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal && modal !== "nova" && (
        <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--card-bg)", borderRadius: 12, padding: 20, maxWidth: 720, width: "100%", maxHeight: "92vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ margin: 0, color: "var(--text)", fontSize: "1.1rem" }}>
                Vistoria — {modal.placa} · {modal.motorista} · {fmtDT(modal.criadoEm)}
              </h2>
              <button onClick={fechar} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(modal.itens || []).map((it, i) => {
                const st = STATUS[it.status] || STATUS.na;
                return (
                  <div key={i} style={{ padding: 10, background: st.bg, borderLeft: `4px solid ${st.cor}`, borderRadius: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>{it.label}</span>
                      <span style={{ color: st.cor, fontWeight: 700, fontSize: ".82rem" }}>{st.label}</span>
                    </div>
                    {it.obs && <div style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>{it.obs}</div>}
                    {it.foto?.url && <a href={it.foto.url} target="_blank" rel="noopener noreferrer"><img src={it.foto.url} alt="foto" style={{ maxWidth: 160, borderRadius: 6, marginTop: 4 }} /></a>}
                  </div>
                );
              })}
              {modal.obsGeral && (
                <div style={{ padding: 10, background: "var(--surface-2)", borderRadius: 6 }}>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>OBSERVAÇÃO GERAL</div>
                  <div style={{ fontSize: ".85rem", color: "var(--text-muted)" }}>{modal.obsGeral}</div>
                </div>
              )}
              {modal.assinatura && (
                <div>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>ASSINATURA</div>
                  <img src={modal.assinatura} alt="assinatura" style={{ maxWidth: 300, border: "1px solid var(--border)", borderRadius: 6 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
