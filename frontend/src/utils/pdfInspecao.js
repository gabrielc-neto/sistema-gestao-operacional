// Gera PDF A4 paisagem da Inspeção de Pneus — visual idêntico à tela.

const EMPRESA = {
  razao:    "PONTUAL BRASIL PETRÓLEO LTDA",
  endereco: "Rua Luiz Franceschi, 666 — Thomaz Coelho, Araucária/PR — CEP 83707-072",
  telefone: "(41) 9 8818-8088",
  email:    "logistica02@pontualpetroleo.com.br",
};

function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return iso; }
}
function fmtDT(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR"); } catch { return iso; }
}
function esc(v) {
  return String(v ?? "—").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
}
function corSulco(mm) {
  const v = Number(mm);
  if (!Number.isFinite(v) || v <= 0) return { bg: "repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 3px, #f1f5f9 3px, #f1f5f9 6px)", cor: "#64748b", border: "#cbd5e1" };
  if (v < 3)  return { bg: "linear-gradient(180deg, #dc2626, #7f1d1d)",  cor: "#fff",    border: "#7f1d1d" };
  if (v < 4)  return { bg: "linear-gradient(180deg, #f97316, #c2410c)",  cor: "#fff",    border: "#9a3412" };
  if (v < 6)  return { bg: "linear-gradient(180deg, #fbbf24, #d97706)",  cor: "#7c2d12", border: "#b45309" };
  if (v < 15) return { bg: "linear-gradient(180deg, #a3e635, #65a30d)",  cor: "#365314", border: "#4d7c0f" };
  return         { bg: "linear-gradient(180deg, #22c55e, #15803d)",  cor: "#fff",    border: "#166534" };
}

// Renderiza 1 pneu (card) com fogo, PSI, sulco em mini
function cardPneu(d = {}) {
  const c = corSulco(d.sulco);
  const fogo  = d.fogo  ? esc(d.fogo)  : "—";
  const psi   = d.psi   ? esc(d.psi)   : "—";
  const sulco = d.sulco ? esc(d.sulco) + "mm" : "—";
  return `<div style="width:38px; height:62px; border-radius:5px; border:1.5px solid ${c.border}; background:${c.bg}; color:${c.cor}; display:flex; flex-direction:column; align-items:center; justify-content:center; font-weight:800; line-height:1.1; gap:2px; overflow:hidden;">
    <div style="font-size:8.5px;">${fogo}</div>
    <div style="font-size:7px; opacity:.9;">${psi}</div>
    <div style="font-size:7px; opacity:.9;">${sulco}</div>
  </div>`;
}

