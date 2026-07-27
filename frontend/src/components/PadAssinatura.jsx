// PadAssinatura — canvas HTML5 pra motorista assinar com dedo (mobile) ou mouse
// Retorna PNG base64 via onChange. Suporta reset e touch events.

import { useEffect, useRef, useState } from "react";
import { Eraser, Check } from "lucide-react";

export default function PadAssinatura({ value, onChange, label = "Assinatura", altura = 140 }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [ultimoPonto, setUltimoPonto] = useState(null);

  // Restaura assinatura existente ao abrir modal
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
      setDirty(true);
    }
  }, [value]);

  function coord(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const source = e.touches?.[0] || e;
    return {
      x: (source.clientX - rect.left) * scaleX,
      y: (source.clientY - rect.top) * scaleY,
    };
  }

  function inicio(e) {
    e.preventDefault();
    setDrawing(true);
    setUltimoPonto(coord(e));
  }

  function mover(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = coord(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "#1a3a5c";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(ultimoPonto.x, ultimoPonto.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setUltimoPonto(p);
    setDirty(true);
  }

  function fim() {
    if (!drawing) return;
    setDrawing(false);
    setUltimoPonto(null);
    const png = canvasRef.current.toDataURL("image/png");
    onChange?.(png);
  }

  function limpar() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setDirty(false);
    onChange?.(null);
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <label style={{ fontSize:".85rem", fontWeight:600, color:"#1a3a5c" }}>{label}</label>
        {dirty && (
          <button type="button" onClick={limpar} style={{ background:"#fee2e2", color:"#b91c1c", border:"none", padding:"4px 10px", borderRadius:6, fontSize:".75rem", fontWeight:600, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 }}>
            <Eraser size={12} /> Limpar
          </button>
        )}
      </div>
      <div style={{ border:"2px dashed #cbd5e1", borderRadius:8, background:"#fff", position:"relative", touchAction:"none" }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={altura * (800/500)}
          style={{ width:"100%", height: altura, display:"block", cursor:"crosshair", borderRadius:6 }}
          onMouseDown={inicio}
          onMouseMove={mover}
          onMouseUp={fim}
          onMouseLeave={fim}
          onTouchStart={inicio}
          onTouchMove={mover}
          onTouchEnd={fim}
        />
        {!dirty && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", color:"#94a3b8", fontSize:".85rem", fontStyle:"italic" }}>
            Assine aqui com o dedo (celular) ou mouse
          </div>
        )}
      </div>
      {dirty && (
        <div style={{ marginTop:4, fontSize:".72rem", color:"#15803d", display:"inline-flex", alignItems:"center", gap:4 }}>
          <Check size={12} /> Assinatura capturada
        </div>
      )}
    </div>
  );
}
