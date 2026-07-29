// FASE 2: consome preview-docs-frota.xlsx e importa docs veiculares no VPS.
// - Upload de cada PDF via POST /api/uploads?folder=manutencoes/{placa}
// - Upsert em manutencoes via POST /api/manutencoes
//
// Uso:
//   node importar-docs-frota.mjs --dry-run   # simula, não grava nada
//   node importar-docs-frota.mjs --min=alta  # só confiança alta
//   node importar-docs-frota.mjs             # importa alta+média
//
// Requer: preview aprovada + servidor rodando + JWT_TOKEN no ambiente

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FROTA_DIR = "C:/Users/Logistica01/Downloads/frota";
const XLSX_PATH = path.join(__dirname, "preview-docs-frota.xlsx");

const API_BASE = process.env.API_BASE || "http://srv1464919.hstgr.cloud/api";
const JWT_TOKEN = process.env.JWT_TOKEN;

const DRY_RUN = process.argv.includes("--dry-run");
const MIN_CONF = (process.argv.find(a => a.startsWith("--min="))?.split("=")[1]) || "media";
const CONF_ORDER = { alta: 3, media: 2, baixa: 1 };

// Mapeia tipo → label + grupo (mesmo TIPOS do frontend)
const TIPO_META = {
  civ:             { label: "CIV",                   grupo: "Documentação" },
  cipp:            { label: "CIPP",                  grupo: "Documentação" },
  crlv:            { label: "CRLV",                  grupo: "Documentação" },
  tacografo:       { label: "Tacógrafo",             grupo: "Documentação" },
  extintor:        { label: "Extintor",              grupo: "Documentação" },
  rntrc:           { label: "RNTRC",                 grupo: "Documentação" },
  licenca_parana:  { label: "Licença Paraná",        grupo: "Documentação" },
  licenca_federal: { label: "Licença Federal-DNIT",  grupo: "Documentação" },
  aet:             { label: "AET",                   grupo: "Documentação" },
  ipem:            { label: "IPEM",                  grupo: "Documentação" },
};

if (!JWT_TOKEN && !DRY_RUN) {
  console.error("⛔ JWT_TOKEN não definido. Rode:");
  console.error('   $env:JWT_TOKEN = "SEU_TOKEN_JWT"; node importar-docs-frota.mjs');
  process.exit(1);
}

async function uploadArquivo(caminho, placa, tipo) {
  if (DRY_RUN) return { url: "(dry-run)", publicId: "(dry-run)", tamanho: fs.statSync(caminho).size, tipo: "application/pdf" };
  const buf = fs.readFileSync(caminho);
  const nome = path.basename(caminho);
  const form = new FormData();
  form.append("file", new Blob([buf]), nome);
  form.append("folder", `manutencoes/${placa}/${tipo}`);  // mesmo padrão do frontend
  const r = await fetch(`${API_BASE}/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${JWT_TOKEN}` },
    body: form,
  });
  if (!r.ok) throw new Error(`upload falhou ${r.status}: ${await r.text()}`);
  return await r.json();
}

async function upsertManutencao({ placa, tipo, venc, anexo, obs }) {
  if (DRY_RUN) return { dry: true };
  const meta = TIPO_META[tipo];
  if (!meta) throw new Error(`tipo desconhecido: ${tipo}`);
  const payload = {
    placa,
    tipo,
    label: meta.label,
    grupo: meta.grupo,
    venc,
    obs,
    anexos: anexo ? [anexo] : [],
  };
  const r = await fetch(`${API_BASE}/manutencoes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`manutencao ${placa}/${tipo} falhou ${r.status}: ${await r.text()}`);
  return await r.json();
}

async function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`⛔ ${XLSX_PATH} não existe. Rode preview-docs-frota.py primeiro.`);
    process.exit(1);
  }
  const minVal = CONF_ORDER[MIN_CONF] || 2;

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const ws = wb.worksheets[0];

  const linhas = [];
  ws.eachRow({ includeEmpty: false }, (row, i) => {
    if (i === 1) return; // header
    const [_, pasta, arquivo, placa, placa_motivo, tipo, venc, fonte, conf, motivo] = row.values;
    if (!placa || !tipo || !venc) return;
    if ((CONF_ORDER[conf] || 0) < minVal) return;
    linhas.push({ pasta, arquivo, placa, tipo, venc, fonte, conf, motivo });
  });

  console.log(`[info] modo=${DRY_RUN ? "DRY-RUN" : "APLICAR"} min=${MIN_CONF} linhas=${linhas.length}`);

  let ok = 0, erros = 0;
  const errosDetalhe = [];
  for (const l of linhas) {
    const cam = path.join(FROTA_DIR, l.pasta, l.arquivo);
    if (!fs.existsSync(cam)) {
      erros++;
      errosDetalhe.push({ ...l, erro: "arquivo-nao-encontrado" });
      continue;
    }
    try {
      const up = await uploadArquivo(cam, l.placa, l.tipo);
      const anexoFmt = DRY_RUN ? null : {
        url: up.url,
        nome: l.arquivo,
        path: up.publicId,
        tamanho: up.tamanho,
        contentType: up.tipo || "application/pdf",
        criadoEm: new Date().toISOString(),
        criadoPor: "IMPORT.SCRIPT",  // marca importação automática
      };
      await upsertManutencao({
        placa: l.placa,
        tipo: l.tipo,
        venc: l.venc,
        anexo: anexoFmt,
        obs: `Importado automaticamente. fonte=${l.fonte}, conf=${l.conf}${l.motivo ? ` — ${l.motivo}` : ""}`,
      });
      ok++;
      console.log(`  ✓ ${l.placa} ${l.tipo} venc=${l.venc}`);
    } catch (e) {
      erros++;
      errosDetalhe.push({ ...l, erro: e.message.slice(0, 200) });
      console.warn(`  ✗ ${l.placa} ${l.tipo}: ${e.message.slice(0, 100)}`);
    }
  }

  console.log(`\n[fim] ok=${ok} erros=${erros}`);
  if (errosDetalhe.length) {
    fs.writeFileSync(
      path.join(__dirname, "importar-docs-frota-erros.json"),
      JSON.stringify(errosDetalhe, null, 2),
    );
    console.log(`     detalhe em importar-docs-frota-erros.json`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
