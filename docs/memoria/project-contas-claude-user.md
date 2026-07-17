---
name: project-contas-claude-user
description: User usa APENAS Claude AI (Claude.ai + Claude Code). 2 contas planejadas — não usa ChatGPT/Gemini/outras IAs
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Contas Claude do user

| Conta | Email | Status |
|---|---|---|
| Principal | `rosilda.lima75@gmail.com` | Em uso |
| Corporativa | `logistica01@pontualpetroleo.com.br` | Planejada — vai usar quando 1ª atingir limite |

**User NÃO usa:** ChatGPT, Gemini, Copilot, Cursor, Windsurf, Aider, Codex CLI ou qualquer outra IA. Só Claude (Anthropic).

**Why:** User informou 2026-07-16 15:45 — "eu só uso o claude ia, fora o desse email só vou entrar com outro que vai ser logistica01@pontualpetroleo.com.br"

**How to apply:**

- Protocolo multi-IA (`PROTOCOLO-MULTI-IA.md`) pode focar SÓ em Claude (Claude Code + Claude.ai)
- Fluxo de migração: Claude Code conta 1 → Claude.ai conta 1 → Claude.ai conta 2 → Claude Code conta 2 (mesma máquina)
- Codex CLI mencionado antes → **descartar como "outra IA em uso"**. Se `.codex/` tem coisa, é herança/experimental
- ChatGPT VS Code extension instalada → **não usar**, provavelmente instalada mas não ativa
- Ao criar templates/instruções, dizer "Claude" — não "IA genérica"

Ver também: [[project-outras-ias-e-backups]] · [[feedback-fluxo-bidirecional-multi-ia]]
