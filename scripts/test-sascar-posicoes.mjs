// Teste obterPacotePosicoes — pega últimos pacotes GPS da frota
// ATENÇÃO: este método tem rate limit de 1 chamada simultânea por integradora
// Uso: node scripts/test-sascar-posicoes.mjs [quantidade]

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const QTD = process.argv[2] || '100';
const ENDPOINT = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService';

const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ws="http://webservice.web.integracao.sascar.com.br/">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:obterPacotePosicoes>
      <usuario>${env.SASCAR_USUARIO}</usuario>
      <senha>${env.SASCAR_SENHA}</senha>
      <quantidade>${QTD}</quantidade>
    </ws:obterPacotePosicoes>
  </soapenv:Body>
</soapenv:Envelope>`;

console.log(`[obterPacotePosicoes] qtd=${QTD}`);
const t0 = Date.now();

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
  body: envelope,
});
const elapsed = Date.now() - t0;
const body = await res.text();
console.log(`HTTP ${res.status} (${elapsed}ms) — ${(body.length / 1024).toFixed(1)} KB`);
console.log('---');

if (body.includes('<faultstring>')) {
  console.error('FAULT:', body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1]);
  process.exit(2);
}

// Mapeia idVeiculo -> placa (faz uma chamada extra de obterVeiculos)
const veicEnv = envelope.replace(
  /<ws:obterPacotePosicoes>[\s\S]*?<\/ws:obterPacotePosicoes>/,
  `<ws:obterVeiculos><usuario>${env.SASCAR_USUARIO}</usuario><senha>${env.SASCAR_SENHA}</senha><quantidade>1000</quantidade><idVeiculo>0</idVeiculo></ws:obterVeiculos>`
);
const vRes = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' }, body: veicEnv });
const vBody = await vRes.text();
const placaPorId = new Map();
[...vBody.matchAll(/<return>([\s\S]*?)<\/return>/g)].forEach(m => {
  const b = m[1];
  const id = b.match(/<idVeiculo>([^<]+)<\/idVeiculo>/)?.[1];
  const placa = b.match(/<placa>([^<]+)<\/placa>/)?.[1];
  if (id && placa) placaPorId.set(id, placa);
});

// Parse pacotes
const pacotes = [...body.matchAll(/<return>([\s\S]*?)<\/return>/g)].map(m => {
  const b = m[1];
  const get = (tag) => b.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`))?.[1] ?? '';
  return {
    idVeiculo: get('idVeiculo'),
    dataPosicao: get('dataPosicao'),
    lat: get('latitude'),
    lon: get('longitude'),
    velocidade: get('velocidade'),
    ignicao: get('ignicao'),
    bloqueio: get('bloqueio'),
    gps: get('gps'),
    uf: get('uf'),
    cidade: get('cidade'),
    rua: get('rua'),
    pontoReferencia: get('pontoReferencia'),
  };
});

console.log(`Pacotes recebidos: ${pacotes.length}`);

// Última posição por veículo
const ultimaPorVeiculo = new Map();
for (const p of pacotes) {
  const cur = ultimaPorVeiculo.get(p.idVeiculo);
  if (!cur || p.dataPosicao > cur.dataPosicao) ultimaPorVeiculo.set(p.idVeiculo, p);
}

console.log(`Veículos únicos com posição: ${ultimaPorVeiculo.size}`);
console.log('---');
console.log('Placa     | Data/hora           | Vel | Ig | Bl | GPS | Cidade/UF');
console.log('----------+---------------------+-----+----+----+-----+--------------------------');

const ordenados = [...ultimaPorVeiculo.values()].sort((a, b) =>
  (placaPorId.get(a.idVeiculo) || '').localeCompare(placaPorId.get(b.idVeiculo) || '')
);

for (const p of ordenados) {
  const placa = placaPorId.get(p.idVeiculo) || `id${p.idVeiculo}`;
  const dt = p.dataPosicao.replace('T', ' ').slice(0, 19);
  const ign = p.ignicao === '1' ? 'ON ' : 'off';
  const blo = p.bloqueio === '1' ? 'BL!' : ' ok';
  const gps = p.gps === '1' ? '✓' : '✗';
  console.log(`${placa.padEnd(9)} | ${dt.padEnd(19)} | ${p.velocidade.padStart(3)} | ${ign} | ${blo} | ${gps.padStart(3)} | ${p.cidade}/${p.uf}`);
}

console.log('---');
const movendo = ordenados.filter(p => Number(p.velocidade) > 0).length;
const ligados = ordenados.filter(p => p.ignicao === '1').length;
const bloqueados = ordenados.filter(p => p.bloqueio === '1').length;
console.log(`Em movimento: ${movendo}  |  Ignição ligada: ${ligados}  |  Bloqueados: ${bloqueados}`);
