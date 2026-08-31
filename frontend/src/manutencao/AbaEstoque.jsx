// Aba Estoque — controle de entrada/saída de itens (óleo, filtros, peças, etc).
// Diferencia unidade automaticamente por categoria.
// Coleções: estoque_itens (catálogo) + estoque_movimentacoes (log).

import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, doc, runTransaction, query, orderBy
} from "firebase/firestore";
import { db } from "../firebase/config";
import { watch as dsWatch, insert as dsInsert, patch as dsPatch, get as dsGet } from "../services/genericDataSource";
import {
  Package, Plus, ArrowDownToLine, ArrowUpFromLine, History,
  Search, Edit3, Trash2, X, AlertTriangle, TrendingUp, TrendingDown, Droplets, FileUp
} from "lucide-react";

// ═══ CATÁLOGO DE CATEGORIAS + UNIDADE PADRÃO ═══
const CATEGORIAS = [
  { id: "oleos",       label: "Óleos e Lubrificantes", unidade: "L",  cor: "#0891b2", exemplos: "Óleo motor, caixa, diferencial" },
  { id: "fluidos",     label: "Fluidos",               unidade: "L",  cor: "#0284c7", exemplos: "Fluido freio, arrefecimento" },
  { id: "arla",        label: "ARLA 32",               unidade: "L",  cor: "#06b6d4", exemplos: "ARLA em bombonas" },
  { id: "filtros",     label: "Filtros",               unidade: "UN", cor: "#7c3aed", exemplos: "Óleo, ar, combustível, cabine" },
  { id: "pecas_mec",   label: "Peças Mecânicas",       unidade: "UN", cor: "#dc2626", exemplos: "Freio, embreagem, correia" },
  { id: "pecas_ele",   label: "Peças Elétricas",       unidade: "UN", cor: "#f59e0b", exemplos: "Bateria, lâmpada, sensor" },
  { id: "pneus",       label: "Pneus",                 unidade: "UN", cor: "#0f172a", exemplos: "Pneus novos ou recapados" },
  { id: "mangotes",    label: "Mangotes e Mangueiras", unidade: "M",  cor: "#ea580c", exemplos: "Mangote de descarga, mangueiras hidráulicas" },
  { id: "epi",         label: "EPI",                   unidade: "UN", cor: "#059669", exemplos: "Luva, óculos, botina" },
  { id: "ferramentas", label: "Ferramentas",           unidade: "UN", cor: "#475569", exemplos: "Chave, alicate, macaco" },
  { id: "outros",      label: "Outros",                unidade: "UN", cor: "#64748b", exemplos: "Qualquer outro item" },
];
const UNIDADES = [
  { id: "L",  label: "Litros"   },
  { id: "UN", label: "Unidade"  },
  { id: "KG", label: "Quilos"   },
  { id: "M",  label: "Metros"   },
];
const catMap = Object.fromEntries(CATEGORIAS.map(c => [c.id, c]));

const fmtQ = (q, u) => {
  const fracionavel = u === "L" || u === "KG" || u === "M"; // metros também têm fração (12,50 m)
  return `${Number(q).toLocaleString("pt-BR", { minimumFractionDigits: fracionavel ? 2 : 0, maximumFractionDigits: 2 })} ${u}`;
};
const fmtBRL = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" },
  h1: { margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--text)" },
  h2: { margin: "3px 0 0", fontSize: ".8rem", color: "var(--text-muted)", fontWeight: 500 },

  subnav: { display: "flex", gap: 4, background: "var(--surface-2)", padding: 4, borderRadius: 10, alignSelf: "flex-start" },
  subtab: (active, cor) => ({
    padding: "8px 14px", borderRadius: 8, border: "none",
    background: active ? "var(--card-bg)" : "transparent",
    color: active ? cor : "var(--text-muted)",
    boxShadow: active ? "0 1px 3px rgba(15,23,42,.1)" : "none",
    fontWeight: 700, fontSize: ".84rem", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 6,
    fontFamily: "inherit",
  }),

  kpiRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  kpiCard: (cor, bg) => ({ background: bg, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4, border: "1px solid var(--border)" }),
  kpiN: (cor) => ({ fontSize: "1.5rem", fontWeight: 800, color: cor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }),
  kpiL: (cor) => ({ fontSize: ".72rem", fontWeight: 700, color: cor, textTransform: "uppercase", letterSpacing: ".05em" }),

  toolbar: { display: "flex", alignItems: "center", gap: 10, background: "var(--card-bg)", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", flexWrap: "wrap" },
  searchWrap: { position: "relative", flex: "1 1 220px", minWidth: 180 },
  searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)", pointerEvents: "none" },
  input: { width: "100%", padding: "8px 10px 8px 32px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", fontSize: ".88rem", outline: "none", fontFamily: "inherit" },
  select: { padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", fontSize: ".85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  btn: (bg) => ({ padding: "8px 14px", borderRadius: 8, background: bg, color: "#fff", border: "none", cursor: "pointer", fontSize: ".85rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }),

  tableWrap: { background: "var(--card-bg)", borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" },
  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" },
  th: { padding: "9px 14px", fontSize: ".7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", textAlign: "left", whiteSpace: "nowrap" },
  td: { padding: "10px 14px", fontSize: ".85rem", borderBottom: "1px solid var(--surface-2)", verticalAlign: "middle", color: "var(--text)" },
  zebra: { background: "var(--surface-2)" },

  catChip: (cor) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: "var(--border)", color: cor, fontSize: ".72rem", fontWeight: 700 }),
  tipoChip: (tipo) => ({
    display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6,
    background: tipo === "entrada" ? "var(--success-bg)" : "var(--danger-bg)",
    color: tipo === "entrada" ? "#166534" : "#991b1b",
    fontSize: ".72rem", fontWeight: 700,
  }),
  saldoBaixo: { color: "var(--danger)", fontWeight: 800 },
  saldoOk: { color: "var(--text)", fontWeight: 700 },

  modal: { position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modalBox: { background: "var(--card-bg)", borderRadius: 12, padding: 20, width: 480, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.35)" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTit: { margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--text)" },
  modalClose: { background: "transparent", border: "none", cursor: "pointer", color: "var(--text-subtle)", padding: 4 },

  fRow: { display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 },
  fLbl: { fontSize: ".72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em" },
  fInp: { padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-strong)", fontFamily: "inherit", fontSize: ".9rem", outline: "none" },
  fRowGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  fMsg: { padding: "8px 12px", borderRadius: 6, fontSize: ".82rem", marginBottom: 12 },
  fMsgErr: { background: "var(--danger-bg)", color: "#991b1b", border: "1px solid var(--danger-border)" },
  fMsgOk:  { background: "var(--success-bg)", color: "#166534", border: "1px solid #86efac" },
  fBtns: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 },

  vazio: { padding: "60px 20px", textAlign: "center", color: "var(--text-subtle)", fontSize: ".9rem" },
  emptyIcon: { color: "var(--border-strong)", margin: "0 auto 12px", display: "block" },
};

