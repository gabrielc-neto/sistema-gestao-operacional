---
name: project-cta-nfe-so-externo
description: Regra fiscal — abastecimento no pátio Pontual (CTA Smart) não precisa de NFe; só postos externos exigem
metadata: 
  node_type: memory
  type: project
  originSessionId: 5ea08958-1f02-42f6-ba92-d591d7f7a51f
---

Abastecimento no pátio da Pontual (CTA Smart, `posto.comercial === false`) NÃO emite NFe. Só abastecimento em posto externo (`posto.comercial === true`) precisa de NFe pra auditoria fiscal.

**Why:** Pátio é interno da distribuidora — combustível já entrou com NFe no lote/compra do fornecedor. Não faz sentido emitir NFe de "auto-consumo interno".

**How to apply:** Em qualquer KPI, alerta ou relatório fiscal do módulo `/abastecimento`, filtrar por `posto.comercial === true` antes de validar `chaveNfe`. Nunca alertar "sem NFe" pra abast interno.
