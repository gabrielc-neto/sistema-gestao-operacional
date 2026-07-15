// Sincronização local do CTA Smart → Firestore.
// Uso:
//   node scripts/sincronizar-cta-local.mjs                  # 1 vez
//   node scripts/sincronizar-cta-local.mjs --loop           # loop a cada 65s (respeita rate limit)
//   node scripts/sincronizar-cta-local.mjs --dry-run        # simula
//   node scripts/sincronizar-cta-local.mjs --token=XXXX     # usa token específico
//
// Sem argumento --token, usa o padrão do projeto (bEsu0JDwbL).

import { initializeApp, cert } from 'firebase-admin/app';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, '../../scripts/serviceAccountKey.json');

initializeApp({
  credential: cert(keyPath),
  projectId: 'pontual-logistica',
});

const { sincronizarCtaAgora } = await import('../src/cta/sincronizar.js');

const DRY_RUN     = process.argv.includes('--dry-run');
const LOOP        = process.argv.includes('--loop');
const NO_CONFIRM  = process.argv.includes('--no-confirmar');   // debug: não avança cursor
const argToken    = process.argv.find(a => a.startsWith('--token='));
const argData     = process.argv.find(a => a.startsWith('--data-inicio='));
const TOKEN       = argToken ? argToken.split('=')[1] : (process.env.CTA_TOKEN || 'bEsu0JDwbL');
const DATA_INICIO = argData  ? argData.split('=')[1]  : null;   // "DD/MM/YYYY" — null = 30 dias atrás

// Intervalo entre chamadas — respeita rate limit (60s) + 5s de folga
const INTERVAL_MS = Number(process.env.CTA_INTERVAL_MS) || 65_000;

function fmtTs() {
  return new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function tick() {
  const t0 = Date.now();
  try {
    const r = await sincronizarCtaAgora({ token: TOKEN, dryRun: DRY_RUN, confirmar: !NO_CONFIRM, dataInicio: DATA_INICIO });
    const stats = r.stats;
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    if (r.ok) {
      console.log(`[${fmtTs()}] OK  novos=${stats.novos}  atualizados=${stats.atualizados}  iguais=${stats.iguais}  recebidos=${stats.recebidos}  (${dur}s)`);
    } else if (r.rateLimited) {
      console.log(`[${fmtTs()}] rate-limited: ${r.mensagem}  (${dur}s)`);
    } else {
      console.log(`[${fmtTs()}] status ${r.codigo}: ${r.mensagem}  (${dur}s)`);
    }
  } catch (e) {
    console.error(`[${fmtTs()}] ERRO:`, e.message);
  }
}

console.log(`CTA sync — token=${TOKEN.slice(0,4)}****  loop=${LOOP}  dryRun=${DRY_RUN}  interval=${INTERVAL_MS/1000}s`);

if (LOOP) {
  await tick();
  setInterval(tick, INTERVAL_MS);
} else {
  await tick();
  process.exit(0);
}
