// Monitora ADAM a cada 60s ate completar 30min de pausa OU 15 ciclos.
// Output curto: timestamp | total pausa | último evento | status

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

const data = hojeISO();
const MAX_CICLOS = 15;
const INTERVALO_MS = 60_000;

console.log('Monitorando ADAM ate completar 30min de pausa ou ' + MAX_CICLOS + ' ciclos (1 ciclo/60s).');
console.log('Data:', data);
console.log('');
console.log('Ciclo | Hora     | Eventos | Último evento     | Pausa total | Falta | Status');
console.log('------+----------+---------+-------------------+-------------+-------+---------');

let ultimoUltimoEvento = null;
let ultimaPausa = null;

for (let i = 1; i <= MAX_CICLOS; i++) {
  const t0 = Date.now();
  const { dataInicio, dataFim } = rangeUtcParaDiaLocal(data);
  let eventos;
  try {
    eventos = await obterEventosTempoDirecao({
      usuario: env.SASCAR_USUARIO,
      senha: env.SASCAR_SENHA,
      dataInicio,
      dataFim,
      quantidade: 3000,
    });
  } catch (e) {
    console.log(String(i).padStart(2) + '/15 | ERRO: ' + e.message);
    await new Promise(r => setTimeout(r, INTERVALO_MS));
    continue;
  }

  const jornadas = calcularJornadas(eventos, data);
  const adam = jornadas.find(x => x.nomeMotorista.startsWith('ADAM'));
  const agora = new Date().toLocaleTimeString('pt-BR');

  if (!adam) {
    console.log(String(i).padStart(2) + '/15 | ' + agora + ' | ADAM nao encontrado');
  } else {
    const status = adam.pausaDiariaSuficiente ? '✓ COMPLETOU 30min' : (adam.encerrouJornada ? '◆ encerrou' : '○ em andamento');
    const mudou = (ultimoUltimoEvento !== adam.ultimoEventoTipo + '@' + adam.fim) || (ultimaPausa !== adam.pausaMin);
    const tag = mudou ? '★ MUDOU' : '';
    console.log(
      String(i).padStart(2) + '/15 | ' + agora + ' | ' +
      String(adam.qtdEventos).padStart(7) + ' | ' +
      (adam.ultimoEventoTipo || '?').padEnd(17) + ' | ' +
      adam.pausa.padStart(11) + ' | ' +
      adam.pausaFaltante.padStart(5) + ' | ' +
      status + ' ' + tag
    );
    ultimoUltimoEvento = adam.ultimoEventoTipo + '@' + adam.fim;
    ultimaPausa = adam.pausaMin;

    if (adam.pausaDiariaSuficiente) {
      console.log('');
      console.log('🎯 ADAM completou 30min de pausa no ciclo ' + i + '! Encerrando monitoramento.');
      console.log('   Total final: ' + adam.pausa);
      console.log('   Pausas registradas:');
      adam.pausasDetalhe.forEach((p,idx) => {
        console.log('     ' + (idx+1) + '. ' + p.inicio.slice(11,16) + ' → ' + p.fim.slice(11,16) + ' (' + p.duracao + ')');
      });
      process.exit(0);
    }
  }

  const elapsed = Date.now() - t0;
  if (i < MAX_CICLOS) await new Promise(r => setTimeout(r, Math.max(0, INTERVALO_MS - elapsed)));
}

console.log('');
console.log('Fim do monitoramento (15 ciclos = ~15min). ADAM ainda nao completou 30min.');
