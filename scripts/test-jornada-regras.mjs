// Teste unitário das 3 regras (semana/sábado/domingo) com dados sintéticos
import { calcularJornadas, LIMITES } from '../functions/src/sascar/jornada.js';

// Gera eventos sintéticos pra um motorista com jornada de N minutos
// Sequência: Jornada (00:00) → Dirigindo (X) → Refeição (60min) → Dirigindo (Y) → Pausa (30min) → Dirigindo (Z) → Encerrar
function gerarEventos(idMot, nome, dataHoraInicio, dirigindoMin) {
  const ev = [];
  let t = new Date(dataHoraInicio.replace(' ', 'T') + 'Z').getTime();
  const fmt = (ms) => {
    const d = new Date(ms);
    const Y = d.getUTCFullYear(), M = String(d.getUTCMonth()+1).padStart(2,'0');
    const D = String(d.getUTCDate()).padStart(2,'0');
    const h = String(d.getUTCHours()).padStart(2,'0');
    const mi = String(d.getUTCMinutes()).padStart(2,'0');
    const s = String(d.getUTCSeconds()).padStart(2,'0');
    return `${Y}-${M}-${D} ${h}:${mi}:${s}`;
  };
  // Jornada inicia
  ev.push({ dataInicio: fmt(t), descricaoEventoTempoDirecao: 'Jornada', descricaoEventoTempoDirecaoAnterior: 'Encerrar', idMotorista: idMot, nomeMotorista: nome, idVeiculo: 100, placa: 'TST0000' });
  t += 30*60_000;
  // Dirigindo (metade do tempo)
  const dirMet = Math.floor(dirigindoMin / 2);
  ev.push({ dataInicio: fmt(t), descricaoEventoTempoDirecao: 'Dirigindo', descricaoEventoTempoDirecaoAnterior: 'Jornada', idMotorista: idMot, nomeMotorista: nome, idVeiculo: 100, placa: 'TST0000' });
  t += dirMet*60_000;
  // Refeição 1h
  ev.push({ dataInicio: fmt(t), descricaoEventoTempoDirecao: 'Refeição', descricaoEventoTempoDirecaoAnterior: 'Dirigindo', idMotorista: idMot, nomeMotorista: nome, idVeiculo: 100, placa: 'TST0000' });
  t += 60*60_000;
  // Dirigindo segunda metade
  ev.push({ dataInicio: fmt(t), descricaoEventoTempoDirecao: 'Dirigindo', descricaoEventoTempoDirecaoAnterior: 'Refeição', idMotorista: idMot, nomeMotorista: nome, idVeiculo: 100, placa: 'TST0000' });
  t += (dirigindoMin - dirMet)*60_000;
  // Encerrar
  ev.push({ dataInicio: fmt(t), descricaoEventoTempoDirecao: 'Encerrar', descricaoEventoTempoDirecaoAnterior: 'Dirigindo', idMotorista: idMot, nomeMotorista: nome, idVeiculo: 100, placa: 'TST0000' });
  return ev;
}

const cenarios = [
  // [data ISO, tipo esperado, dirigindo min, total esperado, expectativa]
  { data: '2026-05-18', tipo: 'semana',  dir: 510, label: 'Segunda 9h30 exato (jornada limite)' },        // 8h30dir+1h ref+30min = 10h30, com 30min jornada inicial = 10h30. Hmm
  { data: '2026-05-18', tipo: 'semana',  dir: 600, label: 'Segunda com 1h extra (deve dar extra50)' },
  { data: '2026-05-18', tipo: 'semana',  dir: 720, label: 'Segunda com 3h extra (deve dar extra50=2h + extra100=1h INFRAÇÃO)' },
  { data: '2026-05-16', tipo: 'sabado',  dir: 180, label: 'Sábado 3h dirigindo (deve ficar dentro do limite 4h)' },
  { data: '2026-05-16', tipo: 'sabado',  dir: 360, label: 'Sábado 6h dirigindo (deve dar extra50)' },
  { data: '2026-05-17', tipo: 'domingo', dir: 240, label: 'Domingo qualquer hora (TUDO extra100)' },
  // Direção contínua — regra Pontual 4h
  { data: '2026-05-18', tipo: 'semana',  dir: 480, label: 'Direção 4h com 1h refeição no meio (2h+2h, NÃO deve infringir)' },
  { data: '2026-05-18', tipo: 'semana',  dir: 540, label: 'Direção 4h30 sem pausa entre os dois blocos? gerador divide em 2 trechos de 2h15 separados por refeição → não infringe' },
];

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log(' TESTE UNITÁRIO — 3 REGRAS DE JORNADA');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log(`Limites: semana=${LIMITES.jornadaNormalSemana}min (${(LIMITES.jornadaNormalSemana/60).toFixed(1)}h), sabado=${LIMITES.jornadaNormalSabado}min, extra seguro=${LIMITES.extraSeguroSemana}min\n`);

for (const c of cenarios) {
  const ev = gerarEventos(999, 'TESTE', `${c.data} 04:00:00`, c.dir);
  const result = calcularJornadas(ev, c.data);
  const r = result[0];
  console.log(`\n→ ${c.label}`);
  console.log(`   data=${c.data} (${c.tipo}) | dirigindoMin=${c.dir}`);
  console.log(`   tipoDia detectado: ${r.tipoDia} ${r.tipoDia === c.tipo ? '✅' : '❌'}`);
  console.log(`   total=${r.totalAtivo} | dirigindo=${r.dirigindo} | refeição=${r.refeicao}`);
  console.log(`   extra50=${r.extra50} | extra100=${r.extra100} | infrações=${r.infracoes.length}`);
  if (r.infracoes.length > 0) {
    r.infracoes.forEach(i => console.log(`     ⚠ ${i.tipo}: ${i.descricao}`));
  }
}
