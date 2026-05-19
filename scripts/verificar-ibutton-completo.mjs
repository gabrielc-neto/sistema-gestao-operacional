// Diagnóstico completo: motoristas cadastrados + equipamento por veículo
// Uso: node scripts/verificar-ibutton-completo.mjs

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

function env_(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ws="http://webservice.web.integracao.sascar.com.br/">
  <soapenv:Header/>
  <soapenv:Body>${body}</soapenv:Body>
</soapenv:Envelope>`;
}

async function soap(body) {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
    body: env_(body),
  });
  return await r.text();
}

// ---------- 1. Motoristas cadastrados na conta SASCAR ----------
console.log('[1/2] Buscando motoristas cadastrados na conta SASCAR...');
const t0 = Date.now();
const mBody = await soap(
  `<ws:obterMotoristas><usuario>${env.SASCAR_USUARIO}</usuario><senha>${env.SASCAR_SENHA}</senha><quantidade>500</quantidade><idMotorista>0</idMotorista></ws:obterMotoristas>`
);
const motoristas = [...mBody.matchAll(/<return>([\s\S]*?)<\/return>/g)].map(m => {
  const b = m[1];
  const get = t => b.match(new RegExp(`<${t}>([^<]*)<\\/${t}>`))?.[1] ?? '';
  return {
    idMotorista: get('idMotorista'),
    nome: get('nome'),
    cpf: get('cpf'),
    matricula: get('matricula'),
    ibutton: get('ibutton'),
  };
});
console.log(`     ${motoristas.length} motoristas cadastrados (${Date.now() - t0}ms)\n`);

console.log('=========================================================================');
console.log(' MOTORISTAS CADASTRADOS NA SASCAR');
console.log('=========================================================================');
console.log('ID         | Nome                                | CPF         | iButton ID');
console.log('-----------+-------------------------------------+-------------+-------------');
let comIButton = 0;
for (const m of motoristas) {
  const tem = m.ibutton && m.ibutton.trim() && m.ibutton !== '0' ? '✅' : '❌';
  if (m.ibutton && m.ibutton.trim() && m.ibutton !== '0') comIButton++;
  console.log(`${m.idMotorista.padEnd(10)} | ${(m.nome || '?').slice(0, 35).padEnd(35)} | ${(m.cpf || '-').padEnd(11)} | ${tem} ${m.ibutton || '-'}`);
}
console.log(`\nTotal: ${motoristas.length} cadastrados | Com iButton vinculado: ${comIButton} (${(comIButton/motoristas.length*100).toFixed(0)}%)`);

// ---------- 2. Veículos + equipamento ----------
console.log('\n[2/2] Verificando equipamento dos veículos...');
const t1 = Date.now();
const vBody = await soap(
  `<ws:obterVeiculos><usuario>${env.SASCAR_USUARIO}</usuario><senha>${env.SASCAR_SENHA}</senha><quantidade>1000</quantidade><idVeiculo>0</idVeiculo></ws:obterVeiculos>`
);
const veiculos = [...vBody.matchAll(/<return>([\s\S]*?)<\/return>/g)].map(m => {
  const b = m[1];
  const get = t => b.match(new RegExp(`<${t}>([^<]*)<\\/${t}>`))?.[1] ?? '';
  return {
    idVeiculo: get('idVeiculo'),
    placa: get('placa'),
    idEquipamento: get('idEquipamento'),
    idEquipamentoDesc: get('idEquipamentoDesc'),
    serieEquipamento: get('serieEquipamento'),
    modeloEquipamento: get('modeloEquipamento'),
  };
});
console.log(`     ${veiculos.length} veículos (${Date.now() - t1}ms)\n`);

console.log('=========================================================================');
console.log(' EQUIPAMENTOS POR VEÍCULO');
console.log('=========================================================================');
console.log('Placa     | Modelo equipamento                    | Série');
console.log('----------+---------------------------------------+----------------');
const modelos = new Map();
for (const v of veiculos.sort((a, b) => a.placa.localeCompare(b.placa))) {
  const mod = v.modeloEquipamento || v.idEquipamentoDesc || '?';
  console.log(`${v.placa.padEnd(9)} | ${mod.slice(0, 37).padEnd(37)} | ${v.serieEquipamento || '-'}`);
  modelos.set(mod, (modelos.get(mod) || 0) + 1);
}

console.log('\n=========================================================================');
console.log(' MODELOS DE EQUIPAMENTO NA FROTA');
console.log('=========================================================================');
for (const [m, qtd] of [...modelos.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(qtd).padStart(3)}x  ${m}`);
}
