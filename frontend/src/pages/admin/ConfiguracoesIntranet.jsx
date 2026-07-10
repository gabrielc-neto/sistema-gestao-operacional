// Configurações - Intranet
// Gerencia o portão de acesso restrito da Intranet:
//   - Rede autorizada: lista de IPs/faixas (CIDR) que podem acessar a Intranet.
//   - Palavra-chave: exigida após a validação de rede. Gravada só como hash.
// Requer permissão `intranet.configurar` (controlado em App.jsx).
//
// A validação real acontece no servidor (Cloud Function `intranetGate`). Esta
// tela apenas escreve a configuração em `intranet/config`. A palavra-chave é
// convertida em hash SHA-256 no navegador antes de gravar — o texto puro nunca
// sai desta tela nem é armazenado.

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import ProtegerPor from "../../rbac/ProtegerPor";
import ModuleHeader from "../../components/ModuleHeader";

// Precisa bater com INTRANET_SALT na Cloud Function (functions/index.js).
const INTRANET_SALT = "pontual-intranet-v1";

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Aceita IP exato (200.1.2.3) ou faixa CIDR IPv4 (200.1.2.0/24).
function ipValido(v) {
  const t = String(v).trim();
  const m = t.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(\/(\d{1,2}))?$/);
  if (!m) return false;
  for (let i = 1; i <= 4; i++) if (Number(m[i]) > 255) return false;
  if (m[6] !== undefined && Number(m[6]) > 32) return false;
  return true;
}

const CONFIG_REF = () => doc(db, "intranet", "config");

