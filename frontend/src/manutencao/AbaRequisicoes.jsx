// AbaRequisicoes — solicitação de compra formal com fluxo aprovação
// Coleção: requisicoes_compra
// Fluxo: pendente → aprovada/rejeitada → recebida (gera entrada no estoque)

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy, runTransaction } from "firebase/firestore";
import { db } from "../firebase/config";
import { watch as dsWatch, insert as dsInsert, patch as dsPatch, remove as dsRemove } from "../services/genericDataSource";
import { ShoppingCart, Plus, X, Trash2, Check, XCircle, Package, Clock } from "lucide-react";

const STATUS_OPTS = [
  { id: "pendente",   label: "Pendente aprovação", cor: "var(--warning)", bg: "var(--warning-bg)" },
  { id: "aprovada",   label: "Aprovada",           cor: "#1d4ed8", bg: "#dbeafe" },
  { id: "rejeitada",  label: "Rejeitada",          cor: "var(--danger)", bg: "var(--danger-bg)" },
  { id: "recebida",   label: "Recebida no estoque", cor: "var(--success)", bg: "var(--success-bg)" },
];
const statusMap = Object.fromEntries(STATUS_OPTS.map(s => [s.id, s]));

const fmtBRL = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (iso) => iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const VAZIO = { item: "", quantidade: "1", motivo: "", urgencia: "normal", fornecedorSugerido: "", precoEstimado: "" };

