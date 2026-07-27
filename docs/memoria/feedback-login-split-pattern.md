---
name: feedback-login-split-pattern
description: Validated pattern for branded login screens — split layout (form left + institutional photo right) with cache-bust + SVG fallback component
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2f7e3d50-3571-4b84-bb8a-7b9e0bfbd827
---

Padrão de tela de login aprovado pelo user (2026-06-15) no projeto `logistica-ia`:

- **Layout split 45/55**: formulário centralizado à esquerda, painel institucional grande à direita
- **Painel direito como componente isolado** (ex: `components/LoginPainel.jsx`) que aceita prop `src` pra foto e tem **fallback automático pra SVG ilustrado** se a foto falhar/não existir
- **Cache-bust por versão**: imagem sempre carregada com `?v=YYYYMMDD-HHMM` constante no componente — bumpa quando troca arquivo em `/public` sem trocar o nome
- **Textos sem invenção** quando o user dá descrição/print: copiar literalmente título, sub, placeholders, labels, copyright
- **Imagem institucional** quando disponível **sempre vence o SVG** — SVG é só safety net pra dev sem foto

**Why:** Iteração 2026-06-15 começou com texto inventado ("Bem-vindo de volta"), evoluiu pra split inspirado em `web-homol.pontualpetroleo.com.br` (sem plagiar foto), até user mandar a foto institucional real. Pattern componente+fallback+cache-bust permitiu trocar foto sem reescrever, e SVG cobre dev/staging antes de ter o asset. Resultado validado pelo user com "ficou perfeito".

**How to apply:** Em qualquer tela "marca-pesada" (login, splash, onboarding) deste projeto:
1. Form do lado esquerdo (max-width ~380px), painel visual à direita
2. Painel visual = componente próprio com prop `src` + SVG fallback
3. Cache-bust por versão em string-constante no topo do arquivo
4. Quando user manda texto/descrição, seguir literalmente — não "melhorar"
5. Quando user manda foto, é prioridade absoluta sobre qualquer ilustração

Relacionado: [[project-logistica-ia-frontend]]

---

## Relacionado por tema

- **pontual**: [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]] · [[feedback_arquivos_downloads]]


## Mesma categoria (feedback)

[[feedback-auto-commit-quando-pedido]] | [[feedback-svg-logo-iteration-cost]] | [[feedback-windows-file-watcher]] | [[feedback_analise_esportiva_checklist]] | [[feedback_arquivo_explicito_obrigatorio]]
