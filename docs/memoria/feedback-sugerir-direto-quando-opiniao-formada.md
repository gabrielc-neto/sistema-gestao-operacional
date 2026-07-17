---
name: feedback-sugerir-direto-quando-opiniao-formada
description: "Quando tiver opinião formada, sugerir direto em vez de perguntar opções neutras"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 751b445b-1d79-4daa-a899-47ce34cb7c71
---

Quando tenho opinião técnica formada, sugerir o caminho recomendado direto em vez de listar opções como se todas fossem equivalentes.

**Why:** User valoriza decisão. Listar 3 opções neutras quando uma é claramente melhor é desperdício de turno. Ele quer recomendação fundamentada, não menu de votação.

**How to apply:** Quando análise técnica indica caminho preferido (ex: porta livre, processo zumbi, padrão de projeto), apresentar:
- Recomendação + razões curtas
- Plano de execução
- Pergunta de confirmação binária (sigo / muda)

Em vez de AskUserQuestion com múltiplas opções equivalentes. Reservar AskUserQuestion pra decisões realmente cinza (tradeoffs reais sem ganhador claro).

Relacionado: [[feedback-auto-commit-quando-pedido]] — mesmo padrão de autonomia.
