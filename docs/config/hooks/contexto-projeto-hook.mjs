#!/usr/bin/env node
// SessionStart hook — injeta contexto do projeto logistica-ia automaticamente
// Roda TODA vez que sessão Claude Code abre.
// Output aparece no contexto do assistente → não depende de eu "lembrar" de ler.

import fs from 'node:fs';
import path from 'node:path';

const VAULT = 'C:/Users/Logistica01/projetos/logistica-ia';
const SESSOES_DIR = `${VAULT}/docs/sessoes`;
const MEMORY_INDEX = `${VAULT}/docs/memoria/MEMORY.md`;

function log(...args) { process.stderr.write(args.join(' ') + '\n'); }

try {
  // 1) Só ativa se o CWD for o projeto logistica-ia (ou subpasta)
  const cwd = process.env.CLAUDE_CWD || process.cwd();
  const emProjeto = cwd.replaceAll('\\', '/').includes('logistica-ia') ||
                    cwd.replaceAll('\\', '/') === 'C:/Users/Logistica01';
  if (!emProjeto) {
    process.exit(0);
  }

  // 2) Última sessão registrada
  let ultimaSessao = null;
  if (fs.existsSync(SESSOES_DIR)) {
    const arquivos = fs.readdirSync(SESSOES_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    if (arquivos.length) ultimaSessao = arquivos[0];
  }

  // 3) Extrai pendências
  let pendencias = '(nenhuma registrada)';
  let ultimosBlocos = '(sem log ainda)';
  if (ultimaSessao) {
    const conteudo = fs.readFileSync(`${SESSOES_DIR}/${ultimaSessao}`, 'utf-8');
    // Pega seção "Pendente"
    const mPend = conteudo.match(/##[^\n]*[Pp]endente[^\n]*\n([\s\S]*?)(?=\n##|\n---|$)/);
    if (mPend) pendencias = mPend[1].trim().split('\n').slice(0, 8).join('\n');
    // Pega últimos 3 blocos "## HH:MM"
    const blocos = [...conteudo.matchAll(/\n(## \d{2}:\d{2}[^\n]+)/g)].slice(-3).map(m => m[1]);
    if (blocos.length) ultimosBlocos = blocos.join('\n');
  }

  // 4) Contagem de memórias
  let numMemorias = 0;
  const memoriaDir = `${VAULT}/docs/memoria`;
  if (fs.existsSync(memoriaDir)) {
    numMemorias = fs.readdirSync(memoriaDir).filter(f => f.endsWith('.md')).length;
  }

  // 5) Git status resumido
  let branchAtual = '(não detectada)';
  let commitsBranch = 0;
  try {
    const { execSync } = await import('node:child_process');
    branchAtual = execSync('git -C "' + VAULT + '" branch --show-current', { encoding: 'utf-8' }).trim();
    commitsBranch = Number(execSync('git -C "' + VAULT + '" rev-list --count master..HEAD 2>NUL', { encoding: 'utf-8' }).trim() || 0);
  } catch { /* ignora se git falhar */ }

  // 6) Monta output — Claude Code injeta isso no contexto do sistema
  const output = [
    '════════════════════════════════════════════════════════════════',
    '  🧠 CONTEXTO AUTO-CARREGADO — Sistema Logística IA (Pontual)',
    '════════════════════════════════════════════════════════════════',
    '',
    `📅 Última sessão registrada: ${ultimaSessao || 'nenhuma'}`,
    `🌿 Branch atual: ${branchAtual} (${commitsBranch} commits acima de master)`,
    `🧠 Memórias no vault: ${numMemorias}`,
    '',
    '⚡ REGRAS PERMANENTES DO USER (VALE TODA SESSÃO):',
    '',
    '  1. NÃO PERGUNTAR "onde paramos?" — o contexto está abaixo.',
    '     Abrir a conversa com "vi que ontem paramos em [X], continuando..."',
    '',
    '  2. REGISTRAR TODA MODIFICAÇÃO em docs/sessoes/YYYY-MM-DD.md,',
    '     mesmo sem commit git. User pode fechar terminal sem querer.',
    '',
    '  3. DOWNLOADS do PC nunca entra no Obsidian (arquivo/downloads-*/).',
    '',
    '  4. FROTA Pontual: cavalo sempre 3 eixos (trucado/traçado).',
    '     carreta=5, bitrem=7, rodotrem=9. Sem toco/truck/bitruck.',
    '',
    '  5. 99% operação em PARANÁ — Novos Caminhos ANTT (tarifas R$ 2-3).',
    '',
    '  6. DISCO F: intocável — não apagar/mover nada.',
    '',
    '📋 ÚLTIMOS BLOCOS DA SESSÃO ANTERIOR:',
    '',
    ultimosBlocos,
    '',
    '📌 PENDÊNCIAS DA ÚLTIMA SESSÃO:',
    '',
    pendencias,
    '',
    '📖 LER PRIMEIRO: BRAIN.md · docs/PERFIL-USER.md · docs/REGRAS-DE-TRABALHO.md',
    '════════════════════════════════════════════════════════════════',
  ].join('\n');

  console.log(output);
} catch (e) {
  log('[contexto-projeto-hook] ERRO:', e.message);
  // Não bloqueia sessão em caso de erro
  process.exit(0);
}
