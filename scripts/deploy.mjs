// Deploy rápido do frontend pro VPS.
// Uso: node deploy.mjs                → só frontend (build + backup + upload + extract)
//      node deploy.mjs --backend      → só backend (upload + pm2 restart)
//      node deploy.mjs --tudo         → frontend + backend
//
// Reduz de ~3 min manuais pra ~10s automático.
//
// Alvo prod frontend: /var/www/prod/intranet.pontualpetroleo.com.br/
//   (vhost `intranet.pontualpetroleo.com.br` — Apache serve este dir)
// Merge NÃO-DESTRUTIVO: extract por cima sobrescreve index.html + assets/
// e preserva assets institucionais do Gabriel (login-*.jpg/png, logos,
// PDFs, manifest.json, sw.js). Nunca `rm -rf` no dir prod.

import { execSync } from "node:child_process";
import { statSync } from "node:fs";

const ROOT = "C:/Users/Logistica01/projetos/logistica-ia";
const PROD_DIR = "/var/www/prod/intranet.pontualpetroleo.com.br";
const PROD_URL = "https://intranet.pontualpetroleo.com.br/";

const args = process.argv.slice(2);
const soBackend = args.includes("--backend");
const tudo = args.includes("--tudo");
const soFrontend = !soBackend || tudo;
const fazBackend = soBackend || tudo;

function step(msg) { console.log(`\n▶ ${msg}`); }
function ok(msg) { console.log(`  ✓ ${msg}`); }

async function deployFrontend() {
  step("[frontend] build");
  const t0 = Date.now();
  execSync("npm run build", { cwd: `${ROOT}/frontend`, stdio: "inherit" });
  ok(`build em ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  step("[frontend] empacotando dist/");
  execSync(`tar -czf _dist.tar.gz -C dist .`, { cwd: `${ROOT}/frontend` });
  const size = (statSync(`${ROOT}/frontend/_dist.tar.gz`).size / 1024 / 1024).toFixed(1);
  ok(`${size} MB`);

  step("[frontend] backup do prod atual");
  const iso = new Date().toISOString(); // 2026-08-10T18:38:05.123Z
  const stamp = `${iso.slice(0,10).replace(/-/g,"")}-${iso.slice(11,19).replace(/:/g,"")}`; // YYYYMMDD-HHMMSS
  const backupPath = `/var/pontual/backup-prod-${stamp}.tar.gz`;
  execSync(`node vps-ssh.mjs "tar -czf ${backupPath} -C ${PROD_DIR} . 2>/dev/null && ls -la ${backupPath}"`,
    { cwd: `${ROOT}/scripts`, env: { ...process.env, MSYS_NO_PATHCONV: "1" }, stdio: "inherit" });
  ok(`backup salvo em ${backupPath}`);

  step("[frontend] upload SFTP");
  execSync(`node vps-scp.mjs "${ROOT}/frontend/_dist.tar.gz" /var/pontual/dist-prod.tar.gz`,
    { cwd: `${ROOT}/scripts`, env: { ...process.env, MSYS_NO_PATHCONV: "1" }, stdio: "inherit" });

  step("[frontend] extract merge (não-destrutivo) em prod");
  execSync(`node vps-ssh.mjs "cd ${PROD_DIR} && tar -xzf /var/pontual/dist-prod.tar.gz && rm /var/pontual/dist-prod.tar.gz"`,
    { cwd: `${ROOT}/scripts`, env: { ...process.env, MSYS_NO_PATHCONV: "1" }, stdio: "inherit" });

  execSync(`rm ${ROOT}/frontend/_dist.tar.gz`, { shell: "bash" });
  ok(`frontend online em ${PROD_URL}`);
  ok(`rollback: node scripts/vps-ssh.mjs "cd ${PROD_DIR} && tar -xzf ${backupPath}"`);
}

async function deployBackend() {
  step("[backend] empacotando src/");
  execSync(`tar -czf _deploy.tar.gz --exclude=node_modules --exclude=.env --exclude=_deploy.tar.gz src package.json`,
    { cwd: `${ROOT}/backend-vps` });
  const size = (statSync(`${ROOT}/backend-vps/_deploy.tar.gz`).size / 1024).toFixed(1);
  ok(`${size} KB`);

  step("[backend] upload + restart pm2");
  execSync(`node vps-put.mjs "${ROOT}/backend-vps/_deploy.tar.gz" /var/pontual/backend-deploy.tar.gz`,
    { cwd: `${ROOT}/scripts`, env: { ...process.env, MSYS_NO_PATHCONV: "1" }, stdio: "inherit" });
  execSync(`node vps-ssh.mjs "cd /var/pontual/backend && tar -xzf /var/pontual/backend-deploy.tar.gz && pm2 restart pontual-backend --update-env"`,
    { cwd: `${ROOT}/scripts`, env: { ...process.env, MSYS_NO_PATHCONV: "1" }, stdio: "inherit" });

  execSync(`rm ${ROOT}/backend-vps/_deploy.tar.gz`, { shell: "bash" });
  ok("backend restartado");
}

const t0 = Date.now();
if (soFrontend) await deployFrontend();
if (fazBackend) await deployBackend();
console.log(`\n✅ Deploy completo em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
