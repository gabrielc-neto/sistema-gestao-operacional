// Porta de entrada do Sistema de Gestão Operacional.
// Login direto (sem portal de intranet / seleção de sistema): e-mail + senha
// contra o backend Express + PostgreSQL local/VPS.
//
// Depois de autenticar, quem leva ao /dashboard é o efeito que reage ao `user`
// (mesma estratégia do antigo Sistemas.jsx) para evitar a corrida com o guard
// da rota PrivateRoute.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LogoPontual from "../components/LogoPontual";
import "./intranet.css";

export default function LoginSGO() {
  const [email, setEmail]       = useState("");
  const [senha, setSenha]       = useState("");
  const [erro, setErro]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(true);
  const [tentativas, setTentativas]           = useState(0);
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    document.title = "Sistema de Gestão Logístico - Pontual Petróleo";
  }, []);

  // Depois de autenticar, segue para o sistema (evita corrida com o guard da rota).
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

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
      // Não navegamos aqui: quem leva ao /dashboard é o efeito acima.
    } catch (err) {
      const novas = tentativas + 1;
      setTentativas(novas);
      if (err.code === "auth/too-many-requests") setErro("Acesso bloqueado temporariamente pelo Firebase. Tente mais tarde.");
      else if (err.code === "auth/user-disabled") setErro("Esta conta está desativada. Contate o administrador.");
      else if (novas >= 5) setErro("Muitas tentativas incorretas. Aguarde alguns minutos.");
      else setErro(`E-mail ou senha incorretos. (${novas}/5 tentativas)`);
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-bg" aria-hidden="true" />
      <div className="login-overlay" aria-hidden="true" />

      <div className="login-card fade-in">
        <div className="login-logo-top"><LogoPontual height={40} /></div>

        <h1 className="login-title">Sistema de Gestão Logístico</h1>
        <p className="login-sub">Entre com seu e-mail e senha para acessar o sistema.</p>

        <form onSubmit={handleLogin}>
          <div className="login-fg">
            <input id="login-email" className="login-input login-input-fill" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Digite seu e-mail" aria-label="E-mail" required autoFocus />
          </div>
          <div className="login-fg">
            <div className="login-senha-wrap">
              <input id="login-senha" className="login-input" type={verSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Digite sua senha" aria-label="Senha" required />
              <button type="button" className="login-eye" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}>
                {verSenha ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 4.06-5.06" /><path d="M9.9 4.24A10.96 10.96 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-3.17 4.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          <div className="login-row">
            <label className="login-check">
              <input type="checkbox" checked={manterConectado} onChange={(e) => setManterConectado(e.target.checked)} />
              <span className="login-check-box" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              <span className="login-check-text">Manter-me conectado</span>
            </label>
            <a className="login-link" href="#" onClick={(e) => e.preventDefault()}>Redefinir senha</a>
          </div>
          {erro && <p className="login-erro">{erro}</p>}
          <button className="login-btn" type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="login-footer">
          <a className="login-foot-link" href="#" onClick={(e) => e.preventDefault()}>Termos e Condições</a>
          <a className="login-foot-link" href="#" onClick={(e) => e.preventDefault()}>Política de Privacidade</a>
          <p className="login-copy">© Todos os direitos reservados <strong>Pontual Petróleo</strong></p>
        </div>
      </div>
    </div>
  );
}
