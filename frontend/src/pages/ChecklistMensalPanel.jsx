import { useState, useEffect, useRef } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { watch as dsWatch, insert as dsInsert, patch as dsPatch, remove as dsRemove } from "../services/genericDataSource";
import { db } from "../firebase/config";
import { uploadArquivo } from "../services/cloudinary";
import { exportChecklistMensalPdf } from "../utils/pdfChecklistMensal";
import { usuarioPontual } from "../utils/format";

// ────────────────────────────────────────────────────────────────
// Itens do checklist (fiel ao PDF Checklist_Mensal_Caminhao_Tanque)
// ────────────────────────────────────────────────────────────────
export const CHECKLIST_ITENS_CAVALO = [
  { key: "freios",       nome: "Sistema de Freios",           params: "Medição da espessura de pastilhas/lonas, estado dos tambores/discos e verificação de folgas e lubrificação das catracas de regulagem." },
  { key: "suspensao",    nome: "Suspensão e Direção",         params: "Verificação de folgas em pinos, buchas, barras de direção e terminais. Inspeção visual de trincas em feixes de molas e vazamentos em amortecedores." },
  { key: "quinta_roda",  nome: "Quinta Roda e Acoplamento",   params: "Verificação do desgaste do disco de fricção, folga do dente de fechamento (gargalo), estado das travas de segurança e lubrificação técnica." },
  { key: "pneus_cavalo", nome: "Pneus e Rodas (Tração/Direção)", params: "Medição de sulco (mínimo 1.6mm), análise de desgaste irregular, presença de bolhas e torqueamento/aperto das porcas das rodas." },
  { key: "chassi",       nome: "Chassi e Longarinas",         params: "Inspeção estrutural minuciosa à procura de trincas, soldas não autorizadas, empenamentos ou oxidação acentuada nos pontos de fixação." },
  { key: "eletrico",     nome: "Sistema Elétrico e Baterias", params: "Medição da tensão/saída do alternador, estado de conservação dos chicotes elétricos (sem fios expostos), limpeza e aperto dos bornes da bateria." },
  { key: "escapamento",  nome: "Escapamento e Abafador",      params: "Verificação da integridade do sistema de escape e o correto estado do abafador de fagulhas (item crítico para entrada em bases de combustível)." },
];

export const CHECKLIST_ITENS_CARRETA = [
  { key: "estrutura_tanque",  nome: "Estrutura do Tanque e Fixação",  params: "Inspeção das soldas estruturais, berços de fixação do tanque ao chassi, cintas de amarração e integridade da chapa (isenta de trincas/deformações)." },
  { key: "pino_rei",          nome: "Pino Rei e Placa de Fricção",    params: "Medição do diâmetro do pino rei com calibrador de desgaste, verificação de empenos na chapa metálica de apoio e parafusos de fixação." },
  { key: "valvulas",          nome: "Válvulas e Tubulações",          params: "Inspeção interna/externa de válvulas de fundo, válvulas de descarga, mangotes e conexões rápidas para detectar qualquer sinal de vazamento ou fadiga." },
  { key: "tampas",            nome: "Tampas e Vedações Superiores",   params: "Verificação do estado das borrachas de vedação das bocas de visita, pressão e funcionamento dos braços de fechamento e travas mecânicas." },
  { key: "aterramento",       nome: "Sistema de Aterramento",         params: "Inspeção e teste de continuidade da fita/cabo de aterramento estático e dos pontos de conexão rápida (essencial contra eletricidade estática)." },
  { key: "eixos_carreta",     nome: "Eixos e Suspensão da Carreta",   params: "Alinhamento dos eixos, folgas nos cubos de roda, estado das bolsas de ar (suspensão pneumática) ou feixes de mola e buchas de balança." },
  { key: "emergencia",        nome: "Equipamentos de Emergência",     params: "Checagem de validade e pressão dos extintores do tanque, lacres, integridade do Kit de Emergência Ambiental e sinalização/placas de risco (MOPP)." },
  { key: "documentacao",      nome: "Prazos e Documentação",          params: "Verificação da validade das vistorias obrigatórias: CIV (Certificado de Inspeção Veicular) e CIPP (Certificado de Inspeção para Produtos Perigosos)." },
];