export default function AbaRequisicoes({ itensCatalogo, quemSou, podeAprovar = true }) {
  const [reqs, setReqs] = useState([]);
  const [modal, setModal] = useState(null); // null | "nova" | obj
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos");

  useEffect(() => {
    const un = dsWatch("requisicoes_compra", snap => {
      setReqs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, { orderBy: "criadoEm", order: "desc" });
    return () => un();
  }, []);

  const filtrada = useMemo(() =>
    filtroStatus === "todos" ? reqs : reqs.filter(r => r.status === filtroStatus),
    [reqs, filtroStatus]
  );

  const kpi = useMemo(() => ({
    total: reqs.length,
    pendente: reqs.filter(r => r.status === "pendente").length,
    aprovada: reqs.filter(r => r.status === "aprovada").length,
    recebida: reqs.filter(r => r.status === "recebida").length,
  }), [reqs]);

  function abrirNova() { setModal("nova"); setForm({ ...VAZIO }); setErro(""); }
  function fechar() { setModal(null); setErro(""); }

  async function salvar(e) {
    e.preventDefault();
    if (!form.item.trim()) { setErro("Informe o item."); return; }
    if (!Number(form.quantidade)) { setErro("Quantidade inválida."); return; }
    setSalvando(true);
    try {
      const dados = {
        item: form.item.trim(),
        quantidade: Number(form.quantidade),
        motivo: form.motivo.trim() || null,
        urgencia: form.urgencia || "normal",
        fornecedorSugerido: form.fornecedorSugerido.trim() || null,
        precoEstimado: Number(form.precoEstimado) || 0,
        status: "pendente",
        solicitante: quemSou?.() || "—",
        criadoEm: new Date().toISOString(),
      };
      await dsInsert("requisicoes_compra", dados);
      fechar();
    } catch (e) { setErro("Salvar: " + (e?.message || e)); }
    finally { setSalvando(false); }
  }

  async function mudarStatus(r, novoStatus, obsAprovacao = "") {
    const patch = {
      status: novoStatus,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: quemSou?.() || "—",
    };
    if (novoStatus === "aprovada" || novoStatus === "rejeitada") {
      patch.aprovadoEm = new Date().toISOString();
      patch.aprovadoPor = quemSou?.() || "—";
      if (obsAprovacao) patch.obsAprovacao = obsAprovacao;
    }
    if (novoStatus === "recebida") {
      patch.recebidoEm = new Date().toISOString();
      patch.recebidoPor = quemSou?.() || "—";
    }
    await dsPatch("requisicoes_compra", r.id, patch);
  }

  async function aprovar(r) {
    const obs = window.prompt("Observação de aprovação (opcional):", "");
    if (obs === null) return;
    await mudarStatus(r, "aprovada", obs);
  }

  async function rejeitar(r) {
    const obs = window.prompt("Motivo da rejeição:", "");
    if (obs === null) return;
    await mudarStatus(r, "rejeitada", obs);
  }

  async function marcarRecebida(r) {
    if (!window.confirm(`Confirmar recebimento de ${r.quantidade} ${r.item}?\nIsso NÃO cria entrada automática no estoque — vá na aba Estoque > Entrada pra registrar formalmente com custo real.`)) return;
    await mudarStatus(r, "recebida");
  }

  async function apagar(r) {
    if (!window.confirm(`Excluir requisição de "${r.item}"?`)) return;
    await dsRemove("requisicoes_compra", r.id);
  }

  const S = {
    wrap: { padding: 20, display: "flex", flexDirection: "column", gap: 16 },
    kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 },
    kpiCard: (cor, bg) => ({ background: bg, borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }),
    kpiN: (cor) => ({ fontSize: "1.5rem", fontWeight: 800, color: cor }),
    kpiL: (cor) => ({ fontSize: ".72rem", fontWeight: 700, color: cor, textTransform: "uppercase" }),
    toolbar: { display: "flex", alignItems: "center", gap: 10, background: "var(--card-bg)", padding: 10, borderRadius: 10, border: "1px solid var(--border)", flexWrap: "wrap" },
    input: { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", fontSize: ".88rem", outline: "none" },
    btn: (bg) => ({ padding: "8px 14px", borderRadius: 8, background: bg, color: "#fff", border: "none", cursor: "pointer", fontSize: ".85rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }),
    table: { width: "100%", borderCollapse: "collapse", background: "var(--card-bg)", fontSize: ".88rem", borderRadius: 10, overflow: "hidden" },
    th: { padding: "9px 12px", fontSize: ".72rem", fontWeight: 600, color: "var(--text-muted)", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", textAlign: "left" },
    td: { padding: "10px 12px", fontSize: ".85rem", borderBottom: "1px solid var(--surface-2)" },
    chip: (s) => ({ background: s.bg, color: s.cor, fontSize: ".72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 999, display: "inline-block" }),
    urgencia: (u) => ({
      background: u === "urgente" ? "var(--danger-bg)" : u === "alta" ? "var(--warning-bg)" : "var(--surface-2)",
      color:      u === "urgente" ? "var(--danger)" : u === "alta" ? "var(--warning)" : "var(--text-muted)",
      fontSize: ".7rem", fontWeight: 700, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase",
    }),
  };

  return (
    <div style={S.wrap}>
      <div style={S.kpiRow}>
        <div style={S.kpiCard("var(--text)", "var(--surface-2)")}><div style={S.kpiN("var(--text)")}>{kpi.total}</div><div style={S.kpiL("var(--text)")}>Total</div></div>
        <div style={S.kpiCard("var(--warning)", "var(--warning-bg)")}><div style={S.kpiN("var(--warning)")}>{kpi.pendente}</div><div style={S.kpiL("var(--warning)")}>Pendentes</div></div>
        <div style={S.kpiCard("#1d4ed8", "#dbeafe")}><div style={S.kpiN("#1d4ed8")}>{kpi.aprovada}</div><div style={S.kpiL("#1d4ed8")}>Aprovadas</div></div>
        <div style={S.kpiCard("var(--success)", "var(--success-bg)")}><div style={S.kpiN("var(--success)")}>{kpi.recebida}</div><div style={S.kpiL("var(--success)")}>Recebidas</div></div>
      </div>

      <div style={S.toolbar}>
        <select style={S.input} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos status</option>
          {STATUS_OPTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <span style={{ fontSize: ".8rem", color: "var(--text-muted)", marginLeft: "auto" }}>{filtrada.length} requisição(ões)</span>
        <button style={S.btn("var(--info)")} onClick={abrirNova}><Plus size={14} /> Nova requisição</button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Data</th>
              <th style={S.th}>Item</th>
              <th style={S.th}>Qtd</th>
              <th style={S.th}>Urg.</th>
              <th style={S.th}>Solicitante</th>
              <th style={S.th}>R$ Est.</th>
              <th style={S.th}>Fornecedor sugerido</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrada.length === 0 ? (
              <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: "var(--text-subtle)", padding: 30 }}>Nenhuma requisição.</td></tr>
            ) : filtrada.map(r => {
              const s = statusMap[r.status] || statusMap.pendente;
              return (
                <tr key={r.id}>
                  <td style={S.td}>{fmtDT(r.criadoEm)}</td>
                  <td style={{ ...S.td, fontWeight: 600 }}>
                    {r.item}
                    {r.motivo && <div style={{ fontSize: ".72rem", color: "var(--text-muted)", marginTop: 2 }}>{r.motivo}</div>}
                  </td>
                  <td style={S.td}>{r.quantidade}</td>
                  <td style={S.td}><span style={S.urgencia(r.urgencia)}>{r.urgencia || "normal"}</span></td>
                  <td style={S.td}>{r.solicitante || "—"}</td>
                  <td style={S.td}>{r.precoEstimado > 0 ? fmtBRL(r.precoEstimado) : "—"}</td>
                  <td style={S.td}>{r.fornecedorSugerido || "—"}</td>
                  <td style={S.td}><span style={S.chip(s)}>{s.label}</span></td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {r.status === "pendente" && podeAprovar && (
                        <>
                          <button onClick={() => aprovar(r)} title="Aprovar" style={{ background: "var(--success-bg)", color: "var(--success)", border: "none", padding: "4px 8px", borderRadius: 5, cursor: "pointer" }}><Check size={12} /></button>
                          <button onClick={() => rejeitar(r)} title="Rejeitar" style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "none", padding: "4px 8px", borderRadius: 5, cursor: "pointer" }}><XCircle size={12} /></button>
                        </>
                      )}
                      {r.status === "aprovada" && (
                        <button onClick={() => marcarRecebida(r)} title="Marcar como recebida" style={{ background: "#dbeafe", color: "#1d4ed8", border: "none", padding: "4px 8px", borderRadius: 5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, fontSize: ".72rem", fontWeight: 600 }}>
                          <Package size={12} /> Receber
                        </button>
                      )}
                      <button onClick={() => apagar(r)} title="Excluir" style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: 5, cursor: "pointer" }}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal === "nova" && (
        <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--card-bg)", borderRadius: 12, padding: 24, maxWidth: 560, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: "var(--text)", fontSize: "1.1rem", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <ShoppingCart size={20} /> Nova requisição de compra
              </h2>
              <button onClick={fechar} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <form onSubmit={salvar} style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Item / peça *</span>
                <input style={S.input} value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} placeholder="Ex: pastilha freio dianteira Scania R450" required list="lista-itens" />
                <datalist id="lista-itens">
                  {(itensCatalogo || []).map(it => <option key={it.id} value={it.nome} />)}
                </datalist>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Quantidade *</span>
                  <input type="number" min="1" step="1" style={S.input} value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} required />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Urgência</span>
                  <select style={S.input} value={form.urgencia} onChange={e => setForm({ ...form, urgencia: e.target.value })}>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">URGENTE — caminhão parado</option>
                  </select>
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Fornecedor sugerido</span>
                  <input style={S.input} value={form.fornecedorSugerido} onChange={e => setForm({ ...form, fornecedorSugerido: e.target.value })} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Preço estimado (R$)</span>
                  <input type="number" step="0.01" style={S.input} value={form.precoEstimado} onChange={e => setForm({ ...form, precoEstimado: e.target.value })} />
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-muted)" }}>Motivo / observação</span>
                <textarea style={{ ...S.input, resize: "vertical", minHeight: 60 }} value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} placeholder="Placa afetada, sintoma, urgência..." />
              </label>

              {erro && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "8px 12px", borderRadius: 6, fontSize: ".85rem" }}>{erro}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={fechar} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--surface-2)", color: "var(--text-muted)", border: "none", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
                <button type="submit" disabled={salvando} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--info)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>
                  {salvando ? "Enviando..." : "Enviar pra aprovação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
