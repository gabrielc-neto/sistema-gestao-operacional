// Envia arquivo local pro VPS via SFTP.
// Uso: node vps-scp.mjs <arquivo-local> <destino-remoto>
import { Client } from "ssh2";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const HOST = "72.60.8.135";
const USER = "root";
const PASS = process.env.VPS_PASS || "mn+X4OH5U-nBB1lE";

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
