#!/usr/bin/env node
// Hook Stop — dispara ao FIM de cada resposta do Claude Code.
// Exporta a sessão atual (.jsonl) pra .md legível no vault Obsidian.
// Roda rápido (< 2s) pra não atrasar o próximo prompt.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const cwd = (process.env.CLAUDE_CWD || process.cwd()).replaceAll('\\', '/');
if (!cwd.includes('logistica-ia') && cwd !== 'C:/Users/Logistica01') {
  process.exit(0);
}

const SCRIPT = 'C:/Users/Logistica01/projetos/logistica-ia/scripts/exportar-conversa-claude.mjs';
if (!existsSync(SCRIPT)) process.exit(0);

// Dispara em background — não bloqueia o retorno do hook
const p = spawn('node', [SCRIPT], {
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
});
p.unref();

process.exit(0);