// ═══ MODAL: NOVO/EDITAR ITEM ═══
function ModalItem({ item, onSalvar, onFechar }) {
  const isEdit = !!item;
  const [nome, setNome] = useState(item?.nome || "");
  const [categoria, setCategoria] = useState(item?.categoria || "oleos");
  const [unidade, setUnidade] = useState(item?.unidade || catMap.oleos.unidade);
  const [estMin, setEstMin] = useState(item?.estoqueMinimo ?? "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Se muda categoria, sugere unidade
  useEffect(() => {
    if (!isEdit) setUnidade(catMap[categoria]?.unidade || "UN");
  }, [categoria, isEdit]);

  const catAtual = catMap[categoria];

  async function submeter(e) {
    e.preventDefault();
    setErro("");
    if (!nome.trim()) return setErro("Nome é obrigatório");
    if (nome.trim().length < 3) return setErro("Nome muito curto");
    setSalvando(true);
    try {
      await onSalvar({
        nome: nome.trim(),
        categoria,
        unidade,
        estoqueMinimo: Number(estMin) || 0,
        ...(isEdit ? {} : { saldoAtual: 0, custoMedio: 0, ativo: true, criadoEm: new Date().toISOString() }),
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
          <h3 style={s.modalTit}>{isEdit ? "Editar item" : "Novo item no catálogo"}</h3>
          <button type="button" style={s.modalClose} onClick={onFechar}><X size={20} /></button>
        </div>

        {erro && <div style={{ ...s.fMsg, ...s.fMsgErr }}>{erro}</div>}

        <div style={s.fRow}>
          <label style={s.fLbl}>Nome do item *</label>
          <input style={s.fInp} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Óleo motor 15W40 Ipiranga" autoFocus />
        </div>

        <div style={s.fRow}>
          <label style={s.fLbl}>Categoria</label>
          <select style={s.fInp} value={categoria} onChange={e => setCategoria(e.target.value)}>
            {CATEGORIAS.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          {catAtual && <div style={{ fontSize: ".72rem", color: "var(--text-muted)", marginTop: 2 }}>Ex: {catAtual.exemplos}</div>}
        </div>

        <div style={s.fRowGrid}>
          <div style={s.fRow}>
            <label style={s.fLbl}>Unidade</label>
            <select style={s.fInp} value={unidade} onChange={e => setUnidade(e.target.value)}>
              {UNIDADES.map(u => (
                <option key={u.id} value={u.id}>{u.label} ({u.id})</option>
              ))}
            </select>
          </div>
          <div style={s.fRow}>
            <label style={s.fLbl}>Estoque mínimo</label>
            <input style={s.fInp} type="number" step="0.01" min="0" value={estMin} onChange={e => setEstMin(e.target.value)} placeholder="0" />
          </div>
        </div>

        <div style={s.fBtns}>
          <button type="button" style={{ ...s.btn("var(--surface-2)"), color: "var(--text-muted)" }} onClick={onFechar}>Cancelar</button>
          <button type="submit" style={s.btn("var(--text)")} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}

// ═══ MODAL: ENTRADA ═══
function ModalEntrada({ itens, onSalvar, onFechar }) {
  const [itemId, setItemId] = useState("");
  const [qtd, setQtd] = useState("");
  const [custoUn, setCustoUn] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [nf, setNf] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const item = itens.find(i => i.id === itemId);

  async function submeter(e) {
    e.preventDefault();
    setErro("");
    if (!item) return setErro("Selecione o item");
    const q = Number(qtd);
    if (!q || q <= 0) return setErro("Quantidade deve ser maior que zero");
    setSalvando(true);
    try {
      await onSalvar({
        tipo: "entrada",
        itemId: item.id,
        itemNome: item.nome,
        itemUnidade: item.unidade,
        quantidade: q,
        custoUnitario: Number(custoUn) || 0,
        custoTotal: (Number(custoUn) || 0) * q,
        fornecedor: fornecedor.trim() || null,
        notaFiscal: nf.trim() || null,
        data,
        observacao: obs.trim() || null,
      });
      onFechar();
    } catch (err) {
      setErro("Erro: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={s.modal} onClick={onFechar}>
      <form style={s.modalBox} onClick={e => e.stopPropagation()} onSubmit={submeter}>
        <div style={s.modalHead}>
          <h3 style={s.modalTit}><ArrowDownToLine size={18} color="#059669" /> Registrar entrada</h3>
          <button type="button" style={s.modalClose} onClick={onFechar}><X size={20} /></button>
        </div>

        {erro && <div style={{ ...s.fMsg, ...s.fMsgErr }}>{erro}</div>}

        <div style={s.fRow}>
          <label style={s.fLbl}>Item *</label>
          <select style={s.fInp} value={itemId} onChange={e => setItemId(e.target.value)} autoFocus>
            <option value="">— Selecione —</option>
            {itens.map(i => (
              <option key={i.id} value={i.id}>{i.nome} · saldo: {fmtQ(i.saldoAtual || 0, i.unidade)}</option>
            ))}
          </select>
        </div>

        <div style={s.fRowGrid}>
          <div style={s.fRow}>
            <label style={s.fLbl}>Quantidade * {item ? `(${item.unidade})` : ""}</label>
            <input style={s.fInp} type="number" step="0.01" min="0.01" value={qtd} onChange={e => setQtd(e.target.value)} placeholder="0" />
          </div>
          <div style={s.fRow}>
            <label style={s.fLbl}>Custo unitário (R$)</label>
            <input style={s.fInp} type="number" step="0.01" min="0" value={custoUn} onChange={e => setCustoUn(e.target.value)} placeholder="0,00" />
          </div>
        </div>

        <div style={s.fRowGrid}>
          <div style={s.fRow}>
            <label style={s.fLbl}>Data</label>
            <input style={s.fInp} type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div style={s.fRow}>
            <label style={s.fLbl}>Nota fiscal</label>
            <input style={s.fInp} value={nf} onChange={e => setNf(e.target.value)} placeholder="Ex: 12345" />
          </div>
        </div>

        <div style={s.fRow}>
          <label style={s.fLbl}>Fornecedor</label>
          <input style={s.fInp} value={fornecedor} onChange={e => setFornecedor(e.target.value)} placeholder="Ex: Ipiranga" />
        </div>

        <div style={s.fRow}>
          <label style={s.fLbl}>Observação</label>
          <input style={s.fInp} value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />
        </div>

        {item && qtd && (
          <div style={{ ...s.fMsg, ...s.fMsgOk }}>
            Saldo passará de <strong>{fmtQ(item.saldoAtual || 0, item.unidade)}</strong> para <strong>{fmtQ((item.saldoAtual || 0) + Number(qtd), item.unidade)}</strong>
          </div>
        )}

        <div style={s.fBtns}>
          <button type="button" style={{ ...s.btn("var(--surface-2)"), color: "var(--text-muted)" }} onClick={onFechar}>Cancelar</button>
          <button type="submit" style={s.btn("#059669")} disabled={salvando}>{salvando ? "Salvando..." : "Registrar entrada"}</button>
        </div>
      </form>
    </div>
  );
}

// ═══ MODAL: SAÍDA ═══
function ModalSaida({ itens, veiculos, onSalvar, onFechar }) {
  const [itemId, setItemId] = useState("");
  const [qtd, setQtd] = useState("");
  const [placa, setPlaca] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const item = itens.find(i => i.id === itemId);
  const saldo = item?.saldoAtual || 0;
  const qNum = Number(qtd) || 0;
  const insuficiente = item && qNum > saldo;

  async function submeter(e) {
    e.preventDefault();
    setErro("");
    if (!item) return setErro("Selecione o item");
    if (!qNum || qNum <= 0) return setErro("Quantidade deve ser maior que zero");
    if (insuficiente) return setErro(`Saldo insuficiente. Disponível: ${fmtQ(saldo, item.unidade)}`);
    setSalvando(true);
    try {
      await onSalvar({
        tipo: "saida",
        itemId: item.id,
        itemNome: item.nome,
        itemUnidade: item.unidade,
        quantidade: qNum,
        veiculoPlaca: placa || null,
        data,
        observacao: obs.trim() || null,
      });
      onFechar();
    } catch (err) {
      setErro("Erro: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={s.modal} onClick={onFechar}>
      <form style={s.modalBox} onClick={e => e.stopPropagation()} onSubmit={submeter}>
        <div style={s.modalHead}>
          <h3 style={s.modalTit}><ArrowUpFromLine size={18} color="var(--danger)" /> Registrar saída</h3>
          <button type="button" style={s.modalClose} onClick={onFechar}><X size={20} /></button>
        </div>

        {erro && <div style={{ ...s.fMsg, ...s.fMsgErr }}>{erro}</div>}

        <div style={s.fRow}>
          <label style={s.fLbl}>Item *</label>
          <select style={s.fInp} value={itemId} onChange={e => setItemId(e.target.value)} autoFocus>
            <option value="">— Selecione —</option>
            {itens.map(i => {
              const saldo = Number(i.saldoAtual || 0);
              return (
                <option key={i.id} value={i.id} disabled={saldo <= 0}>
                  {i.nome} · {saldo > 0 ? `disp: ${fmtQ(saldo, i.unidade)}` : "sem saldo"}
                </option>
              );
            })}
          </select>
          {itens.length === 0 && (
            <div style={{ fontSize: ".76rem", color: "var(--danger)", marginTop: 4, fontWeight: 600 }}>
              Nenhum item cadastrado. Cadastre no Catálogo primeiro.
            </div>
          )}
          {itens.length > 0 && itens.every(i => Number(i.saldoAtual || 0) <= 0) && (
            <div style={{ fontSize: ".76rem", color: "var(--warning)", marginTop: 4, fontWeight: 600 }}>
              Nenhum item tem saldo. Registre uma entrada primeiro.
            </div>
          )}
        </div>

        <div style={s.fRowGrid}>
          <div style={s.fRow}>
            <label style={s.fLbl}>Quantidade * {item ? `(${item.unidade})` : ""}</label>
            <input style={s.fInp} type="number" step="0.01" min="0.01" value={qtd} onChange={e => setQtd(e.target.value)} placeholder="0" />
            {item && <div style={{ fontSize: ".72rem", color: insuficiente ? "var(--danger)" : "var(--text-muted)", marginTop: 2, fontWeight: insuficiente ? 700 : 500 }}>
              Disponível: {fmtQ(saldo, item.unidade)}
            </div>}
          </div>
          <div style={s.fRow}>
            <label style={s.fLbl}>Veículo (opcional)</label>
            <select style={s.fInp} value={placa} onChange={e => setPlaca(e.target.value)}>
              <option value="">— Nenhum —</option>
              {veiculos.map(v => (
                <option key={v.id || v.placa} value={v.placa}>{v.placa}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={s.fRow}>
          <label style={s.fLbl}>Data</label>
          <input style={s.fInp} type="date" value={data} onChange={e => setData(e.target.value)} />
        </div>

        <div style={s.fRow}>
          <label style={s.fLbl}>Observação</label>
          <input style={s.fInp} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: Troca de óleo do SEF-1H24" />
        </div>

        {item && qNum > 0 && !insuficiente && (
          <div style={{ ...s.fMsg, ...s.fMsgOk }}>
            Saldo passará de <strong>{fmtQ(saldo, item.unidade)}</strong> para <strong>{fmtQ(saldo - qNum, item.unidade)}</strong>
          </div>
        )}

        <div style={s.fBtns}>
          <button type="button" style={{ ...s.btn("var(--surface-2)"), color: "var(--text-muted)" }} onClick={onFechar}>Cancelar</button>
          <button type="submit" style={s.btn("var(--danger)")} disabled={salvando || insuficiente}>{salvando ? "Salvando..." : "Registrar saída"}</button>
        </div>
      </form>
    </div>
  );
}

// ═══ COMPONENTE PRINCIPAL ═══
export default function AbaEstoque({ veiculos, quemSou }) {
  const [subaba, setSubaba] = useState("catalogo");
  const [itens, setItens] = useState([]);
  const [movs, setMovs] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroCat, setFiltroCat] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [modalItem, setModalItem] = useState(null); // null = fechado, "novo" = novo, obj = editar
  const [modalEnt, setModalEnt] = useState(false);
  const [modalSai, setModalSai] = useState(false);
  const [modalImportNfe, setModalImportNfe] = useState(null); // null = fechado, {nfe} = preview de items pra confirmar
  const [importNfeErro, setImportNfeErro] = useState("");
  const [importNfeSalvando, setImportNfeSalvando] = useState(false);

  // Load em tempo real
  useEffect(() => {
    const un1 = dsWatch("estoque_itens", snap => {
      setItens(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, { orderBy: "nome" });
    const un2 = dsWatch("estoque_movimentacoes", snap => {
      setMovs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, { orderBy: "criadoEm", order: "desc" });
    return () => { un1(); un2(); };
  }, []);

  // Parse XML NF-e e extrai items (formato SEFAZ padrão)
  function parseNfeXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("XML inválido");
    // Suporta <nfeProc><NFe> ou <NFe> direto
    const infNFe = doc.querySelector("infNFe");
    if (!infNFe) throw new Error("XML não parece ser uma NF-e válida (sem <infNFe>)");
    const get = (parent, tag) => parent?.querySelector(tag)?.textContent?.trim() || "";
    const emit = infNFe.querySelector("emit");
    const ide = infNFe.querySelector("ide");
    const total = infNFe.querySelector("total ICMSTot");
    const fornecedor = get(emit, "xNome");
    const cnpj = get(emit, "CNPJ") || get(emit, "CPF");
    const numeroNfe = get(ide, "nNF");
    const serie = get(ide, "serie");
    const dataEmissao = get(ide, "dhEmi") || get(ide, "dEmi");
    const valorTotal = Number(get(total, "vNF") || 0);
    const items = [];
    infNFe.querySelectorAll("det").forEach(det => {
      const prod = det.querySelector("prod");
      if (!prod) return;
      items.push({
        nItem: det.getAttribute("nItem") || "",
        codigo: get(prod, "cProd"),
        ean: get(prod, "cEAN"),
        nome: get(prod, "xProd"),
        ncm: get(prod, "NCM"),
        cfop: get(prod, "CFOP"),
        unidade: get(prod, "uCom") || "UN",
        quantidade: Number(get(prod, "qCom") || 0),
        valorUnitario: Number(get(prod, "vUnCom") || 0),
        valorTotal: Number(get(prod, "vProd") || 0),
        // Categoria: chuta pelos termos comuns no nome
        categoria: guessCategoria(get(prod, "xProd")),
        // Se true, cria novo item no catálogo. Se false, é linked a `linkItemId`
        criarNovo: true,
        linkItemId: null,
      });
    });
    return { fornecedor, cnpj, numeroNfe, serie, dataEmissao, valorTotal, items };
  }

  // Chuta categoria baseado em palavras-chave do nome
  function guessCategoria(nome) {
    const n = String(nome || "").toLowerCase();
    if (/óleo|oleo|lubrific/.test(n)) return "oleos";
    if (/arla/.test(n)) return "arla";
    if (/fluido/.test(n)) return "fluidos";
    if (/filtro/.test(n)) return "filtros";
    if (/pneu/.test(n)) return "pneus";
    if (/mangot|mangueira/.test(n)) return "mangotes";
    if (/bateria|lâmpada|lampada|sensor|elétric|eletric|farol/.test(n)) return "pecas_ele";
    if (/luva|óculos|oculos|botina|epi/.test(n)) return "epi";
    if (/chave|alicate|macaco|ferramenta/.test(n)) return "ferramentas";
    if (/freio|embreag|correia|amortec|coxim|junta|pastilha|disco/.test(n)) return "pecas_mec";
    return "outros";
  }

  async function abrirImportNfe(file) {
    setImportNfeErro("");
    try {
      const text = await file.text();
      const nfe = parseNfeXml(text);
      if (nfe.items.length === 0) throw new Error("NF-e não tem itens (<det>)");
      setModalImportNfe(nfe);
    } catch (e) {
      setImportNfeErro("Erro ao ler XML: " + (e?.message || e));
      setModalImportNfe(null);
    }
  }

  async function confirmarImportNfe() {
    if (!modalImportNfe) return;
    setImportNfeSalvando(true);
    setImportNfeErro("");
    try {
      const nfe = modalImportNfe;
      const catalogoPorNome = new Map(itens.map(it => [String(it.nome || "").toLowerCase().trim(), it]));

      for (const it of nfe.items) {
        let itemId = null;
        if (it.criarNovo) {
          // Ou reutiliza item existente com mesmo nome, ou cria novo
          const nomeKey = String(it.nome).toLowerCase().trim();
          const existente = catalogoPorNome.get(nomeKey);
          if (existente) {
            itemId = existente.id;
          } else {
            const cat = catMap[it.categoria] || catMap["outros"];
            const ref = await dsInsert("estoque_itens", {
              nome: it.nome,
              categoria: it.categoria,
              unidade: cat?.unidade || it.unidade || "UN",
              saldoAtual: 0,
              custoMedio: 0,
              codigo: it.codigo || "",
              ean: it.ean || "",
              ncm: it.ncm || "",
              criadoEm: new Date().toISOString(),
              criadoPor: quemSou?.() || "—",
              atualizadoEm: new Date().toISOString(),
              atualizadoPor: quemSou?.() || "—",
            });
            itemId = ref.id;
          }
        } else if (it.linkItemId) {
          itemId = it.linkItemId;
        } else {
          continue; // pulou sem escolha
        }

        // Cria movimentação de entrada
        await salvarMov({
          itemId,
          tipo: "entrada",
          quantidade: it.quantidade,
          custoUnitario: it.valorUnitario,
          valorTotal: it.valorTotal,
          fornecedor: nfe.fornecedor,
          cnpjFornecedor: nfe.cnpj,
          nfeNumero: nfe.numeroNfe,
          nfeSerie: nfe.serie,
          nfeData: nfe.dataEmissao,
          origem: "import_nfe",
          obs: `NF-e ${nfe.numeroNfe}/${nfe.serie} · ${nfe.fornecedor}`,
        });
      }

      setModalImportNfe(null);
    } catch (e) {
      console.error("confirmarImportNfe:", e);
      setImportNfeErro("Erro ao importar: " + (e?.message || e));
    } finally {
      setImportNfeSalvando(false);
    }
  }

  // Salvar item (catálogo)
  async function salvarItem(payload) {
    const dados = {
      ...payload,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: quemSou?.() || "—",
    };
    if (modalItem === "novo") {
      await dsInsert("estoque_itens", dados);
    } else {
      await dsPatch("estoque_itens", modalItem.id, dados);
    }
  }

  // Salvar movimentação — SEM runTransaction (aceita race condition raro)
  async function salvarMov(payload) {
    {
      const item = await dsGet("estoque_itens", payload.itemId);
      if (!item) throw new Error("Item não existe mais no catálogo");
      const tx = null; // placeholder — bloco original mantém estrutura

      // Sanitização robusta contra dados legados/inconsistentes
      const rawSaldo = Number(item.saldoAtual);
      const saldoAntes = Number.isFinite(rawSaldo) ? rawSaldo : 0;
      const q = Number(payload.quantidade);
      if (!Number.isFinite(q) || q <= 0) throw new Error("Quantidade inválida");

      const saldoNovo = payload.tipo === "entrada" ? saldoAntes + q : saldoAntes - q;
      if (saldoNovo < 0) throw new Error(`Saldo insuficiente. Disponível: ${saldoAntes} ${item.unidade || ""}`);

      // Custo médio ponderado (só entrada)
      const rawCusto = Number(item.custoMedio);
      let custoMedioNovo = Number.isFinite(rawCusto) ? rawCusto : 0;
      const custoUn = Number(payload.custoUnitario);
      if (payload.tipo === "entrada" && Number.isFinite(custoUn) && custoUn > 0) {
        const valorAntes = saldoAntes * custoMedioNovo;
        const valorEntrada = q * custoUn;
        custoMedioNovo = saldoNovo > 0 ? (valorAntes + valorEntrada) / saldoNovo : custoUn;
      }

      await dsPatch("estoque_itens", payload.itemId, {
        saldoAtual: saldoNovo,
        custoMedio: custoMedioNovo,
        atualizadoEm: new Date().toISOString(),
      });

      const clean = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined && v !== null && v !== "")
      );
      await dsInsert("estoque_movimentacoes", {
        ...clean,
        saldoAntes,
        saldoDepois: saldoNovo,
        responsavel: quemSou?.() || "—",
        criadoEm: new Date().toISOString(),
      });
    }
  }

  // KPIs
  const kpi = useMemo(() => {
    const totalItens = itens.length;
    const abaixoMin = itens.filter(i => Number(i.saldoAtual || 0) < Number(i.estoqueMinimo || 0)).length;
    const valorEstoque = itens.reduce((acc, i) => acc + Number(i.saldoAtual || 0) * Number(i.custoMedio || 0), 0);
    const hoje = new Date().toISOString().slice(0, 10);
    const movsHoje = movs.filter(m => m.data === hoje);
    return {
      totalItens, abaixoMin, valorEstoque,
      entradaHoje: movsHoje.filter(m => m.tipo === "entrada").length,
      saidaHoje: movsHoje.filter(m => m.tipo === "saida").length,
    };
  }, [itens, movs]);

  // Lista filtrada — CATÁLOGO
  const itensFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter(i => {
      if (q && !i.nome.toLowerCase().includes(q)) return false;
      if (filtroCat !== "todos" && i.categoria !== filtroCat) return false;
      return true;
    });
  }, [itens, busca, filtroCat]);

  // Lista filtrada — MOVIMENTAÇÕES
  const movsFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return movs.filter(m => {
      if (q && !m.itemNome.toLowerCase().includes(q) && !(m.veiculoPlaca || "").toLowerCase().includes(q)) return false;
      if (filtroTipo !== "todos" && m.tipo !== filtroTipo) return false;
      return true;
    });
  }, [movs, busca, filtroTipo]);

  return (
    <div style={s.wrap}>
      <div style={s.head}>
        <div>
          <h1 style={s.h1}>Estoque</h1>
          <p style={s.h2}>Controle de entrada e saída de óleos, filtros, peças e insumos</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={s.kpiRow}>
        <div style={s.kpiCard("var(--text)", "var(--surface-2)")}><div style={s.kpiN("var(--text)")}>{kpi.totalItens}</div><div style={s.kpiL("var(--text)")}>Itens cadastrados</div></div>
        <div style={s.kpiCard("var(--danger)", "var(--danger-bg)")}><div style={s.kpiN("var(--danger)")}>{kpi.abaixoMin}</div><div style={s.kpiL("var(--danger)")}>Abaixo do mínimo</div></div>
        <div style={s.kpiCard("#059669", "#f0fdf4")}><div style={s.kpiN("#059669")}>{fmtBRL(kpi.valorEstoque)}</div><div style={s.kpiL("#059669")}>Valor em estoque</div></div>
        <div style={s.kpiCard("var(--tech)", "#f0f9ff")}><div style={s.kpiN("var(--tech)")}>{kpi.entradaHoje} / {kpi.saidaHoje}</div><div style={s.kpiL("var(--tech)")}>Entradas/Saídas hoje</div></div>
      </div>

      {/* Sub-tabs */}
      <div style={s.subnav}>
        <button style={s.subtab(subaba === "catalogo", "#0f172a")} onClick={() => setSubaba("catalogo")}>
          <Package size={15} /> Catálogo
        </button>
        <button style={s.subtab(subaba === "movimentar", "#0f172a")} onClick={() => setSubaba("movimentar")}>
          <History size={15} /> Movimentações
        </button>
      </div>

      {/* Alerta de itens abaixo do mínimo — só se tem algum */}
      {kpi.abaixoMin > 0 && (() => {
        const abaixo = itens.filter(i => Number(i.saldoAtual || 0) < Number(i.estoqueMinimo || 0));
        return (
          <div style={{ background:"var(--danger-bg)", border:"1px solid var(--danger-border)", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"flex-start", gap:12 }}>
            <AlertTriangle size={20} color="var(--danger)" style={{ flexShrink:0, marginTop:2 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, color:"var(--danger)", fontSize:".9rem", marginBottom:6 }}>
                {abaixo.length} {abaixo.length === 1 ? "item" : "itens"} abaixo do estoque mínimo — repor urgente
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {abaixo.slice(0, 12).map(it => (
                  <button
                    key={it.id}
                    onClick={() => setModalItem(it)}
                    title={`Editar — atual: ${fmtQ(Number(it.saldoAtual||0), it.unidade)} · mín: ${fmtQ(Number(it.estoqueMinimo||0), it.unidade)}`}
                    style={{ background:"var(--card-bg)", border:"1px solid #fca5a5", color:"#991b1b", padding:"4px 10px", borderRadius:999, fontSize:".78rem", fontWeight:600, cursor:"pointer" }}
                  >
                    {it.nome} <span style={{ color:"var(--danger)", marginLeft:4 }}>{fmtQ(Number(it.saldoAtual||0), it.unidade)}/{fmtQ(Number(it.estoqueMinimo||0), it.unidade)}</span>
                  </button>
                ))}
                {abaixo.length > 12 && <span style={{ fontSize:".78rem", color:"#7f1d1d", padding:"4px 6px" }}>+{abaixo.length - 12} outros</span>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CATÁLOGO */}
      {subaba === "catalogo" && (
        <>
          <div style={s.toolbar}>
            <div style={s.searchWrap}>
              <Search size={14} style={s.searchIcon} />
              <input style={s.input} placeholder="Buscar item..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <select style={s.select} value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
              <option value="todos">Todas categorias</option>
              {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <span style={{ fontSize: ".78rem", color: "var(--text-muted)", fontWeight: 600 }}>{itensFiltrados.length} de {itens.length}</span>
            <button style={{ ...s.btn("#059669"), marginLeft: "auto" }} onClick={() => setModalEnt(true)} disabled={itens.length === 0}>
              <ArrowDownToLine size={14} /> Entrada
            </button>
            <button style={s.btn("var(--danger)")} onClick={() => setModalSai(true)} disabled={itens.length === 0}>
              <ArrowUpFromLine size={14} /> Saída
            </button>
            <label style={{ ...s.btn("var(--info)"), cursor: "pointer" }} title="Importar NF-e (XML SEFAZ) — cadastra itens e registra entrada automaticamente">
              <FileUp size={14} /> Importar NF-e
              <input
                type="file"
                accept=".xml,text/xml,application/xml"
                onChange={e => { if (e.target.files?.[0]) abrirImportNfe(e.target.files[0]); e.target.value = ""; }}
                style={{ display: "none" }}
              />
            </label>
            <button style={s.btn("var(--text)")} onClick={() => setModalItem("novo")}>
              <Plus size={14} /> Novo item
            </button>
          </div>
          {importNfeErro && !modalImportNfe && (
            <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "8px 12px", borderRadius: 6, fontSize: ".85rem", marginTop: -6 }}>
              {importNfeErro}
            </div>
          )}

          <div style={s.tableWrap}>
            {itensFiltrados.length === 0 ? (
              <div style={s.vazio}>
                <Droplets size={40} style={s.emptyIcon} />
                <div>Nenhum item cadastrado ainda.</div>
                <div style={{ fontSize: ".8rem", marginTop: 4 }}>Clique em "Novo item" pra começar.</div>
              </div>
            ) : (
              <div style={s.tableScroll}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Item</th>
                      <th style={s.th}>Categoria</th>
                      <th style={s.th}>Saldo</th>
                      <th style={s.th}>Estoque mínimo</th>
                      <th style={s.th}>Custo médio</th>
                      <th style={s.th}>Valor</th>
                      <th style={s.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensFiltrados.map((it, idx) => {
                      const cat = catMap[it.categoria];
                      const abaixoMin = Number(it.saldoAtual || 0) < Number(it.estoqueMinimo || 0);
                      return (
                        <tr key={it.id} style={idx % 2 === 1 ? s.zebra : {}}>
                          <td style={{ ...s.td, fontWeight: 700 }}>{it.nome}</td>
                          <td style={s.td}>
                            {cat && <span style={s.catChip(cat.cor)}>{cat.label}</span>}
                          </td>
                          <td style={{ ...s.td, ...(abaixoMin ? s.saldoBaixo : s.saldoOk) }}>
                            {abaixoMin && <AlertTriangle size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />}
                            {fmtQ(it.saldoAtual || 0, it.unidade)}
                          </td>
                          <td style={{ ...s.td, color: "var(--text-muted)" }}>{fmtQ(it.estoqueMinimo || 0, it.unidade)}</td>
                          <td style={{ ...s.td, color: "var(--text-muted)" }}>{fmtBRL(it.custoMedio || 0)}</td>
                          <td style={{ ...s.td, fontWeight: 700 }}>{fmtBRL((it.saldoAtual || 0) * (it.custoMedio || 0))}</td>
                          <td style={{ ...s.td, textAlign: "right" }}>
                            <button style={{ ...s.btn("var(--surface-2)"), color: "var(--text-muted)", border: "1px solid var(--border)", padding: "4px 8px", fontSize: ".76rem" }} onClick={() => setModalItem(it)}>
                              <Edit3 size={11} /> Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* MOVIMENTAÇÕES */}
      {subaba === "movimentar" && (
        <>
          <div style={s.toolbar}>
            <div style={s.searchWrap}>
              <Search size={14} style={s.searchIcon} />
              <input style={s.input} placeholder="Buscar item ou placa..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <select style={s.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="todos">Todos os tipos</option>
              <option value="entrada">Só entradas</option>
              <option value="saida">Só saídas</option>
            </select>
            <span style={{ fontSize: ".78rem", color: "var(--text-muted)", fontWeight: 600 }}>{movsFiltradas.length} de {movs.length}</span>
            <button style={{ ...s.btn("#059669"), marginLeft: "auto" }} onClick={() => setModalEnt(true)} disabled={itens.length === 0}>
              <ArrowDownToLine size={14} /> Entrada
            </button>
            <button style={s.btn("var(--danger)")} onClick={() => setModalSai(true)} disabled={itens.length === 0}>
              <ArrowUpFromLine size={14} /> Saída
            </button>
          </div>

          <div style={s.tableWrap}>
            {movsFiltradas.length === 0 ? (
              <div style={s.vazio}>
                <History size={40} style={s.emptyIcon} />
                <div>Nenhuma movimentação ainda.</div>
              </div>
            ) : (
              <div style={s.tableScroll}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Data</th>
                      <th style={s.th}>Tipo</th>
                      <th style={s.th}>Item</th>
                      <th style={s.th}>Qtd</th>
                      <th style={s.th}>Custo</th>
                      <th style={s.th}>Origem / Destino</th>
                      <th style={s.th}>Responsável</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movsFiltradas.map((m, idx) => (
                      <tr key={m.id} style={idx % 2 === 1 ? s.zebra : {}}>
                        <td style={s.td}>{fmtDate(m.data)}</td>
                        <td style={s.td}>
                          <span style={s.tipoChip(m.tipo)}>
                            {m.tipo === "entrada" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {m.tipo === "entrada" ? "Entrada" : "Saída"}
                          </span>
                        </td>
                        <td style={{ ...s.td, fontWeight: 600 }}>{m.itemNome}</td>
                        <td style={{ ...s.td, fontWeight: 700, color: m.tipo === "entrada" ? "#166534" : "#991b1b" }}>
                          {m.tipo === "entrada" ? "+" : "−"}{fmtQ(m.quantidade, m.itemUnidade)}
                        </td>
                        <td style={{ ...s.td, color: "var(--text-muted)" }}>
                          {m.tipo === "entrada" && m.custoTotal ? fmtBRL(m.custoTotal) : "—"}
                        </td>
                        <td style={{ ...s.td, color: "var(--text-muted)", fontSize: ".78rem" }}>
                          {m.tipo === "entrada"
                            ? (m.fornecedor ? `Fornec: ${m.fornecedor}${m.notaFiscal ? " · NF " + m.notaFiscal : ""}` : m.notaFiscal ? `NF ${m.notaFiscal}` : "—")
                            : (m.veiculoPlaca ? `Placa: ${m.veiculoPlaca}` : "—")}
                        </td>
                        <td style={{ ...s.td, color: "var(--text-muted)", fontSize: ".78rem" }}>{m.responsavel || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modais */}
      {modalItem && (
        <ModalItem
          item={modalItem === "novo" ? null : modalItem}
          onSalvar={salvarItem}
          onFechar={() => setModalItem(null)}
        />
      )}
      {modalEnt && (
        <ModalEntrada
          itens={itens}
          onSalvar={salvarMov}
          onFechar={() => setModalEnt(false)}
        />
      )}
      {modalSai && (
        <ModalSaida
          itens={itens}
          veiculos={veiculos || []}
          onSalvar={salvarMov}
          onFechar={() => setModalSai(false)}
        />
      )}
      {modalImportNfe && (
        <div onClick={() => !importNfeSalvando && setModalImportNfe(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:12, maxWidth:1100, width:"100%", maxHeight:"90vh", overflow:"auto", padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <h2 style={{ margin:0, color:"var(--text)", fontSize:"1.1rem", display:"flex", alignItems:"center", gap:8 }}>
                  <FileUp size={20} /> Importar NF-e — Preview
                </h2>
                <p style={{ margin:"4px 0 0 0", fontSize:".85rem", color:"var(--text-muted)" }}>
                  <strong>{modalImportNfe.fornecedor}</strong> · CNPJ {modalImportNfe.cnpj}
                  <br />NF nº {modalImportNfe.numeroNfe}/{modalImportNfe.serie} · {modalImportNfe.dataEmissao?.slice(0,10)} · Total {fmtBRL(modalImportNfe.valorTotal)}
                </p>
              </div>
              <button onClick={() => !importNfeSalvando && setModalImportNfe(null)} style={{ background:"none", border:"none", fontSize:"1.5rem", cursor:"pointer", color:"var(--text-muted)" }}>✕</button>
            </div>

            <p style={{ fontSize:".82rem", color:"var(--text-muted)", marginBottom:12 }}>
              <strong>{modalImportNfe.items.length}</strong> item(s) na NF-e. Confira categorias antes de importar (chuta pelo nome, você pode ajustar).
              Itens marcados <strong>criam novos</strong> no catálogo (ou reusam se nome bater exato). Todos geram <strong>movimentação de entrada</strong> com custo unitário da NF.
            </p>

            <div style={{ overflowX:"auto", border:"1px solid var(--border)", borderRadius:8, marginBottom:12 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".84rem" }}>
                <thead>
                  <tr style={{ background:"var(--surface-2)" }}>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Nome</th>
                    <th style={s.th}>Categoria</th>
                    <th style={s.th}>Qtd</th>
                    <th style={s.th}>V. Unit</th>
                    <th style={s.th}>V. Total</th>
                    <th style={s.th}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {modalImportNfe.items.map((it, i) => (
                    <tr key={i} style={i % 2 ? s.zebra : null}>
                      <td style={s.td}>{it.nItem}</td>
                      <td style={s.td}>
                        <div style={{ fontWeight:600 }}>{it.nome}</div>
                        {it.codigo && <div style={{ fontSize:".72rem", color:"var(--text-subtle)" }}>cod: {it.codigo}</div>}
                      </td>
                      <td style={s.td}>
                        <select
                          value={it.categoria}
                          onChange={e => {
                            const novo = e.target.value;
                            setModalImportNfe(prev => ({
                              ...prev,
                              items: prev.items.map((x, idx) => idx === i ? { ...x, categoria: novo } : x)
                            }));
                          }}
                          style={{ padding:"4px 8px", borderRadius:5, border:"1px solid var(--border)", fontSize:".78rem" }}
                        >
                          {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </td>
                      <td style={s.td}>{fmtQ(it.quantidade, catMap[it.categoria]?.unidade || it.unidade)}</td>
                      <td style={s.td}>{fmtBRL(it.valorUnitario)}</td>
                      <td style={{ ...s.td, fontWeight:700 }}>{fmtBRL(it.valorTotal)}</td>
                      <td style={s.td}>
                        <label style={{ display:"inline-flex", alignItems:"center", gap:4, cursor:"pointer", fontSize:".78rem" }}>
                          <input
                            type="checkbox"
                            checked={it.criarNovo}
                            onChange={e => {
                              const chk = e.target.checked;
                              setModalImportNfe(prev => ({
                                ...prev,
                                items: prev.items.map((x, idx) => idx === i ? { ...x, criarNovo: chk } : x)
                              }));
                            }}
                          />
                          Importar
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importNfeErro && (
              <div style={{ background:"var(--danger-bg)", color:"var(--danger)", padding:"8px 12px", borderRadius:6, marginBottom:12, fontSize:".85rem" }}>
                {importNfeErro}
              </div>
            )}

            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <button
                onClick={() => setModalImportNfe(null)}
                disabled={importNfeSalvando}
                style={{ padding:"8px 16px", borderRadius:8, background:"var(--surface-2)", color:"var(--text-muted)", border:"none", cursor:"pointer", fontWeight:600 }}
              >Cancelar</button>
              <button
                onClick={confirmarImportNfe}
                disabled={importNfeSalvando}
                style={{ padding:"8px 20px", borderRadius:8, background:"var(--info)", color:"#fff", border:"none", cursor:"pointer", fontWeight:700 }}
              >
                {importNfeSalvando ? "Importando..." : `Importar ${modalImportNfe.items.filter(x => x.criarNovo).length} item(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
