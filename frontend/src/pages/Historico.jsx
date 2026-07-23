import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { list as dsList } from "../services/genericDataSource";
import { listAll as dsListManut } from "../services/manutencaoDataSource";
import ModuleHeader from "../components/ModuleHeader";
import ExportBar from "../components/ExportBar";

const PAGE_SIZE = 50;

const TIPO_CONFIG = {
  ATRELAMENTO:  { bg: "var(--accent)", color: "#fff", label: "ATRELAMENTO" },
  OC:           { bg: "#0f766e", color: "#fff", label: "OC" },
  "MANUTENÇÃO": { bg: "var(--warning)", color: "#fff", label: "MANUTENÇÃO" },
};

const Badge = ({ tipo }) => {
  const cfg = TIPO_CONFIG[tipo] || { bg: "var(--text-muted)", color: "#fff", label: tipo };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 4, padding: "2px 9px",
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
      minWidth: 90, display: "inline-block", textAlign: "center",
    }}>
      {cfg.label}
    </span>
  );
};

const descricaoAtrelamento = (r) =>
  `${r.num ?? "—"} | ${r.op ?? ""} | Cavalo: ${r.cavalo ?? "—"} | ${r.motorista ?? "—"}`;

const descricaoOC = (r) =>
  `${r.num ?? r.id ?? "—"} | Cavalo: ${r.cavalo ?? r.placa ?? "—"} | Destino: ${r.destino ?? r.cliente ?? "—"}`;

const descricaoManutencao = (r) =>
  `${r.placa ?? r.veiculo ?? "—"} | ${r.item ?? r.tipo ?? "—"} | Status: ${r.status ?? "—"}`;

const extrairData = (r) => {
  // tenta campos comuns
  const raw = r.data || r.dataAbertura || r.dataCriacao || r.criadoEm || "";
  if (!raw) return "";
  // se for ISO datetime, extrai só a data
  return String(raw).slice(0, 10);
};

const normalizarRegistros = (rows, tipo, descrFn) =>
  rows.map(r => {
    // Aceita tanto Firestore docs (com .id/.data()) quanto array plano [{id, ...}]
    const doc = typeof r.data === "function" ? { id: r.id, ...r.data() } : r;
    return {
      _id: doc.id,
      _tipo: tipo,
      _data: extrairData(doc),
      _hora: doc.hora || doc.criadoEm?.slice(11, 16) || "",
      _descricao: descrFn(doc),
      _usuario: doc.usuario || doc.motorista || "",
      _raw: doc,
    };
  });

const filtrarPorPeriodo = (items, periodo) => {
  if (periodo === "todos") return items;
  const agora = new Date();
  const corte = new Date();
  if (periodo === "hoje") {
    corte.setHours(0, 0, 0, 0);
  } else if (periodo === "7") {
    corte.setDate(agora.getDate() - 7);
  } else if (periodo === "30") {
    corte.setDate(agora.getDate() - 30);
  }
  return items.filter(item => {
    if (!item._data) return true;
    const d = new Date(item._data + "T00:00:00");
    return d >= corte;
  });
};

