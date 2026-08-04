// Importa CTA por período — varre dia a dia avançando data_inicio até chegar em "hoje".
// Respeita rate limit de 65s entre chamadas.
//
// Uso:
//   node scripts/importar-cta-periodo.mjs --de=01/07/2026            # até hoje
//   node scripts/importar-cta-periodo.mjs --de=01/06/2026 --ate=30/06/2026
//   node scripts/importar-cta-periodo.mjs --de=01/07/2026 --ate=14/07/2026 --dry-run

import { initializeApp, cert } from 'firebase-admin/app';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, '../../scripts/serviceAccountKey.json');
initializeApp({ credential: cert(keyPath), projectId: 'pontual-logistica' });

// Carrega scripts/.env.cta (gitignored) — CTA_TOKEN=xxx
const ENV_PATH = resolve(__dirname, '../../scripts/.env.cta');
if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { sincronizarCtaAgora } = await import('../src/cta/sincronizar.js');

const argDe   = process.argv.find(a => a.startsWith('--de='));
const argAte  = process.argv.find(a => a.startsWith('--ate='));
const argTok  = process.argv.find(a => a.startsWith('--token='));
const TOKEN   = argTok ? argTok.split('=')[1] : process.env.CTA_TOKEN;
if (!TOKEN) {
  console.error('ERR: defina CTA_TOKEN em scripts/.env.cta ou passe --token=<token> na CLI');
  console.error('Exemplo scripts/.env.cta:');
  console.error('  CTA_TOKEN=seu_token_aqui');
  process.exit(2);
}
const DRY     = process.argv.includes('--dry-run');
const INTERVAL_MS = Number(process.env.CTA_INTERVAL_MS) || 65_000;

if (!argDe) { console.error('Uso: --de=DD/MM/YYYY [--ate=DD/MM/YYYY]'); process.exit(1); }

// Parse DD/MM/YYYY → Date
function parseData(s) {
  const [d, m, y] = s.split('=')[1].split('/').map(Number);
  return new Date(y, m - 1, d);
}
function fmtData(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function ts() { return new Date().toLocaleString('pt-BR'); }

const de  = parseData(argDe);
const ate = argAte ? parseData(argAte) : new Date();

console.log(`Importando CTA de ${fmtData(de)} até ${fmtData(ate)}${DRY ? ' (DRY-RUN)' : ''}`);
console.log(`Rate limit: ${INTERVAL_MS/1000}s entre chamadas`);

let cursor = new Date(de);
let totalNovos = 0, totalIguais = 0, chamadas = 0;
let ultimoDia = null;

while (cursor <= ate) {
  const dataStr = fmtData(cursor);
  const r = await sincronizarCtaAgora({
    token: TOKEN, dryRun: DRY, confirmar: false,
    dataInicio: dataStr, dataFim: dataStr,    // ← ISOLA UM DIA POR VEZ (paginação limpa)
  });
  chamadas += 1;
  if (!r.ok) {
    console.log(`[${ts()}] ${dataStr}  status ${r.codigo}: ${r.mensagem}`);
    if (r.rateLimited) { await new Promise(x => setTimeout(x, INTERVAL_MS)); continue; }
  } else {
    totalNovos  += r.stats.novos;
    totalIguais += r.stats.iguais;
    console.log(`[${ts()}] ${dataStr}  novos=${r.stats.novos}  iguais=${r.stats.iguais}  recebidos=${r.stats.recebidos}  ${r.stats.recebidos >= 100 ? '⚠ 100+' : ''}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  if (cursor <= ate) {
    await new Promise(x => setTimeout(x, INTERVAL_MS));
  }
}

console.log('');
console.log('==============================================');
console.log(`Feito. Chamadas: ${chamadas}  Novos: ${totalNovos}  Iguais: ${totalIguais}`);
console.log('==============================================');
process.exit(0);
