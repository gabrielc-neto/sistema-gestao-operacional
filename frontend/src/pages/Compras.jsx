// Módulo Compras — propostas de gastos com validação em duas instâncias.
//
// Papéis:
//  - Gestor: cria/edita propostas do PRÓPRIO setor (anexos, itens, justificativa)
//  - Diretoria + Superintendência: validam (aprovam/reprovam) — precisa das DUAS
//  - Convidados: pessoas adicionadas a UMA proposta via link (sem login)
//  - Compras: registra valores comprados por setor
//  - Dashboard: excedente = comprado − aprovado, por setor
//
// Permissões: compras.ver / criar / editar / excluir / ver_todos /
//             aprovar_diretoria / aprovar_super / convidar / registrar / dashboard

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection, getDocs, addDoc, setDoc, updateDoc, deleteDoc, doc,
  query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useRBAC } from "../rbac/RBACContext";
import ModuleHeader from "../components/ModuleHeader";
import ExportBar from "../components/ExportBar";
import {
  fmtBRL, fmtBRLcurto, maskMoeda, parseMoeda, statusProposta, STATUS_META,
  novoToken, linkConvite, uploadAnexo, tamanhoLegivel,
} from "../utils/compras";
import {
  Plus, Paperclip, Link2, Check, X, Trash2, Copy, ShoppingCart,
  FileText, TrendingUp, ClipboardCheck, Users,
} from "lucide-react";

const ITEM_VAZIO = { descricao: "", quantidade: "1", valorUnitario: "" };

export default function Compras() {
  const { profile, user } = useAuth();
  const { setor, temPermissao, isSuperAdmin } = useRBAC();

  // Capacidades por permissão
  const podeCriar     = temPermissao("compras.criar");
  const vejoTodos     = temPermissao("compras.ver_todos");
  const souDiretoria  = temPermissao("compras.aprovar_diretoria");
  const souSuper      = temPermissao("compras.aprovar_super");
  const podeConvidar  = temPermissao("compras.convidar");
  const podeRegistrar = temPermissao("compras.registrar");
  const podeDashboard = temPermissao("compras.dashboard");

  const quemSou = profile?.nome || profile?.email || "—";
  const meuSetorId = setor?.id || profile?.setor_id || null;
  const meuSetorNome = setor?.nome || "";

  const [aba, setAba] = useState("propostas");
  const [propostas, setPropostas] = useState([]);
  const [compras, setCompras]     = useState([]);
  const [setores, setSetores]     = useState([]);
  const [loading, setLoading]     = useState(true);

  // Carregamento
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      // Propostas: gestor sem ver_todos enxerga só o próprio setor
      let qProp;
      if (vejoTodos || isSuperAdmin) {
        qProp = query(collection(db, "propostas_compra"), orderBy("numero", "desc"));
      } else if (meuSetorId) {
        qProp = query(collection(db, "propostas_compra"), where("setor_id", "==", meuSetorId));
      } else {
        qProp = null;
      }
      const [propSnap, comSnap, setSnap] = await Promise.all([
        qProp ? getDocs(qProp) : Promise.resolve({ docs: [] }),
        (podeRegistrar || podeDashboard || vejoTodos)
          ? getDocs(query(collection(db, "compras_setor"), orderBy("data", "desc"))).catch(() => ({ docs: [] }))
          : Promise.resolve({ docs: [] }),
        getDocs(query(collection(db, "setores"), orderBy("nome"))),
      ]);
      let props = propSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Ordena por número desc quando veio sem orderBy (query por setor)
      props.sort((a, b) => (b.numero || 0) - (a.numero || 0));
      setPropostas(props);
      setCompras(comSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSetores(setSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("[Compras] carregar:", e);
    } finally {
      setLoading(false);
    }
  }, [vejoTodos, isSuperAdmin, meuSetorId, podeRegistrar, podeDashboard]);

  useEffect(() => { carregar(); }, [carregar]);

  const abas = [
    { id: "propostas", label: "Propostas", Icon: FileText, mostra: true },
    { id: "registro",  label: "Registro de Compras", Icon: ShoppingCart, mostra: podeRegistrar },
    { id: "dashboard", label: "Dashboard", Icon: TrendingUp, mostra: podeDashboard },
  ].filter((a) => a.mostra);

  useEffect(() => {
    if (!abas.find((a) => a.id === aba)) setAba(abas[0]?.id || "propostas");
  }, [abas, aba]);

  return (
    <div style={st.wrap}>
      <ModuleHeader
        title="Compras"
        subtitle="Propostas de gastos e validação"
        actions={
          podeCriar && aba === "propostas" ? (
            <button className="mod-hbtn-alt" onClick={() => setNovoModal(true)}>
              <Plus size={16} /> Nova proposta
            </button>
          ) : null
        }
      />
      {/* botão de nova proposta usa estado abaixo — hoisting via render */}
      <ComprasBody
        aba={aba} setAba={setAba} abas={abas}
        propostas={propostas} compras={compras} setores={setores} loading={loading}
        carregar={carregar}
        caps={{ podeCriar, vejoTodos, souDiretoria, souSuper, podeConvidar, podeRegistrar, podeDashboard }}
        contexto={{ quemSou, meuSetorId, meuSetorNome, uid: user?.uid }}
      />
    </div>
  );

  // placeholder para satisfazer o handler do header (ver ComprasBody)
  function setNovoModal() { window.dispatchEvent(new CustomEvent("compras:nova")); }
}

