---
name: feedback-salvar-tudo-user-diz
description: TUDO que o user digitar deve ser salvo automaticamente no vault Obsidian em docs/prompts-user/YYYY-MM-DD.md
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

**Regra permanente:** Cada mensagem enviada pelo user, sem exceção, deve ser gravada em `docs/prompts-user/YYYY-MM-DD.md` do vault.

**Why:** User falou explicitamente 2026-07-15 16:30 — "quero que coloque no obsidian já, tudo, qualquer coisa dita aqui quero que salve no obsidian, qualquer coisa mesmo, pois tudo que digo é relevante". User considera todas as próprias declarações potencialmente úteis, mesmo as que pareçam triviais no momento (regras futuras nascem de comentários casuais).

**How to apply:**

**Camada automática (garantia técnica):**
- Hook `UserPromptSubmit` em `.claude/settings.json` chama `salvar-prompt-user.mjs`
- Salva prompt em `docs/prompts-user/YYYY-MM-DD.md` com timestamp
- Roda em toda mensagem, independente do que Claude faça

**Camada de comportamento (redundância):**
- Se hook falhar por algum motivo, EU (assistente) devo append manualmente
- No fim de resposta longa/complexa, garantir que a mensagem original foi salva
- Se detectar decisão importante no meio da conversa, extrair pra memória (project_/feedback_)

**Estrutura do arquivo:**
```markdown
# Prompts do user — 2026-07-15

## HH:MM:SS

<texto completo do prompt>

---
```

**Diferença entre prompts-user/ e conversas-claude/:**
- `prompts-user/` — SÓ mensagens do user, cronológico, curto, pesquisável
- `conversas-claude/` — conversa completa (user + assistant), gerado do .jsonl

Ver também: [[feedback-log-sessao-obsidian]] · [[feedback-abertura-sessao-consultar-contexto]]
