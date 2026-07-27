import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, deleteDoc,
  doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { list as dsList, insert as dsInsert, remove as dsRemove } from "../services/genericDataSource";
import { listVeiculos } from "../services/frotaDataSource";
import { useAuth } from "../contexts/AuthContext";
import { Lock, Calendar, Clock } from "lucide-react";
import LogoPontual from "../components/LogoPontual";
import ModuleHeader from "../components/ModuleHeader";
import ExportBar from "../components/ExportBar";

/* ─── constantes ────────────────────────────────────────────────────────── */
const BASES    = ["PONTUAL", "REPLAN", "OUTROS"];
const TIPOS    = ["LS", "Bitrem", "Rodotrem", "4° Eixo"];
const PRODUTOS = [
  "Gasolina Comum", "Gasolina Aditivada",
  "Diesel S10", "Diesel S500",
  "Etanol", "Arla 32",
];

const entregaVazia = () => ({ dest: "", prod: PRODUTOS[0], vol: "", req: "" });

function horaAgora() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}
function dataHoje() {
  return new Date().toISOString().slice(0, 10);
}
function fmtData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function fmtNum(n) {
  return `OC-${String(n).padStart(4, "0")}`;
}
function totalLitros(entregas) {
  return entregas.reduce((s, e) => s + (parseFloat(e.vol) || 0), 0);
}

