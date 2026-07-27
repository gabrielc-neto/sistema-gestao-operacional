// AbaTimeline — histórico consolidado de tudo que aconteceu com o veículo
// Agrega: OS, manutenções (vencimentos), multas, abastecimentos CTA
// Filtro por placa + intervalo de datas

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import { watch as dsWatch } from "../services/genericDataSource";
import { Wrench, AlertOctagon, Fuel, FileText, Calendar, Truck, Filter } from "lucide-react";

const TIPO_META = {
  os:         { icon: Wrench,       cor: "#16a34a", bg: "#dcfce7", label: "OS" },
  manutencao: { icon: FileText,     cor: "#7c3aed", bg: "#f3e8ff", label: "Manutenção/Doc" },
  multa:      { icon: AlertOctagon, cor: "#b91c1c", bg: "#fee2e2", label: "Multa" },
  abastecimento: { icon: Fuel,       cor: "#0891b2", bg: "#cffafe", label: "Abastecimento" },
};

const fmtBRL = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (d) => {
  if (!d) return "—";
  const ms = typeof d === "object" && d.toMillis ? d.toMillis() : (typeof d === "string" ? Date.parse(d) : d);
  return new Date(ms).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
};

function parseMs(x) {
  if (!x) return null;
  if (typeof x === "object" && x.toMillis) return x.toMillis();
  const ms = Date.parse(x);
  return Number.isFinite(ms) ? ms : null;
}

