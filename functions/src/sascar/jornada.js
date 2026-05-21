// Cálculo de jornada de motorista a partir de eventos do tablet SasMDT
// Recebe lista bruta de obterEventosTempoDirecao e agrupa por motorista
// Aplica regras Lei 13.103/2015 + CLT art. 58/59/71

// Limites operacionais Pontual + legais
// REGRA Pontual confirmada por Wesley (2026-05-19):
//   Semana (seg-sex): jornada normal = 9h30 (8h trabalho + 1h almoço + 30min pausa)
//                     Acima de 9h30 = extra 50% (até +2h). Acima disso = extra 100%/infração.
//   Sábado:           jornada normal = 4h. Acima = extra 50%.
//   Domingo:          TODO o tempo trabalhado é extra 100%.
//   Direção contínua: máx 4h sem pausa de 30min (regra interna Pontual, mais restritiva que
//                     Lei 13.103 art. 67-C que permite 5h30).
export const LIMITES = {
  jornadaNormalSemana: 9 * 60 + 30,  // 9h30 — Pontual (inclui almoço + pausa)
  jornadaNormalSabado: 4 * 60,       // 4h — Pontual
  extraSeguroSemana: 2 * 60,         // CLT art. 59 — até 2h extra (50%) na semana
  refeicaoMinima: 60,                // CLT art. 71 — mínimo 1h intrajornada
  direcaoContinuaMax: 4 * 60,        // 4h — Pontual (mais restritivo que Lei 13.103 5h30)
  pausaMinima: 30,                   // Lei 13.103 — pausa mínima 30min
};

