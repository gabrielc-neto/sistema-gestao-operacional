import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, getDocs, setDoc, deleteDoc,
  doc, query, orderBy, where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import LogoPontual from "../components/LogoPontual";

// ── Catálogo de tipos de manutenção ───────────────────────────────────────
const TIPOS = [
  // Documentação
  { id:"civ",              label:"CIV",                   grupo:"Documentação", desc:"Certificado de Inspeção Veicular — vistoria obrigatória anual",              campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"cipp",             label:"CIPP",                  grupo:"Documentação", desc:"Certificado de Inspeção para Produtos Perigosos — veículos que transportam cargas perigosas (MOPP)", campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"crlv",             label:"CRLV",                  grupo:"Documentação", desc:"Certificado de Registro e Licenciamento do Veículo",                         campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"tacografo",        label:"Tacógrafo",             grupo:"Documentação", desc:"Calibração, certificação e próximo vencimento do tacógrafo (INMETRO)",      campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"extintor",         label:"Extintor",              grupo:"Documentação", desc:"Validade e recarga do extintor de incêndio (cabine e carreta)",            campos:["data_realiz","venc","local","resp","obs"] },
  { id:"rntrc",            label:"RNTRC",                 grupo:"Documentação", desc:"Registro Nacional de Transportadores Rodoviários de Cargas (ANTT)",          campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"seguro",           label:"Seguro",                grupo:"Documentação", desc:"Seguro do veículo (apólice vigente)",                                        campos:["data_realiz","venc","numero_doc","local","resp","obs"] },
  { id:"licenca_parana",   label:"Licença Paraná",        grupo:"Documentação", desc:"Licença especial de trânsito no estado do Paraná (bitrem)",                 campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"licenca_federal",  label:"Licença Federal-DNIT",  grupo:"Documentação", desc:"Licença Federal DNIT para bitrens em rodovias federais",                   campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"aet",              label:"AET",                   grupo:"Documentação", desc:"Autorização Especial de Trânsito — cargas especiais/indivisíveis (DER/DNIT)", campos:["data_realiz","venc","numero_doc","local","resp","obs"] },
  { id:"cnh_venc",         label:"Validade CNH",          grupo:"Motorista",    desc:"Vencimento da CNH do motorista",                                           campos:["data_realiz","venc","numero_doc","resp","obs"] },
  { id:"aso",              label:"ASO",                   grupo:"Motorista",    desc:"Atestado de Saúde Ocupacional — exame médico periódico obrigatório",       campos:["data_realiz","venc","local","resp","obs"] },
  { id:"toxicologico",     label:"Exame Toxicológico",    grupo:"Motorista",    desc:"Exame toxicológico obrigatório para motoristas profissionais (Lei 13.103/2015) — validade 2,5 anos", campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"mopp",             label:"MOPP",                  grupo:"Motorista",    desc:"Movimentação Operacional de Produtos Perigosos — certificação do motorista", campos:["data_realiz","venc","local","numero_doc","resp","obs"] },
  { id:"nr20",             label:"NR-20",                 grupo:"Motorista",    desc:"Certificação NR-20 — Segurança e Saúde no Trabalho com Inflamáveis",        campos:["data_realiz","venc","local","resp","obs"] },
  { id:"nr35",             label:"NR-35",                 grupo:"Motorista",    desc:"Certificação NR-35 — Trabalho em Altura",                                   campos:["data_realiz","venc","local","resp","obs"] },
  // Mecânica
  { id:"oleo",             label:"Troca de Óleo",         grupo:"Mecânica",     desc:"Troca do óleo do motor e filtros",                                          campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"bateria",          label:"Bateria",               grupo:"Mecânica",     desc:"Troca ou verificação da bateria",                                           campos:["data_realiz","venc","local","resp","obs"] },
  { id:"engraxe",          label:"Engraxe Geral",         grupo:"Mecânica",     desc:"Engraxe geral de quinta-roda, rolamentos e articulações",                  campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"pneus",            label:"Pneus",                 grupo:"Mecânica",     desc:"Troca, recapagem ou rodízio de pneus",                                      campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"freios",           label:"Freios",                grupo:"Mecânica",     desc:"Verificação e ajuste do sistema de freios (lonas, discos, cilindros)",      campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"suspensao",        label:"Suspensão",             grupo:"Mecânica",     desc:"Revisão e manutenção da suspensão e amortecedores",                        campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"alinhamento",      label:"Alinhamento",           grupo:"Mecânica",     desc:"Alinhamento e balanceamento de rodas",                                      campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"arrefecimento",    label:"Arrefecimento",         grupo:"Mecânica",     desc:"Revisão do sistema de arrefecimento — radiador, fluido e mangueiras",      campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"embreagem",        label:"Embreagem",             grupo:"Mecânica",     desc:"Troca ou ajuste da embreagem",                                              campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"diferencial",      label:"Diferencial / Câmbio",  grupo:"Mecânica",     desc:"Revisão e troca de óleo do diferencial e caixa de câmbio",                 campos:["data_realiz","venc","km_atual","local","resp","obs"] },
  { id:"preventiva",       label:"Preventiva",            grupo:"Mecânica",     desc:"Manutenção preventiva geral programada por KM ou período",                  campos:["data_realiz","venc","km_atual","local","resp","obs"] },
];

