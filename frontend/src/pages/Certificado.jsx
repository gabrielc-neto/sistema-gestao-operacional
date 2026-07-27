// Sistema de Certificados (/certificado).
//
// UM sistema, DUAS portas — do mesmo jeito que o resto da intranet:
//
//   COLABORADOR (e qualquer pessoa de fora)  → entra direto, sem login, e
//     confere um certificado pelo código impresso nele. É a tela inicial.
//
//   ADMINISTRADOR  → "Área administrativa", com usuário e senha, e aí emite,
//     corrige e cancela certificados (components/CertificadosPainel.jsx).
//
// A porta aberta é de propósito, e é o ponto do sistema: quem confere um
// certificado costuma estar FORA da empresa — o cliente que recebeu o currículo,
// o auditor, a transportadora contratante — e não tem credencial nenhuma. Um
// validador atrás de login não valida coisa alguma.
//
// O que protege: o código é aleatório e só está no documento; o CPF sai
// mascarado da API; e o servidor trava por IP quem erra códigos em série.
//
// O login administrativo é o MESMO do painel de Configurações da intranet
// (tabela `admins`): quem administra a intranet administra os certificados, sem
// uma segunda lista de usuários para manter em dia.

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import LogoPontual from "../components/LogoPontual";
import CertificadosPainel from "../components/CertificadosPainel";
import {
  validarCertificado, api, logarAdmin, guardarAdmin, tokenAdmin, limparAdmin, pedirLocalizacao,
} from "../api/intranet";

// `date` do Postgres vem "2026-07-20". new Date("2026-07-20") é meia-noite UTC,
// que no Brasil (UTC-3) volta um dia e imprimiria 19/07 — a data ERRADA no
// certificado. Por isso quebramos na mão e montamos a data local.
function dataBR(iso) {
  if (!iso) return "—";
  const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return "—";
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR");
}

