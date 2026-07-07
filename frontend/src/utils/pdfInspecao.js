// Gera PDF A4 portrait de uma Inspeção de Pneus — mimetiza a ficha Nº 1470.

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
  if (!Number.isFinite(v) || v <= 0) return { bg: "#f1f5f9", cor: "#64748b" };
  if (v < 3)  return { bg: "#fee2e2", cor: "#7f1d1d" };
  if (v < 4)  return { bg: "#ffedd5", cor: "#7c2d12" };
  if (v < 6)  return { bg: "#fef3c7", cor: "#78350f" };
  if (v < 15) return { bg: "#fef9c3", cor: "#713f12" };
  return { bg: "#dcfce7", cor: "#14532d" };
}

function tabelaPosicoes(veic, esquemaEixos) {
  // Se tem esquema, usa ele pra estruturar. Senão, lista tudo.
  const linhas = [];
  if (esquemaEixos && esquemaEixos.length) {
    for (const eixo of esquemaEixos) {
      for (const pos of eixo.posicoes) {
        const d = veic.pneus?.[pos] || {};
        linhas.push({ eixo: eixo.nome, posicao: pos, ...d });
      }
    }
  } else {
    for (const [pos, d] of Object.entries(veic.pneus || {})) {
      linhas.push({ eixo: "—", posicao: pos, ...d });
    }
  }

  const rows = linhas.map(l => {
    const s = corSulco(l.sulco);
    return `<tr>
      <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:9px; color:#64748b;">${esc(l.eixo)}</td>
      <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:10px; font-weight:800; color:#1a3a5c; text-align:center;">${esc(l.posicao)}</td>
      <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:10px; font-weight:700; text-align:center; color:#1a3a5c;">${esc(l.fogo || "—")}</td>
      <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:10px; text-align:center;">${esc(l.psi || "—")}</td>
      <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:10px; text-align:center; background:${s.bg}; color:${s.cor}; font-weight:800;">${esc(l.sulco || "—")}${l.sulco ? " mm" : ""}</td>
    </tr>`;
  }).join("");

  const estepeRow = veic.estepe && (veic.estepe.fogo || veic.estepe.sulco) ? `<tr>
    <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:9px; color:#64748b; font-style:italic;">Estepe</td>
    <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:10px; font-weight:800; color:#1a3a5c; text-align:center;">EST</td>
    <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:10px; font-weight:700; text-align:center; color:#1a3a5c;">${esc(veic.estepe.fogo || "—")}</td>
    <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:10px; text-align:center;">${esc(veic.estepe.psi || "—")}</td>
    <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:10px; text-align:center;">${esc(veic.estepe.sulco || "—")}${veic.estepe.sulco ? " mm" : ""}</td>
  </tr>` : "";

  return `
    <table style="width:100%; border-collapse:collapse; margin-top:4px;">
      <thead>
        <tr style="background:#1a3a5c; color:#fff;">
          <th style="border:1px solid #1a3a5c; padding:4px 6px; font-size:9px; text-align:left;">Eixo</th>
          <th style="border:1px solid #1a3a5c; padding:4px 6px; font-size:9px;">Posição</th>
          <th style="border:1px solid #1a3a5c; padding:4px 6px; font-size:9px;">Fogo</th>
          <th style="border:1px solid #1a3a5c; padding:4px 6px; font-size:9px;">PSI</th>
          <th style="border:1px solid #1a3a5c; padding:4px 6px; font-size:9px;">Sulco</th>
        </tr>
      </thead>
      <tbody>${rows}${estepeRow}</tbody>
    </table>
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
      <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:10px; text-align:center; font-weight:700; color:#64748b;">${i+1}</td>
      <td style="border:1px solid #cbd5e1; padding:4px 8px; font-size:10px; font-weight:600;">${esc(item)}</td>
      <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:12px; text-align:center; color:#dc2626; font-weight:900;">${aviso}</td>
      <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:12px; text-align:center; color:#1a3a5c; font-weight:900;">${cell(1)}</td>
      <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:12px; text-align:center; color:#1a3a5c; font-weight:900;">${cell(2)}</td>
      <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:12px; text-align:center; color:#1a3a5c; font-weight:900;">${cell(3)}</td>
      <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:12px; text-align:center; color:#1a3a5c; font-weight:900;">${cell(4)}</td>
    </tr>`;
  }).join("");
  return `
    <table style="width:100%; border-collapse:collapse; margin-top:4px;">
      <thead>
        <tr style="background:#1a3a5c; color:#fff;">
          <th style="border:1px solid #1a3a5c; padding:4px 6px; font-size:9px; width:24px;">#</th>
          <th style="border:1px solid #1a3a5c; padding:4px 8px; font-size:9px; text-align:left;">Item</th>
          <th style="border:1px solid #1a3a5c; padding:4px 6px; font-size:9px; width:40px;">Aviso</th>
          <th style="border:1px solid #1a3a5c; padding:4px 6px; font-size:9px; width:30px;">1º</th>
          <th style="border:1px solid #1a3a5c; padding:4px 6px; font-size:9px; width:30px;">2º</th>
          <th style="border:1px solid #1a3a5c; padding:4px 6px; font-size:9px; width:30px;">3º</th>
          <th style="border:1px solid #1a3a5c; padding:4px 6px; font-size:9px; width:30px;">4º</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="font-size:8px; color:#dc2626; font-style:italic; text-align:right; margin-top:2px; font-weight:700;">Assinale com [X] o Nº do veículo</div>
  `;
}

