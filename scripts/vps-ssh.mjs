// Helper de SSH pro VPS Hostinger. Roda comando remoto e devolve stdout/stderr.
// Uso: node vps-ssh.mjs "comando linux aqui"
//
// Credenciais em scripts/.env.vps (gitignored):
//   VPS_HOST=72.60.8.135
//   VPS_USER=root
//   VPS_PASS=<senha>
import { Client } from "ssh2";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, ".env.vps");

if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const HOST = process.env.VPS_HOST;
const USER = process.env.VPS_USER;
// Aceita VPS_PASS ou VPS_SSH_PASS (compat com .env.vps antigo)
const PASS = process.env.VPS_PASS || process.env.VPS_SSH_PASS;

if (!HOST || !USER || !PASS) {
  console.error("ERR: defina VPS_HOST/VPS_USER/VPS_PASS (ou VPS_SSH_PASS) em scripts/.env.vps ou no ambiente.");
  console.error("Exemplo scripts/.env.vps:");
  console.error("  VPS_HOST=72.60.8.135");
  console.error("  VPS_USER=root");
  console.error("  VPS_PASS=sua_senha_forte_aqui");
  process.exit(2);
}

const cmd = process.argv.slice(2).join(" ");
if (!cmd) { console.error("uso: node vps-ssh.mjs '<comando>'"); process.exit(1); }

const c = new Client();
c.on("ready", () => {
  c.exec(cmd, (err, stream) => {
    if (err) { console.error("EXEC ERR:", err.message); c.end(); process.exit(1); }
    let out = "", errOut = "";
    stream.on("data", d => { out += d.toString(); });
    stream.stderr.on("data", d => { errOut += d.toString(); });
    stream.on("close", (code) => {
      process.stdout.write(out);
      if (errOut) process.stderr.write(errOut);
      c.end();
      process.exit(code || 0);
    });
  });
}).on("error", e => {
  console.error("SSH ERR:", e.message);
  process.exit(1);
}).connect({
  host: HOST, port: 22, username: USER, password: PASS,
  readyTimeout: 15000,
});
