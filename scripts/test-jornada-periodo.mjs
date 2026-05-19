// Testa agregação de jornada de múltiplos dias
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { obterEventosTempoDirecao } from '../functions/src/sascar/soap.js';
import { calcularJornadas, rangeUtcParaDiaLocal, diasNoPeriodo, agregarJornadasPorMotorista } from '../functions/src/sascar/jornada.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split(/\r?\n/).filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const dataInicio = '2026-05-16';
const dataFim = '2026-05-18';
const dias = diasNoPeriodo(dataInicio, dataFim);
console.log(`\nDias do período: ${dias.join(', ')}\n`);

const porDia = [];
let totalEv = 0;
for (const dia of dias) {
  const { dataInicio: di, dataFim: df } = rangeUtcParaDiaLocal(dia);
  const evs = await obterEventosTempoDirecao({
    usuario: env.SASCAR_USUARIO, senha: env.SASCAR_SENHA,
    dataInicio: di, dataFim: df, quantidade: 3000
  });
  totalEv += evs.length;
  const js = calcularJornadas(evs, dia);
  console.log(`  ${dia}: ${evs.length} eventos → ${js.length} motoristas`);
  porDia.push(js);
}

const ag = agregarJornadasPorMotorista(porDia);
console.log(`\n${'='.repeat(85)}`);
console.log(` AGREGADO POR MOTORISTA (período de ${dias.length} dias, ${totalEv} eventos)`);
console.log(`${'='.repeat(85)}`);
console.log('Motorista                            | Dias | Total | Dirig | Refei | Ex50 | Inf');
console.log('-------------------------------------+------+-------+-------+-------+------+----');
for (const a of ag.slice(0, 15)) {
  console.log(`${(a.nomeMotorista || '?').slice(0,36).padEnd(37)} | ${String(a.dias).padStart(4)} | ${a.totalAtivo} | ${a.dirigindo} | ${a.refeicao} | ${a.extra50} | ${a.infracoes.length > 0 ? '⚠'+a.infracoes.length : '  '}`);
}
console.log(`\nTotal motoristas únicos no período: ${ag.length}`);
console.log(`Soma horas extras (50%): ${(ag.reduce((s,a) => s + a.extra50Min, 0) / 60).toFixed(1)}h`);
console.log(`Total de infrações: ${ag.reduce((s,a) => s + a.infracoes.length, 0)}`);