// Renderiza o quadro visual esquemático de 1 veículo
function quadroVisual(veic, esquemasMap) {
  const esquema = esquemasMap[veic.esquemaId];
  if (!esquema) {
    return `
      <div style="border:1.5px solid #1a3a5c; border-radius:6px; overflow:hidden; background:#fff;">
        <div style="background:#f8fafc; padding:6px 10px; display:flex; justify-content:space-between; border-bottom:1.5px solid #1a3a5c;">
          <div style="font-size:9px; font-weight:800; color:#1a3a5c; text-transform:uppercase;"><span style="background:#1a3a5c; color:#fff; padding:1px 8px; border-radius:3px; margin-right:6px;">${veic.ordem}º</span>${esc(veic.titulo)}</div>
          <div style="font-size:9px;"><span style="color:#64748b;">PLACA</span> <strong>${esc(veic.placa)}</strong></div>
        </div>
        <div style="padding:32px; text-align:center; color:#94a3b8; font-size:9px;">Sem carreta atrelada nesta posição</div>
      </div>
    `;
  }
  const linhas = esquema.eixos;
  const eixosHtml = linhas.map(eixo => {
    const meio = Math.floor(eixo.posicoes.length / 2);
    const esq = eixo.posicoes.slice(0, meio);
    const dir = eixo.posicoes.slice(meio);
    const cardsEsq = esq.map(pos => cardPneu(veic.pneus?.[pos] || {})).join('<div style="width:3px;"></div>');
    const cardsDir = dir.map(pos => cardPneu(veic.pneus?.[pos] || {})).join('<div style="width:3px;"></div>');
    return `
      <div style="display:flex; align-items:center; justify-content:center; padding:5px 0; position:relative;">
        <div style="flex:1; display:flex; justify-content:flex-end; align-items:center;">
          <div style="display:flex; align-items:center;">${cardsEsq}</div>
          <div style="width:22px; height:2px; background:#94a3b8;"></div>
          <div style="width:10px; height:10px; border-radius:50%; background:radial-gradient(#64748b, #334155);"></div>
        </div>
        <div style="width:14px;"></div>
        <div style="flex:1; display:flex; justify-content:flex-start; align-items:center;">
          <div style="width:10px; height:10px; border-radius:50%; background:radial-gradient(#64748b, #334155);"></div>
          <div style="width:22px; height:2px; background:#94a3b8;"></div>
          <div style="display:flex; align-items:center;">${cardsDir}</div>
        </div>
      </div>
    `;
  }).join("");

  const estepe = esquema.temEstepe ? `
    <div style="position:absolute; top:36px; right:6px; background:#fff; border:1.5px dashed #94a3b8; border-radius:5px; padding:3px 5px; display:flex; flex-direction:column; align-items:center; gap:1px; z-index:5;">
      <div style="font-size:6px; font-weight:800; color:#64748b; text-transform:uppercase;">Estepe</div>
      ${cardPneu(veic.estepe || {})}
    </div>` : "";

  return `
    <div style="border:1.5px solid #1a3a5c; border-radius:6px; overflow:hidden; background:#fff; height:265px; display:flex; flex-direction:column;">
      <div style="background:#f8fafc; padding:5px 10px; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #1a3a5c;">
        <div style="font-size:9px; font-weight:800; color:#1a3a5c; text-transform:uppercase; letter-spacing:.03em;"><span style="background:#1a3a5c; color:#fff; padding:1px 8px; border-radius:3px; margin-right:6px; font-size:8px;">${veic.ordem}º</span>${esc(veic.titulo)}</div>
        <div style="font-size:9px;"><span style="color:#64748b; font-weight:700;">PLACA</span> <strong style="letter-spacing:.05em;">${esc(veic.placa)}</strong></div>
      </div>
      <div style="padding:4px 8px; background:linear-gradient(90deg, #fff7ed, #fef3c7); border-bottom:1px solid #f59e0b; display:flex; align-items:center; gap:6px;">
        <div style="font-size:8px; font-weight:800; color:#7c2d12; text-transform:uppercase;">Odômetro</div>
        <div style="flex:1; text-align:right; font-size:10px; font-weight:900; color:#7c2d12;">${veic.odometro != null ? veic.odometro.toLocaleString("pt-BR") + " km" : "—"}</div>
      </div>
      <div style="position:relative; background:linear-gradient(180deg, #dbeafe, #eef2f7); padding:8px 10px; flex:1; display:flex; flex-direction:column; justify-content:space-around;">
        <div style="position:absolute; left:50%; top:8px; bottom:8px; width:10px; transform:translateX(-50%); background:linear-gradient(90deg, #cbd5e1, #94a3b8 50%, #cbd5e1); border:1px solid #64748b; border-radius:2px; z-index:0;"></div>
        ${estepe}
        <div style="position:relative; z-index:2; display:flex; flex-direction:column; justify-content:space-around; flex:1;">${eixosHtml}</div>
      </div>
    </div>
  `;
}