export default function ConfiguracoesIntranet() {
  const [loading, setLoading]   = useState(true);
  const [ips, setIps]           = useState([]);
  const [temChave, setTemChave] = useState(false);
  const [novoIp, setNovoIp]     = useState("");
  const [meuIp, setMeuIp]       = useState("");
  const [chave, setChave]       = useState("");
  const [chave2, setChave2]     = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg]           = useState("");
  const [erro, setErro]         = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const snap = await getDoc(CONFIG_REF());
      const cfg = snap.exists() ? snap.data() : {};
      setIps(Array.isArray(cfg.ips) ? cfg.ips : []);
      setTemChave(!!cfg.keywordHash);
    } catch (e) {
      setErro("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  // Detecta o IP público de quem está configurando (conveniência do botão "usar meu IP").
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d) => setMeuIp(d?.ip || ""))
      .catch(() => setMeuIp(""));
  }, []);

  function feedback(texto) {
    setErro("");
    setMsg(texto);
    setTimeout(() => setMsg(""), 3500);
  }

  async function gravar(patch) {
    await setDoc(
      CONFIG_REF(),
      { ...patch, updatedAt: serverTimestamp(), updatedBy: auth.currentUser?.uid || null },
      { merge: true }
    );
  }

  async function adicionarIp(valor) {
    const v = String(valor).trim();
    setErro("");
    if (!v) return;
    if (!ipValido(v)) return setErro("IP ou faixa inválida. Ex: 200.1.2.3 ou 200.1.2.0/24");
    if (ips.includes(v)) return setErro("Este IP já está na lista.");
    const novos = [...ips, v];
    setSalvando(true);
    try {
      await gravar({ ips: novos });
      setIps(novos);
      setNovoIp("");
      feedback("IP adicionado à rede autorizada.");
    } catch (e) {
      setErro("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function removerIp(v) {
    if (!window.confirm(`Remover "${v}" da rede autorizada?`)) return;
    const novos = ips.filter((x) => x !== v);
    setSalvando(true);
    try {
      await gravar({ ips: novos });
      setIps(novos);
      feedback("IP removido.");
    } catch (e) {
      setErro("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarChave(e) {
    e.preventDefault();
    setErro("");
    if (chave.length < 4) return setErro("A palavra-chave deve ter ao menos 4 caracteres.");
    if (chave !== chave2) return setErro("As palavras-chave não conferem.");
    setSalvando(true);
    try {
      const keywordHash = await sha256Hex(INTRANET_SALT + chave);
      await gravar({ keywordHash });
      setTemChave(true);
      setChave("");
      setChave2("");
      feedback("Palavra-chave atualizada.");
    } catch (e2) {
      setErro("Erro ao salvar: " + e2.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={s.wrap}>
      <ModuleHeader title="Configurações - Intranet" />

      <div style={s.body}>
        {loading ? (
          <p style={s.info}>Carregando...</p>
        ) : (
          <>
            {msg && <div style={s.ok}>{msg}</div>}
            {erro && <div style={s.err}>{erro}</div>}

            {/* ── Rede autorizada ─────────────────────────────── */}
            <section style={s.card}>
              <h2 style={s.h2}>Rede autorizada</h2>
              <p style={s.desc}>
                Apenas conexões vindas destes IPs (ou faixas) poderão acessar a Intranet.
                Use o IP público da internet da base. <strong>Sem nenhum IP na lista, a
                restrição de rede fica desligada</strong> (só a palavra-chave protege).
              </p>

              <div style={s.rowAdd}>
                <input
                  style={s.input}
                  placeholder="Ex: 200.1.2.3  ou  200.1.2.0/24"
                  value={novoIp}
                  onChange={(e) => setNovoIp(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") adicionarIp(novoIp); }}
                />
                <ProtegerPor permissao="intranet.configurar">
                  <button style={s.btn} disabled={salvando} onClick={() => adicionarIp(novoIp)}>
                    Adicionar
                  </button>
                </ProtegerPor>
              </div>

              {meuIp && (
                <button
                  style={s.btnGhost}
                  disabled={salvando || ips.includes(meuIp)}
                  onClick={() => adicionarIp(meuIp)}
                >
                  {ips.includes(meuIp)
                    ? `Seu IP atual (${meuIp}) já está autorizado`
                    : `Usar meu IP atual (${meuIp})`}
                </button>
              )}

              <div style={{ marginTop: 16 }}>
                {ips.length === 0 ? (
                  <p style={s.vazio}>
                    Nenhum IP cadastrado — a Intranet está aberta a qualquer rede (só a palavra-chave protege).
                  </p>
                ) : (
                  <ul style={s.lista}>
                    {ips.map((ip) => (
                      <li key={ip} style={s.li}>
                        <span style={s.ipTxt}>{ip}</span>
                        <ProtegerPor permissao="intranet.configurar">
                          <button style={s.btnDel} disabled={salvando} onClick={() => removerIp(ip)}>
                            Remover
                          </button>
                        </ProtegerPor>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* ── Palavra-chave ───────────────────────────────── */}
            <section style={s.card}>
              <h2 style={s.h2}>Palavra-chave</h2>
              <p style={s.desc}>
                Exigida após a validação de rede. É gravada apenas como hash — não é possível
                consultá-la depois, somente definir uma nova.
              </p>
              <p style={temChave ? s.badgeOk : s.badgeOff}>
                {temChave ? "✓ Palavra-chave definida" : "Nenhuma palavra-chave definida ainda"}
              </p>

              <ProtegerPor permissao="intranet.configurar">
                <form onSubmit={salvarChave} style={s.form}>
                  <input
                    style={s.input}
                    type="password"
                    autoComplete="new-password"
                    placeholder={temChave ? "Nova palavra-chave" : "Definir palavra-chave"}
                    value={chave}
                    onChange={(e) => setChave(e.target.value)}
                  />
                  <input
                    style={s.input}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repita a palavra-chave"
                    value={chave2}
                    onChange={(e) => setChave2(e.target.value)}
                  />
                  <button style={s.btn} type="submit" disabled={salvando}>
                    {salvando ? "Salvando..." : temChave ? "Alterar palavra-chave" : "Definir palavra-chave"}
                  </button>
                </form>
              </ProtegerPor>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  wrap:  { minHeight: "100vh", background: "var(--bg, #f0f4f8)", fontFamily: "var(--font)" },
  body:  { padding: 24, maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 },
  info:  { color: "var(--text-subtle)", textAlign: "center", marginTop: 40 },
  card:  { background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border)", padding: 22 },
  h2:    { fontSize: "1.02rem", fontWeight: 700, color: "var(--accent)", margin: "0 0 6px" },
  desc:  { fontSize: ".84rem", color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 16px" },
  rowAdd:{ display: "flex", gap: 10, flexWrap: "wrap" },
  input: { flex: 1, minWidth: 200, padding: "9px 12px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: ".9rem", outline: "none", fontFamily: "inherit", background: "var(--surface, #fff)", color: "var(--text)" },
  btn:   { padding: "9px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: ".85rem", whiteSpace: "nowrap" },
  btnGhost: { marginTop: 10, padding: "8px 14px", background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border)", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: ".82rem" },
  btnDel:{ padding: "5px 12px", background: "var(--danger-bg)", color: "var(--danger)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: ".76rem" },
  lista: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  li:    { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" },
  ipTxt: { fontFamily: "monospace", fontSize: ".9rem", color: "var(--text)", fontWeight: 600 },
  vazio: { fontSize: ".84rem", color: "var(--text-subtle)", fontStyle: "italic", margin: 0 },
  form:  { display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 },
  badgeOk:  { display: "inline-block", fontSize: ".8rem", fontWeight: 700, color: "var(--success)", background: "var(--success-bg)", padding: "4px 12px", borderRadius: 999, margin: "0 0 14px" },
  badgeOff: { display: "inline-block", fontSize: ".8rem", fontWeight: 700, color: "var(--text-muted)", background: "var(--surface-3)", padding: "4px 12px", borderRadius: 999, margin: "0 0 14px" },
  ok:    { background: "var(--success-bg)", color: "var(--success)", border: "1px solid var(--success)", borderRadius: 8, padding: "10px 14px", fontSize: ".85rem", fontWeight: 600 },
  err:   { background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: ".85rem", fontWeight: 600 },
};
