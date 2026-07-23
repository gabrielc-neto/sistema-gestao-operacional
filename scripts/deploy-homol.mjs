// Deploy pro ambiente HOMOL — build com base=/homol/ + API=/homol/api
// Uso: node deploy-homol.mjs
import { execSync } from "node:child_process";
import { statSync } from "node:fs";

const ROOT = "C:/Users/Logistica01/projetos/logistica-ia";

const env = {
  ...process.env,
  VITE_BASE: "/homol/",
  VITE_PONTUAL_API_URL: "/homol",   // endpoints ficam em /homol/api/*
};

console.log("▶ [homol] build (base=/homol/)");
const t0 = Date.now();
execSync("npm run build", { cwd: `${ROOT}/frontend`, stdio: "inherit", env });
console.log(`  ✓ build em ${((Date.now() - t0) / 1000).toFixed(1)}s`);

console.log("▶ [homol] empacotando");
execSync(`tar -czf _dist-homol.tar.gz -C dist .`, { cwd: `${ROOT}/frontend` });
const size = (statSync(`${ROOT}/frontend/_dist-homol.tar.gz`).size / 1024 / 1024).toFixed(1);
console.log(`  ✓ ${size} MB`);

console.log("▶ [homol] upload SFTP");
execSync(`node vps-scp.mjs "${ROOT}/frontend/_dist-homol.tar.gz" /var/pontual-homol/dist.tar.gz`,
  { cwd: `${ROOT}/scripts`, env: { ...process.env, MSYS_NO_PATHCONV: "1" }, stdio: "inherit" });

console.log("▶ [homol] extraindo no VPS");
execSync(`node vps-ssh.mjs "tar -xzf /var/pontual-homol/dist.tar.gz -C /var/pontual-homol/frontend/"`,
  { cwd: `${ROOT}/scripts`, env: { ...process.env, MSYS_NO_PATHCONV: "1" }, stdio: "inherit" });

execSync(`rm ${ROOT}/frontend/_dist-homol.tar.gz`, { shell: "bash" });
console.log(`\n✅ HOMOL deploy em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log("   URL: http://srv1464919.hstgr.cloud/homol/");