function checklistTabela(checklist) {
  const ITENS = [
    "Alinhamento", "Balanceamento", "Calibragem geral",
    "Pneus (conserto, T.C.)", "Reaperto de porcas", "Rodas e aros",
  ];
  const rows = ITENS.map((item, i) => {
    const cell = (n) => checklist?.[`${item}_${n}`] ? "✓" : "";
    const aviso = checklist?.[`${item}_aviso`] ? "✓" : "";
    return `<tr>
      <td style="border:1px solid #cbd5e1; padding:2px 5px; font-size:8px; text-align:center; font-weight:700; color:#64748b;">${i+1}</td>
      <td style="border:1px solid #cbd5e1; padding:2px 6px; font-size:8px; font-weight:600;">${esc(item)}</td>
      <td style="border:1px solid #cbd5e1; padding:2px 4px; font-size:8px; text-align:center; font-weight:800; color:#64748b;">${i+1}</td>
      <td style="border:1px solid #cbd5e1; padding:2px 4px; font-size:10px; text-align:center; color:#dc2626; font-weight:900;">${aviso}</td>
      <td style="border:1px solid #cbd5e1; padding:2px 4px; font-size:10px; text-align:center; color:#1a3a5c; font-weight:900;">${cell(1)}</td>
      <td style="border:1px solid #cbd5e1; padding:2px 4px; font-size:10px; text-align:center; color:#1a3a5c; font-weight:900;">${cell(2)}</td>
      <td style="border:1px solid #cbd5e1; padding:2px 4px; font-size:10px; text-align:center; color:#1a3a5c; font-weight:900;">${cell(3)}</td>
      <td style="border:1px solid #cbd5e1; padding:2px 4px; font-size:10px; text-align:center; color:#1a3a5c; font-weight:900;">${cell(4)}</td>
    </tr>`;
  }).join("");
  return `
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr style="background:#1a3a5c; color:#fff;">
          <th style="border:1px solid #1a3a5c; padding:3px 4px; font-size:8px; width:18px;">#</th>
          <th style="border:1px solid #1a3a5c; padding:3px 6px; font-size:8px; text-align:left;">Item</th>
          <th style="border:1px solid #1a3a5c; padding:3px 4px; font-size:8px; width:36px;">Item Nº</th>
          <th style="border:1px solid #1a3a5c; padding:3px 4px; font-size:8px; width:34px;">Aviso [X]</th>
          <th style="border:1px solid #1a3a5c; padding:3px 4px; font-size:8px; width:24px;">1º</th>
          <th style="border:1px solid #1a3a5c; padding:3px 4px; font-size:8px; width:24px;">2º</th>
          <th style="border:1px solid #1a3a5c; padding:3px 4px; font-size:8px; width:24px;">3º</th>
          <th style="border:1px solid #1a3a5c; padding:3px 4px; font-size:8px; width:24px;">4º</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="font-size:7px; color:#dc2626; font-style:italic; text-align:right; margin-top:2px; font-weight:700;">Assinale com [X] o Nº do veículo</div>
  `;
}

function slotVazio(i) {
  return `
    <div style="border:1.5px solid #1a3a5c; border-radius:6px; overflow:hidden; background:#fff; height:265px; display:flex; flex-direction:column;">
      <div style="background:#f8fafc; padding:5px 10px; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #1a3a5c;">
        <div style="font-size:9px; font-weight:800; color:#1a3a5c; text-transform:uppercase;"><span style="background:#1a3a5c; color:#fff; padding:1px 8px; border-radius:3px; margin-right:6px; font-size:8px;">${i+1}º</span>${i === 0 ? "Cavalo Mecânico" : `${i}ª Carreta`}</div>
        <div style="font-size:9px;"><span style="color:#64748b;">PLACA</span> <strong>—</strong></div>
      </div>
      <div style="flex:1; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:9px; background:repeating-linear-gradient(45deg, #f8fafc, #f8fafc 6px, #fff 6px, #fff 12px);">Sem carreta atrelada nesta posição</div>
    </div>
  `;
}

