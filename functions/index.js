// Cloud Functions v2 — Pontual Logística
// Endpoints SASCAR consumidos pelo frontend React via Firebase Auth ID token

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  obterVeiculos,
  obterPacotePosicoesMotorista,
  obterEventosTempoDirecao,
  ultimaPorVeiculo,
} from './src/sascar/soap.js';
import { cached } from './src/sascar/cache.js';
import { cercasContendoPonto } from './src/sascar/geofence.js';
import { calcularJornadas, rangeUtcParaDiaLocal, diasNoPeriodo, agregarJornadasPorMotorista } from './src/sascar/jornada.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Em emulator local, usa service account do projeto pra acessar Firestore real
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  const keyPath = resolve(__dirname, '../scripts/serviceAccountKey.json');
  initializeApp({
    credential: cert(keyPath),
    projectId: 'pontual-logistica',
  });
} else {
  // Em produção, Cloud Functions provê credenciais automaticamente
  initializeApp();
}

const db = getFirestore();
const COL_POSICOES = 'sascar_posicoes';
const COL_CERCAS = 'cercas_eletronicas';
const COL_EVENTOS = 'cercas_eventos';

setGlobalOptions({
  region: 'southamerica-east1',
  maxInstances: 5,
  memory: '256MiB',
  timeoutSeconds: 30,
});

const SASCAR_USUARIO = defineSecret('SASCAR_USUARIO');
const SASCAR_SENHA = defineSecret('SASCAR_SENHA');

// (removido: estado in-memory substituído por Firestore — sobrevive entre cold starts)

function requireAuth(request) {
  // Bypass apenas no emulator local (a env var é setada pelo Firebase Emulator, nunca em produção)
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
  const devHeader = request.rawRequest?.headers?.['x-dev-bypass'] === 'true';
  if (isEmulator && devHeader) return;

  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Login obrigatório');
  }
}

// --- sascarVeiculos: lista a frota (cache 1h) ---
export const sascarVeiculos = onCall(
  { secrets: [SASCAR_USUARIO, SASCAR_SENHA] },
  async (request) => {
    requireAuth(request);
    const { data, age, fresh } = await cached('veiculos', 3600_000, () =>
      obterVeiculos({
        usuario: SASCAR_USUARIO.value(),
        senha: SASCAR_SENHA.value(),
        quantidade: 1000,
        idVeiculo: 0,
      })
    );
    return { veiculos: data, total: data.length, cache: { age, fresh } };
  }
);

