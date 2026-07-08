import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Package, TrendingUp, AlertTriangle, Layers, Award, Truck } from "lucide-react";
import { VIDAS, STATUS_PNEU } from "./esquemas";

const fmtBRL = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtBRLcurto = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1000)    return `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return fmtBRL(v);
};
const nomeMes = (m) => ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][m];

const PALETA = ["#1d4ed8","#15803d","#b45309","#dc2626","#7c3aed","#0891b2","#db2777","#65a30d","#c2410c","#0284c7","#9333ea","#059669"];
const CORES_STATUS = { estoque: "#059669", em_uso: "#1d4ed8", recapagem: "#b45309", sucata: "#64748b" };

const s = {
  info: { background: "#dbeafe", border: "1px solid #93c5fd", color: "#1e40af", padding: "10px 14px", borderRadius: 8, fontSize: ".82rem", fontWeight: 600, marginBottom: 14 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 },
  kpiCard: (bg, color) => ({ background: bg, borderRadius: 12, padding: "14px 18px", color, boxShadow: "0 1px 3px rgba(15,23,42,.05), 0 8px 24px -16px rgba(15,23,42,.10)" }),
  kpiLbl: { fontSize: ".72rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, opacity: 0.85, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 },
  kpiVal: { fontSize: "1.4rem", fontWeight: 800, lineHeight: 1.1 },
  kpiSub: { fontSize: ".72rem", opacity: 0.8, marginTop: 4 },

  section: { background: "#fff", borderRadius: 12, padding: "1.15rem 1.35rem", border: "1px solid #e2e8f0", marginBottom: 16, boxShadow: "0 1px 3px rgba(15,23,42,.05), 0 8px 24px -16px rgba(15,23,42,.10)" },
  h3: { margin: "0 0 12px", color: "#1a3a5c", fontSize: "0.95rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8 },
  gridRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 12, marginBottom: 16 },

  vazio: { padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: ".85rem" },

  tabela: { width: "100%", borderCollapse: "collapse", fontSize: ".85rem" },
  th: { textAlign: "left", padding: "8px 10px", background: "#f8fafc", color: "#475569", fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e2e8f0" },
  td: { padding: "8px 10px", borderBottom: "1px solid #f1f5f9", color: "#334155" },
};

export default function AbaDashboard({ pneus }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLoading(false); }, []);

  const analytics = useMemo(() => {
    // ── KPIs base ──
    const total = pneus.length;
    const porStatus = { estoque: 0, em_uso: 0, recapagem: 0, sucata: 0 };
    for (const p of pneus) porStatus[p.status] = (porStatus[p.status] || 0) + 1;

    let custoTotal = 0;
    let custoRecapTotal = 0;
    let criticos = 0;
    for (const p of pneus) {
      custoTotal += Number(p.custoAquisicao) || 0;
      for (const r of (p.historicoRecapagens || [])) {
        custoRecapTotal += Number(r.custoReal) || 0;
      }
      if (Number(p.sulcoAtual) > 0 && Number(p.sulcoAtual) < 3) criticos++;
    }
    const custoGrandTotal = custoTotal + custoRecapTotal;

    // ── Por marca ──
    const porMarca = {};
    for (const p of pneus) {
      const m = p.marca || "Sem marca";
      const custo = (Number(p.custoAquisicao) || 0) + (p.historicoRecapagens || []).reduce((s, r) => s + (Number(r.custoReal) || 0), 0);
      if (!porMarca[m]) porMarca[m] = { marca: m, custo: 0, qtd: 0 };
      porMarca[m].custo += custo;
      porMarca[m].qtd   += 1;
    }
    const marcasRanking = Object.values(porMarca).sort((a, b) => b.custo - a.custo);

    // ── Por vida ──
    const porVida = {};
    for (const p of pneus) {
      const v = p.vida || "novo";
      const label = VIDAS.find(x => x.id === v)?.label || v;
      porVida[label] = (porVida[label] || 0) + 1;
    }
    const dadosPizzaVida = Object.entries(porVida).map(([name, value]) => ({ name, value }));

    // ── Status frota (pizza) ──
    const dadosPizzaStatus = Object.entries(porStatus)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({
        name: STATUS_PNEU.find(s => s.id === k)?.label || k,
        value: v,
        cor: CORES_STATUS[k] || "#94a3b8",
      }));

    // ── Ranking fornecedores ──
    const porForn = {};
    for (const p of pneus) {
      const f = p.fornecedor || "Sem fornecedor";
      const custo = Number(p.custoAquisicao) || 0;
      if (!porForn[f]) porForn[f] = { fornecedor: f, custo: 0, qtd: 0, cnpj: p.fornecedorCnpj || "" };
      porForn[f].custo += custo;
      porForn[f].qtd   += 1;
    }
    // Recapadoras
    for (const p of pneus) {
      for (const r of (p.historicoRecapagens || [])) {
        const f = r.fornecedor || "Sem recapadora";
        const custo = Number(r.custoReal) || 0;
        if (!porForn[f]) porForn[f] = { fornecedor: f, custo: 0, qtd: 0, cnpj: r.cnpj || "" };
        porForn[f].custo += custo;
      }
    }
    const fornRanking = Object.values(porForn).sort((a, b) => b.custo - a.custo).slice(0, 10);

    // ── Custo mensal últimos 12 meses ──
    const agora = new Date();
    const meses = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      meses.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: `${nomeMes(d.getMonth())}/${String(d.getFullYear()).slice(2)}`, compras: 0, recap: 0 });
    }
    for (const p of pneus) {
      if (p.dataCompra) {
        const d = new Date(p.dataCompra);
        const k = `${d.getFullYear()}-${d.getMonth()}`;
        const slot = meses.find(m => m.key === k);
        if (slot) slot.compras += Number(p.custoAquisicao) || 0;
      }
      for (const r of (p.historicoRecapagens || [])) {
        if (r.dataRetorno) {
          const d = new Date(r.dataRetorno);
          const k = `${d.getFullYear()}-${d.getMonth()}`;
          const slot = meses.find(m => m.key === k);
          if (slot) slot.recap += Number(r.custoReal) || 0;
        }
      }
    }
    const dadosLinhaMensal = meses.map(m => ({ mes: m.label, Compras: m.compras, Recapagens: m.recap, Total: m.compras + m.recap }));

    // ── Top 10 pneus com maior custo ──
    const top10Pneus = pneus
      .map(p => ({
        id: p.id, fogo: p.fogo, marca: p.marca, medida: p.medida,
        custo: (Number(p.custoAquisicao) || 0) + (p.historicoRecapagens || []).reduce((s, r) => s + (Number(r.custoReal) || 0), 0),
        vida: VIDAS.find(v => v.id === p.vida)?.label || p.vida,
        status: STATUS_PNEU.find(s => s.id === p.status)?.label || p.status,
      }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 10);

    // ── Alertas críticos ──
    const alertasCriticos = pneus
      .filter(p => Number(p.sulcoAtual) > 0 && Number(p.sulcoAtual) < 3)
      .map(p => ({
        id: p.id, fogo: p.fogo, marca: p.marca,
        sulco: p.sulcoAtual,
        veiculo: p.posicaoAtual?.veiculoPlaca || "—",
        posicao: p.posicaoAtual?.posicao || "—",
      }))
      .sort((a, b) => a.sulco - b.sulco);

    return {
      total, porStatus, custoTotal, custoRecapTotal, custoGrandTotal,
      criticos, marcasRanking, dadosPizzaVida, dadosPizzaStatus,
      fornRanking, dadosLinhaMensal, top10Pneus, alertasCriticos,
    };
  }, [pneus]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Carregando…</div>;
  if (pneus.length === 0) return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
      <Package size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#475569" }}>Nenhum pneu cadastrado ainda</div>
      <p style={{ margin: "8px 0 0", fontSize: ".85rem" }}>Cadastre pneus na aba Estoque pra começar a ver analytics.</p>
    </div>
  );

  return (
    <div>
      <div style={s.info}>
        Analytics atualizado em tempo real com os pneus cadastrados. Custo total = aquisição + recapagens. Alertas de sulco crítico (&lt; 3 mm) destacados no fim.
      </div>

      {/* KPIs */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard("linear-gradient(135deg, #1a3a5c, #234775)", "#fff")}>
          <div style={s.kpiLbl}><Package size={12} /> Total investido</div>
          <div style={s.kpiVal}>{fmtBRL(analytics.custoGrandTotal)}</div>
          <div style={s.kpiSub}>Compra {fmtBRL(analytics.custoTotal)} + Recap {fmtBRL(analytics.custoRecapTotal)}</div>
        </div>
        <div style={s.kpiCard("#dbeafe")}>
          <div style={{ ...s.kpiLbl, color: "#1e40af" }}><Layers size={12} /> Total de pneus</div>
          <div style={{ ...s.kpiVal, color: "#1e3a8a" }}>{analytics.total}</div>
          <div style={{ ...s.kpiSub, color: "#1e40af" }}>{analytics.porStatus.em_uso || 0} em uso · {analytics.porStatus.estoque || 0} em estoque</div>
        </div>
        <div style={s.kpiCard("#fef3c7")}>
          <div style={{ ...s.kpiLbl, color: "#92400e" }}><TrendingUp size={12} /> Em recapagem</div>
          <div style={{ ...s.kpiVal, color: "#78350f" }}>{analytics.porStatus.recapagem || 0}</div>
          <div style={{ ...s.kpiSub, color: "#92400e" }}>pneus na recapadora</div>
        </div>
        <div style={s.kpiCard(analytics.criticos > 0 ? "#fee2e2" : "#dcfce7")}>
          <div style={{ ...s.kpiLbl, color: analytics.criticos > 0 ? "#b91c1c" : "#166534" }}><AlertTriangle size={12} /> Sulco crítico</div>
          <div style={{ ...s.kpiVal, color: analytics.criticos > 0 ? "#7f1d1d" : "#14532d" }}>{analytics.criticos}</div>
          <div style={{ ...s.kpiSub, color: analytics.criticos > 0 ? "#b91c1c" : "#166534" }}>pneus com &lt; 3 mm</div>
        </div>
      </div>

      {/* Row: pizzas */}
      <div style={s.gridRow}>
        <div style={s.section}>
          <h3 style={s.h3}>Status da frota</h3>
          {analytics.dadosPizzaStatus.length === 0 ? <p style={s.vazio}>Sem dados</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={analytics.dadosPizzaStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} labelLine={false}
                  label={({ value }) => value}>
                  {analytics.dadosPizzaStatus.map((d, i) => <Cell key={i} fill={d.cor} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} pneu${v === 1 ? "" : "s"}`, n]} />
                <Legend verticalAlign="bottom" height={30} iconSize={10} wrapperStyle={{ fontSize: ".78rem" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={s.section}>
          <h3 style={s.h3}>Distribuição por vida</h3>
          {analytics.dadosPizzaVida.length === 0 ? <p style={s.vazio}>Sem dados</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={analytics.dadosPizzaVida} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} labelLine={false}
                  label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""}>
                  {analytics.dadosPizzaVida.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} pneu${v === 1 ? "" : "s"}`, n]} />
                <Legend verticalAlign="bottom" height={30} iconSize={10} wrapperStyle={{ fontSize: ".78rem" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Barras: custo por marca */}
      <div style={s.section}>
        <h3 style={s.h3}><Award size={14} /> Investimento por marca</h3>
        {analytics.marcasRanking.length === 0 ? <p style={s.vazio}>Sem dados</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.marcasRanking} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="marca" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtBRLcurto(v)} tick={{ fontSize: 12 }} width={80} />
              <Tooltip formatter={(v) => fmtBRL(v)} />
              <Bar dataKey="custo" fill="#1a3a5c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Linhas: mensal */}
      <div style={s.section}>
        <h3 style={s.h3}>Custo mensal com pneus (últimos 12 meses)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={analytics.dadosLinhaMensal} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => fmtBRLcurto(v)} tick={{ fontSize: 11 }} width={80} />
            <Tooltip formatter={(v) => fmtBRL(v)} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: ".78rem" }} />
            <Line type="monotone" dataKey="Compras" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Recapagens" stroke="#b45309" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Total" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Ranking fornecedores + Top 10 pneus */}
      <div style={s.gridRow}>
        <div style={s.section}>
          <h3 style={s.h3}><Truck size={14} /> Ranking de fornecedores</h3>
          {analytics.fornRanking.length === 0 ? <p style={s.vazio}>Sem dados</p> : (
            <table style={s.tabela}>
              <thead>
                <tr>
                  <th style={s.th}>Fornecedor</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Qtd</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Custo total</th>
                </tr>
              </thead>
              <tbody>
                {analytics.fornRanking.map((f, i) => (
                  <tr key={i}>
                    <td style={s.td}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{f.fornecedor}</div>
                      {f.cnpj && <div style={{ fontSize: ".7rem", color: "#94a3b8" }}>CNPJ {f.cnpj}</div>}
                    </td>
                    <td style={{ ...s.td, textAlign: "right" }}>{f.qtd}</td>
                    <td style={{ ...s.td, textAlign: "right", fontWeight: 800, color: "#1a3a5c" }}>{fmtBRL(f.custo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={s.section}>
          <h3 style={s.h3}><TrendingUp size={14} /> Top 10 pneus com maior custo</h3>
          {analytics.top10Pneus.length === 0 ? <p style={s.vazio}>Sem dados</p> : (
            <table style={s.tabela}>
              <thead>
                <tr>
                  <th style={s.th}>Fogo</th>
                  <th style={s.th}>Marca</th>
                  <th style={s.th}>Vida</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Custo</th>
                </tr>
              </thead>
              <tbody>
                {analytics.top10Pneus.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...s.td, fontWeight: 800, color: "#1a3a5c" }}>{p.fogo}</td>
                    <td style={s.td}>{p.marca}</td>
                    <td style={s.td}><span style={{ fontSize: ".7rem", color: "#64748b" }}>{p.vida}</span></td>
                    <td style={{ ...s.td, textAlign: "right", fontWeight: 800 }}>{fmtBRL(p.custo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Alertas críticos */}
      {analytics.alertasCriticos.length > 0 && (
        <div style={{ ...s.section, borderColor: "#fca5a5", background: "linear-gradient(180deg, #fef2f2, #fff)" }}>
          <h3 style={{ ...s.h3, color: "#b91c1c" }}><AlertTriangle size={16} /> Pneus em estado crítico ({analytics.alertasCriticos.length})</h3>
          <table style={s.tabela}>
            <thead>
              <tr>
                <th style={s.th}>Fogo</th>
                <th style={s.th}>Marca</th>
                <th style={s.th}>Veículo</th>
                <th style={s.th}>Posição</th>
                <th style={{ ...s.th, textAlign: "right" }}>Sulco</th>
              </tr>
            </thead>
            <tbody>
              {analytics.alertasCriticos.map(p => (
                <tr key={p.id}>
                  <td style={{ ...s.td, fontWeight: 800, color: "#1a3a5c" }}>{p.fogo}</td>
                  <td style={s.td}>{p.marca}</td>
                  <td style={s.td}><strong>{p.veiculo}</strong></td>
                  <td style={s.td}>{p.posicao}</td>
                  <td style={{ ...s.td, textAlign: "right", fontWeight: 900, color: "#b91c1c" }}>{p.sulco} mm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
