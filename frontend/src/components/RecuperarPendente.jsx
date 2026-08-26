import { useEffect, useState } from "react";
import { listarPendentes, descartarPendente, reenviarPendente } from "../services/pontualApi";
import { isAuthenticated } from "../services/authVPS";

// Banner topo — reaparece quando ha submissao pendente salva no localStorage
// (tipicamente OS/lancamento que retornou 401 antes do fix de auth). User
// reloga → banner aparece → clica Reenviar → refaz a request com token novo.
export default function RecuperarPendente() {
  const [pendentes, setPendentes] = useState([]);
  const [processando, setProcessando] = useState(null);

  function recarregar() {
    setPendentes(isAuthenticated() ? listarPendentes() : []);
  }

  useEffect(() => {
    recarregar();
    const t = setInterval(recarregar, 5000);
    return () => clearInterval(t);
  }, []);

  if (pendentes.length === 0) return null;

  async function reenviar(id) {
    setProcessando(id);
    const r = await reenviarPendente(id);
    setProcessando(null);
    if (r.ok) { recarregar(); alert("Reenviado com sucesso."); }
    else alert("Falha ao reenviar: " + r.err);
  }
  function descartar(id) {
    if (!window.confirm("Descartar? Nao ha como recuperar depois.")) return;
    descartarPendente(id);
    recarregar();
  }

  return (
    <div style={{ background: "#fef3c7", borderBottom: "2px solid #f59e0b", padding: "10px 16px", position: "sticky", top: 0, zIndex: 9999 }}>
      <div style={{ fontWeight: 700, color: "#92400e", fontSize: ".9rem", marginBottom: 6 }}>
        Voce tem {pendentes.length} submissao{pendentes.length > 1 ? "oes" : ""} pendente{pendentes.length > 1 ? "s" : ""} (sessao expirou antes de salvar):
      </div>
      {pendentes.map(p => {
        const min = Math.floor((Date.now() - p.at) / 60000);
        const tempo = min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60}m`;
        return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".82rem", padding: "4px 0", color: "#78350f" }}>
            <code style={{ background: "#fde68a", padding: "2px 6px", borderRadius: 4 }}>{p.method} {p.path}</code>
            <span>({tempo} atras)</span>
            <button onClick={() => reenviar(p.id)} disabled={processando === p.id}
              style={{ marginLeft: "auto", padding: "4px 12px", background: "#059669", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: ".8rem", fontWeight: 700 }}>
              {processando === p.id ? "Reenviando..." : "Reenviar"}
            </button>
            <button onClick={() => descartar(p.id)}
              style={{ padding: "4px 10px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: ".8rem" }}>
              Descartar
            </button>
          </div>
        );
      })}
    </div>
  );
}
