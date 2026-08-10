// Envia arquivo local pro VPS via SFTP.
// Uso: node vps-scp.mjs <arquivo-local> <destino-remoto>
import { Client } from "ssh2";
import { readFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Carrega .env.vps (mesma logica do vps-ssh.mjs)
const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, ".env.vps");
if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const HOST = process.env.VPS_HOST || "72.60.8.135";
const USER = process.env.VPS_USER || "root";
const PASS = process.env.VPS_PASS || process.env.VPS_SSH_PASS;

const [, , local, remoto] = process.argv;
if (!local || !remoto) { console.error("uso: node vps-scp.mjs <local> <remoto>"); process.exit(1); }

const data = readFileSync(local);

const c = new Client();
c.on("ready", () => {
  c.sftp((err, sftp) => {
    if (err) { console.error("SFTP ERR:", err.message); c.end(); process.exit(1); }
    sftp.fastPut(local, remoto, (err) => {
      if (err) { console.error("PUT ERR:", err.message); c.end(); process.exit(1); }
      console.log(`✓ ${basename(local)} → ${remoto} (${data.length} bytes)`);
      c.end();
    });
  });
}).on("error", e => { console.error("SSH ERR:", e.message); process.exit(1); })
  .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 15000 });
