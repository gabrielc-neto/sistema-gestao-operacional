// Monitora a FROTA INTEIRA a cada 60s.
// Emite uma linha SO quando algo muda relevante:
//  - Motorista completou 30min de pausa diaria
//  - Motorista encerrou jornada
//  - Nova infracao detectada
//  - Novo motorista logou pela 1a vez
//  - Snapshot a cada 5 ciclos (estado geral)

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
const MAX_CICLOS = 30;
const INTERVALO_MS = 60_000;

// Forca flush imediato em cada console.log pra o Monitor ver as linhas
const log = (msg) => { process.stdout.write(msg + '\n'); };

log(`MONITOR DE FROTA - ${data} - ${MAX_CICLOS} ciclos / 60s cada`);
log('');

const estadoAnterior = new Map(); // idMotorista -> snapshot

for (let i = 1; i <= MAX_CICLOS; i++) {
  const agora = new Date().toLocaleTimeString('pt-BR');
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
    log(`[${agora}] ERRO ciclo ${i}: ${e.message}`);
    await new Promise(r => setTimeout(r, INTERVALO_MS));
    continue;
  }

  const jornadas = calcularJornadas(eventos, data);
  let mudancasCiclo = 0;

  for (const j of jornadas) {
    const prev = estadoAnterior.get(j.idMotorista);
    const cur = {
      pausaMin: j.pausaMin,
      pausaSuf: j.pausaDiariaSuficiente,
      encerrou: j.encerrouJornada,
      ultimoEvt: j.ultimoEventoTipo,
      qtdInf: j.infracoes.length,
      qtdEv: j.qtdEventos,
    };

    if (!prev) {
      // 1a vez que vemos esse motorista hoje
      log(`[${agora}] +NOVO  ${j.nomeMotorista} (${j.placas.join(',')}) logou - inicio ${j.inicio.slice(11,16)}`);
      mudancasCiclo++;
    } else {
      // Completou 30min de pausa?
      if (!prev.pausaSuf && cur.pausaSuf) {
        log(`[${agora}] ✓PAUSA ${j.nomeMotorista} COMPLETOU 30min de pausa (total ${j.pausa})`);
        mudancasCiclo++;
      }
      // Encerrou jornada?
      if (!prev.encerrou && cur.encerrou) {
        log(`[${agora}] ◆FIM   ${j.nomeMotorista} encerrou jornada as ${j.fim.slice(11,16)} (total ${j.totalAtivo})`);
        mudancasCiclo++;
      }
      // Nova infracao?
      if (cur.qtdInf > prev.qtdInf) {
        const novas = j.infracoes.slice(prev.qtdInf).map(inf => inf.tipo).join(', ');
        log(`[${agora}] ⚠INFR  ${j.nomeMotorista} - nova infracao: ${novas}`);
        mudancasCiclo++;
      }
    }
    estadoAnterior.set(j.idMotorista, cur);
  }

  // Snapshot a cada 5 ciclos OU no ciclo 1
  if (i === 1 || i % 5 === 0) {
    const semPausa = jornadas.filter(x => !x.pausaDiariaSuficiente).length;
    const encerrados = jornadas.filter(x => x.encerrouJornada).length;
    const comInf = jornadas.filter(x => x.temInfracao).length;
    log(`[${agora}] === Ciclo ${i}/${MAX_CICLOS} === Motoristas: ${jornadas.length} | Encerraram: ${encerrados} | Sem 30min pausa: ${semPausa} | Com infracao: ${comInf} ===`);
  } else if (mudancasCiclo === 0) {
    // Silencio quando nada mudou (Monitor nao recebe linha)
  }

  if (i < MAX_CICLOS) await new Promise(r => setTimeout(r, INTERVALO_MS));
}

log('');
log(`Fim do monitoramento apos ${MAX_CICLOS} ciclos (~${MAX_CICLOS}min)`);
