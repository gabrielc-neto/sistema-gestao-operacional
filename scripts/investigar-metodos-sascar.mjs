// Investiga métodos SasIntegra relacionados a identificação via tablet/MDT
// Testa em sequência os 4 métodos chave pra descobrir como a identificação por tablet aparece
// Uso: node scripts/investigar-metodos-sascar.mjs

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

async function soap(name, body) {
  const t = Date.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
    body: env_(body),
  });
  const text = await res.text();
  const ms = Date.now() - t;
  if (text.includes('<faultstring>')) {
    const f = text.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1];
    return { ok: false, fault: f, ms, raw: text };
  }
  return { ok: true, ms, raw: text };
}

function extractReturns(xml) {
  return [...xml.matchAll(/<return>([\s\S]*?)<\/return>/g)].map(m => {
    const obj = {};
    [...m[1].matchAll(/<(\w+)>([^<]*)<\/\1>/g)].forEach(t => {
      obj[t[1]] = t[2];
    });
    return obj;
  });
}

const auth = `<usuario>${env.SASCAR_USUARIO}</usuario><senha>${env.SASCAR_SENHA}</senha>`;

// Data de hoje e ontem (UTC)
const hoje = new Date();
const ontem = new Date(hoje.getTime() - 24 * 3600 * 1000);
function fmt(d) {
  const Y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, '0');
  const D = String(d.getUTCDate()).padStart(2, '0');
  return `${Y}-${M}-${D}`;
}
const dataInicio = `${fmt(ontem)} 00:00:00`;
const dataFim = `${fmt(hoje)} 23:59:00`;

console.log(`Janela de busca: ${dataInicio} → ${dataFim}\n`);

// ============================================================
// MÉTODO 1: obterEventosTempoDirecao (TABLET SasMDT) — O OURO
// ============================================================
console.log('═══════════════════════════════════════════════════════════════════════');
console.log(' MÉTODO 1: obterEventosTempoDirecao');
console.log(' "Eventos enviados pelo motorista via tablet SasMDT"');
console.log(' (Jornada, Dirigindo, Pausa, Parada, Refeição, Esperar, Encerrar, Trocar)');
console.log('═══════════════════════════════════════════════════════════════════════');
const r1 = await soap('obterEventosTempoDirecao',
  `<ws:obterEventosTempoDirecao>${auth}<quantidade>500</quantidade><dataInicio>${dataInicio}</dataInicio><dataFim>${dataFim}</dataFim></ws:obterEventosTempoDirecao>`);
if (!r1.ok) {
  console.log(`❌ FALHA (${r1.ms}ms): ${r1.fault}`);
} else {
  const eventos = extractReturns(r1.raw);
  console.log(`✅ OK (${r1.ms}ms) — ${eventos.length} eventos`);
  if (eventos.length > 0) {
    const tipos = new Map();
    const motoristas = new Set();
    for (const e of eventos) {
      const desc = e.descricaoEventoTempoDirecao || `id${e.eventoTempoDirecao}`;
      tipos.set(desc, (tipos.get(desc) || 0) + 1);
      if (e.nomeMotorista) motoristas.add(e.nomeMotorista);
    }
    console.log(`   Motoristas únicos: ${motoristas.size}`);
    console.log(`   Tipos de evento:`);
    [...tipos.entries()].sort((a, b) => b[1] - a[1]).forEach(([t, n]) =>
      console.log(`      ${String(n).padStart(4)}x  ${t}`));
    console.log(`\n   📋 Primeiros 5 eventos:`);
    eventos.slice(0, 5).forEach(e => {
      console.log(`      ${e.dataInicio} | ${e.placa || '?'} | ${(e.nomeMotorista || '?').padEnd(30)} | ${e.descricaoEventoTempoDirecao || '?'}`);
    });
  } else {
    console.log('   ⚠️ Lista vazia — motoristas não estão registrando eventos no tablet');
  }
}

// ============================================================
// MÉTODO 2: obterMotoristasVeiculos (vínculo cadastrado)
// ============================================================
console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log(' MÉTODO 2: obterMotoristasVeiculos');
console.log(' "Vínculo cadastrado motorista ↔ veículo no portal SASCAR"');
console.log('═══════════════════════════════════════════════════════════════════════');
const r2 = await soap('obterMotoristasVeiculos',
  `<ws:obterMotoristasVeiculos>${auth}<quantidade>1000</quantidade><idMotoristaVeiculo>0</idMotoristaVeiculo></ws:obterMotoristasVeiculos>`);
