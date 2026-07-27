// Painel de Configurações da intranet (/intranet).
//
// Entra quem tem usuário e senha de administrador. Gerencia as palavras-chave do
// portal (uma por pessoa, validade de 3 meses, horário e bloqueio), os links, a
// rede autorizada e vê o histórico de acessos.
//
// A aba Usuários só aparece para o SUPERUSUÁRIO — é ele quem adiciona terceiros.
//
// Nada aqui fala com o banco direto: tudo passa pela API, que revalida o token e
// o nível a CADA chamada. Esconder uma aba é conforto visual, não proteção —
// testado: um terceiro chamando `listarAdmins` é recusado pelo servidor mesmo
// com token válido.

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LogoPontual from "../components/LogoPontual";
import { api, tokenAdmin, limparAdmin } from "../api/intranet";
import { NOMES_ICONES, iconePara } from "../data/icones";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TIPOS = [
  { id: "url", label: "Endereço externo" },
  { id: "interno", label: "Login do Gestão Operacional" },
  { id: "config", label: "Painel de Configurações" },
  { id: "instrucoes", label: "Abrir PDF" },
  { id: "subsecoes", label: "Várias opções (subseções)" },
];
const RESULTADOS = {
  ok: { txt: "Entrou", cor: "var(--success)", bg: "var(--success-bg)" },
  chave_invalida: { txt: "Chave inválida", cor: "var(--danger)", bg: "var(--danger-bg)" },
  senha_invalida: { txt: "Senha inválida", cor: "var(--danger)", bg: "var(--danger-bg)" },
  expirada: { txt: "Chave expirada", cor: "var(--warning)", bg: "var(--surface-3)" },
  bloqueado: { txt: "Bloqueado", cor: "var(--danger)", bg: "var(--danger-bg)" },
  fora_horario: { txt: "Fora do horário", cor: "var(--warning)", bg: "var(--surface-3)" },
  ip_negado: { txt: "Rede negada", cor: "var(--danger)", bg: "var(--danger-bg)" },
  travado: { txt: "Travado (força bruta)", cor: "var(--danger)", bg: "var(--danger-bg)" },
  sem_privilegio: { txt: "Sem privilégio", cor: "var(--warning)", bg: "var(--surface-3)" },
};
const LINK_VAZIO = { nome: "", tipo: "url", url: "", icone: "link", cor: "#334155", ordem: 99, ativo: true, subsecoes: [] };
const CHAVE_VAZIA = { nome: "", chave: "", ativo: true, bloqueado: false, horario: null };
const ADMIN_VAZIO = { usuario: "", email: "", senha: "", super: false, ativo: true };

// Datas do Postgres, em dois sabores e com três armadilhas.
//
//   `date` vem "2026-07-20". new Date("2026-07-20") é meia-noite UTC, que no
//   Brasil (UTC-3) volta um dia e imprime 19/07 — a data ERRADA. Por isso a
//   montamos na mão, como data local.
//
//   `timestamptz` vem "2026-10-15 20:11:41.66+00": o espaço não é ISO 8601 (o
//   Safari recusa) e o fuso de dois dígitos, "+00", também não — o Chrome
//   devolve Invalid Date. Vira "T" e "+00:00".
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

