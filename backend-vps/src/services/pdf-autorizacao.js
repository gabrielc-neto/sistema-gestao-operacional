// Gera PDF "AUTORIZACAO DE CARREGAMENTO" da Pontual.
// Layout replicado do modelo em papel usado hoje (screenshot Wesley 2026-08-05).
//
// Numero autorizacao = <numero_contrato>-<seq_dentro_do_contrato>
//   ex: 100724-1 (primeira retirada), 100724-2 (segunda), etc.
//
// Uso:
//   import { gerarPdfAutorizacao } from "../services/pdf-autorizacao.js";
//   const buffer = await gerarPdfAutorizacao(dados);
//   res.setHeader("Content-Type", "application/pdf");
//   res.setHeader("Content-Disposition", `attachment; filename="autorizacao-${dados.nAutorizacao}.pdf"`);
//   res.send(buffer);

import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, "..", "..", "assets", "logo-pontual.png");

const NAVY   = "#18216E";
const AMARELO_BG = "#FFF8DC";
const BORDER = "#000000";

function fmtData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}
function fmtL(n) {
  if (n == null) return "";
  return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " LITROS";
}

export async function gerarPdfAutorizacao(dados) {
  // dados esperados:
  //  dataCarregamento, nAutorizacao (ex "100724-1"), numeroContrato (ex "100724"),
  //  usinaNome,
  //  motoristaNome, motoristaCpf, motoristaCnh,
  //  placaCavalo, placaCarreta1, placaCarreta2,
  //  produto (ex "ETANOL_ANIDRO"),
  //  capacidadeLitros
  //  responsavelNome (padrao "Rosilda de Lima Ramos")

  const doc = new PDFDocument({ size: "A4", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: true });
  const chunks = [];
  doc.on("data", c => chunks.push(c));
  const done = new Promise(resolve => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const x0 = doc.page.margins.left;
  let y = doc.page.margins.top;

  // ===================== BORDA GERAL =====================
  const boxTop = y;

  // ===== LINHA 1: LOGO + TITULO =====
  // Logo maior (Pontual usa como marca forte no topo do documento)
  const linhaAltura = 85;
  const logoW = 190;
  try {
    doc.image(LOGO_PATH, x0 + 8, y + 6, { fit: [logoW - 16, linhaAltura - 12] });
  } catch { /* segue sem logo */ }
  // Titulo Empresa + subtitulo
  const tituloX = x0 + logoW;
  const tituloW = pageW - logoW;
  doc.font("Helvetica-BoldOblique").fontSize(17).fillColor("black")
     .text("PONTUAL BRASIL PETROLEO LTDA", tituloX + 10, y + 25, { width: tituloW - 20, align: "center" });
  doc.font("Helvetica-Oblique").fontSize(12)
     .text("AUTORIZAÇÃO DE CARREGAMENTO", tituloX + 10, y + 48, { width: tituloW - 20, align: "center" });
  y += linhaAltura;

  // ======== helper de celula ========
  function cell(text, x, yy, w, h, opts = {}) {
    const {
      bold = false, italic = false, size = 9,
      align = "left", valign = "center",
      fill = null, borderColor = BORDER,
    } = opts;
    if (fill) doc.rect(x, yy, w, h).fill(fill);
    doc.lineWidth(0.7).strokeColor(borderColor).rect(x, yy, w, h).stroke();
    const font = bold && italic ? "Helvetica-BoldOblique"
               : bold ? "Helvetica-Bold"
               : italic ? "Helvetica-Oblique" : "Helvetica";
    doc.font(font).fontSize(size).fillColor("black");
    const textH = doc.heightOfString(text ?? "", { width: w - 8 });
    const textY = valign === "center" ? yy + (h - textH) / 2 : yy + 3;
    doc.text(text ?? "", x + 4, textY, { width: w - 8, align });
  }

  // ======== Bloco de linhas (rotulo + valor) ========
  function linhaDados(cols, altura) {
    let cx = x0;
    for (const c of cols) {
      cell(c.text, cx, y, c.w, altura, c.opts || {});
      cx += c.w;
    }
    y += altura;
  }

  // === Linha 2: Data | valor | Nº Autorizacao | valor
  // Larguras ajustadas: cw4 aumentado pra caber "101553-1" numa linha so
  const cw1 = 130, cw2 = 190, cw3 = 105, cw4 = pageW - cw1 - cw2 - cw3;
  linhaDados([
    { text: "Data Carregamento", w: cw1, opts: { bold: true, italic: true, size: 9, align: "center" } },
    { text: fmtData(dados.dataCarregamento), w: cw2, opts: { italic: true, size: 10, align: "center" } },
    { text: "Nº Autorização:", w: cw3, opts: { bold: true, italic: true, size: 9, align: "left" } },
    { text: dados.nAutorizacao || "", w: cw4, opts: { italic: true, bold: true, size: 10, align: "left" } },
  ], 26);

  // === Linha 3: Usina | valor | Nº Autorizacao (contrato)
  // Prefere nome fantasia (mais curto). Reduz fonte se razao social > 25 chars pra nao transbordar.
  const nomeUsinaExibicao = (dados.usinaNomeFantasia || dados.usinaNome || "").toUpperCase();
  const tamUsina = nomeUsinaExibicao.length > 40 ? 8
                 : nomeUsinaExibicao.length > 25 ? 10
                 : 12;
  linhaDados([
    { text: "Usina:", w: cw1, opts: { bold: true, italic: true, size: 12, align: "center" } },
    { text: nomeUsinaExibicao, w: cw2, opts: { bold: true, italic: true, size: tamUsina, align: "center" } },
    { text: "Nº Autorização:", w: cw3, opts: { italic: true, size: 9 } },
    { text: dados.numeroContrato || "", w: cw4, opts: { italic: true, bold: true, size: 10 } },
  ], 34);

  // === Linha 4: Transportador
  linhaDados([
    { text: "Transportador", w: cw1, opts: { bold: true, italic: true, size: 10 } },
    { text: "PONTUAL BRASIL PETROLEO LTDA", w: cw2, opts: { italic: true, size: 10, align: "center" } },
    { text: "CNPJ: 02.886.685/0001-40", w: cw3 + cw4, opts: { bold: true, italic: true, size: 10 } },
  ], 24);

  // === Linha 5: Remetente
  linhaDados([
    { text: "Remetente", w: cw1, opts: { bold: true, italic: true, size: 10 } },
    { text: "PONTUAL BRASIL PETROLEO LTDA", w: cw2, opts: { italic: true, size: 10, align: "center" } },
    { text: "CNPJ: 02.886.685/0001-40", w: cw3 + cw4, opts: { bold: true, italic: true, size: 10 } },
  ], 24);

  // === Linha 6: Motorista | Nome | CPF | CNH (fundo amarelo)
  // Redistribuido pra CPF/CNH nao quebrarem linha
  const mw1 = 100, mw2 = 195, mw3 = 115, mw4 = pageW - mw1 - mw2 - mw3;
  linhaDados([
    { text: "Motorista:", w: mw1, opts: { bold: true, italic: true, size: 11, fill: AMARELO_BG, align: "center" } },
    { text: (dados.motoristaNome || "").toUpperCase(), w: mw2, opts: { italic: true, bold: true, size: 10, fill: AMARELO_BG, align: "center" } },
    { text: dados.motoristaCpf ? `CPF: ${dados.motoristaCpf}` : "CPF:", w: mw3, opts: { bold: true, italic: true, size: 10, fill: AMARELO_BG } },
    { text: dados.motoristaCnh ? `CNH: ${dados.motoristaCnh}` : "CNH:", w: mw4, opts: { bold: true, italic: true, size: 10, fill: AMARELO_BG } },
  ], 26);

  // === Linha 7: Placas — Cavalo | Carreta1 | Carreta2
  const pw = pageW / 3;
  linhaDados([
    { text: `Placa Cavalo: ${dados.placaCavalo || ""}`, w: pw, opts: { bold: true, italic: true, size: 10 } },
    { text: `Placa Carreta : ${dados.placaCarreta1 || ""}`, w: pw, opts: { bold: true, italic: true, size: 10 } },
    { text: `Carreta: ${dados.placaCarreta2 || "XXX-XXXX"}`, w: pw, opts: { bold: true, italic: true, size: 10 } },
  ], 22);

  // === Linha 8: Produto — Etanol (X) ANIDRO ( ) HIDRATADO
  const anidro    = (dados.produto || "").toUpperCase().includes("ANIDRO");
  const hidratado = (dados.produto || "").toUpperCase().includes("HIDRATADO");
  const marca = v => v ? "X" : " ";
  const produtoTxt =
    (dados.produto || "").includes("ETANOL")
      ? `Etanol         (${marca(anidro)}) ANIDRO       (${marca(hidratado)}) HIDRATADO`
      : (dados.produtoDescricao || dados.produto || "");
  linhaDados([
    { text: "Produto", w: cw1, opts: { bold: true, italic: true, size: 11, align: "center" } },
    { text: produtoTxt, w: pageW - cw1, opts: { bold: true, italic: true, size: 10, align: "center" } },
  ], 24);

  // === Linha 9: Capacidade
  linhaDados([
    { text: "CAPACIDADE:(litros)", w: cw1, opts: { bold: true, italic: true, size: 10, align: "center" } },
    { text: fmtL(dados.capacidadeLitros), w: pageW - cw1, opts: { bold: true, italic: true, size: 11, align: "center" } },
  ], 24);

  // === Rodape: assinaturas
  const rodapeAltura = 90;
  doc.lineWidth(0.7).strokeColor(BORDER).rect(x0, y, pageW, rodapeAltura).stroke();

  // Coluna esquerda: Responsavel
  const colW = pageW / 2;
  doc.font("Helvetica-Oblique").fontSize(11).fillColor("black")
     .text(dados.responsavelNome || "Rosilda de Lima Ramos", x0 + 20, y + 20, { width: colW - 40, align: "left" });
  doc.font("Helvetica-BoldOblique").fontSize(10)
     .text("Responsável", x0 + 20, y + 40, { width: colW - 40, align: "left" });

  // Coluna direita: assinatura motorista
  doc.font("Helvetica").fontSize(9)
     .text("_________________________________________", x0 + colW, y + 22, { width: colW - 20, align: "left" });
  doc.font("Helvetica-BoldOblique").fontSize(10)
     .text("Motorista", x0 + colW, y + 40, { width: colW - 40, align: "center" });

  // Rodape info
  doc.font("Helvetica").fontSize(9).fillColor("#0000FF")
     .text("Comercial@pontualpetroleo.com.br", x0, y + 62, { width: pageW, align: "center", link: "mailto:Comercial@pontualpetroleo.com.br", underline: true });
  doc.font("Helvetica").fontSize(10).fillColor("black")
     .text("Rua:Luiz Franceshi,666-Bairro Tomaz Coelho-CEP 83.707-072", x0, y + 76, { width: pageW, align: "center" });
  y += rodapeAltura;

  doc.end();
  return done;
}