if (!r2.ok) {
  console.log(`❌ FALHA (${r2.ms}ms): ${r2.fault}`);
} else {
  const vinculos = extractReturns(r2.raw);
  console.log(`✅ OK (${r2.ms}ms) — ${vinculos.length} vínculos cadastrados`);
  if (vinculos.length > 0) {
    console.log(`\n   Primeiros 10 vínculos:`);
    vinculos.slice(0, 10).forEach(v =>
      console.log(`      motorista=${v.idMotorista} ↔ veiculo=${v.idVeiculo}`));
  }
}

// ============================================================
// MÉTODO 3: obterLayoutTecladoVeiculos (tipo de teclado/tablet)
// ============================================================
console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log(' MÉTODO 3: obterLayoutTecladoVeiculos');
console.log(' "Qual tipo de teclado/tablet cada caminhão tem"');
console.log('═══════════════════════════════════════════════════════════════════════');
const r3 = await soap('obterLayoutTecladoVeiculos',
  `<ws:obterLayoutTecladoVeiculos>${auth}</ws:obterLayoutTecladoVeiculos>`);
if (!r3.ok) {
  console.log(`❌ FALHA (${r3.ms}ms): ${r3.fault}`);
} else {
  const layouts = extractReturns(r3.raw);
  console.log(`✅ OK (${r3.ms}ms) — ${layouts.length} veículos com teclado`);
  if (layouts.length > 0) {
    const tipos = new Map();
    for (const l of layouts) {
      const t = l.tipoLayout || '?';
      tipos.set(t, (tipos.get(t) || 0) + 1);
    }
    console.log(`\n   Distribuição por tipo:`);
    [...tipos.entries()].forEach(([t, n]) =>
      console.log(`      ${String(n).padStart(3)}x  ${t}`));
    console.log(`\n   Primeiros 5 vínculos:`);
    layouts.slice(0, 5).forEach(l =>
      console.log(`      veiculo=${l.idVeiculo} | layout=${l.idLayout} | tipo=${l.tipoLayout}`));
  }
}

// ============================================================
// MÉTODO 4: obterEventoTelemetriaIntegracao (telemetria + loginMotorista)
// ============================================================
console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log(' MÉTODO 4: obterEventoTelemetriaIntegracao');
console.log(' "Eventos de telemetria — campo `loginMotorista` revela quem tava no tablet"');
console.log('═══════════════════════════════════════════════════════════════════════');
// Precisa de idVeiculo específico — usa AKD5988 (sabemos que tem motorista)
// idVeiculo do AKD5988 conhecido do diagnóstico anterior... vamos buscar dinâmico
console.log('   (Buscando veículos primeiro pra pegar idVeiculo)');
const rv = await soap('obterVeiculos',
  `<ws:obterVeiculos>${auth}<quantidade>1000</quantidade><idVeiculo>0</idVeiculo></ws:obterVeiculos>`);
const veiculos = extractReturns(rv.raw);
console.log(`   Testando com 3 veículos de motoristas conhecidos (Haroldo, Cosme, Valderei)...`);

const placasTeste = ['AKD5988', 'BBE9588-2', 'SFL4G38-1'];
for (const placa of placasTeste) {
  const v = veiculos.find(x => x.placa === placa);
  if (!v) continue;
  const r4 = await soap('obterEventoTelemetriaIntegracao',
    `<ws:obterEventoTelemetriaIntegracao>${auth}<dataInicio>${dataInicio}</dataInicio><dataFinal>${dataFim}</dataFinal><idVeiculo>${v.idVeiculo}</idVeiculo></ws:obterEventoTelemetriaIntegracao>`);
  if (!r4.ok) {
    console.log(`   ❌ ${placa}: ${r4.fault}`);
    continue;
  }
  const evs = extractReturns(r4.raw);
  console.log(`   ✅ ${placa}: ${evs.length} eventos (${r4.ms}ms)`);
  if (evs.length > 0) {
    const motoristas = new Set();
    evs.forEach(e => {
      if (e.nomeMotorista && e.nomeMotorista !== 'Sem motorista') {
        motoristas.add(`${e.nomeMotorista} (login=${e.loginMotorista})`);
      }
    });
    if (motoristas.size > 0) {
      console.log(`      Motoristas identificados:`);
      [...motoristas].forEach(m => console.log(`         - ${m}`));
    }
  }
}

console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log(' VEREDITO');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('Ver análise no terminal acima — método 1 (obterEventosTempoDirecao)');
console.log('é o que devolve eventos do TABLET. Se método 1 trouxe dados, jornada');
console.log('é trivial. Se vazio, motoristas não usam botões do tablet (só dirigem).');
