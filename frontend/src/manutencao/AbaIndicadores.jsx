// AbaIndicadores — dois painéis estratégicos:
// 1. Preventiva x Corretiva — gasto por tipo (últimos 12 meses)
// 2. Disponibilidade da frota — % tempo disponível vs em manutenção (últimos 30 dias)
//
// Heurísticas (defaults que a user pode ajustar depois):
// PREVENTIVA: tipoServico contém óleo|revisão|preventiva|inspeção|lubrificação|calibragem|
//             engraxe|alinhamento|balanceamento|lavagem|checklist|filtro|troca de
// CORRETIVA: tudo o resto (reparo, quebra, defeito, emergencial, etc)

import { useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Truck, Clock, TrendingUp, TrendingDown } from "lucide-react";

const fmtBRL = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v, casas = 1) => Number(v || 0).toFixed(casas) + "%";

function parseMs(x) {
  if (!x) return null;
  if (typeof x === "object" && typeof x.toMillis === "function") return x.toMillis();
  const ms = Date.parse(x);
  return Number.isFinite(ms) ? ms : null;
}

// Regex heurística — preventiva se bater qualquer termo, senão corretiva
const REGEX_PREVENTIVA = /óleo|oleo|revis|preventiva|inspe|lubrifica|calibra|engraxe|alinh|balanc|lavagem|checklist|filtro|troca de|manuten.{0,5}preventiva/i;
function classificarOS(tipoServico) {
  return REGEX_PREVENTIVA.test(String(tipoServico || "")) ? "preventiva" : "corretiva";
}