export default function AbaTimeline({ veiculos = [], ordensServico = [], registrosManut = {}, motoristas = [] }) {
  const [placa, setPlaca] = useState("");
  const [filtros, setFiltros] = useState({ os: true, manutencao: true, multa: true, abastecimento: true });
  const [multas, setMultas] = useState([]);
  const [abast, setAbast] = useState([]);

  useEffect(() => {
    const un1 = dsWatch("multas", snap => setMultas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    // Abastecimentos: dsList com limit + ordering na coleção genérica
    const un2 = dsWatch("abastecimentos_cta", snap => setAbast(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      { orderBy: "dataAbastecimento", order: "desc", limit: 500 });
    return () => { un1(); un2(); };
  }, []);

  const eventos = useMemo(() => {
    if (!placa) return [];
    const p = String(placa).toUpperCase().trim();
    const list = [];

    ordensServico.filter(o => (o.placa || "").toUpperCase() === p).forEach(o => {
      list.push({
        tipo: "os",
        ts: parseMs(o.finalizadaEm || o.criadoEm || o.dataHora),
        titulo: `OS ${o.numero || o.id.slice(-6)} — ${o.tipoServico}`,
        detalhe: `${o.status === "finalizada" ? "Finalizada" : "Aberta"}${o.mecanico ? ` · ${o.mecanico}` : ""}${o.fornecedor ? ` · ${o.fornecedor}` : ""}`,
        valor: Number(o.valorTotal) || 0,
        raw: o,
      });
    });

    Object.values(registrosManut || {}).filter(r => (r.placa || "").toUpperCase() === p).forEach(r => {
      list.push({
        tipo: "manutencao",
        ts: parseMs(r.data_realiz || r.updatedAt || r.createdAt),
        titulo: r.label || r.tipo,
        detalhe: `Vence ${r.venc || "?"}${r.local ? ` · ${r.local}` : ""}${r.resp ? ` · ${r.resp}` : ""}`,
        valor: 0,
        raw: r,
      });
    });

    multas.filter(m => (m.placa || "").toUpperCase() === p).forEach(m => {
      list.push({
        tipo: "multa",
        ts: parseMs(m.data),
        titulo: `Multa — ${m.descricao || m.codigo || "sem descrição"}`,
        detalhe: `${m.orgao || "?"} · ${m.status}${m.motorista ? ` · ${m.motorista}` : ""}`,
        valor: Number(m.valor) || 0,
        raw: m,
      });
    });

    abast.filter(a => (a.placa || "").toUpperCase() === p).forEach(a => {
      list.push({
        tipo: "abastecimento",
        ts: parseMs(a.dataAbastecimento || a.data),
        titulo: `Abastecimento — ${a.combustivel || "Diesel S10"}`,
        detalhe: `${a.litros || 0}L · ${a.posto || "pátio"}${a.motorista ? ` · ${a.motorista}` : ""}`,
        valor: Number(a.valor) || 0,
        raw: a,
      });
    });

    return list
      .filter(e => e.ts && filtros[e.tipo])
      .sort((a, b) => b.ts - a.ts);
  }, [placa, ordensServico, registrosManut, multas, abast, filtros]);

  const kpi = useMemo(() => {
    const total = eventos.length;
    const porTipo = {};
    let gastoTotal = 0;
    eventos.forEach(e => {
      porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
      gastoTotal += Number(e.valor || 0);
    });
    return { total, porTipo, gastoTotal };
  }, [eventos]);

  const S = {
    wrap: { padding: 20, display: "flex", flexDirection: "column", gap: 16 },
    toolbar: { display: "flex", alignItems: "center", gap: 10, background: "#fff", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0", flexWrap: "wrap" },
    input: { padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: ".88rem" },
    chip: (ativo, cor) => ({ background: ativo ? cor : "#f1f5f9", color: ativo ? "#fff" : "#64748b", border: "none", padding: "5px 12px", borderRadius: 999, fontSize: ".78rem", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }),
    line: { position: "absolute", left: 20, top: 40, bottom: 0, width: 2, background: "#e2e8f0" },
    evento: (cor, bg) => ({ position: "relative", background: "#fff", border: "1px solid #e2e8f0", borderLeft: `4px solid ${cor}`, borderRadius: 8, padding: "12px 14px", marginLeft: 44, display: "flex", flexDirection: "column", gap: 4 }),
    bola: (cor, bg) => ({ position: "absolute", left: 12, width: 20, height: 20, borderRadius: "50%", background: bg, border: `3px solid ${cor}`, display: "flex", alignItems: "center", justifyContent: "center" }),
  };

  return (
    <div style={S.wrap}>
      <div style={S.toolbar}>
        <Truck size={16} color="#64748b" />
        <select style={{ ...S.input, minWidth: 200 }} value={placa} onChange={e => setPlaca(e.target.value)}>
          <option value="">Selecione o veículo</option>
          {veiculos.map(v => <option key={v.id} value={v.placa}>{v.placa}{v.modelo ? ` — ${v.modelo}` : ""}</option>)}
        </select>
        <Filter size={16} color="#64748b" style={{ marginLeft: 12 }} />
        {Object.entries(TIPO_META).map(([id, m]) => (
          <button key={id} onClick={() => setFiltros(f => ({ ...f, [id]: !f[id] }))} style={S.chip(filtros[id], m.cor)}>
            <m.icon size={12} /> {m.label}
          </button>
        ))}
      </div>

      {!placa ? (
        <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", background: "#fff", borderRadius: 10 }}>
          <Truck size={40} style={{ opacity: .3, marginBottom: 12 }} /><br />
          Selecione um veículo pra ver a linha do tempo completa.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
            <div style={{ background: "#fff", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1a3a5c" }}>{kpi.total}</div>
              <div style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 600 }}>eventos</div>
            </div>
            <div style={{ background: "#fff", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1a3a5c" }}>{fmtBRL(kpi.gastoTotal)}</div>
              <div style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 600 }}>gasto acumulado</div>
            </div>
            {Object.entries(kpi.porTipo).map(([tipo, n]) => (
              <div key={tipo} style={{ background: TIPO_META[tipo].bg, padding: 12, borderRadius: 10, border: `1px solid ${TIPO_META[tipo].cor}22` }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TIPO_META[tipo].cor }}>{n}</div>
                <div style={{ fontSize: ".72rem", color: TIPO_META[tipo].cor, fontWeight: 600 }}>{TIPO_META[tipo].label}</div>
              </div>
            ))}
          </div>

          {eventos.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Nenhum evento encontrado com os filtros atuais.</div>
          ) : (
            <div style={{ position: "relative", paddingLeft: 0 }}>
              <div style={S.line}></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {eventos.map((e, i) => {
                  const meta = TIPO_META[e.tipo];
                  const Ico = meta.icon;
                  return (
                    <div key={i} style={{ position: "relative" }}>
                      <div style={S.bola(meta.cor, meta.bg)}>
                        <Ico size={10} color={meta.cor} />
                      </div>
                      <div style={S.evento(meta.cor, meta.bg)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ fontWeight: 700, color: "#1a3a5c", fontSize: ".92rem" }}>{e.titulo}</div>
                          <div style={{ fontSize: ".72rem", color: "#64748b", whiteSpace: "nowrap" }}>{fmtDT(e.ts)}</div>
                        </div>
                        <div style={{ fontSize: ".82rem", color: "#475569" }}>{e.detalhe}</div>
                        {e.valor > 0 && <div style={{ fontSize: ".82rem", fontWeight: 700, color: meta.cor, marginTop: 2 }}>{fmtBRL(e.valor)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
