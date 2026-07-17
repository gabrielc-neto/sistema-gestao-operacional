---
name: feedback-conversa-realtime-multi-claude
description: Conversa completa (user+assistant) deve ser exportada em tempo real via hook Stop — user usa múltiplos Claudes e migra entre eles quando limite acaba
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

**Regra permanente:** A conversa completa (mensagens do user + respostas do assistente + tool calls) deve estar disponível em `docs/conversas-claude/YYYY-MM-DD_*.md` do vault Obsidian em TEMPO REAL — atualizado a cada resposta do assistente.

**Why:** User informou 2026-07-16 15:00 — "uso mais de um claude, quando acaba o limite desse eu vou para outro continuar de onde parou". Ele precisa poder ler a conversa completa fora do Claude Code (no Obsidian ou passar pra outro assistente) sem esperar o boot do PC.

**How to apply — 3 camadas complementares:**

| Camada | Arquivo | Trigger | Contém |
|---|---|---|---|
| **prompts-user** | `docs/prompts-user/YYYY-MM-DD.md` | Hook UserPromptSubmit | SÓ mensagens do user, timestamp por segundo |
| **conversas-claude** | `docs/conversas-claude/YYYY-MM-DD_HHMM_titulo.md` | Hook Stop (a cada resposta) | Conversa COMPLETA (user+assistant) — exportada do .jsonl |
| **sessoes** | `docs/sessoes/YYYY-MM-DD.md` | Assistente manual (regra `[[feedback-log-sessao-obsidian]]`) | Log editorial curado com decisões |

**Hooks instalados em `.claude/settings.json`:**
1. `UserPromptSubmit` → `salvar-prompt-user.mjs` (grava mensagem do user)
2. `Stop` → `salvar-conversa-realtime.mjs` (roda export completo em background, ~2s)

**Se hook falhar:** eu (assistente) devo exportar manualmente via `node scripts/exportar-conversa-claude.mjs` ao fim de resposta importante.

Ver também: [[feedback-log-sessao-obsidian]] · [[feedback-salvar-tudo-user-diz]] · [[feedback-abertura-sessao-consultar-contexto]]
