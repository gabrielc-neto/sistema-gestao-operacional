---
name: cta-smart-integracao-pontual
description: Pontual usa CTA Smart (ctasmart.com.br) na bomba do pátio — motorista abastece antes de sair e reabastece na volta; base pra módulo Combustível + CPK real
metadata: 
  node_type: memory
  type: project
  originSessionId: 49412f19-da7c-4759-a7ed-c8f54c60756b
---

Pontual tem **bomba própria no pátio** gerenciada por **CTA Smart** (ctasmart.com.br). Motorista abastece antes de sair pra viagem e reabastece ao voltar. Nenhum outro sistema de gestão de combustível é usado.

**Why:** Reabastecimento na volta permite calcular consumo EXATO da viagem (litros reabastecidos = consumo real), coisa impossível pra quem usa posto de terceiros. Isso é a base pra CPK real e ranking de motorista/veículo.

**How to apply:**
- Módulo de Combustível ainda NÃO foi implementado (2026-07-09) — espera user conseguir a API do CTA
- Modelo previsto: `combustivel_tanques` (saldo pátio), `combustivel_compras` (entrada de fornecedor), `abastecimentos` (saída/retorno com par_id vinculando).
- Anti-fraude natural: se motorista desviou, rendimento sai da média → alerta.
- Quando API chegar: peça doc oficial (Swagger/PDF), API key, ou sandbox. Padrão esperado é REST/JSON com Bearer token (similar Aegro).
- Se CTA só entregar CSV do portal (sem API real), automatizar via download programado.

Alertas mapeados (não implementados ainda): rendimento anômalo, KM decrescente, volume impossível, motorista errado, tanque baixo, viagem sem par de retorno, consumo caindo pré-manutenção. Ver `feedback-combustivel-alertas` se for expandir.

Relacionado: [[project-logistica-ia-frontend]]
