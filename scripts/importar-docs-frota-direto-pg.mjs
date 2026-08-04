// Importa docs veiculares direto no VPS: SFTP upload + INSERT via psql.
// Bypassa API/JWT — usa credenciais SSH do vps-ssh.mjs.
//
// Uso:
//   node importar-docs-frota-direto-pg.mjs --dry-run       # simula
//   node importar-docs-frota-direto-pg.mjs --min=alta      # só alta
//   node importar-docs-frota-direto-pg.mjs                 # alta+media (padrão)

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { Client } from "ssh2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FROTA_DIR = "C:/Users/Logistica01/Downloads/frota";
const XLSX_PATH = path.join(__dirname, "preview-docs-frota.xlsx");

const HOST = "72.60.8.135";
const USER = "root";
const PASS = process.env.VPS_PASS;
const UPLOADS_BASE = "/var/pontual/uploads";
const BASE_URL = "http://srv1464919.hstgr.cloud/uploads";

const DRY_RUN = process.argv.includes("--dry-run");
const MIN_CONF = (process.argv.find(a => a.startsWith("--min="))?.split("=")[1]) || "media";
const CONF_ORDER = { alta: 3, media: 2, baixa: 1 };

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

// Nome sanitizado (mesmo padrão do multer)
function safeName(nome) {
  return nome.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);
}

async function conectar() {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on("ready", () => resolve(c));
    c.on("error", reject);
    c.connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 30000 });
  });
}

async function sftpEnviar(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      // Cria diretório pai (mkdir -p equivalente)
      const dir = path.posix.dirname(remotePath);
      conn.exec(`mkdir -p '${dir}'`, (e) => {
        if (e) return reject(e);
        sftp.fastPut(localPath, remotePath, (err2) => {
          if (err2) return reject(err2);
          resolve();
        });
      });
    });
  });
}

async function sshExec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "", errOut = "";
      stream.on("data", d => out += d.toString());
      stream.stderr.on("data", d => errOut += d.toString());
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`exit ${code}: ${errOut || out}`));
        else resolve(out);
      });
    });
  });
}

function escapeSql(s) {
  if (s === null || s === undefined) return "NULL";
  return "'" + String(s).replace(/'/g, "''") + "'";
}

async function upsertManutencaoPG(conn, { placa, tipo, venc, anexo, obs }) {
  const meta = TIPO_META[tipo];
  if (!meta) throw new Error(`tipo desconhecido: ${tipo}`);
  const legacyId = `${placa}__${tipo}`;
  const anexosJson = anexo ? JSON.stringify([anexo]).replace(/'/g, "''") : "[]";
  const sql = `
    INSERT INTO manutencoes (legacy_id, placa, tipo, label, grupo, venc, obs, anexos)
    VALUES (${escapeSql(legacyId)}, ${escapeSql(placa)}, ${escapeSql(tipo)},
            ${escapeSql(meta.label)}, ${escapeSql(meta.grupo)},
            ${venc ? escapeSql(venc) : "NULL"}, ${escapeSql(obs)}, '${anexosJson}'::jsonb)
    ON CONFLICT (legacy_id) DO UPDATE SET
      venc = COALESCE(EXCLUDED.venc, manutencoes.venc),
      obs = EXCLUDED.obs,
      anexos = CASE
        WHEN manutencoes.anexos IS NULL OR manutencoes.anexos::text = '[]'
        THEN EXCLUDED.anexos
        ELSE manutencoes.anexos || EXCLUDED.anexos
      END
    RETURNING legacy_id;
  `.trim();

  if (DRY_RUN) return { dry: true, sql };
  const cmd = `sudo -u postgres psql -d pontual -tAc "${sql.replace(/"/g, '\\"').replace(/\n/g, " ")}"`;
  const out = await sshExec(conn, cmd);
  return { legacy_id: out.trim() };
}

async function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`⛔ ${XLSX_PATH} não existe`); process.exit(1);
  }
  const minVal = CONF_ORDER[MIN_CONF] || 2;

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const ws = wb.worksheets[0];

  const linhas = [];
  ws.eachRow({ includeEmpty: false }, (row, i) => {
    if (i === 1) return;
    const [_, pasta, arquivo, placa, placa_motivo, tipo, venc, fonte, conf, motivo] = row.values;
    if (!placa || !tipo || !venc) return;
    if ((CONF_ORDER[conf] || 0) < minVal) return;
    if (!TIPO_META[tipo]) return;  // pula tipos não mapeados (ex: "nf" que não virou "civ")
    linhas.push({ pasta, arquivo, placa, tipo, venc, fonte, conf, motivo });
  });

  console.log(`[info] modo=${DRY_RUN ? "DRY-RUN" : "APLICAR"} min=${MIN_CONF} linhas=${linhas.length}`);
  if (linhas.length === 0) { console.log("Nada pra fazer"); return; }

  let ok = 0, erros = 0;
  const errosLog = [];
  const BATCH_RECON = 8;  // reconecta SSH a cada 8 items pra evitar "channel open failure"

  let conn = null;
  if (!DRY_RUN) {
    console.log(`[info] conectando SSH em ${HOST}...`);
    conn = await conectar();
  }

  for (let idx = 0; idx < linhas.length; idx++) {
    if (!DRY_RUN && idx > 0 && idx % BATCH_RECON === 0) {
      try { conn.end(); } catch {}
      await new Promise(r => setTimeout(r, 500));
      conn = await conectar();
      console.log(`  [reconn] após ${idx}/${linhas.length}`);
    }
    const l = linhas[idx];
    const cam = path.join(FROTA_DIR, l.pasta, l.arquivo);
    if (!fs.existsSync(cam)) {
      erros++;
      errosLog.push({ ...l, erro: "arquivo-nao-encontrado" });
      continue;
    }
    try {
      // Gera nome único e caminho remoto igual padrão multer
      const nomeSafe = safeName(l.arquivo);
      const hash = randomUUID().slice(0, 12).replace(/-/g, "");
      const remoteFile = `manutencoes/${l.placa}/${l.tipo}/${hash}_${nomeSafe}`;
      const remotePath = `${UPLOADS_BASE}/${remoteFile}`;
      const url = `${BASE_URL}/${remoteFile}`;

      if (!DRY_RUN) {
        await sftpEnviar(conn, cam, remotePath);
      }

      const stat = fs.statSync(cam);
      const anexo = {
        url,
        nome: l.arquivo,
        path: remoteFile,
        tamanho: stat.size,
        contentType: l.arquivo.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        criadoEm: new Date().toISOString(),
        criadoPor: "IMPORT.SCRIPT",
      };

      await upsertManutencaoPG(conn, {
        placa: l.placa,
        tipo: l.tipo,
        venc: l.venc,
        anexo,
        obs: `Importado auto. fonte=${l.fonte} conf=${l.conf}${l.motivo ? ` — ${l.motivo}` : ""}`,
      });
      ok++;
      console.log(`  ✓ ${l.placa} ${l.tipo} venc=${l.venc}`);
    } catch (e) {
      erros++;
      errosLog.push({ ...l, erro: e.message.slice(0, 300) });
      console.warn(`  ✗ ${l.placa} ${l.tipo}: ${e.message.slice(0, 120)}`);
    }
  }

  if (conn) conn.end();

  console.log(`\n[fim] ok=${ok} erros=${erros}`);
  if (errosLog.length) {
    fs.writeFileSync(
      path.join(__dirname, "importar-docs-erros.json"),
      JSON.stringify(errosLog, null, 2),
    );
    console.log(`     detalhe em importar-docs-erros.json`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
