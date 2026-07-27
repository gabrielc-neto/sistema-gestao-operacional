// Área administrativa do sistema de Certificados.
//
// Só chega aqui quem entrou com usuário e senha de administrador — a página que
// hospeda este componente (pages/Certificado.jsx) é que cuida da porta. Aqui
// dentro assume-se a sessão já válida; ainda assim, quem decide qualquer coisa é
// o servidor, que revalida o token a CADA chamada.
//
// Emite (uma pessoa ou uma turma), corrige, cancela e mostra as consultas que o
// validador público recebeu.

import { useState, useEffect, useCallback } from "react";
import { api } from "../api/intranet";

const CERT_VAZIO = {
  nome: "", documento: "", curso: "", descricao: "", cargaHoraria: "",
  instrutor: "", concluidoEm: "", lote: false, nomes: "",
};

// Resultados das consultas recebidas pelo validador público.
const VALIDACOES = {
  valido: { txt: "Válido", cor: "var(--success)", bg: "var(--success-bg)" },
  revogado: { txt: "Cancelado", cor: "var(--warning)", bg: "var(--surface-3)" },
  nao_encontrado: { txt: "Código inexistente", cor: "var(--danger)", bg: "var(--danger-bg)" },
  travado: { txt: "Travado (varredura)", cor: "var(--danger)", bg: "var(--danger-bg)" },
};

// "hoje" no formato do <input type="date">. toISOString() daria a data em UTC,
// que depois das 21h no Brasil já é o dia seguinte.
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Datas do Postgres, em dois sabores e com armadilhas nos dois. `date` vem
// "2026-07-20": new Date() dessa string é meia-noite UTC, que no Brasil volta um
// dia. `timestamptz` vem "2026-10-15 20:11:41.66+00": o espaço não é ISO 8601 e
// o fuso de dois dígitos ("+00") faz o Chrome devolver Invalid Date.
const dataBR = (s, comHora = true) => {
  if (!s) return "—";
  const txt = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(txt)) {
    const [a, m, dia] = txt.split("-").map(Number);
    return new Date(a, m - 1, dia).toLocaleDateString("pt-BR");
  }
  const d = new Date(txt.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  if (isNaN(d)) return "—";
  return comHora ? d.toLocaleString("pt-BR") : d.toLocaleDateString("pt-BR");
};

const horasTxt = (n) => String(n).replace(".", ",").replace(/,0$/, "");

