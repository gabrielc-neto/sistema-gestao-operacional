// Debug uma placa específica: mostra idVeiculo, último pacote SOAP cru, e doc Firestore.
// Uso: node scripts/debug-veiculo.mjs SEF1H32

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Match parcial: aceita 'SEF1H32' encontrar 'SEF1H32-2'. So compara letras/numeros.
const PLACA_ALVO = (process.argv[2] || 'SEF1H32').toUpperCase().replace(/[^A-Z0-9]/g, '');

const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const ENDPOINT = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService';

// 1) obterVeiculos -> idVeiculo, placa, idEquipamento
const veicEnv = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://webservice.web.integracao.sascar.com.br/">
  <soapenv:Body><ws:obterVeiculos>
    <usuario>${env.SASCAR_USUARIO}</usuario><senha>${env.SASCAR_SENHA}</senha>
    <quantidade>1000</quantidade><idVeiculo>0</idVeiculo>
  </ws:obterVeiculos></soapenv:Body>
</soapenv:Envelope>`;

console.log(`Procurando ${PLACA_ALVO}...`);
const vRes = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' }, body: veicEnv });
const vBody = await vRes.text();

const matches = [];
[...vBody.matchAll(/<return>([\s\S]*?)<\/return>/g)].forEach(m => {
  const b = m[1];
  const get = (t) => b.match(new RegExp(`<${t}>([^<]*)<\\/${t}>`))?.[1] ?? '';
  const placaCru = get('placa');
  const placaNorm = placaCru.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Match exato OU "PLACA_ALVO + um sufixo curto" (cobre SEF1H32 vs SEF1H32-2 → 'SEF1H322')
  if (placaNorm === PLACA_ALVO || placaNorm.startsWith(PLACA_ALVO)) {
    matches.push({
      idVeiculo: get('idVeiculo'),
      placa: placaCru,
      idEquipamento: get('idEquipamento'),
      idEquipamentoDesc: get('idEquipamentoDesc'),
      ativo: get('ativo'),
      tipoFrota: get('tipoFrota'),
    });
  }
});

if (matches.length === 0) {
  console.error(`✗ Placa ${PLACA_ALVO} NAO encontrada no cadastro SASCAR`);
  process.exit(2);
}
if (matches.length > 1) {
  console.warn(`⚠ ${matches.length} veiculos com a mesma placa no cadastro:`);
  matches.forEach(m => console.warn(`  id=${m.idVeiculo}  equip=${m.idEquipamentoDesc}  ativo=${m.ativo}`));
}
console.log('\n=== CADASTRO SASCAR ===');
matches.forEach(m => console.log(JSON.stringify(m, null, 2)));

const idsAlvo = new Set(matches.map(m => m.idVeiculo));

// 2) obterPacotePosicoesMotorista (último por veículo)
const pkgEnv = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://webservice.web.integracao.sascar.com.br/">
  <soapenv:Body><ws:obterPacotePosicoesMotorista>
    <usuario>${env.SASCAR_USUARIO}</usuario><senha>${env.SASCAR_SENHA}</senha><quantidade>3000</quantidade>
  </ws:obterPacotePosicoesMotorista></soapenv:Body>
</soapenv:Envelope>`;

const pRes = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' }, body: pkgEnv });
const pBody = await pRes.text();

const pacotesAlvo = [];
[...pBody.matchAll(/<return>([\s\S]*?)<\/return>/g)].forEach(m => {
  const b = m[1];
  const get = (t) => b.match(new RegExp(`<${t}>([^<]*)<\\/${t}>`))?.[1] ?? '';
  const idV = get('idVeiculo');
  if (idsAlvo.has(idV)) {
    pacotesAlvo.push({
      idVeiculo: idV,
      idPacote: get('idPacote'),
      dataPosicao: get('dataPosicao'),
      latitude: get('latitude'),
      longitude: get('longitude'),
      velocidade: get('velocidade'),
      direcao: get('direcao'),
      ignicao: get('ignicao'),
      gps: get('gps'),
      bloqueio: get('bloqueio'),
      cidade: get('cidade'),
      uf: get('uf'),
      rua: get('rua'),
      idMotorista: get('idMotorista'),
      nomeMotorista: get('nomeMotorista'),
    });
  }
});

console.log(`\n=== PACOTES SOAP RECEBIDOS (${pacotesAlvo.length}) ===`);
if (pacotesAlvo.length === 0) {
  console.log('Nenhum pacote desse veiculo no obterPacotePosicoesMotorista mais recente.');
} else {
  // Mais recente primeiro
  pacotesAlvo.sort((a, b) => (b.dataPosicao || '').localeCompare(a.dataPosicao || ''));
  pacotesAlvo.slice(0, 5).forEach((p, i) => {
    console.log(`\n[${i+1}] ${p.dataPosicao}`);
    console.log(`  lat,lng:  ${p.latitude}, ${p.longitude}`);
    console.log(`  vel:      ${p.velocidade} km/h    dir: ${p.direcao}°`);
    console.log(`  ign:      ${p.ignicao}    gps: ${p.gps}    bloq: ${p.bloqueio}`);
    console.log(`  cidade:   ${p.cidade}/${p.uf}`);
    console.log(`  rua:      ${p.rua || '(vazio)'}`);
    console.log(`  mot:      ${p.idMotorista} - ${p.nomeMotorista || '(nao logado)'}`);
    console.log(`  idPacote: ${p.idPacote}`);
    console.log(`  Google Maps: https://www.google.com/maps?q=${p.latitude},${p.longitude}`);
  });
}

// 3) Firestore sascar_posicoes/{idVeiculo}
try {
  const keyPath = resolve(__dirname, 'serviceAccountKey.json');
  initializeApp({ credential: cert(keyPath), projectId: 'pontual-logistica' });
  const db = getFirestore();

  console.log('\n=== FIRESTORE sascar_posicoes ===');
  for (const id of idsAlvo) {
    const doc = await db.collection('sascar_posicoes').doc(String(id)).get();
    if (!doc.exists) { console.log(`id=${id}: DOC NAO EXISTE`); continue; }
    const d = doc.data();
    const p = d.ultimaPosicao || {};
    console.log(`\nid=${id}  placa=${d.placa}  equip=${d.idEquipamentoDesc}`);
    console.log(`  dataPosicao: ${p.dataPosicao}`);
    console.log(`  lat,lng:     ${p.latitude}, ${p.longitude}`);
    console.log(`  vel:         ${p.velocidade}    dir: ${p.direcao}°`);
    console.log(`  status:      ${p.statusTexto}`);
    console.log(`  cidade:      ${p.cidade}/${p.uf}`);
    console.log(`  rua:         ${p.rua || '(vazio)'}`);
    console.log(`  idPacote:    ${p.idPacote}`);
    console.log(`  Google Maps: https://www.google.com/maps?q=${p.latitude},${p.longitude}`);
    console.log(`  atualizadoEm: ${d.atualizadoEm?.toDate?.()?.toISOString?.() || '?'}`);
  }
} catch (e) {
  console.error('\n[Firestore] erro:', e.message);
}

process.exit(0);
