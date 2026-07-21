// InstallPWA — banner discreto no rodapé oferecendo instalar o app
// Aparece só se browser suporta e user não recusou nas últimas 7 dias

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const LS_KEY = "pontual_pwa_dismissed_at";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    function onBeforeInstall(e) {
      e.preventDefault();
      // Se usuário recusou há < 7 dias, não mostra
      const dismissedAt = Number(localStorage.getItem(LS_KEY) || 0);
      if (Date.now() - dismissedAt < 7 * 86400000) return;
      setDeferredPrompt(e);
      setVisivel(true);
    }
    function onInstalled() {
      setVisivel(false);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function instalar() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice.catch(() => ({ outcome: "dismissed" }));
    if (result.outcome === "dismissed") {
      localStorage.setItem(LS_KEY, String(Date.now()));
    }
    setVisivel(false);
    setDeferredPrompt(null);
  }

  function fechar() {
    localStorage.setItem(LS_KEY, String(Date.now()));
    setVisivel(false);
  }

  if (!visivel || !deferredPrompt) return null;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, background: "#1a3a5c", color: "#fff", padding: "14px 18px", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,.25)", display: "flex", alignItems: "center", gap: 12, maxWidth: 380 }}>
      <div style={{ background: "#fff", color: "#1a3a5c", width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Download size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: ".9rem" }}>Instalar Pontual como app</div>
        <div style={{ fontSize: ".78rem", opacity: .85 }}>Abre igual a um aplicativo — mais rápido e cabe na tela inicial.</div>
      </div>
      <button onClick={instalar} style={{ background: "#EA580C", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: ".85rem" }}>Instalar</button>
      <button onClick={fechar} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 4 }}><X size={16} /></button>
    </div>
  );
}
