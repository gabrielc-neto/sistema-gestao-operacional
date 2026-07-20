#!/usr/bin/env node
// Hook Stop — bloco RICO em contexto no docs/sessoes/YYYY-MM-DD.md
// Extrai do .jsonl da sessão: (1) prompt do user, (2) resposta minha,
// (3) tools usadas, (4) arquivos afetados. Grava resumo entendível
// por qualquer IA nova assumindo o projeto.

import fs from 'node:fs';
import path from 'node:path';

const cwd = (process.env.CLAUDE_CWD || process.cwd()).replaceAll('\\', '/');
if (!cwd.includes('logistica-ia') && cwd !== 'C:/Users/Logistica01') {
  process.exit(0);
}

const VAULT = 'C:/Users/Logistica01/projetos/logistica-ia';
const SESSIONS_DIR = 'C:/Users/Logistica01/.claude/projects/C--Users-Logistica01';

function limpar(txt, max = 500) {
  if (!txt) return '';
  return String(txt)
    .replace(/^#+\s*/gm, '')
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

try {
  if (!fs.existsSync(SESSIONS_DIR)) process.exit(0);
  const files = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({ name: f, path: path.join(SESSIONS_DIR, f), mtime: fs.statSync(path.join(SESSIONS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!files.length) process.exit(0);
  const jsonl = files[0].path;

  const raw = fs.readFileSync(jsonl, 'utf-8').split('\n').filter(Boolean);
  if (raw.length === 0) process.exit(0);

  // Percorre de trás pra frente: pega ÚLTIMA resposta minha + PROMPT que a antecedeu
  let ultimaResposta = null;
  let ultimoPrompt = null;
  const toolsUsados = [];
  const arquivosMexidos = new Set();
  let indexUltimaResposta = -1;

  for (let i = raw.length - 1; i >= 0; i--) {
    let o;
    try { o = JSON.parse(raw[i]); } catch { continue; }
    const msg = o.message;
    if (!msg) continue;

    if (msg.role === 'assistant' && !ultimaResposta) {
      ultimaResposta = { ts: o.timestamp || new Date().toISOString(), content: msg.content };
      indexUltimaResposta = i;
    }
    // Coleta tool_use dessa msg do assistant
    if (msg.role === 'assistant' && Array.isArray(msg.content) && ultimaResposta && i >= indexUltimaResposta) {
      for (const c of msg.content) {
        if (c.type === 'tool_use') {
          const name = c.name || '';
          toolsUsados.push(name);
          const input = c.input || {};
          if (input.file_path) arquivosMexidos.add(input.file_path.replaceAll('\\', '/').replace(VAULT + '/', ''));
          if (input.path) arquivosMexidos.add(input.path.replaceAll('\\', '/').replace(VAULT + '/', ''));
        }
      }
    }
  }

  // Achar o prompt do user que veio ANTES da minha resposta
  if (indexUltimaResposta > 0) {
    for (let i = indexUltimaResposta - 1; i >= 0; i--) {
      let o;
      try { o = JSON.parse(raw[i]); } catch { continue; }
      const msg = o.message;
      if (msg?.role === 'user') {
        const c = msg.content;
        if (typeof c === 'string') ultimoPrompt = c;
        else if (Array.isArray(c)) {
          const t = c.find(x => x.type === 'text');
          if (t?.text) ultimoPrompt = t.text;
        }
        // Ignorar system-reminder e tool_result
        if (ultimoPrompt && !ultimoPrompt.includes('<system-reminder>') && !ultimoPrompt.includes('tool_result')) {
          break;
        }
        ultimoPrompt = null;
      }
    }
  }

  if (!ultimaResposta) process.exit(0);

  // Extrai resposta como texto legível
  let textoResposta = '';
  if (Array.isArray(ultimaResposta.content)) {
    const textos = ultimaResposta.content.filter(c => c.type === 'text' && c.text).map(c => c.text);
    textoResposta = textos.join(' ');
  }

  // Timestamp HH:MM
  const ts = new Date(ultimaResposta.ts);
  const p = n => String(n).padStart(2, '0');
  const hhmm = `${p(ts.getHours())}:${p(ts.getMinutes())}`;
  const dataArq = `${ts.getFullYear()}-${p(ts.getMonth()+1)}-${p(ts.getDate())}`;

  const logPath = `${VAULT}/docs/sessoes/${dataArq}.md`;

  // Dedupe: se já loggou esse timestamp exato, pula
  if (fs.existsSync(logPath)) {
    const existing = fs.readFileSync(logPath, 'utf-8');
    const marker = `\n## ${hhmm} — `;
    // Verifica se já tem entrada nesse minuto — evita duplicar
    const linhas = existing.split('\n').filter(l => l.startsWith('## ' + hhmm + ' —'));
    if (linhas.length > 0) {
      // Já tem — mas verifica se resposta é a mesma (primeiros 60 chars)
      const primeiroTitulo = limpar(textoResposta.split('\n').find(l => l.trim().length > 5) || '(resposta)', 60);
      if (existing.includes(primeiroTitulo)) process.exit(0);
    }
  }

  const toolsUnicas = [...new Set(toolsUsados)].filter(Boolean);
  const arqUnicos = [...arquivosMexidos];

  // Título curto — primeira linha significativa da resposta
  let titulo = '(sem título)';
  const linhas = textoResposta.split('\n').filter(l => l.trim().length > 5);
  for (const l of linhas.slice(0, 3)) {
    const clean = l.replace(/^#+\s*/, '').replace(/^[\*\-\>]+\s*/, '').trim();
    if (clean.length > 5) { titulo = clean.slice(0, 90); if (clean.length > 90) titulo += '...'; break; }
  }

  // Monta bloco RICO
  const bloco = [];
  bloco.push('');
  bloco.push(`## ${hhmm} — ${titulo}`);
  bloco.push('');

  if (ultimoPrompt) {
    bloco.push(`**User pediu:** ${limpar(ultimoPrompt, 300)}`);
    bloco.push('');
  }

  if (textoResposta) {
    // Pega resumo — primeiros parágrafos até ~500 chars
    const resumo = limpar(textoResposta, 700);
    bloco.push(`**O que fiz / resposta:** ${resumo}`);
    bloco.push('');
  }

  if (arqUnicos.length > 0) {
    bloco.push(`**Arquivos afetados (${arqUnicos.length}):**`);
    arqUnicos.slice(0, 10).forEach(a => bloco.push(`- \`${a}\``));
    if (arqUnicos.length > 10) bloco.push(`- ... +${arqUnicos.length - 10} outros`);
    bloco.push('');
  }

  if (toolsUnicas.length > 0) {
    bloco.push(`**Tools usadas:** ${toolsUnicas.join(', ')}`);
    bloco.push('');
  }

  bloco.push('---');
  bloco.push('');

  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, `# Sessão ${dataArq}\n\nLog auto-gerado por hook Stop (\`.claude/helpers/auto-sessao-log.mjs\`).\nCada bloco tem: prompt do user + o que Claude fez + arquivos + tools.\nQualquer IA nova assumindo o projeto pode ler este log pra pegar contexto completo do dia.\n\n---\n`);
  }
  fs.appendFileSync(logPath, bloco.join('\n'));
  process.exit(0);
} catch (e) {
  process.exit(0);
}
