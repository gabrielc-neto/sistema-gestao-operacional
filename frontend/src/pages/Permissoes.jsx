import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions, MODULES, ROLES } from "../contexts/PermissionsContext";
import LogoPontual from "../components/LogoPontual";

const LEVELS = [
  { value: "none", label: "Sem acesso", color: "#fee2e2", text: "#dc2626" },
  { value: "view", label: "Ver",        color: "#dbeafe", text: "#1d4ed8" },
  { value: "edit", label: "Editar",     color: "#dcfce7", text: "#15803d" },
];

function nextLevel(current) {
  const idx = LEVELS.findIndex(l => l.value === current);
  return LEVELS[(idx + 1) % LEVELS.length].value;
}

export default function Permissoes() {
  const { profile } = useAuth();
  const { perms, savePerms, isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [local, setLocal]     = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo]     = useState(false);
  const [erro, setErro]       = useState("");

  useEffect(() => {
    const base = {};
    ROLES.forEach(r => {
      base[r.id] = {};
      MODULES.forEach(m => {
        base[r.id][m.id] = perms[r.id]?.[m.id] || "none";
      });
    });
    setLocal(base);
  }, [perms]);

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "#dc2626", fontWeight: 700 }}>Acesso restrito a Administradores.</p>
      </div>
    );
  }

  function toggle(roleId, moduleId) {
    setLocal(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [moduleId]: nextLevel(prev[roleId]?.[moduleId] || "none"),
      },
    }));
    setSalvo(false);
  }

  function setAll(roleId, value) {
    setLocal(prev => ({
      ...prev,
      [roleId]: Object.fromEntries(MODULES.map(m => [m.id, value])),
    }));
    setSalvo(false);
  }

  async function handleSalvar() {
    setSalvando(true);
    setErro("");
    try {
      await savePerms(local);
      setSalvo(true);
    } catch (e) {
      setErro("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={s.wrap}>
      <header style={s.header} className="pg-header">
        <div className="pg-logo"><LogoPontual height={36} /></div>
        <span style={s.titulo}>Permissões</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }} className="pg-header-actions">
          <button style={s.btnSalvar} onClick={handleSalvar} disabled={salvando}>
            {salvando ? "Salvando..." : salvo ? "✓ Salvo" : "💾 Salvar"}
          </button>
          <button style={s.btnBack} onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>
      </header>

      <div style={s.body}>
        {erro && (
          <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontWeight: 600, fontSize: ".88rem" }}>
            {erro}
          </div>
        )}
        <p style={s.info}>
          Clique na célula para alternar: <strong style={{ color: "#dc2626" }}>Sem acesso</strong> → <strong style={{ color: "#1d4ed8" }}>Ver</strong> → <strong style={{ color: "#15803d" }}>Editar</strong>
        </p>

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.thRole}>Cargo</th>
                {MODULES.map(m => (
                  <th key={m.id} style={s.thModule}>{m.label}</th>
                ))}
                <th style={s.thModule}>Ações rápidas</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map(r => (
                <tr key={r.id}>
                  <td style={s.tdRole}>{r.label}</td>
                  {MODULES.map(m => {
                    const lvl = LEVELS.find(l => l.value === (local[r.id]?.[m.id] || "none"));
                    return (
                      <td key={m.id} style={s.tdCell}>
                        <button
                          style={{ ...s.pill, background: lvl.color, color: lvl.text }}
                          onClick={() => toggle(r.id, m.id)}
                        >
                          {lvl.label}
                        </button>
                      </td>
                    );
                  })}
                  <td style={s.tdCell}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={{ ...s.quick, background: "#dcfce7", color: "#15803d" }} onClick={() => setAll(r.id, "edit")}>Tudo Editar</button>
                      <button style={{ ...s.quick, background: "#dbeafe", color: "#1d4ed8" }} onClick={() => setAll(r.id, "view")}>Tudo Ver</button>
                      <button style={{ ...s.quick, background: "#fee2e2", color: "#dc2626" }} onClick={() => setAll(r.id, "none")}>Remover tudo</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={s.legenda}>
          {LEVELS.map(l => (
            <span key={l.value} style={{ ...s.legendaItem, background: l.color, color: l.text }}>
              {l.label}
            </span>
          ))}
          <span style={s.legendaNota}>Administradores têm acesso total e não aparecem nesta tabela.</span>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap:       { minHeight: "100vh", background: "var(--bg)", fontFamily: "system-ui, sans-serif" },
  header:     { background: "#1a3a5c", borderBottom: "4px solid transparent", borderImage: "linear-gradient(90deg, #3d6b47, #6aaa5e, #b5d947, #f5c318, #f0a500) 1", padding: "10px 24px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 8px rgba(0,0,0,.15)" },
  titulo:     { color: "#fff", fontWeight: 700, fontSize: "1.1rem" },
  btnSalvar:  { padding: "7px 20px", background: "#f5c318", color: "#1a3a5c", border: "none", borderRadius: 7, fontWeight: 700, cursor: "pointer", fontSize: ".88rem" },
  btnBack:    { padding: "7px 16px", background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 7, cursor: "pointer", fontSize: ".85rem" },
  body:       { padding: 24 },
  info:       { marginBottom: 16, fontSize: ".9rem", color: "#475569" },
  tableWrap:  { overflowX: "auto", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)" },
  table:      { width: "100%", borderCollapse: "collapse", fontSize: ".85rem" },
  thRole:     { padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#1a3a5c", background: "var(--bg)", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap", minWidth: 140 },
  thModule:   { padding: "12px 12px", textAlign: "center", fontWeight: 700, color: "#1a3a5c", background: "var(--bg)", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" },
  tdRole:     { padding: "10px 16px", fontWeight: 600, color: "var(--text)", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" },
  tdCell:     { padding: "8px 10px", textAlign: "center", borderBottom: "1px solid #f1f5f9" },
  pill:       { padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 600, fontSize: ".78rem", whiteSpace: "nowrap" },
  quick:      { padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600, fontSize: ".72rem", whiteSpace: "nowrap" },
  legenda:    { display: "flex", gap: 10, marginTop: 16, alignItems: "center", flexWrap: "wrap" },
  legendaItem:{ padding: "4px 12px", borderRadius: 20, fontWeight: 600, fontSize: ".78rem" },
  legendaNota:{ fontSize: ".78rem", color: "#94a3b8", marginLeft: 8 },
};