// `timestamptz` vem "2026-07-27 12:00:00.66+00", e tem DOIS problemas: o espaço
// (que o Safari não parseia) e o fuso de dois dígitos, "+00" — que não é ISO
// 8601 válido e faz o Chrome devolver Invalid Date. Precisa de "+00:00".
function dataHoraBR(iso) {
  if (!iso) return "—";
  const d = new Date(String(iso).trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  return isNaN(d) ? "—" : d.toLocaleString("pt-BR");
}

const dataExtenso = (iso) => {
  if (!iso) return "";
  const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return "";
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
};

// 8 → "8 horas"; 1.5 → "1,5 hora". Meia hora de treinamento existe.
const horas = (n) => (n === null || n === undefined ? "" : `${String(n).replace(".", ",").replace(/,0$/, "")} ${n === 1 ? "hora" : "horas"}`);

export default function Certificado() {
  const { codigo: codigoDaUrl } = useParams();
  const [params] = useSearchParams();
  const inicial = codigoDaUrl || params.get("codigo") || "";

  const [tela, setTela] = useState("validar");   // "validar" | "login" | "painel"
  const [admin, setAdmin] = useState(null);
  // Validação
  const [codigo, setCodigo] = useState(inicial);
  const [cert, setCert] = useState(null);
  const [erro, setErro] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  // Login administrativo
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [admErro, setAdmErro] = useState("");
  const [entrando, setEntrando] = useState(false);
  const doc = useRef(null);

  useEffect(() => { document.title = "Certificados - Pontual Brasil Petróleo"; }, []);

  // Sessão administrativa já aberta (o admin veio das Configurações, ou deu F5).
  // Só habilita o botão do painel — a tela inicial continua sendo o validador,
  // que é para o que o sistema existe na maior parte dos acessos.
  useEffect(() => {
    if (!tokenAdmin()) return;
    (async () => {
      try { setAdmin((await api("painel")).admin); }
      catch { limparAdmin(); }
    })();
  }, []);

  const consultar = useCallback(async (valor) => {
    const alvo = (valor ?? "").trim();
    if (!alvo) return;
    setConsultando(true);
    setErro("");
    setCert(null);
    try {
      const r = await validarCertificado(alvo);
      setCert(r.certificado);
    } catch (e) {
      setErro(e?.message || "Não foi possível consultar o certificado.");
    }
    setConsultando(false);
  }, []);

  // Código no link (QR do documento, ou /certificado/PNT-2026-K7QP-3F2D) já
  // consulta sozinho: quem chega por aí não deveria ter de clicar em nada.
  useEffect(() => { if (inicial) consultar(inicial); }, [inicial, consultar]);

  async function entrar(e) {
    e.preventDefault();
    if (!usuario.trim() || !senha || entrando) return;
    setEntrando(true);
    setAdmErro("");
    try {
      // A localização é opcional e não bloqueia — igual às outras portas da
      // intranet. Quem nega a permissão entra do mesmo jeito.
      const coords = await pedirLocalizacao();
      const r = await logarAdmin(usuario, senha, coords);
      guardarAdmin(r.token);
      setAdmin(r.admin);
      setSenha("");
      setTela("painel");
    } catch (err) {
      setAdmErro(err?.message || "Não foi possível entrar.");
    }
    setEntrando(false);
  }

  function sair() {
    limparAdmin();
    setAdmin(null);
    setTela("validar");
  }

  // "Ver / imprimir" do painel: mostra o certificado na própria tela de
  // validação, exatamente como quem recebe o documento vai vê-lo.
  function verCertificado(cod) {
    setCodigo(cod);
    setTela("validar");
    consultar(cod);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function baixarPdf() {
    const el = doc.current;
    if (!el || baixando) return;
    setBaixando(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      await html2pdf().set({
        filename: `Certificado-${cert.codigo}.pdf`,
        margin: 0,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        // Paisagem: é o formato do documento na tela, e retrato o espremeria.
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      }).from(el).save();
    } catch {
      setErro("Não foi possível gerar o PDF. Use o botão Imprimir.");
    }
    setBaixando(false);
  }

  const valido = cert && !cert.revogado;
  const enderecoValidacao = `${window.location.origin}/certificado`;

  return (
    <div style={s.wrap}>
      <style>{`
        .cert-btn {
          padding: 11px 18px; border-radius: 9px; border: none; cursor: pointer;
          font-weight: 700; font-size: .86rem; font-family: var(--font);
          transition: filter .15s ease, transform .08s ease;
        }
        .cert-btn:hover:not(:disabled) { filter: brightness(1.07); }
        .cert-btn:active:not(:disabled) { transform: translateY(1px); }
        .cert-btn:disabled { opacity: .6; cursor: default; }

        .cert-hbtn {
          padding: 8px 14px; border-radius: 8px; cursor: pointer;
          font-weight: 600; font-size: .8rem; color: #fff; font-family: var(--font);
          background: rgba(255,255,255,.14);
          border: 1px solid rgba(255,255,255,.28);
          transition: background .15s ease;
        }
        .cert-hbtn:hover { background: rgba(255,255,255,.26); }

        /* O código é digitado de um papel: monoespaçado e espaçado separa
           visualmente os blocos e reduz erro de leitura. */
        .cert-input {
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          letter-spacing: .08em; text-transform: uppercase;
        }
        .cert-input::placeholder { letter-spacing: normal; text-transform: none; }

        @media print {
          body * { visibility: hidden; }
          #cert-doc, #cert-doc * { visibility: visible; }
          #cert-doc {
            position: fixed; left: 0; top: 0;
            width: 297mm; height: 210mm;
            border: none !important; box-shadow: none !important; border-radius: 0 !important;
          }
          .no-print { display: none !important; }
        }
        @page { size: A4 landscape; margin: 0; }
      `}</style>

      <header style={s.topo} className="no-print">
        <LogoPontual height={30} variant="white" />
        <span style={s.topoTxt}>Certificados</span>
        <div style={s.topoAcoes}>
          {tela !== "validar" && (
            <button type="button" className="cert-hbtn" onClick={() => setTela("validar")}>Validar certificado</button>
          )}
          {admin
            ? tela !== "painel" && <button type="button" className="cert-hbtn" onClick={() => setTela("painel")}>Painel de emissão</button>
            : tela !== "login" && <button type="button" className="cert-hbtn" onClick={() => { setAdmErro(""); setTela("login"); }}>Área administrativa</button>}
        </div>
      </header>

      <main style={s.corpo}>
        {tela === "painel" && admin && (
          <section style={s.painel}>
            <CertificadosPainel admin={admin} onSair={sair} onVerCertificado={verCertificado} />
          </section>
        )}

        {tela === "login" && (
          <section style={{ ...s.busca, maxWidth: 460, margin: "0 auto" }}>
            <h1 style={s.h1}>Área administrativa</h1>
            <p style={s.sub}>
              Entre com seu usuário e senha de administrador da intranet para emitir,
              corrigir ou cancelar certificados.
            </p>
            <form style={{ display: "flex", flexDirection: "column", gap: 10 }} onSubmit={entrar}>
              <input style={s.input} value={usuario} onChange={(e) => setUsuario(e.target.value)}
                placeholder="Usuário" aria-label="Usuário" autoFocus autoComplete="username" disabled={entrando} />
              <input style={s.input} type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha" aria-label="Senha" autoComplete="current-password" disabled={entrando} />
              {admErro && <p style={s.avisoErro}>{admErro}</p>}
              <button type="submit" className="cert-btn" style={s.btnPrim} disabled={entrando || !usuario.trim() || !senha}>
                {entrando ? "Entrando…" : "Entrar"}
              </button>
            </form>
            <p style={s.dica}>
              Não é administrador? Você não precisa entrar para conferir um certificado —
              use <button type="button" style={s.linkBtn} onClick={() => setTela("validar")}>a tela de validação</button>.
            </p>
          </section>
        )}

        {tela === "validar" && (
          <>
            <section style={s.busca} className="no-print">
              <h1 style={s.h1}>Confira a autenticidade de um certificado</h1>
              <p style={s.sub}>
                Digite o código impresso no certificado. A consulta é aberta — não é preciso
                ter cadastro nem entrar na intranet.
              </p>
              <form style={s.form} onSubmit={(e) => { e.preventDefault(); consultar(codigo); }}>
                <input className="cert-input" style={{ ...s.input, flex: "1 1 260px" }} value={codigo}
                  onChange={(e) => setCodigo(e.target.value)} placeholder="PNT-2026-K7QP-3F2D"
                  aria-label="Código do certificado" autoFocus disabled={consultando} />
                <button type="submit" className="cert-btn" style={s.btnPrim} disabled={consultando || !codigo.trim()}>
                  {consultando ? "Consultando…" : "Validar"}
                </button>
              </form>
              <p style={s.dica}>
                Maiúsculas, minúsculas e hifens não importam — pode colar do jeito que estiver.
              </p>

              {erro && <div style={s.avisoErro}>{erro}</div>}

              {cert && (
                <div style={valido ? s.avisoOk : s.avisoRevogado}>
                  <strong style={{ fontSize: "1rem" }}>
                    {valido ? "✓ Certificado autêntico" : "✕ Certificado cancelado"}
                  </strong>
                  <span>
                    {valido
                      ? `Emitido pela Pontual Brasil Petróleo em ${dataHoraBR(cert.emitidoEm)}.`
                      : `Este certificado foi cancelado em ${dataHoraBR(cert.revogadoEm)} e não tem validade. Motivo: ${cert.motivoRevogacao || "não informado"}.`}
                  </span>
                </div>
              )}
            </section>

            {cert && (
              <>
                <section style={s.dados} className="no-print">
                  <h2 style={s.h2}>Dados registrados</h2>
                  <dl style={s.dl}>
                    <Campo r="Participante" v={cert.nome} />
                    {cert.documento && <Campo r="Documento" v={cert.documento} />}
                    <Campo r="Curso / treinamento" v={cert.curso} />
                    {cert.cargaHoraria !== null && <Campo r="Carga horária" v={horas(cert.cargaHoraria)} />}
                    <Campo r="Conclusão" v={dataBR(cert.concluidoEm)} />
                    {cert.instrutor && <Campo r="Instrutor / responsável" v={cert.instrutor} />}
                    <Campo r="Código" v={cert.codigo} mono />
                    {cert.descricao && <Campo r="Conteúdo" v={cert.descricao} />}
                  </dl>
                  {/* Só faz sentido quando há documento — sem CPF cadastrado, a
                      frase falaria de um campo que nem está na tela. */}
                  {cert.documento && (
                    <p style={s.dica}>
                      O documento está parcialmente ocultado por proteção de dados pessoais:
                      o número aparece incompleto de propósito.
                    </p>
                  )}
                  <div style={s.acoes}>
                    <button type="button" className="cert-btn" style={s.btnPrim} onClick={baixarPdf} disabled={baixando}>
                      {baixando ? "Gerando…" : "Baixar PDF"}
                    </button>
                    <button type="button" className="cert-btn" style={s.btnSec} onClick={() => window.print()}>
                      Imprimir
                    </button>
                  </div>
                </section>

                {/* O documento. Cores fixas, e não as do tema: um certificado
                    impresso no modo escuro sairia com fundo preto. Papel é branco. */}
                <div style={s.paisagem}>
                  <div id="cert-doc" ref={doc} style={{ ...d.folha, ...(cert.revogado ? d.folhaCancelada : null) }}>
                    {cert.revogado && <div style={d.carimbo}>CANCELADO</div>}

                    <div style={d.moldura}>
                      <div style={d.cabecalho}>
                        <img src="/pontual-logo.png" alt="Pontual" style={d.logo} />
                        <div style={d.empresa}>PONTUAL BRASIL PETRÓLEO</div>
                      </div>

                      <div style={d.titulo}>CERTIFICADO</div>
                      <div style={d.regua} />

                      <p style={d.texto}>Certificamos que</p>
                      <p style={d.nome}>{cert.nome}</p>
                      {cert.documento && <p style={d.docNum}>{cert.documento}</p>}

                      <p style={d.texto}>
                        concluiu o treinamento <strong>{cert.curso}</strong>
                        {cert.cargaHoraria !== null && <>, com carga horária de <strong>{horas(cert.cargaHoraria)}</strong></>}
                        , em {dataExtenso(cert.concluidoEm)}.
                      </p>

                      {cert.descricao && <p style={d.conteudo}>{cert.descricao}</p>}

                      <div style={d.assinaturas}>
                        <div style={d.assinatura}>
                          <div style={d.linha} />
                          <div style={d.assLabel}>{cert.instrutor || "Instrutor responsável"}</div>
                        </div>
                        <div style={d.assinatura}>
                          <div style={d.linha} />
                          <div style={d.assLabel}>Pontual Brasil Petróleo</div>
                        </div>
                      </div>

                      {/* O código no rodapé é o que torna o papel verificável — sem
                          ele, o documento é só uma folha bonita. */}
                      <div style={d.rodape}>
                        <span>Código de validação: <strong style={d.codigo}>{cert.codigo}</strong></span>
                        <span>Confira em {enderecoValidacao}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      <footer style={s.rodapeSite} className="no-print">
        © {new Date().getFullYear()} Pontual Brasil Petróleo — Intranet
      </footer>
    </div>
  );
}

function Campo({ r, v, mono }) {
  return (
    <>
      <dt style={s.dt}>{r}</dt>
      <dd style={{ ...s.dd, ...(mono ? { fontFamily: "ui-monospace, Menlo, Consolas, monospace", letterSpacing: ".06em" } : null) }}>{v}</dd>
    </>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "var(--bg, #f6f9fb)", fontFamily: "var(--font)", display: "flex", flexDirection: "column" },
  topo: { background: "var(--header-bg, #18216e)", color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 4px 14px rgba(15,23,42,.18)", flexWrap: "wrap" },
  topoTxt: { fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-.01em" },
  topoAcoes: { marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" },
  corpo: { flex: 1, width: "100%", maxWidth: 1040, margin: "0 auto", padding: "28px 20px 40px" },
  painel: { background: "var(--card-bg, #fff)", border: "1px solid var(--border, #e6ecf3)", borderRadius: 14, padding: "22px" },
  busca: { background: "var(--card-bg, #fff)", border: "1px solid var(--border, #e6ecf3)", borderRadius: 14, padding: "24px 22px", boxShadow: "var(--sh-sm, 0 1px 3px rgba(15,23,42,.06))" },
  h1: { fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", margin: "0 0 6px", letterSpacing: "-.02em" },
  h2: { fontSize: "1rem", fontWeight: 800, color: "var(--text)", margin: "0 0 12px" },
  sub: { fontSize: ".9rem", color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.5 },
  form: { display: "flex", gap: 10, flexWrap: "wrap" },
  input: { padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 9, fontSize: "1rem", background: "var(--card-bg)", color: "var(--text)", fontFamily: "var(--font)", width: "100%" },
  btnPrim: { background: "var(--accent)", color: "#fff" },
  btnSec: { background: "var(--surface-3, #eef2f7)", color: "var(--text)", border: "1px solid var(--border)" },
  dica: { fontSize: ".78rem", color: "var(--text-subtle)", margin: "8px 0 0", lineHeight: 1.5 },
  linkBtn: { background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit", textDecoration: "underline" },
  avisoOk: { marginTop: 18, padding: "14px 16px", borderRadius: 10, background: "var(--success-bg)", color: "var(--success)", border: "1px solid var(--success-border, transparent)", display: "flex", flexDirection: "column", gap: 4, fontSize: ".88rem", fontWeight: 600 },
  avisoRevogado: { marginTop: 18, padding: "14px 16px", borderRadius: 10, background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-border, transparent)", display: "flex", flexDirection: "column", gap: 4, fontSize: ".88rem", fontWeight: 600 },
  avisoErro: { marginTop: 18, padding: "13px 15px", borderRadius: 10, background: "var(--danger-bg)", color: "var(--danger)", fontSize: ".87rem", fontWeight: 600 },
  dados: { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "22px", marginTop: 18 },
  dl: { display: "grid", gridTemplateColumns: "minmax(140px, auto) 1fr", gap: "8px 18px", margin: 0 },
  dt: { fontSize: ".78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", alignSelf: "start", paddingTop: 2 },
  dd: { margin: 0, fontSize: ".93rem", color: "var(--text)", fontWeight: 600, lineHeight: 1.5, overflowWrap: "anywhere" },
  acoes: { display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" },
  // O documento tem largura fixa (proporção A4 paisagem). Em tela estreita ele
  // rola dentro da própria caixa — a PÁGINA nunca rola de lado.
  paisagem: { marginTop: 18, overflowX: "auto", paddingBottom: 6 },
  rodapeSite: { textAlign: "center", padding: "18px 20px", fontSize: ".78rem", color: "var(--text-subtle)" },
};

// Estilos do documento — cores fixas de propósito (ver comentário no JSX).
const d = {
  folha: { position: "relative", width: 1000, minWidth: 1000, minHeight: 707, background: "#fff", color: "#0f172a", boxShadow: "0 10px 30px rgba(15,23,42,.16)", borderRadius: 6, padding: 22, boxSizing: "border-box" },
  folhaCancelada: { filter: "grayscale(.35)" },
  moldura: { border: "3px double #18216e", borderRadius: 4, height: "100%", minHeight: 663, padding: "34px 52px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxSizing: "border-box" },
  cabecalho: { display: "flex", alignItems: "center", gap: 14, marginBottom: 14 },
  logo: { height: 46, width: "auto", objectFit: "contain" },
  empresa: { fontWeight: 800, fontSize: 15, letterSpacing: ".14em", color: "#18216e" },
  titulo: { fontSize: 44, fontWeight: 800, letterSpacing: ".22em", color: "#18216e", marginTop: 8 },
  regua: { width: 120, height: 3, background: "#c99a2e", margin: "12px 0 22px", borderRadius: 2 },
  texto: { fontSize: 16, lineHeight: 1.7, margin: "6px 0", maxWidth: 720, color: "#1e293b" },
  nome: { fontSize: 34, fontWeight: 700, margin: "10px 0 2px", color: "#0f172a", letterSpacing: "-.01em" },
  docNum: { fontSize: 13, color: "#64748b", margin: "0 0 8px", letterSpacing: ".04em" },
  conteudo: { fontSize: 13, lineHeight: 1.6, color: "#475569", margin: "14px 0 0", maxWidth: 720 },
  assinaturas: { display: "flex", gap: 90, marginTop: "auto", paddingTop: 42 },
  assinatura: { width: 240 },
  linha: { borderTop: "1px solid #334155", marginBottom: 6 },
  assLabel: { fontSize: 12, color: "#475569", fontWeight: 600 },
  rodape: { marginTop: 26, paddingTop: 12, borderTop: "1px solid #e2e8f0", width: "100%", display: "flex", justifyContent: "space-between", gap: 16, fontSize: 11, color: "#64748b", flexWrap: "wrap" },
  codigo: { fontFamily: "ui-monospace, Menlo, Consolas, monospace", letterSpacing: ".08em", color: "#18216e" },
  carimbo: { position: "absolute", top: "42%", left: 0, right: 0, textAlign: "center", fontSize: 84, fontWeight: 800, letterSpacing: ".18em", color: "rgba(211,32,32,.22)", transform: "rotate(-14deg)", pointerEvents: "none", zIndex: 2 },
};
