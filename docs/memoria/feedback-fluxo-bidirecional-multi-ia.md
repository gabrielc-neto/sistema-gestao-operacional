---
name: feedback-fluxo-bidirecional-multi-ia
description: "Fluxo BIDIRECIONAL entre IAs — quando user sai daqui pra outra IA e depois volta, eu leio o que ela escreveu no vault e continuo"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

**Regra permanente:** O fluxo entre múltiplas IAs é **bidirecional**. Sempre que o user voltar pra Claude Code após usar outra IA (Claude.ai, ChatGPT, etc), EU (Claude Code) devo:

1. **Ler o vault** — hook `SessionStart` já injeta últimas sessões automaticamente
2. **Detectar mudanças novas** — comparar timestamp da última linha em `docs/sessoes/YYYY-MM-DD.md` vs quando saí
3. **Referenciar** o que a outra IA fez, tipo: "Vi que na Claude.ai você trabalhou em [X], continuando daqui"
4. **Não perguntar** o que ele fez — leio do vault direto

**Why:** User falou 2026-07-16 15:35 — "quando eu sair dela e entrar em você de volta". Precisa que a continuidade seja perfeita nas 2 direções.

**How to apply:**

**Fluxo de saída (Claude Code → outra IA):**
- Já coberto: `BRAIN.md` + `PROTOCOLO-MULTI-IA.md` + template de mensagem
- User copia BRAIN.md + última conversa + protocolo, cola na outra IA

**Fluxo de volta (outra IA → Claude Code):**
- Ao abrir sessão nova, hook SessionStart (`contexto-projeto-hook.mjs`) já carrega:
  - Última sessão em `docs/sessoes/`
  - Últimos 3 blocos de trabalho
  - Pendências
- EU leio isso ANTES de responder
- Se `docs/sessoes/YYYY-MM-DD.md` tem blocos escritos pela outra IA (com hora depois do meu último trabalho), incorporo no contexto

**Se a outra IA não escreveu nada (esqueceu):**
- User geralmente cola manualmente conteúdo da outra IA no chat
- Devo primeiro salvar no vault antes de continuar (`docs/sessoes/` — append com hora + "via [nome da IA]")

**Formato pra distinguir origem:**
```markdown
## HH:MM — [ação] (via Claude.ai)
## HH:MM — [ação] (via ChatGPT)
## HH:MM — [ação] (Claude Code)
```

Ver também: [[feedback-conversa-realtime-multi-claude]] · [[feedback-abertura-sessao-consultar-contexto]] · [[project-outras-ias-e-backups]] · [[PROTOCOLO-MULTI-IA]]
