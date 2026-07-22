// Helper de SSH pro VPS Hostinger. Roda comando remoto e devolve stdout/stderr.
// Uso: node vps-ssh.mjs "comando linux aqui"
import { Client } from "ssh2";

const HOST = "72.60.8.135";
const USER = "root";
const PASS = process.env.VPS_PASS || "mn+X4OH5U-nBB1lE";

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
