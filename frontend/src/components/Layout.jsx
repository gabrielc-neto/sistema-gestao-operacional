import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { useRBAC } from "../rbac/RBACContext";
import {
  Menu, X, LayoutDashboard, Truck, Link2, ClipboardList, Users, Wrench,
  History, Palmtree, MapPin, UserCog, ShieldCheck, Building2, Briefcase,
  Clock, LogOut, Sun, Moon, ChevronLeft, ChevronRight,
  ShoppingCart, CircleDot, Fuel, FileUp, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

const GRUPOS = [
  {
    titulo: null,
    itens: [
      { Icon: LayoutDashboard, label: "Dashboard", link: "/dashboard", sempre: true },
    ],
  },
  {
    titulo: "OPERAÇÃO",
    itens: [
      { Icon: Truck,         label: "Frota",                  link: "/frota",        module: "frota" },
      { Icon: Link2,         label: "Atrelamento",            link: "/atrelamento",  module: "atrelamento" },
      { Icon: ClipboardList, label: "Ordens de Carregamento", link: "/oc",           module: "oc" },
      { Icon: Users,         label: "Motoristas",             link: "/motoristas",   module: "motoristas" },
      { Icon: Wrench,        label: "Manutenção",             link: "/manutencao",   module: "manutencao" },
      { Icon: CircleDot,     label: "Gestão de Pneus",        link: "/pneus",        module: "pneus" },
      { Icon: Fuel,          label: "Abastecimento",          link: "/abastecimento", sempre: true },
      { Icon: ShoppingCart,  label: "Compras",                link: "/compras",      perm: "compras.ver" },
      { Icon: History,       label: "Histórico",              link: "/historico",    module: "historico" },
      { Icon: Palmtree,      label: "Férias",                 link: "/ferias",       module: "ferias" },
    ],
  },
  {
    titulo: "MONITORAMENTO",
    itens: [
      { Icon: MapPin, label: "Rastreamento",     link: "/rastreamento", sempre: true },
      { Icon: Clock,  label: "Jornada & Extras", link: "/jornada",      sempre: true },
    ],
  },
  {
    titulo: "ADMINISTRAÇÃO",
    itens: [
      { Icon: Building2,   label: "Setores",             link: "/admin/setores", perm: "setores.ver" },
      { Icon: Briefcase,   label: "Cargos & Permissões", link: "/admin/cargos",  perm: "cargos.ver" },
      { Icon: UserCog,     label: "Usuários",            link: "/usuarios",      perm: "usuarios.ver" },
      { Icon: FileUp,      label: "Importar Dados",      link: "/import",        sempre: true },
      { Icon: ShieldCheck, label: "Permissões (legado)", link: "/permissoes",    perm: "permissoes.ver" },
    ],
  },
];

const ROLE_LABEL = {
  master: "Administrador", admin: "Administrador", diretor: "Diretor",
  superintendente: "Superintendente", gestao: "Gestão", logistica: "Logística",
  comercial: "Comercial", faturamento: "Faturamento", rh: "RH", motorista: "Motorista",
};

const BOTTOM_NAV = [
  { Icon: LayoutDashboard, label: "Home",    link: "/dashboard" },
  { Icon: Truck,           label: "Frota",   link: "/frota" },
  { Icon: ClipboardList,   label: "OC",      link: "/oc" },
  { Icon: MapPin,          label: "Mapa",    link: "/rastreamento" },
  { Icon: Wrench,          label: "Manut.",  link: "/manutencao" },
];

function iniciais(nome = "") {
  const p = nome.trim().split(/\s+/);
  if (!p[0]) return "?";
  return ((p[0][0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canView, isAdmin } = usePermissions();
  const { temPermissao } = useRBAC();

  const isDark = theme === "dark";
  const nome = profile?.nome || user?.email || "Usuário";
  const role = ROLE_LABEL[profile?.role] || profile?.role || "";

  const podeVer = useCallback((m) => {
    if (m.sempre) return true;
    if (m.perm)   return temPermissao(m.perm);
    if (m.module) return canView(m.module);
    return isAdmin;
  }, [temPermissao, canView, isAdmin]);

  const grupos = GRUPOS
    .map((g) => ({ ...g, itens: g.itens.filter(podeVer) }))
    .filter((g) => g.itens.length > 0);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  function ir(link) {
    setMobileOpen(false);
    navigate(link);
  }

  async function sair() {
    setMobileOpen(false);
    await logout();
    navigate("/");
  }

  return (
    <div className="app-layout">
      {/* ── Sidebar (desktop + mobile drawer) ─────────────────── */}
      <aside
        className={
          "app-sidebar" +
          (collapsed ? " is-collapsed" : "") +
          (mobileOpen ? " is-mobile-open" : "")
        }
      >
        {/* Header: logo + brand + toggle */}
        <div className="sidebar-header">
          <div className="sidebar-logo">P</div>
          <span className="sidebar-brand">Pontual</span>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
          {/* Mobile close button */}
          <button
            className="mobile-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{iniciais(profile?.nome || user?.email)}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-nome" title={nome}>{nome}</span>
            {role && <span className="sidebar-user-role">{role}</span>}
          </div>
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {grupos.map((g, gi) => (
            <div className="sidebar-group" key={g.titulo || `g${gi}`}>
              {g.titulo && <div className="sidebar-group-title">{g.titulo}</div>}
              {g.itens.map((m) => {
                const ativo = location.pathname === m.link;
                return (
                  <button
                    key={m.link}
                    className={"sidebar-item" + (ativo ? " is-active" : "")}
                    onClick={() => ir(m.link)}
                    aria-current={ativo ? "page" : undefined}
                    title={collapsed ? m.label : undefined}
                  >
                    <m.Icon className="sidebar-item-ico" size={18} strokeWidth={2} />
                    <span className="sidebar-item-label">{m.label}</span>
                    {ativo && !collapsed && <ChevronRight size={14} style={{ flexShrink: 0, opacity: 0.5 }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer: theme + logout */}
        <div className="sidebar-footer">
          <button className="sidebar-foot-btn" onClick={toggleTheme}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span>{isDark ? "Tema claro" : "Tema escuro"}</span>
          </button>
          <button className="sidebar-foot-btn sidebar-foot-sair" onClick={sair}>
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile overlay ──────────────────────────────────── */}
      <div
        className={"mobile-overlay" + (mobileOpen ? " is-open" : "")}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      {/* ── Main content ────────────────────────────────────── */}
      <main className="app-main">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <span className="mobile-topbar-brand">Pontual</span>
          <div style={{ width: 40 }} />
        </div>

        {children}
      </main>

      {/* ── Bottom nav (mobile) ─────────────────────────────── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {BOTTOM_NAV.map((m) => {
            const ativo = location.pathname === m.link;
            return (
              <button
                key={m.link}
                className={"bottom-nav-item" + (ativo ? " is-active" : "")}
                onClick={() => ir(m.link)}
              >
                <m.Icon size={20} strokeWidth={2} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <style>{`
        /* Mobile topbar */
        .mobile-topbar {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: var(--card-bg);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .mobile-topbar-brand {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--accent);
        }
        .mobile-close-btn {
          width: 28px; height: 28px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--surface-2);
          color: var(--text-muted);
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .mobile-close-btn:hover {
          background: var(--surface-3);
          color: var(--text);
        }

        @media (max-width: 768px) {
          .mobile-topbar {
            display: flex;
          }
          .mobile-close-btn {
            display: flex;
          }
          .sidebar-toggle {
            display: none;
          }
          /* Make header just logo on mobile */
          .sidebar-header {
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
