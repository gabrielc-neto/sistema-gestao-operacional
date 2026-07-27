import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { useRBAC } from "../rbac/RBACContext";
import {
  Menu, X, LayoutDashboard, Truck, Link2, ClipboardList, Users, Wrench,
  History, Palmtree, MapPin, UserCog, ShieldCheck, Building2, Briefcase,
  Clock, LogOut, Sun, Moon, ChevronRight, ShoppingCart, LayoutGrid,
} from "lucide-react";

/* ─── Catálogo de módulos, agrupado (mesma lógica de permissão do Dashboard) ── */
const GRUPOS = [
  {
    titulo: null,
    itens: [
      { Icon: LayoutDashboard, label: "Dashboard", link: "/dashboard", sempre: true },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { Icon: Truck,         label: "Frota",                  link: "/frota",        module: "frota" },
      { Icon: Link2,         label: "Atrelamento",            link: "/atrelamento",  module: "atrelamento" },
      { Icon: ClipboardList, label: "Ordens de Carregamento", link: "/oc",           module: "oc" },
      { Icon: Users,         label: "Motoristas",             link: "/motoristas",   module: "motoristas" },
      { Icon: Wrench,        label: "Manutenção",             link: "/manutencao",   module: "manutencao" },
      { Icon: ShoppingCart,  label: "Compras",                link: "/compras",      perm: "compras.ver" },
      { Icon: History,       label: "Histórico",              link: "/historico",    module: "historico" },
      { Icon: Palmtree,      label: "Férias",                 link: "/ferias",       module: "ferias" },
    ],
  },
  {
    titulo: "Monitoramento",
    itens: [
      { Icon: MapPin, label: "Rastreamento",     link: "/rastreamento", sempre: true },
      { Icon: Clock,  label: "Jornada & Extras", link: "/jornada",      sempre: true },
    ],
  },
  {
    titulo: "Administração",
    itens: [
      { Icon: Building2,   label: "Setores",             link: "/admin/setores", perm: "setores.ver" },
      { Icon: Briefcase,   label: "Cargos & Permissões", link: "/admin/cargos",  perm: "cargos.ver" },
      { Icon: UserCog,     label: "Usuários",            link: "/usuarios",      perm: "usuarios.ver" },
      // "Configurações - Gerenciamento de Sistemas" saiu daqui: configurar o portal
      // da intranet não é assunto do Gestão Operacional. Virou o painel em /intranet,
      // dentro do próprio portal, com acesso por palavra-chave.
      { Icon: ShieldCheck, label: "Permissões (legado)", link: "/permissoes",    perm: "permissoes.ver" },
    ],
  },
];

const ROLE_LABEL = {
  master: "Administrador", admin: "Administrador", diretor: "Diretor",
  superintendente: "Superintendente", gestao: "Gestão", logistica: "Logística",
  comercial: "Comercial", faturamento: "Faturamento", rh: "RH", motorista: "Motorista",
};

