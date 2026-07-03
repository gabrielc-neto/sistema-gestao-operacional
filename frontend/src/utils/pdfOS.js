// Gera PDF A4 portrait da Ordem de Serviço pra enviar ao motorista.
// Padrão consistente com utils/exportJornadaPdf.js (html2pdf.js + import dinâmico).

const EMPRESA = {
  razao:     "PONTUAL BRASIL PETRÓLEO LTDA",
  cnpj:      "02.886.685/0001-40",
  ie:        "90.179.833-82",
  endereco:  "Rua Luiz Franceschi, 666 — Thomaz Coelho, Araucária/PR — CEP 83707-072",
  telefone:  "(41) 9 8818-8088",
  email:     "logistica02@pontualpetroleo.com.br",
};

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return String(iso);
  return d.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

function esc(v) {
  return String(v ?? "—").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
}

function buildHtml(os) {
  const logo = `${window.location.origin}/pontual-logo.png`;
  const geradoEm = new Date().toLocaleString("pt-BR");
  const motorista = os.motoristaNome || "—";
  const veiculo   = os.placa || "—";
  const tipo      = os.tipoServico || "—";
  const numero    = os.numero || "—";
  const abertura  = fmtDateTime(os.dataHora);
  const km        = os.hodometro != null && os.hodometro !== "" ? Number(os.hodometro).toLocaleString("pt-BR") + " km" : "—";
  const obs       = os.obs || "";

  return `
    <div style="font-family: 'Segoe UI', system-ui, sans-serif; color:#0f172a; padding: 12px 14px; width: 720px; box-sizing: border-box;">
      <!-- CABEÇALHO -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <tr>
          <td style="width:180px; vertical-align:top;">
            <img src="${logo}" alt="Pontual" style="height:64px; display:block;" />
          </td>
          <td style="vertical-align:top; padding-left:16px; border-left:3px solid #1a3a5c;">
            <div style="font-size:13px; font-weight:800; color:#1a3a5c; letter-spacing:0.01em;">${esc(EMPRESA.razao)}</div>
            <div style="font-size:11px; color:#475569; margin-top:2px;">${esc(EMPRESA.endereco)}</div>
            <div style="font-size:11px; color:#475569; margin-top:2px;">Tel: ${esc(EMPRESA.telefone)} · ${esc(EMPRESA.email)}</div>
          </td>
        </tr>
      </table>

      <!-- TÍTULO -->
      <div style="background:#1a3a5c; color:#fff; padding:10px 16px; border-radius:6px; display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <div style="font-size:15px; font-weight:800; letter-spacing:0.02em;">ORDEM DE SERVIÇO Nº ${esc(numero)}</div>
        <div style="font-size:11px; opacity:0.9;">Abertura: ${esc(abertura)}</div>
      </div>

      <!-- BLOCO VEÍCULO -->
      <div style="border:1px solid #cbd5e1; border-radius:6px; margin-bottom:12px; overflow:hidden;">
        <div style="background:#f1f5f9; padding:6px 12px; font-size:11px; font-weight:800; color:#1a3a5c; text-transform:uppercase; letter-spacing:0.04em; border-bottom:1px solid #cbd5e1;">Veículo</div>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <tr>
            <td style="padding:8px 12px; width:33%; border-right:1px solid #e2e8f0;">
              <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:700;">Placa</div>
              <div style="font-size:15px; font-weight:800; color:#0f172a; margin-top:2px;">${esc(veiculo)}</div>
            </td>
            <td style="padding:8px 12px; width:33%; border-right:1px solid #e2e8f0;">
              <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:700;">Motorista</div>
              <div style="font-size:12px; font-weight:700; margin-top:2px;">${esc(motorista)}</div>
            </td>
            <td style="padding:8px 12px;">
              <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:700;">Hodômetro (entrada)</div>
              <div style="font-size:12px; font-weight:700; margin-top:2px;">${esc(km)}</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- BLOCO SERVIÇO -->
      <div style="border:1px solid #cbd5e1; border-radius:6px; margin-bottom:12px; overflow:hidden;">
        <div style="background:#f1f5f9; padding:6px 12px; font-size:11px; font-weight:800; color:#1a3a5c; text-transform:uppercase; letter-spacing:0.04em; border-bottom:1px solid #cbd5e1;">Serviço solicitado</div>
        <div style="padding:12px;">
          <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:700; margin-bottom:4px;">Tipo</div>
          <div style="font-size:13px; font-weight:700; margin-bottom:10px;">${esc(tipo)}</div>

          <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:700; margin-bottom:4px;">Observações / instruções</div>
          <div style="min-height:60px; font-size:12px; line-height:1.45; padding:6px 8px; border:1px dashed #cbd5e1; border-radius:4px; white-space:pre-wrap;">${esc(obs || "—")}</div>
        </div>
      </div>

      <!-- INSTRUÇÕES -->
      <div style="border:1px solid #fbbf24; background:#fffbeb; border-radius:6px; padding:10px 14px; margin-bottom:16px;">
        <div style="font-size:11px; font-weight:800; color:#78350f; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px;">Orientações ao motorista</div>
        <div style="font-size:11px; color:#78350f; line-height:1.5;">
          Apresentar este documento na oficina. Não iniciar a viagem antes da conclusão do serviço. Comunicar imediatamente qualquer intercorrência ao responsável pela manutenção.
        </div>
      </div>

      <!-- ASSINATURAS -->
      <table style="width:100%; border-collapse:collapse; margin-top:72px;">
        <tr>
          <td style="width:50%; padding:0 14px; text-align:center;">
            <div style="border-top:1px solid #64748b; padding-top:6px; font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">Motorista</div>
            <div style="font-size:12px; font-weight:700; color:#0f172a; margin-top:2px;">${esc(motorista)}</div>
          </td>
          <td style="width:50%; padding:0 14px; text-align:center;">
            <div style="border-top:1px solid #64748b; padding-top:6px; font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">Oficina / Responsável Técnico</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Nome / carimbo</div>
          </td>
        </tr>
      </table>

      <!-- RODAPÉ -->
      <div style="margin-top:28px; padding-top:8px; border-top:1px solid #e2e8f0; font-size:9px; color:#94a3b8; display:flex; justify-content:space-between;">
        <span>Gerado em ${esc(geradoEm)} · Sistema Pontual Logística</span>
        <span>OS ${esc(numero)}</span>
      </div>
    </div>
  `;
}

