// Exporta conversas do Claude Code (.jsonl) pra Markdown legível no Obsidian.
// Uso:
//   node scripts/exportar-conversa-claude.mjs                → exporta a mais recente
//   node scripts/exportar-conversa-claude.mjs --all          → exporta todas
//   node scripts/exportar-conversa-claude.mjs --id=<uuid>    → uma específica
//
// Saída: docs/conversas-claude/YYYY-MM-DD_HHMM_<titulo>.md
// Automático: filtra ruído (tool results grandes, thinking), mantém user + assistant.

import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = 'C:/Users/Logistica01/.claude/projects/C--Users-Logistica01';
const OUT_DIR = 'C:/Users/Logistica01/projetos/logistica-ia/docs/conversas-claude';

fs.mkdirSync(OUT_DIR, { recursive: true });

const args = process.argv.slice(2);
const wantAll = args.includes('--all');
const wantId = args.find(a => a.startsWith('--id='))?.split('=')[1];

function listSessions() {
  return fs.readdirSync(SRC_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({ id: f.replace('.jsonl', ''), full: path.join(SRC_DIR, f), mtime: fs.statSync(path.join(SRC_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}

function parseSession(full) {
  const lines = fs.readFileSync(full, 'utf-8').split('\n').filter(Boolean);
  const msgs = [];
  for (const line of lines) {
    try {
      const o = JSON.parse(line);
      const t = o.type;
      const msg = o.message;
      if (!msg) continue;
      const role = msg.role;
      if (role !== 'user' && role !== 'assistant') continue;
      let text = '';
      if (typeof msg.content === 'string') text = msg.content;
      else if (Array.isArray(msg.content)) {
        text = msg.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('\n\n');
      }
      if (!text.trim()) continue;
      // Descarta blocos que são apenas ruído do system
      if (text.startsWith('<system-reminder>') && text.length < 500) continue;
      msgs.push({ role, text: text.trim(), ts: o.timestamp || null });
    } catch { /* skip malformed */ }
  }
  return msgs;
}

function titulo(msgs) {
  const first = msgs.find(m => m.role === 'user');
  if (!first) return 'sem-titulo';
  return first.text
    .split('\n')[0]
    .slice(0, 60)
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || 'sem-titulo';
}

function timestampFile(ts) {
  const d = ts ? new Date(ts) : new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function renderMd(sessionId, msgs) {
  const first = msgs[0]?.ts ? new Date(msgs[0].ts) : new Date();
  const last  = msgs[msgs.length-1]?.ts ? new Date(msgs[msgs.length-1].ts) : new Date();
  let out = `# Conversa Claude Code — ${first.toLocaleDateString('pt-BR')}\n\n`;
  out += `**Session ID:** \`${sessionId}\`\n`;
  out += `**Início:** ${first.toLocaleString('pt-BR')}\n`;
  out += `**Fim:** ${last.toLocaleString('pt-BR')}\n`;
  out += `**Mensagens:** ${msgs.length}\n\n---\n\n`;
  for (const m of msgs) {
    const h = m.ts ? new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    const icon = m.role === 'user' ? '👤 **Você**' : '🤖 **Claude**';
    out += `## ${icon} — ${h}\n\n${m.text}\n\n---\n\n`;
  }
  return out;
}

function exportar(session) {
  const msgs = parseSession(session.full);
  if (!msgs.length) { console.log(`  (${session.id}: vazia, pulei)`); return; }
  const nome = `${timestampFile(msgs[0]?.ts)}_${titulo(msgs)}.md`;
  const dest = path.join(OUT_DIR, nome);
  fs.writeFileSync(dest, renderMd(session.id, msgs));
  console.log(`  → ${nome}  (${msgs.length} msgs)`);
}

const sessions = listSessions();
console.log(`${sessions.length} sessões encontradas em ${SRC_DIR}\n`);

let alvo = sessions;
if (wantId) alvo = sessions.filter(s => s.id === wantId);
else if (!wantAll) alvo = sessions.slice(0, 1);

console.log(`Exportando ${alvo.length} sessão(ões) para ${OUT_DIR}:`);
alvo.forEach(exportar);
console.log('\nOK.');
