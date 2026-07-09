// Aba "Conjunto" — relatório consolidado de vencimentos do conjunto completo:
// cavalo + carretas atreladas + motorista atual (CNH/MOPP/ASO/toxicológico/NR).
// Reutiliza registros, TIPOS e calcStatus da aba Alertas — nenhuma migração de banco.

import { useState, useMemo } from "react";
import { Truck, Printer, AlertTriangle, CheckCircle2, Clock, HelpCircle, Pen } from "lucide-react";

const CAMPOS_CARRETA = ["c1", "c2", "c3", "carreta1", "carreta2", "carreta3", "carreta"];
// Grupos que aparecem nessa aba. "Documentação" foi removido a pedido — quem quer
// documentação usa a aba Alertas / Por Veículo (que continuam com o grupo).
const GRUPOS_ORDEM = ["Motorista", "Mecânica"];
// Documentos que NÃO se aplicam por padrão a cada tipo de veículo.
// (User ainda pode ligar/desligar individualmente via documentosAplicaveis no cadastro.)
const EXCLUIR_POR_TIPO_VEIC = {
  cavalo:  ["cipp", "rntrc"],                                                   // CIPP é da carreta; RNTRC é da empresa
  carreta: ["tacografo", "aet", "oleo", "arrefecimento", "embreagem", "diferencial"], // sem tacógrafo/AET e sem itens de motor (carreta não tem motor)
};
const STATUS_ORDER = { vencido: 0, alerta: 1, sem_data: 2, ok: 3 };
const STATUS_COR = {
  vencido:  { bg: "#fef2f2", cor: "#991b1b", pt: "#dc2626" },
  alerta:   { bg: "#fef3c7", cor: "#78350f", pt: "#d97706" },
  ok:       { bg: "#dcfce7", cor: "#166534", pt: "#16a34a" },
  sem_data: { bg: "#f1f5f9", cor: "#475569", pt: "#94a3b8" },
};
const STATUS_LBL = { vencido: "Vencido", alerta: "Alerta", ok: "OK", sem_data: "Sem registro" };

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },
  toolbar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", background: "#fff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" },
  select: { padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: ".9rem", minWidth: 260, background: "#fff", fontWeight: 700, color: "#1a3a5c" },
  btn: (cor) => ({ padding: "9px 14px", borderRadius: 8, background: cor, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }),
  resumo: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 },
  resumoTit: { fontSize: ".78rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 },
  resumoLinha: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px dashed #e2e8f0" },
  chip: (st) => ({ padding: "3px 8px", borderRadius: 20, background: STATUS_COR[st].bg, color: STATUS_COR[st].cor, fontSize: ".72rem", fontWeight: 800 }),
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" },
  cardHead: { padding: "12px 16px", background: "linear-gradient(90deg, #1a3a5c, #234775)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  cardHeadTit: { display: "inline-flex", alignItems: "center", gap: 10, fontSize: ".95rem", fontWeight: 800 },
  grupoTit: { padding: "8px 16px", background: "#f8fafc", color: "#1a3a5c", fontSize: ".78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #e2e8f0", borderTop: "1px solid #e2e8f0" },
  tabela: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "5px 10px", textAlign: "left", fontSize: ".68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".04em", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" },
  td: { padding: "5px 10px", fontSize: ".8rem", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle", lineHeight: 1.2 },
  dateInput: { padding: "7px 9px", borderRadius: 6, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: ".82rem", background: "#fff", color: "#1a3a5c", fontWeight: 600 },
  vazio: { padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: ".9rem" },
  bola: (st) => ({ width: 10, height: 10, borderRadius: "50%", background: STATUS_COR[st].pt, flexShrink: 0, display: "inline-block" }),
  linkEditar: { background: "transparent", border: "1px solid #cbd5e1", cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontSize: ".75rem", color: "#475569", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 },
};

// Normaliza placa (mesmo padrão do Manutencao.jsx)
const normP = (p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const fmtDate = (iso) => iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "—";
const diasAteVenc = (iso) => {
  if (!iso) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const venc = new Date(iso + "T00:00:00");
  return Math.ceil((venc - hoje) / 86400000);
};

// Encontra motorista atrelado ao cavalo (checa vários campos possíveis do modelo)
function motoristaDoVeiculo(placaVeic, motoristas) {
  const pN = normP(placaVeic);
  if (!pN) return null;
  return motoristas.find(m => {
    if (!m) return false;
    const alvos = [m.veiculo, m.veiculo_placa, m.placa, m.placaVeiculo, m.placa_veiculo].map(normP);
    return alvos.includes(pN);
  }) || null;
}

export default function AbaConjuntoVencimentos({ veiculos, registros, legacy, TIPOS, calcStatus, motoristas, onEditar }) {
  const [placaCavalo, setPlacaCavalo] = useState("");
  const [filtroDe, setFiltroDe]   = useState("");
  const [filtroAte, setFiltroAte] = useState("");
  const [ocultarOk, setOcultarOk] = useState(false);

  // Lista de cavalos (tudo que não é carreta), ordenada por placa
  const cavalos = useMemo(() => {
    return veiculos
      .filter(v => v.tipo !== "carreta")
      .slice()
      .sort((a, b) => (a.placa || "").localeCompare(b.placa || ""));
  }, [veiculos]);

  // Resolve o conjunto: cavalo + carretas atreladas
  const conjunto = useMemo(() => {
    if (!placaCavalo) return null;
    const cavalo = veiculos.find(v => normP(v.placa) === normP(placaCavalo));
    if (!cavalo) return null;
    const carretaPlacasRaw = CAMPOS_CARRETA
      .map(k => cavalo[k])
      .filter(Boolean);
    const carretas = carretaPlacasRaw
      .map(pl => veiculos.find(v => normP(v.placa) === normP(pl)) || { placa: pl, _naoCadastrada: true })
      .filter(Boolean);
    const motorista = motoristaDoVeiculo(cavalo.placa, motoristas || []);
    return { cavalo, carretas, motorista };
  }, [placaCavalo, veiculos, motoristas]);

  // Para cada veículo do conjunto, resolve os vencimentos aplicáveis + status.
  // Cavalo puxa TIPOS de grupo Documentação + Mecânica (+ Motorista se houver motorista atrelado).
  // Carreta puxa só Documentação + Mecânica.
  const relatorio = useMemo(() => {
    if (!conjunto) return [];
    const { cavalo, carretas, motorista } = conjunto;

    const gerarLinhas = (veic, incluirGruposMotorista) => {
      const pN = normP(veic.placa);
      const aplicaveis = Array.isArray(veic.documentosAplicaveis) ? new Set(veic.documentosAplicaveis) : null;
      const tipoVeic = veic.tipo === "carreta" ? "carreta" : "cavalo";
      const excluidos = new Set(EXCLUIR_POR_TIPO_VEIC[tipoVeic] || []);
      const linhas = [];
      TIPOS.forEach(tipo => {
        // Documentação NÃO entra na aba Conjunto (usa Alertas/Por Veículo)
        if (tipo.grupo === "Documentação") return;
        if (tipo.grupo === "Motorista" && !incluirGruposMotorista) return;
        // Se veículo tem documentosAplicaveis customizado, respeita ele (ignora blacklist).
        // Senão aplica blacklist padrão por tipo de veículo.
        if (aplicaveis) {
          if (!aplicaveis.has(tipo.id)) return;
        } else {
          if (excluidos.has(tipo.id)) return;
        }
        const rec = registros[`${pN}__${tipo.id}`] || null;
        const status = calcStatus(rec?.venc);
        const dias = rec?.venc ? diasAteVenc(rec.venc) : null;
        // Filtro por range de datas (aplica só se filtro preenchido; sem_data cai fora do range)
        if (filtroDe && (!rec?.venc || rec.venc < filtroDe)) return;
        if (filtroAte && (!rec?.venc || rec.venc > filtroAte)) return;
        // Filtro "ocultar OK"
        if (ocultarOk && status === "ok") return;
        linhas.push({ tipo, rec, status, dias });
      });
      // Ordena pelo mais próximo do vencimento:
      // vencidos primeiro (dias mais negativos = venceu há mais tempo, mais crítico)
      // depois alertas / OK futuros em ordem crescente de data
      // sem_data vai pro final
      linhas.sort((a, b) => {
        const aSem = a.status === "sem_data";
        const bSem = b.status === "sem_data";
        if (aSem !== bSem) return aSem ? 1 : -1;
        if (aSem && bSem) return (a.tipo.label || "").localeCompare(b.tipo.label || "");
        return (a.rec?.venc || "").localeCompare(b.rec?.venc || "");
      });
      // Agrupa por grupo mantendo ordem interna
      const porGrupo = {};
      linhas.forEach(l => {
        const g = l.tipo.grupo || "Outros";
        if (!porGrupo[g]) porGrupo[g] = [];
        porGrupo[g].push(l);
      });
      return porGrupo;
    };

    const veiculosRelatorio = [
      { placa: cavalo.placa, titulo: "Cavalo", origem: cavalo, incluirMotorista: !!motorista, linhas: gerarLinhas(cavalo, !!motorista) },
      ...carretas.map((c, i) => ({ placa: c.placa, titulo: `Carreta ${i + 1}`, origem: c, incluirMotorista: false, linhas: c._naoCadastrada ? {} : gerarLinhas(c, false), naoCadastrada: c._naoCadastrada })),
    ];

    return veiculosRelatorio;
  }, [conjunto, registros, TIPOS, calcStatus, filtroDe, filtroAte, ocultarOk]);

  // Contagem por status pro card resumo
  const resumoStatus = useMemo(() => {
    const contagem = relatorio.map(veic => {
      const acum = { vencido: 0, alerta: 0, sem_data: 0, ok: 0 };
      Object.values(veic.linhas).forEach(arr => arr.forEach(l => { acum[l.status] = (acum[l.status] || 0) + 1; }));
      return { placa: veic.placa, titulo: veic.titulo, contagem: acum, naoCadastrada: veic.naoCadastrada };
    });
    return contagem;
  }, [relatorio]);

  const imprimir = () => {
    // CSS de impressão no head via injeção temporária
    const styleId = "print-conjunto-style";
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        @media print {
          body * { visibility: hidden; }
          #conjunto-relatorio-print, #conjunto-relatorio-print * { visibility: visible; }
          #conjunto-relatorio-print { position: absolute; top: 0; left: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 12mm; }
        }
      `;
      document.head.appendChild(styleEl);
    }
    setTimeout(() => window.print(), 100);
  };

  return (
    <div style={s.wrap}>
      <div style={s.toolbar} className="no-print">
        <Truck size={18} color="#2563eb" />
        <label style={{ fontSize: ".82rem", fontWeight: 700, color: "#475569" }}>Cavalo:</label>
        <select style={s.select} value={placaCavalo} onChange={e => setPlacaCavalo(e.target.value)}>
          <option value="">— selecione —</option>
          {cavalos.map(c => (
            <option key={c.id || c.placa} value={c.placa}>
              {c.placa} {c.modelo ? `· ${c.modelo}` : ""}
            </option>
          ))}
        </select>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, borderLeft: "1px solid #e2e8f0", paddingLeft: 12, marginLeft: 4 }}>
          <label style={{ fontSize: ".78rem", fontWeight: 700, color: "#475569" }}>Vencimento de</label>
          <input type="date" style={s.dateInput} value={filtroDe} onChange={e => setFiltroDe(e.target.value)} />
          <label style={{ fontSize: ".78rem", fontWeight: 700, color: "#475569" }}>até</label>
          <input type="date" style={s.dateInput} value={filtroAte} onChange={e => setFiltroAte(e.target.value)} />
          {(filtroDe || filtroAte) && (
            <button onClick={() => { setFiltroDe(""); setFiltroAte(""); }} title="Limpar filtro"
              style={{ background: "transparent", border: "1px solid #cbd5e1", padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: ".78rem", color: "#475569", fontWeight: 600 }}>
              limpar
            </button>
          )}
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: ".8rem", fontWeight: 600, color: "#475569", cursor: "pointer" }}>
          <input type="checkbox" checked={ocultarOk} onChange={e => setOcultarOk(e.target.checked)} />
          Ocultar OK
        </label>
        {conjunto && (
          <button style={{ ...s.btn("#1a3a5c"), marginLeft: "auto" }} onClick={imprimir} title="Imprimir relatório do conjunto">
            <Printer size={16} /> Imprimir
          </button>
        )}
      </div>

      {!conjunto && (
        <div style={s.vazio}>Selecione um cavalo pra ver o conjunto atrelado e todos os vencimentos.</div>
      )}

      {conjunto && (
        <div id="conjunto-relatorio-print" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Cabeçalho de impressão (só aparece no print) */}
          <div style={{ display: "none", padding: "0 0 12px", borderBottom: "2px solid #1a3a5c", marginBottom: 10 }} className="print-only-header">
            <h2 style={{ margin: 0, color: "#1a3a5c" }}>Relatório de Vencimentos — Conjunto {conjunto.cavalo.placa}</h2>
            <p style={{ margin: "4px 0 0", fontSize: ".8rem", color: "#64748b" }}>Emitido em {new Date().toLocaleString("pt-BR")}</p>
          </div>
          <style>{`@media print { .print-only-header { display: block !important; } }`}</style>

          {/* Card resumo */}
          <div style={s.resumo}>
            <div style={s.resumoTit}>Resumo do conjunto</div>
            {resumoStatus.map(v => (
              <div key={v.placa} style={s.resumoLinha}>
                <div style={{ minWidth: 130, fontWeight: 800, color: "#1a3a5c" }}>{v.titulo}</div>
                <div style={{ minWidth: 110, fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>{v.placa}</div>
                {v.naoCadastrada ? (
                  <span style={{ color: "#dc2626", fontSize: ".8rem", fontStyle: "italic" }}>⚠ carreta não cadastrada em /frota</span>
                ) : (
                  <>
                    {v.contagem.vencido  > 0 && <span style={s.chip("vencido")}>{v.contagem.vencido} vencido{v.contagem.vencido > 1 ? "s" : ""}</span>}
                    {v.contagem.alerta   > 0 && <span style={s.chip("alerta")}>{v.contagem.alerta} alerta{v.contagem.alerta > 1 ? "s" : ""}</span>}
                    {v.contagem.sem_data > 0 && <span style={s.chip("sem_data")}>{v.contagem.sem_data} sem registro</span>}
                    {v.contagem.ok       > 0 && <span style={s.chip("ok")}>{v.contagem.ok} OK</span>}
                    {v.contagem.vencido + v.contagem.alerta + v.contagem.sem_data + v.contagem.ok === 0 && (
                      <span style={{ color: "#94a3b8", fontSize: ".8rem" }}>nenhum documento aplicável</span>
                    )}
                  </>
                )}
              </div>
            ))}
            {conjunto.motorista && (
              <div style={{ ...s.resumoLinha, borderBottom: "none" }}>
                <div style={{ minWidth: 130, fontWeight: 800, color: "#1a3a5c" }}>Motorista</div>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{conjunto.motorista.nome || conjunto.motorista.nome_completo || "—"}</div>
                <span style={{ marginLeft: "auto", fontSize: ".75rem", color: "#64748b" }}>Documentos incluídos no cavalo</span>
              </div>
            )}
            {!conjunto.motorista && (
              <div style={{ ...s.resumoLinha, borderBottom: "none" }}>
                <div style={{ minWidth: 130, fontWeight: 800, color: "#94a3b8", fontStyle: "italic" }}>Motorista</div>
                <span style={{ color: "#94a3b8", fontSize: ".8rem", fontStyle: "italic" }}>nenhum atrelado ao cavalo — CNH/MOPP/ASO não listados</span>
              </div>
            )}
          </div>

          {/* Cards por veículo */}
          {relatorio.map(veic => (
            <div key={veic.placa} style={s.card}>
              <div style={s.cardHead}>
                <div style={s.cardHeadTit}>
                  <Truck size={18} />
                  <span>{veic.titulo}</span>
                  <span style={{ fontFamily: "monospace", opacity: .9 }}>· {veic.placa}</span>
                </div>
              </div>
              {veic.naoCadastrada ? (
                <div style={s.vazio}>Carreta <strong>{veic.placa}</strong> não está cadastrada em /frota. Cadastre pra ver os vencimentos.</div>
              ) : Object.keys(veic.linhas).length === 0 ? (
                <div style={s.vazio}>Nenhum documento aplicável a este veículo.</div>
              ) : (
                GRUPOS_ORDEM.filter(g => veic.linhas[g]?.length).map(grupo => (
                  <div key={grupo}>
                    <div style={s.grupoTit}>{grupo}</div>
                    <table style={s.tabela}>
                      <thead>
                        <tr>
                          <th style={{ ...s.th, width: 22 }}></th>
                          <th style={s.th}>Documento</th>
                          <th style={{ ...s.th, width: 110 }}>Vencimento</th>
                          <th style={s.th}>Situação</th>
                          <th style={{ ...s.th, width: 82 }} className="no-print"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {veic.linhas[grupo].map(l => (
                          <tr key={l.tipo.id}>
                            <td style={s.td}><span style={s.bola(l.status)} /></td>
                            <td style={{ ...s.td, fontWeight: 700, color: "#0f172a" }}>{l.tipo.label}</td>
                            <td style={{ ...s.td, fontWeight: 700, color: "#0f172a" }}>
                              {l.rec?.venc ? fmtDate(l.rec.venc) : "—"}
                            </td>
                            <td style={s.td}>
                              <span style={s.chip(l.status)}>{STATUS_LBL[l.status]}</span>
                              {l.dias !== null && l.status !== "sem_data" && (
                                <span style={{ fontSize: ".72rem", color: STATUS_COR[l.status].cor, marginLeft: 8, fontWeight: 600 }}>
                                  {l.dias < 0 ? `venceu há ${Math.abs(l.dias)}d` : `em ${l.dias}d`}
                                </span>
                              )}
                            </td>
                            <td style={s.td} className="no-print">
                              <button
                                style={s.linkEditar}
                                onClick={() => onEditar && onEditar(veic.placa, l.tipo)}
                                title="Abrir para editar / lançar"
                              >
                                <Pen size={11} /> {l.rec ? "Editar" : "Lançar"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
