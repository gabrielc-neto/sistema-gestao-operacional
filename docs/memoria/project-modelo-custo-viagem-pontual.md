---
name: project-modelo-custo-viagem-pontual
description: Modelo econômico para cálculo de custo real de viagem (combustível + pedágio + motorista + refeições) — base para /rotas e comparativos
metadata: 
  node_type: memory
  type: project
  originSessionId: 5ea08958-1f02-42f6-ba92-d591d7f7a51f
---

Sistema `/rotas` cruza OSM/OSRM + base ANTT de pedágios + dados do CTA + folha da Pontual pra calcular custo total da viagem e comparar rotas alternativas.

## Configurações de eixos por tipo (padrão pré-preenchido no cadastro)

| Tipo | Carregado | Vazio | Como ergue |
|---|---|---|---|
| Cavalo 3 eixos toco | 3 | 3 | Não ergue |
| Cavalo 3 eixos 6×2 | 3 | 2 | Ergue arrastado |
| Cavalo 4 eixos 6×2 | 4 | 3 | Ergue arrastado |
| Cavalo 4 eixos traçado (6×4) | 4 | 4 | Motrizes não erguem |
| LS (cavalo + carreta LS) | 6 | 4 | Cavalo -1, LS -1 |
| Bitrem | 7 | 4 | Ergue 3 |
| Rodotrem | 9 | 7 | Ergue 2 |
| "4° eixo" (cavalo 3 + carreta 4) | 7 | 4 | Cavalo -1, carreta -2 |

## Salário (via [[project-custo-motorista-pontual]])
- Carreteiro: R$ 4.348,50 bruto/mês (R$ 3.345 + R$ 1.003,50 insalubridade)
- Bitrem e Rodotrem (mesma categoria): R$ 4.413,50 bruto/mês
- Encargos ~40% → custo folha ~R$ 28/h padrão

## Diárias/refeições por jornada

| Jornada | Valor total | Componentes |
|---|---|---|
| 00:01–03:59h | R$ 16,50 | Café |
| 04:00–07:59h | R$ 51,50 | Café + Almoço |
| 8h+ | R$ 103,00 | Café + Almoço + Janta + Banho |

## Pernoite
Motorista dorme na cabine do caminhão. Hotel = exceção lançada à parte pelo financeiro, não faz parte do custo padrão.

## O que falta pra fechar o modelo (marcado como pendente 2026-07-14)
- **Hora extra %** — dia comum e domingo/feriado (aguardando user)

## Fórmula final planejada
```
Custo viagem = km × CPK_placa (do CTA)
             + Σ pedágios × tarifa_por_eixo (carregado ida, vazio volta)
             + horas × custo_hora_motorista
             + refeições_pela_jornada
```

**Why:** despachante precisa comparar rota A (com pedágio) vs rota B (sem pedágio + mais km) e decidir qual é mais barata considerando TODOS os custos, não só combustível.

**How to apply:** ao implementar `/rotas`, chamar essa fórmula pra cada rota calculada. Mostrar comparativo lado a lado com recomendação automática.
