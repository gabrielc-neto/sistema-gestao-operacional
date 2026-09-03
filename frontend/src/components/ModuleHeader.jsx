import { useNavigate } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";

/**
 * Navbar padrão de todos os módulos — base: Frota.
 * Uniformiza estética do topo de cada página.
 * O menu de navegação agora é fornecido pelo Layout (sidebar/bottom nav).
 *
 * Props:
 *  - title    (string)     nome do módulo (ex.: "FROTA")
 *  - subtitle (string?)    linha auxiliar (oculta no mobile)
 *  - actions  (ReactNode?) botões específicos do módulo (ex.: Novo, Exportar).
 *                          Use className="mod-hbtn-alt" neles para casar a estética.
 *  - onBack   (fn?)        override do voltar (default: navega para /dashboard)
 */
export default function ModuleHeader({ title, subtitle, actions, onBack }) {
  const navigate = useNavigate();
  const voltar = onBack || (() => navigate("/dashboard"));
  return (
    <header className="mod-header pg-header">
      <style>{`
        .mod-header {
          background: var(--header-bg); color: #fff;
          border-bottom: 1px solid var(--header-border);
          padding: 14px 24px; display: flex; align-items: center; gap: 14px;
          box-shadow: 0 4px 14px rgba(15,23,42,.18);
          position: sticky; top: 0; z-index: 100;
        }
        .mod-header .mod-title {
          font-family: var(--font-display); color: #fff; font-weight: 700;
          font-size: 1.15rem; line-height: 1.1; letter-spacing: -.01em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .mod-header .mod-sub { color: rgba(255,255,255,.62); font-size: .72rem; margin-top: 2px; }
        .mod-header-btns { margin-left: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        @media (max-width: 640px) {
          .mod-header { padding: 10px 14px; gap: 8px; flex-wrap: wrap; }
          .mod-header-btns { width: 100%; margin-left: 0; }
        }
        .mod-hbtn, .mod-hbtn-alt {
          display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
          border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer;
          font-family: inherit; font-size: .82rem; font-weight: 700; text-decoration: none;
          transition: transform .15s, filter .15s, background .15s;
        }
        .mod-hbtn { background: var(--header-btn-bg); color: var(--accent); box-shadow: 0 1px 3px rgba(0,0,0,.1); }
        .mod-hbtn-alt { background: rgba(255,255,255,.14); color: #fff; -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
        .mod-hbtn:hover, .mod-hbtn-alt:hover { transform: translateY(-1px); }
        .mod-hbtn-alt:hover { background: rgba(255,255,255,.22); }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 0, minWidth: 0 }}>
        <span className="mod-title">{title}</span>
        {subtitle && <span className="mod-sub">{subtitle}</span>}
      </div>

      <div className="mod-header-btns pg-header-actions">
        {actions}
        <button className="mod-hbtn" onClick={voltar}>
          <LayoutDashboard size={16} />
          <span className="hide-mobile">Dashboard</span>
        </button>
      </div>
    </header>
  );
}
