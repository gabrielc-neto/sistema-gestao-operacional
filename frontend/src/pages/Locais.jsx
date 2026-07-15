import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listarLocais, criarLocal, atualizarLocal, apagarLocal, TIPOS_LOCAL } from "../services/locais";
import BuscaEndereco from "../components/BuscaEndereco";
import { PageHeader, Section, Btn, DataTable, Tag, Field, inputStyle } from "../theme/ui";
import { COLORS, SPACING, TYPO, RADIUS } from "../theme/tokens";
import { ArrowLeft, Star, Plus, Trash2, Pencil, MapPin } from "lucide-react";

const EMPTY = {
  nome: "", apelido: "", tipo: "cliente", cnpj: "",
  endereco: "", bairro: "", cidade: "", uf: "", cep: "",
  lat: null, lng: null,
  observacoes: "",
};

export default function Locais() {
  const navigate = useNavigate();
  const [locais, setLocais]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState("");
  const [form, setForm]       = useState(null);   // null = fechado, obj = editando/criando
  const [salvando, setSalv]   = useState(false);
  const [filtro, setFiltro]   = useState("");

  const recarregar = () => {
    setLoading(true);
    listarLocais().then(setLocais).catch(e => setErro(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { recarregar(); }, []);

  const filtrados = locais.filter(l => {
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return [l.nome, l.apelido, l.cidade, l.uf, l.cnpj, l.tipo].some(v => String(v || "").toLowerCase().includes(q));
  });

  async function salvar() {
    if (!form.nome?.trim()) { setErro("Nome obrigatório"); return; }
    if (form.lat == null || form.lng == null) { setErro("Selecione o endereço nas sugestões pra pegar as coordenadas"); return; }
    setSalv(true); setErro("");
    try {
      if (form.id) {
        const { id, ...dados } = form;
        await atualizarLocal(id, dados);
      } else {
        await criarLocal(form);
      }
      setForm(null);
      recarregar();
    } catch (e) {
      setErro(e.message || String(e));
    } finally {
      setSalv(false);
    }
  }

  async function apagar(l) {
    if (!window.confirm(`Apagar "${l.nome}"?`)) return;
    try { await apagarLocal(l.id); recarregar(); }
    catch (e) { alert(e.message); }
  }

  const tipoObj = (id) => TIPOS_LOCAL.find(t => t.id === id) || TIPOS_LOCAL[TIPOS_LOCAL.length - 1];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: TYPO.family }}>
      <PageHeader
        breadcrumb="Cadastros › Locais"
        title="Locais Favoritos"
        subtitle="Pátio, filiais, clientes, postos, usinas — pontos usados no /rotas"
        meta={`${locais.length} cadastrados`}
        actions={
          <>
            <Btn variant="secondary" size="sm" icon={<ArrowLeft size={14}/>} onClick={() => navigate("/dashboard")}>Dashboard</Btn>
            <Btn variant="primary" size="sm" icon={<Plus size={14}/>} onClick={() => setForm({ ...EMPTY })}>Novo local</Btn>
          </>
        }
      />

      <main style={{ padding: SPACING.xl, maxWidth: 1400, margin: "0 auto" }}>
        {erro && <div style={{ background: COLORS.dangerBg, color: COLORS.danger, padding: SPACING.sm, borderRadius: RADIUS.md, marginBottom: SPACING.md, fontSize: TYPO.sm }}>{erro}</div>}

        {/* Formulário (drawer inline) */}
        {form && (
          <Section title={form.id ? "Editar local" : "Novo local"} subtitle="Digite endereço, cidade ou nome — clique nas sugestões pra pegar coordenadas">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: SPACING.md, marginBottom: SPACING.md }}>
              <Field label="Nome *">
                <input style={inputStyle} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Pontual Petróleo" />
              </Field>
              <Field label="Apelido">
                <input style={inputStyle} value={form.apelido} onChange={e => setForm({ ...form, apelido: e.target.value })} placeholder="Ex: Pátio Araucária" />
              </Field>
              <Field label="Tipo">
                <select style={inputStyle} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  {TIPOS_LOCAL.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="CNPJ (opcional)">
                <input style={inputStyle} value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
              </Field>
            </div>

            <Field label="Endereço (busque e escolha nas sugestões)">
              <BuscaEndereco
                placeholder="Ex: Rua Luiz Franceschi 666 Araucária PR"
                initialValue={form.endereco || ""}
                onSelect={(r) => {
                  setForm({
                    ...form,
                    lat: r.lat, lng: r.lng,
                    endereco: r.endereco?.logradouro || form.endereco,
                    bairro: r.endereco?.bairro || form.bairro,
                    cidade: r.endereco?.cidade || form.cidade,
                    uf: r.endereco?.uf || form.uf,
                    cep: r.endereco?.cep || form.cep,
                  });
                }}
              />
            </Field>

            {form.lat && form.lng && (
              <div style={{ background: COLORS.successBg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm, fontSize: TYPO.xs, fontFamily: TYPO.familyMono, color: COLORS.success }}>
                📍 Coordenada capturada: {form.lat.toFixed(6)}, {form.lng.toFixed(6)}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: SPACING.md, marginTop: SPACING.md }}>
              <Field label="Endereço"><input style={inputStyle} value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} /></Field>
              <Field label="Bairro"><input style={inputStyle} value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} /></Field>
              <Field label="Cidade"><input style={inputStyle} value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} /></Field>
              <Field label="UF"><input style={inputStyle} maxLength={2} value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></Field>
              <Field label="CEP"><input style={inputStyle} value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} /></Field>
            </div>

            <Field label="Observações">
              <textarea style={{ ...inputStyle, height: 60, padding: SPACING.sm }} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Contato, horário funcionamento, etc." />
            </Field>

            <div style={{ display: "flex", gap: SPACING.sm, justifyContent: "flex-end", marginTop: SPACING.md }}>
              <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando..." : (form.id ? "Salvar alterações" : "Criar local")}
              </Btn>
            </div>
          </Section>
        )}

        {/* Lista */}
        <Section title={`Locais cadastrados · ${filtrados.length}`} actions={
          <input style={{ ...inputStyle, width: 220 }} placeholder="Buscar..." value={filtro} onChange={e => setFiltro(e.target.value)} />
        } dense>
          <DataTable
            columns={[
              { key: "nome", label: "Nome", render: r => <><strong>{r.nome}</strong>{r.apelido && <div style={{ fontSize: TYPO.xxs, color: COLORS.textLight }}>{r.apelido}</div>}</> },
              { key: "tipo", label: "Tipo", render: r => {
                const t = tipoObj(r.tipo);
                return <Tag tone="primary">{t.label}</Tag>;
              }},
              { key: "cidade", label: "Cidade", render: r => `${r.cidade || ""}${r.uf ? "/" + r.uf : ""}` },
              { key: "endereco", label: "Endereço", wrap: true, maxWidth: 280 },
              { key: "coord", label: "Coordenada", align: "right", render: r => <span style={{ fontFamily: TYPO.familyMono, fontSize: TYPO.xxs, color: COLORS.textMuted }}>{Number(r.lat).toFixed(4)}, {Number(r.lng).toFixed(4)}</span> },
              { key: "acoes", label: "", align: "right", render: r => (
                <div style={{ display: "flex", gap: SPACING.xs, justifyContent: "flex-end" }}>
                  <Btn size="sm" variant="secondary" onClick={() => setForm({ ...r })}><Pencil size={12}/></Btn>
                  <Btn size="sm" variant="danger" onClick={() => apagar(r)}><Trash2 size={12}/></Btn>
                </div>
              )},
            ]}
            rows={filtrados}
            keyFn={r => r.id}
            empty={loading ? "Carregando..." : "Nenhum local cadastrado — clique 'Novo local' pra começar"}
          />
        </Section>

        <div style={{ background: COLORS.infoBg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.md, fontSize: TYPO.sm, color: COLORS.info }}>
          💡 <strong>Dica:</strong> depois de cadastrar, o local aparece direto no <a href="/rotas" style={{ color: COLORS.primary, textDecoration: "underline" }}>/rotas</a> ao digitar o nome no campo de busca (com estrela verde). Sugestão: comece cadastrando o pátio da Pontual, filiais e clientes recorrentes.
        </div>
      </main>
    </div>
  );
}
