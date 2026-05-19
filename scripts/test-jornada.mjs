// Testa o cálculo de jornada chamando obterEventosTempoDirecao + calcularJornadas
// Uso: node scripts/test-jornada.mjs [YYYY-MM-DD]

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { obterEventosTempoDirecao } from '../functions/src/sascar/soap.js';
import { calcularJornadas, rangeUtcParaDiaLocal } from '../functions/src/sascar/jornada.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

// Data: argumento ou hoje
function hojeISO() {
  const d = new Date();
  d.setHours(d.getHours() - 3); // converter pra BRT pra pegar "o dia daqui"
  return d.toISOString().split('T')[0];
}
const data = process.argv[2] || hojeISO();

console.log(`\n📅 Calculando jornada para: ${data} (UTC-3 / Brasília)\n`);

const { dataInicio, dataFim } = rangeUtcParaDiaLocal(data);
console.log(`Janela SASCAR (UTC): ${dataInicio} → ${dataFim}\n`);

const t0 = Date.now();
const eventos = await obterEventosTempoDirecao({
  usuario: env.SASCAR_USUARIO,
  senha: env.SASCAR_SENHA,
  dataInicio,
  dataFim,
  quantidade: 3000,
});
console.log(`✅ ${eventos.length} eventos brutos em ${Date.now() - t0}ms\n`);

const jornadas = calcularJornadas(eventos, data);
console.log(`✅ ${jornadas.length} motoristas com jornada calculada\n`);

console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log(' TOP 10 MAIORES JORNADAS');
console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log('Motorista                          | Placa(s)      | Total | Dirig | Refei | Pausa | Ex50 | Ex100 | Inf');
console.log('-----------------------------------+---------------+-------+-------+-------+-------+------+-------+-----');
for (const j of jornadas.slice(0, 10)) {
  const placas = j.placas.slice(0, 2).join(',');
  const nome = (j.nomeMotorista || '?').slice(0, 34);
  const inf = j.infracoes.length;
  console.log(`${nome.padEnd(35)} | ${placas.padEnd(13)} | ${j.totalAtivo} | ${j.dirigindo} | ${j.refeicao} | ${j.pausa} | ${j.extra50} | ${j.extra100} | ${inf > 0 ? '⚠' + inf : ' ok'}`);
}

console.log('\n═════════════════════════════════════════════════════════════════════════════════');
console.log(' INFRAÇÕES DETECTADAS');
console.log('═════════════════════════════════════════════════════════════════════════════════');
const comInfr = jornadas.filter(j => j.temInfracao);
if (comInfr.length === 0) {
  console.log('Nenhuma infração detectada 🎉');
} else {
  for (const j of comInfr) {
    console.log(`\n⚠ ${j.nomeMotorista} (${j.placas.join(', ')})`);
    for (const i of j.infracoes) {
      console.log(`   ${i.tipo} (${i.base}): ${i.descricao}`);
    }
  }
}

console.log('\n═════════════════════════════════════════════════════════════════════════════════');
console.log(' RESUMO');
console.log('═════════════════════════════════════════════════════════════════════════════════');
const totalEvBrutos = eventos.length;
const comExtra = jornadas.filter(j => j.extra50Min > 0 || j.extra100Min > 0).length;
const somaJornadas = jornadas.reduce((a, j) => a + j.totalAtivoMin, 0);
const media = jornadas.length > 0 ? Math.round(somaJornadas / jornadas.length) : 0;
const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
console.log(`Motoristas com jornada:    ${jornadas.length}`);
console.log(`Eventos brutos SASCAR:     ${totalEvBrutos}`);
console.log(`Jornada média do dia:      ${fmt(media)}`);
console.log(`Com horas extras:          ${comExtra}`);
console.log(`Com infrações legais:      ${comInfr.length}`);
console.log(`Total de infrações:        ${comInfr.reduce((a, j) => a + j.infracoes.length, 0)}`);