function quadroVeiculo(veic, esquemasMap) {
  const esquema = esquemasMap[veic.esquemaId];
  const eixos = esquema?.eixos;
  return `
    <div style="border:1.5px solid #1a3a5c; border-radius:5px; overflow:hidden; margin-bottom:8px;">
      <div style="background:#1a3a5c; color:#fff; padding:5px 10px; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.03em;">
          <span style="background:#fff; color:#1a3a5c; padding:1px 8px; border-radius:3px; font-size:9px; margin-right:6px;">${veic.ordem}º</span>
          ${esc(veic.titulo)}
        </div>
        <div style="font-size:10px;">
          <span style="opacity:.8;">Placa:</span> <strong>${esc(veic.placa)}</strong>
        </div>
      </div>
      <div style="padding:6px 10px; background:#f8fafc; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
        <div style="font-size:9px; color:#64748b; font-weight:700; text-transform:uppercase;">Odômetro</div>
        <div style="font-size:11px; font-weight:900; color:#7c2d12;">${esc(veic.odometro != null ? veic.odometro.toLocaleString("pt-BR") + " km" : "—")}</div>
      </div>
      <div style="padding:8px 10px;">
        ${tabelaPosicoes(veic, eixos)}
      </div>
    </div>
  `;
}

function buildHtml(inspecao, esquemasMap) {
  const logo = `${window.location.origin}/pontual-logo.png`;

  const veiculos = (inspecao.veiculos || []).map(v => quadroVeiculo(v, esquemasMap)).join("");

  return `
    <div style="font-family: 'Segoe UI', system-ui, sans-serif; color:#0f172a; padding: 12px 14px; width: 720px; box-sizing: border-box;">
      <!-- CABEÇALHO -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <tr>
          <td style="width:180px; vertical-align:top;">
            <img src="${logo}" alt="Pontual" style="height:56px; display:block;" />
          </td>
          <td style="vertical-align:top; padding-left:14px; border-left:3px solid #1a3a5c;">
            <div style="font-size:13px; font-weight:800; color:#1a3a5c;">${esc(EMPRESA.razao)}</div>
            <div style="font-size:10px; color:#475569; margin-top:2px;">${esc(EMPRESA.endereco)}</div>
            <div style="font-size:10px; color:#475569; margin-top:2px;">Tel: ${esc(EMPRESA.telefone)} · ${esc(EMPRESA.email)}</div>
          </td>
          <td style="width:100px; text-align:center; vertical-align:middle;">
            <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:700;">Nº</div>
            <div style="font-size:22px; font-weight:900; color:#dc2626;">${esc(inspecao.numero)}</div>
          </td>
        </tr>
      </table>

      <!-- TÍTULO -->
      <div style="background:#1a3a5c; color:#fff; padding:8px 14px; border-radius:5px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div style="font-size:13px; font-weight:800; letter-spacing:0.02em;">FICHA DE MOVIMENTAÇÃO DE PNEUS</div>
        <div style="font-size:10px; opacity:.9;">${esc(fmtDate(inspecao.data))} · ${esc(inspecao.horaInicio || "—")} → ${esc(inspecao.horaFinal || "—")}</div>
      </div>

      <!-- SUPERVISOR / MOTORISTA -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:10px;">
        <tr>
          <td style="width:50%; border:1px solid #cbd5e1; padding:6px 10px;">
            <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:700;">Supervisor de Manutenção</div>
            <div style="font-size:11px; font-weight:700; color:#0f172a; margin-top:2px;">${esc(inspecao.supervisor?.nome || "—")}</div>
          </td>
          <td style="width:50%; border:1px solid #cbd5e1; padding:6px 10px;">
            <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:700;">Motorista</div>
            <div style="font-size:11px; font-weight:700; color:#0f172a; margin-top:2px;">${esc(inspecao.motorista?.nome || "—")}</div>
          </td>
        </tr>
      </table>

      <!-- CHECKLIST -->
      <div style="margin-bottom:10px;">
        <div style="background:#f1f5f9; padding:5px 10px; font-size:10px; font-weight:800; color:#1a3a5c; text-transform:uppercase; letter-spacing:0.04em; border:1px solid #cbd5e1; border-bottom:none;">Itens a verificar</div>
        ${checklistTabela(inspecao.checklist)}
      </div>

      <!-- OBSERVAÇÕES -->
      ${inspecao.observacoes ? `
      <div style="margin-bottom:10px;">
        <div style="background:#f1f5f9; padding:5px 10px; font-size:10px; font-weight:800; color:#1a3a5c; text-transform:uppercase; letter-spacing:0.04em; border:1px solid #cbd5e1; border-bottom:none;">Observações</div>
        <div style="padding:8px 10px; border:1px solid #cbd5e1; font-size:10px; color:#334155; min-height:32px; line-height:1.4;">${esc(inspecao.observacoes)}</div>
      </div>
      ` : ""}

      <!-- QUADROS DE VEÍCULOS -->
      ${veiculos}

      <!-- RESPOSTA VEÍCULO EM ORDEM -->
      <div style="border:2px solid #1a3a5c; border-radius:5px; padding:8px 14px; margin-top:10px; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
        <div style="font-size:11px; font-weight:800; color:#1a3a5c;">O veículo está em ordem para seguir viagem?</div>
        <div style="display:flex; gap:16px;">
          <div style="display:inline-flex; align-items:center; gap:6px;">
            <span style="width:16px; height:16px; border:2px solid #22c55e; border-radius:3px; display:inline-flex; align-items:center; justify-content:center; background:${inspecao.respostaOrdem === "sim" ? "#22c55e" : "#fff"}; color:#fff; font-weight:900; font-size:11px;">${inspecao.respostaOrdem === "sim" ? "✓" : ""}</span>
            <span style="font-size:11px; font-weight:800; color:${inspecao.respostaOrdem === "sim" ? "#14532d" : "#64748b"};">SIM</span>
          </div>
          <div style="display:inline-flex; align-items:center; gap:6px;">
            <span style="width:16px; height:16px; border:2px solid #dc2626; border-radius:3px; display:inline-flex; align-items:center; justify-content:center; background:${inspecao.respostaOrdem === "nao" ? "#dc2626" : "#fff"}; color:#fff; font-weight:900; font-size:11px;">${inspecao.respostaOrdem === "nao" ? "✗" : ""}</span>
            <span style="font-size:11px; font-weight:800; color:${inspecao.respostaOrdem === "nao" ? "#7f1d1d" : "#64748b"};">NÃO</span>
          </div>
        </div>
      </div>

      <!-- ASSINATURAS -->
      <table style="width:100%; border-collapse:collapse; margin-top:60px;">
        <tr>
          <td style="width:50%; padding:0 20px; text-align:center;">
            <div style="border-top:1px solid #64748b; padding-top:5px; font-size:9px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">Supervisor de Manutenção</div>
            <div style="font-size:10px; font-weight:700; color:#0f172a; margin-top:1px;">${esc(inspecao.supervisor?.nome || "—")}</div>
          </td>
          <td style="width:50%; padding:0 20px; text-align:center;">
            <div style="border-top:1px solid #64748b; padding-top:5px; font-size:9px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">Motorista</div>
            <div style="font-size:10px; font-weight:700; color:#0f172a; margin-top:1px;">${esc(inspecao.motorista?.nome || "—")}</div>
          </td>
        </tr>
      </table>

      <!-- RODAPÉ -->
      <div style="margin-top:20px; padding-top:6px; border-top:1px solid #e2e8f0; font-size:8px; color:#94a3b8; display:flex; justify-content:space-between;">
        <span>Gerado em ${esc(fmtDT(new Date().toISOString()))} · Sistema Pontual Logística</span>
        <span>Ficha nº ${esc(inspecao.numero)}</span>
      </div>
    </div>
  `;
}

