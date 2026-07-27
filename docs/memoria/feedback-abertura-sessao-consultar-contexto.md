---
name: feedback-abertura-sessao-consultar-contexto
description: "Ao iniciar CADA sessão nova no Claude Code, consultar sessões anteriores + pendências antes de perguntar contexto ao user"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

**Regra permanente:** No começo de toda sessão nova no Claude Code, ANTES de perguntar qualquer coisa ao user, ler:

1. **`docs/sessoes/`** — a última sessão (por data), especialmente a seção "Pendente / próximos passos" no fim
2. **`docs/memoria/MEMORY.md`** — índice atualizado das 82+ memórias
3. **Se o user disser um assunto específico:** buscar direto nas conversas exportadas em `docs/conversas-claude/`

**Why:** User falou explicitamente em 2026-07-15 15:55 — "sempre que eu abrir o claude code, voce vai consultar tudo as conversas, para ir dando andamento nos projetos, assim não queima token à toa e o projeto flui". Perguntar "onde paramos?" queima token desnecessariamente quando o histórico está tudo em `.md` no vault Obsidian.

**How to apply:**

Fluxo padrão ao abrir sessão nova:

```bash
# 1) Última sessão registrada
ls -t /c/Users/Logistica01/projetos/logistica-ia/docs/sessoes/*.md | head -1
# Lê essa e vai direto pra "## Pendente" no final

# 2) Se user mencionar tema específico
grep -l "TEMA" /c/Users/Logistica01/projetos/logistica-ia/docs/memoria/*.md
grep -l "TEMA" /c/Users/Logistica01/projetos/logistica-ia/docs/conversas-claude/*.md
```

**NÃO faça:**
- "Onde paramos?" — está no docs/sessoes/
- "Qual seu contexto?" — está em CLAUDE.md + memoria/
- "Já fizemos X antes?" — grep em conversas-claude/

**FAÇA:**
- Comece o turno com 1 frase: "Vi que ontem paramos em [X], continuando..."
- Se pendência inclui algo que ficou parado, retomar direto se o user pedir "continua"
- Se user pergunta genérica ("oi", "vamos trabalhar"), oferecer 2-3 opções concretas baseadas nas pendências
