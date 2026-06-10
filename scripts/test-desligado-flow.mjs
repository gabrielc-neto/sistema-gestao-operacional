// Reproduz o cálculo da function jornadaDia pra um motorista específico desligado
// pra ver EXATAMENTE onde o pipeline está deixando ele passar.
// Uso: node scripts/test-desligado-flow.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { obterMotoristas } from '../functions/src/sascar/soap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const require = createRequire(join(__dirname, '..', 'functions', 'package.json'));
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const IDS_TESTE = [3790446, 3818129, 3898952, 3922437]; // os 4 desligados hoje

console.log('=== 1) Roster SASCAR ao vivo (obterMotoristas) ===');
const roster = await obterMotoristas({
  usuario: env.SASCAR_USUARIO,
  senha: env.SASCAR_SENHA,
  quantidade: 1000,
});
console.log(`Total roster (bruto):  ${roster.length}`);
const rosterFiltrado = roster.filter(m => m.idMotorista && !m.generico);
console.log(`Após filtro idMotorista && !generico: ${rosterFiltrado.length}`);

console.log('\n=== 2) Os 4 desligados de 18:47 — ainda estão no roster ao vivo? ===');
for (const id of IDS_TESTE) {
  const found = rosterFiltrado.find(m => m.idMotorista === id);
  if (found) console.log(`  id ${id}  PRESENTE no roster  →  nome="${found.nome}"  generico=${found.generico}`);
  else       console.log(`  id ${id}  AUSENTE do roster (SASCAR já removeu)`);
}

console.log('\n=== 3) Estão em motoristas_desligados? ===');
const snapD = await db.collection('motoristas_desligados').get();
const desligados = new Set();
snapD.forEach(doc => desligados.add(Number(doc.id)));
for (const id of IDS_TESTE) {
  console.log(`  id ${id}  ${desligados.has(id) ? 'SIM em desligados' : 'NÃO em desligados'}`);
}

console.log('\n=== 4) Simulação do filtro final (igual jornadaDia faz) ===');
const ativos = rosterFiltrado.filter(m => !desligados.has(m.idMotorista));
console.log(`Ativos (roster filtrado - desligados): ${ativos.length}`);
const naoIniciaram = ativos
  .filter(m => true) // sem eventos = todos, igual no caso real sem iButton
  .map(m => ({ id: m.idMotorista, nome: m.nome }));
console.log(`\nApareceriam em "não iniciaram" hoje: ${naoIniciaram.length} motoristas`);
console.log('Algum dos 4 desligados ainda aparece?');
for (const id of IDS_TESTE) {
  const ainda = naoIniciaram.find(m => m.id === id);
  console.log(`  id ${id}  ${ainda ? '⚠ AINDA APARECE → ' + ainda.nome : '✓ filtrado corretamente'}`);
}

console.log('\n=== 5) Tipo das chaves (debug type mismatch) ===');
const amostraRoster = rosterFiltrado[0];
const amostraDesligado = [...desligados][0];
console.log(`  roster.idMotorista typeof: ${typeof amostraRoster?.idMotorista}  valor: ${amostraRoster?.idMotorista}`);
console.log(`  desligados[0] typeof:      ${typeof amostraDesligado}  valor: ${amostraDesligado}`);

process.exit(0);
