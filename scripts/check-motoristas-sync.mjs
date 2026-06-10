// Diagnóstico: cruza motoristas (TMS local) com motoristas_desligados (id SASCAR)
// pra entender por que marcar desligado em /motoristas não some da aba "não iniciaram".
// Uso: node scripts/check-motoristas-sync.mjs
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

function norm(s) {
  return String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

const [snapM, snapD, snapC] = await Promise.all([
  db.collection('motoristas').get(),
  db.collection('motoristas_desligados').get(),
  db.collection('motoristas_classificacao').get(),
]);

console.log(`\n=== TOTAIS ===`);
console.log(`motoristas (local TMS):       ${snapM.size}`);
console.log(`motoristas_desligados (SASCAR id): ${snapD.size}`);
console.log(`motoristas_classificacao:     ${snapC.size}`);

// Quebra por status na collection local
const porStatus = {};
snapM.docs.forEach(d => {
  const s = d.data().status || '(sem)';
  porStatus[s] = (porStatus[s] || 0) + 1;
});
console.log(`\n=== Local /motoristas por status ===`);
Object.entries(porStatus).forEach(([s, n]) => console.log(`  ${s.padEnd(12)} ${n}`));

// Lista locais NÃO ativos
const locaisNaoAtivos = snapM.docs.filter(d => d.data().status && d.data().status !== 'ativo');
console.log(`\n=== Local: ${locaisNaoAtivos.length} com status ≠ ativo ===`);
locaisNaoAtivos.forEach(d => {
  const x = d.data();
  console.log(`  [${d.id}]  status=${x.status}  nome="${x.nome}"  cnh=${x.cnh || '(vazio)'}`);
});

// Lista motoristas_desligados (id SASCAR)
console.log(`\n=== motoristas_desligados (id = idMotorista SASCAR) ===`);
snapD.docs.forEach(d => {
  const x = d.data();
  console.log(`  [${d.id}]  nome="${x.nome || ''}"  desligadoEm=${x.desligadoEm || '?'}`);
});

// Cruzamento por nome — quais locais desligados estão ESPELHADOS em motoristas_desligados?
console.log(`\n=== Cross-check por NOME (desligado local ↔ motoristas_desligados) ===`);
const nomesSascarSet = new Set(snapD.docs.map(d => norm(d.data().nome)));
let sincronizados = 0;
let orfaos = 0;
locaisNaoAtivos.forEach(d => {
  const x = d.data();
  const sync = nomesSascarSet.has(norm(x.nome));
  if (sync) sincronizados++; else orfaos++;
  console.log(`  ${sync ? 'OK   ' : 'ORFAO'}  ${x.nome.padEnd(35)}  status=${x.status}`);
});
console.log(`\nSincronizados: ${sincronizados}   Orfaos: ${orfaos}`);

// Cross-check inverso: motoristas_desligados que NÃO existem no local
console.log(`\n=== motoristas_desligados sem doc em /motoristas (match por nome) ===`);
const nomesLocalSet = new Set(snapM.docs.map(d => norm(d.data().nome)));
let semLocal = 0;
snapD.docs.forEach(d => {
  if (!nomesLocalSet.has(norm(d.data().nome))) {
    semLocal++;
    console.log(`  [${d.id}]  ${d.data().nome}`);
  }
});
if (semLocal === 0) console.log('  (nenhum)');

// Amostra do doc /motoristas — schema real
console.log(`\n=== Amostra schema: 1 doc /motoristas ===`);
if (snapM.size > 0) {
  const d = snapM.docs[0];
  console.log(`  id: ${d.id}`);
  console.log(`  fields:`, Object.keys(d.data()).sort());
  console.log(`  has idMotorista?`, 'idMotorista' in d.data());
}

process.exit(0);
