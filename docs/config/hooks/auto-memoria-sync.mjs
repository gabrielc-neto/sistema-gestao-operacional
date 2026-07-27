#!/usr/bin/env node
// Hook Stop — sincroniza memórias .claude/projects/.../memory/*.md → vault docs/memoria/*.md
// Também rebuilda docs/memoria/MEMORY.md como índice.
// Substitui o hook auto-memory-hook.mjs sync que virou no-op (memory package not available).

import fs from 'node:fs';
import path from 'node:path';

const cwd = (process.env.CLAUDE_CWD || process.cwd()).replaceAll('\\', '/');
if (!cwd.includes('logistica-ia') && cwd !== 'C:/Users/Logistica01') {
  process.exit(0);
}

const SRC = 'C:/Users/Logistica01/.claude/projects/C--Users-Logistica01/memory';
const DST = 'C:/Users/Logistica01/projetos/logistica-ia/docs/memoria';

try {
  if (!fs.existsSync(SRC)) process.exit(0);
  if (!fs.existsSync(DST)) fs.mkdirSync(DST, { recursive: true });

  const arquivos = fs.readdirSync(SRC).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');
  let copiados = 0;

  for (const arq of arquivos) {
    const src = path.join(SRC, arq);
    const dst = path.join(DST, arq);
    const srcMtime = fs.statSync(src).mtimeMs;
    let precisaCopiar = true;
    if (fs.existsSync(dst)) {
      const dstMtime = fs.statSync(dst).mtimeMs;
      if (dstMtime >= srcMtime) precisaCopiar = false;
    }
    if (precisaCopiar) {
      fs.copyFileSync(src, dst);
      copiados++;
    }
  }

  // Rebuild MEMORY.md — lê frontmatter de cada arquivo no vault
  const vaultFiles = fs.readdirSync(DST).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');
  const linhas = ['# 🧠 Índice de Memórias', ''];
  const items = [];

  for (const f of vaultFiles) {
    const conteudo = fs.readFileSync(path.join(DST, f), 'utf-8');
    let name = f.replace(/\.md$/, '');
    let description = '';
    let type = 'other';
    const fm = conteudo.match(/^---\n([\s\S]*?)\n---/);
    if (fm) {
      const bloco = fm[1];
      const mName = bloco.match(/^name:\s*(.+)$/m);
      const mDesc = bloco.match(/^description:\s*(.+)$/m);
      const mType = bloco.match(/^\s+type:\s*(.+)$/m) || bloco.match(/^type:\s*(.+)$/m);
      if (mName) name = mName[1].trim();
      if (mDesc) description = mDesc[1].trim();
      if (mType) type = mType[1].trim();
    }
    // Fallback: primeira linha não vazia depois do frontmatter
    if (!description) {
      const body = conteudo.replace(/^---[\s\S]*?---\n/, '').split('\n').find(l => l.trim().length > 5);
      if (body) description = body.replace(/^#+\s*/, '').trim().slice(0, 130);
    }
    items.push({ file: f, name, description, type });
  }

  // Ordena por tipo, depois por nome
  const ordem = { user: 1, feedback: 2, project: 3, reference: 4, other: 5 };
  items.sort((a, b) => (ordem[a.type] || 5) - (ordem[b.type] || 5) || a.name.localeCompare(b.name));

  for (const it of items) {
    linhas.push(`- [${it.name}](${it.file}) — ${it.description || '(sem descrição)'}`);
  }

  fs.writeFileSync(path.join(DST, 'MEMORY.md'), linhas.join('\n') + '\n');
  process.exit(0);
} catch (e) {
  process.exit(0);
}