function buildHtml(inspecao, esquemasMap) {
  const logo = `${window.location.origin}/pontual-logo.png`;
  const veiculos = inspecao.veiculos || [];
  const slots = [0, 1, 2, 3].map(i => veiculos[i] || null);

  // Legenda de cores dos sulcos
  const legenda = `
    <div style="display:flex; gap:8px; margin:6px 0 0; font-size:7px; align-items:center; flex-wrap:wrap;">
      <span style="font-weight:700; color:#64748b;">SULCOS:</span>
      <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:10px; height:10px; background:linear-gradient(180deg, #22c55e, #15803d); border-radius:2px;"></span>Novo (≥15mm)</span>
      <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:10px; height:10px; background:linear-gradient(180deg, #a3e635, #65a30d); border-radius:2px;"></span>Bom (6-14)</span>
      <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:10px; height:10px; background:linear-gradient(180deg, #fbbf24, #d97706); border-radius:2px;"></span>Alerta (4-5)</span>
      <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:10px; height:10px; background:linear-gradient(180deg, #f97316, #c2410c); border-radius:2px;"></span>Crítico (3)</span>
      <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:10px; height:10px; background:linear-gradient(180deg, #dc2626, #7f1d1d); border-radius:2px;"></span>Trocar (&lt;3)</span>
    </div>
  `;

  const cell = (i) => slots[i] ? quadroVisual(slots[i], esquemasMap) : slotVazio(i);

  return `
    <div style="font-family: 'Segoe UI', system-ui, sans-serif; color:#0f172a; padding: 6px 10px; width: 1120px; height: 792px; box-sizing: border-box; background:#fff; overflow: hidden;">
      <!-- CABEÇALHO SUPER COMPACTO (uma linha) -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
        <tr>
          <td style="width:100px; vertical-align:middle;">
            <img src="${logo}" alt="Pontual" style="height:30px; display:block;" />
          </td>
          <td style="vertical-align:middle; padding-left:8px; border-left:3px solid #1a3a5c;">
            <div style="font-size:10px; font-weight:800; color:#1a3a5c;">${esc(EMPRESA.razao)} — Ficha de Movimentação de Pneus</div>
            <div style="font-size:7px; color:#475569;">${esc(EMPRESA.endereco)} · Tel: ${esc(EMPRESA.telefone)}</div>
          </td>
          <td style="width:50px; text-align:center; vertical-align:middle;">
            <div style="font-size:6px; color:#64748b; text-transform:uppercase; font-weight:700;">Nº</div>
            <div style="font-size:18px; font-weight:900; color:#dc2626; line-height:1;">${esc(inspecao.numero)}</div>
          </td>
        </tr>
      </table>

      <!-- DADOS + CHECKLIST + OBS em 3 colunas -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:5px;">
        <tr>
          <td style="width:32%; vertical-align:top; padding-right:4px;">
            <table style="width:100%; border-collapse:collapse;">
              <tr><td style="border:1px solid #cbd5e1; padding:2px 6px; width:60px;"><div style="font-size:6px; color:#64748b; font-weight:700; text-transform:uppercase;">Data</div></td><td style="border:1px solid #cbd5e1; padding:2px 6px;"><div style="font-size:9px; font-weight:700;">${esc(fmtDate(inspecao.data))}</div></td><td style="border:1px solid #cbd5e1; padding:2px 6px; width:52px;"><div style="font-size:6px; color:#64748b; font-weight:700; text-transform:uppercase;">Hora Ini</div></td><td style="border:1px solid #cbd5e1; padding:2px 6px;"><div style="font-size:9px; font-weight:700;">${esc(inspecao.horaInicio || "—")}</div></td></tr>
              <tr><td style="border:1px solid #cbd5e1; padding:2px 6px;"><div style="font-size:6px; color:#64748b; font-weight:700; text-transform:uppercase;">Hora Fin</div></td><td style="border:1px solid #cbd5e1; padding:2px 6px;"><div style="font-size:9px; font-weight:700;">${esc(inspecao.horaFinal || "—")}</div></td><td style="border:1px solid #cbd5e1; padding:2px 6px;"><div style="font-size:6px; color:#64748b; font-weight:700; text-transform:uppercase;">Cavalo</div></td><td style="border:1px solid #cbd5e1; padding:2px 6px;"><div style="font-size:9px; font-weight:700;">${esc(slots[0]?.placa || "—")}</div></td></tr>
              <tr><td style="border:1px solid #cbd5e1; padding:2px 6px;"><div style="font-size:6px; color:#64748b; font-weight:700; text-transform:uppercase;">Superv.</div></td><td style="border:1px solid #cbd5e1; padding:2px 6px;" colspan="3"><div style="font-size:9px; font-weight:700;">${esc(inspecao.supervisor?.nome || "—")}</div></td></tr>
              <tr><td style="border:1px solid #cbd5e1; padding:2px 6px;"><div style="font-size:6px; color:#64748b; font-weight:700; text-transform:uppercase;">Motorista</div></td><td style="border:1px solid #cbd5e1; padding:2px 6px;" colspan="3"><div style="font-size:9px; font-weight:700;">${esc(inspecao.motorista?.nome || "—")}</div></td></tr>
            </table>
            <div style="margin-top:4px; background:#f1f5f9; padding:2px 6px; font-size:7px; font-weight:800; color:#1a3a5c; text-transform:uppercase; border:1px solid #cbd5e1; border-bottom:none; text-align:center;">Observações</div>
            <div style="padding:4px 6px; border:1px solid #cbd5e1; font-size:8px; color:#334155; min-height:38px; line-height:1.3; background:#fff;">${esc(inspecao.observacoes || "—")}</div>
          </td>
          <td style="vertical-align:top; padding-left:4px;">
            <div style="background:#f1f5f9; padding:2px 6px; font-size:7px; font-weight:800; color:#1a3a5c; text-transform:uppercase; border:1px solid #cbd5e1; border-bottom:none; text-align:center;">Itens a verificar</div>
            ${checklistTabela(inspecao.checklist)}
          </td>
        </tr>
      </table>

      ${legenda}

      <!-- GRID 2x2 DOS 4 VEÍCULOS -->
      <table style="width:100%; border-collapse:separate; border-spacing:4px 4px; margin-top:4px; table-layout:fixed;">
        <tr>
          <td style="width:50%; vertical-align:top;">${cell(0)}</td>
          <td style="width:50%; vertical-align:top;">${cell(1)}</td>
        </tr>
        <tr>
          <td style="width:50%; vertical-align:top;">${cell(2)}</td>
          <td style="width:50%; vertical-align:top;">${cell(3)}</td>
        </tr>
      </table>

      <!-- ASSINATURA -->
      <table style="width:100%; border-collapse:collapse; margin-top:10px;">
        <tr>
          <td style="width:60%;"></td>
          <td style="width:40%; text-align:center;">
            <div style="border-top:1px solid #64748b; padding-top:2px; font-size:7px; color:#64748b; font-weight:700; text-transform:uppercase;">Supervisor de Manutenção</div>
            <div style="font-size:8px; font-weight:700; color:#0f172a;">${esc(inspecao.supervisor?.nome || "—")}</div>
          </td>
        </tr>
      </table>

      <!-- RODAPÉ -->
      <div style="margin-top:4px; padding-top:3px; border-top:1px solid #e2e8f0; font-size:6px; color:#94a3b8; display:flex; justify-content:space-between;">
        <span>Gerado em ${esc(fmtDT(new Date().toISOString()))} · Sistema Pontual Logística</span>
        <span>Ficha nº ${esc(inspecao.numero)}</span>
      </div>
    </div>
  `;
}

