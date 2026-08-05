// Modulo Contratos & Retiradas - lista de contratos com semaforo de saldo.
// Novo contrato: upload do PDF -> auto-preenchimento -> form -> salva.
// Padrao visual: navy #18216E + amarelo. Icones Lucide (jamais emoji na UI).
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Upload, FileText, Search, AlertCircle, CheckCircle2,
  Truck, Factory, TrendingDown, Loader2,
} from "lucide-react";
import ModuleHeader from "../components/ModuleHeader";
import { useAuth } from "../contexts/AuthContext";
import { useRBAC } from "../rbac/RBACContext";
import { apiGet, apiPost, apiUpload } from "../services/api";

const NAVY = "#18216E";
const AMARELO = "#F5B800";

const PRODUTOS = [
  { value: "ETANOL_ANIDRO",    label: "Etanol Anidro" },
  { value: "ETANOL_HIDRATADO", label: "Etanol Hidratado" },
  { value: "DIESEL_S10",       label: "Diesel S10" },
  { value: "DIESEL_S500",      label: "Diesel S500" },
  { value: "BIODIESEL",        label: "Biodiesel (B100)" },
  { value: "BIODIESEL_BE8",    label: "Biodiesel BE8 (mistura)" },
  { value: "GASOLINA",         label: "Gasolina" },
  { value: "OUTRO",            label: "Outro" },
];

const STATUS_META = {
  ativo:     { label: "Ativo",      cor: "#16A34A" },
  esgotado:  { label: "Finalizado", cor: "#0EA5E9" },
  cancelado: { label: "Cancelado",  cor: "#DC2626" },
};

function corSaldo(pct) {
  if (pct == null) return "#94A3B8";
  if (pct >= 90)   return "#16A34A"; // verde — retirada quase finalizada
  if (pct >= 50)   return "#F5B800"; // amarelo — no meio
  return "#DC2626";                  // vermelho — ainda tem muito saldo pra retirar
}

