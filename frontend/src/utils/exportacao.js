// ════════════════════════════════════════════════════════════════════
//  Motor de exportação corporativa — Pontual Logística
//  4 formatos a partir de um mesmo "spec": CSV, Excel (.xls), PDF e Imprimir.
//
//  spec = {
//    titulo:    "Frota",                       // nome do relatório
//    subtitulo: "37 veículos · filtro: ativos",// linha auxiliar (opcional)
//    colunas:   ["Placa", "Tipo", "Status"],   // string[]  (cabeçalho)
//    linhas:    [ ["ABC1D23","Cavalo","Ativo"], ... ], // (string|number)[][]
//    arquivo:   "frota",                        // base do nome do arquivo
//  }
//
//  Todas as funções são tolerantes a células null/undefined.
// ════════════════════════════════════════════════════════════════════

const EMPRESA = "PONTUAL LOGÍSTICA";

/* ─── helpers ─────────────────────────────────────────────────────── */
function cel(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function escapeHtml(v) {
  return cel(v).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function agora() {
  return new Date().toLocaleString("pt-BR");
}

function dataArquivo() {
  const d = new Date();
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

function nomeArquivo(base, ext) {
  const limpo = (base || "relatorio").toString().trim().replace(/\s+/g, "_").toLowerCase();
  return `${limpo}_${dataArquivo()}.${ext}`;
}

function baixarBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function validar(spec) {
  const colunas = Array.isArray(spec?.colunas) ? spec.colunas : [];
  const linhas = Array.isArray(spec?.linhas) ? spec.linhas : [];
  return { ...spec, colunas, linhas };
}

/* ═══════════════════════════════════════════════════════════════════
   CSV — separador ";" + BOM UTF-8 (abre direto no Excel-PT com acento)
   ═══════════════════════════════════════════════════════════════════ */
function csvField(v) {
  const s = cel(v);
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportarCsv(spec) {
  const { colunas, linhas, arquivo } = validar(spec);
  const matriz = [colunas, ...linhas];
  const csv = matriz.map((r) => r.map(csvField).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  baixarBlob(blob, nomeArquivo(arquivo, "csv"));
}

/* ═══════════════════════════════════════════════════════════════════
   Excel (.xls) — HTML table com namespace do Office (abre no Excel sem
   dependência externa). Cabeçalho corporativo em linhas mescladas.
   ═══════════════════════════════════════════════════════════════════ */
export function exportarExcel(spec) {
  const { titulo, subtitulo, colunas, linhas, arquivo } = validar(spec);
  const nCols = Math.max(colunas.length, 1);

  const thead = `
    <tr>
      ${colunas.map((c) => `<th style="background:#18216E;color:#ffffff;border:1px solid #0f1547;padding:6px 10px;text-align:left;font-family:Arial;font-size:11px;font-weight:700">${escapeHtml(c)}</th>`).join("")}
    </tr>`;

  const tbody = linhas.map((r, i) => `
    <tr>
      ${colunas.map((_, ci) => {
        const v = escapeHtml(r[ci]);
        const num = r[ci] !== "" && r[ci] !== null && r[ci] !== undefined && !isNaN(Number(String(r[ci]).replace(",", "."))) && /^-?[\d.,]+$/.test(String(r[ci]));
        return `<td style="border:1px solid #d1d5db;padding:5px 10px;font-family:Arial;font-size:11px;background:${i % 2 ? "#f3f5f9" : "#ffffff"}"${num ? ' x:num' : ""}>${v}</td>`;
      }).join("")}
    </tr>`).join("");

  const html =
`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"/>
<xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${escapeHtml((titulo || "Relatorio").slice(0, 28))}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
</head>
<body>
<table border="0" cellspacing="0" cellpadding="0">
  <tr><td colspan="${nCols}" style="font-family:Arial;font-size:16px;font-weight:700;color:#18216E;padding:2px 4px">${escapeHtml(EMPRESA)}</td></tr>
  <tr><td colspan="${nCols}" style="font-family:Arial;font-size:13px;font-weight:700;color:#1d4ed8;padding:2px 4px">${escapeHtml(titulo || "Relatório")}</td></tr>
  ${subtitulo ? `<tr><td colspan="${nCols}" style="font-family:Arial;font-size:10px;color:#64748b;padding:2px 4px">${escapeHtml(subtitulo)}</td></tr>` : ""}
  <tr><td colspan="${nCols}" style="font-family:Arial;font-size:10px;color:#64748b;padding:2px 4px">Emitido em ${escapeHtml(agora())} · ${linhas.length} registro(s)</td></tr>
  <tr><td colspan="${nCols}" style="height:6px"></td></tr>
</table>
<table border="0" cellspacing="0" cellpadding="0">
  <thead>${thead}</thead>
  <tbody>${tbody}</tbody>
</table>
</body></html>`;

  const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  baixarBlob(blob, nomeArquivo(arquivo, "xls"));
}

/* ═══════════════════════════════════════════════════════════════════
   HTML corporativo — base compartilhada por PDF e Imprimir
   ═══════════════════════════════════════════════════════════════════ */
function construirRelatorioHtml({ titulo, subtitulo, colunas, linhas }) {
  const thead = colunas
    .map((c) => `<th>${escapeHtml(c)}</th>`)
    .join("");

  const tbody = linhas
    .map((r, i) => `<tr class="${i % 2 ? "odd" : ""}">${colunas
      .map((_, ci) => `<td>${escapeHtml(r[ci])}</td>`)
      .join("")}</tr>`)
    .join("");

  return `
    <div class="rel-root">
      <div class="rel-head">
        <div class="rel-brand">
          <div class="rel-empresa">${escapeHtml(EMPRESA)}</div>
          <div class="rel-titulo">${escapeHtml(titulo || "Relatório")}</div>
          ${subtitulo ? `<div class="rel-sub">${escapeHtml(subtitulo)}</div>` : ""}
        </div>
        <div class="rel-meta">
          Emitido em<br/><b>${escapeHtml(agora())}</b><br/>
          ${linhas.length} registro(s)
        </div>
      </div>
      <table class="rel-table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
      <div class="rel-foot">
        Documento gerado automaticamente pelo Sistema de Gestão Logístico — Pontual Logística.
      </div>
    </div>`;
}

const REL_CSS = `
  * { box-sizing: border-box; }
  .rel-root { font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
  .rel-head {
    display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 3px solid #1d4ed8; padding-bottom: 8px; margin-bottom: 12px;
  }
  .rel-empresa { font-size: 18px; font-weight: 800; color: #18216E; letter-spacing: -.01em; }
  .rel-titulo  { font-size: 13px; font-weight: 700; color: #1d4ed8; margin-top: 2px; }
  .rel-sub     { font-size: 10px; color: #64748b; margin-top: 3px; }
  .rel-meta    { text-align: right; font-size: 10px; color: #64748b; white-space: nowrap; }
  .rel-meta b  { color: #0f172a; }
  .rel-table   { width: 100%; border-collapse: collapse; font-size: 10px; }
  .rel-table thead th {
    background: #18216E; color: #fff; text-align: left; padding: 6px 8px;
    font-size: 9px; text-transform: uppercase; letter-spacing: .03em; font-weight: 700;
    border: 1px solid #0f1547;
  }
  .rel-table tbody td {
    padding: 5px 8px; border: 1px solid #e2e8f0; color: #1e293b; vertical-align: top;
  }
  .rel-table tbody tr.odd td { background: #f3f5f9; }
  .rel-foot { margin-top: 12px; font-size: 8.5px; color: #94a3b8; line-height: 1.5; }
`;

/* ═══════════════════════════════════════════════════════════════════
   PDF — html2pdf.js. Retrato até 6 colunas; acima disso, paisagem.
   ═══════════════════════════════════════════════════════════════════ */
export async function exportarPdf(spec) {
  const s = validar(spec);
  const paisagem = s.colunas.length > 6;

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:" + (paisagem ? "1120px" : "800px") + ";background:#fff;padding:16px";
  container.innerHTML = `<style>${REL_CSS}</style>` + construirRelatorioHtml(s);
  document.body.appendChild(container);

  try {
    const { default: html2pdf } = await import("html2pdf.js");
    await html2pdf().set({
      filename: nomeArquivo(s.arquivo, "pdf"),
      margin: 8,
      image: { type: "jpeg", quality: 0.96 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: paisagem ? "landscape" : "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    }).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Imprimir — abre janela dedicada, injeta o relatório e chama print().
   ═══════════════════════════════════════════════════════════════════ */
export function imprimir(spec) {
  const s = validar(spec);
  const win = window.open("", "_blank", "width=1024,height=768");
  if (!win) {
    alert("O navegador bloqueou a janela de impressão. Permita pop-ups para este site.");
    return;
  }
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
    <title>${escapeHtml(s.titulo || "Relatório")} — ${escapeHtml(EMPRESA)}</title>
    <style>
      @page { size: ${s.colunas.length > 6 ? "A4 landscape" : "A4 portrait"}; margin: 12mm; }
      body { margin: 0; padding: 18px; }
      ${REL_CSS}
      @media print { .rel-table tbody tr { page-break-inside: avoid; } }
    </style></head><body>${construirRelatorioHtml(s)}</body></html>`);
  win.document.close();
  win.focus();
  // Espera o layout assentar antes de imprimir
  setTimeout(() => {
    win.print();
  }, 300);
}

/* Atalho: dispara o formato pedido a partir de uma string */
export function exportar(formato, spec) {
  switch (formato) {
    case "csv":      return exportarCsv(spec);
    case "excel":    return exportarExcel(spec);
    case "pdf":      return exportarPdf(spec);
    case "imprimir": return imprimir(spec);
    default: throw new Error("Formato desconhecido: " + formato);
  }
}