/* ─── componente principal ──────────────────────────────────────────────── */
export default function OC() {
  const { profile } = useAuth();

  /* dados externos */
  const [veiculos,    setVeiculos]    = useState([]);
  const [motoristas,  setMotoristas]  = useState([]);
  const [ordens,      setOrdens]      = useState([]);
  const [loadingDados, setLoadingDados] = useState(true);

  /* formulário */
  const [num,       setNum]       = useState("OC-0001");
  const [data,      setData]      = useState(dataHoje());
  const [hora,      setHora]      = useState(horaAgora());
  const [base,      setBase]      = useState("PONTUAL");
  const [cavalo,    setCavalo]    = useState("");
  const [motorista, setMotorista] = useState("");
  const [resp,      setResp]      = useState("");
  const [c1,        setC1]        = useState("");
  const [t1,        setT1]        = useState(TIPOS[0]);
  const [c2,        setC2]        = useState("");
  const [t2,        setT2]        = useState(TIPOS[0]);
  const [obs,       setObs]       = useState("");
  const [entregas,  setEntregas]  = useState([entregaVazia()]);

  /* ui */
  const [salvando,    setSalvando]    = useState(false);
  const [busca,       setBusca]       = useState("");
  const [filtroTempo, setFiltroTempo] = useState("todas");
  const [modalOC,     setModalOC]     = useState(null);
  const [erro,        setErro]        = useState("");

  /* ── carrega dados ── */
  useEffect(() => {
    async function carregarDados() {
      try {
        const [veicRows, motRows, ocRows] = await Promise.all([
          listVeiculos(),
          dsList("motoristas", { orderBy: "nome" }),
          dsList("ordens_carregamento", { orderBy: "data", order: "desc" }),
        ]);

        const vs = veicRows.filter(v => v.tipo !== "carreta" && v.status !== "inativo");
        const ms = motRows.filter(m => m.status === "ativo");
        const os = ocRows;

        setVeiculos(vs);
        setMotoristas(ms);
        setOrdens(os);

        /* próximo número — baseado no maior existente, não na contagem */
        const maxNum = os.reduce((max, o) => {
          const n = parseInt((o.num || "").replace(/\D/g, ""), 10);
          return isNaN(n) ? max : Math.max(max, n);
        }, 0);
        setNum(fmtNum(maxNum + 1));

        if (vs.length > 0) setCavalo(vs[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDados(false);
      }
    }
    carregarDados();
  }, []);

  /* ── preenche responsável com o usuário logado (sync com profile do contexto) ── */
  useEffect(() => {
    if (profile?.nome) setResp(profile.nome);
  }, [profile]);

  /* ── auto-fill conjunto ao mudar cavalo (autofill quando user troca no form) ── */
  useEffect(() => {
    if (!cavalo || veiculos.length === 0) return;
    const v = veiculos.find(vv => vv.id === cavalo);
    if (!v) return;
    setC1(v.c1 || "");
    setT1(v.t1 || TIPOS[0]);
    setC2(v.c2 || "");
    setT2(v.t2 || TIPOS[0]);
    if (v.motorista && motoristas.length > 0) {
      const mot = motoristas.find(m => m.nome === v.motorista);
      if (mot) setMotorista(mot.id);
    }
  }, [cavalo, veiculos, motoristas]);

  /* ── entregas helpers ── */
  function atualizarEntrega(idx, campo, valor) {
    setEntregas(prev => prev.map((e, i) => i === idx ? { ...e, [campo]: valor } : e));
  }
  function adicionarEntrega() {
    setEntregas(prev => [...prev, entregaVazia()]);
  }
  function removerEntrega(idx) {
    if (entregas.length === 1) return;
    setEntregas(prev => prev.filter((_, i) => i !== idx));
  }

  /* ── bloqueio ── */
  const veiculoSelecionado = veiculos.find(v => v.id === cavalo);
  const veiculoBloqueado   = veiculoSelecionado?.bloqueio?.ativo === true;

  /* ── salvar ── */
  async function salvar() {
    if (veiculoBloqueado) {
      setErro("Veículo bloqueado — libere-o antes de gerar a OC.");
      return;
    }
    if (!cavalo || !motorista || !c1) {
      setErro("Preencha cavalo, motorista e carreta 1.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      const veiculo    = veiculos.find(v => v.id === cavalo);
      const mot        = motoristas.find(m => m.id === motorista);
      const payload = {
        num, data, hora, base,
        cavaloCod:    cavalo,
        cavaloPlaca:  veiculo?.placa || "",
        motoristaCod: motorista,
        motoristaNome: mot?.nome || "",
        resp, c1, t1, c2, t2, obs,
        entregas,
        totalLitros: totalLitros(entregas),
        criadoEm: new Date().toISOString(),
      };
      const docRef = await dsInsert("ordens_carregamento", payload);
      const novaOC = { id: docRef.id, ...payload };
      setOrdens(prev => [novaOC, ...prev]);

      /* reset form — incrementa a partir do número que acabou de ser salvo */
      const numAtual = parseInt(num.replace(/\D/g, ""), 10) || 0;
      setNum(fmtNum(numAtual + 1));
      setData(dataHoje()); setHora(horaAgora());
      setBase("PONTUAL"); setResp(profile?.nome || ""); setObs("");
      setEntregas([entregaVazia()]);

      return novaOC;
    } catch (e) {
      setErro("Erro ao salvar: " + e.message);
      return null;
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEImprimir() {
    const oc = await salvar();
    if (oc) setModalOC(oc);
  }

  /* ── excluir ── */
  async function excluir(id) {
    if (!window.confirm("Excluir esta OC?")) return;
    try {
      await dsRemove("ordens_carregamento", id);
      setOrdens(prev => prev.filter(o => o.id !== id));
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  }

  /* ── filtros lista ── */
  const hoje   = dataHoje();
  const semana = (() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  })();

  const listaFiltrada = ordens.filter(o => {
    const txt = busca.toLowerCase();
    const matchBusca = !txt ||
      o.num?.toLowerCase().includes(txt) ||
      o.cavaloPlaca?.toLowerCase().includes(txt) ||
      o.motoristaNome?.toLowerCase().includes(txt);
    const matchTempo =
      filtroTempo === "todas" ? true :
      filtroTempo === "hoje"  ? o.data === hoje :
      filtroTempo === "semana"? o.data >= semana : true;
    return matchBusca && matchTempo;
  });

  /* ── render ── */
  const isAdmin = profile?.role === "admin" || profile?.role === "master";

  return (
    <div style={s.wrap}>
      {/* HEADER */}
      <ModuleHeader title="Ordens de Carregamento" />

      {/* CORPO: duas colunas */}
      <div style={s.corpo} className="oc-corpo">

        {/* LISTA — aparece primeiro no mobile (order via CSS) */}
        <div style={s.colLista}>
          <div style={s.painelHeader}>
            <span style={s.painelTitulo}>OCs Registradas</span>
            <span style={s.painelSub}>{listaFiltrada.length} resultado(s)</span>
          </div>

          {/* toolbar lista */}
          <div style={s.toolbarLista}>
            <input
              style={s.inputBusca}
              placeholder="Buscar por número ou cavalo..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            <div style={s.filtroTabs}>
              {[["todas","Todas"],["hoje","Hoje"],["semana","Semana"]].map(([v,l]) => (
                <button
                  key={v}
                  style={{ ...s.tab, ...(filtroTempo === v ? s.tabAtivo : {}) }}
                  onClick={() => setFiltroTempo(v)}
                >{l}</button>
              ))}
            </div>
          </div>

          <div style={{ padding: "0 12px" }}>
            <ExportBar
              titulo="Ordens de Carregamento"
              arquivo="ordens_carregamento"
              subtitulo={() => `${listaFiltrada.length} OC(s)${filtroTempo !== "todas" ? ` · ${filtroTempo}` : ""}${busca ? ` · busca: "${busca}"` : ""}`}
              dados={() => ({
                colunas: ["Nº", "Data", "Base", "Cavalo", "Motorista", "Entregas"],
                linhas: listaFiltrada.map((o) => [
                  o.num || "",
                  o.data ? String(o.data).slice(0, 10).split("-").reverse().join("/") : "",
                  o.base || "",
                  o.cavaloPlaca || "",
                  o.motoristaNome || "",
                  o.entregas?.length || 0,
                ]),
              })}
            />
          </div>

          {/* cards */}
          <div style={s.listaScroll}>
            {loadingDados && <p style={s.hint}>Carregando...</p>}
            {!loadingDados && listaFiltrada.length === 0 && (
              <p style={s.hint}>Nenhuma OC encontrada.</p>
            )}
            {listaFiltrada.map(o => (
              <CardOC
                key={o.id}
                oc={o}
                isAdmin={isAdmin}
                onExcluir={() => excluir(o.id)}
                onImprimir={() => setModalOC(o)}
              />
            ))}
          </div>
        </div>

        {/* FORMULÁRIO */}
        <div style={s.colForm}>
          <div style={s.painelHeader}>
            <span style={s.painelTitulo}>Nova OC</span>
            <span style={s.numOC}>{num}</span>
          </div>

          <form style={s.form} onSubmit={e => e.preventDefault()}>

            {/* linha 1: N° OC (largura total) + Data/Hora (par de 2 colunas) */}
            <div style={s.grupo}>
              <label style={s.label}>N° OC</label>
              <input style={{ ...s.input, background:"var(--surface-3)", color:"var(--text-muted)" }} value={num} readOnly />
            </div>
            <div style={s.row2}>
              <div style={s.grupo}>
                <label style={s.label}>Data</label>
                <div style={s.inputIconWrap}>
                  <Calendar size={15} style={s.inputIcon} />
                  <input style={{ ...s.input, paddingLeft:32 }} type="date" value={data} onChange={e => setData(e.target.value)} />
                </div>
              </div>
              <div style={s.grupo}>
                <label style={s.label}>Hora</label>
                <div style={s.inputIconWrap}>
                  <Clock size={15} style={s.inputIcon} />
                  <input style={{ ...s.input, paddingLeft:32 }} type="time" value={hora} onChange={e => setHora(e.target.value)} />
                </div>
              </div>
            </div>

            {/* base */}
            <div style={s.grupo}>
              <label style={s.label}>Base</label>
              <select style={s.select} value={base} onChange={e => setBase(e.target.value)}>
                {BASES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* cavalo */}
            <div style={s.grupo}>
              <label style={s.label}>Cavalo (Trator)</label>
              <select style={{ ...s.select, borderColor: veiculoBloqueado ? "var(--danger)" : undefined }} value={cavalo} onChange={e => setCavalo(e.target.value)}>
                {veiculos.length === 0 && <option value="">— sem veículos ativos —</option>}
                {veiculos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.placa}{v.bloqueio?.ativo ? " • BLOQUEADO" : ""}{v.motoristaNome ? ` — ${v.motoristaNome.split(" ")[0]}` : ""}
                  </option>
                ))}
              </select>
              {veiculoBloqueado && (
                <div style={{ marginTop:6, padding:"10px 14px", borderRadius:8, background:"var(--danger-bg)", border:"1px solid #fca5a5" }}>
                  <div style={{ fontWeight:700, color:"var(--danger)", fontSize:".85rem", marginBottom:4, display:"inline-flex", alignItems:"center", gap:6 }}>
                    <Lock size={14}/> Veículo bloqueado — OC não pode ser gerada
                  </div>
                  <div style={{ fontSize:".78rem", color:"#7f1d1d" }}>
                    <strong>Motivo:</strong> {veiculoSelecionado.bloqueio.motivo}
                    {veiculoSelecionado.bloqueio.descricao && ` — ${veiculoSelecionado.bloqueio.descricao}`}
                  </div>
                  <div style={{ fontSize:".78rem", color:"#7f1d1d", marginTop:2 }}>
                    <strong>Bloqueado por:</strong> {veiculoSelecionado.bloqueio.bloqueadoPor}
                  </div>
                  <div style={{ fontSize:".75rem", color:"var(--danger)", marginTop:4, fontWeight:600 }}>
                    Somente Administradores ou Manutenção podem liberar este veículo.
                  </div>
                </div>
              )}
            </div>

            {/* motorista */}
            <div style={s.grupo}>
              <label style={s.label}>Motorista</label>
              <select style={s.select} value={motorista} onChange={e => setMotorista(e.target.value)}>
                {motoristas.length === 0 && <option value="">— sem motoristas ativos —</option>}
                {motoristas.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            {/* responsável */}
            <div style={s.grupo}>
              <label style={s.label}>Responsável / Despachante</label>
              <input style={{ ...s.input, background:"var(--surface-3)", color:"var(--text-muted)", cursor:"default" }} value={resp} readOnly />
            </div>

            {/* carretas */}
            <div style={s.row2} className="grid-form-2">
              <div style={s.grupo}>
                <label style={s.label}>Placa Carreta 1</label>
                <input
                  style={s.input}
                  value={c1}
                  onChange={e => setC1(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  maxLength={8}
                />
              </div>
              <div style={s.grupo}>
                <label style={s.label}>Tipo Carreta 1</label>
                <select style={s.select} value={t1} onChange={e => setT1(e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={s.row2} className="grid-form-2">
              <div style={s.grupo}>
                <label style={s.label}>Placa Carreta 2 (opcional)</label>
                <input
                  style={s.input}
                  value={c2}
                  onChange={e => setC2(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  maxLength={8}
                />
              </div>
              <div style={s.grupo}>
                <label style={s.label}>Tipo Carreta 2</label>
                <select style={s.select} value={t2} onChange={e => setT2(e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* observações */}
            <div style={s.grupo}>
              <label style={s.label}>Observações</label>
              <textarea
                style={{ ...s.input, height:64, resize:"vertical" }}
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Observações gerais..."
              />
            </div>

            {/* ENTREGAS */}
            <div style={s.secaoEntregas}>
              <div style={s.secaoHeader}>
                <span style={s.secaoTitulo}>Entregas</span>
                <button type="button" style={s.btnAddEntrega} onClick={adicionarEntrega}>
                  + Adicionar Entrega
                </button>
              </div>

              {entregas.map((e, idx) => (
                <div key={idx} style={s.entregaCard}>
                  <div style={s.entregaTop}>
                    <span style={s.entregaIdx}>#{idx + 1}</span>
                    {entregas.length > 1 && (
                      <button
                        type="button"
                        style={s.btnRemove}
                        onClick={() => removerEntrega(idx)}
                      >×</button>
                    )}
                  </div>

                  <div style={s.grupo}>
                    <label style={s.label}>Destino / Cliente</label>
                    <input
                      style={s.input}
                      value={e.dest}
                      onChange={ev => atualizarEntrega(idx, "dest", ev.target.value)}
                      placeholder="Nome do posto ou cliente"
                    />
                  </div>

                  <div style={s.row2} className="grid-form-2">
                    <div style={s.grupo}>
                      <label style={s.label}>Produto</label>
                      <select
                        style={s.select}
                        value={e.prod}
                        onChange={ev => atualizarEntrega(idx, "prod", ev.target.value)}
                      >
                        {PRODUTOS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div style={s.grupo}>
                      <label style={s.label}>Volume (L)</label>
                      <input
                        style={s.input}
                        type="number"
                        min="0"
                        step="100"
                        value={e.vol}
                        onChange={ev => atualizarEntrega(idx, "vol", ev.target.value)}
                        placeholder="Ex: 15000"
                      />
                    </div>
                  </div>

                  <div style={s.grupo}>
                    <label style={s.label}>N° Requisição (opcional)</label>
                    <input
                      style={s.input}
                      value={e.req}
                      onChange={ev => atualizarEntrega(idx, "req", ev.target.value)}
                      placeholder="REQ-00000"
                    />
                  </div>
                </div>
              ))}

              <div style={s.totalLitros}>
                Total: <strong>{totalLitros(entregas).toLocaleString("pt-BR")} L</strong>
              </div>
            </div>

            {/* erro */}
            {erro && <p style={s.erroMsg}>{erro}</p>}

            {/* botões ação */}
            <div style={s.acoes}>
              <button
                type="button"
                style={{ ...s.btnAcao, background:"var(--accent)", color:"#fff", opacity: veiculoBloqueado ? 0.4 : 1 }}
                onClick={salvar}
                disabled={salvando || veiculoBloqueado}
                title={veiculoBloqueado ? "Veículo bloqueado — libere antes de gerar OC" : ""}
              >
                {salvando ? "Salvando..." : "Salvar OC"}
              </button>
              <button
                type="button"
                style={{ ...s.btnAcao, background:"var(--accent)", color:"#fff", opacity: veiculoBloqueado ? 0.4 : 1 }}
                onClick={salvarEImprimir}
                disabled={salvando || veiculoBloqueado}
                title={veiculoBloqueado ? "Veículo bloqueado — libere antes de gerar OC" : ""}
              >
                Salvar e Imprimir
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL IMPRESSÃO */}
      {modalOC && (
        <ModalImpressao oc={modalOC} onFechar={() => setModalOC(null)} />
      )}
    </div>
  );
}

/* ─── Card OC ────────────────────────────────────────────────────────────── */
function CardOC({ oc, isAdmin, onExcluir, onImprimir }) {
  const baseCor  = oc.base === "REPLAN" ? "var(--success)" : "var(--accent)";
  const totalL   = totalLitros(oc.entregas || []);
  const nClientes = (oc.entregas || []).filter(e => e.dest).length;

  return (
    <div style={cs.card}>
      <div style={cs.cardTop}>
        <span style={cs.numOC}>{oc.num}</span>
        <span style={{ ...cs.badge, background: baseCor }}>{oc.base}</span>
      </div>

      <div style={cs.linha}>
        <span style={cs.label}>Data:</span>
        <span>{fmtData(oc.data)} {oc.hora}</span>
      </div>
      <div style={cs.linha}>
        <span style={cs.label}>Cavalo:</span>
        <span>{oc.cavaloPlaca || "—"}</span>
      </div>
      <div style={cs.linha}>
        <span style={cs.label}>Motorista:</span>
        <span>{oc.motoristaNome || "—"}</span>
      </div>
      {oc.c1 && (
        <div style={cs.linha}>
          <span style={cs.label}>Carreta(s):</span>
          <span>{oc.c1}{oc.c2 ? ` / ${oc.c2}` : ""}</span>
        </div>
      )}
      <div style={cs.resumo}>
        {nClientes} cliente(s) · {totalL.toLocaleString("pt-BR")} L
      </div>

      <div style={cs.acoes}>
        <button style={cs.btnImprimir} onClick={onImprimir}>Reimprimir</button>
        {isAdmin && (
          <button style={cs.btnExcluir} onClick={onExcluir}>Excluir</button>
        )}
      </div>
    </div>
  );
}

/* ─── Modal Impressão ────────────────────────────────────────────────────── */
function ModalImpressao({ oc, onFechar }) {
  const totalL = totalLitros(oc.entregas || []);

  return (
    <div style={ms.overlay} className="modal-mobile-sheet-overlay">
      <div style={ms.modal} className="modal-mobile-sheet">
        {/* conteúdo imprimível */}
        <div id="print-area" style={ms.printArea}>
          <div style={ms.printHeader}>
            <LogoPontual height={44} />
            <div style={ms.printEmpresa}>PONTUAL LOGÍSTICA</div>
          </div>

          <h2 style={ms.printTitulo}>ORDEM DE CARREGAMENTO</h2>

          <table style={ms.infoTable}>
            <tbody>
              <tr>
                <td style={ms.infoLabel}>N° OC:</td>
                <td style={ms.infoVal}><strong>{oc.num}</strong></td>
                <td style={ms.infoLabel}>Data:</td>
                <td style={ms.infoVal}>{fmtData(oc.data)}</td>
                <td style={ms.infoLabel}>Hora:</td>
                <td style={ms.infoVal}>{oc.hora}</td>
              </tr>
              <tr>
                <td style={ms.infoLabel}>Base:</td>
                <td style={ms.infoVal}>{oc.base}</td>
                <td style={ms.infoLabel}>Resp.:</td>
                <td style={ms.infoVal} colSpan={3}>{oc.resp || "—"}</td>
              </tr>
              <tr>
                <td style={ms.infoLabel}>Cavalo:</td>
                <td style={ms.infoVal}>{oc.cavaloPlaca}</td>
                <td style={ms.infoLabel}>Motorista:</td>
                <td style={ms.infoVal} colSpan={3}>{oc.motoristaNome}</td>
              </tr>
              <tr>
                <td style={ms.infoLabel}>Carreta 1:</td>
                <td style={ms.infoVal}>{oc.c1} ({oc.t1})</td>
                <td style={ms.infoLabel}>Carreta 2:</td>
                <td style={ms.infoVal} colSpan={3}>{oc.c2 ? `${oc.c2} (${oc.t2})` : "—"}</td>
              </tr>
              {oc.obs && (
                <tr>
                  <td style={ms.infoLabel}>Obs.:</td>
                  <td style={ms.infoVal} colSpan={5}>{oc.obs}</td>
                </tr>
              )}
            </tbody>
          </table>

          <h3 style={ms.secTitle}>Entregas</h3>
          <table style={ms.tabEntregas}>
            <thead>
              <tr style={ms.thRow}>
                <th style={ms.th}>#</th>
                <th style={ms.th}>Destino / Cliente</th>
                <th style={ms.th}>Produto</th>
                <th style={ms.th}>Volume (L)</th>
                <th style={ms.th}>Requisição</th>
              </tr>
            </thead>
            <tbody>
              {(oc.entregas || []).map((e, i) => (
                <tr key={i} style={i % 2 === 0 ? ms.trPar : ms.trImpar}>
                  <td style={ms.td}>{i + 1}</td>
                  <td style={ms.td}>{e.dest || "—"}</td>
                  <td style={ms.td}>{e.prod}</td>
                  <td style={{ ...ms.td, textAlign:"right" }}>
                    {(parseFloat(e.vol) || 0).toLocaleString("pt-BR")}
                  </td>
                  <td style={ms.td}>{e.req || "—"}</td>
                </tr>
              ))}
              <tr style={ms.totalRow}>
                <td style={ms.td} colSpan={3}><strong>Total</strong></td>
                <td style={{ ...ms.td, textAlign:"right" }}>
                  <strong>{totalL.toLocaleString("pt-BR")}</strong>
                </td>
                <td style={ms.td}></td>
              </tr>
            </tbody>
          </table>

          <div style={ms.assinaturas}>
            <div style={ms.assinBox}>
              <div style={ms.assinLinha}></div>
              <div style={ms.assinLabel}>Motorista</div>
            </div>
            <div style={ms.assinBox}>
              <div style={ms.assinLinha}></div>
              <div style={ms.assinLabel}>Responsável / Despachante</div>
            </div>
          </div>
        </div>

        {/* botões fora da área de impressão */}
        <div style={ms.modalAcoes} className="no-print">
          <button
            style={{ ...ms.btnModal, background:"var(--success)", color:"#fff" }}
            onClick={async () => {
              const el = document.getElementById("print-area");
              if (!el) return;
              const { default: html2pdf } = await import("html2pdf.js");
              await html2pdf().set({
                filename: `OC-${oc.num || "doc"}.pdf`,
                margin: 10,
                image: { type: "jpeg", quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
              }).from(el).save();
            }}
          >
            Baixar PDF
          </button>
          <button
            style={{ ...ms.btnModal, background:"var(--accent)", color:"#fff" }}
            onClick={() => window.print()}
          >
            Imprimir
          </button>
          <button
            style={{ ...ms.btnModal, background:"var(--border)", color:"var(--text-muted)" }}
            onClick={onFechar}
          >
            Fechar
          </button>
        </div>
      </div>

      {/* CSS de impressão injetado */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area {
            position: fixed; left: 0; top: 0;
            width: 210mm; padding: 16mm;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── estilos principal ──────────────────────────────────────────────────── */
const s = {
  wrap:  { minHeight:"100vh", background:"var(--bg)", fontFamily:"system-ui,sans-serif" },

  header: {
    background:"var(--header-bg)", borderBottom: "1px solid var(--header-border)",
    padding:"10px 20px", display:"flex", alignItems:"center",
    gap:12, boxShadow:"0 2px 8px rgba(0,0,0,.18)",
    position:"sticky", top:0, zIndex:100,
  },
  logo:    { height:34, objectFit:"contain" },
  titulo:  { color:"#fff", fontWeight:700, fontSize:"1.05rem", flex:1 },
  btnBack: {
    marginLeft:"auto", background:"var(--header-btn-bg)", border:"none",
    color:"var(--accent)", borderRadius:6, padding:"5px 14px",
    cursor:"pointer", fontSize:".82rem", fontWeight:700,
    whiteSpace:"nowrap",
    display:"inline-flex", alignItems:"center", gap:6,
  },

  /* layout duas colunas */
  corpo: {
    display:"flex",
    flexDirection:"row",
    flexWrap:"wrap",
    gap:0,
    alignItems:"flex-start",
  },

  colLista: {
    flex:"3 1 0",
    minWidth:280,
    order: 1,
    background:"var(--bg)",
    borderLeft:"1px solid var(--border)",
    display:"flex",
    flexDirection:"column",
    minHeight:"calc(100vh - 60px)",
  },
  colForm: {
    flex:"2 1 0",
    minWidth:280,
    order: 2,
    background:"var(--card-bg)",
    borderRight:"1px solid var(--border)",
  },

  painelHeader: {
    padding:"14px 18px", background:"var(--card-bg)", borderBottom:"1px solid var(--border)",
    display:"flex", alignItems:"center", gap:10,
  },
  painelTitulo: { fontWeight:700, color:"var(--accent)", fontSize:".95rem", flex:1 },
  painelSub:    { fontSize:".75rem", color:"var(--text-subtle)" },
  numOC:        { fontSize:".85rem", fontWeight:800, color:"#fff", background:"var(--accent)", padding:"2px 10px", borderRadius:5 },

  toolbarLista: {
    padding:"10px 14px", background:"var(--bg)", borderBottom:"1px solid var(--border)",
    display:"flex", flexDirection:"column", gap:8,
  },
  inputBusca: {
    width:"100%", padding:"7px 12px", borderRadius:7,
    border:"1px solid var(--border)", fontSize:".85rem", outline:"none",
    boxSizing:"border-box",
  },
  filtroTabs: { display:"flex", gap:6 },
  tab: {
    padding:"4px 12px", borderRadius:20, border:"1px solid var(--border)",
    background:"var(--bg)", fontSize:".75rem", cursor:"pointer",
    fontWeight:600, color:"var(--text-muted)",
  },
  tabAtivo: { background:"var(--accent)", color:"#fff", borderColor:"var(--accent)" },

  listaScroll: {
    flex:1, overflowY:"auto",
    padding:"12px 14px", display:"flex", flexDirection:"column", gap:10,
    maxHeight:"calc(100vh - 200px)",
  },
  hint: { textAlign:"center", color:"var(--text-subtle)", padding:24, fontSize:".85rem" },

  /* form */
  form: { padding:"16px 18px", display:"flex", flexDirection:"column", gap:12 },

  row2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  row3: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 },

  grupo: { display:"flex", flexDirection:"column", gap:4 },
  label: { fontSize:".75rem", fontWeight:600, color:"var(--text-muted)" },
  input: {
    padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)",
    fontSize:".85rem", outline:"none", width:"100%", boxSizing:"border-box",
  },
  select: {
    padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)",
    fontSize:".85rem", outline:"none", background:"var(--card-bg)",
    width:"100%", boxSizing:"border-box",
  },
  inputIconWrap: { position:"relative", display:"flex", alignItems:"center", width:"100%" },
  inputIcon: { position:"absolute", left:10, color:"var(--text-muted)", pointerEvents:"none" },

  /* entregas */
  secaoEntregas: {
    background:"var(--bg)", borderRadius:10, border:"1px solid var(--border)",
    padding:"12px 14px", display:"flex", flexDirection:"column", gap:10,
  },
  secaoHeader: { display:"flex", alignItems:"center", gap:8 },
  secaoTitulo: { fontWeight:700, color:"var(--accent)", flex:1, fontSize:".9rem" },
  btnAddEntrega: {
    background:"var(--accent)", border:"none", color:"#fff",
    borderRadius:6, padding:"4px 12px", fontSize:".78rem",
    fontWeight:700, cursor:"pointer",
  },
  entregaCard: {
    background:"var(--card-bg)", borderRadius:8, border:"1px solid var(--border)",
    padding:"10px 12px", display:"flex", flexDirection:"column", gap:8,
  },
  entregaTop: { display:"flex", alignItems:"center", justifyContent:"space-between" },
  entregaIdx: { fontSize:".75rem", fontWeight:700, color:"var(--text-muted)" },
  btnRemove: {
    background:"var(--danger-bg)", border:"none", color:"var(--danger)",
    borderRadius:5, width:22, height:22, cursor:"pointer",
    fontWeight:700, fontSize:".85rem", display:"flex",
    alignItems:"center", justifyContent:"center",
  },

  totalLitros: {
    textAlign:"right", fontSize:".85rem", color:"var(--text-muted)",
    borderTop:"1px solid var(--border)", paddingTop:8,
  },

  erroMsg: { color:"var(--danger)", fontSize:".8rem", background:"var(--danger-bg)", padding:"6px 10px", borderRadius:6 },

  acoes: { display:"flex", gap:10, paddingTop:4 },
  btnAcao: {
    flex:1, padding:"10px", borderRadius:8, border:"none",
    fontSize:".9rem", fontWeight:700, cursor:"pointer",
  },
};

/* ─── estilos card OC ────────────────────────────────────────────────────── */
const cs = {
  card: {
    background:"var(--card-bg)", borderRadius:10, border:"1px solid var(--border)",
    padding:"12px 14px", display:"flex", flexDirection:"column", gap:6,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)",
  },
  cardTop: { display:"flex", alignItems:"center", justifyContent:"space-between" },
  numOC:   { fontWeight:800, color:"var(--accent)", fontSize:".95rem" },
  badge: {
    fontSize:".65rem", fontWeight:700, color:"#fff",
    padding:"2px 8px", borderRadius:4,
  },
  linha: { display:"flex", gap:6, fontSize:".78rem", color:"var(--text-muted)" },
  label: { fontWeight:600, color:"var(--text-subtle)", minWidth:66 },
  resumo: {
    marginTop:2, fontSize:".75rem", color:"var(--text-muted)",
    background:"var(--surface-3)", borderRadius:5, padding:"3px 8px", alignSelf:"flex-start",
  },
  acoes: { display:"flex", gap:8, marginTop:4 },
  btnImprimir: {
    flex:1, padding:"5px", border:"1px solid var(--accent)", borderRadius:6,
    background:"transparent", color:"var(--accent)", fontSize:".75rem",
    fontWeight:600, cursor:"pointer",
  },
  btnExcluir: {
    flex:1, padding:"5px", border:"1px solid #dc2626", borderRadius:6,
    background:"transparent", color:"var(--danger)", fontSize:".75rem",
    fontWeight:600, cursor:"pointer",
  },
};

/* ─── estilos modal ──────────────────────────────────────────────────────── */
const ms = {
  overlay: {
    position:"fixed", inset:0, background:"rgba(0,0,0,.55)",
    display:"flex", alignItems:"flex-start", justifyContent:"center",
    zIndex:500, overflowY:"auto", padding:"20px 10px",
  },
  modal: {
    background:"var(--card-bg)", borderRadius:10, width:"100%", maxWidth:780,
    boxShadow:"0 8px 40px rgba(0,0,0,.3)",
  },
  printArea: {
    padding:"24px 28px", fontFamily:"Arial, sans-serif", fontSize:13,
    color:"#111",
  },
  printHeader: { display:"flex", alignItems:"center", gap:14, marginBottom:4 },
  printLogo:   { height:44, objectFit:"contain" },
  printEmpresa:{ fontWeight:800, fontSize:15, color:"var(--accent)" },
  printTitulo: {
    textAlign:"center", fontSize:15, fontWeight:800,
    color:"var(--accent)", margin:"10px 0 12px", letterSpacing:1,
    borderBottom:"2px solid var(--accent)", paddingBottom:8,
  },
  infoTable: { width:"100%", borderCollapse:"collapse", marginBottom:14, fontSize:12 },
  infoLabel: { fontWeight:700, color:"var(--text-muted)", padding:"3px 8px 3px 0", whiteSpace:"nowrap", width:80 },
  infoVal:   { padding:"3px 16px 3px 0", color:"#111" },
  secTitle:  { fontSize:13, fontWeight:700, color:"var(--accent)", margin:"10px 0 6px", borderBottom:"1px solid var(--border)", paddingBottom:4 },
  tabEntregas:{ width:"100%", borderCollapse:"collapse", fontSize:12 },
  thRow: { background:"var(--accent)" },
  th: { color:"#fff", padding:"5px 8px", textAlign:"left", fontWeight:700 },
  td: { padding:"4px 8px", borderBottom:"1px solid #f1f5f9", verticalAlign:"top" },
  trPar:   { background:"var(--card-bg)" },
  trImpar: { background:"var(--bg)" },
  totalRow:{ background:"var(--bg)" },

  assinaturas: { display:"flex", gap:40, marginTop:28, paddingTop:8 },
  assinBox:   { flex:1, display:"flex", flexDirection:"column", gap:4, alignItems:"center" },
  assinLinha: { width:"100%", borderBottom:"1px solid #333", height:28 },
  assinLabel: { fontSize:11, color:"var(--text-muted)" },

  modalAcoes: {
    display:"flex", gap:10, padding:"14px 20px",
    borderTop:"1px solid var(--border)", justifyContent:"flex-end",
  },
  btnModal: {
    padding:"8px 20px", borderRadius:7, border:"none",
    fontWeight:700, cursor:"pointer", fontSize:".88rem",
  },
};
