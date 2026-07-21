#!/usr/bin/env node
// Notifica vencimentos de manutenção via toast Windows
// Uso: node scripts/notificar-vencimentos.mjs
//      node scripts/notificar-vencimentos.mjs --daemon   (fica rodando, notifica a cada 4h)
//      node scripts/notificar-vencimentos.mjs --silent   (loga sem disparar toast — pra dry-run)

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// serviceAccountKey.json fica em scripts/ do REPO (não do functions/)
const SA_PATH = path.join(__dirname, '..', '..', 'scripts', 'serviceAccountKey.json');

// Flags
const DAEMON = process.argv.includes('--daemon');
const SILENT = process.argv.includes('--silent');
const INTERVAL_HORAS = 4;

// Inicializa Firebase Admin (produção)
try {
  const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
} catch (e) {
  console.error('❌ Falha ao carregar serviceAccountKey.json:', e.message);
  process.exit(1);
}

const db = admin.firestore();

/** Dispara toast Windows via PowerShell (BurntToast-free) */
function toastWindows(titulo, msg) {
  if (SILENT) { console.log(`[SILENT] ${titulo} · ${msg}`); return; }
  const t = String(titulo).replace(/"/g, "'").slice(0, 60);
  const m = String(msg).replace(/"/g, "'").slice(0, 400);
  const ps = `Add-Type -AssemblyName System.Windows.Forms; ` +
    `$n = New-Object System.Windows.Forms.NotifyIcon; ` +
    `$n.Icon = [System.Drawing.SystemIcons]::Information; ` +
    `$n.Visible = $true; ` +
    `$n.ShowBalloonTip(10000, "${t}", "${m}", 'Info'); ` +
    `Start-Sleep -Seconds 11; ` +
    `$n.Dispose()`;
  try {
    execSync(`powershell -NoProfile -WindowStyle Hidden -Command "${ps}"`, { stdio: 'ignore', timeout: 15000 });
  } catch (e) {
    console.warn('toast falhou:', e.message);
  }
}

/** Parse venc → Date (aceita "YYYY-MM-DD" ou Timestamp Firestore) */
function parseVenc(v) {
  if (!v) return null;
  if (typeof v === 'object' && typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Date.UTC(+m[1], +m[2]-1, +m[3]));
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function checarEnotificar() {
  const HOJE = new Date();
  HOJE.setHours(0, 0, 0, 0);
  const LIMITE = new Date(HOJE.getTime() + 15 * 86400000);

  let snap;
  try {
    snap = await db.collection('manutencoes').get();
  } catch (e) {
    console.error('❌ Firestore falhou:', e.message);
    return;
  }

  const vencidos = [];
  const proximos7 = [];
  const proximos15 = [];

  snap.forEach(doc => {
    const d = doc.data();
    const venc = parseVenc(d.venc);
    if (!venc) return;
    const diffDias = Math.floor((venc - HOJE) / 86400000);
    const item = {
      tipo: d.tipoLabel || d.tipoId || d.tipo || 'Item',
      placa: d.placa || d.veiculoPlaca || '',
      motorista: d.motoristaNome || d.motorista || '',
      diffDias,
      venc,
    };
    if (diffDias < 0) vencidos.push(item);
    else if (diffDias <= 7) proximos7.push(item);
    else if (diffDias <= 15) proximos15.push(item);
  });

  const total = vencidos.length + proximos7.length + proximos15.length;
  const ts = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  console.log(`\n[${ts}] Vencimentos: 🔴${vencidos.length} vencidos · 🟡${proximos7.length} em ≤7d · 🟢${proximos15.length} em 8-15d`);

  if (total === 0) {
    console.log('  Nenhum vencimento próximo. Skip toast.');
    return;
  }

  // Toast principal — resumo
  const partes = [];
  if (vencidos.length) partes.push(`🔴 ${vencidos.length} vencido${vencidos.length > 1 ? 's' : ''}`);
  if (proximos7.length) partes.push(`🟡 ${proximos7.length} em ≤7d`);
  if (proximos15.length) partes.push(`🟢 ${proximos15.length} em 8-15d`);

  const resumo = partes.join(' · ');
  const primeiros = [...vencidos, ...proximos7].slice(0, 3).map(i =>
    `${i.tipo} ${i.placa || i.motorista} (${i.diffDias < 0 ? `venceu há ${-i.diffDias}d` : `${i.diffDias}d`})`
  ).join('\n');

  toastWindows(
    `📅 Vencimentos Pontual — ${resumo}`,
    primeiros || 'Ver detalhes em /manutencao?aba=alertas'
  );

  // Log detalhado no console
  if (vencidos.length) {
    console.log('\n  🔴 VENCIDOS:');
    vencidos.slice(0, 10).forEach(i => console.log(`    · ${i.tipo} ${i.placa || i.motorista} — há ${-i.diffDias}d`));
  }
  if (proximos7.length) {
    console.log('\n  🟡 PRÓXIMOS 7 DIAS:');
    proximos7.slice(0, 10).forEach(i => console.log(`    · ${i.tipo} ${i.placa || i.motorista} — ${i.diffDias}d`));
  }
}

async function main() {
  console.log('🔔 Notificar Vencimentos Pontual — iniciado', new Date().toISOString());
  await checarEnotificar();

  if (DAEMON) {
    const ms = INTERVAL_HORAS * 3600 * 1000;
    console.log(`\n📅 Daemon ativo — próxima verificação em ${INTERVAL_HORAS}h`);
    setInterval(async () => {
      try { await checarEnotificar(); } catch (e) { console.error('erro loop:', e.message); }
    }, ms);
    // Mantém processo vivo
    return;
  }
  process.exit(0);
}

main().catch(e => { console.error('fatal:', e); process.exit(1); });
