// Exporta jornada como PDF (landscape A4) usando html2pdf.js
// Renderiza um HTML offscreen, gera o PDF e descarta o nó.

// SASCAR retorna timestamps em BRT (horário local Brasília), não UTC.
// Confirmado em 2026-05-19 com Wesley olhando hora real do login do motorista no tablet.
function fmtDataBR(iso) {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return iso;
  return m[4] ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : `${m[3]}/${m[2]}/${m[1]}`;
}

import { capitalizarNome } from "./format";

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function rowsHtml(linhas, ehPeriodo) {
  return linhas.map(j => {
    const placas = j.placas.map(p => `<span style="background:#e0f2fe;color:#075985;padding:1px 4px;border-radius:3px;margin-right:2px;font-size:9px;font-family:monospace">${escapeHtml(p)}</span>`).join("");
    const danger = () => `color:#dc2626;font-weight:700`;
    const warn   = () => `color:#ea580c;font-weight:700`;
    const ok     = () => `color:#0f172a;font-weight:600`;
    const dim    = () => `color:#94a3b8`;
    const totalSt = !ehPeriodo && j.totalAtivoMin > 10*60 ? danger() : (!ehPeriodo && j.totalAtivoMin > 8*60 ? warn() : ok());
    const refSt   = !ehPeriodo && j.refeicaoMin > 0 && j.refeicaoMin < 60 ? danger() : (j.refeicaoMin > 0 ? ok() : dim());
    const ex50St  = j.extra50Min > 0 ? warn() : dim();
    const ex100St = j.extra100Min > 0 ? danger() : dim();
    const inf = j.infracoes.length === 0
      ? `<span style="background:#dcfce7;color:#166534;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700">OK</span>`
      : `<span style="background:#fee2e2;color:#991b1b;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700">⚠ ${j.infracoes.length}</span>`;
    const bg = j.temInfracao ? "background:#fef2f2;" : "";

    if (ehPeriodo) {
      return `<tr style="${bg}border-bottom:1px solid #f1f5f9">
        <td style="padding:5px 6px;font-size:10px"><b>${escapeHtml(capitalizarNome(j.nomeMotorista))}</b><br/><span style="color:#64748b;font-size:8px">ID ${j.idMotorista}</span></td>
        <td style="padding:5px 6px">${placas}</td>
        <td style="padding:5px 6px;text-align:center;font-weight:700">${j.dias}</td>
        <td style="padding:5px 6px;text-align:center;font-family:monospace;${totalSt}">${j.totalAtivo}</td>
        <td style="padding:5px 6px;text-align:center;font-family:monospace;${ok()}">${j.dirigindo}</td>
        <td style="padding:5px 6px;text-align:center;font-family:monospace;${refSt}">${j.refeicao}</td>
        <td style="padding:5px 6px;text-align:center;font-family:monospace;${ok()}">${j.pausa}</td>
        <td style="padding:5px 6px;text-align:center;font-family:monospace;${ex50St}">${j.extra50}</td>
        <td style="padding:5px 6px;text-align:center;font-family:monospace;${ex100St}">${j.extra100}</td>
        <td style="padding:5px 6px;text-align:center">${inf}</td>
      </tr>`;
    }
    return `<tr style="${bg}border-bottom:1px solid #f1f5f9">
      <td style="padding:5px 6px;font-size:10px"><b>${escapeHtml(capitalizarNome(j.nomeMotorista))}</b><br/><span style="color:#64748b;font-size:8px">ID ${j.idMotorista}</span></td>
      <td style="padding:5px 6px">${placas}</td>
      <td style="padding:5px 6px;font-size:9px;color:#475569;white-space:nowrap">${escapeHtml(fmtDataBR(j.inicio))}</td>
      <td style="padding:5px 6px;font-size:9px;color:#475569;white-space:nowrap">${escapeHtml(fmtDataBR(j.fim))}</td>
      <td style="padding:5px 6px;text-align:center;font-family:monospace;${totalSt}">${j.totalAtivo}</td>
      <td style="padding:5px 6px;text-align:center;font-family:monospace;${ok()}">${j.dirigindo}</td>
      <td style="padding:5px 6px;text-align:center;font-family:monospace;${refSt}">${j.refeicao}</td>
      <td style="padding:5px 6px;text-align:center;font-family:monospace;${ok()}">${j.pausa}</td>
      <td style="padding:5px 6px;text-align:center;font-family:monospace;${ex50St}">${j.extra50}</td>
      <td style="padding:5px 6px;text-align:center;font-family:monospace;${ex100St}">${j.extra100}</td>
      <td style="padding:5px 6px;text-align:center;font-family:monospace;${j.direcaoContinuaMaximaMin > 4*60 ? danger() : ok()}">${j.direcaoContinuaMaxima}</td>
      <td style="padding:5px 6px;text-align:center">${inf}</td>
    </tr>`;
  }).join("");
}

