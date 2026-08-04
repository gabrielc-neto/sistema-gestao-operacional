// Testa credenciais SASCAR SasIntegra chamando obterVeiculos.
//
// Credenciais em scripts/.env.sascar (gitignored) — formato:
//   SASCAR_USUARIO_1=ADM
//   SASCAR_SENHA_1=xxxx
//   SASCAR_USUARIO_2=PONTUAL790
//   SASCAR_SENHA_2=xxxx
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { obterVeiculos } from "../backend-vps/src/integracoes/sascar/soap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, ".env.sascar");

if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const combos = [];
for (let i = 1; i <= 5; i++) {
  const u = process.env[`SASCAR_USUARIO_${i}`];
  const s = process.env[`SASCAR_SENHA_${i}`];
  if (u && s) combos.push({ usuario: u, senha: s });
}

if (combos.length === 0) {
  console.error("ERR: nenhum combo definido. Configure scripts/.env.sascar com:");
  console.error("  SASCAR_USUARIO_1=usuario1");
  console.error("  SASCAR_SENHA_1=senha1");
  console.error("  # (opcional) até SASCAR_USUARIO_5/SASCAR_SENHA_5");
  process.exit(2);
}

for (const c of combos) {
  process.stdout.write(`Testando usuario=${c.usuario} ... `);
  try {
    const vs = await obterVeiculos({ ...c, quantidade: 5 });
    console.log(`✓ OK — ${vs.length} veículos retornados`);
    if (vs.length > 0) console.log(`  ex: ${vs[0].placa}`);
    process.exit(0);
  } catch (e) {
    console.log(`✗ FALHOU: ${e.message.slice(0, 100)}`);
  }
}
console.log("\nNENHUM combo funcionou — verificar credenciais em scripts/.env.sascar");
process.exit(1);
