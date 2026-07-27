import { Fragment, useMemo, useState } from "react";
import { Clock, RefreshCw, AlertTriangle, CheckCircle2, Search, Truck, X, Calendar, TrendingUp, UserX, Copy, UserMinus, MapPin, ArrowLeftRight, Check, Map as MapIcon } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { save as dsSave } from "../services/genericDataSource";
import { useJornada } from "../hooks/useJornada";
import { capitalizarNome } from "../utils/format";
import ModuleHeader from "../components/ModuleHeader";
import ExportBar from "../components/ExportBar";

function hojeISO() {
  const d = new Date();
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

function ontemISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function diasAtrasISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function formatBR(iso) {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]} ${m[4]}:${m[5]}`;
}

function formatDataBR(iso) {
  if (!iso) return "";
  const [Y, M, D] = iso.split("-");
  return `${D}/${M}/${Y}`;
}

// Minutos entre uma hora BRT ('YYYY-MM-DD HH:MM:SS') e agora.
// SASCAR retorna em BRT; parse com offset -03:00 explícito → não depende do fuso do navegador.
function minutosDesdeBRT(horaStr) {
  const m = horaStr?.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const evMs = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}-03:00`).getTime();
  return Math.max(0, Math.round((Date.now() - evMs) / 60000));
}

// Maior gap (em minutos) entre dois eventos de "Dirigindo" consecutivos sem
// nenhuma macro intermediária (pausa/refeição/parada).
function maiorGapSemMacro(timeline) {
  if (!Array.isArray(timeline) || timeline.length < 2) return 0;
  let maxGap = 0;
  for (let i = 0; i < timeline.length - 1; i++) {
    const a = timeline[i];
    const b = timeline[i + 1];
    const dA = (a.descricao || a.tipo || "").toLowerCase();
    const dB = (b.descricao || b.tipo || "").toLowerCase();
    if (!dA.includes("dirig") || !dB.includes("dirig")) continue;
    const tA = new Date(a.fim || a.inicio).getTime();
    const tB = new Date(b.inicio).getTime();
    if (!Number.isFinite(tA) || !Number.isFinite(tB)) continue;
    const gap = (tB - tA) / 60000;
    if (gap > maxGap) maxGap = gap;
  }
  return maxGap;
}

// Avalia os 3 alertas novos para uma jornada (>8h, parado >7h, sem macro >30min)
function alertasDaJornada(j) {
  const semMacroMin = maiorGapSemMacro(j.timeline);
  const ultimoMin = minutosDesdeBRT(j.fim);
  return {
    parado7h:    ultimoMin != null && ultimoMin > 420 && j.encerrouJornada !== true,
    semMacro30:  semMacroMin >= 30,
    semMacroMin,
    ultimoMin,
  };
}

