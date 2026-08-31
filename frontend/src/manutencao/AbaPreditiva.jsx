// AbaPreditiva — previsão de próxima manutenção baseada em histórico
// Algoritmo: pra cada tipo de manutenção mesma placa, calcula intervalo médio
// (dias E km) entre ocorrências passadas. Última + intervalo = previsão.
//
// NOTA: é regressão estatística simples (média móvel), NÃO ML de verdade.
// Suficiente pra MVP. Upgrade futuro pode usar auto-sklearn ou OpenAI.

import { useState, useMemo } from "react";
import { Brain, TrendingUp, AlertCircle, CheckCircle2, Truck } from "lucide-react";

const fmtBRL = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDataBR = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
};

function parseMs(x) {
  if (!x) return null;
  if (typeof x === "object" && x.toMillis) return x.toMillis();
  const ms = Date.parse(x);
  return Number.isFinite(ms) ? ms : null;
}

export default function AbaPreditiva({ veiculos = [], ordensServico = [], odometroDe }) {
  const [placaFiltro, setPlacaFiltro] = useState("");

  const previsoes = useMemo(() => {
    const HOJE = Date.now();
    // Agrupa OS finalizadas por (placa, tipoServico)
    const grupos = new Map();
    ordensServico.filter(o => o.status === "finalizada" && o.placa && o.tipoServico).forEach(o => {
      const key = `${o.placa}||${o.tipoServico}`;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key).push(o);
    });

    const result = [];
    for (const [key, oss] of grupos) {
      const [placa, tipo] = key.split("||");
      if (placaFiltro && placa !== placaFiltro) continue;
      if (oss.length < 2) continue; // precisa histórico

      const ordenadas = [...oss]
        .map(o => ({ ...o, ms: parseMs(o.finalizadaEm || o.criadoEm), km: Number(o.hodometroSaida ?? o.hodometro) || null }))
        .filter(o => o.ms)
        .sort((a, b) => a.ms - b.ms);

      if (ordenadas.length < 2) continue;

      // Intervalo médio dias
      const gapsDias = [];
      for (let i = 1; i < ordenadas.length; i++) {
        gapsDias.push((ordenadas[i].ms - ordenadas[i-1].ms) / 86400000);
      }
      const mediaGapDias = gapsDias.reduce((s, g) => s + g, 0) / gapsDias.length;

      // Intervalo médio KM (se disponível)
      const gapsKm = [];
      for (let i = 1; i < ordenadas.length; i++) {
        if (ordenadas[i-1].km && ordenadas[i].km && ordenadas[i].km > ordenadas[i-1].km) {
          gapsKm.push(ordenadas[i].km - ordenadas[i-1].km);
        }
      }
      const mediaGapKm = gapsKm.length > 0 ? gapsKm.reduce((s, g) => s + g, 0) / gapsKm.length : null;

      const ultima = ordenadas[ordenadas.length - 1];
      const proxMs = ultima.ms + mediaGapDias * 86400000;
      const diasAte = Math.floor((proxMs - HOJE) / 86400000);
      const proxKm = ultima.km && mediaGapKm ? Math.round(ultima.km + mediaGapKm) : null;
      const kmAtual = Number(odometroDe?.(placa)?.km) || null;
      const kmAte = proxKm && kmAtual ? proxKm - kmAtual : null;

      // Confiança baseado no número de amostras e desvio
      const desvio = Math.sqrt(gapsDias.reduce((s, g) => s + (g - mediaGapDias) ** 2, 0) / gapsDias.length);
      const coefVariacao = mediaGapDias > 0 ? desvio / mediaGapDias : 1;
      let confianca;
      if (ordenadas.length >= 5 && coefVariacao < 0.3) confianca = "alta";
      else if (ordenadas.length >= 3 && coefVariacao < 0.5) confianca = "média";
      else confianca = "baixa";

      // Custo médio
      const gastoMedio = ordenadas.reduce((s, o) => s + (Number(o.valorTotal) || 0), 0) / ordenadas.length;

      result.push({
        placa, tipo,
        ocorrencias: ordenadas.length,
        ultima: new Date(ultima.ms).toISOString(),
        mediaGapDias: Math.round(mediaGapDias),
        mediaGapKm: mediaGapKm ? Math.round(mediaGapKm) : null,
        proxima: new Date(proxMs).toISOString(),
        diasAte,
        proxKm, kmAte,
        confianca,
        gastoMedio,
      });
    }

    // Ordena por urgência (menos dias até próxima)
    return result.sort((a, b) => a.diasAte - b.diasAte);
  }, [ordensServico, odometroDe, placaFiltro]);

  const kpi = useMemo(() => {
    const vencidas = previsoes.filter(p => p.diasAte < 0).length;
    const proxSemana = previsoes.filter(p => p.diasAte >= 0 && p.diasAte <= 7).length;
    const gastoPrevisto30d = previsoes.filter(p => p.diasAte <= 30).reduce((s, p) => s + p.gastoMedio, 0);
    return { total: previsoes.length, vencidas, proxSemana, gastoPrevisto30d };
  }, [previsoes]);

  const S = {
    wrap: { padding: 20, display: "flex", flexDirection: "column", gap: 16 },
    kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 },
    kpiCard: (cor, bg) => ({ background: bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${cor}` }),
    kpiN: (cor) => ({ fontSize: "1.5rem", fontWeight: 800, color: cor }),
    kpiL: (cor) => ({ fontSize: ".72rem", fontWeight: 700, color: cor, textTransform: "uppercase" }),
    input: { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", fontSize: ".88rem" },
    table: { width: "100%", borderCollapse: "collapse", background: "var(--card-bg)", fontSize: ".88rem", borderRadius: 10, overflow: "hidden" },
    th: { padding: "9px 12px", fontSize: ".72rem", fontWeight: 600, color: "var(--text-muted)", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", textAlign: "left" },
    td: { padding: "10px 12px", fontSize: ".85rem", borderBottom: "1px solid var(--surface-2)" },
  };

  return (
    <div style={S.wrap}>
      <div style={{ background: "#f3e8ff", border: "1px solid #d8b4fe", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Brain size={20} color="var(--chart-6)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: ".85rem", color: "#5b21b6" }}>
          <strong>Previsão baseada em histórico:</strong> pra cada tipo de manutenção com 2+ ocorrências,
          calcula o intervalo médio (dias e KM) entre trocas passadas e prevê a próxima.
          Quanto mais dados históricos, maior a confiança. Precisão melhora com o tempo de uso.
        </div>
      </div>

      <div style={S.kpiRow}>
        <div style={S.kpiCard("var(--text)", "var(--surface-2)")}><div style={S.kpiN("var(--text)")}>{kpi.total}</div><div style={S.kpiL("var(--text)")}>Previsões geradas</div></div>
        <div style={S.kpiCard("var(--danger)", "var(--danger-bg)")}><div style={S.kpiN("var(--danger)")}>{kpi.vencidas}</div><div style={S.kpiL("var(--danger)")}>Já venceram</div></div>
        <div style={S.kpiCard("var(--warning)", "var(--warning-bg)")}><div style={S.kpiN("var(--warning)")}>{kpi.proxSemana}</div><div style={S.kpiL("var(--warning)")}>Próx. 7 dias</div></div>
        <div style={S.kpiCard("var(--info)", "var(--info-bg)")}><div style={S.kpiN("var(--info)")}>{fmtBRL(kpi.gastoPrevisto30d)}</div><div style={S.kpiL("var(--info)")}>Gasto previsto 30d</div></div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", background: "var(--card-bg)", padding: 10, borderRadius: 10, border: "1px solid var(--border)" }}>
        <Truck size={16} color="var(--text-muted)" />
        <select style={S.input} value={placaFiltro} onChange={e => setPlacaFiltro(e.target.value)}>
          <option value="">Todas as placas</option>
          {veiculos.map(v => <option key={v.id} value={v.placa}>{v.placa}</option>)}
        </select>
        <span style={{ fontSize: ".78rem", color: "var(--text-muted)", marginLeft: "auto" }}>{previsoes.length} previsão(ões)</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Placa</th>
              <th style={S.th}>Tipo</th>
              <th style={S.th}>Última</th>
              <th style={S.th}>Média dias</th>
              <th style={S.th}>Média KM</th>
              <th style={S.th}>Próxima prevista</th>
              <th style={S.th}>Faltam</th>
              <th style={S.th}>Confiança</th>
              <th style={S.th}>Custo médio</th>
            </tr>
          </thead>
          <tbody>
            {previsoes.length === 0 ? (
              <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: "var(--text-subtle)", padding: 30 }}>
                Nada previsível ainda. Precisa 2+ OS finalizadas do mesmo tipo na mesma placa.
              </td></tr>
            ) : previsoes.map((p, i) => {
              const vencida = p.diasAte < 0;
              const proxima = p.diasAte >= 0 && p.diasAte <= 7;
              const cor = vencida ? "var(--danger)" : proxima ? "var(--warning)" : "var(--success)";
              const bg = vencida ? "var(--danger-bg)" : proxima ? "var(--warning-bg)" : "var(--success-bg)";
              const confBg = { alta: "var(--success-bg)", "média": "var(--warning-bg)", baixa: "var(--danger-bg)" }[p.confianca];
              const confColor = { alta: "var(--success)", "média": "var(--warning)", baixa: "var(--danger)" }[p.confianca];
              return (
                <tr key={i}>
                  <td style={{ ...S.td, fontWeight: 700 }}>{p.placa}</td>
                  <td style={S.td}>{p.tipo}</td>
                  <td style={S.td}>{fmtDataBR(p.ultima)} <span style={{ color: "var(--text-subtle)", fontSize: ".72rem" }}>({p.ocorrencias}×)</span></td>
                  <td style={S.td}>{p.mediaGapDias}d</td>
                  <td style={S.td}>{p.mediaGapKm ? `${p.mediaGapKm.toLocaleString("pt-BR")} km` : "—"}</td>
                  <td style={S.td}>{fmtDataBR(p.proxima)}</td>
                  <td style={S.td}>
                    <span style={{ background: bg, color: cor, padding: "3px 8px", borderRadius: 999, fontSize: ".78rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {vencida ? <AlertCircle size={12} /> : proxima ? <TrendingUp size={12} /> : <CheckCircle2 size={12} />}
                      {vencida ? `${-p.diasAte}d vencido` : `${p.diasAte}d`}
                    </span>
                    {p.kmAte != null && (
                      <div style={{ fontSize: ".7rem", color: "var(--text-muted)", marginTop: 2 }}>
                        ou {p.kmAte > 0 ? `${p.kmAte.toLocaleString("pt-BR")} km` : "KM já passou"}
                      </div>
                    )}
                  </td>
                  <td style={S.td}>
                    <span style={{ background: confBg, color: confColor, padding: "3px 8px", borderRadius: 4, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase" }}>{p.confianca}</span>
                  </td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{fmtBRL(p.gastoMedio)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