// --- sascarPosicoes: última posição por veículo (cache 30s) ---
export const sascarPosicoes = onCall(
  { secrets: [SASCAR_USUARIO, SASCAR_SENHA] },
  async (request) => {
    requireAuth(request);
    const { data, age, fresh } = await cached('posicoes', 30_000, async () => {
      // 1) Em paralelo: chama SASCAR + lê estado anterior + cercas cadastradas
      const [pacotes, veiculos, snapshot, cercasSnap] = await Promise.all([
        obterPacotePosicoesMotorista({
          usuario: SASCAR_USUARIO.value(),
          senha: SASCAR_SENHA.value(),
          quantidade: 3000,
        }),
        obterVeiculos({
          usuario: SASCAR_USUARIO.value(),
          senha: SASCAR_SENHA.value(),
          quantidade: 1000,
          idVeiculo: 0,
        }),
        db.collection(COL_POSICOES).get(),
        db.collection(COL_CERCAS).get(),
      ]);

      // 2) Posições novas (idVeiculo → pacote)
      const novas = new Map();
      for (const p of ultimaPorVeiculo(pacotes)) novas.set(p.idVeiculo, p);

      // 3) Estado persistido em Firestore (fonte da verdade entre invocações)
      const persistidas = new Map();
      snapshot.forEach(doc => {
        const d = doc.data();
        if (d?.ultimaPosicao) persistidas.set(d.idVeiculo, d.ultimaPosicao);
      });

      // 3.1) Cercas cadastradas — id + dado bruto (formato/centro/raio/pontos)
      const cercas = [];
      const cercaPorId = new Map();
      cercasSnap.forEach(doc => {
        const c = { id: doc.id, ...doc.data() };
        cercas.push(c);
        cercaPorId.set(doc.id, c);
      });

      // 4) Batch write: grava posições novas + eventos de cerca em transação única
      const batch = db.batch();
      let writes = 0;
      let eventos = 0;
      const nowMs = Date.now();

      for (const [id, nova] of novas) {
        const v = veiculos.find(x => x.idVeiculo === id);
        if (!v) continue;
        const anterior = persistidas.get(id);
        if (anterior && Number(nova.idPacote) <= Number(anterior.idPacote)) continue;

        // 4.1) Detectar transições de cerca (entrada/saída) — exige lat/lng válidas
        const lat = Number(nova.latitude);
        const lng = Number(nova.longitude);
        const dentroDe = Number.isFinite(lat) && Number.isFinite(lng)
          ? cercasContendoPonto(lat, lng, cercas)
          : [];
        const dentroAntes = Array.isArray(anterior?.dentroDe) ? anterior.dentroDe : [];
        const setAntes = new Set(dentroAntes);
        const setAgora = new Set(dentroDe);

        // Só dispara eventos quando já existia estado anterior (evita spam no primeiro snapshot)
        if (anterior) {
          // ENTRADA: presente agora mas não antes
          for (const cercaId of dentroDe) {
            if (setAntes.has(cercaId)) continue;
            const cerca = cercaPorId.get(cercaId);
            if (!cerca) continue;
            const docId = `${id}_${cercaId}_${nova.idPacote}_E`;
            batch.set(db.collection(COL_EVENTOS).doc(docId), {
              tipo: 'ENTRADA',
              idVeiculo: id,
              placa: v.placa,
              cercaId,
              cercaNome: cerca.nome || '',
              cercaTipo: cerca.tipo || '',
              latitude: lat,
              longitude: lng,
              idPacote: nova.idPacote ?? null,
              dataPosicao: nova.dataPosicao ?? null,
              timestamp: FieldValue.serverTimestamp(),
              criadoEmMs: nowMs,
            });
            eventos++;
          }
          // SAIDA: presente antes mas não agora
          for (const cercaId of dentroAntes) {
            if (setAgora.has(cercaId)) continue;
            const cerca = cercaPorId.get(cercaId);
            if (!cerca) continue;
            const docId = `${id}_${cercaId}_${nova.idPacote}_S`;
            batch.set(db.collection(COL_EVENTOS).doc(docId), {
              tipo: 'SAIDA',
              idVeiculo: id,
              placa: v.placa,
              cercaId,
              cercaNome: cerca.nome || '',
              cercaTipo: cerca.tipo || '',
              latitude: lat,
              longitude: lng,
              idPacote: nova.idPacote ?? null,
              dataPosicao: nova.dataPosicao ?? null,
              timestamp: FieldValue.serverTimestamp(),
              criadoEmMs: nowMs,
            });
            eventos++;
          }
        }

        const enriched = {
          ...nova,
          placa: v.placa,
          statusTexto: statusFromPacote(nova),
          bloqueioArmado: nova.bloqueio === 1, // atuador armado, independente do motor
          motoristaLogado: (nova.idMotorista && nova.idMotorista !== 0 && nova.nomeMotorista) ? nova.nomeMotorista.trim() : null,
          dentroDe, // array de cercaIds em que o veículo está agora
        };
        batch.set(db.collection(COL_POSICOES).doc(String(id)), {
          idVeiculo: id,
          placa: v.placa,
          idEquipamentoDesc: v.idEquipamentoDesc ?? null,
          ultimaPosicao: enriched,
          atualizadoEm: FieldValue.serverTimestamp(),
        }, { merge: true });
        persistidas.set(id, enriched); // reflete em memória
        writes++;
      }
      if (writes > 0 || eventos > 0) await batch.commit();

      // 5) Resultado: 1 registro por veículo cadastrado, com posição persistida quando existir
      const resultado = veiculos.map(v => {
        const p = persistidas.get(v.idVeiculo);
        if (p) return p;
        return {
          idVeiculo: v.idVeiculo,
          placa: v.placa,
          statusTexto: 'SEM_DADOS',
          motoristaLogado: null,
          latitude: null,
          longitude: null,
          dataPosicao: null,
        };
      });

      return { resultado, writes, eventos };
    });

    // O "data" do cache é { resultado, writes, eventos }
    const posicoes = Array.isArray(data) ? data : data?.resultado || [];
    const writes = Array.isArray(data) ? 0 : data?.writes ?? 0;
    const eventos = Array.isArray(data) ? 0 : data?.eventos ?? 0;
    return { posicoes, total: posicoes.length, cache: { age, fresh }, gravadosNoFirestore: writes, eventosCerca: eventos };
  }
);

