import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy, limit, startAfter } from "firebase/firestore";
import { db } from "../firebase/config";
import LogoPontual from "../components/LogoPontual";

const PAGE_SIZE = 50;

const TIPO_CONFIG = {
  ATRELAMENTO:  { bg: "#1d4ed8", color: "#fff", label: "ATRELAMENTO" },
  OC:           { bg: "#0f766e", color: "#fff", label: "OC" },
  "MANUTENÇÃO": { bg: "#b45309", color: "#fff", label: "MANUTENÇÃO" },
};

const Badge = ({ tipo }) => {
  const cfg = TIPO_CONFIG[tipo] || { bg: "#64748b", color: "#fff", label: tipo };
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

const normalizarRegistros = (docs, tipo, descrFn) =>
  docs.map(d => {
    const r = { id: d.id, ...d.data() };
    return {
      _id: d.id,
      _tipo: tipo,
      _data: extrairData(r),
      _hora: r.hora || r.criadoEm?.slice(11, 16) || "",
      _descricao: descrFn(r),
      _usuario: r.usuario || r.motorista || "",
      _raw: r,
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
      const [snapAtr, snapOC, snapMan] = await Promise.all([
        getDocs(query(collection(db, "atrelamentos"), orderBy("data", "desc"))),
        getDocs(query(collection(db, "ordens_carregamento"), orderBy("data", "desc"))).catch(() =>
          getDocs(collection(db, "ordens_carregamento"))
        ),
        getDocs(query(collection(db, "manutencoes"), orderBy("data", "desc"))).catch(() =>
          getDocs(collection(db, "manutencoes"))
        ),
      ]);

      const atrs = normalizarRegistros(snapAtr.docs, "ATRELAMENTO", descricaoAtrelamento);
      const ocs  = normalizarRegistros(snapOC.docs,  "OC",           descricaoOC);
      const mans = normalizarRegistros(snapMan.docs,  "MANUTENÇÃO",   descricaoManutencao);

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
    padding: "8px 12px", border: "1px solid #cbd5e1",
    borderRadius: 6, fontSize: 13, background: "var(--card-bg)",
    color: "var(--text)", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="pg-header" style={{
        background: "#1a3a5c", borderBottom: "4px solid transparent", borderImage: "linear-gradient(90deg, #3d6b47, #6aaa5e, #b5d947, #f5c318, #f0a500) 1",
        padding: "0 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 64,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }} className="pg-logo">
          <LogoPontual height={40} />
          <span style={{ color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: 0.5 }}>
            Histórico
          </span>
        </div>
        <div className="pg-header-actions">
          <a href="/dashboard" style={{
            background: "#f5c318", color: "#1a3a5c", fontWeight: 700,
            border: "none", borderRadius: 6, padding: "8px 18px",
            cursor: "pointer", textDecoration: "none", fontSize: 14,
          }}>
            ← Dashboard
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* Estatísticas rápidas */}
        {!loading && (
          <div className="pg-stats grid-form-4" style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18,
          }}>
            {[
              { label: "Total", valor: todos.length, cor: "#1a3a5c" },
              { label: "Atrelamentos", valor: todos.filter(i => i._tipo === "ATRELAMENTO").length, cor: "#1d4ed8" },
              { label: "Ordens", valor: todos.filter(i => i._tipo === "OC").length, cor: "#0f766e" },
              { label: "Manutenções", valor: todos.filter(i => i._tipo === "MANUTENÇÃO").length, cor: "#b45309" },
            ].map(s => (
              <div key={s.label} style={{
                background: "var(--card-bg)", borderRadius: 10, padding: "14px 18px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                borderLeft: `4px solid ${s.cor}`,
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.cor }}>{s.valor}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
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
            background: "var(--bg)", color: "#1a3a5c", border: "1px solid #cbd5e1",
            borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}>
            Atualizar
          </button>
        </div>

        {/* Lista */}
        <div style={{
          background: "var(--card-bg)", borderRadius: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden",
        }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 64 }}>
              <div style={{
                width: 36, height: 36, border: "4px solid #e2e8f0",
                borderTop: "4px solid #1a3a5c", borderRadius: "50%",
                animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
              }} />
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando histórico...</div>
            </div>
          ) : erro ? (
            <div style={{ textAlign: "center", padding: 48, color: "#dc2626" }}>
              {erro}
              <br />
              <button onClick={carregar} style={{
                marginTop: 12, background: "#f5c318", color: "#1a3a5c",
                border: "none", borderRadius: 6, padding: "8px 18px",
                cursor: "pointer", fontWeight: 700,
              }}>Tentar novamente</button>
            </div>
          ) : filtrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: 64, color: "#94a3b8" }}>
              Nenhum registro encontrado para os filtros selecionados.
            </div>
          ) : (
            <>
              {/* Cabeçalho tabela */}
              <div className="histo-header" style={{
                display: "grid",
                gridTemplateColumns: "110px 90px 100px 1fr 120px",
                background: "#1a3a5c", color: "#fff",
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
                    background: i % 2 === 0 ? "#f8fafc" : "#fff",
                    borderBottom: "1px solid var(--border)",
                    alignItems: "center",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#f8fafc" : "#fff"}
                >
                  <span style={{ fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}>
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
                      background: "#f5c318", color: "#1a3a5c", border: "none",
                      borderRadius: 6, padding: "10px 32px", cursor: "pointer",
                      fontWeight: 700, fontSize: 14,
                    }}
                  >
                    Carregar mais ({filtrados.length - visiveis.length} restantes)
                  </button>
                </div>
              )}

              <div style={{ padding: "12px 18px", borderTop: "1px solid #f1f5f9", textAlign: "right" }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
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
