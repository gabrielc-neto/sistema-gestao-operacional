---
name: project-cta-externo-lancamento-manual
description: "No CTA Smart, abastecimento em posto externo obriga motorista a lançar litros + valor total pago manualmente"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5ea08958-1f02-42f6-ba92-d591d7f7a51f
---

Em abastecimento **externo** (`posto.comercial === true`), o CTA Smart obriga o motorista a preencher **litros abastecidos + valor total pago**. Se o custo vem `0` mas os litros vêm preenchidos, é **erro de lançamento** — não é ausência de dado da API.

**Why:** Pátio interno tem bomba controlada pela empresa (dados automáticos). Externo é sempre manual — motorista abastece com dinheiro/cartão da empresa e precisa registrar o comprovante. Custo zero num externo = falha operacional que precisa ser corrigida com o motorista.

**How to apply:** No painel `/abastecimento`, gerar KPI e alerta "Externos sem valor lançado" (`comercial === true && custoTotal === 0 && volumeL > 0`). Isso vira ação: identificar motorista e cobrar preenchimento retroativo.

Ver [[project-cta-smart-integracao]] e [[project-cta-nfe-so-externo]].
