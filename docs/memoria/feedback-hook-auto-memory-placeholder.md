---
name: feedback-hook-auto-memory-placeholder
description: Hook auto-memory-hook.mjs sync é no-op (Memory package not available — skipping). Substituído por auto-memoria-sync.mjs que copia .claude/.../memory/*.md → docs/memoria/ e rebuilda MEMORY.md
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Descoberta

Rodando manual `node auto-memory-hook.mjs sync` sempre retorna:
```
[AutoMemory] Syncing insights to auto memory files...
Memory package not available — skipping sync
```

O hook depende de um "memory package" (do ruflo/claude-flow) que **não está instalado** — então exit silencioso sem copiar nada. Registrado no `settings.json → Stop`, mas era placeholder.

## Why

- Descoberto em 2026-07-17 quando user reclamou "não estou vendo as memórias sendo salvas no obsidian"
- Comparação de timestamps confirmou: fonte `.claude/.../memory/` 16/07 15:48 vs vault `docs/memoria/` 16/07 16:02 — a vault ganhou update DEPOIS por eu ter escrito manual, não por hook
- 4 hooks Stop rodam a cada resposta minha: `auto-memory-hook sync` (no-op), `salvar-conversa-realtime`, `auto-sessao-log` (novo), `auto-memoria-sync` (novo — resolve isso)

## How to apply

- **Novo hook `auto-memoria-sync.mjs`** registrado em `.claude/settings.json → Stop` como 4º item. Ele:
  1. Copia `.md` de `.claude/projects/C--Users-Logistica01/memory/` → `docs/memoria/` quando fonte é mais nova
  2. Rebuilda `docs/memoria/MEMORY.md` lendo `name:` + `description:` do frontmatter
  3. Ordena por tipo (user → feedback → project → reference → other) depois alfabético
- Manter `auto-memory-hook.mjs` no settings.json por retrocompat, mas o real trabalho é do `auto-memoria-sync.mjs`
- Se algum dia instalar o "memory package" mencionado, dá pra revisitar

## Fluxo completo pós-fix (4 hooks Stop)

| Arquivo | Hook | Sincroniza |
|---|---|---|
| `prompts-user/YYYY-MM-DD.md` | `UserPromptSubmit → salvar-prompt-user` | toda mensagem do user |
| `conversas-claude/*.md` | `Stop → salvar-conversa-realtime` | conversa completa .jsonl → .md |
| `sessoes/YYYY-MM-DD.md` | `Stop → auto-sessao-log` | resumo de bloco (título + tools + arquivos) |
| `memoria/*.md` + `MEMORY.md` | `Stop → auto-memoria-sync` | .claude/memory/*.md → vault + índice |

Ver também: [[feedback-conversa-realtime-multi-claude]] · [[feedback-log-sessao-obsidian]]