export default function IntranetArea() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [aba, setAba] = useState("chaves");
  const [chaves, setChaves] = useState([]);
  const [links, setLinks] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [ips, setIps] = useState([]);
  const [ipNovo, setIpNovo] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);   // "chave" | "link" | "admin"
  const [form, setForm] = useState({});
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  function aviso(t) { setErro(""); setMsg(t); setTimeout(() => setMsg(""), 3500); }

  // Entrada: é o servidor quem diz se o token vale. Sem token ou expirado, volta
  // ao portal.
  useEffect(() => {
    if (!tokenAdmin()) { navigate("/sistemas", { replace: true }); return; }
    (async () => {
      try {
        const d = await api("painel");
        setAdmin(d.admin);
        setIps(d.ips || []);
        document.title = "Configurações - Área interna";
      } catch {
        limparAdmin();
        navigate("/sistemas", { replace: true });
      }
    })();
  }, [navigate]);

  const carregarAba = useCallback(async () => {
    if (!admin) return;
    try {
      if (aba === "chaves") setChaves((await api("listarChaves")).chaves || []);
      if (aba === "links") setLinks((await api("listarLinks")).links || []);
      if (aba === "usuarios") setAdmins((await api("listarAdmins")).admins || []);
      if (aba === "historico") { setAcessos((await api("listarAcessos")).acessos || []); setPagina(1); }
    } catch (e) { setErro(e?.message || "Falha ao carregar."); }
  }, [aba, admin]);

  useEffect(() => { carregarAba(); }, [carregarAba]);

  const abas = [
    { id: "chaves", label: "Palavras-chave", mostra: true },
    { id: "links", label: "Links", mostra: true },
    { id: "historico", label: "Histórico", mostra: true },
    { id: "rede", label: "Rede", mostra: true },
    // Todo admin cadastra usuários. O limite é o que ele pode CONCEDER, não o
    // que ele vê: só um super cria ou altera outro super — o servidor recusa.
    { id: "usuarios", label: "Usuários", mostra: true },
  ].filter((a) => a.mostra);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      const acao = { chave: "salvarChave", link: "salvarLink", admin: "salvarAdmin", perfil: "salvarPerfil" }[modal];
      await api(acao, form);
      setModal(null);
      aviso("Salvo.");
      if (modal === "perfil") {
        // O cabeçalho mostra o usuário: sem reler, ele fica com o nome antigo.
        setAdmin((await api("painel")).admin);
      } else {
        await carregarAba();
      }
    } catch (err) { setErro(err?.message || "Falha ao salvar."); }
    setSalvando(false);
  }

  async function excluir(tipo, item, rotulo) {
    if (!window.confirm(`Excluir "${rotulo}"?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      await api(tipo, { id: item.id });
      aviso("Excluído.");
      await carregarAba();
    } catch (e) { setErro(e?.message || "Falha ao excluir."); }
  }

  async function alternar(acao, dados) {
    try { await api(acao, dados); await carregarAba(); }
    catch (e) { setErro(e?.message || "Falha ao alterar."); }
  }

  async function salvarIps(lista) {
    try { const d = await api("salvarConfig", { ips: lista }); setIps(d.ips); aviso("Rede atualizada."); }
    catch (e) { setErro(e?.message || "Falha ao salvar."); }
  }

  function encerrarSessao() {
    limparAdmin();
    navigate("/sistemas", { replace: true });
  }

  if (!admin) return null;

  const visiveis = acessos.filter((a) => filtro === "todos" || (filtro === "negados" ? a.resultado !== "ok" : a.tipo === filtro)).slice(0, pagina * 50);
  const totalFiltrado = acessos.filter((a) => filtro === "todos" || (filtro === "negados" ? a.resultado !== "ok" : a.tipo === filtro)).length;

  return (
    <div style={s.wrap}>
      {/* Estilo inline não expressa :hover/:focus/:active — é limitação da
          plataforma, não escolha. Sem este bloco, os botões do cabeçalho não
          davam retorno ao passar o mouse e ficavam com o anel de foco padrão do
          navegador grudado depois do clique, parecendo "pressionados" e de outra
          cor. Aqui o foco só aparece para quem navega por teclado (:focus-visible). */}
      <style>{`
        .cfg-hbtn {
          padding: 8px 14px; border-radius: 8px; cursor: pointer;
          font-weight: 600; font-size: .8rem; color: #fff;
          background: rgba(255,255,255,.14);
          border: 1px solid rgba(255,255,255,.28);
          transition: background .15s ease, transform .1s ease;
        }
        .cfg-hbtn:hover  { background: rgba(255,255,255,.26); }
        .cfg-hbtn:active { background: rgba(255,255,255,.34); transform: translateY(1px); }
        .cfg-hbtn:focus  { outline: none; }
        .cfg-hbtn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

        .cfg-tab {
          padding: 10px 16px; background: none; border: none;
          border-bottom: 2px solid transparent; color: var(--text-muted);
          font-weight: 600; font-size: .9rem; cursor: pointer;
          transition: color .15s ease, border-color .15s ease;
        }
        .cfg-tab:hover { color: var(--text); }
        .cfg-tab:focus { outline: none; }
        .cfg-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: 4px; }
        .cfg-tab.ativa { color: var(--accent); border-bottom-color: var(--accent); }

        /* Seletor de ícone: o desenho é a opção, não o nome dele. */
        .cfg-ico {
          width: 40px; height: 40px; display: inline-flex;
          align-items: center; justify-content: center;
          border: 1px solid var(--border); border-radius: 9px;
          background: var(--card-bg); color: var(--text-muted); cursor: pointer;
          transition: border-color .12s ease, color .12s ease, background .12s ease;
        }
        .cfg-ico:hover { border-color: var(--accent); color: var(--accent); }
        .cfg-ico:focus { outline: none; }
        .cfg-ico:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      `}</style>

      <header style={s.header}>
        <LogoPontual height={34} variant="white" />
        <span style={s.htitle}>Configurações</span>
        <span style={s.quem}>{admin.usuario}{admin.super ? " · superusuário" : ""}</span>
        {/* Qualquer admin edita a própria conta — inclusive o terceiro, que sem
            isto dependeria do super até para trocar a própria senha. */}
        <button type="button" className="cfg-hbtn" onClick={() => { setForm({ usuario: admin.usuario, email: admin.email || "", senha: "" }); setErro(""); setModal("perfil"); }}>
          Meu perfil
        </button>
        <button type="button" className="cfg-hbtn" onClick={() => navigate("/sistemas")}>Voltar ao portal</button>
        <button type="button" className="cfg-hbtn" onClick={encerrarSessao}>Encerrar sessão</button>
      </header>

      <main style={s.body}>
        <div style={s.tabs}>
          {abas.map((a) => (
            <button key={a.id} type="button" className={"cfg-tab" + (aba === a.id ? " ativa" : "")} onClick={() => setAba(a.id)}>{a.label}</button>
          ))}
        </div>

        {msg && <div style={s.ok}>{msg}</div>}
        {erro && <div style={s.err}>{erro}</div>}

        {aba === "chaves" && (
          <>
            <div style={s.barra}>
              <p style={s.sub}>Quem entra na intranet. Cada pessoa tem a sua palavra-chave, que vale por 3 meses — cadastrar uma nova reinicia o prazo.</p>
              <button style={s.btn} onClick={() => { setForm({ ...CHAVE_VAZIA }); setModal("chave"); }}>+ Nova palavra-chave</button>
            </div>
            <div style={s.lista}>
              {chaves.map((c) => (
                <div key={c.id} style={{ ...s.item, opacity: c.ativo === false ? 0.55 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.itemNome}>{c.nome}</div>
                    <div style={s.itemSub}>
                      {c.horario ? `${c.horario.inicio}–${c.horario.fim} · ${(c.horario.dias || []).length ? c.horario.dias.map((d) => DIAS[d]).join(" ") : "todos os dias"}` : "Acesso 24h"}
                      {" · expira em "}{dataBR(c.expiraEm, false)}
                    </div>
                  </div>
                  {c.expirada && <span style={{ ...s.pill, background: "var(--surface-3)", color: "var(--warning)" }}>Expirada</span>}
                  {c.bloqueado && <span style={{ ...s.pill, background: "var(--danger-bg)", color: "var(--danger)" }}>Bloqueada</span>}
                  <button style={s.mini} onClick={() => alternar("salvarChave", { ...c, bloqueado: !c.bloqueado })}>{c.bloqueado ? "Desbloquear" : "Bloquear"}</button>
                  <button style={s.mini} onClick={() => { setForm({ ...CHAVE_VAZIA, ...c, chave: "" }); setModal("chave"); }}>Editar</button>
                  <button style={{ ...s.mini, color: "var(--danger)" }} onClick={() => excluir("excluirChave", c, c.nome)}>Excluir</button>
                </div>
              ))}
              {chaves.length === 0 && <p style={s.vazio}>Nenhuma palavra-chave cadastrada — ninguém consegue abrir o portal.</p>}
            </div>
          </>
        )}

        {aba === "links" && (
          <>
            <div style={s.barra}>
              <p style={s.sub}>Os cards do portal. Desativar tira da tela sem apagar o cadastro.</p>
              <button style={s.btn} onClick={() => { setForm({ ...LINK_VAZIO }); setModal("link"); }}>+ Novo link</button>
            </div>
            <div style={s.lista}>
              {links.map((l) => {
                const Icone = iconePara(l.icone);
                const inativo = l.ativo === false;
                return (
                  <div key={l.id} style={{ ...s.item, opacity: inativo ? 0.55 : 1 }}>
                    <span style={s.ico}><Icone size={20} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.itemNome}>{l.nome}</div>
                      <div style={s.itemSub}>{TIPOS.find((t) => t.id === l.tipo)?.label || l.tipo}{l.url ? ` — ${l.url}` : ""}</div>
                    </div>
                    <span style={{ ...s.pill, background: inativo ? "var(--danger-bg)" : "var(--success-bg)", color: inativo ? "var(--danger)" : "var(--success)" }}>
                      {inativo ? "Inativo" : "Ativo"}
                    </span>
                    <button style={s.mini} onClick={() => alternar("salvarLink", { ...l, ativo: !(l.ativo !== false) })}>{inativo ? "Ativar" : "Desativar"}</button>
                    <button style={s.mini} onClick={() => { setForm({ ...LINK_VAZIO, ...l, subsecoes: l.subsecoes || [] }); setModal("link"); }}>Editar</button>
                    <button style={{ ...s.mini, color: "var(--danger)" }} onClick={() => excluir("excluirLink", l, l.nome)}>Excluir</button>
                  </div>
                );
              })}
              {links.length === 0 && <p style={s.vazio}>Nenhum link cadastrado.</p>}
            </div>
          </>
        )}

        {aba === "usuarios" && (
          <>
            <div style={s.barra}>
              <p style={s.sub}>
                Quem entra nestas Configurações. Você pode cadastrar novos usuários com os mesmos
                privilégios que tem{admin.super ? "" : " — criar ou alterar um superusuário é só para quem já é super"}.
              </p>
              <button style={s.btn} onClick={() => { setForm({ ...ADMIN_VAZIO }); setModal("admin"); }}>+ Novo usuário</button>
            </div>
            <div style={s.lista}>
              {admins.map((a) => {
                // Quem não é super não mexe em super: o servidor recusa de qualquer
                // forma, mas oferecer o botão só para ver o erro é maltrato.
                const podeMexer = admin.super || !a.super;
                return (
                  <div key={a.id} style={{ ...s.item, opacity: a.ativo === false ? 0.55 : 1 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.itemNome}>{a.usuario}{a.id === admin.id && <span style={{ fontWeight: 400, color: "var(--text-subtle)", fontSize: ".76rem" }}> · você</span>}</div>
                      <div style={s.itemSub}>
                        {a.email || "sem e-mail"} · {a.super ? "Superusuário — cria outros superusuários" : "Administrador — cadastra usuários comuns, chaves e links"}
                      </div>
                    </div>
                    {a.super && <span style={{ ...s.pill, background: "var(--accent-soft)", color: "var(--accent)" }}>Super</span>}
                    {a.ativo === false && <span style={{ ...s.pill, background: "var(--danger-bg)", color: "var(--danger)" }}>Inativo</span>}
                    {podeMexer ? (
                      <>
                        <button style={s.mini} onClick={() => { setForm({ ...ADMIN_VAZIO, ...a, senha: "" }); setModal("admin"); }}>Editar</button>
                        <button style={{ ...s.mini, color: "var(--danger)" }} onClick={() => excluir("excluirAdmin", a, a.usuario)}>Excluir</button>
                      </>
                    ) : (
                      <span style={{ ...s.dica, margin: 0 }}>só um super altera</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {aba === "historico" && (
          <>
            <p style={s.sub}>
              Toda tentativa, inclusive as negadas. A localização vem do navegador de quem entrou —
              quem negar a permissão aparece como "negada". O IP é observado pelo servidor.
            </p>
            <div style={s.barra}>
              {[["todos", "Tudo"], ["portal", "Portal"], ["painel", "Configurações"], ["negados", "Só negados"]].map(([id, lb]) => (
                <button key={id} style={{ ...s.mini, ...(filtro === id ? { background: "var(--accent-soft)", color: "var(--accent)" } : {}) }}
                  onClick={() => { setFiltro(id); setPagina(1); }}>{lb}</button>
              ))}
            </div>
            <div style={s.lista}>
              {visiveis.map((a) => {
                const r = RESULTADOS[a.resultado] || { txt: a.resultado, cor: "var(--text-muted)", bg: "var(--surface-3)" };
                const q = a.coords;
                return (
                  <div key={a.id} style={s.item}>
                    <span style={{ ...s.pill, background: r.bg, color: r.cor, minWidth: 118, justifyContent: "center" }}>{r.txt}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.itemNome}>{a.quem || "—"} <span style={{ fontWeight: 400, color: "var(--text-subtle)", fontSize: ".76rem" }}>· {a.tipo === "painel" ? "Configurações" : "portal"}</span></div>
                      <div style={s.itemSub}>
                        {dataBR(a.em)} · IP {a.ip || "—"} ·{" "}
                        {q ? (
                          <a href={`https://www.google.com/maps?q=${q.lat},${q.lng}`} target="_blank" rel="noopener noreferrer" style={s.link}>
                            {q.lat.toFixed(4)}, {q.lng.toFixed(4)}
                          </a>
                        ) : "localização negada"}
                      </div>
                    </div>
                  </div>
                );
              })}
              {totalFiltrado === 0 && <p style={s.vazio}>Nenhum acesso registrado.</p>}
            </div>
            {visiveis.length < totalFiltrado && (
              <button style={{ ...s.btn, marginTop: 14 }} onClick={() => setPagina((p) => p + 1)}>
                Carregar mais ({totalFiltrado - visiveis.length} restantes)
              </button>
            )}
          </>
        )}

        {aba === "rede" && (
          <>
            <p style={s.sub}>
              Só conexões vindas destes IPs (ou faixas) entram na intranet. Lista vazia = sem restrição,
              e só a palavra-chave protege. Atenção: o IP pode ser forjado por quem souber como — trate
              como conveniência, não como barreira.
            </p>
            <div style={s.barra}>
              <input style={s.input} value={ipNovo} onChange={(e) => setIpNovo(e.target.value)} placeholder="200.1.2.3 ou 200.1.2.0/24"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (ipNovo.trim()) { salvarIps([...ips, ipNovo.trim()]); setIpNovo(""); } } }} />
              <button style={s.btn} onClick={() => { if (ipNovo.trim()) { salvarIps([...ips, ipNovo.trim()]); setIpNovo(""); } }}>Adicionar</button>
            </div>
            <div style={s.lista}>
              {ips.map((ip) => (
                <div key={ip} style={s.item}>
                  <div style={{ flex: 1 }}><code>{ip}</code></div>
                  <button style={{ ...s.mini, color: "var(--danger)" }} onClick={() => { if (window.confirm(`Remover ${ip}?`)) salvarIps(ips.filter((x) => x !== ip)); }}>Remover</button>
                </div>
              ))}
              {ips.length === 0 && <p style={s.vazio}>Nenhum IP cadastrado — a intranet aceita qualquer rede.</p>}
            </div>
          </>
        )}
      </main>

      {modal && (
        <div style={s.overlay} className="modal-mobile-sheet-overlay" onClick={() => setModal(null)}>
          <div style={s.modal} className="modal-mobile-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={s.mh}>
              <strong>
                {modal === "chave" ? (form.id ? "Editar palavra-chave" : "Nova palavra-chave")
                  : modal === "link" ? (form.id ? "Editar link" : "Novo link")
                  : modal === "perfil" ? "Meu perfil"
                  : form.id ? "Editar usuário" : "Novo usuário"}
              </strong>
              <button style={s.mclose} onClick={() => setModal(null)}>×</button>
            </div>
            <form style={s.mform} onSubmit={salvar}>

              {modal === "chave" && (
                <>
                  <label style={s.lbl}>De quem é
                    <input style={s.input} value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoFocus placeholder="Nome da pessoa" />
                  </label>
                  <label style={s.lbl}>Palavra-chave {form.id && <span style={s.dica}>(vazio = manter a atual; preencher renova por mais 3 meses)</span>}
                    <input style={s.input} type="password" value={form.chave || ""} onChange={(e) => setForm({ ...form, chave: e.target.value })}
                      placeholder={form.id ? "•••••• (inalterada)" : "mínimo 6 caracteres"} required={!form.id} />
                  </label>
                  {form.id && <p style={s.dica}>Expira em {dataBR(form.expiraEm, false)}{form.expirada ? " — já vencida" : ""}.</p>}
                  <label style={s.check}>
                    <input type="checkbox" checked={!form.horario} onChange={(e) => setForm({ ...form, horario: e.target.checked ? null : { dias: [1, 2, 3, 4, 5], inicio: "08:00", fim: "18:00" } })} />
                    Acesso 24 horas, todos os dias
                  </label>
                  {form.horario && (
                    <>
                      <div style={s.lbl}>Dias permitidos</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {DIAS.map((d, i) => (
                          <label key={d} style={{ ...s.check, marginRight: 0 }}>
                            <input type="checkbox" checked={(form.horario.dias || []).includes(i)}
                              onChange={(e) => { const dias = e.target.checked ? [...form.horario.dias, i] : form.horario.dias.filter((x) => x !== i); setForm({ ...form, horario: { ...form.horario, dias: dias.sort() } }); }} />
                            {d}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <label style={{ ...s.lbl, flex: 1 }}>Das
                          <input style={s.input} type="time" value={form.horario.inicio} onChange={(e) => setForm({ ...form, horario: { ...form.horario, inicio: e.target.value } })} />
                        </label>
                        <label style={{ ...s.lbl, flex: 1 }}>Até
                          <input style={s.input} type="time" value={form.horario.fim} onChange={(e) => setForm({ ...form, horario: { ...form.horario, fim: e.target.value } })} />
                        </label>
                      </div>
                      <p style={s.dica}>Uma janela que cruza a meia-noite (22:00 até 06:00) é aceita. O horário é conferido pelo relógio do servidor, no fuso de São Paulo.</p>
                    </>
                  )}
                </>
              )}

              {modal === "link" && (
                <>
                  <label style={s.lbl}>Nome
                    <input style={s.input} value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoFocus />
                  </label>
                  <label style={s.lbl}>Tipo
                    <select style={s.input} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                      {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </label>
                  {(form.tipo === "url" || form.tipo === "instrucoes") && (
                    <label style={s.lbl}>Endereço
                      <input style={s.input} value={form.url || ""} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
                    </label>
                  )}
                  {form.tipo === "subsecoes" && (
                    <div>
                      <div style={s.lbl}>Subseções</div>
                      {(form.subsecoes || []).map((sub, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                          <input style={{ ...s.input, flex: 1 }} value={sub.nome} placeholder="Nome"
                            onChange={(e) => { const l = [...form.subsecoes]; l[i] = { ...sub, nome: e.target.value, id: sub.id || `s${i}` }; setForm({ ...form, subsecoes: l }); }} />
                          <input style={{ ...s.input, flex: 2 }} value={sub.url} placeholder="https://… (vazio = Em breve)"
                            onChange={(e) => { const l = [...form.subsecoes]; l[i] = { ...sub, url: e.target.value, id: sub.id || `s${i}` }; setForm({ ...form, subsecoes: l }); }} />
                          <button type="button" style={s.mini} onClick={() => setForm({ ...form, subsecoes: form.subsecoes.filter((_, j) => j !== i) })}>×</button>
                        </div>
                      ))}
                      <button type="button" style={s.mini} onClick={() => setForm({ ...form, subsecoes: [...(form.subsecoes || []), { id: `s${(form.subsecoes || []).length}`, nome: "", url: "" }] })}>+ Subseção</button>
                    </div>
                  )}
                  {/* Grade de ícones, e não <select> de nomes: "quadrantes" e
                      "grade" não dizem nada a quem escolhe — o desenho diz. */}
                  <div>
                    <div style={s.lbl}>Ícone</div>
                    <div style={s.iconeGrade}>
                      {NOMES_ICONES.map((n) => {
                        const Icone = iconePara(n);
                        const sel = form.icone === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            title={n}
                            aria-label={n}
                            aria-pressed={sel}
                            className="cfg-ico"
                            style={sel ? { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent)" } : undefined}
                            onClick={() => setForm({ ...form, icone: n })}
                          >
                            <Icone size={20} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label style={s.lbl}>Ordem na tela
                    <input style={s.input} type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} />
                  </label>
                </>
              )}


              {(modal === "admin" || modal === "perfil") && (
                <>
                  <label style={s.lbl}>Usuário
                    <input style={s.input} value={form.usuario || ""} onChange={(e) => setForm({ ...form, usuario: e.target.value })} required autoFocus autoComplete="off" />
                  </label>
                  <label style={s.lbl}>E-mail <span style={s.dica}>(opcional — o login continua sendo pelo usuário)</span>
                    <input style={s.input} type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="nome@pontualpetroleo.com.br" autoComplete="off" />
                  </label>
                  <label style={s.lbl}>Senha {(form.id || modal === "perfil") && <span style={s.dica}>(vazio = manter a atual)</span>}
                    <input style={s.input} type="password" value={form.senha || ""} onChange={(e) => setForm({ ...form, senha: e.target.value })}
                      placeholder={form.id || modal === "perfil" ? "•••••• (inalterada)" : "mínimo 8 caracteres"} required={!form.id && modal === "admin"} autoComplete="new-password" />
                  </label>
                  {modal === "perfil" && (
                    <p style={s.dica}>Ao trocar a senha, as suas outras sessões abertas são encerradas.</p>
                  )}
                  {/* Nível e situação são decisão do super, não de quem se edita —
                      senão qualquer terceiro se promoveria sozinho. O servidor
                      também recusa: salvarPerfil nem lê estes campos. */}
                  {modal === "admin" && (
                    <>
                      {/* Só quem é super oferece o nível super: ninguém concede o
                          que não tem. O servidor recusa igual — isto é só para não
                          mostrar uma opção que vai dar erro. */}
                      {admin.super && (
                        <label style={s.check}>
                          <input type="checkbox" checked={!!form.super} onChange={(e) => setForm({ ...form, super: e.target.checked })} />
                          Superusuário (pode criar outros superusuários)
                        </label>
                      )}
                      <label style={s.check}>
                        <input type="checkbox" checked={form.ativo !== false} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                        Ativo
                      </label>
                    </>
                  )}
                </>
              )}

              {erro && <p style={{ color: "var(--danger)", fontSize: ".85rem", margin: 0 }}>{erro}</p>}
              <div style={s.mfoot}>
                <button type="button" style={s.mini} onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" style={s.btn} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "var(--bg, #f0f4f8)", fontFamily: "var(--font)" },
  header: { background: "var(--header-bg, #18216e)", color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 4px 14px rgba(15,23,42,.18)", flexWrap: "wrap" },
  htitle: { fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-.01em" },
  quem: { marginLeft: "auto", fontSize: ".82rem", opacity: 0.9 },
  body: { padding: 24, maxWidth: 1000, margin: "0 auto" },
  tabs: { display: "flex", gap: 6, borderBottom: "1px solid var(--border)", marginBottom: 18, flexWrap: "wrap" },
  // As abas, os botões do cabeçalho e o seletor de ícone estão no <style> lá em
  // cima: precisam de :hover/:focus, que estilo inline não expressa.
  iconeGrade: { display: "flex", flexWrap: "wrap", gap: 6 },
  barra: { display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  sub: { fontSize: ".85rem", color: "var(--text-muted)", margin: "0 0 12px", flex: 1, minWidth: 240 },
  lista: { display: "flex", flexDirection: "column", gap: 8 },
  item: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, flexWrap: "wrap" },
  ico: { width: 38, height: 38, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemNome: { fontWeight: 700, fontSize: ".92rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  itemSub: { fontSize: ".78rem", color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pill: { display: "inline-flex", fontSize: ".68rem", fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" },
  btn: { padding: "9px 16px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: ".82rem" },
  mini: { padding: "6px 10px", background: "var(--surface-3)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: ".75rem", whiteSpace: "nowrap" },
  input: { padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontSize: ".88rem", background: "var(--card-bg)", color: "var(--text)", fontFamily: "var(--font)", width: "100%" },
  lbl: { display: "block", fontSize: ".8rem", fontWeight: 700, color: "var(--text)", marginBottom: 4 },
  dica: { fontSize: ".74rem", color: "var(--text-subtle)", fontWeight: 400, margin: "4px 0 0" },
  check: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".84rem", color: "var(--text)", marginRight: 12, cursor: "pointer" },
  vazio: { fontSize: ".85rem", color: "var(--text-muted)", padding: "18px 0", textAlign: "center" },
  link: { color: "var(--accent)", textDecoration: "none" },
  ok: { background: "var(--success-bg)", color: "var(--success)", padding: "9px 12px", borderRadius: 8, fontSize: ".84rem", fontWeight: 600, marginBottom: 12 },
  err: { background: "var(--danger-bg)", color: "var(--danger)", padding: "9px 12px", borderRadius: 8, fontSize: ".84rem", fontWeight: 600, marginBottom: 12 },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 200 },
  modal: { background: "var(--card-bg)", borderRadius: 14, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "var(--sh-xl)" },
  mh: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--border)", color: "var(--text)" },
  mclose: { background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 },
  mform: { padding: 18, display: "flex", flexDirection: "column", gap: 12 },
  mfoot: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 },
};