const CAMPO_LABEL = {
  data_realiz: "Data da Realização / Inspeção",
  venc:        "Validade / Próximo Vencimento",
  local:       "Local / Oficina",
  numero_doc:  "Número do Documento",
  km_atual:    "KM na Realização",
  resp:        "Responsável",
  obs:         "Observações",
};

const EMPTY_FORM = { data_realiz:"", venc:"", local:"", numero_doc:"", km_atual:"", resp:"", obs:"" };

const GRUPO_COLOR = {
  "Documentação": { bg:"#dbeafe", color:"#1d4ed8", border:"#93c5fd" },
  "Motorista":    { bg:"#fef3c7", color:"#92400e", border:"#fcd34d" },
  "Mecânica":     { bg:"#d1fae5", color:"#065f46", border:"#6ee7b7" },
};

// ── Status ────────────────────────────────────────────────────────────────
function calcStatus(vencStr) {
  if (!vencStr) return "sem_data";
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const venc = new Date(vencStr + "T00:00:00");
  const diff = Math.ceil((venc - hoje) / 86400000);
  if (diff < 0)   return "vencido";
  if (diff <= 30) return "alerta";
  return "ok";
}

const STATUS_META = {
  vencido:  { label:"Vencido",      bg:"#fee2e2", color:"#dc2626", rowBg:"#fef2f2" },
  alerta:   { label:"Alerta",       bg:"#fef9c3", color:"#a16207", rowBg:"#fffbeb" },
  ok:       { label:"OK",           bg:"#dcfce7", color:"#15803d", rowBg:"#f0fdf4" },
  sem_data: { label:"Sem registro", bg:"#f1f5f9", color:"#94a3b8", rowBg:"#f8fafc" },
};

function fmtDate(str) {
  if (!str) return "—";
  const [y,m,d] = str.split("-");
  return `${d}/${m}/${y}`;
}

