#!/usr/bin/env node
// UserPromptSubmit hook — salva cada mensagem do user no vault Obsidian
// Roda ANTES do Claude processar. Grava toda entrada em docs/prompts-user/YYYY-MM-DD.md

import fs from 'node:fs';
import path from 'node:path';

const VAULT = 'C:/Users/Logistica01/projetos/logistica-ia';
const DIR = `${VAULT}/docs/prompts-user`;

try {
  // Só ativa no projeto logistica-ia
  const cwd = (process.env.CLAUDE_CWD || process.cwd()).replaceAll('\\', '/');
  if (!cwd.includes('logistica-ia') && cwd !== 'C:/Users/Logistica01') {
    process.exit(0);
  }

  // Lê o prompt do stdin (Claude Code passa via stdin)
  let payload = '';
  process.stdin.setEncoding('utf-8');
  for await (const chunk of process.stdin) payload += chunk;

  let prompt = '';
  try {
    // Tenta como JSON primeiro (formato padrão dos hooks)
    const j = JSON.parse(payload);
    prompt = j.prompt || j.user_message || j.message || payload;
  } catch {
    prompt = payload;
  }

  if (!prompt.trim()) process.exit(0);

  fs.mkdirSync(DIR, { recursive: true });
  const hoje = new Date();
  const p = n => String(n).padStart(2, '0');
  const dataArq = `${hoje.getFullYear()}-${p(hoje.getMonth()+1)}-${p(hoje.getDate())}`;
  const hora    = `${p(hoje.getHours())}:${p(hoje.getMinutes())}:${p(hoje.getSeconds())}`;

  const arquivo = `${DIR}/${dataArq}.md`;

  // Header se arquivo novo
  if (!fs.existsSync(arquivo)) {
    fs.writeFileSync(arquivo, `# Prompts do user — ${dataArq}\n\nRegistro automático de TODA mensagem enviada pelo user (hook UserPromptSubmit).\n\n---\n\n`);
  }

  // Append da mensagem
  const linhas = [
    `## ${hora}`,
    '',
    prompt.trim(),
    '',
    '---',
    '',
  ];
  fs.appendFileSync(arquivo, linhas.join('\n'));

  // Silent success — não polui stdout senão vira input do Claude
  process.exit(0);
} catch (e) {
  // Falha silenciosa — nunca bloqueia o user
  process.exit(0);
}
