import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LogoPontual from "../components/LogoPontual";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [senha, setSenha]       = useState("");
  const [erro, setErro]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(true);
  const [tentativas, setTentativas]           = useState(0);
  const [aberto, setAberto]                   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    if (tentativas >= 5) {
      setErro("Muitas tentativas. Aguarde alguns minutos ou recupere sua senha.");
      return;
    }
    setErro("");
    setLoading(true);
    try {
      await login(email, senha);
      navigate("/dashboard");
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      {/* Imagem de fundo fullscreen (cover) mais clara + leve overlay */}
      <div className="login-bg" aria-hidden="true" />
      <div className="login-overlay" aria-hidden="true" />

      {/* Portão: só o botão central sobre a foto, antes de abrir o login */}
      {!aberto && (
        <div className="login-gate fade-in">
          <div className="login-gate-logo">
            <LogoPontual height={54} variant="white" />
          </div>
          <p className="login-gate-tag">Sistema de Gestão Operacional</p>
          <button
            type="button"
            className="login-gate-btn"
            onClick={() => setAberto(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Entrar no sistema
          </button>
        </div>
      )}

      {/* Card liquid glass luminoso */}
      {aberto && (
      <div className="login-card fade-in">
        <div className="login-logo-top">
          <LogoPontual height={40} />
        </div>

        <h1 className="login-title">Bem-vindo de volta</h1>
        <p className="login-sub">Acesse o Sistema de Gestão Operacional.</p>

        <form onSubmit={handleLogin}>
          <div className="login-fg">
            <label className="login-label" htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              className="login-input login-input-fill"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="logistica01@pontualpetroleo.com.br"
              required
              autoFocus
            />
          </div>

          <div className="login-fg">
            <label className="login-label" htmlFor="login-senha">Senha</label>
            <div className="login-senha-wrap">
              <input
                id="login-senha"
                className="login-input"
                type={verSenha ? "text" : "password"}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Digite sua senha"
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
          filter: brightness(1.05) saturate(1.05);
          will-change: transform;
        }
        /* Overlay leve — mantém a foto visível e clara */
        .login-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(125deg, rgba(28,38,64,.28) 0%, rgba(15,21,38,.40) 55%, rgba(22,28,46,.48) 100%);
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
        }
        /* Botão do portão = mesmo liquid glass do box de login */
        .login-gate-btn {
          display: inline-flex; align-items: center; gap: 11px;
          padding: 16px 34px; border-radius: 16px; cursor: pointer;
          font-size: 1.02rem; font-weight: 700; letter-spacing: .01em; color: #18216e;
          background:
            linear-gradient(125deg, rgba(255,255,255,.6) 0%, rgba(255,255,255,0) 42%),
            radial-gradient(140% 120% at 100% 0%, rgba(127,196,214,.2) 0%, rgba(127,196,214,0) 55%),
            linear-gradient(155deg, rgba(247,251,255,.72) 0%, rgba(233,241,249,.52) 100%);
          -webkit-backdrop-filter: blur(30px) saturate(190%);
          backdrop-filter: blur(30px) saturate(190%);
          border: 1px solid rgba(255,255,255,.78);
          box-shadow:
            0 20px 48px -16px rgba(10,14,40,.55),
            inset 0 1.5px 1px rgba(255,255,255,1),
            inset 0 0 0 1px rgba(255,255,255,.3),
            inset 0 -14px 30px rgba(143,166,207,.16);
          transition: transform .12s var(--ease), box-shadow .2s var(--ease), background .2s var(--ease);
        }
        .login-gate-btn:hover {
          transform: translateY(-2px);
          background:
            linear-gradient(125deg, rgba(255,255,255,.7) 0%, rgba(255,255,255,0) 42%),
            radial-gradient(140% 120% at 100% 0%, rgba(127,196,214,.3) 0%, rgba(127,196,214,0) 55%),
            linear-gradient(155deg, rgba(249,252,255,.82) 0%, rgba(236,243,250,.64) 100%);
          box-shadow:
            0 26px 56px -16px rgba(10,14,40,.62),
            0 0 0 3px rgba(14,165,196,.32),
            inset 0 1.5px 1px rgba(255,255,255,1),
            inset 0 0 0 1px rgba(255,255,255,.4),
            inset 0 -14px 30px rgba(143,166,207,.2);
        }
        .login-gate-btn:active { transform: translateY(0); }

        /* ---- Card liquid glass (mais opaco / especular) ---- */
        .login-card {
          position: relative; z-index: 2;
          width: 100%; max-width: 420px;
          padding: 42px 38px;
          border-radius: 24px;
          background:
            linear-gradient(125deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 34%),          /* streak especular */
            radial-gradient(130% 110% at 100% 6%, rgba(127,196,214,.16) 0%, rgba(127,196,214,0) 44%),  /* refração ciano */
            radial-gradient(120% 120% at 0% 100%, rgba(143,166,207,.16) 0%, rgba(143,166,207,0) 46%),  /* refração azul-lunar */
            linear-gradient(160deg, rgba(249,252,255,.90) 0%, rgba(237,244,251,.82) 100%);         /* base leitosa fria */
          -webkit-backdrop-filter: blur(46px) saturate(210%);
          backdrop-filter: blur(46px) saturate(210%);
          border: 1px solid rgba(255,255,255,.9);
          box-shadow:
            0 28px 64px -16px rgba(15,23,42,.5),
            0 2px 10px -4px rgba(15,23,42,.22),
            inset 0 1.5px 1px rgba(255,255,255,1),
            inset 0 0 0 1px rgba(255,255,255,.35),
            inset 0 -22px 44px rgba(143,166,207,.14);
          color: #0f172a;
        }

        .login-logo-top { margin-bottom: 26px; display: flex; justify-content: center; }

        .login-title {
          font-family: var(--font);
          font-size: 1.6rem; font-weight: 700; color: #0f172a;
          margin: 0 0 6px; letter-spacing: -0.02em; text-align: center;
        }
        .login-sub {
          font-size: .9rem; color: #475569;
          margin: 0 0 28px; line-height: 1.5; text-align: center;
        }

        .login-fg { margin-bottom: 16px; }
        .login-label {
          display: block; font-size: .74rem; font-weight: 700;
          letter-spacing: .04em; text-transform: uppercase;
          color: #475569; margin-bottom: 7px; text-align: center;
        }

        .login-input {
          width: 100%; height: 46px; padding: 0 15px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,.85);
          background: rgba(255,255,255,.55);
          -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
          font-size: .95rem; color: #0f172a; outline: none;
          transition: border-color .18s var(--ease), box-shadow .18s var(--ease), background .18s var(--ease);
        }
        .login-input::placeholder { color: #7c879b; }
        .login-input:hover { background: rgba(255,255,255,.72); }
        .login-input:focus {
          background: rgba(255,255,255,.9);
          border-color: #5f72d6;
          box-shadow: 0 0 0 3px rgba(24,33,110,.18);
        }

        .login-senha-wrap { position: relative; }
        .login-senha-wrap .login-input { padding-right: 44px; }
        .login-eye {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 4px;
          color: #64748b; line-height: 0; display: inline-flex;
        }
        .login-eye:hover { color: #18216e; }

        .login-row {
          display: flex; align-items: center; justify-content: space-between;
          margin: 6px 0 22px; flex-wrap: wrap; gap: 12px;
        }
        .login-check {
          display: inline-flex; align-items: center; gap: 9px;
          font-size: .85rem; color: #334155;
          cursor: pointer; user-select: none; position: relative;
        }
        .login-check input { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
        .login-check-box {
          width: 19px; height: 19px; border-radius: 6px;
          background: #18216e; color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background .15s, border-color .15s, box-shadow .15s;
        }
        .login-check input:not(:checked) ~ .login-check-box {
          background: rgba(255,255,255,.55);
          border: 1.5px solid #b3bccd;
          color: transparent;
        }
        .login-check input:focus-visible ~ .login-check-box { box-shadow: 0 0 0 3px rgba(24,33,110,.28); }

        .login-link { font-size: .85rem; font-weight: 600; color: #18216e; text-decoration: none; }
        .login-link:hover { color: #2a37a0; text-decoration: underline; }

        .login-erro {
          color: #b91c1c; background: rgba(254,226,226,.82);
          border: 1px solid #fca5a5; border-radius: 10px;
          padding: 10px 13px; font-size: .85rem; margin: 0 0 16px;
        }

        .login-btn {
          width: 100%; height: 50px; margin-top: 4px;
          background: linear-gradient(135deg, #2a37a0 0%, #18216e 100%);
          color: #fff; border: none; border-radius: 12px;
          font-size: 1rem; font-weight: 700; letter-spacing: .01em; cursor: pointer;
          box-shadow: 0 14px 30px -12px rgba(24,33,110,.6), inset 0 1px 0 rgba(255,255,255,.18);
          transition: filter .18s var(--ease), transform .06s, box-shadow .18s var(--ease);
        }
        .login-btn:hover { filter: brightness(1.1); box-shadow: 0 18px 38px -12px rgba(24,33,110,.72), inset 0 1px 0 rgba(255,255,255,.24); }
        .login-btn:active { transform: translateY(1px); }
        .login-btn:disabled { cursor: not-allowed; filter: saturate(.7); }

        .login-footer { margin-top: 28px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .login-foot-link { color: #475569; font-size: .8rem; font-weight: 500; text-decoration: none; }
        .login-foot-link:hover { color: #18216e; text-decoration: underline; }
        .login-copy { margin-top: 10px; font-size: .76rem; color: #64748b; text-align: center; }
        .login-copy strong { color: #0f172a; font-weight: 700; }

        @media (max-width: 480px) {
          .login-shell { padding: 16px; }
          .login-card { padding: 32px 24px; border-radius: 20px; }
          .login-title { font-size: 1.4rem; }
        }
      `}</style>
    </div>
  );
}
