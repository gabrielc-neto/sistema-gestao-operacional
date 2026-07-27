// Gera PDF A4 do Checklist Mensal de Manutenção Preventiva.
// Layout compacto: cabeçalho + 15 itens em tabelas + ocorrências + fotos + assinaturas
// dentro de no máximo 3 páginas.

const EMPRESA = {
  razao:    "PONTUAL BRASIL PETRÓLEO LTDA",
  cnpj:     "02.886.685/0001-40",
  endereco: "Rua Luiz Franceschi, 666 — Thomaz Coelho, Araucária/PR",
};

function esc(v) {
  return String(v ?? "—").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
}

function fmtData(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return String(iso);
  return d.toLocaleDateString("pt-BR");
}

function statusCell(v) {
  if (v === "ok")  return `<td class="ok">☒</td><td class="nc">☐</td>`;
  if (v === "nc")  return `<td class="ok">☐</td><td class="nc">☒</td>`;
  return `<td class="ok">☐</td><td class="nc">☐</td>`;
}

function linhaItem(nome, params, status) {
  return `
    <tr>
      <td class="item">${esc(nome)}</td>
      <td class="params">${esc(params)}</td>
      ${statusCell(status)}
    </tr>`;
}

function buildHtml(ck, itensCavalo, itensCarreta) {
  const logo = `${window.location.origin}/pontual-logo.png`;
  const geradoEm = new Date().toLocaleString("pt-BR");

  const linhasCavalo = itensCavalo.map(it =>
    linhaItem(it.nome, it.params, ck.itensCavalo?.[it.key] || "")
  ).join("");

  const linhasCarreta = itensCarreta.map(it =>
    linhaItem(it.nome, it.params, ck.itensCarreta?.[it.key] || "")
  ).join("");

  const anotacoes = Array.isArray(ck.ocorrencias) && ck.ocorrencias.length
    ? ck.ocorrencias.map(o => `
        <tr>
          <td class="oc-item">${esc(o.item)}</td>
          <td class="oc-desc">${esc(o.descricao)}</td>
        </tr>`).join("")
    : `<tr><td colspan="2" style="text-align:center;color:#94a3b8;padding:8px">Sem ocorrências registradas</td></tr>`;

  // Fotos: aceita formato novo (objeto por slot) ou legado (array).
  const SLOTS = [
    { key: "frente",    label: "Frente" },
    { key: "traseira",  label: "Traseira" },
    { key: "lateral_e", label: "Lateral Esq." },
    { key: "lateral_d", label: "Lateral Dir." },
    { key: "superior",  label: "Superior" },
    { key: "inferior",  label: "Inferior" },
  ];
  const listaFotos = Array.isArray(ck.fotos)
    ? ck.fotos.map(f => ({ url: f.url, label: f.legenda || "" }))
    : SLOTS.filter(s => ck.fotos?.[s.key]?.url).map(s => ({ url: ck.fotos[s.key].url, label: s.label }));

  const fotos = listaFotos.length
    ? `<div class="fotos-grid">
        ${listaFotos.slice(0, 6).map(f => `
          <div class="foto-box">
            <img src="${esc(f.url)}" alt="Foto" />
            ${f.label ? `<div class="foto-legenda">${esc(f.label)}</div>` : ""}
          </div>`).join("")}
      </div>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 8pt; color: #1e293b; padding: 10mm 10mm 8mm 10mm; }
  .header { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid #1a3a5c; padding-bottom: 5px; margin-bottom: 6px; }
  .header img { height: 28px; }
  .header .title { flex: 1; }
  .header h1 { font-size: 12pt; color: #1a3a5c; line-height: 1.1; }
  .header .sub { font-size: 7pt; color: #64748b; }
  .empresa { font-size: 7pt; color: #64748b; margin-bottom: 6px; }
  .info-box { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px 8px; margin-bottom: 6px; font-size: 7.5pt; }
  .info-box .lbl { font-weight: 700; color: #475569; }
  .secao-title { background: #1a3a5c; color: #fff; padding: 3px 6px; font-weight: 700; font-size: 8pt; margin-top: 5px; border-radius: 3px 3px 0 0; }
  table.check { width: 100%; border-collapse: collapse; }
  table.check td { border: 1px solid #cbd5e1; padding: 3px 5px; vertical-align: top; font-size: 7pt; }
  table.check td.item { width: 22%; font-weight: 600; color: #1e293b; }
  table.check td.params { width: 62%; color: #475569; line-height: 1.2; }
  table.check td.ok, table.check td.nc { width: 8%; text-align: center; font-size: 11pt; font-weight: 700; }
  table.check td.ok { color: #16a34a; }
  table.check td.nc { color: #dc2626; }
  table.check th { background: #e2e8f0; padding: 2px 5px; font-size: 7pt; text-align: left; }
  .oc-title { background: #1a3a5c; color: #fff; padding: 3px 6px; font-weight: 700; font-size: 8pt; margin-top: 6px; border-radius: 3px 3px 0 0; }
  table.oc { width: 100%; border-collapse: collapse; }
  table.oc td { border: 1px solid #cbd5e1; padding: 3px 5px; font-size: 7pt; }
  table.oc td.oc-item { width: 25%; font-weight: 600; }
  .fotos-title { background: #1a3a5c; color: #fff; padding: 3px 6px; font-weight: 700; font-size: 8pt; margin-top: 6px; border-radius: 3px 3px 0 0; }
  .fotos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 3px 3px; }
  .foto-box { border: 1px solid #e2e8f0; border-radius: 3px; overflow: hidden; background: #f8fafc; }
  .foto-box img { width: 100%; height: 70px; object-fit: cover; display: block; }
  .foto-legenda { font-size: 6.5pt; padding: 2px 3px; color: #1a3a5c; text-align: center; font-weight: 700; background: #eef2ff; }
  .assin { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 12px; }
  .assin .box { border-top: 1px solid #64748b; padding-top: 3px; text-align: center; font-size: 7pt; }
  .assin .box .nome { font-weight: 700; color: #1e293b; }
  .assin .box .cargo { color: #64748b; font-size: 6.5pt; }
  .rodape { position: fixed; bottom: 4mm; left: 10mm; right: 10mm; font-size: 6pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 2px; }
</style>
</head>
<body>
  <div class="header">
    <img src="${logo}" alt="Pontual" onerror="this.style.display='none'" />
    <div class="title">
      <h1>CHECKLIST MENSAL DE MANUTENÇÃO PREVENTIVA</h1>
      <div class="sub">Foco em Desgaste, Prazos e Integridade Estrutural — Caminhão Tanque</div>
    </div>
  </div>
  <div class="empresa">${esc(EMPRESA.razao)} · CNPJ ${esc(EMPRESA.cnpj)} · ${esc(EMPRESA.endereco)}</div>

  <div class="info-box">
    <div><span class="lbl">Mês/Ano Ref:</span> ${esc(ck.mesRef || "—")}</div>
    <div><span class="lbl">Data Inspeção:</span> ${fmtData(ck.dataInspecao)}</div>
    <div><span class="lbl">KM Atual:</span> ${esc(ck.kmAtual != null ? Number(ck.kmAtual).toLocaleString("pt-BR") : "—")}</div>
    <div><span class="lbl">Placa Cavalo:</span> ${esc(ck.placaCavalo)}</div>
    <div><span class="lbl">Placa Carreta:</span> ${esc(ck.placaCarreta)}</div>
    <div><span class="lbl">Responsável:</span> ${esc(ck.responsavel)}</div>
  </div>

  <div class="secao-title">1. CAVALO MECÂNICO (UNIDADE TRATORA)</div>
  <table class="check">
    <tr><th>Item / Componente</th><th>Parâmetros de Inspeção Profunda (Desgaste e Prazos)</th><th>OK</th><th>N/C</th></tr>
    ${linhasCavalo}
  </table>

  <div class="secao-title">2. CARRETA (SEMIRREBOQUE TANQUE)</div>
  <table class="check">
    <tr><th>Item / Componente</th><th>Parâmetros de Inspeção Profunda (Integridade e Segurança)</th><th>OK</th><th>N/C</th></tr>
    ${linhasCarreta}
  </table>

  <div class="oc-title">3. ANOTAÇÕES DE OCORRÊNCIAS E AÇÕES CORRETIVAS</div>
  <table class="oc">
    <tr><th style="background:#e2e8f0;padding:3px 5px;font-size:7pt;text-align:left">Item / Placa</th><th style="background:#e2e8f0;padding:3px 5px;font-size:7pt;text-align:left">Descrição Detalhada / Ação Necessária</th></tr>
    ${anotacoes}
  </table>

  ${fotos ? `<div class="fotos-title">4. FOTOS DA INSPEÇÃO</div>${fotos}` : ""}

  <div class="assin">
    <div class="box">
      <div class="nome">${esc(ck.assinaturaMecanico || "___________________________")}</div>
      <div class="cargo">Assinatura do Mecânico / Inspetor · Responsável Técnico</div>
    </div>
    <div class="box">
      <div class="nome">${esc(ck.assinaturaGestor || "___________________________")}</div>
      <div class="cargo">Assinatura do Gestor de Frota · Aprovação / Liberação do Veículo</div>
    </div>
  </div>

  <div class="rodape">Gerado em ${esc(geradoEm)} · Pontual Logística</div>
</body>
</html>`;
}

export async function exportChecklistMensalPdf(checklist, itensCavalo, itensCarreta) {
  const html = buildHtml(checklist, itensCavalo, itensCarreta);
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  try {
    const html2pdf = (await import("html2pdf.js")).default;
    const filename = `Checklist_${checklist.placaCavalo || "SEM_PLACA"}_${checklist.mesRef || "SEM_REF"}.pdf`.replace(/\s+/g, "_");
    await html2pdf().set({
      margin:      0,
      filename,
      image:       { type: "jpeg", quality: 0.85 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak:   { mode: ["css", "legacy"] },
    }).from(el).save();
  } finally {
    document.body.removeChild(el);
  }
}
