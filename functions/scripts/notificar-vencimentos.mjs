#!/usr/bin/env node
// Notifica vencimentos de manutenção via toast Windows + email diário (Gmail SMTP)
// Uso: node scripts/notificar-vencimentos.mjs
//      node scripts/notificar-vencimentos.mjs --daemon   (fica rodando, toast cada 4h + email 07:00)
//      node scripts/notificar-vencimentos.mjs --silent   (loga sem disparar toast/email — dry-run)
//      node scripts/notificar-vencimentos.mjs --email-agora  (força envio de email agora, mesmo fora das 7h)
//
// Config email (arquivo functions/scripts/email-config.json — gitignored):
//   { "gmailUser": "...@gmail.com", "gmailAppPassword": "xxxx", "destinatarios": ["..."] }
// App password: https://myaccount.google.com/apppasswords (ativa 2FA primeiro)

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// serviceAccountKey.json fica em scripts/ do REPO (não do functions/)
const SA_PATH = path.join(__dirname, '..', '..', 'scripts', 'serviceAccountKey.json');
const EMAIL_CONFIG_PATH = path.join(__dirname, 'email-config.json');

// Flags
const DAEMON = process.argv.includes('--daemon');
const SILENT = process.argv.includes('--silent');
const EMAIL_AGORA = process.argv.includes('--email-agora');
const INTERVAL_HORAS = 4;
const HORA_EMAIL_DIARIO = 7; // 07:00 BRT
let ultimoEmailEnviadoEmData = null; // "YYYY-MM-DD" pra evitar duplicidade no mesmo dia

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

/** Envia email diário via Gmail SMTP */
async function enviarEmail({ vencidos, proximos7, proximos15 }) {
  if (SILENT) { console.log('[SILENT] email skipado'); return; }
  if (!existsSync(EMAIL_CONFIG_PATH)) {
    console.log('⚠ email-config.json não existe — pular envio. Crie:', EMAIL_CONFIG_PATH);
    return;
  }
  const cfg = JSON.parse(readFileSync(EMAIL_CONFIG_PATH, 'utf8'));
  if (!cfg.gmailUser || !cfg.gmailAppPassword || !Array.isArray(cfg.destinatarios) || cfg.destinatarios.length === 0) {
    console.log('⚠ email-config.json incompleto — precisa gmailUser + gmailAppPassword + destinatarios');
    return;
  }

  const transp = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: cfg.gmailUser, pass: cfg.gmailAppPassword },
  });

  const dataBR = new Date().toLocaleDateString('pt-BR');
  const total = vencidos.length + proximos7.length + proximos15.length;

  function bloco(items, titulo, cor) {
    if (items.length === 0) return '';
    const linhas = items.slice(0, 30).map(i => {
      const quando = i.diffDias < 0 ? `venceu há ${-i.diffDias}d` : (i.diffDias === 0 ? 'vence hoje' : `${i.diffDias}d`);
      return `<tr><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:14px">${i.tipo}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600">${i.placa || i.motorista || '—'}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:14px;color:${cor}">${quando}</td></tr>`;
    }).join('');
    return `
      <h3 style="color:${cor};margin:16px 0 6px;font-size:15px">${titulo} (${items.length})</h3>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
        <thead><tr style="background:#f8fafc"><th style="padding:6px 10px;text-align:left;font-size:12px;color:#64748b">Item</th><th style="padding:6px 10px;text-align:left;font-size:12px;color:#64748b">Placa/Motorista</th><th style="padding:6px 10px;text-align:left;font-size:12px;color:#64748b">Prazo</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>${items.length > 30 ? `<p style="font-size:12px;color:#64748b;margin:4px 0">+${items.length-30} outros — ver /manutencao?aba=alertas</p>` : ''}
    `;
  }

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#f8fafc">
      <h2 style="color:#1a3a5c;margin:0 0 4px">📅 Pontual Logística — Vencimentos ${dataBR}</h2>
      <p style="color:#64748b;margin:0 0 16px;font-size:14px">${total} item(s) para atenção nos próximos 15 dias.</p>
      ${bloco(vencidos, '🔴 Vencidos', '#b91c1c')}
      ${bloco(proximos7, '🟡 Vencem em até 7 dias', '#b45309')}
      ${bloco(proximos15, '🟢 Vencem em 8-15 dias', '#15803d')}
      <p style="margin-top:20px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
        Abrir sistema: <a href="http://localhost:5175/manutencao?aba=alertas" style="color:#4338ca">Alertas de manutenção</a><br>
        Email automático — daemon rodando em ${process.env.COMPUTERNAME || 'PC local'}
      </p>
    </div>
  `;

  try {
    await transp.sendMail({
      from: `"Pontual Logística" <${cfg.gmailUser}>`,
      to: cfg.destinatarios.join(', '),
      subject: `📅 Vencimentos Pontual ${dataBR} — ${vencidos.length > 0 ? `🔴 ${vencidos.length} vencidos` : `${total} atenção`}`,
      html,
    });
    console.log(`✉️  Email enviado pra ${cfg.destinatarios.length} destinatário(s)`);
  } catch (e) {
    console.error('❌ envio email falhou:', e.message);
  }
}

async function checarEnotificar({ tambemEmail = false } = {}) {
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

  // Email diário — se solicitado
  if (tambemEmail) {
    await enviarEmail({ vencidos, proximos7, proximos15 });
    ultimoEmailEnviadoEmData = new Date().toISOString().slice(0, 10);
  }
}

function ehHoraDeEmailDiario() {
  const agora = new Date();
  const horaBRT = (agora.getUTCHours() - 3 + 24) % 24;
  const hojeBRT = new Date(agora.getTime() - 3*3600*1000).toISOString().slice(0, 10);
  if (ultimoEmailEnviadoEmData === hojeBRT) return false; // já enviou hoje
  return horaBRT === HORA_EMAIL_DIARIO;
}

async function main() {
  console.log('🔔 Notificar Vencimentos Pontual — iniciado', new Date().toISOString());
  await checarEnotificar({ tambemEmail: EMAIL_AGORA });

  if (DAEMON) {
    const ms = INTERVAL_HORAS * 3600 * 1000;
    console.log(`\n📅 Daemon ativo — toast cada ${INTERVAL_HORAS}h · email diário 07:00`);
    setInterval(async () => {
      try { await checarEnotificar({ tambemEmail: ehHoraDeEmailDiario() }); } catch (e) { console.error('erro loop:', e.message); }
    }, ms);
    // Loop dedicado só pro email — checa a cada 30min se é hora
    setInterval(async () => {
      if (ehHoraDeEmailDiario()) {
        try { await checarEnotificar({ tambemEmail: true }); } catch (e) { console.error('erro email:', e.message); }
      }
    }, 30 * 60 * 1000);
    // Mantém processo vivo
    return;
  }
  process.exit(0);
}

main().catch(e => { console.error('fatal:', e); process.exit(1); });