function infracoesHtml(linhas) {
  const comInf = linhas.filter(j => j.temInfracao);
  if (comInf.length === 0) return "";
  return `
    <h3 style="margin:14px 0 6px;color:#991b1b;font-size:11px">Detalhamento das infrações (${comInf.length} motoristas)</h3>
    <table style="width:100%;border-collapse:collapse;font-size:9px">
      <thead style="background:#fef2f2">
        <tr>
          <th style="padding:4px 6px;text-align:left;color:#991b1b">Motorista</th>
          <th style="padding:4px 6px;text-align:left;color:#991b1b">Data</th>
          <th style="padding:4px 6px;text-align:left;color:#991b1b">Infração</th>
          <th style="padding:4px 6px;text-align:left;color:#991b1b">Base legal</th>
          <th style="padding:4px 6px;text-align:left;color:#991b1b">Descrição</th>
        </tr>
      </thead>
      <tbody>
        ${comInf.flatMap(j => j.infracoes.map(i => `
          <tr style="border-bottom:1px solid #fecaca">
            <td style="padding:4px 6px">${escapeHtml(capitalizarNome(j.nomeMotorista))}</td>
            <td style="padding:4px 6px;font-family:monospace">${escapeHtml(fmtDataBR(i.data))}</td>
            <td style="padding:4px 6px"><b>${escapeHtml(i.tipo)}</b></td>
            <td style="padding:4px 6px;font-style:italic">${escapeHtml(i.base)}</td>
            <td style="padding:4px 6px">${escapeHtml(i.descricao)}</td>
          </tr>
        `)).join("")}
      </tbody>
    </table>
  `;
}

export async function exportarJornadaPdf({ linhas, dataInicio, dataFim, ehPeriodo, totais }) {
  const periodoLabel = dataInicio === dataFim
    ? fmtDataBR(dataInicio)
    : `${fmtDataBR(dataInicio)} a ${fmtDataBR(dataFim)}`;

  const cabecaTabela = ehPeriodo
    ? ["Motorista", "Placa(s)", "Dias", "Total", "Dirigindo", "Refeição", "Pausa", "Extra ≤2h", "Extra >2h", "Status"]
    : ["Motorista", "Placa(s)", "Início", "Fim", "Total", "Dirigindo", "Refeição", "Pausa", "Extra ≤2h", "Extra >2h", "Dir. contínua", "Status"];

  const fmtHHmm = m => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;

  const html = `
    <div style="font-family:Arial,sans-serif;padding:0;color:#0f172a">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1d4ed8;padding-bottom:8px;margin-bottom:10px">
        <div>
          <div style="font-size:18px;font-weight:800;color:#1a3a5c">PONTUAL LOGÍSTICA</div>
          <div style="font-size:13px;color:#1d4ed8;font-weight:700;margin-top:2px">Relatório de Jornada &amp; Extras</div>
        </div>
        <div style="text-align:right;font-size:10px;color:#64748b">
          Período: <b style="color:#0f172a">${escapeHtml(periodoLabel)}</b><br/>
          Emitido em: ${new Date().toLocaleString("pt-BR")}<br/>
          ${linhas.length} motorista(s)
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:8px;font-size:10px">
        <div style="background:#dbeafe;border:1px solid #93c5fd;padding:4px 8px;border-radius:4px"><b>${totais?.motoristas ?? linhas.length}</b> motoristas</div>
        <div style="background:#e0f2fe;border:1px solid #7dd3fc;padding:4px 8px;border-radius:4px">Jornada média: <b>${fmtHHmm(totais?.jornadaMedia ?? 0)}</b></div>
        <div style="background:#fff7ed;border:1px solid #fdba74;padding:4px 8px;border-radius:4px"><b>${totais?.comExtra ?? 0}</b> com hora extra</div>
        <div style="background:${totais?.comInfracao > 0 ? '#fee2e2' : '#dcfce7'};border:1px solid ${totais?.comInfracao > 0 ? '#fca5a5' : '#86efac'};padding:4px 8px;border-radius:4px">
          <b>${totais?.comInfracao ?? 0}</b> com infração
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead style="background:#f8fafc;border-bottom:2px solid #cbd5e1">
          <tr>
            ${cabecaTabela.map(h => `<th style="padding:5px 6px;text-align:left;font-size:9px;color:#475569;text-transform:uppercase">${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${rowsHtml(linhas, ehPeriodo)}</tbody>
      </table>

      ${infracoesHtml(linhas)}

      <div style="margin-top:14px;padding:8px;background:#f8fafc;border-left:3px solid #1d4ed8;font-size:8.5px;color:#475569;line-height:1.5">
        <b style="color:#0f172a">Base legal aplicada:</b>
        Regra interna Pontual: jornada 9h30 seg–sex (8h + 1h almoço + 30min pausa); sábado 4h; domingo 100% extra.
        Direção contínua máxima de 4h (regra Pontual, mais restritiva que Lei 13.103 art. 67-C que permite 5h30).
        CLT art. 59 (extras até 2h/dia com adicional 50%) · CLT art. 71 (intervalo mínimo 1h) ·
        Lei 13.103/2015 art. 235-C (jornada do motorista profissional).
        <br/>Eventos coletados do tablet <b>SasMDT</b> via API SasIntegra (SASCAR). Documento gerado automaticamente — confira sempre com folha de ponto.
      </div>
    </div>
  `;

  // Cria nó offscreen
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:1100px;background:#fff;padding:14px";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const { default: html2pdf } = await import("html2pdf.js");
    const sufixo = dataInicio === dataFim ? dataInicio : `${dataInicio}_a_${dataFim}`;
    await html2pdf().set({
      filename: `jornada_${sufixo}.pdf`,
      margin: 8,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    }).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}
