// Acesso de convidado a UMA proposta, via link (sem login).
// URL: /proposta-convite/:id?token=<token>
// Chama as Cloud Functions getPropostaConvite / responderConvite (admin SDK),
// que validam o token contra os convidados cadastrados na proposta.

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";
import LogoPontual from "../components/LogoPontual";
import { fmtBRL } from "../utils/compras";
import { Paperclip, Check, X, ShieldCheck } from "lucide-react";

export default function PropostaConvite() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [estado, setEstado] = useState("carregando"); // carregando | ok | erro | enviado
  const [erro, setErro] = useState("");
  const [prop, setProp] = useState(null);
  const [parecer, setParecer] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!id || !token) { setEstado("erro"); setErro("Link inválido."); return; }
      try {
        const fn = httpsCallable(functions, "getPropostaConvite");
        const res = await fn({ propostaId: id, token });
        if (!vivo) return;
        setProp(res.data.proposta);
        setParecer(res.data.proposta?.convite?.parecer || "");
        setEstado(res.data.proposta?.convite?.status && res.data.proposta.convite.status !== "pendente" ? "enviado" : "ok");
      } catch (e) {
        if (!vivo) return;
        setErro(e?.message || "Não foi possível abrir a proposta.");
        setEstado("erro");
      }
    })();
    return () => { vivo = false; };
  }, [id, token]);

  async function responder(decisao) {
    setEnviando(true);
    try {
      const fn = httpsCallable(functions, "responderConvite");
      await fn({ propostaId: id, token, decisao, parecer });
      setProp((p) => ({ ...p, convite: { ...p.convite, status: decisao, parecer } }));
      setEstado("enviado");
    } catch (e) {
      setErro(e?.message || "Erro ao enviar resposta.");
    } finally { setEnviando(false); }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.head}>
          <LogoPontual height={34} />
          <span style={s.headTxt}>Validação de Proposta</span>
        </div>

        {estado === "carregando" && <p style={s.info}>Carregando proposta…</p>}

        {estado === "erro" && (
          <div style={s.centro}>
            <X size={34} style={{ color: "var(--danger)" }} />
            <p style={s.info}>{erro}</p>
            <p style={s.sub}>Peça um novo link a quem o enviou.</p>
          </div>
        )}

        {(estado === "ok" || estado === "enviado") && prop && (
          <>
            <div style={s.topo}>
              <h1 style={s.titulo}>{prop.titulo}</h1>
              <div style={s.meta}>
                <span>#{prop.numero}</span><span>· {prop.setor_nome}</span>
                {prop.categoria && <span>· {prop.categoria}</span>}
                <span>· por {prop.criadoPor}</span>
              </div>
            </div>

            {prop.justificativa && (
              <div style={s.bloco}><span style={s.blocoLbl}>Justificativa</span><p style={s.texto}>{prop.justificativa}</p></div>
            )}

            {prop.itens?.length > 0 && (
              <div style={s.tabWrap}>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Item</th><th style={s.th}>Qtd</th><th style={s.th}>Unit.</th><th style={s.th}>Total</th></tr></thead>
                  <tbody>
                    {prop.itens.map((i, ix) => (
                      <tr key={ix}>
                        <td style={s.td}>{i.descricao}</td><td style={s.td}>{i.quantidade}</td>
                        <td style={s.td}>{fmtBRL(i.valorUnitario)}</td><td style={s.td}>{fmtBRL(i.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={s.valor}>
              <span style={s.blocoLbl}>Valor solicitado</span>
              <strong style={s.valorNum}>{fmtBRL(prop.valorSolicitado)}</strong>
            </div>

            {prop.anexos?.length > 0 && (
              <div style={s.bloco}>
                <span style={s.blocoLbl}>Anexos</span>
                {prop.anexos.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noreferrer" style={s.anexo}>
                    <Paperclip size={14} /> {a.nome}
                  </a>
                ))}
              </div>
            )}

            {/* Status das instâncias (só informativo) */}
            <div style={s.instRow}>
              <InstBadge titulo="Diretoria" status={prop.aprovacao?.diretoria?.status} />
              <InstBadge titulo="Superintendência" status={prop.aprovacao?.superintendencia?.status} />
            </div>

            {estado === "enviado" ? (
              <div style={s.enviado}>
                <ShieldCheck size={30} style={{ color: prop.convite?.status === "aprovado" ? "var(--success)" : prop.convite?.status === "reprovado" ? "var(--danger)" : "var(--tech)" }} />
                <p style={{ ...s.info, margin: 0 }}>
                  Sua resposta foi registrada: <strong>{
                    prop.convite?.status === "aprovado" ? "Aprovado" :
                    prop.convite?.status === "reprovado" ? "Reprovado" : "Parecer enviado"}</strong>.
                </p>
                <p style={s.sub}>Obrigado, {prop.convite?.nome || "convidado"}.</p>
              </div>
            ) : (
              <div style={s.acao}>
                <p style={s.oi}>Olá <strong>{prop.convite?.nome}</strong>{prop.convite?.papel ? ` (${prop.convite.papel})` : ""}, registre seu parecer:</p>
                <textarea style={s.textarea} placeholder="Comentário / parecer (opcional)"
                  value={parecer} onChange={(e) => setParecer(e.target.value)} />
                <div style={s.botoes}>
                  <button style={s.btnApr} disabled={enviando} onClick={() => responder("aprovado")}><Check size={16} /> Aprovar</button>
                  <button style={s.btnRep} disabled={enviando} onClick={() => responder("reprovado")}><X size={16} /> Reprovar</button>
                </div>
                <button style={s.btnParecer} disabled={enviando} onClick={() => responder("parecer")}>Enviar só o parecer</button>
                {erro && <p style={{ ...s.sub, color: "var(--danger)" }}>{erro}</p>}
              </div>
            )}
          </>
        )}
      </div>
      <p style={s.rodape}>Pontual · Gestão Operacional</p>
    </div>
  );
}

function InstBadge({ titulo, status }) {
  const cor = status === "aprovado" ? "var(--success)" : status === "reprovado" ? "var(--danger)" : "var(--text-subtle)";
  const bg = status === "aprovado" ? "var(--success-bg)" : status === "reprovado" ? "var(--danger-bg)" : "var(--surface-2)";
  const txt = status === "aprovado" ? "Aprovou" : status === "reprovado" ? "Reprovou" : "Pendente";
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "8px 6px", borderRadius: 8, background: bg }}>
      <div style={{ fontSize: ".7rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase" }}>{titulo}</div>
      <div style={{ fontSize: ".82rem", fontWeight: 700, color: cor, marginTop: 2 }}>{txt}</div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--bg, #0f172a)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "var(--font)" },
  card: { background: "var(--card-bg, #fff)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 560, padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,.25)" },
  head: { display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 16 },
  headTxt: { fontWeight: 700, color: "var(--accent)", fontSize: ".95rem" },
  info: { color: "var(--text)", textAlign: "center", fontSize: ".92rem" },
  sub: { color: "var(--text-subtle)", textAlign: "center", fontSize: ".82rem", marginTop: 4 },
  centro: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 0" },
  topo: { marginBottom: 12 },
  titulo: { fontSize: "1.3rem", fontWeight: 800, color: "var(--text)", margin: 0 },
  meta: { display: "flex", gap: 6, flexWrap: "wrap", fontSize: ".8rem", color: "var(--text-muted)", marginTop: 5 },
  bloco: { marginBottom: 14 },
  blocoLbl: { display: "block", fontSize: ".72rem", color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700, marginBottom: 5 },
  texto: { fontSize: ".9rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 },
  tabWrap: { border: "1px solid var(--border)", borderRadius: 10, overflowX: "auto", marginBottom: 14 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: ".84rem" },
  th: { padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "var(--accent)", background: "var(--surface-2)", borderBottom: "2px solid var(--border)" },
  td: { padding: "9px 12px", borderBottom: "1px solid var(--border)", color: "var(--text)" },
  valor: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--surface-2)", borderRadius: 10, marginBottom: 14 },
  valorNum: { fontSize: "1.25rem", color: "var(--text)" },
  anexo: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8, color: "var(--accent)", textDecoration: "none", fontSize: ".85rem", marginBottom: 6 },
  instRow: { display: "flex", gap: 8, marginBottom: 16 },
  acao: { borderTop: "1px solid var(--border)", paddingTop: 16 },
  oi: { fontSize: ".9rem", color: "var(--text)", marginBottom: 10 },
  textarea: { width: "100%", minHeight: 70, padding: "10px 12px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: ".9rem", fontFamily: "inherit", outline: "none", background: "var(--card-bg)", color: "var(--text)", resize: "vertical", boxSizing: "border-box" },
  botoes: { display: "flex", gap: 10, marginTop: 12 },
  btnApr: { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px", background: "var(--success)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: ".92rem", cursor: "pointer" },
  btnRep: { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px", background: "var(--danger)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: ".92rem", cursor: "pointer" },
  btnParecer: { width: "100%", marginTop: 8, padding: "10px", background: "none", color: "var(--text-muted)", border: "1px solid var(--border-strong)", borderRadius: 10, fontWeight: 600, fontSize: ".84rem", cursor: "pointer" },
  enviado: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "18px 0", borderTop: "1px solid var(--border)" },
  rodape: { color: "var(--text-subtle)", fontSize: ".76rem", marginTop: 18 },
};
