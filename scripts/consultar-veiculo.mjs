import admin from 'firebase-admin';
import fs from 'node:fs';

const key = JSON.parse(fs.readFileSync('C:/Users/Logistica01/projetos/logistica-ia/scripts/serviceAccountKey.json','utf-8'));
admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

const placas = (process.argv.slice(2).length ? process.argv.slice(2) : ['AKD5988','BBE9588']).map(p=>p.toUpperCase());

for (const placa of placas) {
  console.log(`\n===== ${placa} =====`);
  const snap = await db.collection('veiculos').where('placa','==',placa).get();
  if (snap.empty) {
    console.log('❌ NÃO encontrado em veiculos');
    continue;
  }
  snap.forEach(doc => {
    const v = doc.data();
    console.log(`✓ ID: ${doc.id}`);
    const campos = ['placa','tipo','tipo_conjunto','marca','modelo','ano_fab','chassi','renavam','tara','cap','comp','eixos','motorista','status','bloqueio','ativo','atrelamento','carreta','cavalo','conjunto','frota','obs'];
    for (const c of campos) if (v[c] !== undefined) console.log(`  ${c}:`, typeof v[c]==='object' ? JSON.stringify(v[c]) : v[c]);
  });

  // Ver atrelamentos: outras placas que apontam pra esta ou vice-versa
  const asCavalo = await db.collection('veiculos').where('cavalo_atual','==',placa).get();
  if (!asCavalo.empty) {
    console.log(`  → CARRETAS ATRELADAS (${asCavalo.size}):`);
    asCavalo.forEach(d => { const x = d.data(); console.log(`    - ${x.placa} (${x.tipo||'?'})`); });
  }
  const asCarreta = await db.collection('veiculos').where('carreta_atual','==',placa).get();
  if (!asCarreta.empty) {
    console.log(`  → PUXADO POR:`);
    asCarreta.forEach(d => { const x = d.data(); console.log(`    - ${x.placa} (${x.tipo||'?'})`); });
  }
}

// Listar campo bruto pra saber quais existem
console.log('\n--- amostra de campos disponíveis ---');
const amostra = await db.collection('veiculos').limit(1).get();
amostra.forEach(d=>console.log(Object.keys(d.data()).sort().join(', ')));

process.exit(0);
