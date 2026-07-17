---
name: feedback-nao-aplicar-moduleheader-telas-antigas
description: "ModuleHeader trazido da branch supabase depende de CSS vars (--header-bg, --font-display) que não existem no tema atual. Aplicar em telas antigas quebra o visual. Só usar nas telas que já vieram da supabase (Compras, Intranet, PropostaConvite)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Regra

**NÃO aplicar `ModuleHeader.jsx` nas telas existentes** (Frota, Motoristas, OC, Manutenção, Pneus, Rastreamento, Jornada, etc). Só manter nas 3 telas que já vieram da branch supabase com CSS compatível: **Compras, IntranetArea, PropostaConvite**.

## Why

Testado em 2026-07-17 aplicando `ModuleHeader` no `/motoristas`. Resultado: header sobrepondo, logo/título ilegíveis, subtítulo cortado, cores erradas. User respondeu "ficou horrível" e revertemos.

Motivo técnico: `ModuleHeader.jsx` usa variáveis CSS **`--header-bg`**, **`--header-border`**, **`--font-display`**, **`--accent`** que **não existem** no `index.css` atual. Vieram da branch `feat/migracao-supabase` junto com um redesign visual completo do tema (628 linhas de `index.css` refeitas — que decidimos NÃO trazer conforme [[feedback-branch-supabase-nao-merge-tudo]]).

Sem essas vars, o `background`, borda, fonte e cor do header ficam undefined → fundo transparente + tipografia default → visual quebrado sobre a foto/fundo colorido de cada tela.

## How to apply

- Manter o header antigo (`<header style={s.header}>` com `LogoPontual` inline) nas telas existentes
- Nas telas novas (Compras, Intranet, PropostaConvite) o `ModuleHeader` já vem pronto e funciona porque foi projetado junto
- Se algum dia quiser padronizar: trazer TAMBÉM as CSS vars do supabase (`--header-bg: #0f172a`, etc) pro `index.css` — mas isso é **redesign visual**, não simples ajuste
- Alternativa mais leve: reescrever `ModuleHeader.jsx` sem depender de vars — usar cores hardcoded que combinam com o tema atual (azul escuro Pontual). Mas isso vira um novo componente, não vale o esforço se o header antigo já funciona
- Ganho do "menu hambúrguer global" que o ModuleHeader dava → **pode ser adicionado separado**: colocar só o `<MenuNavegacao />` no canto direito dos headers antigos, sem trocar o header inteiro. Ver [[project-modulo-compras-branch-supabase]]

Ver também: [[feedback-branch-supabase-nao-merge-tudo]] · [[feedback-login-fullbleed-cta-pattern]] · [[feedback-pneus-esquematico-aprovado]]
