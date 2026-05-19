// Mostra TODOS os eventos brutos de um motorista específico
// Uso: node scripts/debug-motorista.mjs "NOME PARCIAL" [YYYY-MM-DD]

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

function hojeISO() {
  const d = new Date();
  d.setHours(d.getHours() - 3);
  return d.toISOString().split('T')[0];
}

const filtroNome = (process.argv[2] || 'ADAM').toUpperCase();
const data = process.argv[3] || hojeISO();

console.log(`\nBuscando motorista "${filtroNome}" em ${data}\n`);

const { dataInicio, dataFim } = rangeUtcParaDiaLocal(data);
console.log(`Janela SASCAR (UTC): ${dataInicio} -> ${dataFim}\n`);

const eventos = await obterEventosTempoDirecao({
  usuario: env.SASCAR_USUARIO,
  senha: env.SASCAR_SENHA,
  dataInicio,
  dataFim,
  quantidade: 3000,
});

const eventosMot = eventos.filter(e =>
  (e.nomeMotorista || '').toUpperCase().includes(filtroNome)
);

if (eventosMot.length === 0) {
  console.log(`Nenhum evento encontrado pra "${filtroNome}"`);
  console.log('Motoristas com eventos hoje:');
  const nomes = [...new Set(eventos.map(e => e.nomeMotorista))].sort();
  nomes.forEach(n => console.log('  - ' + n));
  process.exit(0);
}

const nome = eventosMot[0].nomeMotorista;
console.log(`===== EVENTOS BRUTOS DA SASCAR: ${nome} =====`);
console.log(`Total eventos: ${eventosMot.length}`);
console.log(`(SASCAR retorna timestamps em BRT - horário local Brasília)\n`);

console.log('Hora BRT (SASCAR) | Evento atual       | Vindo de           | Placa');
console.log('------------------+--------------------+--------------------+----------');
eventosMot.sort((a,b) => (a.dataInicio||'').localeCompare(b.dataInicio||''));
for (const ev of eventosMot) {
  const ts = ev.dataInicio || '?';
  const atual = (ev.descricaoEventoTempoDirecao || '?').padEnd(18);
  const ant = (ev.descricaoEventoTempoDirecaoAnterior || '?').padEnd(18);
  console.log(`${ts} | ${atual} | ${ant} | ${ev.placa || '?'}`);
}

console.log('\n===== INTERPRETACAO DO SISTEMA =====');
const jornadas = calcularJornadas(eventosMot, data);
const j = jornadas[0];
if (j) {
  console.log(`Inicio:           ${j.inicio}`);
  console.log(`Fim:              ${j.fim}`);
  console.log(`Total ativo:      ${j.totalAtivo}`);
  console.log(`Jornada (estado): ${j.jornada}`);
  console.log(`Dirigindo:        ${j.dirigindo}`);
  console.log(`Refeicao:         ${j.refeicao}`);
  console.log(`Pausa:            ${j.pausa}`);
  console.log(`Parada:           ${j.parada}`);
  console.log(`Esperar:          ${j.esperar}`);
  console.log(`Encerrar:         ${j.encerrar || '00:00'}`);
  console.log(`Extra 50%:        ${j.extra50}`);
  console.log(`Extra 100%:       ${j.extra100}`);
  console.log(`Dir. continua max:${j.direcaoContinuaMaxima}`);
  console.log(`Infracoes:        ${j.infracoes.length}`);
  j.infracoes.forEach(i => console.log(`  - ${i.tipo}: ${i.descricao}`));
}

console.log('\n===== DELTAS CALCULADOS =====');
const sorted = [...eventosMot].sort((a,b)=>(a.dataInicio||'').localeCompare(b.dataInicio||''));
for (let i = 0; i < sorted.length; i++) {
  const cur = sorted[i];
  const next = sorted[i+1];
  if (!next) {
    console.log(`${(cur.descricaoEventoTempoDirecao||'?').padEnd(18)} ${cur.dataInicio} -> (ultimo evento, delta=0)`);
    continue;
  }
  const t1 = new Date((cur.dataInicio||'').replace(' ','T')+'Z').getTime();
  const t2 = new Date((next.dataInicio||'').replace(' ','T')+'Z').getTime();
  const min = Math.round((t2-t1)/60000);
  const h = Math.floor(min/60);
  const m = min % 60;
  console.log(`${(cur.descricaoEventoTempoDirecao||'?').padEnd(18)} ${cur.dataInicio} -> ${next.dataInicio} = ${h}h${String(m).padStart(2,'0')} (atribuido a ${cur.descricaoEventoTempoDirecao})`);
}