// 0=domingo, 1=segunda, ..., 6=sábado (padrão JS)
function diaSemanaLocal(dataISO) {
  if (!dataISO) return null;
  const [y, m, d] = dataISO.split('-').map(Number);
  // Date em UTC, mas como dataISO já é "dia local" (UTC-3), getDay() reflete corretamente
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Retorna 'semana' | 'sabado' | 'domingo'
function tipoDia(dataISO) {
  const dow = diaSemanaLocal(dataISO);
  if (dow === 0) return 'domingo';
  if (dow === 6) return 'sabado';
  return 'semana';
}

// Converte 'YYYY-MM-DD HH:MM:SS' (UTC-0 retornado pela SASCAR) em epoch ms
function parseDate(s) {
  if (!s) return null;
  // Formato '2026-05-17 04:59:14' — interpretar como UTC
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

function minutosEntre(a, b) {
  if (a == null || b == null) return 0;
  return Math.max(0, Math.round((b - a) / 60000));
}

function formatHHmm(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Agrupa eventos por motorista e calcula totais
 * @param {Array} eventos - lista crua de obterEventosTempoDirecao
 * @param {string} dataReferenciaISO - 'YYYY-MM-DD' (dia local de referência)
 * @returns {Array} - lista de jornadas por motorista
 */
export function calcularJornadas(eventos, dataReferenciaISO, classificacao = {}) {
  // classificacao: { [idMotorista]: 'interno' | 'px' } — quem não está no mapa é 'interno'
  // PX (agregado/PJ): jornada até 13h, SEM horas extras, mas COM regra de pausa/direção (é lei)
  const LIMITE_PX = 13 * 60; // 780 min
  // 1. Agrupa por motorista (e ordena cronologicamente)
  const porMotorista = new Map();
  for (const ev of eventos) {
    if (!ev.idMotorista || ev.idMotorista === 0) continue;
    if (!porMotorista.has(ev.idMotorista)) {
      porMotorista.set(ev.idMotorista, {
        idMotorista: ev.idMotorista,
        nomeMotorista: ev.nomeMotorista,
        eventos: [],
        veiculos: new Set(),
        placas: new Set(),
      });
    }
    const reg = porMotorista.get(ev.idMotorista);
    reg.eventos.push({ ...ev, _ts: parseDate(ev.dataInicio) });
    if (ev.idVeiculo) reg.veiculos.add(ev.idVeiculo);
    if (ev.placa) reg.placas.add(ev.placa);
  }

  // 2. Pra cada motorista, calcula deltas e totais
  const resultado = [];
  for (const reg of porMotorista.values()) {
    reg.eventos.sort((a, b) => (a._ts ?? 0) - (b._ts ?? 0));

    const totais = {
      jornada: 0,
      dirigindo: 0,
      pausa: 0,
      parada: 0,
      refeicao: 0,
      esperar: 0,
      encerrar: 0,
      trocar: 0,
    };

    // Delta = tempo entre evento N e evento N+1, atribuído ao evento N
    // (= "esse motorista ficou nesse estado por X minutos")
    let inicio = null, fim = null;
    let direcaoContinua = 0; // soma de Dirigindo consecutivos sem Pausa/Refeição
    let direcaoContinuaMaxima = 0;
    const infracoes = [];

    for (let i = 0; i < reg.eventos.length; i++) {
      const cur = reg.eventos[i];
      const next = reg.eventos[i + 1];
      const delta = next ? minutosEntre(cur._ts, next._ts) : 0;
      const desc = (cur.descricaoEventoTempoDirecao || '').toLowerCase();

      if (inicio == null) inicio = cur._ts;
      fim = cur._ts;

      // Só conta pausa FORMAL (motorista bate "Pausa" no tablet). NÃO existe mais dedução
      // de pausa informal (Dirigindo→Jornada→Dirigindo) — decisão Wesley 2026-05-21.
      // Tempo em "Jornada" é só jornada; quem não registra Pausa não ganha desconto.
      if (desc.includes('jornada')) {
        totais.jornada += delta;
      }
      else if (desc.includes('dirigindo')) {
        totais.dirigindo += delta;
        direcaoContinua += delta;
        if (direcaoContinua > direcaoContinuaMaxima) direcaoContinuaMaxima = direcaoContinua;
      }
      else if (desc.includes('refeição') || desc.includes('refeicao')) {
        totais.refeicao += delta;
        direcaoContinua = 0;
        // Checa infração de almoço < 1h
        if (delta > 0 && delta < LIMITES.refeicaoMinima) {
          infracoes.push({
            tipo: 'REFEICAO_INSUFICIENTE',
            base: 'CLT art. 71',
            descricao: `Refeição de ${formatHHmm(delta)} (mínimo ${formatHHmm(LIMITES.refeicaoMinima)})`,
            data: cur.dataInicio,
          });
        }
      }
      else if (desc.includes('pausa')) {
        totais.pausa += delta;
        // Regra Pontual (Wesley 2026-05-21): QUALQUER pausa reseta a direção contínua,
        // independente da duração — parou o caminhão, quebrou a sequência de direção.
        // (coerente com a pausa informal Dirigindo→Jornada→Dirigindo)
        direcaoContinua = 0;
      }
      // Parada e Esperar também resetam: caminhão parado quebra a direção contínua (Wesley 2026-05-21)
      else if (desc.includes('parada')) { totais.parada += delta; direcaoContinua = 0; }
      else if (desc.includes('espera') || desc.includes('esperar')) { totais.esperar += delta; direcaoContinua = 0; }
      else if (desc.includes('encerrar')) {
        totais.encerrar += delta;
        direcaoContinua = 0;
      }
      else if (desc.includes('trocar')) totais.trocar += delta;
    }

    // Total da jornada efetiva = soma de estados ativos (jornada + dirigindo + refeição + pausa)
    const totalAtivo = totais.jornada + totais.dirigindo + totais.refeicao + totais.pausa;

    // Tipo de contrato do motorista: 'interno' (CLT) ou 'px' (PJ/agregado)
    const tipoContrato = classificacao[reg.idMotorista] === 'px' ? 'px' : 'interno';

    const tipo = tipoDia(dataReferenciaISO);
    let extra50 = 0, extra100 = 0, limiteNormal = 0;

    if (tipoContrato === 'px') {
      // PX (PJ): SEM horas extras (é por contrato). Jornada até 13h; acima = infração.
      limiteNormal = LIMITE_PX;
      if (totalAtivo > LIMITE_PX) {
        infracoes.push({
          tipo: 'JORNADA_PX_EXCEDIDA',
          base: 'Limite contratual PX — 13h',
          descricao: `Jornada de ${formatHHmm(totalAtivo)} excede o limite de ${formatHHmm(LIMITE_PX)} (13h) do contrato PX`,
          data: reg.eventos[reg.eventos.length - 1]?.dataInicio,
        });
      }
      // extra50 e extra100 ficam 0 — PX não recebe hora extra
    } else if (tipo === 'domingo') {
      // Domingo: TUDO é extra 100%
      limiteNormal = 0;
      extra100 = totalAtivo;
    } else if (tipo === 'sabado') {
      // Sábado: normal até 4h, acima é extra 50%
      limiteNormal = LIMITES.jornadaNormalSabado;
      if (totalAtivo > limiteNormal) {
        extra50 = totalAtivo - limiteNormal;
      }
    } else {
      // Semana: normal até 9h30. TODO o excedente é extra 50% (regra Pontual: 100% só domingo).
      // Acima de 11h30 ainda gera INFRAÇÃO (Lei 13.103 limite 2h extras/dia), mas pago como 50%.
      limiteNormal = LIMITES.jornadaNormalSemana;
      if (totalAtivo > limiteNormal) {
        const excesso = totalAtivo - limiteNormal;
        extra50 = excesso;   // tudo 50% na semana
        extra100 = 0;        // 100% só no domingo
        const acimaDoLimite = excesso - LIMITES.extraSeguroSemana;
        if (acimaDoLimite > 0) {
          infracoes.push({
            tipo: 'EXTRA_EXCESSIVA',
            base: 'Lei 13.103/2015 art. 235-C',
            descricao: `${formatHHmm(acimaDoLimite)} além das 2h extras permitidas (jornada acima de ${formatHHmm(limiteNormal + LIMITES.extraSeguroSemana)}). Pago como extra 50%.`,
            data: reg.eventos[reg.eventos.length - 1]?.dataInicio,
          });
        }
      }
    }

    if (direcaoContinuaMaxima > LIMITES.direcaoContinuaMax) {
      infracoes.push({
        tipo: 'DIRECAO_CONTINUA_EXCESSIVA',
        base: 'Regra interna Pontual (mais restritiva que Lei 13.103 art. 67-C)',
        descricao: `Dirigiu ${formatHHmm(direcaoContinuaMaxima)} sem pausa de ${formatHHmm(LIMITES.pausaMinima)} (máx ${formatHHmm(LIMITES.direcaoContinuaMax)})`,
      });
    }

    // Detecta se motorista encerrou a jornada (último evento é "Encerrar")
    const ultimoEvento = reg.eventos[reg.eventos.length - 1];
    const ultimaDescricao = (ultimoEvento?.descricaoEventoTempoDirecao || '').toLowerCase();
    const encerrouJornada = ultimaDescricao.includes('encerrar');

    // Detecta CICLOS de jornada: cada vez que o motorista bate "Encerrar" e depois
    // reabre, conta como nova jornada. Útil pra motoristas como HAROLDO que
    // encerram de manhã e voltam à tarde.
    const ciclos = [];
    {
      let cicloAtual = { eventosIdx: [], inicio: null, fim: null, encerrou: false };
      for (let k = 0; k < reg.eventos.length; k++) {
        const ev = reg.eventos[k];
        const d = (ev.descricaoEventoTempoDirecao || '').toLowerCase();
        cicloAtual.eventosIdx.push(k);
        if (cicloAtual.inicio == null) cicloAtual.inicio = ev.dataInicio;
        cicloAtual.fim = ev.dataInicio;
        if (d.includes('encerrar')) {
          cicloAtual.encerrou = true;
          ciclos.push(cicloAtual);
          cicloAtual = { eventosIdx: [], inicio: null, fim: null, encerrou: false };
        }
      }
      if (cicloAtual.eventosIdx.length > 0) ciclos.push(cicloAtual);
    }

    // Calcula totais por ciclo (re-percorrendo eventos do segmento)
    const ciclosDetalhe = ciclos.map((c, idx) => {
      const t = { jornada: 0, dirigindo: 0, refeicao: 0, pausa: 0 };
      let direcaoContCiclo = 0, direcaoContMaxCiclo = 0;
      const evs = c.eventosIdx.map(i => reg.eventos[i]);
      for (let i = 0; i < evs.length; i++) {
        const cur = evs[i];
        const next = evs[i + 1];
        const delta = next ? minutosEntre(cur._ts, next._ts) : 0;
        const d = (cur.descricaoEventoTempoDirecao || '').toLowerCase();
        if (d.includes('jornada')) {
          t.jornada += delta; // só pausa formal conta (sem dedução informal)
        } else if (d.includes('dirigindo')) {
          t.dirigindo += delta;
          direcaoContCiclo += delta;
          if (direcaoContCiclo > direcaoContMaxCiclo) direcaoContMaxCiclo = direcaoContCiclo;
        } else if (d.includes('refeição') || d.includes('refeicao')) {
          t.refeicao += delta;
          direcaoContCiclo = 0;
        } else if (d.includes('pausa')) {
          t.pausa += delta;
          direcaoContCiclo = 0; // qualquer pausa reseta (regra Pontual 2026-05-21)
        } else if (d.includes('parada') || d.includes('espera') || d.includes('esperar') || d.includes('encerrar')) {
          direcaoContCiclo = 0; // caminhão parado quebra direção contínua (Wesley 2026-05-21)
        }
      }
      const totalAtivoCiclo = t.jornada + t.dirigindo + t.refeicao + t.pausa;
      return {
        numero: idx + 1,
        inicio: c.inicio,
        fim: c.fim,
        encerrou: c.encerrou,
        totalAtivoMin: totalAtivoCiclo,
        totalAtivo: formatHHmm(totalAtivoCiclo),
        dirigindoMin: t.dirigindo,
        dirigindo: formatHHmm(t.dirigindo),
        refeicaoMin: t.refeicao,
        refeicao: formatHHmm(t.refeicao),
        pausaMin: t.pausa,
        pausa: formatHHmm(t.pausa),
        direcaoContinuaMaximaMin: direcaoContMaxCiclo,
        direcaoContinuaMaxima: formatHHmm(direcaoContMaxCiclo),
        qtdEventos: evs.length,
      };
    });

    // Regra Pontual: pausa total diária mínima de 30min (formal + informal somadas)
    const PAUSA_DIARIA_MIN = 30;
    const pausaDiariaSuficiente = totais.pausa >= PAUSA_DIARIA_MIN;
    const pausaFaltanteMin = pausaDiariaSuficiente ? 0 : PAUSA_DIARIA_MIN - totais.pausa;

    // Cruzamento jornada × GPS: cada evento com a localização onde aconteceu.
    // O lat/lng/cidade/rua já vem dentro de obterEventosTempoDirecao — só preservamos aqui.
    const timeline = reg.eventos.map((ev, i) => {
      const next = reg.eventos[i + 1];
      const delta = next ? minutosEntre(ev._ts, next._ts) : 0;
      const temGps = ev.latitude != null && ev.longitude != null && (ev.latitude !== 0 || ev.longitude !== 0);
      return {
        hora: ev.dataInicio,                              // BRT (igual início/fim)
        tipo: ev.descricaoEventoTempoDirecao || '?',
        eventoId: ev.eventoTempoDirecao,
        duracaoMin: delta,
        duracao: formatHHmm(delta),
        lat: temGps ? ev.latitude : null,
        lng: temGps ? ev.longitude : null,
        cidade: ev.cidade || null,
        uf: ev.uf || null,
        rua: ev.rua || null,
        placa: ev.placa || null,
      };
    });

    resultado.push({
      idMotorista: reg.idMotorista,
      nomeMotorista: reg.nomeMotorista || '?',
      data: dataReferenciaISO,
      tipoDia: tipo, // 'semana' | 'sabado' | 'domingo'
      tipoContrato, // 'interno' | 'px'
      limiteNormalMin: limiteNormal,
      placas: [...reg.placas].sort(),
      veiculosIds: [...reg.veiculos],
      qtdEventos: reg.eventos.length,
      inicio: reg.eventos[0]?.dataInicio || null,
      fim: reg.eventos[reg.eventos.length - 1]?.dataInicio || null,
      encerrouJornada,
      ultimoEventoTipo: ultimoEvento?.descricaoEventoTempoDirecao || null,
      quantidadeJornadas: ciclos.length,
      multiJornada: ciclos.length > 1,
      ciclos: ciclosDetalhe,
      totalAtivoMin: totalAtivo,
      totalAtivo: formatHHmm(totalAtivo),
      jornadaMin: totais.jornada,
      jornada: formatHHmm(totais.jornada),
      dirigindoMin: totais.dirigindo,
      dirigindo: formatHHmm(totais.dirigindo),
      refeicaoMin: totais.refeicao,
      refeicao: formatHHmm(totais.refeicao),
      pausaMin: totais.pausa,
      pausa: formatHHmm(totais.pausa),
      pausaDiariaSuficiente,
      pausaFaltanteMin,
      pausaFaltante: formatHHmm(pausaFaltanteMin),
      timeline,
      paradaMin: totais.parada,
      parada: formatHHmm(totais.parada),
      esperarMin: totais.esperar,
      esperar: formatHHmm(totais.esperar),
      extra50Min: extra50,
      extra50: formatHHmm(extra50),
      extra100Min: extra100,
      extra100: formatHHmm(extra100),
      direcaoContinuaMaxima: formatHHmm(direcaoContinuaMaxima),
      direcaoContinuaMaximaMin: direcaoContinuaMaxima,
      infracoes,
      temInfracao: infracoes.length > 0,
    });
  }

  // Ordena alfabeticamente por nome do motorista (pt-BR, ignorando acentos)
  resultado.sort((a, b) =>
    (a.nomeMotorista || '').localeCompare(b.nomeMotorista || '', 'pt-BR', { sensitivity: 'base' })
  );
  return resultado;
}

/**
 * Lista todos os dias entre dataInicio e dataFim (inclusive), formato YYYY-MM-DD
 */
export function diasNoPeriodo(dataInicio, dataFim) {
  const [yi, mi, di] = dataInicio.split('-').map(Number);
  const [yf, mf, df] = dataFim.split('-').map(Number);
  const ini = new Date(Date.UTC(yi, mi - 1, di));
  const fim = new Date(Date.UTC(yf, mf - 1, df));
  const dias = [];
  let cur = ini;
  while (cur <= fim) {
    const Y = cur.getUTCFullYear();
    const M = String(cur.getUTCMonth() + 1).padStart(2, '0');
    const D = String(cur.getUTCDate()).padStart(2, '0');
    dias.push(`${Y}-${M}-${D}`);
    cur = new Date(cur.getTime() + 86400000);
  }
  return dias;
}

/**
 * Agrega jornadas de múltiplos dias por motorista (soma minutos, junta infrações)
 */
export function agregarJornadasPorMotorista(listas) {
  const porMotorista = new Map();
  for (const jornadas of listas) {
    for (const j of jornadas) {
      if (!porMotorista.has(j.idMotorista)) {
        porMotorista.set(j.idMotorista, {
          idMotorista: j.idMotorista,
          nomeMotorista: j.nomeMotorista,
          dias: 0,
          totalAtivoMin: 0,
          jornadaMin: 0,
          dirigindoMin: 0,
          refeicaoMin: 0,
          pausaMin: 0,
          paradaMin: 0,
          esperarMin: 0,
          extra50Min: 0,
          extra100Min: 0,
          qtdEventos: 0,
          placas: new Set(),
          infracoes: [],
        });
      }
      const a = porMotorista.get(j.idMotorista);
      a.dias++;
      a.totalAtivoMin += j.totalAtivoMin;
      a.jornadaMin += j.jornadaMin;
      a.dirigindoMin += j.dirigindoMin;
      a.refeicaoMin += j.refeicaoMin;
      a.pausaMin += j.pausaMin;
      a.paradaMin += j.paradaMin;
      a.esperarMin += j.esperarMin;
      a.extra50Min += j.extra50Min;
      a.extra100Min += j.extra100Min;
      a.qtdEventos += j.qtdEventos;
      j.placas.forEach(p => a.placas.add(p));
      for (const inf of j.infracoes) a.infracoes.push({ ...inf, data: j.data });
    }
  }
  const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  return [...porMotorista.values()].map(a => ({
    ...a,
    placas: [...a.placas].sort(),
    totalAtivo: fmt(a.totalAtivoMin),
    jornada: fmt(a.jornadaMin),
    dirigindo: fmt(a.dirigindoMin),
    refeicao: fmt(a.refeicaoMin),
    pausa: fmt(a.pausaMin),
    parada: fmt(a.paradaMin),
    esperar: fmt(a.esperarMin),
    extra50: fmt(a.extra50Min),
    extra100: fmt(a.extra100Min),
    temInfracao: a.infracoes.length > 0,
  })).sort((x, y) =>
    (x.nomeMotorista || '').localeCompare(y.nomeMotorista || '', 'pt-BR', { sensitivity: 'base' })
  );
}

/**
 * Converte data local (YYYY-MM-DD) em intervalo dataInicio/dataFim pro método
 * obterEventosTempoDirecao da SASCAR.
 *
 * IMPORTANTE: SASCAR retorna timestamps em BRT (horário local Brasília), NÃO em UTC.
 * Confirmado em 2026-05-19 — motorista ADAM logou às 07:05:07 BRT no tablet e a API
 * retornou exatamente "2026-05-19 07:05:07". A doc oficial diz UTC mas a prática é BRT
 * pra esse método de eventos do tablet SasMDT.
 *
 * Pede do dia inteiro em BRT: 00:00:00 até 23:59:59.
 */
export function rangeUtcParaDiaLocal(dataLocalISO) {
  return {
    dataInicio: `${dataLocalISO} 00:00:00`,
    dataFim: `${dataLocalISO} 23:59:59`,
  };
}