export default function CertificadosPainel({ admin, onSair, onVerCertificado }) {
  const [certificados, setCertificados] = useState([]);
  const [buscaCert, setBuscaCert] = useState("");     // o que está sendo digitado
  const [filtroCert, setFiltroCert] = useState("");   // o que já foi aplicado
  const [validacoes, setValidacoes] = useState(null); // null = mostrando certificados
  // Códigos recém-emitidos. Ficam na tela até o admin fechar: é a ÚNICA hora em
  // que ele os vê juntos, e é com eles que entrega os certificados.
  const [emitidos, setEmitidos] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  function aviso(t) { setErro(""); setMsg(t); setTimeout(() => setMsg(""), 3500); }

  const carregar = useCallback(async () => {
    try {
      setCertificados((await api("listarCertificados", { busca: filtroCert })).certificados || []);
    } catch (e) { setErro(e?.message || "Falha ao carregar."); }
    // filtroCert, e não o que está sendo digitado: a busca vai ao servidor, e
    // recarregar a lista a cada tecla seria uma consulta por caractere.
  }, [filtroCert]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      if (form.id) {
        // Editar NÃO troca o código: ele já foi impresso e entregue.
        await api("salvarCertificado", form);
        setModal(false);
        aviso("Certificado atualizado.");
        await carregar();
      } else if (form.lote) {
        const nomes = (form.nomes || "").split("\n").map((l) => l.trim()).filter(Boolean);
        if (!nomes.length) { setErro("Informe ao menos um participante."); setSalvando(false); return; }
        const r = await api("emitirLote", { ...form, nomes });
        setEmitidos(r.emitidos || []);
        setModal(false);
        await carregar();
      } else {
        const r = await api("salvarCertificado", form);
        setEmitidos([{ nome: form.nome, codigo: r.codigo }]);
        setModal(false);
        await carregar();
      }
    } catch (err) { setErro(err?.message || "Falha ao salvar."); }
    setSalvando(false);
  }

  async function revogar(cert) {
    if (cert.revogado) {
      if (!window.confirm(`Reativar o certificado de "${cert.nome}"?\n\nEle volta a aparecer como válido para quem consultar o código.`)) return;
      try { await api("revogarCertificado", { id: cert.id, revogado: false }); aviso("Certificado reativado."); await carregar(); }
      catch (e) { setErro(e?.message || "Falha ao reativar."); }
      return;
    }
    // O motivo aparece para QUEM VALIDAR o código — daí ser obrigatório.
    const motivo = window.prompt(`Cancelar o certificado de "${cert.nome}".\n\nMotivo (aparece para quem consultar o código):`, "");
    if (motivo === null) return;
    if (!motivo.trim()) { setErro("O motivo do cancelamento é obrigatório."); return; }
    try { await api("revogarCertificado", { id: cert.id, revogado: true, motivo: motivo.trim() }); aviso("Certificado cancelado."); await carregar(); }
    catch (e) { setErro(e?.message || "Falha ao cancelar."); }
  }

  async function excluir(cert) {
    if (!window.confirm(`Excluir o certificado de "${cert.nome}" (${cert.codigo})?\n\nO código deixa de existir e quem tiver o documento receberá "não encontrado". Para invalidar sem sumir, use Cancelar.`)) return;
    try { await api("excluirCertificado", { id: cert.id }); aviso("Excluído."); await carregar(); }
    catch (e) { setErro(e?.message || "Falha ao excluir."); }
  }

  async function alternarValidacoes() {
    if (validacoes) { setValidacoes(null); return; }
    try { setValidacoes((await api("listarValidacoes")).validacoes || []); }
    catch (e) { setErro(e?.message || "Falha ao carregar as consultas."); }
  }

  const copiar = (txt, aviso_) => navigator.clipboard?.writeText(txt).then(() => aviso(aviso_));

  return (
    <div style={s.wrap}>
      <style>{`
        .cpn-btn {
          padding: 9px 16px; border-radius: 8px; border: none; cursor: pointer;
          font-weight: 700; font-size: .82rem; font-family: var(--font);
          background: var(--accent); color: #fff;
          transition: filter .15s ease, transform .08s ease;
        }
        .cpn-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .cpn-btn:active:not(:disabled) { transform: translateY(1px); }
        .cpn-btn:disabled { opacity: .6; cursor: default; }
        .cpn-mini {
          padding: 6px 10px; border-radius: 7px; cursor: pointer;
          background: var(--surface-3); color: var(--text);
          border: 1px solid var(--border);
          font-weight: 600; font-size: .75rem; white-space: nowrap;
          font-family: var(--font); text-decoration: none; display: inline-block;
        }
        .cpn-mini:hover { border-color: var(--accent); color: var(--accent); }
      `}</style>

      <div style={s.barra}>
        <p style={s.sub}>
          Emissão e manutenção dos certificados. Cada um recebe um código que qualquer pessoa
          confere na tela de validação — sem login, inclusive de fora da empresa.
        </p>
        <button className="cpn-btn" onClick={() => { setForm({ ...CERT_VAZIO, concluidoEm: hojeISO() }); setErro(""); setModal(true); }}>
          + Emitir certificado
        </button>
      </div>

      {msg && <div style={s.ok}>{msg}</div>}
      {erro && <div style={s.err}>{erro}</div>}

      {/* Os códigos recém-emitidos. É a única tela em que aparecem juntos —
          depois, cada um só é achado pela busca. */}
      {emitidos && (
        <div style={s.emitidos}>
          <div style={s.emitidosTopo}>
            <strong>{emitidos.length === 1 ? "Certificado emitido" : `${emitidos.length} certificados emitidos`}</strong>
            <button className="cpn-mini" onClick={() => setEmitidos(null)}>Fechar</button>
          </div>
          <p style={s.dica}>Entregue o código junto do certificado — é com ele que a autenticidade é conferida.</p>
          {emitidos.map((e) => (
            <div key={e.codigo} style={s.emitidoLinha}>
              <span style={{ flex: 1, minWidth: 0 }}>{e.nome}</span>
              <code style={s.codigo}>{e.codigo}</code>
              <button className="cpn-mini" onClick={() => copiar(e.codigo, "Código copiado.")}>Copiar</button>
            </div>
          ))}
          <button className="cpn-mini" style={{ marginTop: 8 }}
            onClick={() => copiar(emitidos.map((e) => `${e.nome}\t${e.codigo}`).join("\n"), "Lista copiada.")}>
            Copiar lista inteira
          </button>
        </div>
      )}

      <form style={s.barra} onSubmit={(e) => { e.preventDefault(); setFiltroCert(buscaCert.trim()); }}>
        <input style={{ ...s.input, flex: 1, minWidth: 200 }} value={buscaCert} onChange={(e) => setBuscaCert(e.target.value)}
          placeholder="Buscar por nome, curso ou código" />
        <button type="submit" className="cpn-mini">Buscar</button>
        {filtroCert && <button type="button" className="cpn-mini" onClick={() => { setBuscaCert(""); setFiltroCert(""); }}>Limpar</button>}
        <button type="button" className="cpn-mini" onClick={alternarValidacoes}>
          {validacoes ? "Ver certificados" : "Ver consultas recebidas"}
        </button>
      </form>

      {validacoes ? (
        <>
          <p style={s.sub}>
            Toda consulta feita na tela de validação, inclusive as que não acharam nada —
            é aí que se enxerga alguém tentando adivinhar códigos.
          </p>
          <div style={s.lista}>
            {validacoes.map((v) => {
              const r = VALIDACOES[v.resultado] || { txt: v.resultado, cor: "var(--text-muted)", bg: "var(--surface-3)" };
              return (
                <div key={v.id} style={s.item}>
                  <span style={{ ...s.pill, background: r.bg, color: r.cor, minWidth: 128, justifyContent: "center" }}>{r.txt}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.itemNome}>{v.nome || "—"}</div>
                    <div style={s.itemSub}>{dataBR(v.em)} · IP {v.ip || "—"} · código {v.codigo}</div>
                  </div>
                </div>
              );
            })}
            {validacoes.length === 0 && <p style={s.vazio}>Nenhuma consulta ainda.</p>}
          </div>
        </>
      ) : (
        <div style={s.lista}>
          {certificados.map((c) => (
            <div key={c.id} style={{ ...s.item, opacity: c.revogado ? 0.6 : 1 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.itemNome}>{c.nome}</div>
                <div style={s.itemSub}>
                  {c.curso}
                  {c.cargaHoraria !== null ? ` · ${horasTxt(c.cargaHoraria)}h` : ""}
                  {" · conclusão "}{dataBR(c.concluidoEm, false)}
                </div>
              </div>
              {/* Fora da linha de cima: ali o texto é truncado com reticências, e
                  era justamente o CÓDIGO que sumia quando o curso tinha nome longo. */}
              <code style={s.codigo}>{c.codigo}</code>
              {c.revogado && <span style={{ ...s.pill, background: "var(--danger-bg)", color: "var(--danger)" }}>Cancelado</span>}
              <button className="cpn-mini" onClick={() => copiar(c.codigo, "Código copiado.")}>Copiar código</button>
              <button className="cpn-mini" onClick={() => onVerCertificado(c.codigo)}>Ver / imprimir</button>
              <button className="cpn-mini" onClick={() => { setForm({ ...CERT_VAZIO, ...c, concluidoEm: String(c.concluidoEm).slice(0, 10), cargaHoraria: c.cargaHoraria ?? "" }); setErro(""); setModal(true); }}>Editar</button>
              <button className="cpn-mini" onClick={() => revogar(c)}>{c.revogado ? "Reativar" : "Cancelar"}</button>
              <button className="cpn-mini" style={{ color: "var(--danger)" }} onClick={() => excluir(c)}>Excluir</button>
            </div>
          ))}
          {certificados.length === 0 && (
            <p style={s.vazio}>{filtroCert ? "Nenhum certificado encontrado para esta busca." : "Nenhum certificado emitido ainda."}</p>
          )}
          <p style={s.dica}>
            Emitiu errado? Prefira <strong>Cancelar</strong> a <strong>Excluir</strong>: o código continua
            respondendo, dizendo que o certificado foi cancelado e por quê. Excluir apaga o código, e quem
            tiver o papel na mão recebe "não encontrado" — que ele lê como erro de digitação.
          </p>
        </div>
      )}

      {modal && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={() => setModal(false)}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={s.mh}>
              <strong>{form.id ? "Editar certificado" : "Emitir certificado"}</strong>
              <button style={s.mclose} onClick={() => setModal(false)}>×</button>
            </div>
            <form style={s.mform} onSubmit={salvar}>
              {/* Lote só na EMISSÃO: editando, o certificado é um só. */}
              {!form.id && (
                <label style={s.check}>
                  <input type="checkbox" checked={!!form.lote} onChange={(e) => setForm({ ...form, lote: e.target.checked })} />
                  Emitir para uma turma inteira
                </label>
              )}

              {form.lote ? (
                <label style={s.lbl}>Participantes <span style={s.dica}>(um por linha)</span>
                  <textarea style={{ ...s.input, minHeight: 130, resize: "vertical", fontFamily: "var(--font)" }}
                    value={form.nomes || ""} onChange={(e) => setForm({ ...form, nomes: e.target.value })}
                    placeholder={"Maria Souza\nJoão Pereira; 123.456.789-01\nAna Lima"} required autoFocus />
                  <span style={s.dica}>
                    Um certificado por linha, todos com o mesmo curso e a mesma data. Para incluir o CPF
                    de alguém, escreva <code>Nome; CPF</code> — é opcional e vale por pessoa.
                  </span>
                </label>
              ) : (
                <>
                  <label style={s.lbl}>Participante
                    <input style={s.input} value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      required autoFocus placeholder="Nome completo, como sai impresso" />
                  </label>
                  <label style={s.lbl}>CPF <span style={s.dica}>(opcional — sai mascarado na validação pública)</span>
                    <input style={s.input} value={form.documento || ""} onChange={(e) => setForm({ ...form, documento: e.target.value })}
                      placeholder="000.000.000-00" />
                  </label>
                </>
              )}

              <label style={s.lbl}>Curso / treinamento
                <input style={s.input} value={form.curso || ""} onChange={(e) => setForm({ ...form, curso: e.target.value })}
                  required placeholder="Ex.: NR-20 — Segurança com Inflamáveis e Combustíveis" />
              </label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <label style={{ ...s.lbl, flex: 1, minWidth: 150 }}>Conclusão
                  <input style={s.input} type="date" value={form.concluidoEm || ""} onChange={(e) => setForm({ ...form, concluidoEm: e.target.value })} required />
                </label>
                <label style={{ ...s.lbl, flex: 1, minWidth: 150 }}>Carga horária <span style={s.dica}>(opcional)</span>
                  <input style={s.input} type="number" step="0.5" min="0" max="9999" value={form.cargaHoraria ?? ""}
                    onChange={(e) => setForm({ ...form, cargaHoraria: e.target.value })} placeholder="horas" />
                </label>
              </div>

              <label style={s.lbl}>Instrutor / responsável <span style={s.dica}>(opcional — vai na assinatura)</span>
                <input style={s.input} value={form.instrutor || ""} onChange={(e) => setForm({ ...form, instrutor: e.target.value })} />
              </label>

              <label style={s.lbl}>Conteúdo / observações <span style={s.dica}>(opcional)</span>
                <textarea style={{ ...s.input, minHeight: 70, resize: "vertical", fontFamily: "var(--font)" }}
                  value={form.descricao || ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Conteúdo programático, módulos, observações — aparece no certificado e na validação." />
              </label>

              <p style={s.dica}>
                {form.id
                  ? "O código de validação NÃO muda ao editar — o certificado já foi entregue com ele impresso."
                  : "O código de validação é gerado automaticamente e aparece na tela assim que você salvar."}
              </p>

              {erro && <p style={{ color: "var(--danger)", fontSize: ".85rem", margin: 0 }}>{erro}</p>}
              <div style={s.mfoot}>
                <button type="button" className="cpn-mini" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="cpn-btn" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p style={s.rodape}>
        Sessão de <strong>{admin.usuario}</strong>{admin.super ? " · superusuário" : ""} ·{" "}
        <button type="button" style={s.linkBtn} onClick={onSair}>encerrar sessão</button>
      </p>
    </div>
  );
}

const s = {
  wrap: { width: "100%" },
  barra: { display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  sub: { fontSize: ".85rem", color: "var(--text-muted)", margin: "0 0 12px", flex: 1, minWidth: 240, lineHeight: 1.5 },
  lista: { display: "flex", flexDirection: "column", gap: 8 },
  item: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, flexWrap: "wrap" },
  itemNome: { fontWeight: 700, fontSize: ".92rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  itemSub: { fontSize: ".78rem", color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pill: { display: "inline-flex", fontSize: ".68rem", fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" },
  // Monoespaçado e espaçado: o código será LIDO e digitado a partir de um papel.
  codigo: { fontFamily: "ui-monospace, Menlo, Consolas, monospace", letterSpacing: ".06em", fontSize: ".78rem", color: "var(--accent)" },
  input: { padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontSize: ".88rem", background: "var(--card-bg)", color: "var(--text)", fontFamily: "var(--font)", width: "100%" },
  lbl: { display: "block", fontSize: ".8rem", fontWeight: 700, color: "var(--text)", marginBottom: 4 },
  dica: { fontSize: ".74rem", color: "var(--text-subtle)", fontWeight: 400, margin: "6px 0 0", lineHeight: 1.5 },
  check: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".84rem", color: "var(--text)", cursor: "pointer" },
  vazio: { fontSize: ".85rem", color: "var(--text-muted)", padding: "18px 0", textAlign: "center" },
  ok: { background: "var(--success-bg)", color: "var(--success)", padding: "9px 12px", borderRadius: 8, fontSize: ".84rem", fontWeight: 600, marginBottom: 12 },
  err: { background: "var(--danger-bg)", color: "var(--danger)", padding: "9px 12px", borderRadius: 8, fontSize: ".84rem", fontWeight: 600, marginBottom: 12 },
  emitidos: { background: "var(--success-bg)", border: "1px solid var(--success-border, transparent)", borderRadius: 10, padding: "14px 16px", marginBottom: 14, color: "var(--text)" },
  emitidosTopo: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, color: "var(--success)", marginBottom: 4 },
  emitidoLinha: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: "1px solid var(--border)", fontSize: ".85rem", flexWrap: "wrap" },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 200 },
  modal: { background: "var(--card-bg)", borderRadius: 14, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "var(--sh-xl)" },
  mh: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--border)", color: "var(--text)" },
  mclose: { background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 },
  mform: { padding: 18, display: "flex", flexDirection: "column", gap: 12 },
  mfoot: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 },
  rodape: { fontSize: ".78rem", color: "var(--text-subtle)", marginTop: 20, textAlign: "center" },
  linkBtn: { background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit", textDecoration: "underline" },
};