function fmtL(litros) {
  const n = Number(litros || 0);
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " L";
}
function fmtM3(litros) {
  const n = Number(litros || 0) / 1000;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 4 }) + " m³";
}
function fmtBRL(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

function parseBR(s){ const str=String(s??"").trim().replace(/[ 	]/g,""); if(!str)return 0; if(str.includes(","))return Number(str.replace(/\./g,"").replace(",","."))||0; return Number(str)||0; }

export default function Contratos() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { temPermissao, isSuperAdmin } = useRBAC();
  const podeCriar = temPermissao("contratos.criar") || isSuperAdmin;

  const [contratos, setContratos]     = useState([]);
  const [fornecedores, setForn]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [erro, setErro]               = useState(null);

  const [filtroProduto, setFiltroProd] = useState("");
  const [filtroStatus, setFiltroSts]   = useState("ativo");
  const [busca, setBusca]              = useState("");

  const [modalNovo, setModalNovo] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null);
    try {
      const params = new URLSearchParams();
      if (filtroProduto) params.set("produto", filtroProduto);
      if (filtroStatus)  params.set("status",  filtroStatus);
      if (busca)         params.set("busca",   busca);
      const [c, f] = await Promise.all([
        apiGet(`/api/contratos?${params}`),
        apiGet(`/api/fornecedores?ativo=true`),
      ]);
      setContratos(c.rows || []);
      setForn(f.rows || []);
    } catch (e) {
      setErro(e.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [filtroProduto, filtroStatus, busca]);

  useEffect(() => { carregar(); }, [carregar]);

  const stats = useMemo(() => {
    const ativos = contratos.filter(c => c.status === "ativo" || c.status === "pago");
    const saldoTotalL = ativos.reduce((s, c) => s + Number(c.saldoLitros || 0), 0);
    const totalL      = ativos.reduce((s, c) => s + Number(c.volumeTotalLitros || 0), 0);
    const retiradoL   = totalL - saldoTotalL;
    // Somas em R$ (volume/1000 * precoPorM3)
    const valorTotalR$ = ativos.reduce((s, c) =>
      s + (Number(c.volumeTotalLitros || 0) / 1000) * Number(c.precoPorM3 || 0), 0);
    const valorSaldoR$ = ativos.reduce((s, c) =>
      s + (Number(c.saldoLitros || 0) / 1000) * Number(c.precoPorM3 || 0), 0);
    const valorRetiradoR$ = valorTotalR$ - valorSaldoR$;
    return {
      qtd: ativos.length,
      saldoTotalL, totalL, retiradoL,
      pctRetirado: totalL > 0 ? Math.round(((totalL - saldoTotalL) / totalL) * 100) : 0,
      valorTotalR$, valorSaldoR$, valorRetiradoR$,
    };
  }, [contratos]);

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      <ModuleHeader
        titulo="Contratos & Retiradas"
        subtitulo="Compras de combustível — CPA/Coopcana, distribuidoras. Volume em m³, retirada em litros."
        icone={<FileText size={22} />}
      />

      {/* KPIs — volume */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 16 }}>
        <Kpi icon={<FileText size={18}/>}      titulo="Contratos ativos"   valor={stats.qtd} />
        <Kpi icon={<Factory size={18}/>}       titulo="Volume contratado"  valor={fmtM3(stats.totalL)} />
        <Kpi icon={<TrendingDown size={18}/>}  titulo="Saldo disponível"   valor={fmtM3(stats.saldoTotalL)} destacar />
        <Kpi icon={<Truck size={18}/>}         titulo="% retirado"         valor={`${stats.pctRetirado}%`} />
      </div>

      {/* KPI — soma dos valores dos contratos ativos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(1,1fr)", gap: 12, marginTop: 12 }}>
        <Kpi titulo="Valor total contratado (R$)" valor={fmtBRL(stats.valorTotalR$)} sub={`${stats.qtd} contrato(s) ativo(s)`} />
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: "absolute", left: 10, top: 11, color: "#64748B" }} />
          <input
            placeholder="Buscar por número do contrato…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={inputStyle({ paddingLeft: 32 })}
          />
        </div>
        <select value={filtroProduto} onChange={(e) => setFiltroProd(e.target.value)} style={inputStyle()}>
          <option value="">Todos os produtos</option>
          {PRODUTOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroSts(e.target.value)} style={inputStyle()}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
        {podeCriar && (
          <button
            onClick={() => setModalNovo(true)}
            style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={16} /> Novo contrato
          </button>
        )}
      </div>

      {/* Lista */}
      <div style={{ marginTop: 12, background: "white", borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden" }}>
        {loading && <div style={loadStyle}><Loader2 className="anim-spin" size={18}/> Carregando…</div>}
        {erro && <div style={{ ...loadStyle, color: "#DC2626" }}><AlertCircle size={18}/> {erro}</div>}
        {!loading && !erro && contratos.length === 0 && (
          <div style={loadStyle}>Nenhum contrato encontrado com os filtros atuais.</div>
        )}
        {!loading && contratos.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <tr>
                <Th>Número</Th>
                <Th>Data</Th>
                <Th>Fornecedor</Th>
                <Th>Produto</Th>
                <Th align="right">Volume total</Th>
                <Th align="right">Saldo</Th>
                <Th>% retirado</Th>
                <Th align="right">Valor</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {contratos.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/contratos/${c.id}`)}
                  style={{ cursor: "pointer", borderBottom: "1px solid #F1F5F9" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#FAFCFF"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                >
                  <Td><strong style={{ color: NAVY }}>{c.numero}</strong></Td>
                  <Td>{fmtData(c.dataContrato)}</Td>
                  <Td>{c.fornecedor_razao_social || "-"}</Td>
                  <Td>{PRODUTOS.find(p => p.value === c.produto)?.label || c.produto}</Td>
                  <Td align="right">{fmtM3(c.volumeTotalLitros)}</Td>
                  <Td align="right">{fmtM3(c.saldoLitros)}</Td>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 80, height: 8, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          width: `${Math.min(100, c.percentualRetirado || 0)}%`,
                          height: "100%",
                          background: corSaldo(c.percentualRetirado),
                        }}/>
                      </div>
                      <span style={{ fontSize: 12, color: "#64748B", minWidth: 40 }}>
                        {c.percentualRetirado != null ? `${Math.round(c.percentualRetirado)}%` : "-"}
                      </span>
                    </div>
                  </Td>
                  <Td align="right">{fmtBRL(c.valorTotal)}</Td>
                  <Td><Badge status={c.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalNovo && (
        <NovoContratoModal
          fornecedores={fornecedores}
          onClose={() => setModalNovo(false)}
          onSalvo={(id) => { setModalNovo(false); navigate(`/contratos/${id}`); }}
        />
      )}
    </div>
  );
}

// ---------------- Modal: novo contrato com upload+auto-preenchimento ----------------
function NovoContratoModal({ fornecedores, onClose, onSalvo }) {
  const [step, setStep] = useState(1); // 1 = upload, 2 = revisar/salvar
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [form, setForm] = useState({
    numero: "", dataContrato: "", produto: "ETANOL_ANIDRO",
    volumeM3: "", precoPorM3: "", valorTotal: "",
    dataPagamento: "", modalidade: "", localRetiradaNome: "",
    safra: "", indiceReferencia: "", observacoes: "",
    fornecedorId: "",
    // Fornecedor novo (se nao existir)
    fornecedorRazao: "", fornecedorFantasia: "", fornecedorCnpj: "", fornecedorCidade: "", fornecedorUf: "",
    banco: "", bancoAgencia: "", bancoConta: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function handleUpload() {
    if (!file) return;
    setParsing(true); setErro(null);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      const r = await apiUpload("/api/contratos/parse-pdf", fd);
      setParsed(r);
      const c = r.contrato || {};
      const f = r.fornecedor || {};

      // Tenta match do fornecedor por CNPJ
      let fornId = "";
      if (f.cnpj) {
        const cnpjNorm = String(f.cnpj).replace(/\D/g, "");
        const match = fornecedores.find(x => String(x.cnpj || "").replace(/\D/g, "") === cnpjNorm);
        if (match) fornId = match.id;
      }

      setForm(prev => ({
        ...prev,
        numero:            c.numero || "",
        dataContrato:      c.dataContrato || "",
        produto:           c.produto || "ETANOL_ANIDRO",
        volumeM3:          c.volumeTotalLitros ? String(Number(c.volumeTotalLitros) / 1000) : "",
        precoPorM3:        c.precoPorM3 != null ? String(c.precoPorM3) : "",
        valorTotal:        c.valorTotal != null ? String(c.valorTotal) : "",
        dataPagamento:     c.dataPagamento || "",
        modalidade:        c.modalidade || "",
        localRetiradaNome: c.localRetiradaNome || "",
        safra:             c.safra || "",
        indiceReferencia:  c.indiceReferencia || "",
        observacoes:       c.observacoes || "",
        fornecedorId:      fornId,
        fornecedorRazao:   f.razaoSocial || "",
        fornecedorFantasia: f.nomeFantasia || "",
        fornecedorCnpj:    f.cnpj || "",
        fornecedorCidade:  f.cidade || "",
        fornecedorUf:      f.uf || "",
        banco:             f.banco || "",
        bancoAgencia:      f.bancoAgencia || "",
        bancoConta:        f.bancoConta || "",
      }));
      setStep(2);
    } catch (e) {
      setErro(e.message || "Falha ao processar PDF");
    } finally {
      setParsing(false);
    }
  }

  async function handleSalvar() {
    setSalvando(true); setErro(null);
    try {
      let fornecedorId = form.fornecedorId;
      // Se nao selecionou/nao existe → cria fornecedor
      if (!fornecedorId && form.fornecedorCnpj) {
        const novoForn = await apiPost("/api/fornecedores", {
          razaoSocial:  form.fornecedorRazao,
          nomeFantasia: form.fornecedorFantasia || null,
          cnpj:         form.fornecedorCnpj,
          cidade:       form.fornecedorCidade,
          uf:           form.fornecedorUf,
          banco:        form.banco,
          bancoAgencia: form.bancoAgencia,
          bancoConta:   form.bancoConta,
        });
        fornecedorId = novoForn.id;
      }
      if (!fornecedorId) throw new Error("Informe o fornecedor (selecione ou preencha CNPJ+razão)");

      const litros = parseBR(form.volumeM3) * 1000;
      const novo = await apiPost("/api/contratos", {
        numero:            form.numero,
        dataContrato:      form.dataContrato || null,
        fornecedorId,
        produto:           form.produto,
        volumeTotalLitros: litros,
        precoPorM3:        parseBR(form.precoPorM3) || 0,
        valorTotal:        parseBR(form.valorTotal) || 0,
        dataPagamento:     form.dataPagamento || null,
        modalidade:        form.modalidade || null,
        localRetiradaNome: form.localRetiradaNome || null,
        safra:             form.safra || null,
        indiceReferencia:  form.indiceReferencia || null,
        observacoes:       form.observacoes || null,
        status:            "ativo",
      });

      // Anexa PDF ao contrato criado
      if (file) {
        const fd = new FormData();
        fd.append("pdf", file);
        await apiUpload(`/api/contratos/${novo.id}/anexos`, fd).catch(() => {});
      }
      onSalvo(novo.id);
    } catch (e) {
      setErro(e.message || "Falha ao salvar contrato");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, width: step === 1 ? 480 : 720 }}>
        <div style={modalHeader}>
          <FileText size={20} color={NAVY} />
          <strong>Novo contrato de compra</strong>
          <button onClick={onClose} style={btnGhost}>✕</button>
        </div>

        {step === 1 && (
          <div style={{ padding: 20 }}>
            <p style={{ color: "#475569", marginBottom: 16 }}>
              Envie o PDF do contrato. O sistema tenta preencher os campos
              automaticamente (parser CPA/Coopcana + fallback IA).
            </p>
            <label style={dropzoneStyle}>
              <Upload size={28} color={NAVY} />
              <span style={{ marginTop: 8, fontWeight: 500 }}>
                {file ? file.name : "Clique para escolher o PDF"}
              </span>
              <input
                type="file" accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0])}
                style={{ display: "none" }}
              />
            </label>
            {erro && <div style={{ color: "#DC2626", marginTop: 12, fontSize: 13 }}>{erro}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button onClick={onClose} style={btnSecondary}>Cancelar</button>
              <button
                onClick={handleUpload} disabled={!file || parsing}
                style={{ ...btnPrimary, opacity: (!file || parsing) ? 0.6 : 1 }}
              >
                {parsing ? <><Loader2 size={16} className="anim-spin"/> Analisando…</> : "Processar PDF"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ padding: 20, maxHeight: "70vh", overflow: "auto" }}>
            {parsed?.metodo && (
              <div style={{
                background: "#F0F9FF", border: "1px solid #BAE6FD", padding: 10,
                borderRadius: 6, marginBottom: 16, fontSize: 13, color: "#075985",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <CheckCircle2 size={16}/>
                Método: <strong>{parsed.metodo}</strong>. Revise os campos antes de salvar.
              </div>
            )}

            <SecTitle>Dados do contrato</SecTitle>
            <Grid>
              <Fld label="Número*">
                <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} style={inputStyle()} />
              </Fld>
              <Fld label="Data*">
                <input type="date" value={form.dataContrato} onChange={(e) => setForm({ ...form, dataContrato: e.target.value })} style={inputStyle()} />
              </Fld>
              <Fld label="Produto*">
                <select value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} style={inputStyle()}>
                  {PRODUTOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Fld>
              <Fld label="Volume (m³)*">
                <input
                  value={form.volumeM3}
                  onChange={(e) => {
                    const vol = e.target.value;
                    const v = Number(String(vol).replace(",", "."));
                    const p = parseBR(form.precoPorM3);
                    const val = parseBR(form.valorTotal);
                    // Se ja tem preco → recalcula valor
                    // Se ja tem valor mas nao preco → recalcula preco
                    let novoValor = form.valorTotal;
                    let novoPreco = form.precoPorM3;
                    if (v > 0 && p > 0)      novoValor = (v * p).toFixed(2);
                    else if (v > 0 && val > 0) novoPreco = (val / v).toFixed(4);
                    setForm({ ...form, volumeM3: vol, precoPorM3: novoPreco, valorTotal: novoValor });
                  }}
                  style={inputStyle()}
                />
              </Fld>
              <Fld label="Preço R$/m³">
                <input
                  value={form.precoPorM3}
                  onChange={(e) => {
                    const preco = e.target.value;
                    const vol = parseBR(form.volumeM3);
                    const p   = Number(String(preco).replace(",", "."));
                    const valorAuto = (vol && p) ? (vol * p).toFixed(2) : form.valorTotal;
                    setForm({ ...form, precoPorM3: preco, valorTotal: valorAuto });
                  }}
                  style={inputStyle()}
                  placeholder="ex: 2452.37"
                />
                {parseBR(form.precoPorM3) > 0 && (
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                    ≈ R$ {(parseBR(form.precoPorM3) / 1000).toLocaleString("pt-BR", {minimumFractionDigits: 4, maximumFractionDigits: 4})} / litro
                  </div>
                )}
              </Fld>
              <Fld label="ou Preço R$/L (quebrado)">
                <input
                  value={form.precoPorM3 ? (parseBR(form.precoPorM3) / 1000).toFixed(6) : ""}
                  onChange={(e) => {
                    const precoL = Number(String(e.target.value).replace(",", "."));
                    const precoM3 = precoL ? (precoL * 1000).toFixed(4) : "";
                    const vol = parseBR(form.volumeM3);
                    const valorAuto = (vol && precoL) ? (vol * precoL * 1000).toFixed(2) : form.valorTotal;
                    setForm({ ...form, precoPorM3: precoM3, valorTotal: valorAuto });
                  }}
                  style={inputStyle()}
                  placeholder="ex: 2.4537"
                />
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                  Ex: R$ 2,4537/L = R$ 2.452,37/m³
                </div>
              </Fld>
              {/* Card de calculo automatico do valor total */}
              <div style={{ gridColumn: "1 / -1", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8, padding: 12 }}>
                {(() => {
                  const vol = parseBR(form.volumeM3 || "");
                  const preco = parseBR(form.precoPorM3 || "");
                  const total = vol * preco;
                  return (
                    <>
                      <div style={{ fontSize: 11, color: "#075985", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>
                        Valor total do contrato (calculado)
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#075985", marginTop: 4 }}>
                        {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                      {vol > 0 && preco > 0 && (
                        <div style={{ fontSize: 12, color: "#0369A1", marginTop: 4 }}>
                          {vol.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} m³ × R$ {preco.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}/m³
                          {" · também: "}
                          {(vol * 1000).toLocaleString("pt-BR")} L × R$ {(preco/1000).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/L
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <Fld label="Valor total da nota (R$) — digita aqui pra calcular o preço/m³" colSpan={2}>
                <input
                  value={form.valorTotal}
                  onChange={(e) => {
                    const val = e.target.value;
                    const v = parseBR(form.volumeM3);
                    const t = Number(String(val).replace(",", "."));
                    // Se tem volume → recalcula preço (divisão que ele pediu)
                    const novoPreco = (v > 0 && t > 0) ? (t / v).toFixed(4) : form.precoPorM3;
                    setForm({ ...form, valorTotal: val, precoPorM3: novoPreco });
                  }}
                  style={inputStyle()}
                  placeholder="ex: 716092.04"
                />
              </Fld>
              <Fld label="Data pagamento">
                <input type="date" value={form.dataPagamento} onChange={(e) => setForm({ ...form, dataPagamento: e.target.value })} style={inputStyle()} />
              </Fld>
              <Fld label="Modalidade">
                <input value={form.modalidade} onChange={(e) => setForm({ ...form, modalidade: e.target.value })} style={inputStyle()} />
              </Fld>
              <Fld label="Safra"><input value={form.safra} onChange={(e) => setForm({ ...form, safra: e.target.value })} style={inputStyle()} /></Fld>
              <Fld label="Índice referência"><input value={form.indiceReferencia} onChange={(e) => setForm({ ...form, indiceReferencia: e.target.value })} style={inputStyle()} /></Fld>
              <Fld label="Local de retirada" colSpan={2}>
                <input value={form.localRetiradaNome} onChange={(e) => setForm({ ...form, localRetiradaNome: e.target.value })} style={inputStyle()} />
              </Fld>
              <Fld label="Observações" colSpan={2}>
                <textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} style={{ ...inputStyle(), resize: "vertical" }} />
              </Fld>
            </Grid>

            <SecTitle>Fornecedor (vendedor)</SecTitle>
            <Grid>
              <Fld label="Selecionar existente" colSpan={2}>
                <select value={form.fornecedorId} onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })} style={inputStyle()}>
                  <option value="">— criar novo com dados abaixo —</option>
                  {fornecedores.map(f => (
                    <option key={f.id} value={f.id}>{f.razaoSocial} — {f.cnpj}</option>
                  ))}
                </select>
              </Fld>
              <Fld label="Razão social"><input value={form.fornecedorRazao} onChange={(e) => setForm({ ...form, fornecedorRazao: e.target.value })} style={inputStyle()} /></Fld>
              <Fld label="Nome fantasia (aparece no PDF)"><input value={form.fornecedorFantasia} onChange={(e) => setForm({ ...form, fornecedorFantasia: e.target.value })} style={inputStyle()} placeholder="ex: COOPCANA" /></Fld>
              <Fld label="CNPJ"><input value={form.fornecedorCnpj} onChange={(e) => setForm({ ...form, fornecedorCnpj: e.target.value })} style={inputStyle()} /></Fld>
              <Fld label="Cidade"><input value={form.fornecedorCidade} onChange={(e) => setForm({ ...form, fornecedorCidade: e.target.value })} style={inputStyle()} /></Fld>
              <Fld label="UF"><input value={form.fornecedorUf} onChange={(e) => setForm({ ...form, fornecedorUf: e.target.value })} style={inputStyle()} /></Fld>
              <Fld label="Banco"><input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} style={inputStyle()} /></Fld>
              <Fld label="Agência"><input value={form.bancoAgencia} onChange={(e) => setForm({ ...form, bancoAgencia: e.target.value })} style={inputStyle()} /></Fld>
              <Fld label="Conta"><input value={form.bancoConta} onChange={(e) => setForm({ ...form, bancoConta: e.target.value })} style={inputStyle()} /></Fld>
            </Grid>

            {erro && <div style={{ color: "#DC2626", marginTop: 12, fontSize: 13 }}>{erro}</div>}

            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 20 }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>Voltar</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onClose} style={btnSecondary}>Cancelar</button>
                <button
                  onClick={handleSalvar} disabled={salvando}
                  style={{ ...btnPrimary, opacity: salvando ? 0.6 : 1 }}
                >
                  {salvando ? <><Loader2 size={16} className="anim-spin"/> Salvando…</> : "Salvar contrato"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- helpers de estilo ----------------
function Kpi({ icon, titulo, valor, sub, destacar }) {
  return (
    <div style={{
      background: destacar ? NAVY : "white",
      color:      destacar ? "white" : NAVY,
      padding: 14, borderRadius: 10, border: "1px solid #E2E8F0",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.75, fontSize: 12 }}>
        {icon} {titulo}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function Badge({ status }) {
  const m = STATUS_META[status] || { label: status, cor: "#64748B" };
  return (
    <span style={{
      background: m.cor + "20", color: m.cor,
      padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600,
    }}>{m.label}</span>
  );
}
function SecTitle({ children }) {
  return <h4 style={{ margin: "20px 0 8px", color: NAVY, fontSize: 14, fontWeight: 700 }}>{children}</h4>;
}
function Grid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{children}</div>;
}
function Fld({ label, colSpan, children }) {
  return (
    <div style={{ gridColumn: colSpan === 2 ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
function Th({ children, align = "left" }) {
  return <th style={{ padding: "10px 12px", textAlign: align, fontSize: 12, color: "#475569", fontWeight: 600 }}>{children}</th>;
}
function Td({ children, align = "left" }) {
  return <td style={{ padding: "10px 12px", textAlign: align, fontSize: 14, color: "#0F172A" }}>{children}</td>;
}
const inputStyle = (extra = {}) => ({
  width: "100%", padding: "7px 10px", border: "1px solid #CBD5E1",
  borderRadius: 6, fontSize: 14, background: "white", ...extra,
});
const btnPrimary = {
  background: NAVY, color: "white", border: "none", padding: "8px 16px",
  borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
};
const btnSecondary = {
  background: "white", color: NAVY, border: `1px solid ${NAVY}`,
  padding: "8px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer",
};
const btnGhost = {
  background: "transparent", border: "none", color: "#64748B",
  fontSize: 20, cursor: "pointer", marginLeft: "auto",
};
const loadStyle = {
  padding: 40, textAlign: "center", color: "#64748B",
  display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
};
const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
};
const modalStyle = {
  background: "white", borderRadius: 12, maxHeight: "90vh", overflow: "hidden",
  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
};
const modalHeader = {
  padding: "14px 18px", borderBottom: "1px solid #E2E8F0",
  display: "flex", alignItems: "center", gap: 8, color: NAVY, fontSize: 16,
};
const dropzoneStyle = {
  border: "2px dashed #CBD5E1", borderRadius: 10, padding: 32,
  display: "flex", flexDirection: "column", alignItems: "center",
  cursor: "pointer", background: "#F8FAFC",
};