function iniciais(nome = "") {
  const p = nome.trim().split(/\s+/);
  if (!p[0]) return "?";
  return ((p[0][0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export default function MenuNavegacao({ variante = "escuro" }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canView, isAdmin } = usePermissions();
  const { temPermissao } = useRBAC();

  // Trava scroll do body enquanto aberto + fecha no Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const podeVer = (m) => {
    if (m.sempre) return true;
    if (m.perm)   return temPermissao(m.perm);
    if (m.module) return canView(m.module);
    return isAdmin;
  };

  const grupos = GRUPOS
    .map((g) => ({ ...g, itens: g.itens.filter(podeVer) }))
    .filter((g) => g.itens.length > 0);

  function ir(link) { setOpen(false); navigate(link); }
  async function sair() { setOpen(false); await logout(); navigate("/"); }

  const isDark = theme === "dark";
  const nome = profile?.nome || user?.email || "Usuário";
  const role = ROLE_LABEL[profile?.role] || profile?.role || "";

  return (
    <>
      {/* Botão do menu — canto superior direito, em todas as telas */}
      <button
        className={"nav-trigger" + (variante === "claro" ? " nav-trigger-claro" : "")}
        aria-label="Abrir menu de navegação"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu size={20} strokeWidth={2.2} />
      </button>

      {/* Overlay + Drawer (desliza da direita) */}
      <div className={"nav-overlay" + (open ? " is-open" : "")} onClick={() => setOpen(false)} aria-hidden={!open}>
        <aside
          className="nav-drawer"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Navegação"
        >
          {/* Topo */}
          <div className="nav-top">
            <span className="nav-brand">Pontual</span>
            <button className="nav-close" aria-label="Fechar menu" onClick={() => setOpen(false)}>
              <X size={19} />
            </button>
          </div>

          {/* Usuário */}
          <div className="nav-user">
            <div className="nav-avatar">{iniciais(profile?.nome || user?.email)}</div>
            <div className="nav-user-info">
              <span className="nav-user-nome" title={nome}>{nome}</span>
              {role && <span className="nav-user-role">{role}</span>}
            </div>
          </div>

          {/* Navegação */}
          <nav className="nav-scroll">
            {grupos.map((g, gi) => (
              <div className="nav-group" key={g.titulo || `g${gi}`}>
                {g.titulo && <div className="nav-group-title">{g.titulo}</div>}
                {g.itens.map((m) => {
                  const ativo = location.pathname === m.link;
                  return (
                    <button
                      key={m.link}
                      className={"nav-item" + (ativo ? " is-active" : "")}
                      onClick={() => ir(m.link)}
                      aria-current={ativo ? "page" : undefined}
                    >
                      <m.Icon className="nav-item-ico" size={18} strokeWidth={2} />
                      <span className="nav-item-label">{m.label}</span>
                      {ativo && <ChevronRight className="nav-item-chevron" size={15} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Rodapé — portal + tema + sair */}
          <div className="nav-footer">
            {/* Volta para a grade de sistemas da intranet sem encerrar a sessão.
                Antes disto, a única saída daqui era "Sair", que desloga. */}
            <button className="nav-foot-btn" onClick={() => ir("/sistemas")}>
              <LayoutGrid size={17} />
              <span>Voltar ao portal</span>
            </button>
            <button className="nav-foot-btn" onClick={toggleTheme}>
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
              <span>{isDark ? "Tema claro" : "Tema escuro"}</span>
            </button>
            <button className="nav-foot-btn nav-foot-sair" onClick={sair}>
              <LogOut size={17} />
              <span>Sair</span>
            </button>
          </div>
        </aside>
      </div>

      <style>{`
        /* ── Botão gatilho ─────────────────────────────────────── */
        .nav-trigger {
          display: inline-flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; flex-shrink: 0;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 10px;
          background: rgba(255,255,255,.10);
          color: #fff; cursor: pointer;
          transition: background var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease), transform var(--t-fast) var(--ease);
        }
        .nav-trigger:hover { background: rgba(255,255,255,.18); }
        .nav-trigger:active { transform: scale(.94); }
        .nav-trigger-claro {
          background: var(--surface-3);
          border-color: var(--border);
          color: var(--text);
        }
        .nav-trigger-claro:hover { background: var(--border); }

        /* ── Overlay ───────────────────────────────────────────── */
        .nav-overlay {
          position: fixed; inset: 0; z-index: 3000;
          background: rgba(15,23,42,0);
          backdrop-filter: blur(0px);
          visibility: hidden; opacity: 0;
          display: flex; justify-content: flex-end;
          transition: opacity var(--t) var(--ease), backdrop-filter var(--t) var(--ease), visibility 0s linear var(--t);
        }
        .nav-overlay.is-open {
          visibility: visible; opacity: 1;
          background: rgba(10,15,30,.5);
          backdrop-filter: blur(3px);
          transition: opacity var(--t) var(--ease), backdrop-filter var(--t) var(--ease);
        }

        /* ── Drawer ────────────────────────────────────────────── */
        .nav-drawer {
          width: 86vw; max-width: 320px; height: 100%;
          background: var(--card-bg);
          border-left: 1px solid var(--border);
          box-shadow: var(--sh-xl);
          display: flex; flex-direction: column;
          transform: translateX(100%);
          transition: transform var(--t-slow) var(--ease);
        }
        .nav-overlay.is-open .nav-drawer { transform: translateX(0); }

        .nav-top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 18px 14px;
          border-bottom: 1px solid var(--border);
        }
        .nav-brand {
          font-family: var(--font-display); font-weight: 700; font-size: 1.05rem;
          letter-spacing: -0.02em; color: var(--accent);
        }
        .nav-close {
          width: 34px; height: 34px; border: none; border-radius: 9px;
          background: var(--surface-2); color: var(--text-muted);
          display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
          transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
        }
        .nav-close:hover { background: var(--surface-3); color: var(--text); }

        .nav-user {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 18px;
          border-bottom: 1px solid var(--border);
        }
        .nav-avatar {
          width: 42px; height: 42px; flex-shrink: 0; border-radius: 12px;
          background: var(--accent); color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: .95rem; letter-spacing: .02em;
        }
        .nav-user-info { display: flex; flex-direction: column; min-width: 0; gap: 3px; }
        .nav-user-nome {
          font-weight: 600; font-size: .92rem; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;
        }
        .nav-user-role {
          font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
          color: var(--accent); background: var(--accent-soft);
          padding: 2px 8px; border-radius: 999px; align-self: flex-start;
        }

        .nav-scroll { flex: 1; overflow-y: auto; padding: 10px 12px; }
        .nav-group { margin-bottom: 6px; }
        .nav-group + .nav-group { margin-top: 8px; }
        .nav-group-title {
          font-size: .66rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
          color: var(--text-subtle); padding: 10px 12px 6px;
        }

        .nav-item {
          display: flex; align-items: center; gap: 12px; width: 100%;
          padding: 10px 12px; margin: 1px 0;
          border: none; background: none; border-radius: 10px;
          font-family: var(--font); font-size: .9rem; font-weight: 500;
          color: var(--text-muted); text-align: left; cursor: pointer;
          transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
        }
        .nav-item:hover { background: var(--surface-2); color: var(--text); }
        .nav-item .nav-item-ico { color: var(--text-subtle); flex-shrink: 0; transition: color var(--t-fast) var(--ease); }
        .nav-item:hover .nav-item-ico { color: var(--text-muted); }
        .nav-item-label { flex: 1; }
        .nav-item.is-active {
          background: var(--accent-soft); color: var(--accent); font-weight: 600;
        }
        .nav-item.is-active .nav-item-ico { color: var(--accent); }
        .nav-item-chevron { color: var(--accent); }

        .nav-footer {
          border-top: 1px solid var(--border);
          padding: 10px 12px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .nav-foot-btn {
          display: flex; align-items: center; gap: 12px; width: 100%;
          padding: 10px 12px; border: none; background: none; border-radius: 10px;
          font-family: var(--font); font-size: .88rem; font-weight: 500;
          color: var(--text-muted); text-align: left; cursor: pointer;
          transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
        }
        .nav-foot-btn:hover { background: var(--surface-2); color: var(--text); }
        .nav-foot-sair { color: var(--danger); }
        .nav-foot-sair:hover { background: var(--danger-bg); color: var(--danger); }

        @media (max-width: 480px) {
          .nav-drawer { width: 100vw; max-width: none; }
        }
      `}</style>
    </>
  );
}
