// Cronjobs internos — rodam com setInterval do Node no próprio processo.
// Nada de crontab do sistema (fica tudo dentro do PM2).

import { atualizarPosicoesSascar } from "./routes/sascar.js";
import { sincronizarCta } from "./routes/cta.js";

const INTERVALO_SASCAR_MS = 5 * 60_000;     // 5 min
const INTERVALO_CTA_MS    = 15 * 60_000;    // 15 min (rate limit CTA é 1req/60s, mas 15min sobra)

let sascarBusy = false, ctaBusy = false;

async function loopSascar() {
  if (sascarBusy) return;
  sascarBusy = true;
  try {
    const r = await atualizarPosicoesSascar();
    if (r.erro) console.warn("[cron][sascar]", r.erro);
    else console.log(`[cron][sascar] posicoes=${r.total} writes=${r.gravadosNoBanco} eventos=${r.eventosCerca}`);
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

export function iniciarCronjobs() {
  if (process.env.CRON_DISABLED === "true") {
    console.log("[cron] desabilitado por env CRON_DISABLED=true");
    return;
  }
  console.log(`[cron] iniciando — sascar a cada ${INTERVALO_SASCAR_MS/60000}min, cta a cada ${INTERVALO_CTA_MS/60000}min`);
  // Primeira execução com pequeno delay (deixa server subir antes)
  setTimeout(loopSascar, 30_000);
  setTimeout(loopCta,    60_000);
  setInterval(loopSascar, INTERVALO_SASCAR_MS);
  setInterval(loopCta,    INTERVALO_CTA_MS);
}