// --- jornadaDia: relatório de jornada de motorista (Lei 13.103 + CLT) ---
// Recebe { data: 'YYYY-MM-DD' } (dia local UTC-3) e retorna lista por motorista
export const jornadaDia = onCall(
  { secrets: [SASCAR_USUARIO, SASCAR_SENHA] },
  async (request) => {
    requireAuth(request);
    const data = String(request.data?.data || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      throw new HttpsError('invalid-argument', 'Parâmetro "data" inválido. Use YYYY-MM-DD.');
    }
    const { dataInicio, dataFim } = rangeUtcParaDiaLocal(data);

    // Cache curto pra dia atual (30s) pra atualização "tempo real" no /jornada.
    // Cache longo (5min) pra dias passados (dados não mudam mais).
    const hojeBRT = new Date(Date.now() - 3*60*60*1000).toISOString().split('T')[0];
    const ttl = data === hojeBRT ? 30_000 : 5 * 60_000;
    const cacheKey = `jornada:${data}`;
    const { data: payload, age, fresh } = await cached(cacheKey, ttl, async () => {
      const eventos = await obterEventosTempoDirecao({
        usuario: SASCAR_USUARIO.value(),
        senha: SASCAR_SENHA.value(),
        dataInicio,
        dataFim,
        quantidade: 3000,
      });
      const jornadas = calcularJornadas(eventos, data);
      return { jornadas, totalEventos: eventos.length, dataInicio, dataFim };
    });

    return {
      data,
      ...payload,
      cache: { age, fresh },
    };
  }
);

// --- jornadaPeriodo: jornada agregada de N dias (limite SasIntegra é 1 dia por chamada) ---
// Recebe { dataInicio, dataFim } YYYY-MM-DD, retorna jornadas agregadas por motorista
export const jornadaPeriodo = onCall(
  { secrets: [SASCAR_USUARIO, SASCAR_SENHA], timeoutSeconds: 120 },
  async (request) => {
    requireAuth(request);
    const dataInicio = String(request.data?.dataInicio || '').trim();
    const dataFim = String(request.data?.dataFim || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
      throw new HttpsError('invalid-argument', 'dataInicio e dataFim obrigatórios no formato YYYY-MM-DD');
    }
    if (dataFim < dataInicio) {
      throw new HttpsError('invalid-argument', 'dataFim deve ser >= dataInicio');
    }
    const dias = diasNoPeriodo(dataInicio, dataFim);
    if (dias.length > 31) {
      throw new HttpsError('invalid-argument', 'Período máximo de 31 dias por consulta');
    }

    const cacheKey = `jornadaPer:${dataInicio}:${dataFim}`;
    const { data: payload, age, fresh } = await cached(cacheKey, 10 * 60_000, async () => {
      // Chama 1 dia por vez (SasIntegra limita); usa cache interno por dia
      const porDia = [];
      let totalEventos = 0;
      for (const dia of dias) {
        const { dataInicio: di, dataFim: df } = rangeUtcParaDiaLocal(dia);
        const { data: pj } = await cached(`jornada:${dia}`, 5 * 60_000, async () => {
          const eventos = await obterEventosTempoDirecao({
            usuario: SASCAR_USUARIO.value(),
            senha: SASCAR_SENHA.value(),
            dataInicio: di,
            dataFim: df,
            quantidade: 3000,
          });
          return { jornadas: calcularJornadas(eventos, dia), totalEventos: eventos.length };
        });
        porDia.push({ data: dia, jornadas: pj.jornadas });
        totalEventos += pj.totalEventos || 0;
      }
      const jornadasAgregadas = agregarJornadasPorMotorista(porDia.map(d => d.jornadas));
      return { dias, porDia, jornadasAgregadas, totalEventos };
    });

    return {
      dataInicio,
      dataFim,
      ...payload,
      cache: { age, fresh },
    };
  }
);

// Status do MOTOR — fonte única é ignição + velocidade.
// Campo `bloqueio` da SASCAR reflete estado da saída elétrica do equipamento (config padrão),
// não significa "comando pendente". Por isso NÃO entra mais no status do veículo.
function statusFromPacote(p) {
  const vel = p.velocidade ?? 0;
  const ign = p.ignicao === 1;
  if (ign && vel > 0) return 'EM_MOVIMENTO';
  if (ign) return 'PARADO_LIGADO';
  return 'ESTACIONADO';
}