export default function AbaIndicadores({ veiculos = [], ordensServico = [], lancamentos = [] }) {
  const [subInd, setSubInd] = useState("prev-corr"); // prev-corr | disponibilidade

  // ═══ INDICADOR 1: PREVENTIVA x CORRETIVA (últimos 12 meses) ═══
  const prevCorr = useMemo(() => {
    const AGORA = Date.now();
    const CORTE = AGORA - 12 * 30 * 86400000;
    const buckets = {
      preventiva: { gasto: 0, os: 0 },
      corretiva:  { gasto: 0, os: 0 },
    };
    ordensServico.filter(o => o.status === "finalizada").forEach(o => {
      const ts = parseMs(o.finalizadaEm || o.criadoEm || o.dataHora);
      if (!ts || ts < CORTE) return;
      const cat = classificarOS(o.tipoServico);
      buckets[cat].gasto += Number(o.valorTotal) || 0;
      buckets[cat].os += 1;
    });
    (lancamentos || []).forEach(l => {
      const ts = parseMs(l.data || l.criadoEm);
      if (!ts || ts < CORTE) return;
      const cat = classificarOS(l.tipoLancamento || l.tipoServico);
      buckets[cat].gasto += Number(l.valorTotal || l.valor) || 0;
      buckets[cat].os += 1;
    });
    const total = buckets.preventiva.gasto + buckets.corretiva.gasto;
    const totalOS = buckets.preventiva.os + buckets.corretiva.os;
    return {
      preventiva: {
        ...buckets.preventiva,
        pct: total > 0 ? (buckets.preventiva.gasto / total) * 100 : 0,
        pctOS: totalOS > 0 ? (buckets.preventiva.os / totalOS) * 100 : 0,
        ticketMedio: buckets.preventiva.os > 0 ? buckets.preventiva.gasto / buckets.preventiva.os : 0,
      },
      corretiva: {
        ...buckets.corretiva,
        pct: total > 0 ? (buckets.corretiva.gasto / total) * 100 : 0,
        pctOS: totalOS > 0 ? (buckets.corretiva.os / totalOS) * 100 : 0,
        ticketMedio: buckets.corretiva.os > 0 ? buckets.corretiva.gasto / buckets.corretiva.os : 0,
      },
      total, totalOS,
    };
  }, [ordensServico, lancamentos]);

  // ═══ INDICADOR 2: DISPONIBILIDADE DA FROTA (últimos 30 dias) ═══
  const disponibilidade = useMemo(() => {
    const AGORA = Date.now();
    const JANELA_MS = 30 * 86400000;
    const CORTE = AGORA - JANELA_MS;
    // Pra cada placa: soma tempo em manutenção (dias) no período
    const porPlaca = new Map();
    ordensServico.forEach(o => {
      if (!o.placa) return;
      const inicio = parseMs(o.criadoEm || o.dataHora);
      if (!inicio) return;
      // fim = data finalizada OU hoje (se ainda aberta)
      const fim = o.status === "finalizada" ? parseMs(o.finalizadaEm) : AGORA;
      if (!fim || fim <= inicio) return;
      // recorta pra janela de 30 dias
      const inicioNaJanela = Math.max(inicio, CORTE);
      const fimNaJanela = Math.min(fim, AGORA);
      if (fimNaJanela <= inicioNaJanela) return;
      const msNaJanela = fimNaJanela - inicioNaJanela;
      const cur = porPlaca.get(o.placa) || { placa: o.placa, msManut: 0, osCount: 0 };
      cur.msManut += msNaJanela;
      cur.osCount += 1;
      porPlaca.set(o.placa, cur);
    });
    // Monta linhas — INCLUI veículos sem OS (100% disponíveis)
    const linhas = veiculos
      .filter(v => v.tipo !== "carreta") // só cavalos rastreados (OS bloqueia cavalo)
      .map(v => {
        const d = porPlaca.get(v.placa) || { placa: v.placa, msManut: 0, osCount: 0 };
        const diasManut = d.msManut / 86400000;
        const disponibilidade = Math.max(0, Math.min(100, 100 - (diasManut / 30) * 100));
        return {
          placa: v.placa,
          modelo: v.modelo || "",
          osCount: d.osCount,
          diasManut,
          disponibilidade,
        };
      });
    linhas.sort((a, b) => a.disponibilidade - b.disponibilidade); // pior primeiro

    const mediaFrota = linhas.length > 0
      ? linhas.reduce((s, l) => s + l.disponibilidade, 0) / linhas.length
      : 100;
    const emManutAgora = ordensServico.filter(o => o.status !== "finalizada").length;

    return { linhas, mediaFrota, emManutAgora, totalCavalos: linhas.length };
  }, [ordensServico, veiculos]);

  const S = {
    wrap: { padding: 20, display: "flex", flexDirection: "column", gap: 16 },
    subtabs: { display: "flex", gap: 4, background: "var(--surface-2)", padding: 4, borderRadius: 10, alignSelf: "flex-start" },
    subtab: (ativo, cor) => ({
      padding: "8px 16px", borderRadius: 8, border: "none",
      background: ativo ? "var(--card-bg)" : "transparent",
      color: ativo ? cor : "var(--text-muted)",
      boxShadow: ativo ? "0 1px 3px rgba(15,23,42,.1)" : "none",
      fontWeight: 700, fontSize: ".84rem", cursor: "pointer", fontFamily: "inherit",
    }),
    card: { background: "var(--card-bg)", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,.06)" },
    kpi: (cor, bg) => ({ background: bg, borderRadius: 10, padding: 14, border: `1px solid var(--border)` }),
    kpiN: (cor) => ({ fontSize: "1.8rem", fontWeight: 800, color: cor, lineHeight: 1 }),
    kpiL: (cor) => ({ fontSize: ".72rem", fontWeight: 700, color: cor, textTransform: "uppercase", marginTop: 4 }),
    barra: (pct, cor) => ({ height: 10, borderRadius: 5, background: cor, width: `${pct}%`, transition: "width .3s" }),
    barraWrap: { height: 10, borderRadius: 5, background: "var(--surface-2)", overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: ".88rem" },
    th: { padding: "9px 12px", fontSize: ".72rem", fontWeight: 600, color: "var(--text-muted)", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", textAlign: "left" },
    td: { padding: "10px 12px", fontSize: ".85rem", borderBottom: "1px solid var(--surface-2)" },
  };

  return (
    <div style={S.wrap}>
      <div style={S.subtabs}>
        <button style={S.subtab(subInd === "prev-corr", "var(--chart-6)")} onClick={() => setSubInd("prev-corr")}>
          Preventiva x Corretiva
        </button>
        <button style={S.subtab(subInd === "disponibilidade", "var(--tech)")} onClick={() => setSubInd("disponibilidade")}>
          Disponibilidade da Frota
        </button>
      </div>

      {subInd === "prev-corr" && (
        <>
          <div style={{ background: "#f3e8ff", border: "1px solid #d8b4fe", borderRadius: 10, padding: "10px 14px", fontSize: ".82rem", color: "#5b21b6" }}>
            <strong>Últimos 12 meses.</strong> Classificação por nome do serviço:
            <strong> Preventiva</strong> = óleo, revisão, inspeção, lubrificação, calibragem, engraxe, alinhamento, balanceamento, lavagem, filtros, troca de.
            <strong> Corretiva</strong> = tudo o resto (reparos, quebras, emergencial).
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Card Preventiva */}
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={18} color="var(--success)" />
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>Preventiva</span>
                </div>
                <span style={{ background: "var(--success-bg)", color: "var(--success)", fontWeight: 700, fontSize: ".78rem", padding: "3px 10px", borderRadius: 999 }}>
                  {fmtPct(prevCorr.preventiva.pct)}
                </span>
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--success)" }}>{fmtBRL(prevCorr.preventiva.gasto)}</div>
              <div style={{ fontSize: ".78rem", color: "var(--text-muted)", marginTop: 4 }}>
                {prevCorr.preventiva.os} OS · ticket médio {fmtBRL(prevCorr.preventiva.ticketMedio)}
              </div>
              <div style={{ ...S.barraWrap, marginTop: 12 }}>
                <div style={S.barra(prevCorr.preventiva.pct, "var(--success)")} />
              </div>
            </div>

            {/* Card Corretiva */}
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={18} color="var(--danger)" />
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>Corretiva</span>
                </div>
                <span style={{ background: "var(--danger-bg)", color: "var(--danger)", fontWeight: 700, fontSize: ".78rem", padding: "3px 10px", borderRadius: 999 }}>
                  {fmtPct(prevCorr.corretiva.pct)}
                </span>
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)" }}>{fmtBRL(prevCorr.corretiva.gasto)}</div>
              <div style={{ fontSize: ".78rem", color: "var(--text-muted)", marginTop: 4 }}>
                {prevCorr.corretiva.os} OS · ticket médio {fmtBRL(prevCorr.corretiva.ticketMedio)}
              </div>
              <div style={{ ...S.barraWrap, marginTop: 12 }}>
                <div style={S.barra(prevCorr.corretiva.pct, "var(--danger)")} />
              </div>
            </div>
          </div>

          <div style={S.card}>
            <div style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Como interpretar</div>
            <div style={{ fontSize: ".82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Meta ideal: <strong>70% preventiva / 30% corretiva.</strong> Preventiva evita quebra + custa 3-5x menos que corretiva (que envolve guincho, veículo parado, urgência).
              {prevCorr.corretiva.pct > 50 && (
                <div style={{ background: "var(--danger-bg)", color: "#991b1b", padding: 8, borderRadius: 6, marginTop: 8 }}>
                  Alerta: mais de metade do gasto é corretiva ({fmtPct(prevCorr.corretiva.pct)}). Aumentar preventiva reduz custo total.
                </div>
              )}
              {prevCorr.preventiva.pct >= 70 && (
                <div style={{ background: "var(--success-bg)", color: "#166534", padding: 8, borderRadius: 6, marginTop: 8 }}>
                  Excelente — preventiva acima de 70%. Segue assim.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {subInd === "disponibilidade" && (
        <>
          <div style={{ background: "#cffafe", border: "1px solid #67e8f9", borderRadius: 10, padding: "10px 14px", fontSize: ".82rem", color: "#155e75" }}>
            <strong>Últimos 30 dias.</strong> Disponibilidade = 100% − (dias em manutenção / 30) × 100.
            Considera OS finalizadas (do abrir ao finalizar) + OS ainda abertas (do abrir até hoje).
            Só cavalos (carreta não bloqueia por OS).
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <div style={S.kpi("var(--tech)", "#cffafe")}>
              <div style={S.kpiN("var(--tech)")}>{fmtPct(disponibilidade.mediaFrota)}</div>
              <div style={S.kpiL("var(--tech)")}>Média da frota</div>
            </div>
            <div style={S.kpi("var(--text)", "var(--surface-2)")}>
              <div style={S.kpiN("var(--text)")}>{disponibilidade.totalCavalos}</div>
              <div style={S.kpiL("var(--text)")}>Cavalos monitorados</div>
            </div>
            <div style={S.kpi("var(--danger)", "var(--danger-bg)")}>
              <div style={S.kpiN("var(--danger)")}>{disponibilidade.emManutAgora}</div>
              <div style={S.kpiL("var(--danger)")}>Em manutenção agora</div>
            </div>
            <div style={S.kpi("var(--success)", "var(--success-bg)")}>
              <div style={S.kpiN("var(--success)")}>{disponibilidade.linhas.filter(l => l.disponibilidade === 100).length}</div>
              <div style={S.kpiL("var(--success)")}>Com 100% disponibilidade</div>
            </div>
          </div>

          <div style={S.card}>
            <div style={{ fontSize: ".95rem", fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
              Ranking por veículo (piores primeiro)
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Placa</th>
                    <th style={S.th}>Modelo</th>
                    <th style={S.th}>OS no período</th>
                    <th style={S.th}>Dias em manut.</th>
                    <th style={S.th}>Disponibilidade</th>
                    <th style={S.th}>Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {disponibilidade.linhas.length === 0 ? (
                    <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", color: "var(--text-subtle)", padding: 30 }}>Sem veículos cadastrados.</td></tr>
                  ) : disponibilidade.linhas.map(l => {
                    const critico = l.disponibilidade < 80;
                    const atencao = l.disponibilidade >= 80 && l.disponibilidade < 95;
                    const cor = critico ? "var(--danger)" : atencao ? "var(--warning)" : "var(--success)";
                    const bg = critico ? "var(--danger-bg)" : atencao ? "var(--warning-bg)" : "var(--success-bg)";
                    return (
                      <tr key={l.placa}>
                        <td style={{ ...S.td, fontWeight: 700 }}>{l.placa}</td>
                        <td style={S.td}>{l.modelo || "—"}</td>
                        <td style={S.td}>{l.osCount}</td>
                        <td style={S.td}>{l.diasManut.toFixed(1)} dias</td>
                        <td style={{ ...S.td, fontWeight: 700, color: cor }}>{fmtPct(l.disponibilidade)}</td>
                        <td style={S.td}>
                          <div style={{ ...S.barraWrap, minWidth: 100 }}>
                            <div style={S.barra(l.disponibilidade, cor)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
