---
name: project-pontual-eixos-ls-6-corrigido
description: "CORREÇÃO — cavalo Pontual + carreta LS CARREGADO = 6 eixos (3+3), NÃO 5. Ajustado em pedagios.js EIXOS_POR_TIPO e eixosDoVeiculo() em 2026-07-17"
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Correção (2026-07-17)

User corrigiu regra anterior. A configuração real da frota Pontual:

| Config | Cavalo | Carreta/Combinação | **Total eixos** |
|---|---|---|---|
| Cavalo + **LS carregado** (padrão Pontual) | 3 | 3 | **6** ← corrigido |
| Cavalo + carreta simples (2 eixos — raro na Pontual) | 3 | 2 | 5 |
| Cavalo + bitrem | 3 | 2+2 | 7 |
| Cavalo + rodotrem | 3 | 3+3 | 9 |

**Regra ANTT complementar:** eixo **suspenso** (levantado quando vazio) NÃO paga pedágio. Ex: LS vazia com 1 eixo suspenso paga por 5 eixos. Sistema hoje **assume sempre carregado** (pior caso) — ajustar quando integrar carga real do CTA/OC.

## Why

Regra anterior [[project-frota-pontual-eixos]] tinha `carreta = 5 eixos` como default. User corrigiu: **majoritariamente carreta é LS de 3 eixos**, então total é 6, não 5.

Cálculo de pedágio na Via Araucária (tarifa R$ 2,90/eixo, praça padrão da região Pontual):
- Antes: R$ 2,90 × 5 = R$ 14,50 (subestimava R$ 2,90 por praça)
- **Depois: R$ 2,90 × 6 = R$ 17,40** (correto)

Rodotrem BBE9588 na mesma praça: R$ 2,90 × 9 = **R$ 26,10** (não muda).

## How to apply

**Onde ficou:**
- `frontend/src/services/pedagios.js` — `EIXOS_POR_TIPO` e função `eixosDoVeiculo(v)`
- Nova lógica: **lê o campo `t1` do Firestore** (é onde a config real está: "LS", "Rodotrem", "Bitrem")
  ```js
  if (t1 === "ls")       return 6;
  if (t1 === "rodotrem") return 9;
  if (t1 === "bitrem")   return 7;
  ```
- Default se não achar tipo → **6 eixos** (LS Pontual)

**Quando for atualizar módulo Rotas:**
- Módulo `/rotas` já usa `eixosDoVeiculo()` — beneficia automaticamente
- OC ao criar viagem passa `veiculo` → cálculo de pedágio usa eixos corretos
- Se algum dia integrar CTA/OC de carga vazia → adicionar prop `carregado: false` e reduzir 1 eixo

**Placas confirmadas via Firestore consultado em 2026-07-17:**
- AKD5988 (cavalo Mercedes) + AKC4906 (LS) → **6 eixos**
- BBE9588 (cavalo DAF) + AQR9387 + AQR9374 (rodotrem) → **9 eixos**

Ver também: [[project-frota-pontual-eixos]] (SUPERSEDED por este) · [[project-conjuntos-akd5988-bbe9588]] · [[reference-cta-smart-api]]
