// VeiculoQR — modal com QR Code do veículo pra imprimir e colar na cabine/janela
// Escanear com celular → abre ficha do veículo direto (/frota?placa=X)

import QRCode from "react-qr-code";
import { Printer, X } from "lucide-react";

export default function VeiculoQR({ placa, onClose }) {
  // URL alvo — vai pra ficha do veículo. Ajusta se o sistema estiver em produção
  const url = `${window.location.origin}/frota?placa=${encodeURIComponent(placa)}`;

  function imprimir() {
    // Abre janela nova só com o QR pra impressão limpa
    const w = window.open("", "_blank", "width=500,height=650");
    if (!w) return alert("Popup bloqueado. Libere popups pra este site.");
    w.document.write(`
      <html>
      <head>
        <title>QR ${placa}</title>
        <style>
          body { font-family: system-ui, sans-serif; text-align: center; padding: 30px; }
          .qr { display: inline-block; padding: 20px; background: #fff; border: 2px solid #000; border-radius: 12px; }
          h1 { font-size: 42px; margin: 20px 0 8px; letter-spacing: 2px; }
          .sub { color: #555; font-size: 14px; margin-bottom: 20px; }
          .foot { margin-top: 20px; font-size: 11px; color: #888; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${placa}</h1>
        <div class="sub">Pontual Logística — Ficha do Veículo</div>
        <div class="qr">${document.getElementById(`qr-svg-${placa}`)?.outerHTML || ""}</div>
        <div class="foot">Escaneie com o celular pra abrir a ficha completa</div>
      </body>
      </html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  }

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:12, padding:24, maxWidth:400, width:"100%", textAlign:"center" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h2 style={{ margin:0, fontSize:"1.1rem", color:"#1a3a5c" }}>QR Code — {placa}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", display:"inline-flex" }}><X size={20} /></button>
        </div>
        <div style={{ background:"#fff", padding:16, borderRadius:8, display:"inline-block" }}>
          <QRCode id={`qr-svg-${placa}`} value={url} size={220} level="M" />
        </div>
        <p style={{ fontSize:".82rem", color:"#64748b", marginTop:12, marginBottom:0 }}>
          Escaneie com celular pra abrir a ficha do veículo.<br />
          Cole na cabine, janela ou espelho do caminhão.
        </p>
        <p style={{ fontSize:".7rem", color:"#94a3b8", marginTop:8, wordBreak:"break-all" }}>{url}</p>
        <button
          onClick={imprimir}
          style={{ marginTop:16, background:"#1a3a5c", color:"#fff", border:"none", padding:"10px 20px", borderRadius:8, cursor:"pointer", fontWeight:700, display:"inline-flex", alignItems:"center", gap:8 }}
        >
          <Printer size={16} /> Imprimir
        </button>
      </div>
    </div>
  );
}