async function gerarBase(inspecao, esquemasMap) {
  const html = buildHtml(inspecao, esquemasMap);
  const wrap = document.createElement("div");
  wrap.style.position = "fixed";
  wrap.style.left = "-10000px";
  wrap.style.top  = "0";
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  const { default: html2pdf } = await import("html2pdf.js");
  const cfg = {
    filename: `Ficha-Pneus-${inspecao.numero || "sem-numero"}.pdf`,
    margin: [12, 10, 12, 10],
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 720 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };
  return { html2pdf, cfg, wrap };
}

export async function baixarPdfInspecao(inspecao, esquemasMap) {
  const { html2pdf, cfg, wrap } = await gerarBase(inspecao, esquemasMap);
  try { await html2pdf().set(cfg).from(wrap.firstElementChild).save(); }
  finally { wrap.remove(); }
}

export async function visualizarPdfInspecao(inspecao, esquemasMap) {
  const { html2pdf, cfg, wrap } = await gerarBase(inspecao, esquemasMap);
  try {
    const blob = await html2pdf().set(cfg).from(wrap.firstElementChild).outputPdf("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      const a = document.createElement("a"); a.href = url; a.download = cfg.filename; a.click();
      alert("Popup bloqueado — o PDF foi baixado.");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } finally { wrap.remove(); }
}
