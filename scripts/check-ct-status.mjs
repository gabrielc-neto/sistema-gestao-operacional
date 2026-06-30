// Diagnostico: lista veiculos com status invalido (renderizam cinza no Frota.jsx).
// Status validos: ativo, disponivel, em_viagem, manutencao, inativo.
// Uso: node scripts/check-ct-status.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(__dirname, '..', 'functions', 'package.json'));
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const VALID = new Set(['ativo', 'disponivel', 'em_viagem', 'manutencao', 'inativo']);

const snap = await db.collection('veiculos').get();
const total = snap.size;
const buckets = { ok: [], semStatus: [], invalido: [] };

snap.forEach(doc => {
  const v = doc.data();
  const tipo = v.tipo || '(sem tipo)';
  const placa = v.placa || doc.id;
  const status = v.status;
  const row = { id: doc.id, placa, tipo, status: status ?? null };

  if (!status) buckets.semStatus.push(row);
  else if (!VALID.has(status)) buckets.invalido.push(row);
  else buckets.ok.push(row);
});

const cts = (arr) => arr.filter(r => r.tipo !== 'carreta');
const carretas = (arr) => arr.filter(r => r.tipo === 'carreta');

console.log(`\n=== DIAGNOSTICO VEICULOS (${total} docs) ===\n`);
console.log(`OK:          ${buckets.ok.length}  (CTs: ${cts(buckets.ok).length}, carretas: ${carretas(buckets.ok).length})`);
console.log(`SEM STATUS:  ${buckets.semStatus.length}  (CTs: ${cts(buckets.semStatus).length}, carretas: ${carretas(buckets.semStatus).length})`);
console.log(`INVALIDO:    ${buckets.invalido.length}  (CTs: ${cts(buckets.invalido).length}, carretas: ${carretas(buckets.invalido).length})`);

if (buckets.semStatus.length) {
  console.log('\n--- SEM STATUS (cinza no painel) ---');
  buckets.semStatus.forEach(r => console.log(`  ${r.placa.padEnd(10)} tipo=${r.tipo}`));
}
if (buckets.invalido.length) {
  console.log('\n--- STATUS INVALIDO (cinza no painel) ---');
  buckets.invalido.forEach(r => console.log(`  ${r.placa.padEnd(10)} tipo=${r.tipo}  status="${r.status}"`));
}

console.log('\nResumo de status validos encontrados:');
const counts = {};
buckets.ok.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

process.exit(0);
