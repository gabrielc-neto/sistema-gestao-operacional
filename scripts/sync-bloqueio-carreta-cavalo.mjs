// sync-bloqueio-carreta-cavalo.mjs
// Sincroniza retroativamente o estado de bloqueio de veículos: para toda OS aberta
// em CARRETA, garante que o CAVALO atrelado (via c1/c2) também está bloqueado.
//
// Contexto: bug #1 detectado 2026-08-03. As 7 OSs abertas em carreta bloqueavam só a
// carreta, deixando o cavalo aparentemente livre. Após fix em Manutencao.jsx, novas
// OSs propagam bloqueio corretamente — mas as antigas ficaram inconsistentes.
//
// Uso:
//   node scripts/sync-bloqueio-carreta-cavalo.mjs           # dry-run (só mostra o que faria)
//   node scripts/sync-bloqueio-carreta-cavalo.mjs --apply   # aplica as mudanças
//
// Requer scripts/.env.vps com PG_PASS (senha do pontual_app).

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { Client as SshClient } from "ssh2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, ".env.vps");
if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const APPLY = process.argv.includes("--apply");
const VPS_HOST = process.env.VPS_HOST || "72.60.8.135";
const VPS_USER = process.env.VPS_USER || "root";
// Aceita nomes da convencao do projeto (VPS_SSH_PASS, DB_PASS) ou os antigos (VPS_PASS, PG_PASS).
const VPS_PASS = process.env.VPS_SSH_PASS || process.env.VPS_PASS;
const PG_PASS  = process.env.DB_PASS || process.env.PG_PASS;

if (!VPS_PASS || !PG_PASS) {
  console.error("ERR: defina VPS_SSH_PASS e DB_PASS em scripts/.env.vps");
  process.exit(2);
}

// Abre túnel SSH → porta local 15432 → PG do VPS
const ssh = new SshClient();
await new Promise((resolve, reject) => {
  ssh.on("ready", resolve).on("error", reject)
    .connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 15000 });
});
const server = await new Promise((resolve, reject) => {
  ssh.forwardOut("127.0.0.1", 0, "127.0.0.1", 5432, (err, stream) => {
    if (err) return reject(err);
    resolve(stream);
  });
});

const pool = new pg.Client({ host: "127.0.0.1", port: 5432, database: "pontual", user: "pontual_app", password: PG_PASS, stream: server });
await pool.connect();

function normP(s) { return String(s || "").replace(/[^A-Z0-9]/gi, "").toUpperCase(); }

// 1. Busca todas as OSs abertas
const { rows: osAbertas } = await pool.query(`SELECT id, numero, placa FROM ordens_servico WHERE status = 'aberta'`);
console.log(`[info] ${osAbertas.length} OS(s) aberta(s) encontrada(s)`);

// 2. Busca todos os veículos com bloqueio ou atrelamento
const { rows: veiculos } = await pool.query(`SELECT id, placa, tipo, c1, c2, bloqueio FROM veiculos`);
const porPlaca = new Map(veiculos.map(v => [normP(v.placa), v]));

const acoes = [];
for (const os of osAbertas) {
  const veiculo = porPlaca.get(normP(os.placa));
  if (!veiculo) { console.warn(`[skip] OS ${os.numero} placa ${os.placa} não encontrada em veículos`); continue; }
  if (veiculo.tipo !== "carreta") continue; // só carretas propagam

  // Acha cavalo atrelado (c1 ou c2 == placa da carreta)
  const placaCarreta = normP(veiculo.placa);
  const cavalo = veiculos.find(v => v.tipo !== "carreta" && (normP(v.c1) === placaCarreta || normP(v.c2) === placaCarreta));
  if (!cavalo) { console.warn(`[skip] OS ${os.numero} carreta ${os.placa} sem cavalo atrelado`); continue; }
  if (cavalo.bloqueio?.ativo) { console.log(`[ok] cavalo ${cavalo.placa} já bloqueado (motivo: ${cavalo.bloqueio?.motivo || "?"})`); continue; }

  const novoBloqueio = {
    ativo: true,
    motivo: "Manutenção",
    descricao: `OS ${os.numero} — carreta ${veiculo.placa} atrelada (sync retroativo)`,
    origem: "os",
    osId: os.id,
    osNumero: os.numero,
    propagadoDaCarreta: veiculo.id,
    bloqueadoPor: "sync-script",
    bloqueadoEm: new Date().toISOString(),
  };
  acoes.push({ cavaloId: cavalo.id, cavaloPlaca: cavalo.placa, osNumero: os.numero, carretaPlaca: veiculo.placa, novoBloqueio });
}

console.log(`\n[plano] ${acoes.length} cavalo(s) precisam ser bloqueado(s) retroativamente:`);
for (const a of acoes) console.log(`  - cavalo ${a.cavaloPlaca} ← OS ${a.osNumero} (carreta ${a.carretaPlaca})`);

if (!APPLY) {
  console.log("\n[dry-run] Nenhuma alteração feita. Rode novamente com --apply pra persistir.");
  await pool.end();
  ssh.end();
  process.exit(0);
}

console.log("\n[apply] Persistindo...");
for (const a of acoes) {
  await pool.query(`UPDATE veiculos SET bloqueio = $1 WHERE id = $2`, [JSON.stringify(a.novoBloqueio), a.cavaloId]);
  console.log(`  ✓ cavalo ${a.cavaloPlaca} bloqueado`);
}
console.log(`\n[fim] ${acoes.length} cavalo(s) sincronizado(s)`);

await pool.end();
ssh.end();
