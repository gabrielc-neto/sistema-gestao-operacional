---
name: project-outras-ias-e-backups
description: "Fontes secundárias de contexto - Codex CLI, claude-flow, OneDrive backup auto, VS Code extensions"
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

Além do Claude Code + Claude.ai que o user usa, o PC tem OUTRAS fontes de contexto que podem ter memória ou trabalho relacionado:

## 🤖 Codex CLI — outro cérebro paralelo
- Path: `C:\Users\Logistica01\.codex\`
- Tamanho: 71 MB
- Bancos SQLite:
  - `memories_1.sqlite` (40 KB) — memórias do Codex
  - `state_5.sqlite` (176 KB) — estado da sessão
  - `logs_2.sqlite` (256 KB) — histórico
  - `goals_1.sqlite` (24 KB) — objetivos ativos
- Também tem `.codex/skills/` — skills próprias
- **Ação:** se user usar Codex CLI, dá pra ler essas .sqlite pra ter contexto adicional

## 🌊 Claude Flow
- Path: `C:\Users\Logistica01\.claude-flow\`
- `data/ranked-context.json` — contexto ranqueado
- `sessions/current.json` + histórico
- **Uso:** Claude Flow é outro orquestrador — pode ter trabalho paralelo

## ☁️ OneDrive Backup Automático
- Path: `C:\Users\Logistica01\OneDrive\Backup-Sistema-2026-07-08\`
- Rodou última vez: 08/07/2026
- Contém: claude/, downloads/, desktop/, documents/, projetos-loose/, repos-info/
- Total: ~146 MB
- **MANIFEST.md** lista tudo backupeado
- **Não commitou** microsoft-jdk-21.zip, .pst do Outlook, node_modules
- **Ação:** rodar novo backup periódico — pode ser fonte de recuperação se pendrive falhar

## 🧩 VS Code Extensions IA instaladas
- `anthropic.claude-code-2.1.210-win32-x64` — Claude Code no VS Code
- `openai.chatgpt-26.707.71524-win32-x64` — ChatGPT no VS Code
- **Ação:** user PODE estar usando qualquer uma dessas — considerar como "outro Claude" pra continuidade

## 📦 Pendrive D:
- Backups históricos Claude + Logística
- Já espelhado em `arquivo/pendrive-completo/` do repo
- Ver [[project-pendrive-backup]]

## 🎯 Hierarquia de fontes de contexto (do mais importante pro menos)
1. **`BRAIN.md`** (raiz repo) — ponto de entrada
2. **`docs/sessoes/YYYY-MM-DD.md`** — última sessão
3. **`docs/conversas-claude/*.md`** — conversas exportadas real-time
4. **`docs/memoria/*.md`** — 91 memórias
5. **`docs/prompts-user/YYYY-MM-DD.md`** — cada mensagem crua
6. **`.claude/projects/.../memory/*.md`** — memória ativa Claude Code
7. **`.codex/*.sqlite`** — memória Codex (se usado)
8. **GitHub branches** — trabalho paralelo (main, feat/migracao-supabase, feat/conversao-php-laravel, feat/14-jul-cta-rotas)
9. **OneDrive backup** — snapshot semanal
10. **Pendrive D:** — backup físico
