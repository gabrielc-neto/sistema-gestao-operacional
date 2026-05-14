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
  ultimaPorVeiculo,
} from './src/sascar/soap.js';
import { cached } from './src/sascar/cache.js';

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
      // 1) Em paralelo: chama SASCAR + lê estado anterior do Firestore
      const [pacotes, veiculos, snapshot] = await Promise.all([
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

      // 4) Batch write: grava no Firestore só veículos com posição NOVA (idPacote maior)
      const batch = db.batch();
      let writes = 0;
      for (const [id, nova] of novas) {
        const v = veiculos.find(x => x.idVeiculo === id);
        if (!v) continue;
        const anterior = persistidas.get(id);
        if (anterior && Number(nova.idPacote) <= Number(anterior.idPacote)) continue;

        const enriched = {
          ...nova,
          placa: v.placa,
          statusTexto: statusFromPacote(nova),
          bloqueioArmado: nova.bloqueio === 1, // atuador armado, independente do motor
          motoristaLogado: (nova.idMotorista && nova.idMotorista !== 0 && nova.nomeMotorista) ? nova.nomeMotorista.trim() : null,
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
      if (writes > 0) await batch.commit();

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

      return { resultado, writes };
    });

    // O "data" do cache é { resultado, writes }
    const posicoes = Array.isArray(data) ? data : data?.resultado || [];
    const writes = Array.isArray(data) ? 0 : data?.writes ?? 0;
    return { posicoes, total: posicoes.length, cache: { age, fresh }, gravadosNoFirestore: writes };
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
