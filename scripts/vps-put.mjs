// Upload de arquivo via ssh exec + base64 (mais confiável que SFTP em alguns setups).
// Uso: node vps-put.mjs <arquivo-local> <destino-remoto>
import { Client } from "ssh2";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const HOST = "72.60.8.135";
const USER = "root";
const PASS = process.env.VPS_PASS || "Pontual@pontual01";

const [, , local, remoto] = process.argv;
if (!local || !remoto) { console.error("uso: node vps-put.mjs <local> <remoto>"); process.exit(1); }

const data = readFileSync(local);
const b64 = data.toString("base64");

const c = new Client();
c.on("ready", () => {
  const cmd = `cat > /tmp/upload.b64 << 'EOF'\n${b64}\nEOF\nbase64 -d /tmp/upload.b64 > "${remoto}" && rm /tmp/upload.b64 && stat -c '%s bytes' "${remoto}"`;
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
}).on("error", e => { console.error("SSH ERR:", e.message); process.exit(1); })
  .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 15000 });
