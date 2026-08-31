// AbaMultas — CRUD de multas de trânsito por veículo
// Coleção: multas
// Suporta status: pendente | paga | recorrida | cancelada
// Anexa foto/PDF do AIT em Firebase Storage

import { useState, useEffect, useMemo, useRef } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { AlertOctagon, Plus, X, Trash2, Paperclip, ExternalLink, Filter } from "lucide-react";

const STATUS_OPTS = [
  { id: "pendente",   label: "Pendente",   cor: "var(--warning)", bg: "var(--warning-bg)" },
  { id: "paga",       label: "Paga",       cor: "var(--success)", bg: "var(--success-bg)" },
  { id: "recorrida",  label: "Recorrida",  cor: "#1d4ed8", bg: "#dbeafe" },
  { id: "cancelada",  label: "Cancelada",  cor: "var(--text-muted)", bg: "var(--surface-2)" },
];
const statusMap = Object.fromEntries(STATUS_OPTS.map(s => [s.id, s]));

const fmtBRL = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDateBR = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const VAZIO = { placa: "", motorista: "", data: "", orgao: "", codigo: "", descricao: "", valor: "", vencimento: "", status: "pendente", obs: "" };

export default function AbaMultas({ veiculos, motoristas, quemSou }) {
  const [multas, setMultas] = useState([]);
  const [modal, setModal] = useState(null); // null | "nova" | obj
  const [form, setForm] = useState(VAZIO);
  const [anexos, setAnexos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const fileRef = useRef(null);

  useEffect(() => {
    const un = onSnapshot(query(collection(db, "multas"), orderBy("data", "desc")), snap => {
      setMultas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.warn("multas onSnapshot:", e));
    return () => un();
  }, []);

  const listaFiltrada = useMemo(() => {
    return filtroStatus === "todos" ? multas : multas.filter(m => m.status === filtroStatus);
  }, [multas, filtroStatus]);

  const kpi = useMemo(() => {
    const total = multas.length;
    const pendente = multas.filter(m => m.status === "pendente").reduce((s, m) => s + Number(m.valor || 0), 0);
    const paga = multas.filter(m => m.status === "paga").reduce((s, m) => s + Number(m.valor || 0), 0);
    const proxVenc = multas.filter(m => {
      if (m.status !== "pendente" || !m.vencimento) return false;
      const dias = Math.floor((new Date(m.vencimento + "T00:00:00") - Date.now()) / 86400000);
      return dias >= 0 && dias <= 7;
    }).length;
    return { total, pendente, paga, proxVenc };
  }, [multas]);

  function abrirNova() {
    setModal("nova");
    setForm({ ...VAZIO });
    setAnexos([]);
    setErro("");
  }

  function abrirEdicao(m) {
    setModal(m);
    setForm({
      placa: m.placa || "", motorista: m.motorista || "", data: m.data || "",
      orgao: m.orgao || "", codigo: m.codigo || "", descricao: m.descricao || "",
      valor: m.valor || "", vencimento: m.vencimento || "", status: m.status || "pendente", obs: m.obs || "",
    });
    setAnexos(Array.isArray(m.anexos) ? m.anexos : []);
    setErro("");
  }

  function fechar() { setModal(null); setErro(""); setAnexos([]); }

  async function upload(files) {
    setUploading(true); setErro("");
    try {
      const novos = [];
      for (const file of Array.from(files || [])) {
        if (file.size > 10 * 1024 * 1024) { setErro(`${file.name}: > 10 MB`); continue; }
        const ts = Date.now();
        const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
        const path = `multas/${form.placa || "sem-placa"}/${ts}_${safe}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, file, { contentType: file.type });
        const url = await getDownloadURL(ref);
        novos.push({ nome: file.name, url, path, tamanho: file.size, criadoEm: new Date().toISOString() });
      }
      setAnexos(prev => [...prev, ...novos]);
    } catch (e) { setErro("Upload: " + (e?.message || e)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function removerAnexo(idx) {
    const a = anexos[idx];
    if (!a) return;
    try { await deleteObject(storageRef(storage, a.path)); } catch {}
    setAnexos(prev => prev.filter((_, i) => i !== idx));
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.placa || !form.data || !form.valor) { setErro("Placa, Data e Valor são obrigatórios."); return; }
    setSalvando(true); setErro("");
    try {
      const dados = {
        placa: form.placa.toUpperCase().trim(),
        motorista: form.motorista || null,
        data: form.data,
        orgao: form.orgao.trim() || null,
        codigo: form.codigo.trim() || null,
        descricao: form.descricao.trim() || null,
        valor: Number(form.valor) || 0,
        vencimento: form.vencimento || null,
        status: form.status || "pendente",
        obs: form.obs.trim() || null,
        anexos,
        atualizadoEm: new Date().toISOString(),
        atualizadoPor: quemSou?.() || "—",
      };
      if (modal === "nova") {
        dados.criadoEm = new Date().toISOString();
        await addDoc(collection(db, "multas"), dados);
      } else {
        await updateDoc(doc(db, "multas", modal.id), dados);
      }
      fechar();
    } catch (e) { setErro("Salvar: " + (e?.message || e)); }
    finally { setSalvando(false); }
  }

  async function apagar(m) {
    if (!window.confirm(`Excluir multa de ${m.placa} (${fmtBRL(m.valor)})?`)) return;
    for (const a of (m.anexos || [])) { try { await deleteObject(storageRef(storage, a.path)); } catch {} }
    await deleteDoc(doc(db, "multas", m.id));
  }

  const S = {
    wrap: { padding: 20, display: "flex", flexDirection: "column", gap: 16 },
    kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 },
    kpiCard: (cor, bg) => ({ background: bg, borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }),
    kpiN: (cor) => ({ fontSize: "1.5rem", fontWeight: 800, color: cor }),
    kpiL: (cor) => ({ fontSize: ".72rem", fontWeight: 700, color: cor, textTransform: "uppercase" }),
    toolbar: { display: "flex", alignItems: "center", gap: 10, background: "var(--card-bg)", padding: 10, borderRadius: 10, border: "1px solid var(--border)", flexWrap: "wrap" },
    btn: (bg) => ({ padding: "8px 14px", borderRadius: 8, background: bg, color: "#fff", border: "none", cursor: "pointer", fontSize: ".85rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }),
    input: { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", fontSize: ".88rem", outline: "none" },
    table: { width: "100%", borderCollapse: "collapse", background: "var(--card-bg)", fontSize: ".88rem", borderRadius: 10, overflow: "hidden" },
    th: { padding: "9px 12px", fontSize: ".72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", textAlign: "left" },
    td: { padding: "10px 12px", fontSize: ".85rem", borderBottom: "1px solid var(--surface-2)" },
    chip: (s) => ({ background: s.bg, color: s.cor, fontSize: ".72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 999, display: "inline-block" }),
  };

  return (
    <div style={S.wrap}>
      <div style={S.kpiRow}>
        <div style={S.kpiCard("var(--text)", "var(--surface-2)")}><div style={S.kpiN("var(--text)")}>{kpi.total}</div><div style={S.kpiL("var(--text)")}>Total de multas</div></div>
        <div style={S.kpiCard("var(--warning)", "var(--warning-bg)")}><div style={S.kpiN("var(--warning)")}>{fmtBRL(kpi.pendente)}</div><div style={S.kpiL("var(--warning)")}>Pendente</div></div>
        <div style={S.kpiCard("var(--success)", "var(--success-bg)")}><div style={S.kpiN("var(--success)")}>{fmtBRL(kpi.paga)}</div><div style={S.kpiL("var(--success)")}>Paga histórica</div></div>
        <div style={S.kpiCard("var(--danger)", "var(--danger-bg)")}><div style={S.kpiN("var(--danger)")}>{kpi.proxVenc}</div><div style={S.kpiL("var(--danger)")}>Vence em ≤7 dias</div></div>
      </div>

      <div style={S.toolbar}>
        <Filter size={14} />
        <select style={S.input} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos status</option>
          {STATUS_OPTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <span style={{ fontSize: ".8rem", color: "var(--text-muted)", marginLeft: "auto" }}>{listaFiltrada.length} multa(s)</span>
        <button style={S.btn("var(--danger)")} onClick={abrirNova}><Plus size={14} /> Nova multa</button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Data</th>
              <th style={S.th}>Placa</th>
              <th style={S.th}>Motorista</th>
              <th style={S.th}>Órgão</th>
              <th style={S.th}>Descrição</th>
              <th style={S.th}>Valor</th>
              <th style={S.th}>Vence</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Anx</th>
              <th style={S.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {listaFiltrada.length === 0 ? (
              <tr><td colSpan={10} style={{ ...S.td, textAlign: "center", color: "var(--text-subtle)", padding: 30 }}>Nenhuma multa cadastrada.</td></tr>
            ) : listaFiltrada.map(m => {
              const s = statusMap[m.status] || statusMap.pendente;
              return (
                <tr key={m.id}>
                  <td style={S.td}>{fmtDateBR(m.data)}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{m.placa}</td>
                  <td style={S.td}>{m.motorista || "—"}</td>
                  <td style={S.td}>{m.orgao || "—"}</td>
                  <td style={S.td}>{m.descricao || m.codigo || "—"}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{fmtBRL(m.valor)}</td>
                  <td style={S.td}>{fmtDateBR(m.vencimento)}</td>
                  <td style={S.td}><span style={S.chip(s)}>{s.label}</span></td>
                  <td style={S.td}>{(m.anexos?.length || 0) > 0 ? <Paperclip size={14} /> : "—"}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => abrirEdicao(m)} style={{ background: "#dbeafe", color: "#1d4ed8", border: "none", padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: ".76rem", fontWeight: 600 }}>Editar</button>
                      <button onClick={() => apagar(m)} style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "none", padding: "4px 8px", borderRadius: 5, cursor: "pointer" }}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--card-bg)", borderRadius: 12, padding: 24, maxWidth: 620, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: "var(--text)", fontSize: "1.1rem", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <AlertOctagon size={20} /> {modal === "nova" ? "Nova multa" : "Editar multa"}
              </h2>
              <button onClick={fechar} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <form onSubmit={salvar} style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Placa *</span>
                  <select style={S.input} value={form.placa} onChange={e => setForm({ ...form, placa: e.target.value })} required>
                    <option value="">—</option>
                    {(veiculos || []).map(v => <option key={v.id} value={v.placa}>{v.placa}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Motorista</span>
                  <select style={S.input} value={form.motorista} onChange={e => setForm({ ...form, motorista: e.target.value })}>
                    <option value="">—</option>
                    {(motoristas || []).map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Data da infração *</span>
                  <input type="date" style={S.input} value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} required />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Vencimento pagamento</span>
                  <input type="date" style={S.input} value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Órgão autuador</span>
                  <input style={S.input} value={form.orgao} onChange={e => setForm({ ...form, orgao: e.target.value })} placeholder="DER-PR, DNIT, PRF..." />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Cód. infração / AIT</span>
                  <input style={S.input} value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: 545-30" />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Valor *</span>
                  <input type="number" step="0.01" style={S.input} value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} required />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Status</span>
                  <select style={S.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {STATUS_OPTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Descrição</span>
                <input style={S.input} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Excesso de velocidade em 20%..." />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Observações</span>
                <textarea style={{ ...S.input, resize: "vertical", minHeight: 60 }} value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} />
              </label>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--text)" }}>Anexos (AIT, comprovante)</span>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: "#f0f9ff", color: "#0369a1", border: "1px solid #7dd3fc", padding: "4px 10px", borderRadius: 6, fontSize: ".78rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Paperclip size={12} /> {uploading ? "Enviando..." : "Adicionar"}
                  </button>
                  <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => upload(e.target.files)} />
                </div>
                {anexos.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {anexos.map((a, i) => (
                      <div key={a.path} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--surface-2)", borderRadius: 6, fontSize: ".82rem" }}>
                        <Paperclip size={12} color="var(--text-muted)" />
                        <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nome}</a>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8" }}><ExternalLink size={12} /></a>
                        <button type="button" onClick={() => removerAnexo(i)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {erro && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "8px 12px", borderRadius: 6, fontSize: ".85rem" }}>{erro}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={fechar} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--surface-2)", color: "var(--text-muted)", border: "none", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
                <button type="submit" disabled={salvando} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--danger)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
