import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Settings, Sun, Moon, LogOut } from "lucide-react";

const ROLE_LABEL = {
  master: "Administrador", admin: "Administrador", diretor: "Diretor",
  superintendente: "Superintendente", gestao: "Gestão", logistica: "Logística",
  comercial: "Comercial", faturamento: "Faturamento", rh: "RH", motorista: "Motorista",
};

export default function SettingsMenu() {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate("/");
  }

  const isDark = theme === "dark";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Configurações"
        style={{
          background: open ? "rgba(255,255,255,.15)" : "transparent",
          border: "none",
          fontSize: "1.3rem",
          cursor: "pointer",
          padding: "6px 10px",
          borderRadius: 8,
          color: "#fff",
          lineHeight: 1,
          transition: "background .15s",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <Settings size={20} />
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 10px)",
          background: "var(--card-bg)", borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,.2)", minWidth: 200,
          zIndex: 200, overflow: "hidden",
          border: "1px solid var(--border)",
        }}>
          {/* Usuário */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--text)" }}>
              {profile?.nome || "Usuário"}
            </div>
            <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: 2 }}>
              {ROLE_LABEL[profile?.role] || profile?.role || ""}
            </div>
          </div>

          {/* Tema */}
          <button
            onClick={toggleTheme}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "11px 16px",
              background: "none", border: "none", textAlign: "left",
              cursor: "pointer", fontSize: ".85rem", color: "var(--text)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center" }}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</span>
            {isDark ? "Tema Claro" : "Tema Escuro"}
          </button>

          {/* Sair */}
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "11px 16px",
              background: "none", border: "none", textAlign: "left",
              cursor: "pointer", fontSize: ".85rem", color: "var(--danger)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center" }}><LogOut size={18} /></span>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
