// Portal da intranet (/sistemas): a grade de sistemas e o que vem depois de
// clicar num card.
//
// Fechado: só chega aqui quem passou pela palavra-chave em /acesso. Os links não
// vêm do código — vêm da API (PHP + PostgreSQL, na VPS), para poderem ser criados
// e desativados pelo painel de Configurações sem republicar o site.
//
// DUAS PORTAS, DUAS CREDENCIAIS — não confundir:
//   esta tela      → palavra-chave individual (sessão do portal)
//   card Configurações → usuário e senha de administrador (sessão do painel)
//   card Gestão Operacional → e-mail e senha do Firebase (o SGO é outro sistema)

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  tokenPortal, relerPortal, limparPortal,
  logarAdmin, guardarAdmin, pedirLocalizacao,
} from "../api/intranet";
import LogoPontual from "../components/LogoPontual";
import VidroLiquido, { useTamanho } from "../components/VidroLiquido";
import { iconePara } from "../data/icones";
import "./intranet.css";

export default function Sistemas() {
  // SGO (Firebase)
  const [email, setEmail] = useState("");
  const [senhaSgo, setSenhaSgo] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(true);
  const [tentativas, setTentativas] = useState(0);
  // Painel de Configurações
  const [usuario, setUsuario] = useState("");
  const [senhaAdm, setSenhaAdm] = useState("");
  const [admErro, setAdmErro] = useState("");
  const [entrandoAdm, setEntrandoAdm] = useState(false);
  // Portal
  const [tela, setTela] = useState("selecao");   // "selecao" | "portao" | "login" | "admin"
  const [busca, setBusca] = useState("");
  const [sisAtivo, setSisAtivo] = useState(null);
  const [links, setLinks] = useState(null);      // null = carregando
  const navigate = useNavigate();
  const { login, user } = useAuth();
  // Os cards da grade têm todos o mesmo tamanho, mas ele muda com a largura da
  // janela. Medir um deles basta — e o mapa de deslocamento precisa casar com o
  // elemento, senão a refração sai deslocada (o artigo alerta sobre isso).
  const [refCard, tamCard] = useTamanho();

  // Recarrega a sessão a cada montagem (inclusive num F5): quem revalida o token
  // — e de quebra a expiração e o bloqueio da chave — é o servidor.
  useEffect(() => {
    if (!tokenPortal()) { navigate("/acesso", { replace: true }); return; }
    (async () => {
      try {
        const r = await relerPortal();
        setLinks(r.links || []);
        document.title = "Intranet - Pontual Brasil Petróleo";
      } catch {
        limparPortal();
        navigate("/acesso", { replace: true });
      }
    })();
  }, [navigate]);

  // Depois de autenticar no SGO, leva ao sistema. Reagir ao `user` (em vez de
  // navegar dentro do handleLogin) evita a corrida com o guard da rota: só saímos
  // daqui quando o AuthContext já reconhece a sessão.
  useEffect(() => {
    if (user && tela === "login") navigate("/dashboard", { replace: true });
  }, [user, tela, navigate]);

  function abrirSistema(sis) {
    setSisAtivo(sis);
    setTela("portao");
  }

  // Executa a ação do card. Destinos externos abrem na mesma guia (_self).
  function entrarNoSistema(sis) {
    if (!sis) return;
    switch (sis.tipo) {
      case "interno":
        // Quem já tem sessão do SGO não precisa ver o login de novo.
        if (user) navigate("/dashboard"); else setTela("login");
        return;
      case "config":
        setUsuario(""); setSenhaAdm(""); setAdmErro(""); setTela("admin");
        return;
      case "instrucoes":
      case "url":
        if (sis.url) window.open(sis.url, "_self");
        return;
      default:
        // "subsecoes" resolve nos botões do portão, não aqui.
    }
  }

  function abrirSubsecao(sub) {
    if (!sub?.url) return;
    window.open(sub.url, "_self");
  }

  async function entrarNoPainel(e) {
    e.preventDefault();
    if (!usuario.trim() || !senhaAdm || entrandoAdm) return;
    setEntrandoAdm(true);
    setAdmErro("");
    try {
      const coords = await pedirLocalizacao();
      const r = await logarAdmin(usuario, senhaAdm, coords);
      guardarAdmin(r.token);
      navigate("/intranet");
    } catch (err) {
      setAdmErro(err?.message || "Não foi possível entrar.");
      setEntrandoAdm(false);
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
      await login(email, senhaSgo);
      // Não navegamos aqui: quem leva ao /dashboard é o efeito acima, quando o
      // AuthContext confirma a sessão. Mantém "Entrando…" até lá.
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

  function sairDoPortal() {
    limparPortal();
    navigate("/acesso", { replace: true });
  }

  // A busca casa com o nome do card e o das subseções, para que um termo conhecido
  // ("apresentações") continue achando o card mesmo depois de renomeado.
  const filtrados = (links || []).filter((sis) => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    const alvo = [sis.nome, ...(sis.subsecoes?.map((s) => s.nome) ?? [])].join(" ").toLowerCase();
    return alvo.includes(termo);
  });
  const temDestino = !!(sisAtivo && (sisAtivo.tipo === "interno" || sisAtivo.tipo === "config" || sisAtivo.url));
  const voltar = () => { setTela("selecao"); setSisAtivo(null); };

  if (links === null) {
    return (
      <div className="login-shell">
        <div className="login-bg" aria-hidden="true" />
        <div className="login-overlay" aria-hidden="true" />
        <div className="login-gate fade-in">
          <div className="intranet-status"><span className="intranet-spin" aria-hidden="true" /><span>Carregando…</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      {/* Um filtro só para os 12 cards: todos têm o mesmo tamanho na grade, e
          gerar o mapa de deslocamento é caro — 12 mapas seria desperdício. */}
      {tamCard && (
        <VidroLiquido id="vidro-card" largura={tamCard.largura} altura={tamCard.altura} raio={16} bisel={13} escala={18} desfoque={6} />
      )}

      <div className="login-bg" aria-hidden="true" />
      <div className="login-overlay" aria-hidden="true" />

      {tela === "selecao" && (
        <div className="login-select fade-in">
          <button type="button" className="login-back" onClick={sairDoPortal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Sair
          </button>
          <div className="login-select-logo"><LogoPontual height={38} variant="white" /></div>
          <h1 className="login-select-title">Intranet Pontual Petróleo</h1>
          <p className="login-select-sub">Selecione o sistema que deseja acessar.</p>
          <div className="login-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar sistema…" aria-label="Pesquisar sistema" autoFocus />
          </div>
          <div className="login-select-grid">
            {filtrados.map((sis, i) => {
              const Icone = iconePara(sis.icone);
              return (
                <button key={sis.id} ref={i === 0 ? refCard : undefined} type="button" className="login-select-card" onClick={() => abrirSistema(sis)}>
                  <span className="login-select-ico" style={{ color: "#fff" }}><Icone width={26} height={26} strokeWidth={2} /></span>
                  <span className="login-select-nome">{sis.nome}</span>
                  <span className="login-select-arrow" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </span>
                </button>
              );
            })}
          </div>
          {filtrados.length === 0 && (
            <p className="login-noresult">{links.length === 0 ? "Nenhum sistema cadastrado ainda." : "Nenhum sistema encontrado."}</p>
          )}
        </div>
      )}

      {tela === "portao" && sisAtivo && (
        <>
          <button type="button" className="login-back" onClick={voltar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Trocar sistema
          </button>
          <div className="login-gate fade-in">
            <div className="login-gate-logo"><LogoPontual height={54} variant="white" /></div>
            <p className="login-gate-tag">{sisAtivo.nome}</p>
            {sisAtivo.tipo === "subsecoes" ? (
              <div className="login-gate-opcoes">
                {(sisAtivo.subsecoes || []).map((sub) => (
                  <button key={sub.id} type="button" className="login-gate-btn" onClick={() => abrirSubsecao(sub)} disabled={!sub.url}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                    {sub.url ? sub.nome : `${sub.nome} — Em breve`}
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" className="login-gate-btn" onClick={() => entrarNoSistema(sisAtivo)} disabled={!temDestino}>
                {sisAtivo.tipo === "instrucoes" ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 18 15 15" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                )}
                {sisAtivo.tipo === "instrucoes" ? "Abrir instruções (PDF)" : temDestino ? "Entrar no sistema" : "Em breve"}
              </button>
            )}
          </div>
        </>
      )}

      {/* Porta das Configurações: usuário e senha de administrador — não é a
          palavra-chave do portal, que já foi usada lá atrás em /acesso. */}
      {tela === "admin" && (
        <>
          <button type="button" className="login-back" onClick={voltar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Trocar sistema
          </button>
          <div className="login-gate fade-in">
            <div className="login-gate-logo"><LogoPontual height={54} variant="white" /></div>
            <p className="login-gate-tag">Configurações — acesso de administrador</p>
            <form className="intranet-box" onSubmit={entrarNoPainel}>
              <input className="login-input login-input-fill" type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)}
                placeholder="Usuário" aria-label="Usuário" autoFocus autoComplete="username" disabled={entrandoAdm} />
              <input className="login-input login-input-fill" type="password" value={senhaAdm} onChange={(e) => setSenhaAdm(e.target.value)}
                placeholder="Senha" aria-label="Senha" autoComplete="current-password" disabled={entrandoAdm} />
              {admErro && <p className="login-erro" style={{ margin: 0 }}>{admErro}</p>}
              <button type="submit" className="login-gate-btn" disabled={entrandoAdm || !usuario.trim() || !senhaAdm}>
                {entrandoAdm ? "Entrando…" : "Entrar"}
              </button>
            </form>
          </div>
        </>
      )}

      {tela === "login" && (
        <div className="login-card fade-in">
          <button type="button" className="login-back login-back-dark" onClick={() => setTela("selecao")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Trocar sistema
          </button>
          <div className="login-logo-top"><LogoPontual height={40} /></div>
          <h1 className="login-title">Gestão Operacional</h1>
          <p className="login-sub">Página de acesso — entre com seu e-mail e senha.</p>

          <form onSubmit={handleLogin}>
            <div className="login-fg">
              <input id="login-email" className="login-input login-input-fill" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Digite seu e-mail" aria-label="E-mail" required autoFocus />
            </div>
            <div className="login-fg">
              <div className="login-senha-wrap">
                <input id="login-senha" className="login-input" type={verSenha ? "text" : "password"} value={senhaSgo} onChange={(e) => setSenhaSgo(e.target.value)} placeholder="Digite sua senha" aria-label="Senha" required />
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
      )}
    </div>
  );
}
