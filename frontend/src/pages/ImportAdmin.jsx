import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import ModuleHeader from "../components/ModuleHeader";
import { VEICULOS_IMPORT, MOTORISTAS_IMPORT, MANUTENCOES_IMPORT } from "../data/dadosFrota";
import { MANUTENCOES_EXTRA } from "../data/dadosFrotaExtra";
import { Truck, User, Wrench, ClipboardList, AlertTriangle, Trash2, Loader2, RefreshCw, Rocket, CheckCircle2 } from "lucide-react";

// Normaliza nome para uso como ID de documento
const toId = (s) => s.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

// Normaliza placa para lookup (remove traços/especiais, uppercase)
const normPlaca = (p) => (p || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

// Tara pode vir como "PBT/Tara" (ex: "35000/9600") → pega só a tara (último valor)
const parseTara = (t) => {
  if (!t) return null;
  const s = String(t).trim();
  if (!s) return null;
  return s.includes("/") ? (s.split("/").pop().trim() || null) : s;
};

// Mapeamento tipo → label/grupo do catálogo de Manutencao.jsx
const TIPO_META = {
  civ:       { label: "CIV",          grupo: "Documentação" },
  tacografo: { label: "Tacógrafo",    grupo: "Documentação" },
  mopp:      { label: "MOPP",         grupo: "Documentação" },
  cnh_venc:  { label: "Validade CNH", grupo: "Documentação" },
  extintor:  { label: "Extintor",     grupo: "Documentação" },
};

export default function ImportAdmin() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = ["master", "admin"].includes(profile?.role);

  const [log, setLog]       = useState([]);
  const [rodando, setRodando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  function addLog(msg, tipo = "info") {
    setLog(prev => [...prev, { msg, tipo, ts: new Date().toLocaleTimeString() }]);
  }

  if (!isAdmin) {
    return <div style={s.wrap}><p style={{ padding: 40, color: "var(--danger)" }}>Acesso restrito a administradores.</p></div>;
  }

  // ── Importar Veículos ────────────────────────────────────────────────────
  async function importarVeiculos() {
    addLog("Importando veículos (chassi, renavam, tara, etc.)...", "info");
    const snap = await getDocs(collection(db, "veiculos"));
    const existentes = {};
    // Indexa por placa normalizada para evitar mismatch de formato (ex: "AKD5988" vs "AKD-5988")
    snap.docs.forEach(d => { existentes[normPlaca(d.data().placa || d.id)] = d.id; });

    let atualizados = 0, novos = 0;

    for (const v of VEICULOS_IMPORT) {
      const placa = v.placa?.trim();
      if (!placa) continue;

      const extra = {
        chassi:         v.chassi         || null,
        renavam:        v.renavam         || null,
        tara:           parseTara(v.tara),
        ano_fab:        v.ano_fab         || null,
        ano_mod:        v.ano_mod         || null,
        tipo_conjunto:  v.tipo_conjunto   || null,
        compartimentos: v.compartimentos  || null,
        rota:           v.rota            || null,
        capacidade:     v.capacidade      || null,
        total_eixos:    v.total_eixos     || null,
        carretas_info:  v.carretas?.length ? v.carretas : null,
        updatedAt:      new Date().toISOString(),
      };

      const docIdExistente = existentes[normPlaca(placa)];
      if (docIdExistente) {
        await setDoc(doc(db, "veiculos", docIdExistente), extra, { merge: true });
        atualizados++;
      } else {
        const newId = normPlaca(placa);
        await setDoc(doc(db, "veiculos", newId), {
          placa: normPlaca(placa),
          status:    "ativo",
          fabricante: v.marca || "",
          modelo:     v.marca || "",
          ...extra,
          createdAt: new Date().toISOString(),
        });
        novos++;
      }

      // Escreve docs individuais para cada carreta do conjunto
      for (const carreta of (v.carretas || [])) {
        const cRaw = carreta.placa?.trim();
        if (!cRaw) continue;
        const cId = normPlaca(cRaw);
        const [ano_fab = null, ano_mod = null] = (carreta.ano || "").split("/");
        await setDoc(doc(db, "veiculos", cId), {
          placa:    cId,
          tipo:     "carreta",
          chassi:   carreta.chassi   || null,
          renavam:  carreta.renavam  || null,
          tara:     parseTara(carreta.tara),
          ano_fab:  ano_fab          || null,
          ano_mod:  ano_mod || ano_fab || null,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    }
    addLog(`Veículos: ${atualizados} atualizados, ${novos} criados.`, "ok");
  }

  // ── Importar Motoristas ──────────────────────────────────────────────────
  async function importarMotoristas() {
    addLog("Importando motoristas (CPF, telefone, nº frota)...", "info");
    const snap = await getDocs(collection(db, "motoristas"));
    const existentes = {};
    snap.docs.forEach(d => { existentes[d.data().nome?.toUpperCase().trim()] = d.id; });

    let atualizados = 0, novos = 0;

    for (const m of MOTORISTAS_IMPORT) {
      const nome = m.nome?.toUpperCase().trim();
      if (!nome) continue;

      const extra = {
        cpf:          m.cpf          || null,
        tel:          m.tel          || null,
        n_frota:      m.n_frota      || null,
        tipo_frota:   m.tipo         || null,
        updatedAt:    new Date().toISOString(),
      };

      if (existentes[nome]) {
        await setDoc(doc(db, "motoristas", existentes[nome]), extra, { merge: true });
        atualizados++;
      } else {
        const id = toId(nome);
        await setDoc(doc(db, "motoristas", id), {
          nome,
          cnh: m.renavam_cnh || "",
          cat: "E",
          status: "ativo",
          ...extra,
          createdAt: new Date().toISOString(),
        });
        novos++;
      }
    }
    addLog(`Motoristas: ${atualizados} atualizados, ${novos} criados.`, "ok");
  }

  // ── Importar Manutenções ─────────────────────────────────────────────────
  async function importarManutencoes() {
    addLog("Importando manutenções (CIV, Tacógrafo, MOPP, CNH)...", "info");
    let salvos = 0;

    for (const m of MANUTENCOES_IMPORT) {
      if (!m.venc) continue;
      const meta = TIPO_META[m.tipo] || { label: m.tipo, grupo: "Documentação" };

      let docId, payload;

      if (m.tipo === "mopp" || m.tipo === "cnh_venc") {
        // Vinculado ao motorista
        const nomeId = toId(m.motorista || "");
        if (!nomeId) continue;
        docId = `moto__${nomeId}__${m.tipo}`;
        payload = {
          tipo:       m.tipo,
          label:      meta.label,
          grupo:      meta.grupo,
          motorista:  m.motorista,
          placa:      null,
          venc:       m.venc,
          updatedAt:  new Date().toISOString(),
        };
      } else {
        // Vinculado ao veículo
        const placa = m.placa?.trim();
        if (!placa) continue;
        const placaId = placa.toLowerCase().replace(/[^a-z0-9]/g, "_");
        docId = `${placaId}__${m.tipo}`;
        payload = {
          tipo:        m.tipo,
          label:       meta.label,
          grupo:       meta.grupo,
          placa,
          motorista:   m.motorista || null,
          venc:        m.venc,
          cipp:        m.cipp        || null,
          aferimento:  m.aferimento  || null,
          updatedAt:   new Date().toISOString(),
        };
      }

      await setDoc(doc(db, "manutencoes", docId), payload, { merge: true });
      salvos++;
    }
    addLog(`Manutenções: ${salvos} registros importados.`, "ok");
  }

  // ── Importar Manutenções Extra (abas restantes da planilha) ────────────────
  async function importarManutencoesExtra() {
    addLog(`Importando ${MANUTENCOES_EXTRA.length} registros extras (extintores, NR-20/35, licenças, engraxe, calibragem, bateria)...`, "info");
    let salvos = 0;
    for (const m of MANUTENCOES_EXTRA) {
      if (!m.venc) continue;
      const { _docId, ...payload } = m;
      if (!_docId) continue;
      await setDoc(doc(db, "manutencoes", _docId), { ...payload, updatedAt: new Date().toISOString() }, { merge: true });
      salvos++;
    }
    addLog(`Manutenções extra: ${salvos} registros importados.`, "ok");
  }

  // ── Limpar registros inválidos criados pela importação ─────────────────────
  const IDS_INVALIDOS = [
    // Lixo da importação (legendas da planilha + carretas órfãs)
    "carreta___padr_o", "tara_cavalo___tara_carreta", "pbt__tara_cavalo__tara_carreta",
    "tabeta_dnit", "48500", "57000", "74000",
    "ape_2c99", "akc_4j14", "aes_9364", "bej_8a71", "akc_4899", "uaw_2e42",
    // Duplicatas criadas pelo bug de normalização de placa (formato akd_5988 vs AKD5988)
    "akd_5988", "akd_5a88",
    "bbe_9588", "bbe_9593", "bbe_9594",
    "sef_1h24", "sef_1h25", "sef_1h27", "sef_1h28", "sef_1h29",
    "sef_1h31", "sef_1h32", "sef_1h36", "sef_1h37", "sef_1h39",
    "ses_9i46", "ses_9i57", "ses_9i76", "ses_9i77", "ses_9i82", "ses_9i83",
    "sfl_4g35", "sfl_4g37", "sfl_4g38", "sfl_4g39", "sfl_4g42", "sfl_4g43",
    "sfl_4g49", "sfl_4g51", "sfl_4g80", "sfl_4g83", "sfl_4g85", "sfl_4g86",
    "sfl_4g87", "sfl_4g89", "sfl_4g90",
    "tbx_5h14", "tbx_5h17",
  ];

  async function limparInvalidos() {
    setRodando(true);
    addLog("Verificando e removendo registros inválidos...", "info");
    let removidos = 0, naoEncontrados = 0;
    for (const id of IDS_INVALIDOS) {
      try {
        await deleteDoc(doc(db, "veiculos", id));
        addLog(`Removido: ${id}`, "ok");
        removidos++;
      } catch {
        naoEncontrados++;
      }
    }
    addLog(`Limpeza concluída: ${removidos} removidos, ${naoEncontrados} não encontrados.`, "ok");
    setRodando(false);
  }

  // ── Executar tudo ────────────────────────────────────────────────────────
  async function executar() {
    setRodando(true);
    setLog([]);
    setConcluido(false);
    try {
      addLog("=== INÍCIO DA IMPORTAÇÃO ===", "info");
      await importarVeiculos();
      await importarMotoristas();
      await importarManutencoes();
      await importarManutencoesExtra();
      addLog("=== IMPORTAÇÃO CONCLUÍDA COM SUCESSO ===", "ok");
      setConcluido(true);
    } catch (e) {
      console.error(e);
      addLog(`ERRO: ${e.message}`, "erro");
    } finally {
      setRodando(false);
    }
  }

  return (
    <div style={s.wrap}>
      <ModuleHeader title="Importação de Dados — Planilha Frota" />

      <main style={s.main}>
        <div style={s.card}>
          <h2 style={s.cardTitle}>O que será importado</h2>
          <div style={s.preview}>
            <div style={s.previewItem}>
              <span style={s.badge}><Truck size={14} /> {VEICULOS_IMPORT.length}</span>
              <div>
                <strong>Veículos</strong>
                <div style={s.previewDesc}>Adiciona: Chassi, RENAVAM, Tara, Ano Fab/Mod, Tipo Conjunto, Rota, Compartimentos, Capacidade</div>
              </div>
            </div>
            <div style={s.previewItem}>
              <span style={s.badge}><User size={14} /> {MOTORISTAS_IMPORT.length}</span>
              <div>
                <strong>Motoristas</strong>
                <div style={s.previewDesc}>Adiciona: CPF, Telefone, Nº Frota, Tipo — não sobrescreve CNH já cadastrada</div>
              </div>
            </div>
            <div style={s.previewItem}>
              <span style={s.badge}><Wrench size={14} /> {MANUTENCOES_IMPORT.length}</span>
              <div>
                <strong>Manutenções — Base</strong>
                <div style={s.previewDesc}>CIV (cavalo + carretas), Tacógrafo, MOPP, Validade CNH com datas de vencimento reais</div>
              </div>
            </div>
            <div style={s.previewItem}>
              <span style={s.badge}><ClipboardList size={14} /> {MANUTENCOES_EXTRA.length}</span>
              <div>
                <strong>Manutenções — Extra</strong>
                <div style={s.previewDesc}>Extintor cabine/carreta, NR-20, NR-35, Licença PR/Federal, Engraxe, Calibragem, Bateria</div>
              </div>
            </div>
          </div>

          <div style={s.aviso}>
            <strong style={{ display:"inline-flex", alignItems:"center", gap:6 }}><AlertTriangle size={15} /> Atenção:</strong> Esta importação usa <code>merge: true</code> — dados existentes são complementados, não apagados.
            Execute apenas uma vez. Se rodar novamente, sobrescreve com os mesmos dados.
          </div>

          <button
            style={{ ...s.btn, marginBottom: 8, background:"var(--danger)", opacity: rodando ? 0.6 : 1, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8 }}
            onClick={limparInvalidos}
            disabled={rodando}
          >
            <Trash2 size={16} /> Limpar Registros Inválidos (carretas e lixo da importação)
          </button>

          <button
            style={{ ...s.btn, opacity: rodando ? 0.6 : 1, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8 }}
            onClick={executar}
            disabled={rodando}
          >
            {rodando ? (<><Loader2 size={16} /> Importando...</>) : concluido ? (<><RefreshCw size={16} /> Reimportar (merge)</>) : (<><Rocket size={16} /> Executar Importação</>)}
          </button>
        </div>

        {log.length > 0 && (
          <div style={s.logBox}>
            {log.map((l, i) => (
              <div key={i} style={{ ...s.logLine, color: l.tipo === "erro" ? "var(--danger)" : l.tipo === "ok" ? "var(--success)" : "var(--text)" }}>
                <span style={s.logTs}>{l.ts}</span> {l.msg}
              </div>
            ))}
          </div>
        )}

        {concluido && (
          <div style={s.success}>
            <CheckCircle2 size={18} /> Todos os dados foram importados com sucesso!
            <button style={{ ...s.backBtnGreen }} onClick={() => navigate("/frota")}>Ver Frota →</button>
            <button style={{ ...s.backBtnGreen }} onClick={() => navigate("/motoristas")}>Ver Motoristas →</button>
            <button style={{ ...s.backBtnGreen }} onClick={() => navigate("/manutencao")}>Ver Manutenção →</button>
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  wrap:        { minHeight:"100vh", background:"var(--bg)", fontFamily:"system-ui,sans-serif" },
  header:      { background:"var(--header-bg)", borderBottom: "1px solid var(--header-border)", padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 8px rgba(0,0,0,.15)" },
  title:       { color:"#fff", fontSize:"1.1rem", fontWeight:700, margin:0 },
  backBtn:     { padding:"6px 16px", background:"var(--header-btn-bg)", border:"none", borderRadius:6, fontSize:".82rem", cursor:"pointer", color:"var(--accent)", fontWeight:700, display:"inline-flex", alignItems:"center", gap:6 },
  main:        { padding:"32px 24px", maxWidth:800, margin:"0 auto", display:"flex", flexDirection:"column", gap:20 },
  card:        { background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:14, padding:28 },
  cardTitle:   { fontSize:"1.1rem", fontWeight:700, color:"var(--accent)", marginBottom:20, marginTop:0 },
  preview:     { display:"flex", flexDirection:"column", gap:14, marginBottom:24 },
  previewItem: { display:"flex", alignItems:"flex-start", gap:14 },
  badge:       { background:"var(--accent-soft)", color:"var(--accent)", borderRadius:10, padding:"4px 14px", fontWeight:700, fontSize:".9rem", whiteSpace:"nowrap", minWidth:80, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6 },
  previewDesc: { fontSize:".8rem", color:"var(--text-muted)", marginTop:3, lineHeight:1.5 },
  aviso:       { background:"var(--warning-bg)", border:"1px solid #fde68a", borderRadius:8, padding:"12px 16px", fontSize:".83rem", color:"var(--warning)", marginBottom:20, lineHeight:1.6 },
  btn:         { width:"100%", padding:"14px", background:"var(--accent)", color:"#fff", border:"none", borderRadius:8, fontSize:"1rem", fontWeight:700, cursor:"pointer" },
  logBox:      { background:"var(--text)", borderRadius:10, padding:20, fontFamily:"monospace", fontSize:".8rem", maxHeight:400, overflowY:"auto" },
  logLine:     { marginBottom:4, lineHeight:1.5 },
  logTs:       { color:"var(--text-muted)", marginRight:8 },
  success:     { background:"var(--success-bg)", border:"1px solid #86efac", borderRadius:10, padding:20, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", fontWeight:600, color:"var(--success)" },
  backBtnGreen:{ padding:"8px 16px", background:"var(--success)", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:".85rem" },
};
