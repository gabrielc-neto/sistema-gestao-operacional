// Área interna da Intranet — acessível somente após passar pelo portão
// (validação de rede + palavra-chave) na tela inicial. O acesso é sinalizado
// por uma flag de sessão gravada pelo portão em Login.jsx.
//
// Observação de segurança: esta flag de sessão é uma barreira leve (client-side).
// A proteção real é a Cloud Function `intranetGate`, que só libera o portão na
// rede autorizada e com a palavra-chave correta. Quando esta área passar a
// carregar dados sensíveis, cada leitura deve ser revalidada no servidor.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoPontual from "../components/LogoPontual";

const SECOES = [
  { titulo: "Avisos internos", desc: "Comunicados e novidades da empresa.", em_breve: true,
    icon: (<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>) },
  { titulo: "Documentos", desc: "Políticas, manuais e formulários.", em_breve: true,
    icon: (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>) },
  { titulo: "Links úteis", desc: "Atalhos para sistemas e recursos internos.", em_breve: true,
    icon: (<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>) },
];

export default function IntranetArea() {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("intranet_ok") === "1") {
      setOk(true);
      document.title = "Gerenciamento de Sistemas - Área interna";
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  function sair() {
    sessionStorage.removeItem("intranet_ok");
    navigate("/", { replace: true });
  }

  if (!ok) return null;

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <LogoPontual height={34} variant="white" />
        <span style={s.htitle}>Gerenciamento de Sistemas</span>
        <button style={s.sair} onClick={sair}>Sair</button>
      </header>

      <main style={s.body}>
        <h1 style={s.h1}>Bem-vindo ao Gerenciamento de Sistemas</h1>
        <p style={s.sub}>Acesso restrito — validado pela rede da base e pela palavra-chave.</p>

        <div style={s.grid}>
          {SECOES.map((sec) => (
            <div key={sec.titulo} style={s.card}>
              <span style={s.ico}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{sec.icon}</svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={s.cardTitle}>{sec.titulo}</div>
                <div style={s.cardDesc}>{sec.desc}</div>
              </div>
              {sec.em_breve && <span style={s.badge}>Em breve</span>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const s = {
  wrap:   { minHeight: "100vh", background: "var(--bg, #f0f4f8)", fontFamily: "var(--font)" },
  header: { background: "var(--header-bg, #18216e)", color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 4px 14px rgba(15,23,42,.18)" },
  htitle: { fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-.01em" },
  sair:   { marginLeft: "auto", padding: "8px 16px", background: "rgba(255,255,255,.14)", color: "#fff", border: "1px solid rgba(255,255,255,.28)", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".82rem" },
  body:   { padding: 24, maxWidth: 900, margin: "0 auto" },
  h1:     { fontSize: "1.4rem", fontWeight: 700, color: "var(--text)", margin: "8px 0 4px" },
  sub:    { fontSize: ".9rem", color: "var(--text-muted)", margin: "0 0 24px" },
  grid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 },
  card:   { display: "flex", alignItems: "center", gap: 14, padding: 18, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12 },
  ico:    { width: 46, height: 46, borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitle: { fontWeight: 700, fontSize: ".95rem", color: "var(--text)" },
  cardDesc:  { fontSize: ".8rem", color: "var(--text-muted)", marginTop: 2 },
  badge:  { fontSize: ".68rem", fontWeight: 700, color: "var(--text-muted)", background: "var(--surface-3)", padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" },
};