// 6 slots fixos de fotos do veículo — cada slot guarda { url, path } ou null
export const FOTO_SLOTS = [
  { key: "frente",    label: "Frente",          hint: "Cabine — vista frontal" },
  { key: "traseira",  label: "Traseira",        hint: "Verso — traseira/portas" },
  { key: "lateral_e", label: "Lateral Esquerda",hint: "Lado motorista" },
  { key: "lateral_d", label: "Lateral Direita", hint: "Lado carona" },
  { key: "superior",  label: "Superior",        hint: "Teto / tampas" },
  { key: "inferior",  label: "Inferior",        hint: "Baixo — chassi/mecânica" },
];

const EMPTY_CHECKLIST = {
  mesRef:            "",
  dataInspecao:      "",
  placaCavalo:       "",
  placaCarreta:      "",
  kmAtual:           "",
  responsavel:       "",
  itensCavalo:       {},   // { [key]: "ok" | "nc" | "" }
  itensCarreta:      {},
  ocorrencias:       [],   // [{ item, descricao }]
  fotos:             {},   // { [slotKey]: { url, path } | null }
  assinaturaMecanico: "",
  assinaturaGestor:  "",
};

const s = {
  card:      { background: "#fff", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  cardTitle: { margin: "0 0 0.75rem 0", color: "#1a3a5c", fontSize: "1.05rem" },
  grid:      { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  gridCav:   { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 },
  fieldLabel:{ display: "flex", flexDirection: "column", gap: 4, fontSize: ".82rem", color: "#334155", fontWeight: 600 },
  fieldInput:{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: ".9rem", fontFamily: "inherit" },
  secTitle:  { background: "#1a3a5c", color: "#fff", padding: "6px 10px", fontSize: ".85rem", fontWeight: 700, borderRadius: 6, marginTop: 14, marginBottom: 8 },
  itemRow:   { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 6 },
  itemRowInfo:{ flex: "1 1 220px", minWidth: 180 },
  itemNome:  { fontWeight: 600, color: "#1e293b", fontSize: ".84rem" },
  itemParams:{ fontSize: ".72rem", color: "#64748b", marginTop: 2, lineHeight: 1.3 },
  radioGrp:  { display: "flex", gap: 6 },
  radioBtn:  (active, color) => ({ padding: "4px 10px", border: `1.5px solid ${active ? color : "#cbd5e1"}`, background: active ? color : "#fff", color: active ? "#fff" : "#64748b", borderRadius: 6, cursor: "pointer", fontSize: ".75rem", fontWeight: 700, fontFamily: "inherit" }),
  ocGrid:    { display: "grid", gridTemplateColumns: "minmax(120px, 1fr) minmax(200px, 2fr) auto", gap: 8, marginBottom: 6 },
  ocGridMob: { display: "grid", gridTemplateColumns: "1fr", gap: 6, marginBottom: 10, padding: 8, border: "1px solid #e2e8f0", borderRadius: 8 },
  fotoBox:   { display: "flex", flexDirection: "column", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", background: "#f8fafc" },
  fotoImg:   { width: "100%", height: 120, objectFit: "cover", display: "block" },
  fotoCap:   { padding: "6px 8px", fontSize: ".72rem" },
  saveBtn:   { padding: "10px 22px", border: "none", background: "#1a3a5c", color: "#fff", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: ".92rem", fontFamily: "inherit" },
  cancelBtn: { padding: "10px 18px", border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" },
  smallBtn:  { padding: "6px 12px", border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 6, cursor: "pointer", fontSize: ".78rem", fontFamily: "inherit" },
  dangerBtn: { padding: "6px 12px", border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", borderRadius: 6, cursor: "pointer", fontSize: ".78rem", fontFamily: "inherit" },
  primaryBtn:{ padding: "6px 12px", border: "1px solid #1a3a5c", background: "#1a3a5c", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: ".78rem", fontFamily: "inherit", fontWeight: 700 },
  erro:      { background: "#fee2e2", color: "#991b1b", padding: "8px 12px", borderRadius: 6, marginTop: 8, fontSize: ".85rem" },
  thOS:      { textAlign: "left", padding: "10px", fontWeight: 700, color: "#334155", fontSize: ".82rem" },
  tdOS:      { padding: "10px", fontSize: ".85rem", color: "#334155" },
};

function fmtDataBR(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("pt-BR") : String(iso);
}

export default function ChecklistMensalPanel({ veiculos, profile }) {
  const [form,      setForm]      = useState({ ...EMPTY_CHECKLIST });
  const [checklists, setChecklists] = useState([]);
  const [erro,      setErro]      = useState("");
  const [salvando,  setSalvando]  = useState(false);
  const salvandoRef               = useRef(false);
  const [editId,    setEditId]    = useState(null);   // id do doc quando editando
  const [uploading, setUploading] = useState(false);

  // ── Firestore live sync ────────────────────────────
  useEffect(() => {
    const unsub = dsWatch("checklists_mensais", snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      arr.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
      setChecklists(arr);
    });
    return () => unsub();
  }, []);

  function setItem(secao, key, valor) {
    setForm(f => ({
      ...f,
      [secao]: { ...f[secao], [key]: valor === f[secao]?.[key] ? "" : valor }, // clica de novo desmarca
    }));
  }

  function addOcorrencia() {
    setForm(f => ({ ...f, ocorrencias: [...f.ocorrencias, { item: "", descricao: "" }] }));
  }

  function updateOcorrencia(i, campo, val) {
    setForm(f => {
      const arr = [...f.ocorrencias];
      arr[i] = { ...arr[i], [campo]: val };
      return { ...f, ocorrencias: arr };
    });
  }

  function removeOcorrencia(i) {
    setForm(f => ({ ...f, ocorrencias: f.ocorrencias.filter((_, idx) => idx !== i) }));
  }

  async function uploadFotoSlot(slotKey, file) {
    if (!file) return;
    setUploading(true);
    setErro("");
    try {
      const meta = await uploadArquivo(file, { folder: `checklists_mensais/${slotKey}` });
      setForm(f => ({ ...f, fotos: { ...f.fotos, [slotKey]: { url: meta.url, path: meta.publicId } } }));
    } catch (err) {
      setErro(`Erro ao anexar foto (${slotKey}): ` + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function removerFotoSlot(slotKey) {
    const foto = form.fotos?.[slotKey];
    if (!foto) return;
    if (!window.confirm("Remover essa foto?")) return;
    // Foto fica órfã no Cloudinary (sem API secret no browser não dá pra deletar)
    setForm(f => {
      const novo = { ...f.fotos };
      delete novo[slotKey];
      return { ...f, fotos: novo };
    });
  }

  function resetForm() {
    setForm({ ...EMPTY_CHECKLIST });
    setEditId(null);
    setErro("");
  }

  function editar(ck) {
    setForm({
      mesRef:              ck.mesRef || "",
      dataInspecao:        ck.dataInspecao || "",
      placaCavalo:         ck.placaCavalo || "",
      placaCarreta:        ck.placaCarreta || "",
      kmAtual:             ck.kmAtual != null ? String(ck.kmAtual) : "",
      responsavel:         ck.responsavel || "",
      itensCavalo:         ck.itensCavalo  || {},
      itensCarreta:        ck.itensCarreta || {},
      ocorrencias:         Array.isArray(ck.ocorrencias) ? ck.ocorrencias : [],
      fotos:               (ck.fotos && typeof ck.fotos === "object" && !Array.isArray(ck.fotos)) ? ck.fotos : {},
      assinaturaMecanico:  ck.assinaturaMecanico || "",
      assinaturaGestor:    ck.assinaturaGestor || "",
    });
    setEditId(ck.id);
    setErro("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluir(ck) {
    if (!window.confirm(`Excluir o checklist de ${ck.placaCavalo || "—"} (${ck.mesRef || "—"})?`)) return;
    try {
      // Fotos ficam órfãs no Cloudinary (sem API secret no browser não dá pra deletar)
      await dsRemove("checklists_mensais", ck.id);
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    if (salvandoRef.current) return;
    salvandoRef.current = true;
    setErro("");

    if (!form.placaCavalo.trim()) { setErro("Informe a placa do cavalo."); salvandoRef.current = false; return; }
    if (!form.dataInspecao)       { setErro("Informe a data da inspeção."); salvandoRef.current = false; return; }
    if (!form.responsavel.trim()) { setErro("Informe o responsável pela inspeção."); salvandoRef.current = false; return; }

    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      const payload = {
        mesRef:             form.mesRef.trim(),
        dataInspecao:       form.dataInspecao,
        placaCavalo:        form.placaCavalo.trim().toUpperCase(),
        placaCarreta:       form.placaCarreta.trim().toUpperCase(),
        kmAtual:            form.kmAtual ? Number(String(form.kmAtual).replace(/\D/g, "")) : null,
        responsavel:        form.responsavel.trim(),
        itensCavalo:        form.itensCavalo,
        itensCarreta:       form.itensCarreta,
        ocorrencias:        form.ocorrencias.filter(o => (o.item || "").trim() || (o.descricao || "").trim()),
        fotos:              form.fotos,
        assinaturaMecanico: form.assinaturaMecanico.trim(),
        assinaturaGestor:   form.assinaturaGestor.trim(),
        editadoEm:          agora,
        editadoPor:         usuarioPontual(profile),
      };
      if (editId) {
        await dsPatch("checklists_mensais", editId, payload);
      } else {
        payload.criadoEm  = agora;
        payload.criadoPor = profile?.email || profile?.nome || "—";
        await dsInsert("checklists_mensais", payload);
      }
      resetForm();
    } catch (err) {
      setErro("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
      salvandoRef.current = false;
    }
  }

  return (
    <main style={{ padding: "1rem" }} className="pg-body">
      {/* Form */}
      <form onSubmit={salvar} style={s.card}>
        <h2 style={s.cardTitle}>Checklist Mensal de Manutenção Preventiva {editId && <span style={{ fontSize: ".78rem", color: "#0891b2", fontWeight: 400 }}>(editando)</span>}</h2>

        {/* Cabeçalho */}
        <div style={s.grid}>
          <label style={s.fieldLabel}>Mês/Ano Ref
            <input style={s.fieldInput} value={form.mesRef} onChange={e => setForm({ ...form, mesRef: e.target.value })} placeholder="Ex: Julho / 2026" />
          </label>
          <label style={s.fieldLabel}>Data da Inspeção
            <input type="date" style={s.fieldInput} value={form.dataInspecao} onChange={e => setForm({ ...form, dataInspecao: e.target.value })} />
          </label>
          <label style={s.fieldLabel}>KM Atual
            <input type="number" min="0" style={s.fieldInput} value={form.kmAtual} onChange={e => setForm({ ...form, kmAtual: e.target.value.replace(/\D/g, "") })} placeholder="Ex: 380000" />
          </label>
          <label style={s.fieldLabel}>Placa Cavalo *
            <select style={s.fieldInput} value={form.placaCavalo} onChange={e => setForm({ ...form, placaCavalo: e.target.value.toUpperCase() })}>
              <option value="">— Selecione —</option>
              {(veiculos || []).filter(v => v.tipo !== "carreta").map(v => (
                <option key={v.id} value={v.placa}>{v.placa}{v.modelo ? ` — ${v.modelo}` : ""}</option>
              ))}
            </select>
          </label>
          <label style={s.fieldLabel}>Placa Carreta
            <select style={s.fieldInput} value={form.placaCarreta} onChange={e => setForm({ ...form, placaCarreta: e.target.value.toUpperCase() })}>
              <option value="">— Selecione —</option>
              {(veiculos || []).filter(v => v.tipo === "carreta").map(v => (
                <option key={v.id} value={v.placa}>{v.placa}</option>
              ))}
            </select>
          </label>
          <label style={s.fieldLabel}>Responsável *
            <input style={s.fieldInput} value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome do inspetor" />
          </label>
        </div>

        {/* Cavalo */}
        <div style={s.secTitle}>1. CAVALO MECÂNICO (UNIDADE TRATORA)</div>
        {CHECKLIST_ITENS_CAVALO.map(it => (
          <div key={it.key} style={s.itemRow}>
            <div style={s.itemRowInfo}>
              <div style={s.itemNome}>{it.nome}</div>
              <div style={s.itemParams}>{it.params}</div>
            </div>
            <div style={s.radioGrp}>
              <button type="button" style={s.radioBtn(form.itensCavalo[it.key] === "ok", "#16a34a")} onClick={() => setItem("itensCavalo", it.key, "ok")}>✓ OK</button>
              <button type="button" style={s.radioBtn(form.itensCavalo[it.key] === "nc", "#dc2626")} onClick={() => setItem("itensCavalo", it.key, "nc")}>✕ N/C</button>
            </div>
          </div>
        ))}

        {/* Carreta */}
        <div style={s.secTitle}>2. CARRETA (SEMIRREBOQUE TANQUE)</div>
        {CHECKLIST_ITENS_CARRETA.map(it => (
          <div key={it.key} style={s.itemRow}>
            <div style={s.itemRowInfo}>
              <div style={s.itemNome}>{it.nome}</div>
              <div style={s.itemParams}>{it.params}</div>
            </div>
            <div style={s.radioGrp}>
              <button type="button" style={s.radioBtn(form.itensCarreta[it.key] === "ok", "#16a34a")} onClick={() => setItem("itensCarreta", it.key, "ok")}>✓ OK</button>
              <button type="button" style={s.radioBtn(form.itensCarreta[it.key] === "nc", "#dc2626")} onClick={() => setItem("itensCarreta", it.key, "nc")}>✕ N/C</button>
            </div>
          </div>
        ))}

        {/* Ocorrências */}
        <div style={s.secTitle}>3. ANOTAÇÕES DE OCORRÊNCIAS E AÇÕES CORRETIVAS</div>
        {form.ocorrencias.map((o, i) => (
          <div key={i} style={s.ocGridMob} className="checklist-oc-row">
            <input style={s.fieldInput} value={o.item} onChange={e => updateOcorrencia(i, "item", e.target.value)} placeholder="Item / Placa" />
            <input style={s.fieldInput} value={o.descricao} onChange={e => updateOcorrencia(i, "descricao", e.target.value)} placeholder="Descrição detalhada do desgaste / ação necessária" />
            <button type="button" style={s.dangerBtn} onClick={() => removeOcorrencia(i)}>Remover</button>
          </div>
        ))}
        <button type="button" style={s.smallBtn} onClick={addOcorrencia}>+ Adicionar ocorrência</button>

        {/* Fotos — 6 slots fixos */}
        <div style={s.secTitle}>4. FOTOS DA INSPEÇÃO {uploading && <span style={{ fontWeight: 400, fontSize: ".72rem", opacity: .9, marginLeft: 8 }}>Enviando…</span>}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 12 }}>
          {FOTO_SLOTS.map(slot => {
            const foto = form.fotos?.[slot.key];
            const inputId = `foto-${slot.key}`;
            return (
              <div key={slot.key} style={s.fotoBox}>
                {foto ? (
                  <img src={foto.url} alt={slot.label} style={s.fotoImg} />
                ) : (
                  <label htmlFor={inputId} style={{ ...s.fotoImg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#e2e8f0", color: "#64748b", fontSize: ".78rem", fontWeight: 600, flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "1.4rem" }}>📷</span>
                    <span>Anexar</span>
                  </label>
                )}
                <div style={s.fotoCap}>
                  <div style={{ fontWeight: 700, color: "#1a3a5c", fontSize: ".78rem" }}>{slot.label}</div>
                  <div style={{ fontSize: ".68rem", color: "#94a3b8", marginBottom: 4 }}>{slot.hint}</div>
                  <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    disabled={uploading}
                    onChange={e => { uploadFotoSlot(slot.key, e.target.files?.[0]); e.target.value = ""; }}
                  />
                  <div style={{ display: "flex", gap: 4 }}>
                    <label htmlFor={inputId} translate="no" style={{ ...s.smallBtn, flex: 1, textAlign: "center", cursor: uploading ? "not-allowed" : "pointer" }}>
                      {foto ? "Trocar foto" : "Escolher foto"}
                    </label>
                    {foto && <button type="button" style={s.dangerBtn} onClick={() => removerFotoSlot(slot.key)}>Remover</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Assinaturas */}
        <div style={s.secTitle}>5. ASSINATURAS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={s.fieldLabel}>Mecânico / Inspetor
            <input style={s.fieldInput} value={form.assinaturaMecanico} onChange={e => setForm({ ...form, assinaturaMecanico: e.target.value })} placeholder="Nome do responsável técnico" />
          </label>
          <label style={s.fieldLabel}>Gestor de Frota
            <input style={s.fieldInput} value={form.assinaturaGestor} onChange={e => setForm({ ...form, assinaturaGestor: e.target.value })} placeholder="Nome de quem libera o veículo" />
          </label>
        </div>

        {erro && <div style={s.erro}>{erro}</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          {editId && <button type="button" style={s.cancelBtn} onClick={resetForm}>Cancelar edição</button>}
          <button type="submit" style={s.saveBtn} disabled={salvando || uploading}>
            {salvando ? "Salvando…" : (editId ? "Salvar alterações" : "Salvar Checklist")}
          </button>
        </div>
      </form>

      {/* Histórico */}
      <div style={s.card}>
        <h3 style={{ margin: "0 0 12px 0", color: "#1a3a5c", fontSize: "1rem" }}>Histórico de Checklists ({checklists.length})</h3>
        {checklists.length === 0 ? (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>Nenhum checklist ainda</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={s.thOS}>Data</th>
                  <th style={s.thOS}>Mês Ref</th>
                  <th style={s.thOS}>Cavalo</th>
                  <th style={s.thOS}>Carreta</th>
                  <th style={s.thOS}>Responsável</th>
                  <th style={s.thOS}>OK / N/C</th>
                  <th style={s.thOS}>Fotos</th>
                  <th style={s.thOS}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {checklists.map(ck => {
                  const total = CHECKLIST_ITENS_CAVALO.length + CHECKLIST_ITENS_CARRETA.length;
                  const ok = [...Object.values(ck.itensCavalo || {}), ...Object.values(ck.itensCarreta || {})].filter(v => v === "ok").length;
                  const nc = [...Object.values(ck.itensCavalo || {}), ...Object.values(ck.itensCarreta || {})].filter(v => v === "nc").length;
                  return (
                    <tr key={ck.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={s.tdOS}>{fmtDataBR(ck.dataInspecao)}<div style={{ fontSize: ".68rem", color: "#94a3b8" }}>por {ck.criadoPor || "—"}</div></td>
                      <td style={s.tdOS}>{ck.mesRef || "—"}</td>
                      <td style={s.tdOS}><strong>{ck.placaCavalo || "—"}</strong></td>
                      <td style={s.tdOS}>{ck.placaCarreta || "—"}</td>
                      <td style={s.tdOS}>{ck.responsavel || "—"}</td>
                      <td style={s.tdOS}>
                        <span style={{ color: "#16a34a", fontWeight: 700 }}>{ok}</span> / <span style={{ color: "#dc2626", fontWeight: 700 }}>{nc}</span> <span style={{ color: "#94a3b8", fontSize: ".72rem" }}>de {total}</span>
                      </td>
                      <td style={s.tdOS}>{Array.isArray(ck.fotos) ? ck.fotos.length : Object.keys(ck.fotos || {}).length} / 6</td>
                      <td style={s.tdOS}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button style={s.primaryBtn} onClick={() => exportChecklistMensalPdf(ck, CHECKLIST_ITENS_CAVALO, CHECKLIST_ITENS_CARRETA)}>PDF</button>
                          <button style={s.smallBtn} onClick={() => editar(ck)}>Editar</button>
                          <button style={s.dangerBtn} onClick={() => excluir(ck)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