// ── Componente ─────────────────────────────────────────────────────────────
export default function Manutencao() {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const canDelete   = ["master","admin"].includes(profile?.role);

  const [registros,      setRegistros]      = useState({});
  const [todosRegistros, setTodosRegistros] = useState([]);
  const [legacy,         setLegacy]         = useState([]);
  const [veiculos,       setVeiculos]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [aba,            setAba]            = useState("veiculo");
  const [placa,          setPlaca]          = useState("");
  const [busca,          setBusca]          = useState("");
  const [filtroSt,       setFiltroSt]       = useState("todos");
  const [filtroTipo,     setFiltroTipo]     = useState("civ");
  const [filtroStTipo,   setFiltroStTipo]   = useState("todos");
  const [modal,          setModal]          = useState(null);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [salvando,       setSalvando]       = useState(false);
  const [erro,           setErro]           = useState("");

  async function carregarTudo() {
    setLoading(true);
    try {
      const [snapM, snapV] = await Promise.all([
        getDocs(collection(db, "manutencoes")),
        getDocs(query(collection(db, "veiculos"), orderBy("placa"))),
      ]);
      const normP = (p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const map = {};
      const leg = [];
      const todos = [];
      snapM.docs.forEach(d => {
        const data = { id: d.id, ...d.data() };
        if (data.tipo) {
          map[`${normP(data.placa)}__${data.tipo}`] = data;
          todos.push(data);
        } else {
          leg.push(data);
        }
      });
      setRegistros(map);
      setTodosRegistros(todos);
      setLegacy(leg);
      const vs = snapV.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(v => v.status !== "inativo")
        .sort((a,b) => (a.placa||"").localeCompare(b.placa||""));
      setVeiculos(vs);
      if (vs.length > 0 && (!placa || !vs.find(v => v.placa === placa))) setPlaca(vs[0].placa);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarTudo(); }, []);

  const alertaCount = useMemo(() => {
    const novosPend  = Object.values(registros).filter(r => ["vencido","alerta"].includes(calcStatus(r.venc))).length;
    const legadoPend = legacy.filter(r => ["vencido","alerta"].includes(calcStatus(r.venc))).length;
    return novosPend + legadoPend;
  }, [registros, legacy]);

  const normP = (p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const order = { vencido:0, alerta:1, ok:2, sem_data:3 };

  // ── Aba Por Veículo ───────────────────────────────────────────────────
  const veiculoSelecionado = useMemo(() =>
    veiculos.find(v => v.placa === placa) || null,
  [veiculos, placa]);

  const conjuntoComStatus = useMemo(() => {
    if (!veiculoSelecionado) return [];
    const isCarreta = veiculoSelecionado.tipo === "carreta";
    const is9eixos  = String(veiculoSelecionado.total_eixos) === "9";

    const tiposVeiculo = TIPOS.filter(t => {
      if (isCarreta) {
        if (t.grupo !== "Documentação") return false;
        if (["calibragem","tacografo","rntrc","seguro"].includes(t.id)) return false;
        if (t.id === "licenca_parana" || t.id === "licenca_federal") return is9eixos;
        return true;
      } else {
        if (t.grupo === "Motorista") return false;
        if (t.id === "licenca_parana" || t.id === "licenca_federal") return is9eixos;
        return true;
      }
    });

    const p = normP(placa);
    const tiposStatus = tiposVeiculo.map(t => {
      const rec = registros[`${p}__${t.id}`] || null;
      return { ...t, record: rec, status: calcStatus(rec?.venc) };
    });
    const grps = {};
    tiposStatus.forEach(t => {
      if (!grps[t.grupo]) grps[t.grupo] = [];
      grps[t.grupo].push(t);
    });
    const tipoLabel = isCarreta ? "Carreta" : "Cavalo";
    return [{ placa: p, label: `${tipoLabel} — ${p}`, tiposStatus, grupos: grps }];
  }, [veiculoSelecionado, placa, registros]);

  const summaryStatus = useMemo(() => {
    const all = conjuntoComStatus.flatMap(s => s.tiposStatus);
    return {
      ok:     all.filter(t => t.status === "ok").length,
      vencido:all.filter(t => t.status === "vencido").length,
      alerta: all.filter(t => t.status === "alerta").length,
      semReg: all.filter(t => t.status === "sem_data").length,
    };
  }, [conjuntoComStatus]);

  // ── Aba Por Tipo ──────────────────────────────────────────────────────
  const listaPorTipo = useMemo(() => {
    return todosRegistros
      .filter(r => r.tipo === filtroTipo)
      .map(r => ({ ...r, _status: calcStatus(r.venc) }))
      .filter(r => filtroStTipo === "todos" || r._status === filtroStTipo)
      .sort((a,b) => (order[a._status]||3) - (order[b._status]||3) || (a.venc||"").localeCompare(b.venc||""));
  }, [todosRegistros, filtroTipo, filtroStTipo]);

  // ── Aba Alertas ───────────────────────────────────────────────────────
  const listaAlertas = useMemo(() => {
    const tudo = [
      ...Object.values(registros).map(r => ({ ...r, _label: r.label || r.tipo })),
      ...legacy.map(r => ({ ...r, _label: r.item || "—" })),
    ];
    const order = { vencido:0, alerta:1, ok:2, sem_data:3 };
    return tudo
      .map(r => ({ ...r, _status: calcStatus(r.venc) }))
      .filter(r => {
        const q = busca.toLowerCase();
        const matchB = (r.placa||"").toLowerCase().includes(q) || (r._label||"").toLowerCase().includes(q);
        const matchS = filtroSt === "todos" || r._status === filtroSt;
        return matchB && matchS;
      })
      .sort((a,b) => (order[a._status]||3) - (order[b._status]||3) || (a.venc||"").localeCompare(b.venc||""));
  }, [registros, legacy, busca, filtroSt]);

  // ── Modal ─────────────────────────────────────────────────────────────
  function abrirModal(veiculoPlaca, tipo) {
    const pNorm = normP(veiculoPlaca);
    const rec = registros[`${pNorm}__${tipo.id}`];
    setModal({ placa: pNorm, tipo, record: rec || null });
    setForm(rec ? {
      data_realiz: rec.data_realiz || "",
      venc:        rec.venc        || "",
      local:       rec.local       || "",
      numero_doc:  rec.numero_doc  || "",
      km_atual:    rec.km_atual    || "",
      resp:        rec.resp        || "",
      obs:         rec.obs         || "",
    } : { ...EMPTY_FORM });
    setErro("");
  }

  function fecharModal() { setModal(null); setErro(""); }

  async function salvar(e) {
    e.preventDefault();
    if (!form.venc) { setErro("Informe a data de validade/vencimento."); return; }
    setSalvando(true); setErro("");
    try {
      // usa o ID original do registro se existir (evita duplicar doc no Firestore)
      const docId = modal.record?.id || `${modal.placa}__${modal.tipo.id}`;
      const payload = {
        placa:       modal.placa,
        tipo:        modal.tipo.id,
        label:       modal.tipo.label,
        grupo:       modal.tipo.grupo,
        venc:        form.venc,
        data_realiz: form.data_realiz || null,
        local:       form.local.trim()       || null,
        numero_doc:  form.numero_doc.trim()  || null,
        km_atual:    form.km_atual.trim()    || null,
        resp:        form.resp.trim()        || null,
        obs:         form.obs.trim()         || null,
        updatedAt:   new Date().toISOString(),
      };
      if (!modal.record) payload.createdAt = new Date().toISOString();
      await setDoc(doc(db, "manutencoes", docId), payload, { merge: true });
      await carregarTudo();
      fecharModal();
    } catch(e) {
      console.error(e);
      setErro("Erro ao salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(docId, label) {
    if (!window.confirm(`Excluir registro de "${label}"?`)) return;
    try {
      await deleteDoc(doc(db, "manutencoes", docId));
      await carregarTudo();
    } catch(e) {
      alert("Erro ao excluir.");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>

      {/* HEADER */}
      <header style={s.header} className="pg-header">
        <div className="pg-logo"><LogoPontual height={36} /></div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <h1 style={s.headerTitle}>Manutenção</h1>
          {alertaCount > 0 && (
            <span style={s.alertaBadge}>{alertaCount} pendente{alertaCount>1?"s":""}</span>
          )}
        </div>
        <div className="pg-header-actions">
          <button style={s.backBtn} onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>
      </header>

      {/* TABS */}
      <div style={s.tabBar}>
        <button style={{ ...s.tab, ...(aba==="veiculo" ? s.tabAtivo : {}) }} onClick={() => setAba("veiculo")}>
          Por Veículo
        </button>
        <button style={{ ...s.tab, ...(aba==="tipo" ? s.tabAtivo : {}) }} onClick={() => setAba("tipo")}>
          Por Tipo
        </button>
        <button style={{ ...s.tab, ...(aba==="alertas" ? s.tabAtivo : {}) }} onClick={() => setAba("alertas")}>
          Alertas
          {alertaCount > 0 && <span style={s.tabBadge}>{alertaCount}</span>}
        </button>
      </div>

      {/* ── ABA: POR VEÍCULO ──────────────────────────────────────────── */}
      {aba === "veiculo" && (
        <main style={s.main} className="pg-body">
          <div style={s.veiculoRow}>
            <label style={s.veiculoLabel}>Veículo</label>
            <select style={s.veiculoSelect} value={placa} onChange={e => setPlaca(e.target.value)}>
              <optgroup label="── Cavalos">
                {veiculos.filter(v => v.tipo !== "carreta").map(v => (
                  <option key={v.id} value={v.placa}>
                    {v.placa}{v.modelo ? ` — ${v.modelo}` : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label="── Carretas">
                {veiculos.filter(v => v.tipo === "carreta").map(v => (
                  <option key={v.id} value={v.placa}>{v.placa}</option>
                ))}
              </optgroup>
            </select>
            {placa && (
                <div style={s.resumoPills}>
                  {summaryStatus.vencido > 0 && <span style={{ ...s.rPill, background:"#fee2e2", color:"#dc2626" }}>{summaryStatus.vencido} vencido{summaryStatus.vencido>1?"s":""}</span>}
                  {summaryStatus.alerta  > 0 && <span style={{ ...s.rPill, background:"#fef9c3", color:"#a16207" }}>{summaryStatus.alerta} alerta{summaryStatus.alerta>1?"s":""}</span>}
                  {summaryStatus.ok      > 0 && <span style={{ ...s.rPill, background:"#dcfce7", color:"#15803d" }}>{summaryStatus.ok} ok</span>}
                  {summaryStatus.semReg  > 0 && <span style={{ ...s.rPill, background:"#f1f5f9", color:"#94a3b8" }}>{summaryStatus.semReg} sem reg.</span>}
                </div>
            )}
          </div>

          {loading ? (
            <p style={s.info}>Carregando...</p>
          ) : (
            conjuntoComStatus.map(secao => (
              <div key={secao.placa} style={{ marginBottom: 28 }}>
                <div style={{ fontWeight:700, fontSize:".95rem", color:"#1a3a5c", padding:"10px 0 8px", borderBottom:"2px solid #1a3a5c33", marginBottom:12 }}>
                  {secao.label}
                </div>
                {Object.entries(secao.grupos).map(([grupo, tipos]) => {
              const gc = GRUPO_COLOR[grupo] || { bg:"#f1f5f9", color:"#475569", border:"#cbd5e1" };
              return (
                <div key={grupo} style={s.grupoSection}>
                  <div style={{ ...s.grupoHeader, background: gc.bg, color: gc.color, borderColor: gc.border }}>
                    {grupo}
                  </div>
                  <div style={s.tipoGrid}>
                    {tipos.map(t => {
                      const sm = STATUS_META[t.status];
                      const temDado = !!t.record;
                      return (
                        <div
                          key={t.id}
                          style={{ ...s.tipoCard, borderColor: temDado ? sm.color+"55" : "var(--border)", background: temDado ? sm.rowBg : "var(--card-bg)" }}
                          onClick={() => abrirModal(secao.placa, t)}
                        >
                          <div style={s.tipoCardTop}>
                            <span style={s.tipoNome}>{t.label}</span>
                            <span style={{ ...s.sPill, background: sm.bg, color: sm.color }}>{sm.label}</span>
                          </div>
                          <div style={s.tipoDesc}>{t.desc}</div>
                          {temDado && (
                            <div style={s.tipoMeta}>
                              {t.record.venc        && <span>Vence: <strong>{fmtDate(t.record.venc)}</strong></span>}
                              {t.record.data_realiz && <span>Realizado: {fmtDate(t.record.data_realiz)}</span>}
                              {t.record.local       && <span>Local: {t.record.local}</span>}
                              {t.record.numero_doc  && <span>Doc: {t.record.numero_doc}</span>}
                            </div>
                          )}
                          {!temDado && (
                            <div style={s.tipoVazio}>Clique para preencher</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
              </div>
            ))
          )}
        </main>
      )}

      {/* ── ABA: POR TIPO ─────────────────────────────────────────────── */}
      {aba === "tipo" && (
        <>
          <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:10 }}>
            {["Documentação","Motorista","Mecânica"].map(grupo => {
              const gc = GRUPO_COLOR[grupo];
              const tiposGrupo = TIPOS.filter(t => t.grupo === grupo);
              return (
                <div key={grupo} style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:".7rem", fontWeight:700, color: gc.color, background: gc.bg, border:`1px solid ${gc.border}`, borderRadius:6, padding:"2px 8px", whiteSpace:"nowrap" }}>
                    {grupo}
                  </span>
                  {tiposGrupo.map(t => {
                    const count = todosRegistros.filter(r => r.tipo === t.id).length;
                    const ativo = filtroTipo === t.id;
                    return (
                      <button
                        key={t.id}
                        style={{ ...s.filtroBtn, ...(ativo ? s.filtroBtnAtivo : {}), fontSize:".78rem" }}
                        onClick={() => { setFiltroTipo(t.id); setFiltroStTipo("todos"); }}
                      >
                        {t.label}{count > 0 ? ` (${count})` : ""}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {/* Filtro de status */}
            <div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:4, borderTop:"1px dashed var(--border)", flexWrap:"wrap" }}>
              <span style={{ fontSize:".7rem", fontWeight:700, color:"#64748b", whiteSpace:"nowrap" }}>Status:</span>
              {[
                { val:"todos",    label:"Todos" },
                { val:"vencido",  label:"Vencido" },
                { val:"alerta",   label:"Alerta" },
                { val:"ok",       label:"OK" },
                { val:"sem_data", label:"Sem registro" },
              ].map(({ val, label }) => {
                const ativo = filtroStTipo === val;
                const sm = STATUS_META[val];
                return (
                  <button
                    key={val}
                    style={{
                      ...s.filtroBtn,
                      ...(ativo ? { background: sm?.bg || "#1a3a5c", color: sm?.color || "#fff", borderColor: "transparent" } : {}),
                      fontSize:".78rem",
                    }}
                    onClick={() => setFiltroStTipo(val)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <main style={s.main} className="pg-body">
            {loading ? (
              <p style={s.info}>Carregando...</p>
            ) : listaPorTipo.length === 0 ? (
              <p style={s.info}>Nenhum registro encontrado para este tipo.</p>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr style={s.theadRow}>
                      {["Placa / Motorista","Realização","Validade","Local","Responsável","Status",""].map(col => (
                        <th key={col} style={s.th}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listaPorTipo.map(r => {
                      const sm   = STATUS_META[r._status] || STATUS_META.ok;
                      const tipo = TIPOS.find(t => t.id === r.tipo) || { id: r.tipo, label: r.tipo, desc:"", campos:["data_realiz","venc","local","resp","obs"] };
                      const ident = r.placa || r.motorista || "—";
                      return (
                        <tr key={r.id} style={{ ...s.tr, background: sm.rowBg }}>
                          <td style={{ ...s.td, fontWeight:700, color:"#1a3a5c" }}>
                            {r.placa && <div>{r.placa}</div>}
                            {r.motorista && <div style={{ fontSize:".78rem", color:"#64748b", fontWeight:400 }}>{r.motorista}</div>}
                            {!r.placa && !r.motorista && "—"}
                          </td>
                          <td style={s.td}>{fmtDate(r.data_realiz)}</td>
                          <td style={{ ...s.td, fontWeight:600 }}>{fmtDate(r.venc)}</td>
                          <td style={s.td}>{r.local || "—"}</td>
                          <td style={s.td}>{r.resp || "—"}</td>
                          <td style={s.td}>
                            <span style={{ ...s.statusBadge, background:sm.bg, color:sm.color }}>{sm.label}</span>
                          </td>
                          <td style={s.td}>
                            <button style={s.editBtn} onClick={() => abrirModal(ident, tipo)}>Editar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </>
      )}

      {/* ── ABA: ALERTAS ──────────────────────────────────────────────── */}
      {aba === "alertas" && (
        <>
          <div style={s.toolbar} className="pg-toolbar">
            <input
              style={s.inputBusca}
              placeholder="Buscar por placa ou tipo..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            <div style={s.filtros}>
              {["todos","vencido","alerta","ok"].map(f => (
                <button key={f}
                  style={{ ...s.filtroBtn, ...(filtroSt===f ? s.filtroBtnAtivo : {}) }}
                  onClick={() => setFiltroSt(f)}
                >
                  {f === "todos" ? "Todos" : STATUS_META[f]?.label || f}
                </button>
              ))}
            </div>
          </div>
          <main style={s.main} className="pg-body">
            {loading ? (
              <p style={s.info}>Carregando...</p>
            ) : listaAlertas.length === 0 ? (
              <p style={s.info}>Nenhum registro encontrado.</p>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr style={s.theadRow}>
                      {["Placa","Tipo","Realização","Validade","Local","Responsável","Status",""].map(col => (
                        <th key={col} style={s.th}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listaAlertas.map(r => {
                      const sm   = STATUS_META[r._status] || STATUS_META.ok;
                      const tipo = TIPOS.find(t => t.id === r.tipo) || { id: r.tipo||"outro", label: r._label, desc:"", campos:["data_realiz","venc","local","resp","obs"] };
                      return (
                        <tr key={r.id} style={{ ...s.tr, background: sm.rowBg }}>
                          <td style={{ ...s.td, fontWeight:700, color:"#1a3a5c" }}>{r.placa}</td>
                          <td style={s.td}>
                            <div style={{ fontWeight:600 }}>{r._label}</div>
                            {r.grupo && <div style={{ fontSize:".72rem", color:"#94a3b8", marginTop:2 }}>{r.grupo}</div>}
                          </td>
                          <td style={s.td}>{fmtDate(r.data_realiz || r.ult)}</td>
                          <td style={{ ...s.td, fontWeight:600 }}>{fmtDate(r.venc)}</td>
                          <td style={s.td}>{r.local || "—"}</td>
                          <td style={s.td}>{r.resp || "—"}</td>
                          <td style={s.td}>
                            <span style={{ ...s.statusBadge, background:sm.bg, color:sm.color }}>{sm.label}</span>
                          </td>
                          <td style={s.td}>
                            <button style={s.editBtn} onClick={() => abrirModal(r.placa, tipo)}>Editar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </>
      )}

      {/* ── MODAL ─────────────────────────────────────────────────────── */}
      {modal && (
        <div style={s.overlay} onClick={fecharModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTitulo}>{modal.placa} — {modal.tipo.label}</div>
                <div style={s.modalSubtitulo}>{modal.tipo.desc}</div>
              </div>
              <button style={s.closeBtn} onClick={fecharModal}>✕</button>
            </div>

            <form onSubmit={salvar} style={s.form}>
              {(modal.tipo.campos || ["data_realiz","venc","local","resp","obs"]).map(campo => (
                campo === "obs" ? (
                  <label key={campo} style={s.fieldLabel}>
                    {CAMPO_LABEL[campo]}
                    <textarea
                      style={{ ...s.fieldInput, resize:"vertical", minHeight:64 }}
                      value={form[campo]}
                      onChange={e => setForm({ ...form, [campo]: e.target.value })}
                      placeholder="Detalhes adicionais..."
                    />
                  </label>
                ) : (
                  <label key={campo} style={s.fieldLabel}>
                    {CAMPO_LABEL[campo]}{campo === "venc" ? " *" : ""}
                    <input
                      type={["venc","data_realiz"].includes(campo) ? "date" : "text"}
                      style={s.fieldInput}
                      value={form[campo]}
                      onChange={e => setForm({ ...form, [campo]: e.target.value })}
                      required={campo === "venc"}
                    />
                  </label>
                )
              ))}

              {erro && <p style={s.erroMsg}>{erro}</p>}

              <div style={s.formFooter}>
                {modal.record && canDelete && (
                  <button
                    type="button"
                    style={{ ...s.cancelBtn, color:"#dc2626", borderColor:"#fca5a5" }}
                    onClick={() => { excluir(modal.record.id, modal.tipo.label); fecharModal(); }}
                  >
                    Excluir
                  </button>
                )}
                <div style={{ flex:1 }} />
                <button type="button" style={s.cancelBtn} onClick={fecharModal}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={salvando}>
                  {salvando ? "Salvando..." : modal.record ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────
const s = {
  wrap:        { minHeight:"100vh", background:"var(--bg)", fontFamily:"system-ui, sans-serif" },

  // header
  header:      { background:"#1a3a5c", borderBottom:"4px solid transparent", borderImage:"linear-gradient(90deg,#3d6b47,#6aaa5e,#b5d947,#f5c318,#f0a500) 1", padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 8px rgba(0,0,0,.15)" },
  headerTitle: { color:"#fff", fontSize:"1.15rem", fontWeight:700, margin:0 },
  alertaBadge: { background:"#dc2626", color:"#fff", borderRadius:20, fontSize:".72rem", fontWeight:700, padding:"2px 10px" },
  backBtn:     { padding:"6px 16px", background:"#f5c318", border:"none", borderRadius:6, fontSize:".82rem", cursor:"pointer", color:"#1a3a5c", fontWeight:700, whiteSpace:"nowrap" },

  // tabs
  tabBar:      { display:"flex", gap:0, background:"var(--card-bg)", borderBottom:"1px solid var(--border)", padding:"0 24px" },
  tab:         { padding:"12px 20px", border:"none", borderBottom:"3px solid transparent", background:"none", cursor:"pointer", fontSize:".88rem", fontWeight:600, color:"var(--text-muted)", display:"flex", alignItems:"center", gap:8 },
  tabAtivo:    { color:"#1a3a5c", borderBottomColor:"#1a3a5c" },
  tabBadge:    { background:"#dc2626", color:"#fff", borderRadius:20, fontSize:".68rem", fontWeight:700, padding:"1px 7px", minWidth:18, textAlign:"center" },

  // seletor veículo
  main:        { padding:"24px", maxWidth:1300, margin:"0 auto" },
  veiculoRow:  { display:"flex", alignItems:"center", gap:14, marginBottom:28, flexWrap:"wrap" },
  veiculoLabel:{ fontWeight:700, fontSize:".85rem", color:"var(--text)", whiteSpace:"nowrap" },
  veiculoSelect:{ padding:"8px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:".9rem", fontWeight:600, background:"var(--card-bg)", color:"var(--text)", cursor:"pointer", minWidth:180 },
  resumoPills: { display:"flex", gap:6, flexWrap:"wrap" },
  rPill:       { padding:"3px 10px", borderRadius:20, fontSize:".72rem", fontWeight:700 },

  // grupo / tipo grid
  grupoSection:{ marginBottom:28 },
  grupoHeader: { display:"inline-block", padding:"4px 16px", borderRadius:20, fontSize:".78rem", fontWeight:700, marginBottom:12, border:"1px solid" },
  tipoGrid:    { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:12 },
  tipoCard:    { background:"var(--card-bg)", border:"1px solid", borderRadius:12, padding:"14px 16px", cursor:"pointer", display:"flex", flexDirection:"column", gap:6, transition:"box-shadow .2s, transform .1s" },
  tipoCardTop: { display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 },
  tipoNome:    { fontWeight:700, fontSize:".92rem", color:"var(--text)" },
  sPill:       { padding:"2px 9px", borderRadius:20, fontSize:".68rem", fontWeight:700, whiteSpace:"nowrap" },
  tipoDesc:    { fontSize:".75rem", color:"var(--text-muted)", lineHeight:1.4 },
  tipoMeta:    { display:"flex", flexDirection:"column", gap:3, marginTop:4, fontSize:".75rem", color:"var(--text-muted)" },
  tipoVazio:   { fontSize:".72rem", color:"#94a3b8", fontStyle:"italic", marginTop:2 },

  // toolbar alertas
  toolbar:     { display:"flex", alignItems:"center", gap:12, padding:"14px 24px", background:"var(--card-bg)", borderBottom:"1px solid var(--border)", flexWrap:"wrap" },
  inputBusca:  { flex:1, minWidth:160, padding:"8px 12px", border:"1px solid #cbd5e1", borderRadius:6, fontSize:".9rem", outline:"none", background:"var(--bg)", color:"var(--text)" },
  filtros:     { display:"flex", gap:6 },
  filtroBtn:   { padding:"6px 14px", border:"1px solid #cbd5e1", borderRadius:20, background:"var(--bg)", cursor:"pointer", fontSize:".8rem", color:"var(--text-muted)" },
  filtroBtnAtivo:{ background:"#1a3a5c", color:"#fff", borderColor:"#1a3a5c" },

  // tabela
  info:        { color:"var(--text-muted)", textAlign:"center", marginTop:40 },
  tableWrap:   { overflowX:"auto", background:"var(--card-bg)", borderRadius:10, border:"1px solid var(--border)", boxShadow:"0 1px 3px rgba(0,0,0,.06)" },
  table:       { width:"100%", borderCollapse:"collapse", minWidth:780 },
  theadRow:    { background:"#1a3a5c" },
  th:          { padding:"11px 14px", textAlign:"left", color:"#fff", fontSize:".82rem", fontWeight:600, whiteSpace:"nowrap" },
  tr:          { borderBottom:"1px solid var(--border)" },
  td:          { padding:"10px 14px", fontSize:".85rem", color:"var(--text)", verticalAlign:"middle" },
  statusBadge: { padding:"2px 10px", borderRadius:20, fontSize:".72rem", fontWeight:700 },
  acoes:       { display:"flex", gap:6 },
  editBtn:     { padding:"4px 12px", background:"#dbeafe", color:"#1d4ed8", border:"none", borderRadius:5, cursor:"pointer", fontWeight:600, fontSize:".78rem" },

  // modal
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:16 },
  modal:       { background:"var(--card-bg)", borderRadius:14, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.25)" },
  modalHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"20px 24px 0", gap:12 },
  modalTitulo: { fontSize:"1.05rem", fontWeight:700, color:"#1a3a5c", marginBottom:3 },
  modalSubtitulo:{ fontSize:".78rem", color:"var(--text-muted)", lineHeight:1.4 },
  closeBtn:    { background:"none", border:"none", fontSize:"1.1rem", cursor:"pointer", color:"var(--text-muted)", padding:"0 4px" },
  form:        { padding:24, display:"flex", flexDirection:"column", gap:14 },
  fieldLabel:  { display:"flex", flexDirection:"column", gap:5, fontSize:".85rem", fontWeight:600, color:"#374151" },
  fieldInput:  { padding:"8px 10px", border:"1px solid #cbd5e1", borderRadius:6, fontSize:".9rem", outline:"none", fontFamily:"inherit", background:"var(--bg)", color:"var(--text)" },
  erroMsg:     { color:"#dc2626", fontSize:".82rem", background:"#fee2e2", padding:"6px 10px", borderRadius:6 },
  formFooter:  { display:"flex", gap:10, alignItems:"center", paddingTop:4 },
  cancelBtn:   { padding:"8px 20px", background:"#f1f5f9", border:"1px solid #cbd5e1", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:".85rem", color:"#475569" },
  saveBtn:     { padding:"8px 24px", background:"#f5c318", border:"none", borderRadius:6, cursor:"pointer", fontWeight:700, fontSize:".85rem", color:"#1a3a5c" },
};
