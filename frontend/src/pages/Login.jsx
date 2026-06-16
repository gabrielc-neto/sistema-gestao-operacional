import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LogoPontual from "../components/LogoPontual";
import LoginPainel from "../components/LoginPainel";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [senha, setSenha]       = useState("");
  const [erro, setErro]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(true);
  const [tentativas, setTentativas]           = useState(0);
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
      <div className="login-wrap">
        {/* COLUNA ESQUERDA — FORMULÁRIO */}
        <div className="login-form-col">
          <div className="login-form-inner">
            <div className="login-logo-top">
              <LogoPontual height={42} />
            </div>

            <h1 className="login-title">Bem-vindo</h1>
            <p className="login-sub">Acesse sua conta e continue de onde parou.</p>

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
        </div>

        {/* COLUNA DIREITA — IMAGEM INSTITUCIONAL
            Por padrão tenta `/login-tanques.jpg`. Se não existir, cai no SVG.
            Pra trocar a foto: jogar arquivo em frontend/public/login-tanques.jpg
            Pra forçar SVG: <LoginPainel forcarSvg /> */}
        <div className="login-img-col" aria-hidden="true">
          <div className="login-img-frame">
            <LoginPainel src="/login-tanques.png" />
          </div>
        </div>
      </div>

      <style>{`
        :root {
          --pt-navy:       #1a3a8c;
          --pt-navy-deep:  #0d1f4a;
          --pt-yellow:     #f5c318;
          --pt-bg:         #f3f5f8;
          --pt-input-fill: #e9f0fa;
          --pt-border:     #e2e8f0;
          --pt-text:       #1a1a2e;
          --pt-text-sub:   #64748b;
          --pt-text-soft:  #94a3b8;
        }

        * { box-sizing: border-box; }

        .login-shell {
          min-height: 100vh;
          background: var(--pt-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          color: var(--pt-text);
        }

        .login-wrap {
          width: 100%;
          max-width: 1200px;
          display: grid;
          grid-template-columns: 45% 55%;
          gap: 32px;
          align-items: center;
        }

        /* ================= ESQUERDA — FORM ================= */
        .login-form-col {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 8px;
        }
        .login-form-inner {
          width: 100%;
          max-width: 380px;
        }

        .login-logo-top { margin-bottom: 40px; }

        .login-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #000;
          margin: 0 0 6px;
          letter-spacing: -0.01em;
        }
        .login-sub {
          font-size: .875rem;
          color: var(--pt-text-sub);
          margin: 0 0 32px;
          line-height: 1.45;
        }

        .login-fg { margin-bottom: 16px; }

        .login-label {
          display: block;
          font-size: .82rem;
          font-weight: 500;
          color: #475569;
          margin-bottom: 6px;
        }

        .login-input {
          width: 100%;
          height: 40px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid var(--pt-border);
          background: #fff;
          font-size: .92rem;
          color: var(--pt-text);
          outline: none;
          transition: border-color .15s, box-shadow .15s, background .15s;
        }
        .login-input::placeholder { color: var(--pt-text-soft); }
        .login-input:focus {
          border-color: var(--pt-navy);
          box-shadow: 0 0 0 3px rgba(26, 58, 140, 0.12);
        }
        .login-input-fill {
          background: var(--pt-input-fill);
          border-color: transparent;
        }
        .login-input-fill:focus {
          background: #fff;
          border-color: var(--pt-navy);
        }

        .login-senha-wrap { position: relative; }
        .login-senha-wrap .login-input { padding-right: 42px; }
        .login-eye {
          position: absolute; right: 8px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer;
          padding: 4px;
          color: #94a3b8;
          line-height: 0;
          display: inline-flex;
        }
        .login-eye:hover { color: #64748b; }

        .login-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 14px 0 22px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .login-check {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: .85rem;
          color: #334155;
          cursor: pointer;
          user-select: none;
          position: relative;
        }
        .login-check input {
          position: absolute;
          opacity: 0;
          width: 0; height: 0;
          pointer-events: none;
        }
        .login-check-box {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          background: var(--pt-navy);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background .15s;
        }
        .login-check input:not(:checked) ~ .login-check-box {
          background: #fff;
          border: 1.5px solid #cbd5e1;
          color: transparent;
        }
        .login-link {
          font-size: .85rem;
          font-weight: 600;
          color: #000;
          text-decoration: none;
        }
        .login-link:hover { color: var(--pt-navy); text-decoration: underline; }

        .login-erro {
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: .85rem;
          margin: 0 0 14px;
        }

        .login-btn {
          width: 100%;
          height: 48px;
          background: var(--pt-navy-deep);
          color: #fff;
          border: none;
          border-radius: 999px;
          font-size: .98rem;
          font-weight: 700;
          letter-spacing: .02em;
          cursor: pointer;
          transition: background .15s, transform .05s, box-shadow .15s;
        }
        .login-btn:hover  { background: var(--pt-navy); }
        .login-btn:active { transform: translateY(1px); }
        .login-btn:disabled { cursor: not-allowed; }

        .login-footer {
          margin-top: 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .login-foot-link {
          color: #000;
          font-size: .82rem;
          font-weight: 600;
          text-decoration: none;
        }
        .login-foot-link:hover { color: var(--pt-navy); text-decoration: underline; }
        .login-copy {
          margin-top: 12px;
          font-size: .78rem;
          color: var(--pt-text-sub);
          text-align: center;
        }
        .login-copy strong { color: var(--pt-text); font-weight: 700; }

        /* ================= DIREITA — IMAGEM ================= */
        .login-img-col {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100%;
        }
        .login-img-frame {
          width: 100%;
          max-width: 620px;
          aspect-ratio: 4 / 5;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 18px 50px rgba(13, 31, 74, 0.18);
          background: #0d1f4a;
          position: relative;
        }
        .login-img-frame > svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* ================= RESPONSIVO ================= */
        @media (max-width: 960px) {
          .login-wrap { grid-template-columns: 1fr; gap: 0; }
          .login-img-col { display: none; }
        }
        @media (max-width: 480px) {
          .login-shell { padding: 0; }
          .login-form-col { padding: 36px 24px; min-height: 100vh; }
          .login-logo-top { margin-bottom: 32px; }
        }
      `}</style>
    </div>
  );
}
