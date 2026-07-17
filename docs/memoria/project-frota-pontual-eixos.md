---
name: project-frota-pontual-eixos
description: Frota Pontual — cavalo sempre 3 eixos (trucado/traçado). Configurações reais e eixos totais por tipo.
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

Frota Pontual só tem cavalos de 3 eixos (trucado ou traçado). NÃO existe cavalo toco/simples. Total de eixos vem sempre de cavalo(3) + semirreboque atrelado.

**Configurações que a Pontual opera:**
- **Carreta simples** = cavalo 3 + carreta 2 eixos = **5 eixos**
- **Bitrem** = cavalo 3 + 2 semirreboques (2+2) = **7 eixos**
- **Rodotrem** = cavalo 3 + combinação 6 eixos = **9 eixos**

**Não usar em código/tabela Pontual:**
- toco (2 eixos) — não existe na frota
- truck (3 eixos sem semirreboque) — não existe
- bitruck (4 eixos) — não existe

**Why:** Confirmado pelo user 2026-07-15 no contexto de cálculo de pedágio ANTT. Superestimou custo até corrigir default de eixos.

**How to apply:**
- Cálculo de pedágio ANTT: `custo = tarifaBase × eixos` (5/7/9)
- Custo/hora motorista, diárias, refeições: sempre bater com config real (carreta ou bitrem, principalmente)
- Ver [[project-custo-motorista-pontual]] e [[project-modelo-custo-viagem-pontual]] pra composição de custo de viagem

**Contexto operacional:** ~99% das viagens são dentro do Paraná (Novos Caminhos ANTT — tarifas baixas R$ 2,30-3,50 base). Rota que sai do estado é exceção.
