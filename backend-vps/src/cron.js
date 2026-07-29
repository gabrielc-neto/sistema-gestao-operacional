// Cronjobs internos — rodam com setInterval do Node no próprio processo.
// Nada de crontab do sistema (fica tudo dentro do PM2).

import { atualizarPosicoesSascar } from "./routes/sascar.js";
import { sincronizarCta } from "./routes/cta.js";
import { setCache } from "./integracoes/cache.js";
import { obterEventosTempoDirecao } from "./integracoes/sascar/soap.js";
import { rangeUtcParaDiaLocal } from "./integracoes/sascar/jornada.js";
import { q } from "./db.js";

const INTERVALO_SASCAR_MS = 2 * 60_000;     // 2 min (user quer tempo real, respeitando rate limit SASCAR 1req/60s)
const INTERVALO_CTA_MS    = 15 * 60_000;    // 15 min (rate limit CTA é 1req/60s, mas 15min sobra)
const INTERVALO_JORNADA_PERSIST_MS = 60 * 60_000; // 1h — verifica se precisa salvar jornada

let sascarBusy = false, ctaBusy = false, jornadaBusy = false;
let ultimoDiaPersistido = null;

async function loopSascar() {
  if (sascarBusy) return;
  sascarBusy = true;
  try {
    const r = await atualizarPosicoesSascar();
    if (r.erro) console.warn("[cron][sascar]", r.erro);
    else {
      // Alimenta cache que o endpoint /api/sascar/posicoes vai servir
      setCache("sascar-posicoes", r);
      console.log(`[cron][sascar] posicoes=${r.total} writes=${r.gravadosNoBanco} eventos=${r.eventosCerca}`);
    }
  } catch (e) { console.error("[cron][sascar] erro:", e.message); }
  finally { sascarBusy = false; }
}

async function loopCta() {
  if (ctaBusy) return;
  ctaBusy = true;
  try {
    const r = await sincronizarCta();
    if (r.erro) console.warn("[cron][cta]", r.erro);
    else console.log(`[cron][cta] codigo=${r.codigo || r.ok} novos=${r.stats?.novos} atualizados=${r.stats?.atualizados}`);
  } catch (e) { console.error("[cron][cta] erro:", e.message); }
  finally { ctaBusy = false; }
}

// Persiste eventos de jornada SASCAR no PG. SASCAR só retém ~3 dias
// então salvamos o dia D-1 (ontem) toda madrugada + backfill dos 2 anteriores.
async function persistirJornadaDia(diaISO) {
  const usuario = process.env.SASCAR_USUARIO;
  const senha   = process.env.SASCAR_SENHA;
  if (!usuario || !senha) return { skip: "sem credenciais" };

  const { dataInicio, dataFim } = rangeUtcParaDiaLocal(diaISO);
  const eventos = await obterEventosTempoDirecao({ usuario, senha, dataInicio, dataFim, quantidade: 3000 });
  if (eventos.length === 0) return { dia: diaISO, salvos: 0, sascarVazio: true };

  await q(
    `INSERT INTO documents (collection, id, data) VALUES ('sascar_jornada_eventos', $1, $2)
     ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data`,
    [diaISO, JSON.stringify({ eventos, salvoEm: new Date().toISOString(), totalEventos: eventos.length, origem: "cron" })]
  );
  return { dia: diaISO, salvos: eventos.length };
}

async function loopPersistirJornada() {
  if (jornadaBusy) return;
  jornadaBusy = true;
  try {
    const agoraBRT = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const hojeBRT = agoraBRT.toISOString().slice(0, 10);
    // Roda 1x por dia: só se já rodou hoje, pula
    if (ultimoDiaPersistido === hojeBRT) return;

    // Backfill: salva ontem + antes-de-ontem + hoje-3 (janela SASCAR)
    const diasParaSalvar = [];
    for (let d = 1; d <= 3; d++) {
      const dt = new Date(agoraBRT.getTime() - d * 24 * 60 * 60 * 1000);
      diasParaSalvar.push(dt.toISOString().slice(0, 10));
    }
    // Também salva hoje (snapshot parcial)
    diasParaSalvar.push(hojeBRT);

    for (const dia of diasParaSalvar) {
      try {
        const r = await persistirJornadaDia(dia);
        console.log(`[cron][jornada-persist] ${dia}:`, JSON.stringify(r));
        // Rate limit SASCAR: espera 65s entre calls
        await new Promise(r => setTimeout(r, 65_000));
      } catch (e) {
        console.warn(`[cron][jornada-persist] ${dia} falhou: ${e.message.slice(0,120)}`);
        await new Promise(r => setTimeout(r, 65_000));
      }
    }
    ultimoDiaPersistido = hojeBRT;
  } catch (e) { console.error("[cron][jornada-persist] erro:", e.message); }
  finally { jornadaBusy = false; }
}

export function iniciarCronjobs() {
  if (process.env.CRON_DISABLED === "true") {
    console.log("[cron] desabilitado por env CRON_DISABLED=true");
    return;
  }
  console.log(`[cron] iniciando — sascar a cada ${INTERVALO_SASCAR_MS/60000}min, cta a cada ${INTERVALO_CTA_MS/60000}min, jornada-persist 1x/dia`);
  // Primeira execução com pequeno delay (deixa server subir antes)
  setTimeout(loopSascar, 30_000);
  setTimeout(loopCta,    60_000);
  setTimeout(loopPersistirJornada, 120_000); // backfill imediato ao subir
  setInterval(loopSascar, INTERVALO_SASCAR_MS);
  setInterval(loopCta,    INTERVALO_CTA_MS);
  setInterval(loopPersistirJornada, INTERVALO_JORNADA_PERSIST_MS);
}
