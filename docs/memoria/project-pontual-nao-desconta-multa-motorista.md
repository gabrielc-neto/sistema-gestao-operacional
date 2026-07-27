---
name: project-pontual-nao-desconta-multa-motorista
description: "Pontual Logística NÃO desconta multa de trânsito do motorista. Multas ficam por conta da empresa. Módulo de multas registra e paga, mas NUNCA gera débito no fechamento/holerite do motorista."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Fato

**Multas de trânsito NÃO são descontadas do salário do motorista.**

Confirmado por Rosilda em 2026-07-21 durante planejamento do módulo de fechamento de motorista.

## Why

Política interna da Pontual. Motoristas de combustível MOPP já lidam com produto perigoso e pressão de rota — descontar multa criaria atrito e possivelmente perda de bons motoristas em mercado com escassez.

Empresa absorve o custo. Se motorista repetir muito, é caso de treinamento/advertência, não desconto.

## How to apply

**No módulo de multas** (`/manutencao?aba=multas`):
- ✅ Registrar multa normalmente
- ✅ Vincular motorista responsável (pra estatística)
- ✅ Alertar vencimento pagamento
- ❌ NUNCA gerar débito automático no fechamento
- ❌ NUNCA sugerir "descontar do motorista" no MVP ou análise

**No módulo de fechamento/holerite motorista** (a construir):
- Multas NÃO aparecem na coluna de descontos
- Descontos válidos: adiantamento, faltas, planos, benefícios, tributos
- Se um dia mudar a política, vira campo opcional (padrão FALSE)

**Em análises** (relatórios, dashboards):
- Multas podem aparecer como estatística por motorista (quem gera mais)
- Uso pra treinamento/gestão, NÃO cálculo financeiro contra motorista

## Regras aparentadas

- Custo motorista: [[project-custo-motorista-pontual]] (R$ 4.348 carreteiro · R$ 4.413 bitrem)
- Refeições: [[project-modelo-custo-viagem-pontual]] (16,50/51,50/103)

Ver também: [[project-frota-pontual-eixos]] · [[feedback-primeira-msg-confirmar-skills]]
