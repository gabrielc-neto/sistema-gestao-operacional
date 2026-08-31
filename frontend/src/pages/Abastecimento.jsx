import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { list as dsList, get as dsGet } from "../services/genericDataSource";
import { listVeiculos } from "../services/frotaDataSource";
import { useAuth } from "../contexts/AuthContext";
import MenuNavegacao from "../components/MenuNavegacao";
import LogoPontual from "../components/LogoPontual";
import { ArrowLeft, Fuel, Truck, MapPin, Download, TrendingUp, AlertTriangle, DollarSign, BarChart3, Building2 } from "lucide-react";
import { COLORS, SPACING, TYPO, RADIUS } from "../theme/tokens";
import { KpiCard, Btn, DataTable, Tag, FilterBar, Field, Section, inputStyle } from "../theme/ui";

// ── util ─────────────────────────────────────────────────────────────
function fmtBRL(v) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtNum(v, casas = 0) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
function fmtDateTimeBR(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : String(iso);
}
function fmtDateYYYYMMDD(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : "";
}
function baixarCsv(rows, filename) {
  const header = ["Data/Hora", "Placa", "Motorista", "Posto", "Litros", "R$/L", "Total R$", "Odômetro", "Distância km", "km/L", "NFe"];
  const linhas = [header.join(";")].concat(rows.map(r => [
    fmtDateTimeBR(r.dataInicio),
    r.veiculo?.placa || "",
    r.motorista?.nome || "",
    r.posto?.nome || "",
    r.volumeL ?? "",
    r.custoUnitario ?? "",
    r.custoTotal ?? "",
    r.odometro ?? "",
    r.distancia ?? "",
    r.mediaKmL ?? "",
    r.chaveNfe || "",
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")));
  const csv = "﻿" + linhas.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────
export default function Abastecimento() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [abasts, setAbasts] = useState([]);
  const [veiculosFrota, setVeiculosFrota] = useState([]);
  const [sascarPos, setSascarPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);

  const [aba, setAba] = useState("painel");
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const [posto, setPosto] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [origem, setOrigem] = useState("");

  // Leitura única ao entrar na tela (sem onSnapshot) — poupa reads do Firestore
  useEffect(() => {
    let cancelado = false;
    Promise.all([
      dsList("abastecimentos_cta").catch(e => { console.warn("abastecimentos_cta:", e); return []; }),
      listVeiculos().catch(e => { console.warn("veiculos:", e); return []; }),
      dsList("sascar_posicoes", { limit: 5000 }).catch(e => { console.warn("sascar_posicoes:", e); return []; }),
    ]).then(([abRows, vRows, sRows]) => {
      if (cancelado) return;
      const ab = [...abRows];
      ab.sort((a, b) => (b.dataInicio || "").localeCompare(a.dataInicio || ""));
      setAbasts(ab);
      setVeiculosFrota(vRows);
      setSascarPos(sRows);
      setLoading(false);
    });
    return () => { cancelado = true; };
  }, []);

  useEffect(() => {
    dsGet("config", "cta_meta").then(d => { if (d) setMeta(d); }).catch(() => {});
  }, [abasts]);

  const placas     = useMemo(() => [...new Set(abasts.map(a => a.veiculo?.placa).filter(Boolean))].sort(), [abasts]);
  const motoristas = useMemo(() => [...new Set(abasts.map(a => a.motorista?.nome).filter(Boolean))].sort(), [abasts]);
  const postos     = useMemo(() => [...new Set(abasts.map(a => a.posto?.nome).filter(Boolean))].sort(), [abasts]);

  const filtrado = useMemo(() => abasts.filter(a => {
    if (placa && a.veiculo?.placa !== placa) return false;
    if (motorista && a.motorista?.nome !== motorista) return false;
    if (posto && a.posto?.nome !== posto) return false;
    if (origem === "patio"   && a.posto?.comercial) return false;
    if (origem === "externo" && !a.posto?.comercial) return false;
    const dt = fmtDateYYYYMMDD(a.dataInicio);
    if (de  && dt < de)  return false;
    if (ate && dt > ate) return false;
    return true;
  }), [abasts, placa, motorista, posto, origem, de, ate]);

  // KPIs — R$/L médio calculado só com registros dentro da faixa 3–10 (evita zerados e outliers)
  const kpi = useMemo(() => {
    const total = filtrado.length;
    const litros = filtrado.reduce((s, a) => s + (a.volumeL || 0), 0);
    const custo  = filtrado.reduce((s, a) => s + (a.custoTotal || 0), 0);
    const validos = filtrado.filter(a => {
      const l = a.volumeL || 0, c = a.custoTotal || 0;
      if (l <= 0 || c <= 0) return false;
      const r = c / l; return r >= 3 && r <= 10;
    });
    const litrosVal = validos.reduce((s, a) => s + (a.volumeL || 0), 0);
    const custoVal  = validos.reduce((s, a) => s + (a.custoTotal || 0), 0);
    const externos = filtrado.filter(a => a.posto?.comercial);
    const semNfe = externos.filter(a => !a.chaveNfe).length;
    const extSemValor = externos.filter(a => (a.custoTotal || 0) === 0 && (a.volumeL || 0) > 0).length;
    return {
      total, litros, custo, semNfe, extSemValor,
      externos: externos.length,
      custoPorLitro:      litrosVal ? custoVal / litrosVal : 0,
      registrosValidos:   validos.length,
      registrosIgnorados: filtrado.length - validos.length,
    };
  }, [filtrado]);

  // Índice SASCAR por placa normalizada — última posição
  const sascarPorPlaca = useMemo(() => {
    const m = new Map();
    const norm = (p) => String(p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    for (const s of sascarPos) {
      const pl = norm(s.placa || s.ultimaPosicao?.placa);
      if (!pl) continue;
      const odo = s.ultimaPosicao?.odometro ?? s.odometro;
      if (odo != null) m.set(pl, { odometro: Number(odo), data: s.ultimaPosicao?.dataPosicao || s.ultimaPosicao?.dataPacote });
    }
    return m;
  }, [sascarPos]);

  // CPK por veículo — usa odômetro do CTA (primeiro vs último) em vez de somar "distancia"
  const cpkPorVeiculo = useMemo(() => {
    const norm = (p) => String(p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const porPlaca = new Map();

    for (const a of filtrado) {
      const p = a.veiculo?.placa;
      if (!p) continue;
      const cur = porPlaca.get(p) || {
        placa: p,
        placaNorm: norm(p),
        modelo: a.veiculo?.modelo || "—",
        litros: 0, custo: 0, abasts: 0,
        odoMin: null, odoMax: null,
        odoMinData: null, odoMaxData: null,
      };
      cur.litros += a.volumeL || 0;
      cur.custo  += a.custoTotal || 0;
      cur.abasts += 1;
      const odo = Number(a.odometro);
      if (Number.isFinite(odo) && odo > 0) {
        if (cur.odoMin == null || odo < cur.odoMin) { cur.odoMin = odo; cur.odoMinData = a.dataInicio; }
        if (cur.odoMax == null || odo > cur.odoMax) { cur.odoMax = odo; cur.odoMaxData = a.dataInicio; }
      }
      porPlaca.set(p, cur);
    }

    return [...porPlaca.values()].map(v => {
      // km rodado no período do filtro = último odômetro − primeiro odômetro
      const kmRodado = (v.odoMin != null && v.odoMax != null) ? Math.max(0, v.odoMax - v.odoMin) : 0;
      const kmL = kmRodado > 0 && v.litros > 0 ? kmRodado / v.litros : 0;
      const cpk = kmRodado > 0 ? v.custo / kmRodado : 0;

      // Cruzamento SASCAR
      const sascar = sascarPorPlaca.get(v.placaNorm);
      const odoSascar = sascar?.odometro || null;
      const divergenciaSascar = odoSascar != null && v.odoMax != null ? odoSascar - v.odoMax : null;

      return { ...v, kmRodado, kmL, cpk, odoSascar, divergenciaSascar };
    }).sort((a, b) => b.custo - a.custo);
  }, [filtrado, sascarPorPlaca]);

  // Pátio × Externo — só R$/L válidos (3-10)
  const patioVsExterno = useMemo(() => {
    const rlValido = (a) => {
      const l = a.volumeL || 0;
      const c = a.custoTotal || 0;
      if (l <= 0 || c <= 0) return null;
      const r = c / l;
      if (r < 3 || r > 10) return null;
      return r;
    };
    const patio  = { count: 0, litros: 0, custo: 0, validos: 0, ignorados: 0 };
    const ext    = { count: 0, litros: 0, custo: 0, validos: 0, ignorados: 0 };
    for (const a of filtrado) {
      const dst = a.posto?.comercial ? ext : patio;
      dst.count += 1;
      const r = rlValido(a);
      if (r == null) { dst.ignorados += 1; continue; }
      dst.litros += a.volumeL || 0;
      dst.custo  += a.custoTotal || 0;
      dst.validos += 1;
    }
    const rlPatio = patio.litros ? patio.custo / patio.litros : 0;
    const rlExt   = ext.litros   ? ext.custo   / ext.litros   : 0;
    const economiaLitro = rlExt - rlPatio;
    const economiaSePatio = ext.litros * economiaLitro;
    return { patio, ext, rlPatio, rlExt, economiaLitro, economiaSePatio };
  }, [filtrado]);

  // Série mensal
  const seriesMensal = useMemo(() => {
    const porMes = new Map();
    for (const a of filtrado) {
      if (!a.dataInicio) continue;
      const chave = a.dataInicio.slice(0, 7);
      const cur = porMes.get(chave) || { mes: chave, litros: 0, custo: 0, count: 0 };
      cur.litros += a.volumeL || 0;
      cur.custo  += a.custoTotal || 0;
      cur.count  += 1;
      porMes.set(chave, cur);
    }
    return [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  }, [filtrado]);

  const projecaoMesAtual = useMemo(() => {
    const hoje = new Date();
    const chave = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const cur = seriesMensal.find(x => x.mes === chave);
    if (!cur) return null;
    const diaAtual = hoje.getDate();
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const fator = ultimoDia / diaAtual;
    return { atual: cur, projecaoCusto: cur.custo * fator, projecaoLitros: cur.litros * fator, diaAtual, ultimoDia };
  }, [seriesMensal]);

  const topPostosExternos = useMemo(() => {
    const map = new Map();
    for (const a of filtrado) {
      if (!a.posto?.comercial) continue;
      const nome = a.posto.nome || "—";
      const cur = map.get(nome) || { nome, uf: a.posto.uf || "", count: 0, litros: 0, custo: 0 };
      cur.count  += 1;
      cur.litros += a.volumeL || 0;
      cur.custo  += a.custoTotal || 0;
      map.set(nome, cur);
    }
    return [...map.values()].map(v => ({ ...v, rlMedio: v.litros ? v.custo / v.litros : 0 })).sort((a, b) => b.custo - a.custo).slice(0, 5);
  }, [filtrado]);

  // Viagens: método tanque-a-tanque
  // Cada abast N vs abast N-1 do mesmo veículo forma uma viagem.
  // Km = odo(N) − odo(N-1)  Litros = volumeL(N)  Custo = custoTotal(N)
  const viagens = useMemo(() => {
    // Agrupa por placa e ordena por data
    const porPlaca = new Map();
    for (const a of filtrado) {
      const p = a.veiculo?.placa;
      if (!p) continue;
      if (!porPlaca.has(p)) porPlaca.set(p, []);
      porPlaca.get(p).push(a);
    }
    const out = [];
    for (const [placa, lista] of porPlaca) {
      lista.sort((a, b) => (a.dataInicio || "").localeCompare(b.dataInicio || ""));
      for (let i = 1; i < lista.length; i++) {
        const anterior = lista[i - 1];
        const atual = lista[i];
        const odoIni = Number(anterior.odometro) || 0;
        const odoFim = Number(atual.odometro) || 0;
        const km = odoFim - odoIni;
        const litros = atual.volumeL || 0;
        const custo = atual.custoTotal || 0;
        // Filtra viagens inválidas: km negativo, km > 3000 (talvez pulou abast fora do CTA),
        // km < 5 (mesmo dia, redundante), litros/custo zerados.
        if (km <= 5 || km > 3000 || litros <= 0 || custo <= 0) continue;
        const kmL = km / litros;
        const cpk = custo / km;
        // Filtra outliers de consumo (fora 1-6 km/L é erro nos dados)
        if (kmL < 0.8 || kmL > 8) continue;
        out.push({
          id: `${placa}-${atual.ctaId}`,
          placa,
          modelo: atual.veiculo?.modelo || "",
          dataIni: anterior.dataInicio,
          dataFim: atual.dataInicio,
          motorista: atual.motorista?.nome || anterior.motorista?.nome || "—",
          postoIni: anterior.posto?.nome || "",
          postoFim: atual.posto?.nome || "",
          externoIni: anterior.posto?.comercial,
          externoFim: atual.posto?.comercial,
          odoIni, odoFim, km, litros, custo, kmL, cpk,
        });
      }
    }
    out.sort((a, b) => (b.dataFim || "").localeCompare(a.dataFim || ""));
    return out;
  }, [filtrado]);

  // Métricas agregadas das viagens
  const viagensStats = useMemo(() => {
    if (viagens.length === 0) return null;
    const totalKm = viagens.reduce((s, v) => s + v.km, 0);
    const totalL  = viagens.reduce((s, v) => s + v.litros, 0);
    const totalR  = viagens.reduce((s, v) => s + v.custo, 0);
    const kmL     = totalL ? totalKm / totalL : 0;
    const cpk     = totalKm ? totalR / totalKm : 0;
    const melhor  = [...viagens].sort((a, b) => b.kmL - a.kmL)[0];
    const pior    = [...viagens].sort((a, b) => a.kmL - b.kmL)[0];
    // Média simples de km/L
    const mediaKmL = viagens.reduce((s, v) => s + v.kmL, 0) / viagens.length;
    return { total: viagens.length, totalKm, totalL, totalR, kmL, cpk, melhor, pior, mediaKmL };
  }, [viagens]);

  // Ranking por motorista (média km/L)
  const rankingMotoristas = useMemo(() => {
    const m = new Map();
    for (const v of viagens) {
      const mot = v.motorista;
      if (!mot || mot === "—") continue;
      const cur = m.get(mot) || { motorista: mot, viagens: 0, km: 0, litros: 0, custo: 0 };
      cur.viagens += 1;
      cur.km += v.km;
      cur.litros += v.litros;
      cur.custo += v.custo;
      m.set(mot, cur);
    }
    return [...m.values()].filter(x => x.viagens >= 3).map(x => ({
      ...x,
      kmL: x.litros ? x.km / x.litros : 0,
      cpk: x.km ? x.custo / x.km : 0,
    })).sort((a, b) => b.kmL - a.kmL);
  }, [viagens]);

  // Alertas
  const alertas = useMemo(() => {
    const out = [];
    const porPlaca = {};
    for (const a of [...filtrado].sort((a, b) => (a.dataInicio || "").localeCompare(b.dataInicio || ""))) {
      const p = a.veiculo?.placa;
      if (!p || a.odometro == null) continue;
      if (porPlaca[p] != null && a.odometro < porPlaca[p]) {
        out.push({ tipo: "odometro", tone: "warning", ab: a, msg: `Odômetro caiu de ${porPlaca[p]} pra ${a.odometro}` });
      }
      porPlaca[p] = a.odometro;
    }
    for (const a of filtrado) {
      if (a.veiculo?.volumeMax > 0 && a.volumeL > a.veiculo.volumeMax * 1.05) {
        out.push({ tipo: "volume", tone: "danger", ab: a, msg: `Volume ${a.volumeL}L > tanque (${a.veiculo.volumeMax}L)` });
      }
    }
    for (const a of filtrado) {
      if (a.posto?.comercial && (a.custoTotal || 0) === 0 && (a.volumeL || 0) > 0) {
        out.push({ tipo: "externo_sem_valor", tone: "danger", ab: a, msg: `Externo com ${a.volumeL}L mas sem valor lançado` });
      }
    }
    for (const a of filtrado) {
      if (!a.chaveNfe && a.posto?.comercial && (a.custoTotal || 0) > 0) {
        out.push({ tipo: "nfe", tone: "warning", ab: a, msg: `Externo (${a.posto?.nome || "?"}) sem NFe` });
      }
    }
    return out;
  }, [filtrado]);

  const limparFiltros = () => { setPlaca(""); setMotorista(""); setPosto(""); setDe(""); setAte(""); setOrigem(""); };

  // Tabs — TMS style
  const tabs = [
    { id: "painel",    label: "Painel Executivo", icon: BarChart3 },
    { id: "timeline",  label: "Timeline",         icon: Fuel },
    { id: "veiculos",  label: "Por Veículo",      icon: Truck },
    { id: "viagens",   label: "Viagens",          icon: MapPin },
    { id: "alertas",   label: "Alertas",          icon: AlertTriangle, badge: alertas.length },
  ];

  const ultimaSync = meta?.ultimaSincronizacaoEm?.toDate?.().toLocaleString("pt-BR");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "system-ui, sans-serif", color: "var(--text)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "var(--header-bg)", borderBottom: "1px solid var(--header-border)", boxShadow: "0 4px 14px rgba(15,23,42,.18)", position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap", gap: 10 }} className="pg-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }} className="pg-header-center">
          <LogoPontual height={34} variant="white" />
          <div>
            <h1 style={{ margin: 0, color: "#fff", fontSize: "1.15rem", fontWeight: 800 }}>Abastecimento</h1>
            <p style={{ margin: 0, fontSize: ".72rem", color: "rgba(255,255,255,.62)" }}>
              {ultimaSync ? `Última sincronização: ${ultimaSync}` : "Aguardando sincronização"}
            </p>
          </div>
        </div>
        <div className="pg-header-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button style={{ padding: "8px 14px", borderRadius: 8, background: "#ffffff", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 700, fontSize: ".82rem", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 1px 3px rgba(0,0,0,.1)" }} onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={14} /> Dashboard
          </button>
          <MenuNavegacao />
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}`, padding: `0 ${SPACING.xl}px`, display: "flex", gap: SPACING.md, overflowX: "auto" }}>
        {tabs.map(t => {
          const active = aba === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setAba(t.id)} style={{
              padding: `${SPACING.md}px ${SPACING.xs}px`, background: "transparent",
              border: "none", borderBottom: `2px solid ${active ? COLORS.primary : "transparent"}`,
              color: active ? COLORS.primary : COLORS.textMuted,
              fontSize: TYPO.sm, fontWeight: TYPO.w600, fontFamily: TYPO.family,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: SPACING.xs,
              whiteSpace: "nowrap",
            }}>
              <Icon size={14}/> {t.label}
              {t.badge > 0 && <Tag tone="danger">{t.badge}</Tag>}
            </button>
          );
        })}
      </div>

      <main style={{ padding: SPACING.xl, maxWidth: 1600, margin: "0 auto" }}>

        {/* Filtros */}
        <FilterBar actions={
          <>
            <Btn variant="secondary" size="sm" onClick={limparFiltros}>Limpar</Btn>
            <Btn variant="primary" size="sm" icon={<Download size={14}/>} disabled={filtrado.length === 0}
              onClick={() => baixarCsv(filtrado, `abastecimentos_${new Date().toISOString().slice(0,10)}.csv`)}>Excel</Btn>
          </>
        }>
          <Field label="Placa">
            <select style={inputStyle} value={placa} onChange={e => setPlaca(e.target.value)}>
              <option value="">Todas ({placas.length})</option>
              {placas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Motorista">
            <select style={inputStyle} value={motorista} onChange={e => setMotorista(e.target.value)}>
              <option value="">Todos</option>
              {motoristas.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Posto">
            <select style={inputStyle} value={posto} onChange={e => setPosto(e.target.value)}>
              <option value="">Todos</option>
              {postos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Origem">
            <select style={inputStyle} value={origem} onChange={e => setOrigem(e.target.value)}>
              <option value="">Todas</option>
              <option value="patio">Pátio Pontual</option>
              <option value="externo">Externo</option>
            </select>
          </Field>
          <Field label="De"><input type="date" style={inputStyle} value={de} onChange={e => setDe(e.target.value)} /></Field>
          <Field label="Até"><input type="date" style={inputStyle} value={ate} onChange={e => setAte(e.target.value)} /></Field>
        </FilterBar>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: SPACING.sm, marginBottom: SPACING.md }}>
          <KpiCard label="Litros no período"  value={fmtNum(kpi.litros, 1) + " L"}   icon={<Fuel size={16}/>} tone="primary" />
          <KpiCard label="Custo total"        value={fmtBRL(kpi.custo)}              icon={<DollarSign size={16}/>} tone="primary" />
          <KpiCard label="R$/L médio"         value={fmtBRL(kpi.custoPorLitro)}      icon={<TrendingUp size={16}/>} sub={`${kpi.registrosValidos} válidos · ${kpi.registrosIgnorados} ignorados`} />
          <KpiCard label="Postos externos"    value={`${kpi.externos} / ${kpi.total}`} icon={<MapPin size={16}/>} sub={`${((kpi.externos/kpi.total)*100 || 0).toFixed(1)}% do volume`} />
          <KpiCard label="Externos s/ valor"  value={kpi.extSemValor}                icon={<AlertTriangle size={16}/>} tone="danger" sub="Motorista não lançou" />
          <KpiCard label="Externos s/ NFe"    value={kpi.semNfe}                     icon={<AlertTriangle size={16}/>} tone="warning" />
        </div>

        {/* PAINEL */}
        {aba === "painel" && (
          <>
            <Section title="Pátio Pontual vs Postos Externos" subtitle="Considera R$/L entre R$ 3 e R$ 10 (ignora zerados/outliers)">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: SPACING.sm }}>
                <div style={{ padding: SPACING.md, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md }}>
                  <Tag tone="success">Pátio Pontual</Tag>
                  <div style={{ fontSize: TYPO.xxl, fontWeight: TYPO.w700, marginTop: SPACING.xs, color: COLORS.text }}>{fmtNum(patioVsExterno.patio.litros, 1)} L</div>
                  <div style={{ fontSize: TYPO.sm, color: COLORS.textMuted, marginTop: 2 }}>{fmtBRL(patioVsExterno.patio.custo)} · {patioVsExterno.patio.validos}/{patioVsExterno.patio.count} válidos</div>
                  <div style={{ marginTop: SPACING.sm, fontSize: TYPO.sm }}>R$/L médio <strong>{fmtBRL(patioVsExterno.rlPatio)}</strong></div>
                </div>
                <div style={{ padding: SPACING.md, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md }}>
                  <Tag tone="warning">Externos</Tag>
                  <div style={{ fontSize: TYPO.xxl, fontWeight: TYPO.w700, marginTop: SPACING.xs, color: COLORS.text }}>{fmtNum(patioVsExterno.ext.litros, 1)} L</div>
                  <div style={{ fontSize: TYPO.sm, color: COLORS.textMuted, marginTop: 2 }}>{fmtBRL(patioVsExterno.ext.custo)} · {patioVsExterno.ext.validos}/{patioVsExterno.ext.count} válidos</div>
                  <div style={{ marginTop: SPACING.sm, fontSize: TYPO.sm }}>R$/L médio <strong>{fmtBRL(patioVsExterno.rlExt)}</strong></div>
                </div>
                <div style={{ padding: SPACING.md, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, background: patioVsExterno.economiaSePatio > 0 ? COLORS.successBg : COLORS.dangerBg }}>
                  <Tag tone={patioVsExterno.economiaSePatio > 0 ? "success" : "danger"}>{patioVsExterno.economiaSePatio > 0 ? "Economia se tudo no pátio" : "Pátio mais caro"}</Tag>
                  <div style={{ fontSize: TYPO.xxl, fontWeight: TYPO.w700, marginTop: SPACING.xs, color: patioVsExterno.economiaSePatio > 0 ? COLORS.success : COLORS.danger }}>{fmtBRL(Math.abs(patioVsExterno.economiaSePatio))}</div>
                  <div style={{ fontSize: TYPO.sm, color: COLORS.textMuted, marginTop: 2 }}>Diferença {fmtBRL(Math.abs(patioVsExterno.economiaLitro))}/L</div>
                </div>
              </div>
            </Section>

            <Section title="Consumo mensal" subtitle="Realizado + projeção do mês corrente">
              {projecaoMesAtual && (
                <div style={{ background: COLORS.primaryLight, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, border: `1px solid ${COLORS.border}` }}>
                  <Tag tone="primary">Projeção do mês</Tag>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: SPACING.md, marginTop: SPACING.sm }}>
                    <div><div style={{ fontSize: TYPO.xl, fontWeight: TYPO.w700, color: COLORS.primary }}>{fmtBRL(projecaoMesAtual.projecaoCusto)}</div><div style={{ fontSize: TYPO.xxs, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>Custo projetado</div></div>
                    <div><div style={{ fontSize: TYPO.xl, fontWeight: TYPO.w700, color: COLORS.primary }}>{fmtNum(projecaoMesAtual.projecaoLitros, 0)} L</div><div style={{ fontSize: TYPO.xxs, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>Litros projetados</div></div>
                    <div><div style={{ fontSize: TYPO.xl, fontWeight: TYPO.w700, color: COLORS.text }}>{fmtBRL(projecaoMesAtual.atual.custo)}</div><div style={{ fontSize: TYPO.xxs, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>Realizado ({projecaoMesAtual.diaAtual}/{projecaoMesAtual.ultimoDia} dias)</div></div>
                  </div>
                </div>
              )}
              <DataTable
                minWidth={640}
                columns={[
                  { key: "mes", label: "Mês", render: r => { const [a,m] = r.mes.split("-"); return <strong>{m}/{a}</strong>; } },
                  { key: "count", label: "Abast", align: "right" },
                  { key: "litros", label: "Litros", align: "right", render: r => fmtNum(r.litros, 1) },
                  { key: "custo", label: "Custo", align: "right", render: r => <strong>{fmtBRL(r.custo)}</strong> },
                  { key: "rl", label: "R$/L médio", align: "right", render: r => r.litros ? fmtBRL(r.custo / r.litros) : "—" },
                  { key: "delta", label: "Δ mês ant.", align: "right", render: (r) => {
                      const idx = seriesMensal.findIndex(x => x.mes === r.mes);
                      const prev = seriesMensal[idx - 1];
                      if (!prev) return "—";
                      const delta = ((r.custo - prev.custo) / prev.custo) * 100;
                      return <span style={{ color: delta > 0 ? COLORS.danger : COLORS.success, fontWeight: TYPO.w600 }}>{delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%</span>;
                    }},
                ]}
                rows={[...seriesMensal].reverse().slice(0, 12)}
                keyFn={r => r.mes}
              />
            </Section>

            <Section title="Top 5 postos externos por gasto">
              <DataTable
                columns={[
                  { key: "nome", label: "Posto" },
                  { key: "uf", label: "UF" },
                  { key: "count", label: "Abast", align: "right" },
                  { key: "litros", label: "Litros", align: "right", render: r => fmtNum(r.litros, 1) },
                  { key: "custo", label: "Custo", align: "right", render: r => <strong>{fmtBRL(r.custo)}</strong> },
                  { key: "rl", label: "R$/L médio", align: "right", render: r => fmtBRL(r.rlMedio) },
                ]}
                rows={topPostosExternos}
                keyFn={r => r.nome}
                empty="Nenhum abastecimento externo no filtro"
              />
            </Section>
          </>
        )}

        {/* TIMELINE */}
        {aba === "timeline" && (
          <Section title={`Timeline · ${filtrado.length} registros`} dense>
            <DataTable
              minWidth={1000}
              columns={[
                { key: "data", label: "Data/Hora", render: r => fmtDateTimeBR(r.dataInicio) },
                { key: "placa", label: "Placa", render: r => <><strong>{r.veiculo?.placa || "—"}</strong>{r.veiculo?.modelo && <div style={{ fontSize: TYPO.xxs, color: COLORS.textLight }}>{r.veiculo.modelo}</div>}</> },
                { key: "mot", label: "Motorista", render: r => r.motorista?.nome || "—" },
                { key: "posto", label: "Posto", render: r => <>{r.posto?.nome || "—"}<div style={{ marginTop: 2 }}><Tag tone={r.posto?.comercial ? "warning" : "success"}>{r.posto?.comercial ? "Externo" : "Pátio"}</Tag></div></> },
                { key: "litros", label: "Litros", align: "right", render: r => fmtNum(r.volumeL, 2) },
                { key: "rl", label: "R$/L", align: "right", render: r => r.custoUnitario ? fmtBRL(r.custoUnitario) : "—" },
                { key: "total", label: "Total", align: "right", render: r => <strong>{fmtBRL(r.custoTotal)}</strong> },
                { key: "odo", label: "Odômetro", align: "right", render: r => fmtNum(r.odometro) },
                { key: "kml", label: "km/L", align: "right", render: r => r.mediaKmL ? fmtNum(r.mediaKmL, 2) : "—" },
                { key: "nfe", label: "NFe", render: r => r.chaveNfe ? <span style={{ fontFamily: TYPO.familyMono, fontSize: TYPO.xxs }}>{r.chaveNfe.slice(-6)}</span> : (r.posto?.comercial ? <Tag tone="danger">Sem NFe</Tag> : <span style={{ color: COLORS.textLight, fontSize: TYPO.xs }}>N/A</span>) },
              ]}
              rows={filtrado.slice(0, 500)}
              keyFn={r => r.id}
              empty={loading ? "Carregando..." : "Nenhum abastecimento no filtro"}
            />
            {filtrado.length > 500 && <div style={{ padding: SPACING.sm, fontSize: TYPO.xxs, color: COLORS.textLight, textAlign: "center" }}>Mostrando primeiros 500 de {filtrado.length} · exporte Excel pra ver tudo</div>}
          </Section>
        )}

        {/* POR VEÍCULO */}
        {aba === "veiculos" && (
          <Section
            title={`Consumo por veículo · ${cpkPorVeiculo.length} placas`}
            subtitle="Km rodado = odômetro final − inicial no período. Cruzamento SASCAR mostra divergência (km adicional após último abast)."
            dense
          >
            <DataTable
              columns={[
                { key: "placa", label: "Placa", render: r => <strong>{r.placa}</strong> },
                { key: "modelo", label: "Modelo", wrap: true, maxWidth: 240 },
                { key: "abasts", label: "Abast", align: "right" },
                { key: "litros", label: "Litros", align: "right", render: r => fmtNum(r.litros, 1) },
                { key: "custo", label: "Custo", align: "right", render: r => <strong>{fmtBRL(r.custo)}</strong> },
                { key: "odoRange", label: "Odômetro", align: "right", render: r => r.odoMin != null && r.odoMax != null
                  ? <span style={{ fontSize: TYPO.xs }}>{fmtNum(r.odoMin)} → {fmtNum(r.odoMax)}</span>
                  : "—" },
                { key: "kmRodado", label: "Km rodado", align: "right", render: r => r.kmRodado ? fmtNum(r.kmRodado) : "—" },
                { key: "kml", label: "km/L", align: "right", render: r => {
                    if (!r.kmL) return "—";
                    const cor = (r.kmL < 1.5 || r.kmL > 5) ? COLORS.danger : (r.kmL < 2 || r.kmL > 4) ? COLORS.warning : COLORS.success;
                    return <strong style={{ color: cor }}>{fmtNum(r.kmL, 2)}</strong>;
                  }},
                { key: "cpk", label: "CPK (R$/km)", align: "right", render: r => <strong style={{ color: r.cpk > 3 ? COLORS.danger : r.cpk > 2 ? COLORS.warning : COLORS.success }}>{r.cpk ? fmtBRL(r.cpk) : "—"}</strong> },
                { key: "sascar", label: "SASCAR agora", align: "right", render: r => r.odoSascar != null
                  ? <span style={{ fontFamily: TYPO.familyMono, fontSize: TYPO.xs }}>{fmtNum(r.odoSascar)}</span>
                  : <span style={{ color: COLORS.textLight }}>—</span> },
                { key: "div", label: "Δ Sascar − CTA", align: "right", render: r => {
                    if (r.divergenciaSascar == null) return <span style={{ color: COLORS.textLight }}>—</span>;
                    const abs = Math.abs(r.divergenciaSascar);
                    let cor = COLORS.textMuted;
                    if (r.divergenciaSascar < 0) cor = COLORS.danger;           // CTA > SASCAR = erro
                    else if (abs > 5000) cor = COLORS.warning;                   // muito depois do último abast
                    return <span style={{ color: cor, fontWeight: TYPO.w600 }}>{r.divergenciaSascar > 0 ? "+" : ""}{fmtNum(r.divergenciaSascar)} km</span>;
                  }},
              ]}
              rows={cpkPorVeiculo}
              keyFn={r => r.placa}
            />
            <div style={{ padding: SPACING.md, fontSize: TYPO.xxs, color: COLORS.textLight, background: COLORS.bgAlt, borderTop: `1px solid ${COLORS.border}`, lineHeight: 1.5 }}>
              <strong>Leitura da divergência SASCAR:</strong>
              &nbsp;• positiva pequena (0-5.000 km) = veículo rodou após último abast, normal
              &nbsp;• positiva grande = muito tempo sem abastecer no CTA (verificar)
              &nbsp;• <span style={{ color: COLORS.danger }}>negativa (CTA maior que SASCAR)</span> = odômetro do CTA foi digitado errado ou hodômetro do painel foi trocado
              &nbsp;• "—" = veículo não tem SASCAR cadastrado ou CTA não tem odômetro
              <br />
              <strong>km/L esperado diesel:</strong> 2 a 4 km/L. Vermelho = fora do intervalo (dado ruim ou problema mecânico).
            </div>
          </Section>
        )}

        {/* VIAGENS */}
        {aba === "viagens" && (
          <>
            {viagensStats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: SPACING.sm, marginBottom: SPACING.md }}>
                <KpiCard label="Viagens contadas" value={fmtNum(viagensStats.total)} icon={<MapPin size={16}/>} tone="primary" />
                <KpiCard label="Km total"         value={fmtNum(viagensStats.totalKm) + " km"} />
                <KpiCard label="Litros total"     value={fmtNum(viagensStats.totalL, 1) + " L"} />
                <KpiCard label="Custo total"      value={fmtBRL(viagensStats.totalR)} tone="primary" />
                <KpiCard label="km/L da frota"    value={fmtNum(viagensStats.kmL, 2)} icon={<TrendingUp size={16}/>} sub="ponderado por km" />
                <KpiCard label="CPK médio"        value={fmtBRL(viagensStats.cpk)} sub="R$/km rodado" />
              </div>
            )}
            {viagensStats && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SPACING.sm, marginBottom: SPACING.md }}>
                <div style={{ background: COLORS.successBg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: SPACING.md }}>
                  <Tag tone="success">Melhor viagem (maior km/L)</Tag>
                  <div style={{ fontSize: TYPO.lg, fontWeight: TYPO.w700, marginTop: SPACING.xs }}>{viagensStats.melhor.placa} · {fmtNum(viagensStats.melhor.kmL, 2)} km/L</div>
                  <div style={{ fontSize: TYPO.xs, color: COLORS.textMuted }}>{viagensStats.melhor.motorista} · {fmtNum(viagensStats.melhor.km)} km · {fmtNum(viagensStats.melhor.litros, 1)} L</div>
                </div>
                <div style={{ background: COLORS.dangerBg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: SPACING.md }}>
                  <Tag tone="danger">Pior viagem (menor km/L)</Tag>
                  <div style={{ fontSize: TYPO.lg, fontWeight: TYPO.w700, marginTop: SPACING.xs }}>{viagensStats.pior.placa} · {fmtNum(viagensStats.pior.kmL, 2)} km/L</div>
                  <div style={{ fontSize: TYPO.xs, color: COLORS.textMuted }}>{viagensStats.pior.motorista} · {fmtNum(viagensStats.pior.km)} km · {fmtNum(viagensStats.pior.litros, 1)} L</div>
                </div>
              </div>
            )}

            {rankingMotoristas.length > 0 && (
              <Section title={`Ranking de motoristas · km/L (mínimo 3 viagens)`} dense>
                <DataTable
                  columns={[
                    { key: "pos", label: "#", align: "right", render: (r) => rankingMotoristas.indexOf(r) + 1 },
                    { key: "motorista", label: "Motorista" },
                    { key: "viagens", label: "Viagens", align: "right" },
                    { key: "km", label: "Km rodado", align: "right", render: r => fmtNum(r.km) },
                    { key: "litros", label: "Litros", align: "right", render: r => fmtNum(r.litros, 1) },
                    { key: "kmL", label: "km/L", align: "right", render: r => {
                        const cor = r.kmL >= 3 ? COLORS.success : r.kmL >= 2.2 ? COLORS.warning : COLORS.danger;
                        return <strong style={{ color: cor }}>{fmtNum(r.kmL, 2)}</strong>;
                    }},
                    { key: "cpk", label: "CPK (R$/km)", align: "right", render: r => fmtBRL(r.cpk) },
                    { key: "custo", label: "Custo total", align: "right", render: r => <strong>{fmtBRL(r.custo)}</strong> },
                  ]}
                  rows={rankingMotoristas}
                  keyFn={r => r.motorista}
                />
              </Section>
            )}

            <Section title={`Viagens · ${viagens.length}`} subtitle="Tanque a tanque · outliers (km/L < 0,8 ou > 8, km < 5 ou > 3000) descartados" dense>
              <DataTable
                minWidth={1100}
                columns={[
                  { key: "data", label: "Fim", render: r => fmtDateTimeBR(r.dataFim) },
                  { key: "placa", label: "Placa", render: r => <><strong>{r.placa}</strong>{r.modelo && <div style={{ fontSize: TYPO.xxs, color: COLORS.textLight }}>{r.modelo.slice(0, 30)}</div>}</> },
                  { key: "mot", label: "Motorista", render: r => r.motorista },
                  { key: "odo", label: "Odômetro", align: "right", render: r => <span style={{ fontSize: TYPO.xs }}>{fmtNum(r.odoIni)} → {fmtNum(r.odoFim)}</span> },
                  { key: "km", label: "Km", align: "right", render: r => <strong>{fmtNum(r.km)}</strong> },
                  { key: "litros", label: "Litros", align: "right", render: r => fmtNum(r.litros, 1) },
                  { key: "custo", label: "Custo", align: "right", render: r => <strong>{fmtBRL(r.custo)}</strong> },
                  { key: "kmL", label: "km/L", align: "right", render: r => {
                      const cor = (r.kmL < 1.5 || r.kmL > 5) ? COLORS.danger : (r.kmL < 2 || r.kmL > 4) ? COLORS.warning : COLORS.success;
                      return <strong style={{ color: cor }}>{fmtNum(r.kmL, 2)}</strong>;
                  }},
                  { key: "cpk", label: "CPK", align: "right", render: r => fmtBRL(r.cpk) },
                  { key: "postos", label: "Origem → Destino", render: r => <span style={{ fontSize: TYPO.xxs }}>
                    <Tag tone={r.externoIni ? "warning" : "success"} size="sm">{r.externoIni ? "EXT" : "PAT"}</Tag>
                    <span style={{ margin: "0 4px", color: COLORS.textLight }}>→</span>
                    <Tag tone={r.externoFim ? "warning" : "success"} size="sm">{r.externoFim ? "EXT" : "PAT"}</Tag>
                  </span> },
                ]}
                rows={viagens.slice(0, 500)}
                keyFn={r => r.id}
                empty="Nenhuma viagem completa detectada"
              />
              {viagens.length > 500 && <div style={{ padding: SPACING.sm, fontSize: TYPO.xxs, color: COLORS.textLight, textAlign: "center" }}>Mostrando primeiras 500 de {viagens.length}</div>}
            </Section>
          </>
        )}

        {/* ALERTAS */}
        {aba === "alertas" && (
          <Section title={`Alertas · ${alertas.length}`} dense>
            <DataTable
              columns={[
                { key: "tipo", label: "Tipo", render: r => <Tag tone={r.tone}>{
                  { odometro: "Odômetro", volume: "Volume", nfe: "NFe", externo_sem_valor: "Sem valor" }[r.tipo] || r.tipo
                }</Tag> },
                { key: "data", label: "Data", render: r => fmtDateTimeBR(r.ab.dataInicio) },
                { key: "placa", label: "Placa", render: r => <strong>{r.ab.veiculo?.placa || "—"}</strong> },
                { key: "mot", label: "Motorista", render: r => r.ab.motorista?.nome || "—" },
                { key: "msg", label: "Detalhe", wrap: true },
              ]}
              rows={alertas}
              keyFn={(r, i) => `${r.tipo}-${i}`}
              empty="Nenhum alerta no filtro atual"
            />
          </Section>
        )}

      </main>
    </div>
  );
}
