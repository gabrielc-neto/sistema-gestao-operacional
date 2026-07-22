// Script UNICO USO — zera estoque completamente pra migração limpa Hostinger
// User (Rosilda): "estoque pode zerar todos os produtos ... era tudo aleatorio para testar"
// Data pedido: 2026-07-22
//
// 1. Backup JSON de estoque_itens + estoque_movimentacoes em arquivo/backups/
// 2. Deleta em batches de 400 (limite Firestore 500)
// 3. Confirma contagem final
//
// COMO RODAR (quando quota Firestore voltar, 21h Brasília):
//   cd functions
//   node scripts/zerar-estoque.mjs
//
// Se quota estourar de novo, esperar reset ou ativar plano Blaze.

import admin from 'firebase-admin';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SA_PATH = path.join(__dirname, '..', '..', 'scripts', 'serviceAccountKey.json');
const BACKUP_DIR = path.join(__dirname, '..', '..', 'arquivo', 'backups');

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TS = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

async function backupColecao(nome) {
  console.log(`\n[BACKUP] ${nome}...`);
  const snap = await db.collection(nome).get();
  const dados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
  const path_ = path.join(BACKUP_DIR, `${nome}_${TS}.json`);
  writeFileSync(path_, JSON.stringify(dados, null, 2), 'utf8');
  console.log(`  Salvos ${dados.length} docs em ${path_}`);
  return dados.length;
}

async function apagarColecao(nome) {
  console.log(`\n[DELETE] ${nome}...`);
  let total = 0;
  while (true) {
    const snap = await db.collection(nome).limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    console.log(`  ${total} apagados até agora...`);
    if (snap.size < 400) break;
  }
  console.log(`  Total apagado: ${total}`);
  return total;
}

async function verificar(nome) {
  const snap = await db.collection(nome).limit(1).get();
  return snap.empty;
}

console.log('=== ZERAR ESTOQUE — dados de teste antes de migrar pra Hostinger ===');
console.log('Timestamp:', TS);

try {
  const itens0 = await backupColecao('estoque_itens');
  const movs0 = await backupColecao('estoque_movimentacoes');

  console.log('\n=== APAGANDO ===');
  const itensDel = await apagarColecao('estoque_itens');
  const movsDel = await apagarColecao('estoque_movimentacoes');

  console.log('\n=== VERIFICANDO ===');
  const okItens = await verificar('estoque_itens');
  const okMovs = await verificar('estoque_movimentacoes');

  console.log('\n═══════════════════════════════');
  console.log('RESULTADO:');
  console.log(`  estoque_itens:         ${itens0} salvos em backup · ${itensDel} apagados · vazio agora? ${okItens ? 'SIM' : 'NAO'}`);
  console.log(`  estoque_movimentacoes: ${movs0} salvos em backup · ${movsDel} apagados · vazio agora? ${okMovs ? 'SIM' : 'NAO'}`);
  console.log(`  Backup em: ${BACKUP_DIR}/`);
  console.log('═══════════════════════════════');
} catch (e) {
  console.error('ERRO:', e.message);
  if (e.code === 8 || String(e.message).includes('RESOURCE_EXHAUSTED')) {
    console.log('\nQuota Firestore esgotada. Reset: 21h Brasilia. Aguarde e rode de novo.');
  }
  process.exit(1);
}
process.exit(0);