function fmtDuracaoMin(min) {
  if (min == null) return "—";
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

// Copia texto pro clipboard. navigator.clipboard só existe em contexto seguro
// (https/localhost); no acesso pela rede (http://192.168.x.x) ele é undefined,
// então cai no fallback execCommand. Retorna Promise<boolean>.
async function copiarTexto(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch { /* cai no fallback */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const PRESETS = [
  { id: "hoje",   label: "Hoje",     range: () => [hojeISO(), hojeISO()] },
  { id: "ontem",  label: "Ontem",    range: () => [ontemISO(), ontemISO()] },
  { id: "7d",     label: "7 dias",   range: () => [diasAtrasISO(6), hojeISO()] },
  { id: "30d",    label: "30 dias",  range: () => [diasAtrasISO(29), hojeISO()] },
];

function Cell({ value, min, danger, warn, highlight }) {
  const cor = danger ? "var(--danger)" : warn ? "var(--warning)" : (min > 0 ? "var(--text)" : "var(--text-subtle)");
  const bg = highlight && danger ? "var(--danger-bg)" : (highlight && warn ? "var(--warning-bg)" : "transparent");
  return (
    <td style={{
      padding: "10px 8px",
      textAlign: "center",
      fontFamily: "monospace",
      fontWeight: 700,
      color: cor,
      background: bg,
      whiteSpace: "nowrap",
      borderRadius: highlight ? 4 : 0,
    }}>
      {value}
    </td>
  );
}

export default function Jornada() {
  const [preset, setPreset] = useState("hoje");
  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO());

  const { linhas, dias, ehPeriodo, naoIniciaram, totalCadastro, totalEventos, cache, loading, error, lastFetch, refetch } = useJornada(dataInicio, dataFim);
  const [busca, setBusca] = useState("");
  const [mostrarNaoIniciaram, setMostrarNaoIniciaram] = useState(false);
  const [mostrarNaoEncerrou, setMostrarNaoEncerrou] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [filtroInfracao, setFiltroInfracao] = useState(false);
  const [filtroNaoEncerrou, setFiltroNaoEncerrou] = useState(false);
  const [filtroEncerrou, setFiltroEncerrou] = useState(false);
  const [filtroSemPausa, setFiltroSemPausa] = useState(false);
  const [filtroExtra, setFiltroExtra] = useState(false);
  const [filtroSemInfracao, setFiltroSemInfracao] = useState(false);
  const [filtroParado7h,   setFiltroParado7h]   = useState(false);
  const [filtroSemMacro30, setFiltroSemMacro30] = useState(false);
  const [ciclosExpandidos, setCiclosExpandidos] = useState({}); // { idMotorista: true }
  const [trajetoExpandido, setTrajetoExpandido] = useState({}); // { idMotorista: true }

  const aplicarPreset = (id) => {
    setPreset(id);
    const p = PRESETS.find(x => x.id === id);
    if (p) {
      const [i, f] = p.range();
      setDataInicio(i);
      setDataFim(f);
    }
  };

  const filtradas = useMemo(() => {
    const termo = busca.trim().toUpperCase();
    return linhas.filter(j => {
      if (filtroInfracao && !j.temInfracao) return false;
      if (filtroSemInfracao && j.temInfracao) return false;
      if (filtroNaoEncerrou && j.encerrouJornada !== false) return false;
      if (filtroEncerrou && j.encerrouJornada !== true) return false;
      if (filtroSemPausa && j.pausaDiariaSuficiente !== false) return false;
      if (filtroExtra && !(j.extra50Min > 0 || j.extra100Min > 0)) return false;
      const al = alertasDaJornada(j);
      if (filtroParado7h   && !al.parado7h)   return false;
      if (filtroSemMacro30 && !al.semMacro30) return false;
      if (termo) {
        const nome = (j.nomeMotorista || "").toUpperCase();
        const placas = j.placas.join(",").toUpperCase();
        if (!nome.includes(termo) && !placas.includes(termo)) return false;
      }
      return true;
    });
  }, [linhas, busca, filtroInfracao, filtroSemInfracao, filtroNaoEncerrou, filtroEncerrou, filtroSemPausa, filtroExtra, filtroParado7h, filtroSemMacro30]);

  // Lista de quem NÃO encerrou a jornada (só vista diária), ordenada por mais tempo aberta.
  // Vira a "worklist" do despachante pra cobrar o motorista de bater Encerrar no tablet.
  const naoEncerrados = useMemo(() => {
    if (ehPeriodo) return [];
    return linhas
      .filter(j => j.encerrouJornada === false)
      .map(j => ({ ...j, abertaHaMin: minutosDesdeBRT(j.fim) }))
      .sort((a, b) => (b.abertaHaMin ?? 0) - (a.abertaHaMin ?? 0));
  }, [linhas, ehPeriodo]);

  const totais = useMemo(() => {
    let jornadaSum = 0, extra50Sum = 0, extra100Sum = 0, infracoes = 0;
    let comExtra = 0, comInfracao = 0, naoEncerraram = 0, encerraram = 0;
    let semPausa30 = 0;
    let parado7h = 0, semMacro30 = 0;
    for (const j of linhas) {
      jornadaSum += j.totalAtivoMin;
      extra50Sum += j.extra50Min;
      extra100Sum += j.extra100Min;
      if (j.extra50Min > 0 || j.extra100Min > 0) comExtra++;
      if (j.temInfracao) { comInfracao++; infracoes += j.infracoes.length; }
      if (j.encerrouJornada === false) naoEncerraram++;
      if (j.encerrouJornada === true) encerraram++;
      if (j.pausaDiariaSuficiente === false) semPausa30++;
      const al = alertasDaJornada(j);
      if (al.parado7h)   parado7h++;
      if (al.semMacro30) semMacro30++;
    }
    return {
      motoristas: linhas.length,
      jornadaMedia: linhas.length > 0 ? Math.round(jornadaSum / linhas.length) : 0,
      extra50Sum,
      extra100Sum,
      comExtra,
      comInfracao,
      infracoesTotais: infracoes,
      naoEncerraram,
      encerraram,
      semPausa30,
      semInfracao: linhas.length - comInfracao,
      parado7h,
      semMacro30,
    };
  }, [linhas]);

  const fmtHHmm = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Alterna tipo de contrato do motorista (interno ↔ px) e salva no Firestore
  const [salvandoTipo, setSalvandoTipo] = useState(null); // idMotorista sendo salvo
  async function toggleTipoContrato(j) {
    const novo = j.tipoContrato === "px" ? "interno" : "px";
    setSalvandoTipo(j.idMotorista);
    try {
      await dsSave("motoristas_classificacao", String(j.idMotorista), {
        nome: j.nomeMotorista,
        tipoContrato: novo,
        atualizadoEm: new Date().toISOString(),
      });
      await refetch(); // recalcula jornada com a nova classificação
    } catch (e) {
      alert("Erro ao salvar tipo: " + (e?.message || e));
    } finally {
      setSalvandoTipo(null);
    }
  }

  // Marca motorista como desligado (SASCAR não tem flag "ativo") — some da lista
  const [marcandoDesligado, setMarcandoDesligado] = useState(null);
  async function marcarDesligado(m) {
    if (!window.confirm(`Marcar ${capitalizarNome(m.nome)} como DESLIGADO?\n\nEle some da lista "não iniciaram". Reversível depois.`)) return;
    setMarcandoDesligado(m.idMotorista);
    try {
      await dsSave("motoristas_desligados", String(m.idMotorista), {
        nome: m.nome,
        desligadoEm: new Date().toISOString(),
      });
      await refetch(); // recarrega já sem ele
    } catch (e) {
      alert("Erro ao marcar desligado: " + (e?.message || e));
    } finally {
      setMarcandoDesligado(null);
    }
  }


  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)" }}>
      {/* HEADER — full width, sticky (igual dashboard) */}
      <ModuleHeader
        title="Jornada & Extras"
        actions={
          <button onClick={refetch} className="mod-hbtn-alt" title="Atualizar">
            <RefreshCw size={16} className={loading ? "rotating" : ""} /> Atualizar
          </button>
        }
      />

      <div style={{ maxWidth: 1480, margin: "0 auto", padding: "16px 14px 40px" }}>

        {/* SELETOR DE PERÍODO */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Calendar size={16} color="var(--text-muted)" />
          <span style={{ fontSize: ".8rem", color: "var(--text-muted)", fontWeight: 600 }}>Período:</span>

          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => aplicarPreset(p.id)}
              style={{
                ...btnPreset,
                background: preset === p.id ? "var(--accent)" : "var(--surface-2)",
                color: preset === p.id ? "#fff" : "var(--text)",
                borderColor: preset === p.id ? "var(--accent)" : "var(--border-strong)",
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setPreset("custom")}
            style={{
              ...btnPreset,
              background: preset === "custom" ? "var(--accent)" : "var(--surface-2)",
              color: preset === "custom" ? "#fff" : "var(--text)",
              borderColor: preset === "custom" ? "var(--accent)" : "var(--border-strong)",
            }}
          >
            Personalizado
          </button>

          <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 8 }}>
            <input
              type="date"
              value={dataInicio}
              onChange={e => { setPreset("custom"); setDataInicio(e.target.value); if (e.target.value > dataFim) setDataFim(e.target.value); }}
              style={inputDate}
            />
            <span style={{ color: "var(--text-muted)" }}>até</span>
            <input
              type="date"
              value={dataFim}
              min={dataInicio}
              onChange={e => { setPreset("custom"); setDataFim(e.target.value); }}
              style={inputDate}
            />
          </div>

          {ehPeriodo && (
            <span style={{ marginLeft: "auto", background: "var(--accent-soft)", color: "var(--accent)", padding: "2px 8px", borderRadius: 6, fontSize: ".72rem", fontWeight: 700 }}>
              {dias.length} dias agregados
            </span>
          )}
        </div>

        {/* Exportar */}
        <ExportBar
          titulo="Jornada & Extras"
          arquivo="jornada"
          subtitulo={() => {
            const per = dataInicio === dataFim ? formatDataBR(dataInicio) : `${formatDataBR(dataInicio)} a ${formatDataBR(dataFim)}`;
            return `Período: ${per} · ${filtradas.length} motorista(s)`;
          }}
          dados={() => {
            const infrTxt = (j) => j.temInfracao ? `${j.infracoes.length} infração(ões)` : "OK";
            if (ehPeriodo) {
              return {
                colunas: ["Motorista", "ID", "Placas", "Dias", "Total", "Dirigindo", "Refeição", "Pausa", "Extra 50%", "Extra 100%", "Status"],
                linhas: filtradas.map((j) => [
                  capitalizarNome(j.nomeMotorista), j.idMotorista, j.placas.join(", "),
                  j.dias, j.totalAtivo, j.dirigindo, j.refeicao, j.pausa, j.extra50, j.extra100, infrTxt(j),
                ]),
              };
            }
            return {
              colunas: ["Motorista", "ID", "Placas", "Início", "Fim", "Total", "Dirigindo", "Refeição", "Pausa", "Extra 50%", "Extra 100%", "Dir. contínua", "Status"],
              linhas: filtradas.map((j) => [
                capitalizarNome(j.nomeMotorista), j.idMotorista, j.placas.join(", "),
                formatBR(j.inicio), j.encerrouJornada ? formatBR(j.fim) : "em andamento",
                j.totalAtivo, j.dirigindo, j.refeicao, j.pausa, j.extra50, j.extra100, j.direcaoContinuaMaxima, infrTxt(j),
              ]),
            };
          }}
        />

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
          <Kpi label="Motoristas no período" value={totais.motoristas} color="var(--accent)" icon={<Truck size={16} />} />
          <Kpi label={ehPeriodo ? "Jornada média/motorista" : "Jornada média"} value={fmtHHmm(totais.jornadaMedia)} color="var(--accent)" icon={<Clock size={16} />} />
          <Kpi
            label={ehPeriodo ? "Horas extras (total período)" : "Horas extras (total do dia)"}
            value={fmtHHmm(totais.extra50Sum + totais.extra100Sum)}
            color="var(--accent)"
            icon={<TrendingUp size={16} />}
            sub={`50%: ${fmtHHmm(totais.extra50Sum)} | 100%: ${fmtHHmm(totais.extra100Sum)}`}
          />
          <Kpi
            label="Motoristas com extras"
            value={totais.comExtra}
            color={totais.comExtra > 0 ? "var(--warning)" : "var(--text-subtle)"}
            icon={<TrendingUp size={16} />}
            sub={totais.comExtra > 0 ? "Clique p/ filtrar" : "Ninguém em extra"}
            onClick={() => setFiltroExtra(v => !v)}
            active={filtroExtra}
          />
          <Kpi
            label="Sem infração"
            value={totais.semInfracao}
            color="var(--success)"
            icon={<CheckCircle2 size={16} />}
            sub={totais.semInfracao > 0 ? "Clique p/ filtrar" : "Ninguém conforme"}
            onClick={() => { setFiltroSemInfracao(v => !v); setFiltroInfracao(false); }}
            active={filtroSemInfracao}
          />
          <Kpi
            label="Com infração"
            value={totais.comInfracao}
            color={totais.comInfracao > 0 ? "var(--danger)" : "var(--text-subtle)"}
            icon={<AlertTriangle size={16} />}
            sub={totais.comInfracao > 0 ? `${totais.infracoesTotais} ocorrência(s)` : "Nenhuma até agora"}
            onClick={() => { setFiltroInfracao(v => !v); setFiltroSemInfracao(false); }}
            active={filtroInfracao}
          />
          {!ehPeriodo && (
            <>
              <Kpi
                label="Não iniciaram jornada"
                value={naoIniciaram.length}
                color={naoIniciaram.length > 0 ? "var(--accent)" : "var(--success)"}
                icon={<UserX size={16} />}
                sub={naoIniciaram.length > 0 ? "Clique p/ ver e lançar folga" : "Todos do cadastro iniciaram"}
                onClick={() => setMostrarNaoIniciaram(true)}
                active={mostrarNaoIniciaram}
              />
              <Kpi
                label="Encerraram jornada"
                value={totais.encerraram}
                color="var(--success)"
                icon={<CheckCircle2 size={16} />}
                sub={totais.encerraram > 0 ? "Clique p/ filtrar" : "Ninguém encerrou ainda"}
                onClick={() => { setFiltroEncerrou(v => !v); setFiltroNaoEncerrou(false); }}
                active={filtroEncerrou}
              />
              <Kpi
                label="Não encerraram jornada"
                value={totais.naoEncerraram}
                color={totais.naoEncerraram > 0 ? "var(--warning)" : "var(--success)"}
                icon={<Clock size={16} />}
                sub={totais.naoEncerraram > 0 ? "Clique p/ ver e cobrar" : "Todos encerraram"}
                onClick={() => {
                  if (totais.naoEncerraram > 0) setMostrarNaoEncerrou(true);
                  setFiltroNaoEncerrou(true);
                  setFiltroEncerrou(false);
                }}
                active={filtroNaoEncerrou}
              />
              <Kpi
                label="Sem 30min de pausa"
                value={totais.semPausa30}
                color={totais.semPausa30 > 0 ? "var(--danger)" : "var(--success)"}
                icon={<AlertTriangle size={16} />}
                sub={totais.semPausa30 > 0 ? "Clique p/ filtrar" : "Todos com pausa OK"}
                onClick={() => setFiltroSemPausa(v => !v)}
                active={filtroSemPausa}
              />
              <Kpi
                label="Parado +7h"
                value={totais.parado7h}
                color={totais.parado7h > 0 ? "var(--warning)" : "var(--text-subtle)"}
                icon={<AlertTriangle size={16} />}
                sub={totais.parado7h > 0 ? "Sem dirigir há +7h" : "Ninguém parado +7h"}
                onClick={() => setFiltroParado7h(v => !v)}
                active={filtroParado7h}
              />
              <Kpi
                label="Sem macro +30min"
                value={totais.semMacro30}
                color={totais.semMacro30 > 0 ? "var(--warning)" : "var(--text-subtle)"}
                icon={<MapPin size={16} />}
                sub={totais.semMacro30 > 0 ? "Dirigiu sem macro entre os trechos" : "Macros em ordem"}
                onClick={() => setFiltroSemMacro30(v => !v)}
                active={filtroSemMacro30}
              />
            </>
          )}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--text-subtle)" }} />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar motorista ou placa..."
              style={{ width: "100%", padding: "8px 30px 8px 32px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: ".9rem", outline: "none" }}
            />
            {busca && (
              <button onClick={() => setBusca("")} style={{ position: "absolute", right: 6, top: 6, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={16} />
              </button>
            )}
          </div>
          {filtroInfracao && (
            <button onClick={() => setFiltroInfracao(false)} style={{ ...btnGhost, background: "var(--danger-bg)", color: "var(--danger)", borderColor: "var(--danger-border)" }}>
              <X size={14} /> Limpar filtro infração
            </button>
          )}
          {filtroSemInfracao && (
            <button onClick={() => setFiltroSemInfracao(false)} style={{ ...btnGhost, background: "var(--success-bg)", color: "var(--success)", borderColor: "var(--success-border)" }}>
              <X size={14} /> Limpar filtro sem infração
            </button>
          )}
          {filtroNaoEncerrou && (
            <button onClick={() => setFiltroNaoEncerrou(false)} style={{ ...btnGhost, background: "var(--warning-bg)", color: "var(--warning)", borderColor: "var(--warning-border)" }}>
              <X size={14} /> Limpar filtro não encerrou
            </button>
          )}
          {filtroEncerrou && (
            <button onClick={() => setFiltroEncerrou(false)} style={{ ...btnGhost, background: "var(--success-bg)", color: "var(--success)", borderColor: "var(--success-border)" }}>
              <X size={14} /> Limpar filtro encerrados
            </button>
          )}
          {filtroSemPausa && (
            <button onClick={() => setFiltroSemPausa(false)} style={{ ...btnGhost, background: "var(--danger-bg)", color: "var(--danger)", borderColor: "var(--danger-border)" }}>
              <X size={14} /> Limpar filtro sem pausa
            </button>
          )}
          {filtroExtra && (
            <button onClick={() => setFiltroExtra(false)} style={{ ...btnGhost, background: "var(--warning-bg)", color: "var(--warning)", borderColor: "var(--warning-bg)" }}>
              <X size={14} /> Limpar filtro horas extras
            </button>
          )}
          {filtroParado7h && (
            <button onClick={() => setFiltroParado7h(false)} style={{ ...btnGhost, background: "var(--warning-bg)", color: "var(--warning)", borderColor: "var(--warning-border)" }}>
              <X size={14} /> Limpar filtro parado +7h
            </button>
          )}
          {filtroSemMacro30 && (
            <button onClick={() => setFiltroSemMacro30(false)} style={{ ...btnGhost, background: "var(--warning-bg)", color: "var(--warning)", borderColor: "var(--warning-border)" }}>
              <X size={14} /> Limpar filtro sem macro +30min
            </button>
          )}
          <div style={{ marginLeft: "auto", fontSize: ".75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            {!ehPeriodo && dataInicio === hojeISO() && (
              <span style={{ background: "var(--success-bg)", color: "var(--success)", padding: "2px 8px", borderRadius: 10, fontSize: ".7rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 0 0 rgba(22,163,74,0.7)", animation: "ao-vivo-pulse 2s infinite" }} />
                AO VIVO · atualiza a cada 60s
                <style>{`@keyframes ao-vivo-pulse { 0% { box-shadow: 0 0 0 0 rgba(22,163,74,0.7);} 70% { box-shadow: 0 0 0 8px rgba(22,163,74,0);} 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0);} }`}</style>
              </span>
            )}
            {lastFetch && `Atualizado: ${lastFetch.toLocaleTimeString("pt-BR")}`}
            {cache && cache.age != null && ` · Cache ${Math.round(cache.age / 1000)}s`}
            {totalEventos > 0 && ` · ${totalEventos} eventos brutos`}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: 12, borderRadius: 8, marginBottom: 12, fontSize: ".85rem" }}>
            Erro ao carregar: {error}
          </div>
        )}

        {/* Tabela */}
        <div style={{ background: "var(--card-bg)", borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem" }}>
              <thead style={{ background: "var(--surface-2)", borderBottom: "2px solid var(--border)" }}>
                <tr>
                  <Th>Motorista</Th>
                  <Th>Placa(s)</Th>
                  {ehPeriodo ? <Th right>Dias</Th> : <><Th right>Início</Th><Th right>Fim</Th><Th right title="Quantas vezes o motorista encerrou e reabriu jornada no dia (1 = normal, 2+ = reabriu)">Ciclos</Th></>}
                  <Th right title="Jornada efetiva total (jornada + dirigindo + refeição + pausa)">Total</Th>
                  <Th right>Dirigindo</Th>
                  <Th right>Refeição</Th>
                  <Th right>Pausa</Th>
                  <Th right title="Extra 50% — semana: acima de 9h30 (limite +2h). Sábado: acima de 4h.">Extra 50%</Th>
                  <Th right title="Extra 100% — semana: acima de 11h30 (infração). Domingo: TODO o tempo.">Extra 100%</Th>
                  {!ehPeriodo && <Th right title="Direção contínua máxima sem pausa">Dir. contínua</Th>}
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {loading && linhas.length === 0 && (
                  <tr><td colSpan={13} style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>
                    {ehPeriodo ? `Carregando ${dias.length} dias (pode demorar)...` : "Carregando eventos do SASCAR..."}
                  </td></tr>
                )}
                {!loading && filtradas.length === 0 && (
                  <tr><td colSpan={13} style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>
                    Nenhuma jornada no período. {filtroInfracao ? "Tente limpar o filtro de infração." : "Motoristas precisam apertar 'Jornada' no tablet SasMDT."}
                  </td></tr>
                )}
                {filtradas.map((j) => (
                  <Fragment key={j.idMotorista}>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: j.temInfracao ? "var(--danger-bg)" : "transparent" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text)" }}>
                      {capitalizarNome(j.nomeMotorista)}
                      <div style={{ fontSize: ".7rem", color: "var(--text-muted)", fontWeight: 400, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        ID {j.idMotorista} · {j.qtdEventos} ev.
                        {!ehPeriodo && j.tipoDia === 'sabado' && <span style={pill("var(--warning-bg)", "var(--warning)")}>SÁB</span>}
                        {!ehPeriodo && j.tipoDia === 'domingo' && <span style={pill("var(--danger-bg)", "var(--danger)")}>DOM</span>}
                        {!ehPeriodo && (
                          <button
                            onClick={() => toggleTipoContrato(j)}
                            disabled={salvandoTipo === j.idMotorista}
                            title="Clique pra alternar entre Interno (CLT) e PX (agregado PJ)"
                            style={{
                              border: "none", cursor: "pointer", fontSize: ".68rem", fontWeight: 700,
                              padding: "1px 7px", borderRadius: 10,
                              background: j.tipoContrato === "px" ? "var(--accent-soft)" : "var(--accent-soft)",
                              color: j.tipoContrato === "px" ? "var(--accent)" : "var(--accent)",
                              opacity: salvandoTipo === j.idMotorista ? 0.5 : 1,
                            }}>
                            {salvandoTipo === j.idMotorista ? "..." : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                {j.tipoContrato === "px" ? "PX" : "Interno"} <ArrowLeftRight size={12} />
                              </span>
                            )}
                          </button>
                        )}
                        {!ehPeriodo && j.timeline && j.timeline.length > 0 && (
                          <button
                            onClick={() => setTrajetoExpandido(s => ({ ...s, [j.idMotorista]: !s[j.idMotorista] }))}
                            title="Ver onde cada evento da jornada aconteceu (GPS)"
                            style={{
                              border: "none", cursor: "pointer", fontSize: ".68rem", fontWeight: 700,
                              padding: "1px 7px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 3,
                              background: trajetoExpandido[j.idMotorista] ? "var(--success-bg)" : "var(--success-bg)",
                              color: "var(--success)",
                            }}>
                            <MapPin size={11} /> Trajeto {trajetoExpandido[j.idMotorista] ? "▲" : "▼"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "10px 8px", fontFamily: "monospace", fontWeight: 600, color: "var(--text-muted)" }}>
                      {j.placas.map(p => (
                        <span key={p} style={{ display: "inline-block", background: "var(--accent-soft)", color: "var(--accent)", padding: "2px 6px", borderRadius: 4, marginRight: 4, marginBottom: 2, fontSize: ".72rem" }}>
                          {p}
                        </span>
                      ))}
                    </td>
                    {ehPeriodo ? (
                      <td style={{ padding: "10px 8px", textAlign: "center", color: "var(--text)", fontWeight: 700 }}>{j.dias}</td>
                    ) : (
                      <>
                        <td style={{ padding: "10px 8px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatBR(j.inicio)}</td>
                        <td style={{ padding: "10px 8px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {j.encerrouJornada
                            ? formatBR(j.fim)
                            : (
                              <span title={`Última marcação: ${j.ultimoEventoTipo || '?'} às ${formatBR(j.fim)}. Motorista não bateu "Encerrar" no tablet.`}
                                    style={{ background: "var(--warning-bg)", color: "var(--warning)", padding: "2px 6px", borderRadius: 4, fontSize: ".72rem", fontWeight: 700, cursor: "help" }}>
                                ⏱ em andamento
                              </span>
                            )}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", whiteSpace: "nowrap" }}>
                          {j.quantidadeJornadas > 1 ? (
                            <button onClick={() => setCiclosExpandidos(s => ({ ...s, [j.idMotorista]: !s[j.idMotorista] }))}
                                    title="Motorista encerrou e reabriu jornada. Clique pra ver detalhes."
                                    style={{ background: "var(--warning-bg)", color: "var(--warning)", border: "none", padding: "2px 8px", borderRadius: 6, fontSize: ".72rem", fontWeight: 700, cursor: "pointer" }}>
                              {j.quantidadeJornadas}× {ciclosExpandidos[j.idMotorista] ? "▲" : "▼"}
                            </button>
                          ) : (
                            <span style={{ color: "var(--text-subtle)", fontFamily: "monospace" }}>{j.quantidadeJornadas || 1}</span>
                          )}
                        </td>
                      </>
                    )}
                    <Cell value={j.totalAtivo} min={j.totalAtivoMin} warn={!ehPeriodo && j.totalAtivoMin > 8 * 60} danger={!ehPeriodo && j.totalAtivoMin > 10 * 60} />
                    <Cell value={j.dirigindo} min={j.dirigindoMin} />
                    <Cell value={j.refeicao} min={j.refeicaoMin} danger={!ehPeriodo && j.refeicaoMin > 0 && j.refeicaoMin < 60} />
                    {!ehPeriodo ? (
                      <td style={{ padding: "10px 8px", textAlign: "center", fontFamily: "monospace", whiteSpace: "nowrap",
                          color: j.pausaDiariaSuficiente ? "var(--success)" : (j.pausaMin > 0 ? "var(--danger)" : "var(--text-subtle)"),
                          fontWeight: j.pausaDiariaSuficiente || j.pausaMin > 0 ? 700 : 400 }}
                          title={j.pausaDiariaSuficiente
                            ? `Pausa diária OK (mínimo 30min cumprido)`
                            : j.pausaMin > 0
                              ? `Faltam ${j.pausaFaltante} de pausa pra completar 30min no dia`
                              : `Sem pausa registrada hoje (precisa 30min)`}>
                        {j.pausa}{!j.pausaDiariaSuficiente && j.pausaMin > 0 && ` /−${j.pausaFaltante}`}
                      </td>
                    ) : <Cell value={j.pausa} min={j.pausaMin} />}
                    {j.tipoContrato === "px" ? (
                      <><td style={{ padding: "10px 8px", textAlign: "center", color: "var(--text-subtle)" }} title="PX é por contrato — não recebe hora extra">—</td>
                        <td style={{ padding: "10px 8px", textAlign: "center", color: "var(--text-subtle)" }} title="PX é por contrato — não recebe hora extra">—</td></>
                    ) : (
                      <><Cell value={j.extra50} min={j.extra50Min} warn={j.extra50Min > 0} highlight={j.extra50Min > 0} />
                        <Cell value={j.extra100} min={j.extra100Min} danger={j.extra100Min > 0} highlight={j.extra100Min > 0} /></>
                    )}
                    {!ehPeriodo && <Cell value={j.direcaoContinuaMaxima} min={j.direcaoContinuaMaximaMin} danger={j.direcaoContinuaMaximaMin > 4 * 60} />}
                    <td style={{ padding: "10px 8px", textAlign: "center", whiteSpace: "nowrap" }}>
                      {j.temInfracao ? (
                        <span title={j.infracoes.map(i => `${i.tipo}${i.data ? ' (' + formatDataBR(i.data) + ')' : ''}: ${i.descricao}`).join("\n")}
                              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--danger-bg)", color: "var(--danger)", padding: "2px 8px", borderRadius: 6, fontSize: ".72rem", fontWeight: 700, cursor: "help" }}>
                          <AlertTriangle size={12} color="var(--danger)" /> {j.infracoes.length} infração{j.infracoes.length > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--success-bg)", color: "var(--success)", padding: "2px 8px", borderRadius: 6, fontSize: ".72rem", fontWeight: 700 }}>
                          <Check size={12} color="var(--success)" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                  {!ehPeriodo && ciclosExpandidos[j.idMotorista] && j.ciclos && j.ciclos.length > 1 && (
                    <tr key={j.idMotorista + "-ciclos"}>
                      <td colSpan={13} style={{ padding: "6px 12px 12px", background: "var(--warning-bg)", borderBottom: "1px solid var(--warning-border)" }}>
                        <div style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--warning)", marginBottom: 6 }}>
                          Ciclos de jornada do motorista hoje ({j.ciclos.length})
                        </div>
                        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                        <table style={{ width: "100%", fontSize: ".78rem", borderCollapse: "collapse", minWidth: 560 }}>
                          <thead>
                            <tr style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                              <th style={{ padding: "4px 8px", textAlign: "left" }}>Ciclo</th>
                              <th style={{ padding: "4px 8px", textAlign: "left" }}>Início</th>
                              <th style={{ padding: "4px 8px", textAlign: "left" }}>Fim</th>
                              <th style={{ padding: "4px 8px", textAlign: "center" }}>Total</th>
                              <th style={{ padding: "4px 8px", textAlign: "center" }}>Dirigindo</th>
                              <th style={{ padding: "4px 8px", textAlign: "center" }}>Refeição</th>
                              <th style={{ padding: "4px 8px", textAlign: "center" }}>Pausa</th>
                              <th style={{ padding: "4px 8px", textAlign: "center" }}>Dir. contínua</th>
                              <th style={{ padding: "4px 8px", textAlign: "left" }}>Encerrou?</th>
                            </tr>
                          </thead>
                          <tbody>
                            {j.ciclos.map(c => (
                              <tr key={c.numero} style={{ borderBottom: "1px solid var(--warning-border)" }}>
                                <td style={{ padding: "4px 8px", fontWeight: 700, color: "var(--warning)" }}>#{c.numero}</td>
                                <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>{formatBR(c.inicio)}</td>
                                <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>{formatBR(c.fim)}</td>
                                <td style={{ padding: "4px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>{c.totalAtivo}</td>
                                <td style={{ padding: "4px 8px", textAlign: "center", fontFamily: "monospace" }}>{c.dirigindo}</td>
                                <td style={{ padding: "4px 8px", textAlign: "center", fontFamily: "monospace" }}>{c.refeicao}</td>
                                <td style={{ padding: "4px 8px", textAlign: "center", fontFamily: "monospace" }}>{c.pausa}</td>
                                <td style={{ padding: "4px 8px", textAlign: "center", fontFamily: "monospace", color: c.direcaoContinuaMaximaMin > 4*60 ? "var(--danger)" : "var(--text)" }}>{c.direcaoContinuaMaxima}</td>
                                <td style={{ padding: "4px 8px" }}>
                                  {c.encerrou
                                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--success-bg)", color: "var(--success)", padding: "1px 6px", borderRadius: 4, fontSize: ".7rem", fontWeight: 700 }}><Check size={12} color="var(--success)" /> Encerrou</span>
                                    : <span style={{ background: "var(--warning-bg)", color: "var(--warning)", padding: "1px 6px", borderRadius: 4, fontSize: ".7rem", fontWeight: 700 }}>⏱ em andamento</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!ehPeriodo && trajetoExpandido[j.idMotorista] && j.timeline && j.timeline.length > 0 && (
                    <tr key={j.idMotorista + "-trajeto"}>
                      <td colSpan={13} style={{ padding: "6px 12px 12px", background: "var(--success-bg)", borderBottom: "1px solid var(--success-border)" }}>
                        <div style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--success)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                          <MapPin size={13} /> Trajeto da jornada — onde cada evento aconteceu ({j.timeline.length})
                        </div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: ".78rem", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                                <th style={thTraj}>Hora</th>
                                <th style={thTraj}>Evento</th>
                                <th style={{ ...thTraj, textAlign: "center" }}>Duração</th>
                                <th style={thTraj}>Local</th>
                                <th style={{ ...thTraj, textAlign: "center" }}>Mapa</th>
                              </tr>
                            </thead>
                            <tbody>
                              {j.timeline.map((ev, idx) => {
                                const c = corEvento(ev.tipo);
                                return (
                                  <tr key={idx} style={{ borderBottom: "1px solid var(--success-border)" }}>
                                    <td style={{ padding: "4px 8px", fontFamily: "monospace", whiteSpace: "nowrap" }}>{formatBR(ev.hora)}</td>
                                    <td style={{ padding: "4px 8px" }}>
                                      <span style={{ background: c.bg, color: c.color, padding: "1px 7px", borderRadius: 4, fontSize: ".7rem", fontWeight: 700, whiteSpace: "nowrap" }}>{ev.tipo}</span>
                                    </td>
                                    <td style={{ padding: "4px 8px", textAlign: "center", fontFamily: "monospace", color: ev.duracaoMin > 0 ? "var(--text)" : "var(--text-subtle)" }}>{ev.duracaoMin > 0 ? ev.duracao : "—"}</td>
                                    <td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>
                                      {ev.cidade ? (
                                        <>
                                          <span style={{ fontWeight: 600 }}>{ev.cidade}{ev.uf ? `/${ev.uf}` : ""}</span>
                                          {ev.rua && <span style={{ color: "var(--text-subtle)" }}> · {ev.rua}</span>}
                                        </>
                                      ) : <span style={{ color: "var(--border-strong)" }}>sem endereço</span>}
                                    </td>
                                    <td style={{ padding: "4px 8px", textAlign: "center" }}>
                                      {ev.lat != null && ev.lng != null ? (
                                        <a href={`https://www.google.com/maps?q=${ev.lat},${ev.lng}`} target="_blank" rel="noopener noreferrer"
                                           style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--success)", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                                          <MapIcon size={13} /> ver
                                        </a>
                                      ) : <span style={{ color: "var(--border-strong)" }}>—</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legenda */}
        <div style={{ marginTop: 14, padding: 12, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: ".75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          <div><strong style={{ color: "var(--text)" }}>Regra Pontual:</strong></div>
          <div style={{ marginTop: 4 }}>
            <span style={pill("var(--accent-soft)", "var(--accent)")}>SEG–SEX</span> Jornada normal até <b>9h30</b> (8h trabalho + 1h almoço + 30min pausa). Acima: até +2h = <b>extra 50%</b>, restante = <b>extra 100% / infração</b>.
          </div>
          <div style={{ marginTop: 2 }}>
            <span style={pill("var(--warning-bg)", "var(--warning)")}>SÁBADO</span> Jornada normal até <b>4h</b>. Acima = <b>extra 50%</b>.
          </div>
          <div style={{ marginTop: 2 }}>
            <span style={pill("var(--danger-bg)", "var(--danger)")}>DOMINGO</span> Todo o tempo trabalhado é <b>extra 100%</b>.
          </div>
          <div style={{ marginTop: 6, color: "var(--text-muted)" }}>
            Base legal complementar: CLT art. 58/59/71 · Lei 13.103/2015 art. 67-C (direção contínua máx 5h30 sem pausa de 30min) · art. 235-C (jornada do motorista).
            Eventos vindos do tablet <strong>SasMDT</strong> da SASCAR — motorista precisa apertar Jornada → Dirigindo → Refeição → Encerrar.
            {ehPeriodo && <> Em período multi-dia, totais são <b>somados</b> por motorista; coluna "Dir. contínua" só aparece em vista diária.</>}
          </div>
        </div>

      </div>

      {/* Modal: motoristas que não iniciaram jornada no dia */}
      {mostrarNaoIniciaram && (
        <div
          onClick={() => setMostrarNaoIniciaram(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="modal-mobile-sheet"
            style={{ background: "var(--card-bg)", borderRadius: 12, width: "100%", maxWidth: 460, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
          >
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--accent)" }}><UserX size={20} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: "var(--text)", fontSize: "1rem" }}>Não iniciaram jornada</div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                  {formatDataBR(dataInicio)} · {naoIniciaram.length} de {totalCadastro} cadastrados
                </div>
              </div>
              <button onClick={() => setMostrarNaoIniciaram(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", fontSize: ".78rem", color: "var(--text-muted)", background: "var(--surface-2)" }}>
              Não bateram <b>"Jornada"</b> no tablet hoje. Confira quem está de folga e <b>lance a folga na SASCAR</b> manualmente.
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {naoIniciaram.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--success)", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%" }}>
                  <Check size={14} color="var(--success)" /> Todos os motoristas do cadastro iniciaram jornada.
                </div>
              ) : (
                naoIniciaram.map((m, i) => (
                  <div key={m.idMotorista} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ width: 22, textAlign: "right", color: "var(--text-subtle)", fontSize: ".75rem", fontFamily: "monospace" }}>{i + 1}</span>
                    <span style={{ flex: 1, fontWeight: 600, color: "var(--text)", fontSize: ".9rem" }}>{capitalizarNome(m.nome)}</span>
                    <span style={{ fontSize: ".68rem", color: "var(--text-muted)", fontFamily: "monospace" }}>ID {m.idMotorista}</span>
                    <button
                      onClick={() => marcarDesligado(m)}
                      disabled={marcandoDesligado === m.idMotorista}
                      title="Marcar como desligado — some da lista"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid var(--danger-border)",
                        background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 6, padding: "3px 8px",
                        fontSize: ".7rem", fontWeight: 700, cursor: "pointer",
                        opacity: marcandoDesligado === m.idMotorista ? 0.5 : 1, whiteSpace: "nowrap",
                      }}>
                      <UserMinus size={12} /> {marcandoDesligado === m.idMotorista ? "..." : "Desligado"}
                    </button>
                  </div>
                ))
              )}
            </div>

            {naoIniciaram.length > 0 && (
              <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    const txt = naoIniciaram.map(m => capitalizarNome(m.nome)).join("\n");
                    copiarTexto(txt).then(ok => {
                      if (ok) { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
                    });
                  }}
                  style={{ ...btnGhost, background: copiado ? "var(--success-bg)" : "var(--card-bg)", color: copiado ? "var(--success)" : "var(--text)", borderColor: copiado ? "var(--success-border)" : "var(--border-strong)" }}
                >
                  {copiado ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copiado ? "Copiado!" : "Copiar lista"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: motoristas que não encerraram a jornada */}
      {mostrarNaoEncerrou && (
        <div
          onClick={() => setMostrarNaoEncerrou(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="modal-mobile-sheet"
            style={{ background: "var(--card-bg)", borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
          >
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--warning)" }}><AlertTriangle size={20} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: "var(--text)", fontSize: "1rem" }}>Não encerraram a jornada</div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                  {formatDataBR(dataInicio)} · {naoEncerrados.length} motorista(s) · ordenado por mais tempo aberto
                </div>
              </div>
              <button onClick={() => setMostrarNaoEncerrou(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", fontSize: ".78rem", color: "var(--text-muted)", background: "var(--warning-bg)" }}>
              Não bateram <b>"Encerrar"</b> no tablet. Cobre o motorista pra fechar — sem isso a HE do dia fica em aberto.
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {naoEncerrados.map((j, i) => (
                <div key={j.idMotorista} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ width: 22, textAlign: "right", color: "var(--text-subtle)", fontSize: ".75rem", fontFamily: "monospace" }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--text)", fontSize: ".9rem" }}>{capitalizarNome(j.nomeMotorista)}</div>
                    <div style={{ fontSize: ".7rem", color: "var(--text-muted)" }}>
                      Início {formatBR(j.inicio)} · último: {j.ultimoEventoTipo || "?"}
                    </div>
                  </div>
                  <span title="Tempo desde a última marcação no tablet"
                        style={{ background: (j.abertaHaMin ?? 0) >= 120 ? "var(--danger-bg)" : "var(--warning-bg)",
                          color: (j.abertaHaMin ?? 0) >= 120 ? "var(--danger)" : "var(--warning)",
                          padding: "2px 8px", borderRadius: 6, fontSize: ".72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                    aberta há {fmtDuracaoMin(j.abertaHaMin)}
                  </span>
                </div>
              ))}
            </div>

            {naoEncerrados.length > 0 && (
              <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    const txt = naoEncerrados.map(j => `${capitalizarNome(j.nomeMotorista)} — aberta há ${fmtDuracaoMin(j.abertaHaMin)}`).join("\n");
                    copiarTexto(txt).then(ok => {
                      if (ok) { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
                    });
                  }}
                  style={{ ...btnGhost, background: copiado ? "var(--success-bg)" : "var(--card-bg)", color: copiado ? "var(--success)" : "var(--text)", borderColor: copiado ? "var(--success-border)" : "var(--border-strong)" }}
                >
                  {copiado ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copiado ? "Copiado!" : "Copiar lista"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, right, title }) {
  return (
    <th title={title} style={{
      padding: "10px 8px",
      textAlign: right ? "center" : "left",
      fontSize: ".72rem",
      color: "var(--text-muted)",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: ".5px",
      whiteSpace: "nowrap",
    }}>{children}</th>
  );
}

function Kpi({ label, value, color, icon, sub, onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? "var(--warning-bg)" : "var(--card-bg)",
        border: `1px solid ${active ? color : "var(--border)"}`,
        borderRadius: 10,
        padding: "12px 14px",
        cursor: onClick ? "pointer" : "default",
        transition: "all .15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: ".75rem", fontWeight: 600 }}>
        <span style={{ color }}>{icon}</span> {label}
      </div>
      <div style={{ marginTop: 4, fontSize: "1.5rem", fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ marginTop: 2, fontSize: ".7rem", color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

const btnGhost = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "var(--card-bg)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: ".85rem",
  fontWeight: 600,
  color: "var(--text)",
};

const btnPreset = {
  border: "1px solid var(--border-strong)",
  borderRadius: 6,
  padding: "5px 10px",
  cursor: "pointer",
  fontSize: ".8rem",
  fontWeight: 600,
};

const inputDate = {
  border: "1px solid var(--border-strong)",
  borderRadius: 6,
  padding: "5px 8px",
  fontSize: ".82rem",
  outline: "none",
  background: "var(--card-bg)",
  color: "var(--text)",
};

function pill(bg, color) {
  return {
    display: "inline-block",
    background: bg,
    color,
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: ".68rem",
    fontWeight: 700,
    marginRight: 6,
    letterSpacing: ".3px",
  };
}

const thTraj = {
  padding: "4px 8px",
  textAlign: "left",
  fontSize: ".68rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".3px",
  whiteSpace: "nowrap",
};

// Cor do badge por tipo de evento de tempo-direção (trajeto da jornada)
function corEvento(tipo) {
  const t = (tipo || "").toLowerCase();
  if (t.includes("dirigindo")) return { bg: "var(--success-bg)", color: "var(--success)" };
  if (t.includes("jornada"))   return { bg: "var(--accent-soft)", color: "var(--accent)" };
  if (t.includes("refei"))     return { bg: "var(--warning-bg)", color: "var(--warning)" };
  if (t.includes("pausa"))     return { bg: "var(--warning-bg)", color: "var(--warning)" };
  if (t.includes("encerrar"))  return { bg: "var(--danger-bg)", color: "var(--danger)" };
  if (t.includes("parada"))    return { bg: "var(--border)", color: "var(--text-muted)" };
  if (t.includes("espera"))    return { bg: "var(--surface-3)", color: "var(--text-muted)" };
  return { bg: "var(--surface-3)", color: "var(--text-muted)" };
}
