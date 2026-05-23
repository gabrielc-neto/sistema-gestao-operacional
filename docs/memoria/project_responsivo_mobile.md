---
name: project-responsivo-mobile
description: Convenções de responsividade mobile no Pontual Logística — utility classes em index.css que sobrescrevem inline styles via !important
metadata: 
  node_type: memory
  type: project
  originSessionId: 7234bd23-7179-418e-9260-fb250512d461
---

Em 2026-05-18 foi feita refator mobile/tablet/desktop do sistema. Páginas usam inline styles dominantemente, então a estratégia foi criar utility classes em `frontend/src/index.css` que sobrescrevem inline styles via `!important` nos breakpoints.

**Why:** Inline styles vencem CSS por especificidade. Para responsividade sem reescrever inline em 15+ páginas, usar `!important` em classes nos breakpoints mobile. Wesley quer compatibilidade com todos dispositivos sem trocar a stack pra Tailwind.

**How to apply:** Ao criar nova página ou ajustar componente:
- Grid de form com 2/3/4 colunas → adicionar `className="grid-form-2"` (ou `-3`/`-4`)
- Layout sidebar+conteúdo (`320px 1fr`) → `className="layout-sidebar"`
- Modal centralizado → adicionar `className="modal-mobile-sheet"` no modal e `className="modal-mobile-sheet-overlay"` no overlay (vira bottom-sheet em ≤640px)
- Tabela → envolver em `<div className="table-wrap">` para scroll horizontal
- Container de body → `className="page-body"` (padding adaptativo)

Breakpoints padronizados em index.css:
- ≤900px: tablet
- ≤768px: forms 3/4 col viram 2 col
- ≤640px: mobile (modais viram sheet, botões 40px min, inputs 16px font pra evitar zoom iOS)
- ≤480px: mobile pequeno (forms 2 col vira 1 col, grid-auto colapsa)

Classes especiais por página:
- `.histo-header` / `.histo-item` — Historico vira lista de cards em mobile
- `.oc-corpo` — OC layout 2-col vira coluna
- `.leaflet-container` — mapa min-height 50vh em mobile

Páginas com responsivo próprio (não usam essas utilities):
- `Cercas.jsx` — tem `<style>` inline com `.cercas-grid`/`.cercas-sidebar` (Wesley vai refazer estilo SASCAR)
- `Dashboard.jsx` — usa `.dash-kpi`/`.dash-modules` que têm mq dedicadas em index.css

Login.jsx, Permissoes.jsx, Setores.jsx, Rastreamento.jsx já tinham responsivo razoável.