// Gera um PDF de UMA página A4 paisagem — renderiza HTML em canvas único
// e insere a imagem inteira na página, forçando "1 página exata".
async function gerarPdfBlob(inspecao, esquemasMap) {
  const html = buildHtml(inspecao, esquemasMap);
  const wrap = document.createElement("div");
  wrap.style.position = "fixed";
  wrap.style.left = "-10000px";
  wrap.style.top  = "0";
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(wrap.firstElementChild, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: 1120,
      windowHeight: 792,
    });
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape", compress: true });
    const pageW = pdf.internal.pageSize.getWidth();   // 297
    const pageH = pdf.internal.pageSize.getHeight();  // 210
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    // Preenche a página inteira — o container HTML já está com aspect ratio A4L.
    pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
    return pdf.output("blob");
  } finally {
    wrap.remove();
  }
}

export async function baixarPdfInspecao(inspecao, esquemasMap) {
  const blob = await gerarPdfBlob(inspecao, esquemasMap);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Ficha-Pneus-${inspecao.numero || "sem-numero"}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function visualizarPdfInspecao(inspecao, esquemasMap) {
  const blob = await gerarPdfBlob(inspecao, esquemasMap);
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ficha-Pneus-${inspecao.numero || "sem-numero"}.pdf`;
    a.click();
    alert("Popup bloqueado — o PDF foi baixado.");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
