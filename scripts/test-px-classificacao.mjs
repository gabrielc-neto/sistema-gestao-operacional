// Teste de integração: marca um motorista como PX, verifica recálculo, reverte.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KEY_PATH = 'C:/Users/Logistica01/projetos/logistica-ia/scripts/serviceAccountKey.json';
const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
initializeApp({ credential: cert(key) });
const db = getFirestore();

const ENDPOINT = 'http://127.0.0.1:5001/pontual-logistica/southamerica-east1/jornadaDia';
const DATA = '2026-05-19'; // dia com dados
const ALVO_NOME = 'ADAM';

async function chamarJornada() {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-dev-bypass': 'true' },
    body: JSON.stringify({ data: { data: DATA } }),
  });
  const j = await res.json();
  return j.result.jornadas;
}

function acharAlvo(jornadas) {
  return jornadas.find(x => x.nomeMotorista.startsWith(ALVO_NOME));
}

console.log('=== TESTE PX — motorista', ALVO_NOME, 'em', DATA, '===\n');

// 1. Estado inicial
let jor = await chamarJornada();
let alvo = acharAlvo(jor);
const idMot = alvo.idMotorista;
console.log('1. ESTADO INICIAL:');
console.log('   tipoContrato:', alvo.tipoContrato);
console.log('   total:', alvo.totalAtivo, '| extra50:', alvo.extra50, '| extra100:', alvo.extra100);
console.log('   infrações:', alvo.infracoes.map(i => i.tipo).join(', ') || 'nenhuma');

// 2. Marca como PX
console.log('\n2. Marcando', ALVO_NOME, '(ID', idMot, ') como PX...');
await db.collection('motoristas_classificacao').doc(String(idMot)).set({
  nome: alvo.nomeMotorista, tipoContrato: 'px', atualizadoEm: new Date().toISOString(),
});
// pequena espera pra cache de eventos não atrapalhar (classificação é fora do cache)
await new Promise(r => setTimeout(r, 1500));

jor = await chamarJornada();
alvo = acharAlvo(jor);
console.log('   tipoContrato:', alvo.tipoContrato, alvo.tipoContrato === 'px' ? '✓' : '✗ FALHOU');
console.log('   total:', alvo.totalAtivo, '| extra50:', alvo.extra50, '| extra100:', alvo.extra100);
console.log('   extras zerados?', (alvo.extra50Min === 0 && alvo.extra100Min === 0) ? '✓ SIM' : '✗ NÃO');
console.log('   infrações:', alvo.infracoes.map(i => i.tipo).join(', ') || 'nenhuma');
console.log('   tem JORNADA_PX_EXCEDIDA se >13h?', alvo.totalAtivoMin > 780 ? (alvo.infracoes.some(i=>i.tipo==='JORNADA_PX_EXCEDIDA') ? '✓ SIM' : '✗ NÃO') : '(jornada < 13h, não aplica)');

// 3. Reverte pra interno
console.log('\n3. Revertendo pra interno...');
await db.collection('motoristas_classificacao').doc(String(idMot)).set({
  nome: alvo.nomeMotorista, tipoContrato: 'interno', atualizadoEm: new Date().toISOString(),
});
await new Promise(r => setTimeout(r, 1500));
jor = await chamarJornada();
alvo = acharAlvo(jor);
console.log('   tipoContrato:', alvo.tipoContrato, alvo.tipoContrato === 'interno' ? '✓ revertido' : '✗');
console.log('   extra50 voltou?', alvo.extra50);

// limpa o doc de teste
await db.collection('motoristas_classificacao').doc(String(idMot)).delete();
console.log('\n✓ Doc de teste removido. Teste concluído.');
process.exit(0);
