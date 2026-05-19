// Verifica quais caminhões da frota estão com iButton ativo
// (motorista identificado no pacote SASCAR)
// Uso: node scripts/verificar-ibutton.mjs

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

const ENDPOINT = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService';

function envelope(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ws="http://webservice.web.integracao.sascar.com.br/">
  <soapenv:Header/>
  <soapenv:Body>${body}</soapenv:Body>
</soapenv:Envelope>`;
}

async function soapCall(body) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
    body: envelope(body),
  });
  const text = await res.text();
  if (text.includes('<faultstring>')) {
    throw new Error('FAULT: ' + text.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1]);
  }
  return text;
}

console.log('[1/2] Buscando lista de veículos cadastrados...');
const t0 = Date.now();
const vBody = await soapCall(
  `<ws:obterVeiculos><usuario>${env.SASCAR_USUARIO}</usuario><senha>${env.SASCAR_SENHA}</senha><quantidade>1000</quantidade><idVeiculo>0</idVeiculo></ws:obterVeiculos>`
);
const veiculos = [...vBody.matchAll(/<return>([\s\S]*?)<\/return>/g)].map(m => {
  const b = m[1];
  const get = t => b.match(new RegExp(`<${t}>([^<]*)<\\/${t}>`))?.[1] ?? '';
  return { idVeiculo: get('idVeiculo'), placa: get('placa') };
});
console.log(`     ${veiculos.length} veículos cadastrados (${Date.now() - t0}ms)`);

console.log('[2/2] Buscando pacotes de posição (últimas 24h)...');
const t1 = Date.now();
const pBody = await soapCall(
  `<ws:obterPacotePosicoesMotorista><usuario>${env.SASCAR_USUARIO}</usuario><senha>${env.SASCAR_SENHA}</senha><quantidade>3000</quantidade></ws:obterPacotePosicoesMotorista>`
);
const pacotes = [...pBody.matchAll(/<return>([\s\S]*?)<\/return>/g)].map(m => {
  const b = m[1];
  const get = t => b.match(new RegExp(`<${t}>([^<]*)<\\/${t}>`))?.[1] ?? '';
  return {
    idVeiculo: get('idVeiculo'),
    dataPosicao: get('dataPosicao'),
    idMotorista: get('idMotorista'),
    nomeMotorista: get('nomeMotorista'),
    ignicao: get('ignicao'),
    velocidade: get('velocidade'),
  };
});
console.log(`     ${pacotes.length} pacotes nas últimas 24h (${Date.now() - t1}ms)`);

// Agrupa por veículo: motoristas que logaram + último pacote
const porVeiculo = new Map();
for (const v of veiculos) porVeiculo.set(v.idVeiculo, { placa: v.placa, motoristas: new Set(), ultimo: null, totalPacotes: 0, pacotesComMotorista: 0 });
for (const p of pacotes) {
  const reg = porVeiculo.get(p.idVeiculo);
  if (!reg) continue;
  reg.totalPacotes++;
  const temMotorista = p.idMotorista && p.idMotorista !== '0' && p.nomeMotorista && p.nomeMotorista.trim();
  if (temMotorista) {
    reg.motoristas.add(`${p.nomeMotorista.trim()} (id ${p.idMotorista})`);
    reg.pacotesComMotorista++;
  }
  if (!reg.ultimo || p.dataPosicao > reg.ultimo.dataPosicao) reg.ultimo = p;
}

const ordenados = [...porVeiculo.values()].sort((a, b) => a.placa.localeCompare(b.placa));

console.log('\n=========================================================================');
console.log(' RELATÓRIO iButton — Pontual Logística');
console.log('=========================================================================');
console.log('Placa     | Pkts | C/mot | Motorista(s) logado(s) nas últimas 24h');
console.log('----------+------+-------+--------------------------------------------------');

let comIButton = 0, semIButton = 0, semDados = 0;
const motoristasUnicos = new Set();

for (const r of ordenados) {
  if (r.totalPacotes === 0) {
    console.log(`${r.placa.padEnd(9)} |    0 |     - | (sem pacotes nas últimas 24h)`);
    semDados++;
    continue;
  }
  if (r.motoristas.size === 0) {
    console.log(`${r.placa.padEnd(9)} | ${String(r.totalPacotes).padStart(4)} |     0 | ❌ SEM iButton ativo`);
    semIButton++;
  } else {
    const lista = [...r.motoristas].join(', ');
    console.log(`${r.placa.padEnd(9)} | ${String(r.totalPacotes).padStart(4)} | ${String(r.pacotesComMotorista).padStart(5)} | ✅ ${lista}`);
    comIButton++;
    r.motoristas.forEach(m => motoristasUnicos.add(m));
  }
}

console.log('=========================================================================');
console.log(' RESUMO');
console.log('=========================================================================');
console.log(`Total veículos cadastrados:       ${veiculos.length}`);
console.log(`✅ Com iButton ativo:             ${comIButton}  (${(comIButton/veiculos.length*100).toFixed(0)}%)`);
console.log(`❌ Sem iButton (mas com pacotes): ${semIButton}  (${(semIButton/veiculos.length*100).toFixed(0)}%)`);
console.log(`⚪ Sem dados nas últimas 24h:    ${semDados}  (${(semDados/veiculos.length*100).toFixed(0)}%)`);
console.log(`Motoristas únicos identificados:  ${motoristasUnicos.size}`);

console.log('\n=========================================================================');
console.log(' DIAGNÓSTICO');
console.log('=========================================================================');
if (comIButton === 0) {
  console.log('🔴 NENHUM caminhão tem iButton ativo.');
  console.log('   → Ligar pra SASCAR comercial e pedir orçamento do módulo "Identificação do Motorista"');
  console.log('   → Sem isso, jornada só funciona POR VEÍCULO, não por motorista');
} else if (comIButton === veiculos.length) {
  console.log('🟢 FROTA INTEIRA tem iButton ativo. Bora codar a jornada!');
} else if (comIButton / veiculos.length >= 0.8) {
  console.log(`🟡 Maioria (${comIButton}/${veiculos.length}) tem iButton.`);
  console.log('   → Dá pra começar a jornada AGORA pros que têm');
  console.log('   → Pressionar os motoristas dos demais a usar a pastilha');
} else {
  console.log(`🟠 Só ${comIButton}/${veiculos.length} tem iButton.`);
  console.log('   → Decisão: começar piloto com os que têm OU contratar antes pros demais');
}