function buildPipeline(wrap, os) {
  // Config compartilhada entre baixar e visualizar.
  return {
    filename: `OS-${os.numero || "sem-numero"}.pdf`,
    margin: [12, 10, 12, 10],
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 720 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    source: wrap.firstElementChild,
  };
}

function mountOffscreen(html) {
  const wrap = document.createElement("div");
  wrap.style.position = "fixed";
  wrap.style.left = "-10000px";
  wrap.style.top  = "0";
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap;
}

export async function gerarPdfOS(os) {
  const wrap = mountOffscreen(buildHtml(os));
  try {
    const { default: html2pdf } = await import("html2pdf.js");
    const cfg = buildPipeline(wrap, os);
    await html2pdf().set(cfg).from(cfg.source).save();
  } finally {
    wrap.remove();
  }
}

// Abre o PDF em nova aba com o visualizador nativo do browser (com botões
// de imprimir e baixar já embutidos). Não força download.
export async function visualizarPdfOS(os) {
  const wrap = mountOffscreen(buildHtml(os));
  try {
    const { default: html2pdf } = await import("html2pdf.js");
    const cfg = buildPipeline(wrap, os);
    const blob = await html2pdf().set(cfg).from(cfg.source).outputPdf("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      // Popup bloqueado — cai no download como fallback e avisa
      const a = document.createElement("a");
      a.href = url;
      a.download = cfg.filename;
      a.click();
      alert("O navegador bloqueou a nova aba. Liberei o download do PDF.");
    }
    // Libera o blob após 1min (tempo do browser terminar de ler)
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } finally {
    wrap.remove();
  }
}
