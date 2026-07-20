#!/usr/bin/env node
// Hook — notificação Windows toast quando algo salva no vault
// Roda depois dos outros hooks (Stop) — vê o que mudou nos últimos 3s e avisa

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const cwd = (process.env.CLAUDE_CWD || process.cwd()).replaceAll('\\', '/');
if (!cwd.includes('logistica-ia') && cwd !== 'C:/Users/Logistica01') process.exit(0);

const VAULT = 'C:/Users/Logistica01/projetos/logistica-ia';
const AGORA = Date.now();
const CORTE = AGORA - 5000; // últimos 5s

function listar(dir, exts = ['.md']) {
  try {
    const arr = [];
    for (const f of fs.readdirSync(dir)) {
      const full = `${dir}/${f}`;
      if (exts.some(e => f.endsWith(e))) {
        const st = fs.statSync(full);
        if (st.mtimeMs > CORTE) arr.push({ nome: f, mtime: st.mtimeMs });
      }
    }
    return arr;
  } catch { return []; }
}

try {
  const memoriasNovas = listar(`${VAULT}/docs/memoria`);
  const sessaoAt     = listar(`${VAULT}/docs/sessoes`);
  const promptsAt    = listar(`${VAULT}/docs/prompts-user`);

  const partes = [];
  if (memoriasNovas.length > 0) {
    const mem = memoriasNovas.find(m => m.nome !== 'MEMORY.md');
    if (mem) partes.push(`🧠 memória: ${mem.nome.replace('.md','')}`);
  }
  if (sessaoAt.length > 0) partes.push('📝 sessão atualizada');
  if (promptsAt.length > 0) partes.push('💬 prompt salvo');

  if (partes.length === 0) process.exit(0);

  const titulo = 'Vault Obsidian sincronizou';
  const corpo = partes.join(' · ').slice(0, 200);

  // PowerShell toast via BurntToast se instalado, senão fallback WScript
  const psScript = `
try {
  Import-Module BurntToast -ErrorAction Stop
  New-BurntToastNotification -Text "${titulo.replace(/"/g,"'")}", "${corpo.replace(/"/g,"'")}" -AppLogo "$env:USERPROFILE\\projetos\\logistica-ia\\frontend\\public\\favicon.svg" 2>&1 | Out-Null
} catch {
  # Fallback nativo Windows 10+
  Add-Type -AssemblyName System.Windows.Forms
  $notif = New-Object System.Windows.Forms.NotifyIcon
  $notif.Icon = [System.Drawing.SystemIcons]::Information
  $notif.Visible = $true
  $notif.ShowBalloonTip(3000, "${titulo.replace(/"/g,"'")}", "${corpo.replace(/"/g,"'")}", [System.Windows.Forms.ToolTipIcon]::Info)
  Start-Sleep -Milliseconds 3500
  $notif.Dispose()
}
`;
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g,'; ').replace(/"/g,'\\"')}"`, { timeout: 5000, stdio: 'ignore' });
  process.exit(0);
} catch {
  process.exit(0);
}
