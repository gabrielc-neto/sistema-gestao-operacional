// Deploy rápido do frontend pro VPS.
// Uso: node deploy.mjs                → só frontend (build + upload)
//      node deploy.mjs --backend      → só backend (upload + pm2 restart)
//      node deploy.mjs --tudo         → frontend + backend
//
// Reduz de ~3 min manuais pra ~30s automático.

import { execSync } from "node:child_process";
import { statSync } from "node:fs";

const ROOT = "C:/Users/Logistica01/projetos/logistica-ia";
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

  step("[frontend] upload SFTP");
  execSync(`node vps-scp.mjs "${ROOT}/frontend/_dist.tar.gz" /var/pontual/dist.tar.gz`,
    { cwd: `${ROOT}/scripts`, env: { ...process.env, MSYS_NO_PATHCONV: "1" }, stdio: "inherit" });

  step("[frontend] extraindo no VPS");
  execSync(`node vps-ssh.mjs "tar -xzf /var/pontual/dist.tar.gz -C /var/pontual/frontend/"`,
    { cwd: `${ROOT}/scripts`, env: { ...process.env, MSYS_NO_PATHCONV: "1" }, stdio: "inherit" });

  execSync(`rm ${ROOT}/frontend/_dist.tar.gz`, { shell: "bash" });
  ok("frontend online em http://srv1464919.hstgr.cloud/");
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
