// Aba "Compras" — cadastro em lote de pneus a partir de uma NF de compra.
// Uma NF pode ter N itens (linhas), cada linha gera N pneus individuais no cadastro.
// Reutiliza modelo existente da collection `pneus`. Registra a NF em `pneu_compras`.

import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, addDoc, query, orderBy
} from "firebase/firestore";
import { db } from "../firebase/config";
import { watch as dsWatch, insert as dsInsert } from "../services/genericDataSource";
import {
  ShoppingCart, Plus, X, Trash2, ChevronDown, ChevronRight,
  Search, Package, TrendingUp, Building2, FileText, Calendar
} from "lucide-react";

const VIDAS = [
  { id: "novo",     label: "Novo (1ª vida)" },
  { id: "recap1",   label: "Recapado 1ª" },
  { id: "recap2",   label: "Recapado 2ª" },
  { id: "recap3",   label: "Recapado 3ª" },
];

const fmtBRL = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
const hojeIso = () => new Date().toISOString().slice(0, 10);

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" },
  h1: { margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 10 },
  h2: { margin: "3px 0 0", fontSize: ".8rem", color: "#64748b", fontWeight: 500 },

  kpiRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  kpiCard: (cor, bg) => ({ background: bg, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4, border: "1px solid " + cor + "22" }),
  kpiN: (cor) => ({ fontSize: "1.4rem", fontWeight: 800, color: cor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }),
  kpiL: (cor) => ({ fontSize: ".72rem", fontWeight: 700, color: cor, textTransform: "uppercase", letterSpacing: ".05em" }),

  toolbar: { display: "flex", alignItems: "center", gap: 10, background: "#fff", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", flexWrap: "wrap" },
  searchWrap: { position: "relative", flex: "1 1 220px", minWidth: 180 },
  searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" },
  input: { width: "100%", padding: "8px 10px 8px 32px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: ".88rem", outline: "none", fontFamily: "inherit" },
  select: { padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: ".85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  btn: (bg) => ({ padding: "8px 14px", borderRadius: 8, background: bg, color: "#fff", border: "none", cursor: "pointer", fontSize: ".85rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }),

  tableWrap: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" },
  th: { padding: "9px 14px", fontSize: ".7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", whiteSpace: "nowrap" },
  td: { padding: "10px 14px", fontSize: ".85rem", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle", color: "#0f172a" },
  tdMuted: { color: "#64748b", fontSize: ".78rem" },
  zebra: { background: "#fafcff" },
  expandRow: { background: "#f8fafc", borderBottom: "1px solid #e2e8f0" },

  modal: { position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modalBox: { background: "#fff", borderRadius: 12, padding: 22, width: 720, maxWidth: "100%", maxHeight: "94vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.35)" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  modalTit: { margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 8 },
  modalClose: { background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 },
  section: { marginBottom: 14 },
  sectionTit: { fontSize: ".78rem", fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 },

  fRow: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 },
  fLbl: { fontSize: ".72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".04em" },
  fInp: { padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: ".88rem", outline: "none" },
  fGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  fGrid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  fMsg: { padding: "8px 12px", borderRadius: 6, fontSize: ".82rem", marginBottom: 10 },
  fMsgErr: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },
  fMsgOk:  { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" },
  fBtns: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 },

  itemCard: { border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 10, background: "#fafcff" },
  itemHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  itemTit: { fontWeight: 700, color: "#334155", fontSize: ".82rem" },
  itemDel: { background: "transparent", border: "1px solid #fecaca", color: "#dc2626", cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontSize: ".72rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 },
  subtotalBox: { background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, padding: "6px 10px", fontSize: ".8rem", color: "#166534", fontWeight: 700, marginTop: 6, textAlign: "right" },
  totalBox: { background: "#1a3a5c", color: "#fff", borderRadius: 8, padding: "12px 16px", fontSize: "1.05rem", fontWeight: 800, textAlign: "right", marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" },

  chipMed: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: "#e0e7ff", color: "#3730a3", fontSize: ".7rem", fontWeight: 700 },
  chipVida: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: "#dbeafe", color: "#1e40af", fontSize: ".7rem", fontWeight: 700 },

  vazio: { padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: ".9rem" },
  emptyIcon: { color: "#cbd5e1", margin: "0 auto 12px", display: "block" },

  btnExpand: { background: "transparent", border: "none", cursor: "pointer", color: "#475569", padding: 2, display: "inline-flex", alignItems: "center" },
};

const itemVazio = () => ({
  medida: "",
  marca: "",
  modelo: "",
  vida: "novo",
  sulcoOriginal: "15",
  quantidade: "1",
  custoUnitario: "",
  fogoInicial: "",
});

// ═══ MODAL: NOVA COMPRA ═══
function ModalCompra({ fornecedores, quemSou, garantirFornecedor, ultimoFogoNum, onSalvar, onFechar }) {
  const [fornecedor, setFornecedor] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [numeroNF, setNumeroNF] = useState("");
  const [data, setData] = useState(hojeIso());
  const [obs, setObs] = useState("");
  const [itens, setItens] = useState([itemVazio()]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function onChangeFornecedor(v) {
    setFornecedor(v);
    const match = fornecedores.find(f => (f.nome || "").toLowerCase() === v.toLowerCase());
    if (match?.cnpj) setCnpj(match.cnpj);
  }

  function updItem(idx, campo, val) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: val } : it));
  }
  function addItem()  { setItens(prev => [...prev, itemVazio()]); }
  function delItem(idx) { setItens(prev => prev.filter((_, i) => i !== idx)); }

  const total = useMemo(() => {
    return itens.reduce((acc, it) => {
      const q = Number(it.quantidade) || 0;
      const c = Number(it.custoUnitario) || 0;
      return acc + q * c;
    }, 0);
  }, [itens]);
  const qtdTotal = useMemo(() => itens.reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0), [itens]);

  async function submeter(e) {
    e.preventDefault();
    setErro("");
    if (!fornecedor.trim()) return setErro("Informe o fornecedor.");
    if (!numeroNF.trim())   return setErro("Informe o número da NF.");
    if (itens.length === 0) return setErro("Adicione pelo menos 1 item.");
    for (const [i, it] of itens.entries()) {
      if (!it.medida.trim())    return setErro(`Item ${i+1}: informe a medida.`);
      if (!it.marca.trim())     return setErro(`Item ${i+1}: informe a marca.`);
      const q = Number(it.quantidade);
      if (!q || q <= 0)         return setErro(`Item ${i+1}: quantidade deve ser > 0.`);
      const c = Number(it.custoUnitario);
      if (isNaN(c) || c < 0)    return setErro(`Item ${i+1}: custo inválido.`);
    }
    setSalvando(true);
    try {
      await onSalvar({
        fornecedor: fornecedor.trim(),
        fornecedorCnpj: cnpj.trim(),
        numeroNF: numeroNF.trim(),
        data,
        observacao: obs.trim(),
        itens: itens.map(it => ({
          ...it,
          medida: it.medida.trim(),
          marca: it.marca.trim(),
          modelo: it.modelo.trim(),
          quantidade: Number(it.quantidade),
          custoUnitario: Number(it.custoUnitario),
          sulcoOriginal: Number(it.sulcoOriginal) || 0,
          fogoInicial: it.fogoInicial.trim(),
        })),
        valorTotal: total,
      });
      onFechar();
    } catch (err) {
      setErro("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={s.modal} onClick={onFechar}>
      <form style={s.modalBox} onClick={e => e.stopPropagation()} onSubmit={submeter}>
        <div style={s.modalHead}>
          <h3 style={s.modalTit}><ShoppingCart size={18} color="#059669" /> Nova compra de pneus</h3>
          <button type="button" style={s.modalClose} onClick={onFechar}><X size={20} /></button>
        </div>

        {erro && <div style={{ ...s.fMsg, ...s.fMsgErr }}>{erro}</div>}

        <div style={s.section}>
          <div style={s.sectionTit}>Nota fiscal</div>
          <div style={s.fGrid2}>
            <div style={s.fRow}>
              <label style={s.fLbl}>Fornecedor *</label>
              <input style={s.fInp} value={fornecedor} onChange={e => onChangeFornecedor(e.target.value)} placeholder="Ex: Michelin BR, Bridgestone…" list="compras-fornecedores" autoFocus />
              <datalist id="compras-fornecedores">
                {fornecedores.map(f => <option key={f.id} value={f.nome} />)}
              </datalist>
            </div>
            <div style={s.fRow}>
              <label style={s.fLbl}>CNPJ</label>
              <input style={s.fInp} value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="12.345.678/0001-90" />
            </div>
          </div>
          <div style={s.fGrid2}>
            <div style={s.fRow}>
              <label style={s.fLbl}>Número da NF *</label>
              <input style={s.fInp} value={numeroNF} onChange={e => setNumeroNF(e.target.value)} placeholder="Ex: 12345" />
            </div>
            <div style={s.fRow}>
              <label style={s.fLbl}>Data</label>
              <input style={s.fInp} type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>
          </div>
          <div style={s.fRow}>
            <label style={s.fLbl}>Observação</label>
            <input style={s.fInp} value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div style={s.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={s.sectionTit}>Itens da NF ({itens.length})</div>
            <button type="button" style={{ ...s.btn("#0f172a"), padding: "4px 10px", fontSize: ".78rem" }} onClick={addItem}>
              <Plus size={13} /> Adicionar item
            </button>
          </div>

          {itens.map((it, idx) => {
            const subtotal = (Number(it.quantidade) || 0) * (Number(it.custoUnitario) || 0);
            return (
              <div key={idx} style={s.itemCard}>
                <div style={s.itemHead}>
                  <span style={s.itemTit}>Item {idx + 1}</span>
                  {itens.length > 1 && (
                    <button type="button" style={s.itemDel} onClick={() => delItem(idx)}>
                      <Trash2 size={11} /> Remover
                    </button>
                  )}
                </div>
                <div style={s.fGrid3}>
                  <div style={s.fRow}>
                    <label style={s.fLbl}>Medida *</label>
                    <input style={s.fInp} value={it.medida} onChange={e => updItem(idx, "medida", e.target.value)} placeholder="295/80R22.5" />
                  </div>
                  <div style={s.fRow}>
                    <label style={s.fLbl}>Marca *</label>
                    <input style={s.fInp} value={it.marca} onChange={e => updItem(idx, "marca", e.target.value)} placeholder="Michelin" />
                  </div>
                  <div style={s.fRow}>
                    <label style={s.fLbl}>Modelo</label>
                    <input style={s.fInp} value={it.modelo} onChange={e => updItem(idx, "modelo", e.target.value)} placeholder="XZE2+" />
                  </div>
                </div>
                <div style={s.fGrid3}>
                  <div style={s.fRow}>
                    <label style={s.fLbl}>Vida</label>
                    <select style={s.fInp} value={it.vida} onChange={e => updItem(idx, "vida", e.target.value)}>
                      {VIDAS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                    </select>
                  </div>
                  <div style={s.fRow}>
                    <label style={s.fLbl}>Sulco original (mm)</label>
                    <input style={s.fInp} type="number" step="0.1" min="0" value={it.sulcoOriginal} onChange={e => updItem(idx, "sulcoOriginal", e.target.value)} placeholder="15" />
                  </div>
                  <div style={s.fRow}>
                    <label style={s.fLbl}>Fogo inicial (opcional)</label>
                    <input style={s.fInp} value={it.fogoInicial} onChange={e => updItem(idx, "fogoInicial", e.target.value.toUpperCase())} placeholder={`ex: PN-${String(ultimoFogoNum+1).padStart(5,"0")}`} />
                  </div>
                </div>
                <div style={s.fGrid2}>
                  <div style={s.fRow}>
                    <label style={s.fLbl}>Quantidade *</label>
                    <input style={s.fInp} type="number" min="1" value={it.quantidade} onChange={e => updItem(idx, "quantidade", e.target.value)} placeholder="4" />
                  </div>
                  <div style={s.fRow}>
                    <label style={s.fLbl}>Custo unitário (R$) *</label>
                    <input style={s.fInp} type="number" step="0.01" min="0" value={it.custoUnitario} onChange={e => updItem(idx, "custoUnitario", e.target.value)} placeholder="2350.00" />
                  </div>
                </div>
                {subtotal > 0 && (
                  <div style={s.subtotalBox}>Subtotal: {fmtBRL(subtotal)}</div>
                )}
                {it.fogoInicial && Number(it.quantidade) > 1 && (
                  <div style={{ fontSize: ".72rem", color: "#64748b", marginTop: 6 }}>
                    Serão gerados os fogos sequenciais a partir de {it.fogoInicial} (se numérico), ou o mesmo prefixo se não for.
                  </div>
                )}
              </div>
            );
          })}

          <div style={s.totalBox}>
            <span style={{ fontSize: ".82rem", opacity: .85 }}>Total ({qtdTotal} pneu{qtdTotal !== 1 ? "s" : ""})</span>
            <span>{fmtBRL(total)}</span>
          </div>
        </div>

        <div style={s.fBtns}>
          <button type="button" style={{ ...s.btn("#f1f5f9"), color: "#475569" }} onClick={onFechar}>Cancelar</button>
          <button type="submit" style={s.btn("#059669")} disabled={salvando}>
            {salvando ? "Salvando..." : `Registrar compra e cadastrar ${qtdTotal} pneu(s)`}
          </button>
        </div>
      </form>
    </div>
  );
}

// ═══ COMPONENTE PRINCIPAL ═══
export default function AbaCompras({ pneus, setPneus, fornecedores, garantirFornecedor, quemSou }) {
  const [compras, setCompras] = useState([]);
  const [modalNova, setModalNova] = useState(false);
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState("30");
  const [expandidas, setExpandidas] = useState(new Set());

  useEffect(() => {
    const un = dsWatch("pneu_compras", snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
      setCompras(rows);
    }, { orderBy: "criadoEm", order: "desc" });
    return () => un();
  }, []);

  // Gera próximo número de fogo baseado nos pneus já cadastrados (PN-00234 → 234)
  const ultimoFogoNum = useMemo(() => {
    let max = 0;
    pneus.forEach(p => {
      const m = String(p.fogo || "").match(/(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    });
    return max;
  }, [pneus]);

  async function salvarCompra(payload) {
    // 1. Cadastra os pneus individuais no Firestore
    const criados = [];
    let fogoContador = ultimoFogoNum + 1;

    for (const item of payload.itens) {
      for (let i = 0; i < item.quantidade; i++) {
        let fogo;
        if (item.fogoInicial) {
          // Se fornecido fogo inicial, tenta gerar sequencial
          const m = item.fogoInicial.match(/^(.*?)(\d+)$/);
          if (m) {
            const prefixo = m[1];
            const numInicial = Number(m[2]);
            const numDigits = m[2].length;
            fogo = prefixo + String(numInicial + i).padStart(numDigits, "0");
          } else {
            fogo = item.fogoInicial + (i === 0 ? "" : `-${i+1}`);
          }
        } else {
          fogo = `PN-${String(fogoContador).padStart(5, "0")}`;
          fogoContador++;
        }

        const pneu = {
          fogo,
          marca: item.marca,
          modelo: item.modelo,
          medida: item.medida,
          vida: item.vida,
          sulcoOriginal: item.sulcoOriginal,
          sulcoAtual: item.sulcoOriginal,
          status: "estoque",
          custoAquisicao: item.custoUnitario,
          fornecedor: payload.fornecedor,
          fornecedorCnpj: payload.fornecedorCnpj || null,
          notaFiscal: payload.numeroNF,
          criadoEm: new Date().toISOString(),
          criadoPor: quemSou?.() || "—",
        };
        const ref = await dsInsert("pneus", pneu);
        criados.push({ id: ref.id, ...pneu });
      }
    }

    // 2. Garante fornecedor no catálogo
    if (garantirFornecedor) {
      await garantirFornecedor(payload.fornecedor, payload.fornecedorCnpj);
    }

    // 3. Registra a compra
    await dsInsert("pneu_compras", {
      ...payload,
      pneusIds: criados.map(p => p.id),
      qtdTotal: criados.length,
      criadoEm: new Date().toISOString(),
      criadoPor: quemSou?.() || "—",
    });

    // 4. Atualiza state local dos pneus
    if (setPneus) setPneus(prev => [...criados, ...prev]);
  }

  // Filtros e KPIs
  const comprasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const limite = periodo === "todos" ? 0 : new Date(Date.now() - Number(periodo) * 86400000).toISOString();
    return compras.filter(c => {
      if (periodo !== "todos" && (c.data || c.criadoEm || "").slice(0,10) < limite.slice(0,10)) return false;
      if (q && !(c.fornecedor || "").toLowerCase().includes(q) && !(c.numeroNF || "").includes(q)) return false;
      return true;
    });
  }, [compras, busca, periodo]);

  const kpi = useMemo(() => {
    const hoje = new Date().toISOString().slice(0,7); // YYYY-MM
    const noMes = compras.filter(c => (c.data || c.criadoEm || "").startsWith(hoje));
    const totalMes = noMes.reduce((a, c) => a + Number(c.valorTotal || 0), 0);
    const qtdMes = noMes.reduce((a, c) => a + Number(c.qtdTotal || 0), 0);
    const ticket = qtdMes > 0 ? totalMes / qtdMes : 0;
    const totalGeral = compras.reduce((a, c) => a + Number(c.valorTotal || 0), 0);
    return { totalMes, qtdMes, ticket, totalGeral };
  }, [compras]);

  // Ranking de fornecedores (top 3 do período)
  const rankingFornecedores = useMemo(() => {
    const map = {};
    comprasFiltradas.forEach(c => {
      const f = c.fornecedor || "—";
      if (!map[f]) map[f] = { fornecedor: f, valor: 0, qtd: 0, compras: 0 };
      map[f].valor += Number(c.valorTotal || 0);
      map[f].qtd   += Number(c.qtdTotal || 0);
      map[f].compras += 1;
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 3);
  }, [comprasFiltradas]);

  function toggleExpand(id) {
    setExpandidas(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  return (
    <div style={s.wrap}>
      <div style={s.head}>
        <div>
          <h1 style={s.h1}><ShoppingCart size={18} color="#059669" /> Compras de pneus</h1>
          <p style={s.h2}>Registro de NFs de compra — cadastra automaticamente os pneus individualmente</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={s.kpiRow}>
        <div style={s.kpiCard("#059669", "#f0fdf4")}><div style={s.kpiN("#059669")}>{fmtBRL(kpi.totalMes)}</div><div style={s.kpiL("#059669")}>Gasto no mês</div></div>
        <div style={s.kpiCard("#0891b2", "#f0f9ff")}><div style={s.kpiN("#0891b2")}>{kpi.qtdMes}</div><div style={s.kpiL("#0891b2")}>Pneus no mês</div></div>
        <div style={s.kpiCard("#7c3aed", "#faf5ff")}><div style={s.kpiN("#7c3aed")}>{fmtBRL(kpi.ticket)}</div><div style={s.kpiL("#7c3aed")}>Ticket médio</div></div>
        <div style={s.kpiCard("#0f172a", "#f8fafc")}><div style={s.kpiN("#0f172a")}>{fmtBRL(kpi.totalGeral)}</div><div style={s.kpiL("#0f172a")}>Total investido</div></div>
      </div>

      {/* Ranking fornecedores */}
      {rankingFornecedores.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: ".76rem", fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={13} /> Top fornecedores no período
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {rankingFornecedores.map((r, i) => (
              <div key={r.fornecedor} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: ".72rem", color: "#94a3b8", fontWeight: 700 }}>#{i+1}</div>
                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: ".92rem", marginTop: 2 }}>{r.fornecedor}</div>
                <div style={{ fontSize: ".78rem", color: "#475569", marginTop: 4 }}>
                  {fmtBRL(r.valor)} · {r.qtd} pneus · {r.compras} NF{r.compras !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <Search size={14} style={s.searchIcon} />
          <input style={s.input} placeholder="Buscar fornecedor ou NF..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select style={s.select} value={periodo} onChange={e => setPeriodo(e.target.value)}>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="180">Últimos 6 meses</option>
          <option value="365">Último ano</option>
          <option value="todos">Todas as compras</option>
        </select>
        <span style={{ fontSize: ".78rem", color: "#64748b", fontWeight: 600 }}>{comprasFiltradas.length} compra{comprasFiltradas.length !== 1 ? "s" : ""}</span>
        <button style={{ ...s.btn("#059669"), marginLeft: "auto" }} onClick={() => setModalNova(true)}>
          <Plus size={14} /> Nova compra
        </button>
      </div>

      {/* Tabela */}
      <div style={s.tableWrap}>
        {comprasFiltradas.length === 0 ? (
          <div style={s.vazio}>
            <ShoppingCart size={40} style={s.emptyIcon} />
            <div>Nenhuma compra registrada ainda.</div>
            <div style={{ fontSize: ".8rem", marginTop: 4 }}>Clique em "Nova compra" pra cadastrar a primeira.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: 32 }}></th>
                  <th style={s.th}>Data</th>
                  <th style={s.th}>NF</th>
                  <th style={s.th}>Fornecedor</th>
                  <th style={s.th}>Itens</th>
                  <th style={s.th}>Pneus</th>
                  <th style={s.th}>Valor total</th>
                </tr>
              </thead>
              <tbody>
                {comprasFiltradas.map((c, idx) => {
                  const exp = expandidas.has(c.id);
                  return (
                    <>
                      <tr key={c.id} style={idx % 2 === 1 ? s.zebra : {}}>
                        <td style={s.td}>
                          <button style={s.btnExpand} onClick={() => toggleExpand(c.id)}>
                            {exp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td style={s.td}><Calendar size={11} style={{ verticalAlign: "middle", marginRight: 4, color: "#94a3b8" }} />{fmtDate(c.data || c.criadoEm)}</td>
                        <td style={{ ...s.td, fontWeight: 700, fontFamily: "monospace" }}>{c.numeroNF || "—"}</td>
                        <td style={{ ...s.td, fontWeight: 600 }}>{c.fornecedor}</td>
                        <td style={s.td}>{(c.itens || []).length}</td>
                        <td style={{ ...s.td, fontWeight: 700 }}>{c.qtdTotal || 0}</td>
                        <td style={{ ...s.td, fontWeight: 800, color: "#0f172a" }}>{fmtBRL(c.valorTotal)}</td>
                      </tr>
                      {exp && (
                        <tr style={s.expandRow}>
                          <td colSpan={7} style={{ padding: "12px 20px" }}>
                            <div style={{ fontSize: ".76rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Itens da NF</div>
                            {(c.itens || []).map((it, i) => (
                              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "center", flexWrap: "wrap", fontSize: ".82rem" }}>
                                <span style={s.chipMed}>{it.medida}</span>
                                <span style={s.chipVida}>{VIDAS.find(v => v.id === it.vida)?.label || it.vida}</span>
                                <span style={{ fontWeight: 700 }}>{it.marca}</span>
                                <span style={{ color: "#64748b" }}>{it.modelo || "—"}</span>
                                <span style={{ marginLeft: "auto", fontWeight: 700 }}>{it.quantidade}× {fmtBRL(it.custoUnitario)}</span>
                                <span style={{ fontWeight: 800, color: "#059669", minWidth: 100, textAlign: "right" }}>{fmtBRL((it.quantidade || 0) * (it.custoUnitario || 0))}</span>
                              </div>
                            ))}
                            {c.observacao && (
                              <div style={{ marginTop: 8, fontSize: ".78rem", color: "#64748b", fontStyle: "italic" }}>Obs: {c.observacao}</div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalNova && (
        <ModalCompra
          fornecedores={fornecedores || []}
          quemSou={quemSou}
          garantirFornecedor={garantirFornecedor}
          ultimoFogoNum={ultimoFogoNum}
          onSalvar={salvarCompra}
          onFechar={() => setModalNova(false)}
        />
      )}
    </div>
  );
}
