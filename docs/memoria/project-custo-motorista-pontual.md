---
name: project-custo-motorista-pontual
description: Estrutura salarial e custo/hora dos motoristas Pontual — usado no cálculo de custo de viagem
metadata: 
  node_type: memory
  type: project
  originSessionId: 5ea08958-1f02-42f6-ba92-d591d7f7a51f
---

Motoristas Pontual têm 2 categorias salariais:

- **Motorista Carreteiro / simples** — R$ 3.345 salário + R$ 1.003,50 insalubridade = **R$ 4.348,50 bruto/mês**
- **Motorista Bitrem** — R$ 3.395 + R$ 1.018,50 = **R$ 4.413,50 bruto/mês**

Rodotrem (a confirmar): provavelmente cai em categoria bitrem.

Com encargos padrão CLT (~40% de INSS + FGTS + provisão férias/13º):
- Carreteiro: ~R$ 27,67/h
- Bitrem: ~R$ 28,09/h
- Padrão usado no sistema: **R$ 28/h** (arredondado)

**Why:** cálculo de custo de viagem em `/rotas` precisa considerar tempo motorista, não só combustível+pedágio. Sem isso, rota alternativa "sem pedágio" parece mais barata quando de fato adiciona horas caras de motorista.

**How to apply:** em qualquer análise de custo de viagem (comparativo rota, CPK enriquecido, cotação pra cliente), incluir `duracaoHoras × 28` como custo motorista. Se cadastrar motorista com salário diferente, usar o específico dele.

Ver [[project-cta-smart-integracao]] e [[reference-cta-smart-api.md]].
