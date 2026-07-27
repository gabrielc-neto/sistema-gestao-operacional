// Porta de entrada da intranet (/acesso): splash, anel de ícones e o portão.
//
// O portal é fechado: clicar em "Acesso a intranet" pede a palavra-chave
// individual da pessoa. Quem valida é a API — chave, expiração (3 meses),
// horário, bloqueio e rede são checados no servidor, porque no cliente
// qualquer um contornaria pelo DevTools. Aqui só coletamos e mostramos.

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LogoPontual from "../components/LogoPontual";
import VidroLiquido from "../components/VidroLiquido";
import { entrarNoPortal, guardarPortal, pedirLocalizacao } from "../api/intranet";
import { ICONES } from "../data/icones";
import "./intranet.css";

// Ícones do anel — decorativos. A lista real de sistemas só chega depois da
// palavra-chave, e o anel nunca foi dado: sempre foi animação.
const ANEL = [
  "engrenagem", "escudo", "caminhao", "suporte", "prancheta", "grade",
  "apresentacao", "quadrantes", "carrinho", "externo", "ajuda", "globo",
];

export default function Acesso() {
  const [tela, setTela] = useState("splash");           // "splash" | "intro" | "chave"
  const [ringSpeed, setRingSpeed] = useState("normal"); // "normal" | "fast" | "loading"
  const [chave, setChave] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);
  const navigate = useNavigate();
  const saida = useRef(null);

  useEffect(() => {
    document.title = "Intranet - Pontual Brasil Petróleo";
    const t = setTimeout(() => setTela((p) => (p === "splash" ? "intro" : p)), 2300);
    return () => clearTimeout(t);
  }, []);

  // O timer troca de tela. Se a página sair de cena antes dele disparar (voltar
  // no navegador, por exemplo), mexer em estado depois seria bug.
  useEffect(() => () => clearTimeout(saida.current), []);

  function abrirPortao() {
    setRingSpeed("loading");
    saida.current = setTimeout(() => setTela("chave"), 750);
  }

  async function entrar(e) {
    e.preventDefault();
    if (!chave.trim() || entrando) return;
    setEntrando(true);
    setErro("");
    try {
      // A localização é opcional e não bloqueia: negada ou demorada, segue null.
      const coords = await pedirLocalizacao();
      const r = await entrarNoPortal(chave, coords);
      guardarPortal(r.token);
      navigate("/sistemas");
    } catch (err) {
      setErro(err?.message || "Não foi possível validar seu acesso.");
      setEntrando(false);
    }
  }

  return (
    <div className="login-shell">
      {/* Filtros de vidro líquido. Um por tamanho, não um por elemento: gerar o
          mapa de deslocamento é caro, e os 12 ícones do anel são idênticos.
          Tamanhos batem com o intranet.css — 52px o ícone, 176px o botão; o mapa
          precisa casar com o elemento (o backdrop-filter não se ajusta sozinho). */}
      <VidroLiquido id="vidro-badge" largura={52} altura={52} raio={14} bisel={11} escala={14} desfoque={5} />
      <VidroLiquido id="vidro-botao" largura={176} altura={176} raio={88} bisel={34} escala={90} desfoque={2} />

      <div className="login-bg" aria-hidden="true" />
      <div className="login-overlay" aria-hidden="true" />

      {tela === "splash" && (
        <div className="login-splash">
          <div className="splash-logo"><LogoPontual height={112} variant="white" /></div>
        </div>
      )}

      {tela === "intro" && (
        <div className="login-intro fade-in">
          <div className={"login-ring " + ringSpeed}>
            <div className="orbit-spin">
              {ANEL.map((nome, i) => {
                const a = (i * 360) / ANEL.length;
                const Icone = ICONES[nome];
                return (
                  <div
                    key={nome}
                    className="orbit-slot"
                    style={{ transform: `rotate(${a}deg) translateX(150px) rotate(${-a}deg)` }}
                  >
                    <span className="orbit-badge"><Icone width={26} height={26} strokeWidth={2} /></span>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="login-intro-center"
              onMouseEnter={() => setRingSpeed((s) => (s === "loading" ? s : "fast"))}
              onMouseLeave={() => setRingSpeed((s) => (s === "loading" ? s : "normal"))}
              onClick={abrirPortao}
            >
              {ringSpeed === "loading" ? "Carregando…" : "Acesso a intranet"}
            </button>
          </div>
        </div>
      )}

      {tela === "chave" && (
        <>
          <button type="button" className="login-back" onClick={() => { setTela("intro"); setRingSpeed("normal"); setErro(""); setChave(""); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Voltar
          </button>
          <div className="login-gate fade-in">
            <div className="login-gate-logo"><LogoPontual height={54} variant="white" /></div>
            <p className="login-gate-tag">Informe sua palavra-chave para acessar a intranet</p>

            <form className="intranet-box" onSubmit={entrar}>
              <input
                className="login-input login-input-fill"
                type="password"
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                placeholder="Palavra-chave"
                aria-label="Palavra-chave"
                autoFocus
                disabled={entrando}
              />
              {erro && <p className="login-erro" style={{ margin: 0 }}>{erro}</p>}
              <button type="submit" className="login-gate-btn" disabled={entrando || !chave.trim()}>
                {entrando ? "Validando…" : "Entrar"}
              </button>
              <p className="intranet-hint">
                Sua palavra-chave é pessoal e vale por 3 meses. O acesso fica registrado
                com horário e localização.
              </p>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
