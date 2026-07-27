---
name: feedback-downloads-nao-entra-obsidian
description: Downloads do PC (arquivo/downloads-*) NUNCA entram no Obsidian nem no grafo do vault
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

Tudo que veio da pasta Downloads do PC (movido pra `arquivo/downloads-pontual/`, `arquivo/downloads-outros/` ou similar) **NUNCA** deve ser indexado pelo Obsidian.

**Why:** User falou explicitamente em 2026-07-15 15:30 — "o que está em downloads no meu pc não entra nada, te de essa instrução mais cedo". Downloads é workspace ativo, muito volume, mistura pessoal (IRPF) com trabalho. Fica arquivado no disco mas invisível no vault.

**How to apply:**
- Manter `arquivo/downloads-*/` sempre em `userIgnoreFilters` do `.obsidian/app.json`
- Ao criar novas pastas de arquivo movidas do Downloads, adicionar padrão `arquivo/downloads-*/` no ignore
- `arquivo/desktop/`, `arquivo/documents-fiscal/`, `arquivo/pendrive-completo/` seguem regras próprias — só downloads é sempre fora do vault
- Nunca perguntar "quer indexar downloads?" — resposta padrão é NÃO