export default function Historico() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const [atrRows, ocRows, manRows] = await Promise.all([
        dsList("atrelamentos",        { orderBy: "data", order: "desc" }).catch(() => []),
        dsList("ordens_carregamento", { orderBy: "data", order: "desc" }).catch(() => []),
        dsListManut("manutencoes").catch(() => []),
      ]);

      const atrs = normalizarRegistros(atrRows, "ATRELAMENTO", descricaoAtrelamento);
      const ocs  = normalizarRegistros(ocRows,  "OC",           descricaoOC);
      const mans = normalizarRegistros(manRows,  "MANUTENÇÃO",   descricaoManutencao);

      const unidos = [...atrs, ...ocs, ...mans].sort((a, b) => {
        const da = (a._data + " " + a._hora) || "";
        const db_ = (b._data + " " + b._hora) || "";
        return db_ > da ? 1 : db_ < da ? -1 : 0;
      });

      setTodos(unidos);
    } catch (e) {
      setErro("Erro ao carregar histórico: " + e.message);
    }
    setLoading(false);
  }, []);

  // carga inicial no mount (carregar é useCallback estável)
  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = (() => {
    let r = todos;
    if (filtroTipo !== "todos") r = r.filter(i => i._tipo === filtroTipo);
    r = filtrarPorPeriodo(r, filtroPeriodo);
    if (busca.trim()) {
      const b = busca.toLowerCase();
      r = r.filter(i =>
        i._descricao.toLowerCase().includes(b) ||
        i._tipo.toLowerCase().includes(b) ||
        (i._usuario || "").toLowerCase().includes(b) ||
        (i._data || "").includes(b)
      );
    }
    return r;
  })();

  const visiveis = filtrados.slice(0, pagina * PAGE_SIZE);
  const temMais = visiveis.length < filtrados.length;

  const resetPagina = () => setPagina(1);

  const inputStyle = {
    padding: "8px 12px", border: "1px solid var(--border-strong)",
    borderRadius: 6, fontSize: 13, background: "var(--card-bg)",
    color: "var(--text)", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)" }}>
      {/* Header */}
      <ModuleHeader title="Histórico" />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* Estatísticas rápidas */}
        {!loading && (
          <div className="pg-stats grid-form-4" style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18,
          }}>
            {[
              { label: "Total", valor: todos.length, cor: "var(--accent)" },
              { label: "Atrelamentos", valor: todos.filter(i => i._tipo === "ATRELAMENTO").length, cor: "var(--accent)" },
              { label: "Ordens", valor: todos.filter(i => i._tipo === "OC").length, cor: "var(--accent)" },
              { label: "Manutenções", valor: todos.filter(i => i._tipo === "MANUTENÇÃO").length, cor: "var(--accent)" },
            ].map(s => (
              <div key={s.label} style={{
                background: "var(--card-bg)", border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)", padding: "16px 18px",
                boxShadow: "var(--sh-sm)", position: "relative", overflow: "hidden",
              }}>
                <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: s.cor }} />
                <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-muted)" }}>{s.label}</div>
                <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "var(--text)", marginTop: 6, lineHeight: 1.1, letterSpacing: "-.02em", fontFamily: "var(--font-display)" }}>{s.valor}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div style={{
          background: "var(--card-bg)", borderRadius: 10, padding: "14px 18px",
          marginBottom: 18, display: "flex", alignItems: "center",
          gap: 12, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        }}>
          <input
            placeholder="Buscar descrição, tipo, motorista..."
            value={busca}
            onChange={e => { setBusca(e.target.value); resetPagina(); }}
            style={{ ...inputStyle, width: 260, flex: "none" }}
          />
          <select
            value={filtroTipo}
            onChange={e => { setFiltroTipo(e.target.value); resetPagina(); }}
            style={{ ...inputStyle, width: 160, flex: "none" }}
          >
            <option value="todos">Todos os tipos</option>
            <option value="ATRELAMENTO">Atrelamento</option>
            <option value="OC">Ordem de Carga</option>
            <option value="MANUTENÇÃO">Manutenção</option>
          </select>
          <select
            value={filtroPeriodo}
            onChange={e => { setFiltroPeriodo(e.target.value); resetPagina(); }}
            style={{ ...inputStyle, width: 160, flex: "none" }}
          >
            <option value="todos">Todo período</option>
            <option value="hoje">Hoje</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
          <div style={{ flex: 1 }} />
          <button onClick={() => { carregar(); resetPagina(); }} style={{
            background: "var(--bg)", color: "var(--accent)", border: "1px solid var(--border-strong)",
            borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}>
            Atualizar
          </button>
        </div>

        <ExportBar
          titulo="Histórico Operacional"
          arquivo="historico"
          subtitulo={() => {
            const tipoTxt = filtroTipo !== "todos" ? ` · tipo: ${filtroTipo}` : "";
            const perTxt = filtroPeriodo !== "todos" ? ` · período: ${filtroPeriodo}` : "";
            return `${filtrados.length} registro(s)${tipoTxt}${perTxt}`;
          }}
          dados={() => ({
            colunas: ["Data", "Hora", "Tipo", "Descrição", "Usuário/Mot."],
            linhas: filtrados.map((i) => [
              i._data ? new Date(i._data + "T00:00:00").toLocaleDateString("pt-BR") : "",
              i._hora || "",
              i._tipo || "",
              i._descricao || "",
              i._usuario || "",
            ]),
          })}
        />

        {/* Lista */}
        <div style={{
          background: "var(--card-bg)", borderRadius: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden",
        }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 64 }}>
              <div style={{
                width: 36, height: 36, border: "4px solid var(--border)",
                borderTop: "4px solid var(--accent)", borderRadius: "50%",
                animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
              }} />
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando histórico...</div>
            </div>
          ) : erro ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--danger)" }}>
              {erro}
              <br />
              <button onClick={carregar} style={{
                marginTop: 12, background: "var(--accent)", color: "#fff",
                border: "none", borderRadius: 6, padding: "8px 18px",
                cursor: "pointer", fontWeight: 700,
              }}>Tentar novamente</button>
            </div>
          ) : filtrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: 64, color: "var(--text-subtle)" }}>
              Nenhum registro encontrado para os filtros selecionados.
            </div>
          ) : (
            <>
              {/* Cabeçalho tabela */}
              <div className="histo-header" style={{
                display: "grid",
                gridTemplateColumns: "110px 90px 100px 1fr 120px",
                background: "var(--accent)", color: "#fff",
                padding: "10px 18px", gap: 12,
                fontSize: 12, fontWeight: 600,
              }}>
                <span>Data</span>
                <span>Hora</span>
                <span>Tipo</span>
                <span>Descrição</span>
                <span>Usuário/Mot.</span>
              </div>

              {visiveis.map((item, i) => (
                <div
                  key={`${item._tipo}-${item._id}-${i}`}
                  className="histo-item"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 90px 100px 1fr 120px",
                    padding: "11px 18px", gap: 12,
                    background: i % 2 === 0 ? "var(--surface-2)" : "#fff",
                    borderBottom: "1px solid var(--border)",
                    alignItems: "center",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "var(--surface-2)" : "#fff"}
                >
                  <span style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {item._data
                      ? new Date(item._data + "T00:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {item._hora || "—"}
                  </span>
                  <span>
                    <Badge tipo={item._tipo} />
                  </span>
                  <span style={{
                    fontSize: 13, color: "var(--text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {item._descricao}
                  </span>
                  <span style={{
                    fontSize: 12, color: "var(--text-muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {item._usuario || "—"}
                  </span>
                </div>
              ))}

              {/* Carregar mais */}
              {temMais && (
                <div style={{ padding: "18px", textAlign: "center", borderTop: "1px solid var(--border)" }}>
                  <button
                    onClick={() => setPagina(p => p + 1)}
                    style={{
                      background: "var(--accent)", color: "#fff", border: "none",
                      borderRadius: 6, padding: "10px 32px", cursor: "pointer",
                      fontWeight: 700, fontSize: 14,
                    }}
                  >
                    Carregar mais ({filtrados.length - visiveis.length} restantes)
                  </button>
                </div>
              )}

              <div style={{ padding: "12px 18px", borderTop: "1px solid #f1f5f9", textAlign: "right" }}>
                <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>
                  Exibindo {visiveis.length} de {filtrados.length} registro{filtrados.length !== 1 ? "s" : ""}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
