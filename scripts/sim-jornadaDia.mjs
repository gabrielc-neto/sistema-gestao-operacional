// Reproduz INTEGRALMENTE o que a Function jornadaDia faz pra HOJE,
// usando o mesmo código compartilhado. Mostra naoIniciaram resultante.
// Uso: node scripts/sim-jornadaDia.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { obterMotoristas, obterEventosTempoDirecao } from '../functions/src/sascar/soap.js';
import { calcularJornadas, rangeUtcParaDiaLocal } from '../functions/src/sascar/jornada.js';

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

const hojeBRT = new Date(Date.now() - 3 * 3600_000).toISOString().split('T')[0];
console.log(`Simulando para data: ${hojeBRT}\n`);

const { dataInicio, dataFim } = rangeUtcParaDiaLocal(hojeBRT);

// Step 1: Eventos
console.log('1) Obtendo eventos SASCAR...');
const eventos = await obterEventosTempoDirecao({
  usuario: env.SASCAR_USUARIO,
  senha: env.SASCAR_SENHA,
  dataInicio,
  dataFim,
  quantidade: 3000,
});
console.log(`   Total eventos: ${eventos.length}`);
const idsNoEventos = new Set();
eventos.forEach(e => { if (e.idMotorista && e.idMotorista !== 0) idsNoEventos.add(e.idMotorista); });
console.log(`   Eventos com idMotorista != 0: ${idsNoEventos.size}  → IDs: [${[...idsNoEventos].join(', ')}]`);

// Step 2: Classificação (não relevante pro bug, mas pega pra simular fielmente)
const classificacao = {};
try {
  const snap = await db.collection('motoristas_classificacao').get();
  snap.forEach(doc => { classificacao[doc.id] = doc.data().tipoContrato || 'interno'; });
} catch (e) { /* */ }

// Step 3: Jornadas
const jornadas = calcularJornadas(eventos, hojeBRT, classificacao);
console.log(`\n2) Jornadas calculadas: ${jornadas.length}`);
console.log(`   IDs com jornada: [${jornadas.map(j => j.idMotorista).join(', ') || '(vazio)'}]`);

// Step 4: Roster SASCAR
console.log('\n3) Obtendo roster SASCAR...');
const rosterBruto = await obterMotoristas({ usuario: env.SASCAR_USUARIO, senha: env.SASCAR_SENHA, quantidade: 1000 });
const roster = rosterBruto.filter(m => m.idMotorista && !m.generico);
console.log(`   Roster filtrado: ${roster.length}`);

// Step 5: Desligados
const snapD = await db.collection('motoristas_desligados').get();
const desligados = new Set();
snapD.forEach(doc => desligados.add(Number(doc.id)));
console.log(`\n4) motoristas_desligados: ${desligados.size}  IDs: [${[...desligados].slice(0, 10).join(', ')}...]`);

// Step 6: Ativos
const ativos = roster.filter(m => !desligados.has(m.idMotorista));
console.log(`\n5) Ativos (roster - desligados): ${ativos.length}`);

// Step 7: naoIniciaram
const idsComEvento = new Set(jornadas.map(j => j.idMotorista));
const naoIniciaram = ativos
  .filter(m => !idsComEvento.has(m.idMotorista))
  .map(m => ({ idMotorista: m.idMotorista, nome: m.nome }))
  .sort((a, b) => a.nome.localeCompare(b.nome));

console.log(`\n6) "Não iniciaram" final: ${naoIniciaram.length}`);
console.log('   Lista que volta pro frontend:');
naoIniciaram.forEach((m, i) => console.log(`     ${(i+1).toString().padStart(2)}. [${m.idMotorista}] ${m.nome}`));

// Verifica especificamente os 4 desligados de 18:47
console.log('\n7) Sanity check — os 4 desligados de 18:47 aparecem?');
const IDS_TESTE = [3790446, 3818129, 3898952, 3922437];
for (const id of IDS_TESTE) {
  const ainda = naoIniciaram.find(m => m.idMotorista === id);
  console.log(`   id ${id}  ${ainda ? '⚠ AINDA APARECE → ' + ainda.nome : '✓ filtrado'}`);
}

process.exit(0);
