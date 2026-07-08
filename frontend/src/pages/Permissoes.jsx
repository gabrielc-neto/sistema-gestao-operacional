import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions, MODULES, ROLES } from "../contexts/PermissionsContext";
import ModuleHeader from "../components/ModuleHeader";
import ExportBar from "../components/ExportBar";
import { Save, CheckCircle2 } from "lucide-react";

const NIVEL_LABEL = { none: "Sem acesso", view: "Ver", edit: "Editar" };

const LEVELS = [
  { value: "none", label: "Sem acesso", color: "var(--danger-bg)", text: "var(--danger)" },
  { value: "view", label: "Ver",        color: "var(--accent-soft)", text: "var(--accent)" },
  { value: "edit", label: "Editar",     color: "var(--success-bg)", text: "var(--success)" },
];

function nextLevel(current) {
  const idx = LEVELS.findIndex(l => l.value === current);
  return LEVELS[(idx + 1) % LEVELS.length].value;
}

export default function Permissoes() {
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
    setLocal(base);  // sync local state com perms do contexto
  }, [perms]);

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--danger)", fontWeight: 700 }}>Acesso restrito a Administradores.</p>
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
      <ModuleHeader
        title="Permissões"
        actions={
          <button className="mod-hbtn-alt" onClick={handleSalvar} disabled={salvando}>
            {salvando ? "Salvando..." : salvo ? <><CheckCircle2 size={14} color="var(--success)"/> Salvo</> : <><Save size={14}/> Salvar</>}
          </button>
        }
      />

      <div style={s.body}>
        {erro && (
          <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontWeight: 600, fontSize: ".88rem" }}>
            {erro}
          </div>
        )}
        <p style={s.info}>
          Clique na célula para alternar: <strong style={{ color: "var(--danger)" }}>Sem acesso</strong> → <strong style={{ color: "var(--accent)" }}>Ver</strong> → <strong style={{ color: "var(--success)" }}>Editar</strong>
        </p>

        <ExportBar
          titulo="Permissões por Cargo"
          arquivo="permissoes"
          subtitulo={`${ROLES.length} cargos · ${MODULES.length} módulos`}
          dados={() => ({
            colunas: ["Cargo", ...MODULES.map((m) => m.label)],
            linhas: ROLES.map((r) => [
              r.label,
              ...MODULES.map((m) => NIVEL_LABEL[local[r.id]?.[m.id] || "none"]),
            ]),
          })}
        />

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
                      <button style={{ ...s.quick, background: "var(--success-bg)", color: "var(--success)" }} onClick={() => setAll(r.id, "edit")}>Tudo Editar</button>
                      <button style={{ ...s.quick, background: "var(--accent-soft)", color: "var(--accent)" }} onClick={() => setAll(r.id, "view")}>Tudo Ver</button>
                      <button style={{ ...s.quick, background: "var(--danger-bg)", color: "var(--danger)" }} onClick={() => setAll(r.id, "none")}>Remover tudo</button>
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
  wrap:       { minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)" },
  header:     { background: "var(--header-bg)", borderBottom: "1px solid var(--header-border)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 8px rgba(0,0,0,.15)" },
  titulo:     { color: "#fff", fontWeight: 700, fontSize: "1.1rem" },
  btnSalvar:  { padding: "7px 20px", background: "var(--header-btn-bg)", color: "var(--accent)", border: "none", borderRadius: 7, fontWeight: 700, cursor: "pointer", fontSize: ".88rem", display: "inline-flex", alignItems: "center", gap: 6 },
  btnBack:    { padding: "7px 16px", background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 7, cursor: "pointer", fontSize: ".85rem", display: "inline-flex", alignItems: "center", gap: 6 },
  body:       { padding: 24 },
  info:       { marginBottom: 16, fontSize: ".9rem", color: "var(--text-muted)" },
  tableWrap:  { overflowX: "auto", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)" },
  table:      { width: "100%", borderCollapse: "collapse", fontSize: ".85rem" },
  thRole:     { padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "var(--accent)", background: "var(--bg)", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap", minWidth: 140 },
  thModule:   { padding: "12px 12px", textAlign: "center", fontWeight: 700, color: "var(--accent)", background: "var(--bg)", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" },
  tdRole:     { padding: "10px 16px", fontWeight: 600, color: "var(--text)", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" },
  tdCell:     { padding: "8px 10px", textAlign: "center", borderBottom: "1px solid #f1f5f9" },
  pill:       { padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 600, fontSize: ".78rem", whiteSpace: "nowrap" },
  quick:      { padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600, fontSize: ".72rem", whiteSpace: "nowrap" },
  legenda:    { display: "flex", gap: 10, marginTop: 16, alignItems: "center", flexWrap: "wrap" },
  legendaItem:{ padding: "4px 12px", borderRadius: 20, fontWeight: 600, fontSize: ".78rem" },
  legendaNota:{ fontSize: ".78rem", color: "var(--text-subtle)", marginLeft: 8 },
};