// Corpo separado para manter o header simples e o estado de modais coeso.
function ComprasBody({ aba, setAba, abas, propostas, compras, setores, loading, carregar, caps, contexto }) {
  const [novo, setNovo] = useState(false);
  const [detalhe, setDetalhe] = useState(null);   // proposta aberta
  const [editando, setEditando] = useState(null); // proposta em edição (form)

  useEffect(() => {
    const h = () => setNovo(true);
    window.addEventListener("compras:nova", h);
    return () => window.removeEventListener("compras:nova", h);
  }, []);

  return (
    <div style={st.body}>
      {/* Abas */}
      <div style={st.tabs}>
        {abas.map((a) => (
          <button key={a.id}
            style={{ ...st.tab, ...(aba === a.id ? st.tabAtiva : {}) }}
            onClick={() => setAba(a.id)}>
            <a.Icon size={15} /> {a.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={st.info}>Carregando…</p>
      ) : (
        <>
          {aba === "propostas" && (
            <AbaPropostas
              propostas={propostas}
              onAbrir={(p) => setDetalhe(p)}
              podeCriar={caps.podeCriar}
              onNova={() => setNovo(true)}
            />
          )}
          {aba === "registro" && (
            <AbaRegistro compras={compras} setores={setores} contexto={contexto} carregar={carregar} />
          )}
          {aba === "dashboard" && (
            <AbaDashboard propostas={propostas} compras={compras} />
          )}
        </>
      )}

      {(novo || editando) && (
        <FormProposta
          proposta={editando}
          contexto={contexto}
          onClose={() => { setNovo(false); setEditando(null); }}
          onSalvo={() => { setNovo(false); setEditando(null); carregar(); }}
        />
      )}

      {detalhe && (
        <DetalheProposta
          proposta={propostas.find((p) => p.id === detalhe.id) || detalhe}
          caps={caps}
          contexto={contexto}
          onClose={() => setDetalhe(null)}
          onEditar={(p) => { setDetalhe(null); setEditando(p); }}
          onMudou={carregar}
        />
      )}
    </div>
  );
}

/* ═══════════════ Aba: Propostas ═══════════════ */
function AbaPropostas({ propostas, onAbrir, podeCriar, onNova }) {
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca]   = useState("");

  const lista = useMemo(() => {
    return propostas.filter((p) => {
      const s = statusProposta(p);
      if (filtro !== "todos" && s !== filtro) return false;
      const t = busca.toLowerCase();
      if (t && !(`${p.numero} ${p.titulo} ${p.setor_nome} ${p.criadoPor}`.toLowerCase().includes(t))) return false;
      return true;
    });
  }, [propostas, filtro, busca]);

  return (
    <>
      <div style={st.toolbar}>
        <input style={st.busca} placeholder="Buscar por título, setor, nº…"
          value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select style={st.select} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendentes</option>
          <option value="em_analise">Em análise</option>
          <option value="aprovada">Aprovadas</option>
          <option value="reprovada">Reprovadas</option>
        </select>
      </div>

      <ExportBar
        titulo="Propostas de Compra" arquivo="propostas-compra"
        subtitulo={() => `${lista.length} proposta(s)`}
        dados={() => ({
          colunas: ["Nº", "Título", "Setor", "Solicitado", "Aprovado", "Status", "Criado por"],
          linhas: lista.map((p) => [
            p.numero || "", p.titulo || "", p.setor_nome || "",
            fmtBRL(p.valorSolicitado), p.valorAprovado != null ? fmtBRL(p.valorAprovado) : "—",
            STATUS_META[statusProposta(p)].label, p.criadoPor || "",
          ]),
        })}
      />

      {lista.length === 0 ? (
        <div style={st.vazio}>
          <FileText size={30} style={{ opacity: .4 }} />
          <p style={st.info}>Nenhuma proposta {podeCriar ? "— crie a primeira." : "no seu setor."}</p>
          {podeCriar && <button style={st.btnPrim} onClick={onNova}><Plus size={15} /> Nova proposta</button>}
        </div>
      ) : (
        <div style={st.tabWrap}>
          <table style={st.table}>
            <thead>
              <tr>
                <th style={st.th}>Nº</th><th style={st.th}>Título</th><th style={st.th}>Setor</th>
                <th style={st.th}>Solicitado</th><th style={st.th}>Aprovado</th><th style={st.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const s = statusProposta(p);
                const m = STATUS_META[s];
                return (
                  <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => onAbrir(p)}>
                    <td style={st.td}><strong>#{p.numero}</strong></td>
                    <td style={st.td}>
                      {p.titulo}
                      {Array.isArray(p.anexos) && p.anexos.length > 0 && (
                        <Paperclip size={12} style={{ marginLeft: 6, color: "var(--text-subtle)" }} />
                      )}
                    </td>
                    <td style={{ ...st.td, color: "var(--text-muted)" }}>{p.setor_nome || "—"}</td>
                    <td style={st.td}>{fmtBRL(p.valorSolicitado)}</td>
                    <td style={st.td}>{p.valorAprovado != null ? fmtBRL(p.valorAprovado) : "—"}</td>
                    <td style={st.td}><Chip cor={m.cor} bg={m.bg}>{m.label}</Chip></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ═══════════════ Form de proposta (criar/editar) ═══════════════ */
function FormProposta({ proposta, contexto, onClose, onSalvo }) {
  const ed = !!proposta;
  const [titulo, setTitulo] = useState(proposta?.titulo || "");
  const [categoria, setCategoria] = useState(proposta?.categoria || "");
  const [justificativa, setJustificativa] = useState(proposta?.justificativa || "");
  const [descricao, setDescricao] = useState(proposta?.descricao || "");
  const [itens, setItens] = useState(
    proposta?.itens?.length
      ? proposta.itens.map((i) => ({
          descricao: i.descricao || "",
          quantidade: String(i.quantidade ?? "1"),
          valorUnitario: i.valorUnitario != null ? maskMoeda(String(Math.round(i.valorUnitario * 100))) : "",
        }))
      : [{ ...ITEM_VAZIO }]
  );
  const [anexos, setAnexos] = useState(proposta?.anexos || []);
  const [novosArquivos, setNovosArquivos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const total = itens.reduce(
    (s, i) => s + (parseFloat(i.quantidade) || 0) * parseMoeda(i.valorUnitario), 0
  );

  function setItem(i, campo, val) {
    setItens((arr) => arr.map((it, idx) => (idx === i ? { ...it, [campo]: campo === "valorUnitario" ? maskMoeda(val) : val } : it)));
  }
  function addItem() { setItens((a) => [...a, { ...ITEM_VAZIO }]); }
  function rmItem(i) { setItens((a) => a.filter((_, idx) => idx !== i)); }

  async function salvar(e) {
    e.preventDefault();
    if (!titulo.trim()) return setErro("Informe um título.");
    if (!contexto.meuSetorId && !ed) return setErro("Seu usuário não tem setor definido. Peça ao admin para atribuir.");
    setSalvando(true); setErro("");
    try {
      const itensLimpos = itens
        .filter((i) => i.descricao.trim())
        .map((i) => {
          const q = parseFloat(i.quantidade) || 0;
          const vu = parseMoeda(i.valorUnitario);
          return { descricao: i.descricao.trim(), quantidade: q, valorUnitario: vu, valorTotal: q * vu };
        });
      const valorSolicitado = itensLimpos.reduce((s, i) => s + i.valorTotal, 0);

      // ref da proposta (id necessário p/ subir anexos antes de gravar)
      const ref = ed ? doc(db, "propostas_compra", proposta.id) : doc(collection(db, "propostas_compra"));
      const idProp = ref.id;

      // upload dos novos arquivos
      let anexosFinais = [...anexos];
      for (const f of novosArquivos) {
        const a = await uploadAnexo(idProp, f);
        anexosFinais.push(a);
      }

      if (ed) {
        await updateDoc(ref, {
          titulo: titulo.trim(), categoria: categoria.trim(),
          justificativa: justificativa.trim(), descricao: descricao.trim(),
          itens: itensLimpos, valorSolicitado, anexos: anexosFinais,
          editadoPor: contexto.quemSou, editadoEm: serverTimestamp(),
        });
      } else {
        const numero = await proximoNumero();
        await setDoc(ref, {
          numero,
          setor_id: contexto.meuSetorId, setor_nome: contexto.meuSetorNome,
          titulo: titulo.trim(), categoria: categoria.trim(),
          justificativa: justificativa.trim(), descricao: descricao.trim(),
          itens: itensLimpos, valorSolicitado, valorAprovado: null,
          anexos: anexosFinais,
          status: "pendente",
          aprovacao: {
            diretoria: { status: "pendente" },
            superintendencia: { status: "pendente" },
          },
          convidados: [],
          historico: [{ acao: "criada", por: contexto.quemSou, em: new Date().toISOString() }],
          criadoPor: contexto.quemSou, criadoPorUid: contexto.uid || null,
          criadoEm: serverTimestamp(),
        });
      }
      onSalvo();
    } catch (err) {
      console.error(err);
      setErro("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={st.overlay} className="modal-mobile-sheet-overlay" onClick={onClose}>
      <div style={{ ...st.modal, maxWidth: 640 }} className="modal-mobile-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={st.mh}>
          <h3 style={st.mhTitle}>{ed ? `Editar proposta #${proposta.numero}` : "Nova proposta de gasto"}</h3>
          <button style={st.mclose} onClick={onClose}>×</button>
        </div>
        <form onSubmit={salvar} style={st.mform}>
          <label style={st.mlbl}>Título *
            <input style={st.minp} value={titulo} onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Compra de EPIs para a equipe" required />
          </label>
          <label style={st.mlbl}>Categoria
            <input style={st.minp} value={categoria} onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex: Material, Serviço, Equipamento…" />
          </label>
          <label style={st.mlbl}>Justificativa
            <textarea style={{ ...st.minp, minHeight: 60, resize: "vertical" }}
              value={justificativa} onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Por que este gasto é necessário?" />
          </label>
          <label style={st.mlbl}>Descrição / detalhes
            <input style={st.minp} value={descricao} onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes adicionais (opcional)" />
          </label>

          {/* Itens */}
          <div>
            <div style={st.itensHead}>
              <span style={st.mlblTxt}>Itens / valores</span>
              <button type="button" style={st.btnMini} onClick={addItem}><Plus size={13} /> Item</button>
            </div>
            {itens.map((it, i) => (
              <div key={i} style={st.itemRow}>
                <input style={{ ...st.minp, flex: 2 }} placeholder="Descrição"
                  value={it.descricao} onChange={(e) => setItem(i, "descricao", e.target.value)} />
                <input style={{ ...st.minp, width: 60 }} placeholder="Qtd" inputMode="numeric"
                  value={it.quantidade} onChange={(e) => setItem(i, "quantidade", e.target.value.replace(/[^\d.]/g, ""))} />
                <input style={{ ...st.minp, width: 110 }} placeholder="Vlr unit." inputMode="numeric"
                  value={it.valorUnitario} onChange={(e) => setItem(i, "valorUnitario", e.target.value)} />
                {itens.length > 1 && (
                  <button type="button" style={st.btnIcoDanger} onClick={() => rmItem(i)}><X size={15} /></button>
                )}
              </div>
            ))}
            <div style={st.totalLine}>Total solicitado: <strong>{fmtBRL(total)}</strong></div>
          </div>

          {/* Anexos */}
          <div>
            <span style={st.mlblTxt}>Anexos (orçamentos, cotações)</span>
            <div style={st.anexosBox}>
              {anexos.map((a, i) => (
                <div key={"a" + i} style={st.anexoItem}>
                  <Paperclip size={13} /><a href={a.url} target="_blank" rel="noreferrer" style={st.anexoLink}>{a.nome}</a>
                  <span style={st.anexoTam}>{tamanhoLegivel(a.tamanho)}</span>
                  <button type="button" style={st.btnIcoDanger} onClick={() => setAnexos((x) => x.filter((_, idx) => idx !== i))}><X size={13} /></button>
                </div>
              ))}
              {novosArquivos.map((f, i) => (
                <div key={"n" + i} style={{ ...st.anexoItem, opacity: .8 }}>
                  <Paperclip size={13} /><span>{f.name}</span>
                  <span style={st.anexoTam}>{tamanhoLegivel(f.size)} · novo</span>
                  <button type="button" style={st.btnIcoDanger} onClick={() => setNovosArquivos((x) => x.filter((_, idx) => idx !== i))}><X size={13} /></button>
                </div>
              ))}
              <label style={st.btnUpload}>
                <Paperclip size={14} /> Adicionar arquivo
                <input type="file" hidden multiple accept="image/*,application/pdf"
                  onChange={(e) => { setNovosArquivos((x) => [...x, ...Array.from(e.target.files || [])]); e.target.value = ""; }} />
              </label>
            </div>
          </div>

          {erro && <p style={st.erro}>{erro}</p>}
          <div style={st.mfoot}>
            <button type="button" style={st.mbtnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" style={st.mbtnSave} disabled={salvando}>
              {salvando ? "Salvando…" : ed ? "Salvar alterações" : "Criar proposta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

async function proximoNumero() {
  try {
    const snap = await getDocs(query(collection(db, "propostas_compra"), orderBy("numero", "desc")));
    const max = snap.docs[0]?.data()?.numero || 0;
    return max + 1;
  } catch { return Date.now() % 100000; }
}

/* ═══════════════ Detalhe + validação ═══════════════ */
function DetalheProposta({ proposta, caps, contexto, onClose, onEditar, onMudou }) {
  const [busy, setBusy] = useState(false);
  const [convNome, setConvNome] = useState("");
  const [convPapel, setConvPapel] = useState("");
  const [parecerDir, setParecerDir] = useState("");
  const [parecerSup, setParecerSup] = useState("");
  const [copiado, setCopiado] = useState("");

  const s = statusProposta(proposta);
  const m = STATUS_META[s];
  const dir = proposta.aprovacao?.diretoria || { status: "pendente" };
  const sup = proposta.aprovacao?.superintendencia || { status: "pendente" };
  const ehDono = proposta.criadoPorUid && proposta.criadoPorUid === contexto.uid;
  const podeEditar = (ehDono || caps.vejoTodos) && caps.podeCriar && s === "pendente";

  async function decidir(instancia, decisao, parecer) {
    setBusy(true);
    try {
      const ref = doc(db, "propostas_compra", proposta.id);
      const nova = {
        ...proposta.aprovacao,
        [instancia]: { status: decisao, por: contexto.quemSou, em: new Date().toISOString(), parecer: (parecer || "").trim() },
      };
      const tmp = { aprovacao: nova };
      const novoStatus = statusProposta(tmp);
      const patch = {
        aprovacao: nova,
        status: novoStatus,
        historico: [...(proposta.historico || []), {
          acao: `${instancia}_${decisao}`, por: contexto.quemSou, em: new Date().toISOString(),
          detalhe: (parecer || "").trim().slice(0, 200),
        }],
      };
      // Quando ambos aprovam, congela o valor aprovado (= solicitado)
      if (novoStatus === "aprovada" && proposta.valorAprovado == null) {
        patch.valorAprovado = proposta.valorSolicitado || 0;
      }
      await updateDoc(ref, patch);
      onMudou();
    } catch (e) { alert("Erro: " + e.message); }
    finally { setBusy(false); }
  }

  async function addConvidado() {
    if (!convNome.trim()) return;
    setBusy(true);
    try {
      const token = novoToken();
      const conv = {
        nome: convNome.trim(), papel: convPapel.trim(), token,
        status: "pendente", adicionadoPor: contexto.quemSou, adicionadoEm: new Date().toISOString(),
      };
      const lista = [...(proposta.convidados || []), conv];
      await updateDoc(doc(db, "propostas_compra", proposta.id), { convidados: lista });
      setConvNome(""); setConvPapel("");
      // copia o link já
      copiar(linkConvite(proposta.id, token));
      onMudou();
    } catch (e) { alert("Erro: " + e.message); }
    finally { setBusy(false); }
  }

  async function rmConvidado(token) {
    if (!window.confirm("Remover este convidado? O link dele deixará de funcionar.")) return;
    const lista = (proposta.convidados || []).filter((c) => c.token !== token);
    await updateDoc(doc(db, "propostas_compra", proposta.id), { convidados: lista });
    onMudou();
  }

  async function excluir() {
    if (!window.confirm(`Excluir a proposta #${proposta.numero}? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteDoc(doc(db, "propostas_compra", proposta.id));
      onClose(); onMudou();
    } catch (e) { alert("Erro: " + e.message); }
  }

  function copiar(txt) {
    navigator.clipboard?.writeText(txt).then(() => { setCopiado(txt); setTimeout(() => setCopiado(""), 1500); });
  }

  const instBox = (titulo, inst, souEu, aprovar, parecer, setParecer) => (
    <div style={st.instCard}>
      <div style={st.instTop}>
        <strong>{titulo}</strong>
        <Chip cor={inst.status === "aprovado" ? "var(--success)" : inst.status === "reprovado" ? "var(--danger)" : "var(--warning)"}
          bg={inst.status === "aprovado" ? "var(--success-bg)" : inst.status === "reprovado" ? "var(--danger-bg)" : "var(--warning-bg)"}>
          {inst.status === "aprovado" ? "Aprovado" : inst.status === "reprovado" ? "Reprovado" : "Pendente"}
        </Chip>
      </div>
      {inst.por && <div style={st.instMeta}>por {inst.por}</div>}
      {inst.parecer && <div style={st.instParecer}>“{inst.parecer}”</div>}
      {souEu && inst.status === "pendente" && s !== "reprovada" && (
        <div style={{ marginTop: 8 }}>
          <input style={{ ...st.minp, marginBottom: 6, fontSize: ".8rem" }} placeholder="Parecer (opcional)"
            value={parecer} onChange={(e) => setParecer(e.target.value)} />
          <div style={{ display: "flex", gap: 6 }}>
            <button style={st.btnAprovar} disabled={busy} onClick={() => aprovar(inst === dir ? "diretoria" : "superintendencia", "aprovado", parecer)}>
              <Check size={14} /> Aprovar
            </button>
            <button style={st.btnReprovar} disabled={busy} onClick={() => aprovar(inst === dir ? "diretoria" : "superintendencia", "reprovado", parecer)}>
              <X size={14} /> Reprovar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={st.overlay} className="modal-mobile-sheet-overlay" onClick={onClose}>
      <div style={{ ...st.modal, maxWidth: 680 }} className="modal-mobile-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={st.mh}>
          <h3 style={st.mhTitle}>Proposta #{proposta.numero}</h3>
          <button style={st.mclose} onClick={onClose}>×</button>
        </div>
        <div style={{ ...st.mform, gap: 16 }}>
          {/* Cabeçalho */}
          <div>
            <div style={st.detHead}>
              <h2 style={st.detTitulo}>{proposta.titulo}</h2>
              <Chip cor={m.cor} bg={m.bg}>{m.label}</Chip>
            </div>
            <div style={st.detMetaRow}>
              <span>{proposta.setor_nome}</span>
              {proposta.categoria && <span>· {proposta.categoria}</span>}
              <span>· por {proposta.criadoPor}</span>
            </div>
            {proposta.justificativa && <p style={st.detJust}>{proposta.justificativa}</p>}
          </div>

          {/* Itens */}
          {proposta.itens?.length > 0 && (
            <div style={st.tabWrap}>
              <table style={st.table}>
                <thead><tr><th style={st.th}>Item</th><th style={st.th}>Qtd</th><th style={st.th}>Unit.</th><th style={st.th}>Total</th></tr></thead>
                <tbody>
                  {proposta.itens.map((i, ix) => (
                    <tr key={ix}>
                      <td style={st.td}>{i.descricao}</td>
                      <td style={st.td}>{i.quantidade}</td>
                      <td style={st.td}>{fmtBRL(i.valorUnitario)}</td>
                      <td style={st.td}>{fmtBRL(i.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={st.valores}>
            <div><span style={st.valLbl}>Solicitado</span><strong style={st.valNum}>{fmtBRL(proposta.valorSolicitado)}</strong></div>
            <div><span style={st.valLbl}>Aprovado</span><strong style={{ ...st.valNum, color: proposta.valorAprovado != null ? "var(--success)" : "var(--text-subtle)" }}>
              {proposta.valorAprovado != null ? fmtBRL(proposta.valorAprovado) : "—"}</strong></div>
          </div>

          {/* Anexos */}
          {proposta.anexos?.length > 0 && (
            <div>
              <span style={st.mlblTxt}>Anexos</span>
              <div style={st.anexosBox}>
                {proposta.anexos.map((a, i) => (
                  <div key={i} style={st.anexoItem}>
                    <Paperclip size={13} /><a href={a.url} target="_blank" rel="noreferrer" style={st.anexoLink}>{a.nome}</a>
                    <span style={st.anexoTam}>{tamanhoLegivel(a.tamanho)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validação — duas instâncias */}
          <div>
            <span style={st.mlblTxt}><ClipboardCheck size={14} style={{ verticalAlign: -2 }} /> Validação (precisa das duas)</span>
            <div style={st.instGrid}>
              {instBox("Diretoria Executiva", dir, caps.souDiretoria, decidir, parecerDir, setParecerDir)}
              {instBox("Superintendência", sup, caps.souSuper, decidir, parecerSup, setParecerSup)}
            </div>
          </div>

          {/* Convidados (link) */}
          {(caps.podeConvidar || (proposta.convidados || []).length > 0) && (
            <div>
              <span style={st.mlblTxt}><Users size={14} style={{ verticalAlign: -2 }} /> Aprovadores por link</span>
              <div style={st.convBox}>
                {(proposta.convidados || []).map((c) => (
                  <div key={c.token} style={st.convItem}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: ".85rem" }}>{c.nome} {c.papel && <span style={st.convPapel}>· {c.papel}</span>}</div>
                      <div style={st.convStatus}>
                        <Chip cor={c.status === "aprovado" ? "var(--success)" : c.status === "reprovado" ? "var(--danger)" : "var(--text-subtle)"}
                          bg={c.status === "aprovado" ? "var(--success-bg)" : c.status === "reprovado" ? "var(--danger-bg)" : "var(--surface-3)"}>
                          {c.status === "aprovado" ? "Aprovou" : c.status === "reprovado" ? "Reprovou" : "Aguardando"}
                        </Chip>
                        {c.parecer && <span style={st.convParecer}>“{c.parecer}”</span>}
                      </div>
                    </div>
                    {caps.podeConvidar && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button style={st.btnMini} onClick={() => copiar(linkConvite(proposta.id, c.token))}>
                          {copiado === linkConvite(proposta.id, c.token) ? <Check size={13} /> : <Copy size={13} />} link
                        </button>
                        <button style={st.btnIcoDanger} onClick={() => rmConvidado(c.token)}><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                ))}
                {caps.podeConvidar && (
                  <div style={st.convAdd}>
                    <input style={{ ...st.minp, flex: 2 }} placeholder="Nome" value={convNome} onChange={(e) => setConvNome(e.target.value)} />
                    <input style={{ ...st.minp, flex: 1 }} placeholder="Papel (ex: Jurídico)" value={convPapel} onChange={(e) => setConvPapel(e.target.value)} />
                    <button style={st.btnPrim} disabled={busy || !convNome.trim()} onClick={addConvidado}><Link2 size={14} /> Gerar link</button>
                  </div>
                )}
                {copiado && <div style={st.copiadoMsg}>Link copiado para a área de transferência ✓</div>}
              </div>
            </div>
          )}

          {/* Ações do dono / exclusão */}
          <div style={st.mfoot}>
            {podeEditar && <button style={st.mbtnCancel} onClick={() => onEditar(proposta)}>Editar</button>}
            {(caps.vejoTodos || ehDono) && (
              <button style={{ ...st.mbtnCancel, color: "var(--danger)", borderColor: "var(--danger-border, var(--border-strong))" }} onClick={excluir}>
                <Trash2 size={14} /> Excluir
              </button>
            )}
            <button style={st.mbtnSave} onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Aba: Registro de Compras (por setor) ═══════════════ */
function AbaRegistro({ compras, setores, contexto, carregar }) {
  const [form, setForm] = useState({ setor_id: "", descricao: "", fornecedor: "", categoria: "", valor: "", data: hoje(), nf: "" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e) {
    e.preventDefault();
    if (!form.setor_id) return setErro("Selecione o setor.");
    if (!form.valor) return setErro("Informe o valor.");
    setSalvando(true); setErro("");
    try {
      const setorNome = setores.find((s) => s.id === form.setor_id)?.nome || "";
      await addDoc(collection(db, "compras_setor"), {
        setor_id: form.setor_id, setor_nome: setorNome,
        descricao: form.descricao.trim(), fornecedor: form.fornecedor.trim(),
        categoria: form.categoria.trim(), nf: form.nf.trim(),
        valor: parseMoeda(form.valor), data: form.data,
        criadoPor: contexto.quemSou, criadoEm: serverTimestamp(),
      });
      setForm({ setor_id: "", descricao: "", fornecedor: "", categoria: "", valor: "", data: hoje(), nf: "" });
      carregar();
    } catch (err) { setErro("Erro ao salvar: " + err.message); }
    finally { setSalvando(false); }
  }

  async function excluir(c) {
    if (!window.confirm("Excluir este lançamento de compra?")) return;
    await deleteDoc(doc(db, "compras_setor", c.id));
    carregar();
  }

  return (
    <>
      <form onSubmit={salvar} style={st.regForm}>
        <div style={st.regGrid}>
          <label style={st.mlbl}>Setor *
            <select style={st.minp} value={form.setor_id} onChange={(e) => setForm({ ...form, setor_id: e.target.value })} required>
              <option value="">Selecione…</option>
              {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <label style={st.mlbl}>Valor *
            <input style={st.minp} inputMode="numeric" placeholder="0,00"
              value={form.valor} onChange={(e) => setForm({ ...form, valor: maskMoeda(e.target.value) })} required />
          </label>
          <label style={st.mlbl}>Data
            <input style={st.minp} type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </label>
          <label style={st.mlbl}>Fornecedor
            <input style={st.minp} value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
          </label>
          <label style={st.mlbl}>Categoria
            <input style={st.minp} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
          </label>
          <label style={st.mlbl}>Nota fiscal
            <input style={st.minp} value={form.nf} onChange={(e) => setForm({ ...form, nf: e.target.value })} />
          </label>
        </div>
        <label style={st.mlbl}>Descrição
          <input style={st.minp} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="O que foi comprado" />
        </label>
        {erro && <p style={st.erro}>{erro}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" style={st.btnPrim} disabled={salvando}>
            <Plus size={15} /> {salvando ? "Salvando…" : "Registrar compra"}
          </button>
        </div>
      </form>

      <ExportBar
        titulo="Compras por setor" arquivo="compras-setor"
        subtitulo={() => `${compras.length} lançamento(s)`}
        dados={() => ({
          colunas: ["Data", "Setor", "Descrição", "Fornecedor", "NF", "Valor"],
          linhas: compras.map((c) => [c.data || "", c.setor_nome || "", c.descricao || "", c.fornecedor || "", c.nf || "", fmtBRL(c.valor)]),
        })}
      />

      {compras.length === 0 ? (
        <p style={st.info}>Nenhuma compra registrada.</p>
      ) : (
        <div style={st.tabWrap}>
          <table style={st.table}>
            <thead><tr>
              <th style={st.th}>Data</th><th style={st.th}>Setor</th><th style={st.th}>Descrição</th>
              <th style={st.th}>Fornecedor</th><th style={st.th}>Valor</th><th style={st.th}></th>
            </tr></thead>
            <tbody>
              {compras.map((c) => (
                <tr key={c.id}>
                  <td style={st.td}>{fmtData(c.data)}</td>
                  <td style={st.td}>{c.setor_nome}</td>
                  <td style={st.td}>{c.descricao || "—"}</td>
                  <td style={{ ...st.td, color: "var(--text-muted)" }}>{c.fornecedor || "—"}</td>
                  <td style={st.td}><strong>{fmtBRL(c.valor)}</strong></td>
                  <td style={st.td}><button style={st.btnIcoDanger} onClick={() => excluir(c)}><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ═══════════════ Aba: Dashboard de excedentes ═══════════════ */
function AbaDashboard({ propostas, compras }) {
  const anos = useMemo(() => {
    const set = new Set();
    compras.forEach((c) => c.data && set.add(c.data.slice(0, 4)));
    propostas.forEach((p) => { const d = tsAno(p.criadoEm); if (d) set.add(d); });
    const arr = [...set].filter(Boolean).sort().reverse();
    return arr.length ? arr : [String(new Date().getFullYear())];
  }, [propostas, compras]);
  const [ano, setAno] = useState("todos");

  const dados = useMemo(() => {
    const porSetor = {};
    const add = (id, nome) => { if (!porSetor[id]) porSetor[id] = { id, nome: nome || "—", aprovado: 0, comprado: 0 }; return porSetor[id]; };

    propostas.forEach((p) => {
      if (statusProposta(p) !== "aprovada") return;
      if (ano !== "todos" && tsAno(p.criadoEm) !== ano) return;
      add(p.setor_id, p.setor_nome).aprovado += Number(p.valorAprovado) || 0;
    });
    compras.forEach((c) => {
      if (ano !== "todos" && (c.data || "").slice(0, 4) !== ano) return;
      add(c.setor_id, c.setor_nome).comprado += Number(c.valor) || 0;
    });

    const linhas = Object.values(porSetor).map((r) => ({ ...r, excedente: r.comprado - r.aprovado }));
    linhas.sort((a, b) => b.excedente - a.excedente);
    const totAprovado = linhas.reduce((s, r) => s + r.aprovado, 0);
    const totComprado = linhas.reduce((s, r) => s + r.comprado, 0);
    const excedentes = linhas.filter((r) => r.excedente > 0);
    return { linhas, totAprovado, totComprado, totExcedente: totComprado - totAprovado, excedentes };
  }, [propostas, compras, ano]);

  const maxVal = Math.max(1, ...dados.linhas.map((r) => Math.max(r.aprovado, r.comprado)));

  return (
    <>
      <div style={st.toolbar}>
        <select style={st.select} value={ano} onChange={(e) => setAno(e.target.value)}>
          <option value="todos">Todos os anos</option>
          {anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div style={st.kpiGrid}>
        <Kpi label="Total aprovado" valor={fmtBRL(dados.totAprovado)} cor="var(--tech)" />
        <Kpi label="Total comprado" valor={fmtBRL(dados.totComprado)} cor="var(--accent)" />
        <Kpi label="Excedente global" valor={fmtBRL(dados.totExcedente)}
          cor={dados.totExcedente > 0 ? "var(--danger)" : "var(--success)"} />
        <Kpi label="Setores excedentes" valor={String(dados.excedentes.length)}
          cor={dados.excedentes.length ? "var(--warning)" : "var(--success)"} />
      </div>

      {dados.linhas.length === 0 ? (
        <p style={st.info}>Sem dados no período. Aprove propostas e registre compras para ver os indicadores.</p>
      ) : (
        <>
          {/* Barras aprovado vs comprado por setor */}
          <div style={st.card}>
            <div style={st.cardTitle}>Aprovado × Comprado por setor</div>
            <div style={{ display: "flex", gap: 18, marginBottom: 12, fontSize: ".76rem", color: "var(--text-muted)" }}>
              <span><i style={{ ...st.dot, background: "var(--tech)" }} /> Aprovado</span>
              <span><i style={{ ...st.dot, background: "var(--accent)" }} /> Comprado</span>
            </div>
            {dados.linhas.map((r) => (
              <div key={r.id} style={st.barRow}>
                <div style={st.barLabel} title={r.nome}>{r.nome}</div>
                <div style={st.barTrack}>
                  <div style={{ ...st.bar, width: `${(r.aprovado / maxVal) * 100}%`, background: "var(--tech)" }} />
                  <div style={{ ...st.bar, width: `${(r.comprado / maxVal) * 100}%`, background: "var(--accent)" }} />
                </div>
                <div style={{ ...st.barVal, color: r.excedente > 0 ? "var(--danger)" : "var(--success)" }}>
                  {r.excedente > 0 ? "+" : ""}{fmtBRLcurto(r.excedente)}
                </div>
              </div>
            ))}
          </div>

          {/* Tabela detalhada */}
          <div style={st.tabWrap}>
            <table style={st.table}>
              <thead><tr>
                <th style={st.th}>Setor</th><th style={st.th}>Aprovado</th><th style={st.th}>Comprado</th><th style={st.th}>Excedente</th>
              </tr></thead>
              <tbody>
                {dados.linhas.map((r) => (
                  <tr key={r.id}>
                    <td style={st.td}><strong>{r.nome}</strong></td>
                    <td style={st.td}>{fmtBRL(r.aprovado)}</td>
                    <td style={st.td}>{fmtBRL(r.comprado)}</td>
                    <td style={st.td}>
                      <span style={{ fontWeight: 700, color: r.excedente > 0 ? "var(--danger)" : "var(--success)" }}>
                        {r.excedente > 0 ? "+" : ""}{fmtBRL(r.excedente)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/* ═══════════════ Pequenos componentes ═══════════════ */
function Chip({ children, cor, bg }) {
  return <span style={{ background: bg, color: cor, padding: "3px 10px", borderRadius: 20, fontSize: ".72rem", fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>;
}
function Kpi({ label, valor, cor }) {
  return (
    <div style={st.kpi}>
      <span style={st.kpiLabel}>{label}</span>
      <strong style={{ ...st.kpiVal, color: cor }}>{valor}</strong>
    </div>
  );
}

/* ═══════════════ Helpers de data ═══════════════ */
function hoje() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function fmtData(iso) { if (!iso) return "—"; const [a, m, d] = String(iso).split("-"); return d ? `${d}/${m}/${a}` : iso; }
function tsAno(ts) {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return String(ts.toDate().getFullYear());
  if (typeof ts === "string") return ts.slice(0, 4);
  return null;
}

/* ═══════════════ Estilos ═══════════════ */
const st = {
  wrap: { minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)" },
  body: { padding: 24, maxWidth: 1100, margin: "0 auto" },
  tabs: { display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" },
  tab: { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-muted)", borderRadius: 10, fontWeight: 600, fontSize: ".85rem", cursor: "pointer", fontFamily: "inherit" },
  tabAtiva: { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" },
  toolbar: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  busca: { flex: 1, minWidth: 180, padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border-strong)", fontSize: ".88rem", outline: "none", background: "var(--card-bg)", color: "var(--text)" },
  select: { padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border-strong)", fontSize: ".85rem", background: "var(--card-bg)", color: "var(--text)", outline: "none" },
  info: { color: "var(--text-subtle)", textAlign: "center", marginTop: 30 },
  vazio: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "40px 0", color: "var(--text-subtle)" },
  tabWrap: { background: "var(--card-bg)", borderRadius: 10, border: "1px solid var(--border)", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: ".85rem" },
  th: { padding: "11px 14px", textAlign: "left", fontWeight: 700, color: "var(--accent)", background: "var(--surface-2)", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" },
  td: { padding: "11px 14px", borderBottom: "1px solid var(--border)", verticalAlign: "middle", color: "var(--text)" },
  btnPrim: { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: ".82rem", cursor: "pointer" },
  btnMini: { display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "var(--accent-soft)", color: "var(--accent)", border: "none", borderRadius: 6, fontWeight: 600, fontSize: ".72rem", cursor: "pointer" },
  btnIcoDanger: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: "var(--danger-bg)", color: "var(--danger)", border: "none", borderRadius: 6, cursor: "pointer" },
  btnAprovar: { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 10px", background: "var(--success)", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: ".78rem", cursor: "pointer" },
  btnReprovar: { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 10px", background: "var(--danger)", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: ".78rem", cursor: "pointer" },
  btnUpload: { display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 12px", background: "var(--surface-2)", color: "var(--text-muted)", border: "1px dashed var(--border-strong)", borderRadius: 8, fontWeight: 600, fontSize: ".8rem", cursor: "pointer" },
  // overlay/modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 },
  modal: { background: "var(--card-bg)", borderRadius: 14, width: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.3)" },
  mh: { background: "var(--accent)", padding: "14px 20px", borderRadius: "14px 14px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 2 },
  mhTitle: { color: "#fff", fontSize: "1rem", fontWeight: 700, margin: 0 },
  mclose: { background: "none", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer", lineHeight: 1 },
  mform: { padding: 20, display: "flex", flexDirection: "column", gap: 13 },
  mlbl: { display: "flex", flexDirection: "column", gap: 5, fontSize: ".8rem", fontWeight: 600, color: "var(--text)" },
  mlblTxt: { fontSize: ".8rem", fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 8 },
  minp: { padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 7, fontSize: ".88rem", outline: "none", fontFamily: "inherit", background: "var(--card-bg)", color: "var(--text)" },
  itensHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  itemRow: { display: "flex", gap: 6, marginBottom: 6, alignItems: "center" },
  totalLine: { textAlign: "right", fontSize: ".85rem", color: "var(--text-muted)", marginTop: 4 },
  anexosBox: { display: "flex", flexDirection: "column", gap: 6 },
  anexoItem: { display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--surface-2)", borderRadius: 7, fontSize: ".82rem", color: "var(--text)" },
  anexoLink: { color: "var(--accent)", textDecoration: "none", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  anexoTam: { fontSize: ".72rem", color: "var(--text-subtle)" },
  erro: { color: "var(--danger)", fontSize: ".82rem", fontWeight: 600, margin: 0 },
  mfoot: { display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 4 },
  mbtnCancel: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--surface-3)", border: "1px solid var(--border-strong)", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".84rem", color: "var(--text-muted)" },
  mbtnSave: { padding: "9px 22px", background: "var(--accent)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: ".84rem", color: "#fff" },
  // detalhe
  detHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  detTitulo: { fontSize: "1.15rem", fontWeight: 700, color: "var(--text)", margin: 0 },
  detMetaRow: { display: "flex", gap: 6, flexWrap: "wrap", fontSize: ".8rem", color: "var(--text-muted)", marginTop: 4 },
  detJust: { fontSize: ".88rem", color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 },
  valores: { display: "flex", gap: 24 },
  valLbl: { display: "block", fontSize: ".72rem", color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700 },
  valNum: { fontSize: "1.2rem", color: "var(--text)" },
  instGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 },
  instCard: { border: "1px solid var(--border)", borderRadius: 10, padding: 12, background: "var(--surface-2)" },
  instTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  instMeta: { fontSize: ".74rem", color: "var(--text-subtle)", marginTop: 4 },
  instParecer: { fontSize: ".8rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: 4 },
  convBox: { display: "flex", flexDirection: "column", gap: 8 },
  convItem: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8 },
  convPapel: { fontWeight: 500, color: "var(--text-subtle)", fontSize: ".78rem" },
  convStatus: { display: "flex", alignItems: "center", gap: 6, marginTop: 3 },
  convParecer: { fontSize: ".76rem", color: "var(--text-muted)", fontStyle: "italic" },
  convAdd: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  copiadoMsg: { fontSize: ".78rem", color: "var(--success)", fontWeight: 600 },
  // registro
  regForm: { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 },
  regGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 },
  // dashboard
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 20 },
  kpi: { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 },
  kpiLabel: { fontSize: ".74rem", color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700 },
  kpiVal: { fontSize: "1.4rem", fontWeight: 800 },
  card: { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, marginBottom: 20 },
  cardTitle: { fontWeight: 700, color: "var(--text)", marginBottom: 12, fontSize: ".95rem" },
  dot: { display: "inline-block", width: 10, height: 10, borderRadius: 3, marginRight: 5, verticalAlign: -1 },
  barRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  barLabel: { width: 120, fontSize: ".8rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 },
  barTrack: { flex: 1, display: "flex", flexDirection: "column", gap: 3 },
  bar: { height: 9, borderRadius: 5, minWidth: 2, transition: "width .3s" },
  barVal: { width: 74, textAlign: "right", fontSize: ".8rem", fontWeight: 700, flexShrink: 0 },
};
