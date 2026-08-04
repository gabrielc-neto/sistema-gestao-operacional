import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { callFunction } from "../firebase/callFunction";
import LogoPontual from "../components/LogoPontual";

const ic = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

// Catálogo de sistemas da tela de seleção.
//   interno: true  → segue para o portão "Entrar no sistema" (este próprio app)
//   url: "..."     → abre o sistema externo em nova aba
//   url: ""        → ainda sem endereço (mostra "em breve" até informarem a URL)
// 2026-08-04: Wesley reverteu decisão de 2026-07-24. Volta a mostrar os 12 sistemas.
// Alguns ainda apontam para o portal do Gabriel (web-homol.pontualpetroleo.com.br) e
// podem dar 404 até serem migrados para o VPS Hostinger ou terem URL própria.
const SISTEMAS = [
  {
    id: "intranet",
    nome: "Gerenciamento de Sistemas",
    cor: "#334155", bg: "#f1f5f9", intranet: true,
    icon: (<svg {...ic} aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>),
  },
  {
    id: "integridade",
    nome: "Canal de Integridade e Relacionamento",
    cor: "#15803d", bg: "#f0fdf4", url: "https://web-homol.pontualpetroleo.com.br/integridade/",
    icon: (<svg {...ic} aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>),
  },
  {
    id: "sgo",
    nome: "Gestão Operacional",
    cor: "#18216e", bg: "#eef1fb", interno: true,
    icon: (<svg {...ic} aria-hidden="true"><path d="M10 17h4V5H2v12h3" /><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>),
  },
  {
    id: "servicedesk",
    nome: "Service Desk",
    cor: "#0c7f98", bg: "#ecfbff", url: "https://web-homol.pontualpetroleo.com.br/servicedesk",
    icon: (<svg {...ic} aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 4.24 4.24" /><path d="m14.83 9.17 4.24-4.24" /><path d="m14.83 14.83 4.24 4.24" /><path d="m9.17 14.83-4.24 4.24" /><circle cx="12" cy="12" r="4" /></svg>),
  },
  {
    id: "pops",
    nome: "Procedimentos (POPs)",
    cor: "#7c3aed", bg: "#f5f3ff", url: "",
    icon: (<svg {...ic} aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="m9 14 2 2 4-4" /></svg>),
  },
  {
    id: "projetos",
    nome: "Gerenciamento de Projetos",
    cor: "#be123c", bg: "#fff1f2", url: "",
    icon: (<svg {...ic} aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="M9 9h6" /><path d="M9 15h6" /></svg>),
  },
  {
    id: "apresentacoes",
    nome: "Apresentações Corporativas",
    cor: "#4f46e5", bg: "#eef2ff", url: "",
    icon: (<svg {...ic} aria-hidden="true"><path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="m7 21 5-5 5 5" /></svg>),
  },
  {
    id: "espaco",
    nome: "Gestão de Espaço",
    cor: "#0d9488", bg: "#f0fdfa", url: "https://web-homol.pontualpetroleo.com.br/gestao-espaco/",
    icon: (<svg {...ic} aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>),
  },
  {
    id: "compras",
    nome: "Gestão de Compras",
    cor: "#ea580c", bg: "#fff7ed", url: "https://web-homol.pontualpetroleo.com.br/gestao-compras/",
    icon: (<svg {...ic} aria-hidden="true"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>),
  },
  {
    id: "externos",
    nome: "Sistemas Externos",
    cor: "#0369a1", bg: "#f0f9ff", url: "https://web-homol.pontualpetroleo.com.br/sistemas-externos/",
    icon: (<svg {...ic} aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>),
  },
  {
    id: "instrucoes",
    nome: "Instruções de Acesso",
    cor: "#4d7c0f", bg: "#f7fee7", instrucoes: true,
    icon: (<svg {...ic} aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>),
  },
  {
    id: "site",
    nome: "Site Institucional",
    cor: "#b45309", bg: "#fffbeb", url: "https://www.pontualpetroleo.com.br",
    icon: (<svg {...ic} aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>),
  },
];

export default function Login() {
  const [email, setEmail]       = useState("");
  const [senha, setSenha]       = useState("");
  const [erro, setErro]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(true);
  const [tentativas, setTentativas]           = useState(0);
  const [tela, setTela]                       = useState("splash"); // "splash" | "intro" | "selecao" | "portao" | "login" | "intranet"
  const [busca, setBusca]                     = useState("");
  const [ringSpeed, setRingSpeed]             = useState("normal"); // "normal" | "fast" | "loading"
  const [sisAtivo, setSisAtivo]               = useState(null);     // sistema selecionado (tela de entrada)
  const [intranetStep, setIntranetStep]       = useState("checando"); // "checando" | "negado" | "chave" | "validando"
  const [intranetErro, setIntranetErro]       = useState("");
  const [intranetChave, setIntranetChave]     = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  // Abertura: logomarca grande → esmaece → mostra a intro (ícones + botão)
  useEffect(() => {
    document.title = "Intranet - Pontual Brasil Petróleo";
    const t = setTimeout(() => setTela(prev => (prev === "splash" ? "intro" : prev)), 2300);
    return () => clearTimeout(t);
  }, []);

  // Clique no botão da intro: acelera o giro (carregando) e então abre a seleção.
  function entrarIntranet() {
    setRingSpeed("loading");
    setTimeout(() => setTela("selecao"), 750);
  }

  // Ao clicar num card: mostra a tela de entrada (portão) daquele sistema.
  function abrirSistema(sis) {
    setSisAtivo(sis);
    setTela("portao");
  }

  // "Entrar no sistema" no portão: executa a ação do sistema selecionado.
  function entrarNoSistema(sis) {
    if (!sis) return;
    if (sis.interno) { setTela("login"); return; }
    if (sis.intranet) { iniciarPortaoIntranet(); return; }
    if (sis.instrucoes) { window.open("/instrucoes-acesso.pdf", "_blank", "noopener,noreferrer"); return; }
    if (sis.url) { window.open(sis.url, "_blank", "noopener,noreferrer"); return; }
  }

  // Portão da Intranet — passo 1: valida se a conexão vem da rede da base.
  // A validação roda no servidor (Cloud Function intranetGate).
  async function iniciarPortaoIntranet() {
    setTela("intranet");
    setIntranetStep("checando");
    setIntranetErro("");
    setIntranetChave("");
    try {
      await callFunction("intranetGate", {}); // sem palavra-chave → só valida a rede
      setIntranetStep("chave");
    } catch (err) {
      setIntranetStep("negado");
      setIntranetErro(err?.message || "Não foi possível validar seu acesso.");
    }
  }

  // Portão da Intranet — passo 2: valida a palavra-chave e libera a área interna.
  async function validarChaveIntranet(e) {
    e.preventDefault();
    if (!intranetChave.trim()) return;
    setIntranetStep("validando");
    setIntranetErro("");
    try {
      await callFunction("intranetGate", { keyword: intranetChave });
      sessionStorage.setItem("intranet_ok", "1");
      navigate("/intranet");
    } catch (err) {
      setIntranetStep("chave");
      setIntranetErro(err?.message || "Palavra-chave incorreta.");
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (tentativas >= 5) {
      setErro("Muitas tentativas. Aguarde alguns minutos ou recupere sua senha.");
      return;
    }
    setErro("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), senha);
      // Não navegamos aqui: ao autenticar, o AuthContext atualiza o usuário e a
      // PublicRoute ("/") redireciona sozinha para /dashboard. Isso evita a
      // corrida com o guard da rota, que antes jogava de volta para a principal.
      // Mantém "Entrando…" até o redirecionamento acontecer.
    } catch (err) {
      const novas = tentativas + 1;
      setTentativas(novas);
      if (err.code === "auth/too-many-requests") {
        setErro("Acesso bloqueado temporariamente pelo Firebase. Tente mais tarde.");
      } else if (err.code === "auth/user-disabled") {
        setErro("Esta conta está desativada. Contate o administrador.");
      } else if (novas >= 5) {
        setErro("Muitas tentativas incorretas. Aguarde alguns minutos.");
      } else {
        setErro(`E-mail ou senha incorretos. (${novas}/5 tentativas)`);
      }
      setLoading(false);
    }
  }

  const sistemasFiltrados = SISTEMAS.filter(
    (sis) => sis.nome.toLowerCase().includes(busca.trim().toLowerCase())
  );
  const destinoAtivo = !!(sisAtivo && (sisAtivo.interno || sisAtivo.intranet || sisAtivo.instrucoes || sisAtivo.url));

  return (
    <div className="login-shell">
      {/* Imagem de fundo fullscreen (cover) mais clara + leve overlay */}
      <div className="login-bg" aria-hidden="true" />
      <div className="login-overlay" aria-hidden="true" />

      {/* Splash de abertura: logomarca bem grande que esmaece */}
      {tela === "splash" && (
        <div className="login-splash">
          <div className="splash-logo"><LogoPontual height={112} variant="white" /></div>
        </div>
      )}

      {/* Intro: ícones orbitando em círculo + botão central para entrar na intranet */}
      {tela === "intro" && (
        <div className="login-intro fade-in">
          <div className={"login-ring " + ringSpeed}>
            <div className="orbit-spin">
              {SISTEMAS.map((sis, i) => {
                const a = i * 360 / SISTEMAS.length;
                return (
                  <div
                    key={sis.id}
                    className="orbit-slot"
                    style={{ transform: `rotate(${a}deg) translateX(150px) rotate(${-a}deg)` }}
                  >
                    <span className="orbit-badge">{sis.icon}</span>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="login-intro-center"
              onMouseEnter={() => setRingSpeed(s => (s === "loading" ? s : "fast"))}
              onMouseLeave={() => setRingSpeed(s => (s === "loading" ? s : "normal"))}
              onClick={entrarIntranet}
            >
              {ringSpeed === "loading" ? "Carregando…" : "Acesso a intranet"}
            </button>
          </div>
        </div>
      )}

      {/* Seleção de sistema: cards com ícone + nome, antes do login */}
      {tela === "selecao" && (
        <div className="login-select fade-in">
          <div className="login-select-logo">
            <LogoPontual height={38} variant="white" />
          </div>
          <h1 className="login-select-title">Intranet Pontual Petróleo</h1>
          <p className="login-select-sub">Selecione o sistema que deseja acessar.</p>
          <div className="login-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar sistema…" aria-label="Pesquisar sistema" autoFocus />
          </div>
          <div className="login-select-grid">
            {sistemasFiltrados.map(sis => (
              <button
                key={sis.id}
                type="button"
                className="login-select-card"
                onClick={() => abrirSistema(sis)}
              >
                <span className="login-select-ico" style={{ color: "#fff" }}>
                  {sis.icon}
                </span>
                <span className="login-select-nome">{sis.nome}</span>
                <span className="login-select-arrow" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </span>
              </button>
            ))}
          </div>
          {sistemasFiltrados.length === 0 && (
            <p className="login-noresult">Nenhum sistema encontrado.</p>
          )}
        </div>
      )}

      {/* Portão: tela de entrada de cada sistema (Trocar sistema + logo + nome + Entrar) */}
      {tela === "portao" && sisAtivo && (
        <>
          {/* Fora do container animado: aparece na hora, sem o delay do fade-in */}
          <button type="button" className="login-back" onClick={() => { setTela("selecao"); setSisAtivo(null); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Trocar sistema
          </button>
          <div className="login-gate fade-in">
          <div className="login-gate-logo">
            <LogoPontual height={54} variant="white" />
          </div>
          <p className="login-gate-tag">{sisAtivo.nome}</p>
          <button
            type="button"
            className="login-gate-btn"
            onClick={() => entrarNoSistema(sisAtivo)}
            disabled={!destinoAtivo}
          >
            {sisAtivo.instrucoes ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            )}
            {sisAtivo.instrucoes ? "Abrir instruções (PDF)" : destinoAtivo ? "Entrar no sistema" : "Em breve"}
          </button>
          </div>
        </>
      )}

      {/* Portão da Intranet: valida rede da base → pede palavra-chave → libera área interna */}
      {tela === "intranet" && (
        <>
          <button type="button" className="login-back" onClick={() => { setTela("selecao"); setSisAtivo(null); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Trocar sistema
          </button>
          <div className="login-gate fade-in">
            <div className="login-gate-logo"><LogoPontual height={54} variant="white" /></div>
            <p className="login-gate-tag">Gerenciamento de Sistemas — acesso restrito</p>

            {intranetStep === "checando" && (
              <div className="intranet-status">
                <span className="intranet-spin" aria-hidden="true" />
                <span>Validando sua rede…</span>
              </div>
            )}

            {intranetStep === "negado" && (
              <div className="intranet-box">
                <p className="login-erro" style={{ margin: 0 }}>{intranetErro}</p>
                <button type="button" className="login-gate-btn" onClick={iniciarPortaoIntranet}>
                  Tentar novamente
                </button>
              </div>
            )}

            {(intranetStep === "chave" || intranetStep === "validando") && (
              <form className="intranet-box" onSubmit={validarChaveIntranet}>
                <p className="intranet-hint">Rede validada. Informe a palavra-chave para entrar.</p>
                <input
                  className="login-input login-input-fill"
                  type="password"
                  value={intranetChave}
                  onChange={e => setIntranetChave(e.target.value)}
                  placeholder="Palavra-chave"
                  aria-label="Palavra-chave"
                  autoFocus
                  disabled={intranetStep === "validando"}
                />
                {intranetErro && <p className="login-erro" style={{ margin: 0 }}>{intranetErro}</p>}
                <button type="submit" className="login-gate-btn" disabled={intranetStep === "validando"}>
                  {intranetStep === "validando" ? "Validando…" : "Acessar"}
                </button>
              </form>
            )}
          </div>
        </>
      )}

      {/* Card de login */}
      {tela === "login" && (
      <div className="login-card fade-in">
        <button type="button" className="login-back login-back-dark" onClick={() => setTela("selecao")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Trocar sistema
        </button>
        <div className="login-logo-top">
          <LogoPontual height={40} />
        </div>

        <h1 className="login-title">Gestão Operacional</h1>
        <p className="login-sub">Página de acesso — entre com seu e-mail e senha.</p>

        <form onSubmit={handleLogin}>
          <div className="login-fg">
            <input
              id="login-email"
              className="login-input login-input-fill"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Digite seu e-mail"
              aria-label="E-mail"
              required
              autoFocus
            />
          </div>

          <div className="login-fg">
            <div className="login-senha-wrap">
              <input
                id="login-senha"
                className="login-input"
                type={verSenha ? "text" : "password"}
                autoComplete="current-password"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                aria-label="Senha"
                required
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setVerSenha(v => !v)}
                aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {verSenha ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 4.06-5.06"/>
                    <path d="M9.9 4.24A10.96 10.96 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-3.17 4.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="login-row">
            <label className="login-check">
              <input
                type="checkbox"
                checked={manterConectado}
                onChange={e => setManterConectado(e.target.checked)}
              />
              <span className="login-check-box" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
              <span className="login-check-text">Manter-me conectado</span>
            </label>
            <a className="login-link" href="#" onClick={(e) => e.preventDefault()}>
              Redefinir senha
            </a>
          </div>

          {erro && <p className="login-erro">{erro}</p>}

          <button
            className="login-btn"
            type="submit"
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="login-footer">
          <a className="login-foot-link" href="#" onClick={(e) => e.preventDefault()}>
            Termos e Condições
          </a>
          <a className="login-foot-link" href="#" onClick={(e) => e.preventDefault()}>
            Política de Privacidade
          </a>
          <p className="login-copy">
            © Todos os direitos reservados <strong>Pontual Petróleo</strong>
          </p>
        </div>
      </div>
      )}

      <style>{`
        .login-shell {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: var(--font);
          overflow: hidden;
        }

        /* Fundo cover — foto aérea Pontual */
        .login-bg {
          position: absolute; inset: 0;
          background: #2a3450 url("/melhor-foto-pontual.jpg") center center / cover no-repeat;
          transform: scale(1.05);
          filter: brightness(0.95) saturate(1.05);
          will-change: transform;
        }
        /* Overlay — escurece um pouco a foto p/ contraste dos cards de vidro */
        /* Fundo escuro com tom preto — igual nas três telas (intranet, entrar no sistema e login) */
        .login-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,.5);
        }

        /* ---- Portão: botão central sobre a foto ---- */
        .login-gate {
          position: relative; z-index: 2;
          display: flex; flex-direction: column; align-items: center; gap: 22px;
          text-align: center; padding: 24px;
        }
        .login-gate-logo { filter: drop-shadow(0 6px 20px rgba(0,0,0,.4)); }
        .login-gate-tag {
          margin: -4px 0 4px; color: rgba(255,255,255,.92);
          font-size: 1.02rem; font-weight: 600; letter-spacing: .01em;
          text-shadow: 0 2px 14px rgba(8,12,24,.55);
          text-align: center; max-width: 440px;
        }
        /* Botão do portão — mesmo estilo do "Trocar sistema" (pill de vidro translúcido) */
        .login-gate-btn {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 14px 30px; border-radius: 999px; cursor: pointer;
          font-size: 1rem; font-weight: 700; letter-spacing: .01em; color: #fff;
          background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.28);
          -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
          transition: background .15s var(--ease), transform .12s var(--ease);
        }
        .login-gate-btn:hover { background: rgba(255,255,255,.24); transform: translateY(-2px); }
        .login-gate-btn:active { transform: translateY(0); }
        .login-gate-btn:disabled { opacity: .55; cursor: not-allowed; }
        .login-gate-btn:disabled:hover { background: rgba(255,255,255,.14); transform: none; }

        /* ---- Portão da Intranet ---- */
        .intranet-box { display: flex; flex-direction: column; gap: 14px; align-items: stretch; width: 100%; max-width: 340px; }
        .intranet-hint { color: rgba(255,255,255,.9); font-size: .9rem; text-align: center; margin: 0; text-shadow: 0 2px 14px rgba(8,12,24,.5); }
        .intranet-status { display: flex; align-items: center; gap: 12px; color: rgba(255,255,255,.92); font-size: .95rem; font-weight: 600; text-shadow: 0 2px 14px rgba(8,12,24,.5); }
        .intranet-spin { width: 22px; height: 22px; border-radius: 50%; border: 3px solid rgba(255,255,255,.3); border-top-color: #fff; animation: intranet-spin .7s linear infinite; }
        @keyframes intranet-spin { to { transform: rotate(360deg); } }

        /* ---- Tela de seleção de sistema ---- */
        .login-select {
          position: relative; z-index: 2; width: 100%; max-width: 720px;
          padding: 24px; text-align: center;
        }
        .login-select-logo { display: flex; justify-content: center; margin-bottom: 22px; filter: drop-shadow(0 6px 20px rgba(0,0,0,.4)); }
        .login-select-title { color: #fff; font-size: 1.5rem; font-weight: 700; margin: 0 0 6px; letter-spacing: -.01em; text-shadow: 0 2px 16px rgba(8,12,24,.55); }
        .login-select-sub { color: rgba(255,255,255,.9); font-size: .95rem; margin: 0 0 24px; text-shadow: 0 2px 14px rgba(8,12,24,.5); }
        .login-select-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .login-select-card {
          display: flex; align-items: center; gap: 14px; text-align: left; width: 100%;
          padding: 18px; border-radius: 16px; cursor: pointer;
          background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.28);
          -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
          transition: background .15s var(--ease), transform .14s var(--ease);
        }
        .login-select-card:hover { background: rgba(255,255,255,.24); transform: translateY(-3px); }
        .login-select-card:active { transform: translateY(-1px); }
        .login-select-ico { width: 48px; height: 48px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .login-select-nome { flex: 1; font-size: .98rem; font-weight: 700; color: #fff; line-height: 1.25; }
        .login-select-arrow { color: rgba(255,255,255,.7); display: inline-flex; flex-shrink: 0; transition: transform .15s var(--ease), color .15s var(--ease); }
        .login-select-card:hover .login-select-arrow { color: #fff; transform: translateX(3px); }

        /* ---- Intro: ícones orbitando em círculo + botão central ---- */
        .login-intro { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; }
        .login-intro-logo { margin-bottom: 6px; filter: drop-shadow(0 6px 20px rgba(0,0,0,.4)); }

        /* ---- Splash de abertura: logomarca grande que esmaece ---- */
        .login-splash { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; }
        .splash-logo { filter: drop-shadow(0 10px 34px rgba(0,0,0,.5)); animation: splash-seq 2.3s var(--ease) forwards; }
        @keyframes splash-seq {
          0%   { opacity: 0; transform: scale(.84); }
          20%  { opacity: 1; transform: scale(1); }
          68%  { opacity: 1; transform: scale(1.03); }
          100% { opacity: 0; transform: scale(1.14); }
        }
        @media (max-width: 520px) { .splash-logo img { height: auto !important; max-width: 80vw; } }
        @media (prefers-reduced-motion: reduce) { .splash-logo { animation: none; } }
        .login-ring { position: relative; width: 360px; height: 360px; }
        .orbit-spin { position: absolute; inset: 0; animation: orbit-spin 26s linear infinite; }
        .orbit-slot { position: absolute; top: 50%; left: 50%; width: 0; height: 0; }
        .orbit-badge {
          position: absolute; transform: translate(-50%, -50%);
          animation: orbit-badge 26s linear infinite;
          width: 52px; height: 52px; border-radius: 14px;
          display: inline-flex; align-items: center; justify-content: center; color: #fff;
          background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.30);
          -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
          box-shadow: 0 8px 22px -10px rgba(0,0,0,.5);
        }
        @keyframes orbit-spin { to { transform: rotate(360deg); } }
        @keyframes orbit-badge {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        /* Mouse sobre o botão → gira mais rápido; ao clicar (loading) → mais rápido ainda */
        .login-ring.fast .orbit-spin,    .login-ring.fast .orbit-badge    { animation-duration: 8s; }
        .login-ring.loading .orbit-spin, .login-ring.loading .orbit-badge { animation-duration: 2.2s; }
        .login-intro-center {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 176px; height: 176px; border-radius: 50%; cursor: pointer; padding: 22px;
          display: inline-flex; align-items: center; justify-content: center; text-align: center;
          background: rgba(255,255,255,.14); color: #fff; font-weight: 700; font-size: .92rem; line-height: 1.35;
          border: 1px solid rgba(255,255,255,.28); font-family: var(--font);
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
          box-shadow: 0 0 0 0 rgba(255,255,255,.30), 0 18px 50px -12px rgba(0,0,0,.6);
          transition: transform .18s var(--ease), background .18s var(--ease);
          animation: intro-pulse 2.1s ease-out infinite;
        }
        @keyframes intro-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(255,255,255,.30), 0 18px 50px -12px rgba(0,0,0,.6); }
          70%  { box-shadow: 0 0 0 26px rgba(255,255,255,0),  0 18px 50px -12px rgba(0,0,0,.6); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0),     0 18px 50px -12px rgba(0,0,0,.6); }
        }
        .login-intro-center:hover { transform: translate(-50%, -50%) scale(1.05); background: rgba(255,255,255,.24); }
        @media (prefers-reduced-motion: reduce) { .orbit-spin, .orbit-badge, .login-intro-center { animation: none; } }
        @media (max-width: 480px) { .login-ring { transform: scale(.78); } }

        /* ---- Busca de sistema (na seleção) ---- */
        .login-search { position: relative; max-width: 420px; margin: 0 auto 20px; }
        .login-search svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,.7); }
        .login-search input {
          width: 100%; height: 46px; padding: 0 14px 0 42px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.14);
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
          color: #fff; font-size: .95rem; outline: none; font-family: var(--font);
        }
        .login-search input::placeholder { color: rgba(255,255,255,.65); }
        .login-search input:focus { border-color: rgba(255,255,255,.6); background: rgba(255,255,255,.2); box-shadow: 0 0 0 3px rgba(255,255,255,.14); }
        .login-noresult { color: rgba(255,255,255,.85); font-size: .9rem; margin-top: 8px; }

        /* Botão "trocar sistema" */
        .login-back {
          position: fixed; top: 18px; left: 18px; z-index: 3;
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,.14); color: #fff; border: 1px solid rgba(255,255,255,.28);
          border-radius: 999px; padding: 7px 14px; font-size: .82rem; font-weight: 600; cursor: pointer;
          -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
          transition: background .15s var(--ease);
        }
        .login-back:hover { background: rgba(255,255,255,.24); }
        .login-back-dark {
          position: static; margin: 0 0 10px; background: rgba(255,255,255,.14); color: #fff; border: 1px solid rgba(255,255,255,.28);
        }
        .login-back-dark:hover { background: rgba(255,255,255,.24); }

        /* ---- Card de login — mesmo vidro translúcido dos botões ---- */
        .login-card {
          position: relative; z-index: 2;
          width: 100%; max-width: 460px;
          padding: 34px 38px;
          border-radius: 20px;
          background: rgba(255,255,255,.14);
          border: 1px solid rgba(255,255,255,.28);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          backdrop-filter: blur(16px) saturate(140%);
          box-shadow: 0 24px 60px -20px rgba(10,14,40,.55);
          color: #fff;
        }

        .login-logo-top { margin-bottom: 12px; display: flex; justify-content: center; }

        .login-title {
          font-family: var(--font);
          font-size: 1.32rem; font-weight: 700; color: #fff;
          margin: 0 0 5px; letter-spacing: -0.02em; text-align: center;
          text-shadow: 0 1px 12px rgba(8,12,24,.4);
        }
        .login-sub {
          font-size: .84rem; color: rgba(255,255,255,.85);
          margin: 0 0 24px; line-height: 1.45; text-align: center;
        }

        .login-fg { margin-bottom: 17px; }
        .login-label {
          display: block; font-size: .74rem; font-weight: 700;
          letter-spacing: .04em; text-transform: uppercase;
          color: #475569; margin-bottom: 7px; text-align: center;
        }

        .login-input {
          width: 100%; height: 44px; padding: 0 14px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,.3);
          background: rgba(255,255,255,.12);
          -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
          font-size: .95rem; color: #fff; outline: none;
          transition: border-color .18s var(--ease), box-shadow .18s var(--ease), background .18s var(--ease);
        }
        .login-input::placeholder { color: rgba(255,255,255,.6); }
        .login-input:hover { background: rgba(255,255,255,.18); border-color: rgba(255,255,255,.45); }
        .login-input:focus {
          background: rgba(255,255,255,.22);
          border-color: rgba(255,255,255,.7);
          box-shadow: 0 0 0 3px rgba(255,255,255,.15);
        }
        /* Autofill do navegador — mantém texto branco e fundo coerente com o vidro */
        .login-input:-webkit-autofill,
        .login-input:-webkit-autofill:hover,
        .login-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff;
          caret-color: #fff;
          -webkit-box-shadow: 0 0 0 1000px rgba(60,74,110,.55) inset;
          transition: background-color 9999s ease-in-out 0s;
        }

        .login-senha-wrap { position: relative; }
        .login-senha-wrap .login-input { padding-right: 44px; }
        .login-eye {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 4px;
          color: rgba(255,255,255,.7); line-height: 0; display: inline-flex;
        }
        .login-eye:hover { color: #fff; }

        .login-row {
          display: flex; align-items: center; justify-content: space-between;
          margin: 8px 0 22px; flex-wrap: wrap; gap: 12px;
        }
        .login-check {
          display: inline-flex; align-items: center; gap: 9px;
          font-size: .85rem; color: rgba(255,255,255,.9);
          cursor: pointer; user-select: none; position: relative;
        }
        .login-check input { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
        .login-check-box {
          width: 19px; height: 19px; border-radius: 6px;
          background: #fff; color: #18216e;
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background .15s, border-color .15s, box-shadow .15s;
        }
        .login-check input:not(:checked) ~ .login-check-box {
          background: rgba(255,255,255,.14);
          border: 1.5px solid rgba(255,255,255,.5);
          color: transparent;
        }
        .login-check input:focus-visible ~ .login-check-box { box-shadow: 0 0 0 3px rgba(255,255,255,.3); }

        .login-link { font-size: .85rem; font-weight: 600; color: #fff; text-decoration: none; }
        .login-link:hover { color: rgba(255,255,255,.8); text-decoration: underline; }

        .login-erro {
          color: #b91c1c; background: rgba(254,226,226,.82);
          border: 1px solid #fca5a5; border-radius: 10px;
          padding: 10px 13px; font-size: .85rem; margin: 0 0 16px;
        }

        /* Botão "Entrar" — minimalista sólido navy */
        .login-btn {
          width: 100%; height: 46px; margin-top: 10px;
          color: #fff; border: none; border-radius: 10px;
          font-size: 1rem; font-weight: 700; letter-spacing: .01em; cursor: pointer;
          background: #18216e;
          box-shadow: 0 10px 24px -12px rgba(24,33,110,.6);
          transition: background .18s var(--ease), transform .06s, box-shadow .18s var(--ease);
        }
        .login-btn:hover { background: #141b57; box-shadow: 0 14px 30px -12px rgba(24,33,110,.7); }
        .login-btn:active { transform: translateY(1px); }
        .login-btn:disabled { cursor: not-allowed; opacity: .65; }

        .login-footer { margin-top: 24px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .login-foot-link { color: rgba(255,255,255,.7); font-size: .8rem; font-weight: 500; text-decoration: none; }
        .login-foot-link:hover { color: #fff; text-decoration: underline; }
        .login-copy { margin-top: 10px; font-size: .76rem; color: rgba(255,255,255,.7); text-align: center; }
        .login-copy strong { color: #fff; font-weight: 700; }

        @media (max-width: 640px) {
          .login-select-grid { grid-template-columns: 1fr; }
          .login-select-title { font-size: 1.25rem; }
        }
        @media (max-width: 480px) {
          .login-shell { padding: 16px; }
          .login-card { padding: 22px 22px; border-radius: 20px; }
          .login-title { font-size: 1.18rem; }
        }
      `}</style>
    </div>
  );
}
