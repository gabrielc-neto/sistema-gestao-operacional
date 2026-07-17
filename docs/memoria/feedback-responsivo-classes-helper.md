---
name: responsivo-classes-helper-pontual
description: Sistema logistica-ia já tem infra responsiva madura em index.css — telas novas devem consumir classes helper existentes em vez de recriar
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 49412f19-da7c-4759-a7ed-c8f54c60756b
---

No `logistica-ia` (frontend Vite+React), aplicar responsivo em telas novas deve **consumir a infra já existente**, não recriar do zero.

**Why:** o `index.css` (348 linhas) já tem 33 media queries + classes helper (`pg-header`, `pg-body`, `pg-stats`, `pg-toolbar`, `grid-form-2/3/4`, `grid-auto-240`, `tabs-scroll`, `modal-mobile-sheet`, `hide-mobile`, `force-stack`, etc). Reimplementar breakpoints em componente novo duplica trabalho e ignora convenções já aprovadas.

**How to apply:**
1. Antes de adicionar `@media` no CSS de um componente novo, verificar se já existe classe helper equivalente no `index.css`.
2. Aplicar `className` nos wrappers principais da tela: `pg-header` no header, `pg-body` no main, `pg-stats` em grid de KPIs, `tabs-scroll` em navbars horizontais.
3. Se a tela tem grids inline com larguras fixas em px (ex: `gridTemplateColumns: "620px 1fr"`), adicionar classe própria (ex: `pneus-rowmid`) e regra `@media (max-width: 900px)` que troca por `1fr`.
4. Evitar `overflow: hidden` em wrappers grandes — usa `overflow-x: auto` pra permitir scroll horizontal quando necessário. Padrão aprovado em 2026-07-09 na ficha de Inspeção.

**Trigger contexts:** aba Inspeção, aba Conjunto, Pneus.jsx, quando build de tela nova com estilos inline complexos.

Relacionado: [[project-logistica-ia-frontend]]
