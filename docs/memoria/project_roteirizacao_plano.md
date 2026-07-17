---
name: project-roteirizacao-plano
description: "DESENHO da roteirização (Doc 15): rota+ETA via OpenRouteService grátis + pedágio por eixo via API. Pré-requisito = cadastro de clientes/destinos."
metadata: 
  node_type: memory
  type: project
  originSessionId: abeae20b-7cc7-44ce-997c-8ecfd30e6159
---

Plano de roteirização desenhado em 2026-05-28. Doc completo: `projetos/logistica-ia/docs/15-roteirizacao.md`.

**Why:** Wesley pediu o desenho depois de perguntar se dava pra passar origem→destino e já ver rota + pedágio automático. Resposta: sim, em camadas.

**How to apply:** Quando for implementar roteirização/ETA/custo de viagem, seguir o Doc 15. Pontos-chave que não mudam:

- **Rota + ETA = OpenRouteService** (grátis, perfil `driving-hgv` + hazmat). Roda como Cloud Function pra esconder a chave.
- **Pedágio = API** (recomendado TollGuru, Brasil + por eixo). Alternativa: Google Routes (`extraComputations: TOLLS`) faz rota+pedágio junto mas roteamento caminhão/hazmat é mais fraco. Caminho B (base própria de praças, grátis) só se Wesley vetar API paga.
- **Pegadinha do eixo:** pedágio = tarifa × nº eixos; ler do **atrelamento da OC** (muda por viagem), não fixo no cavalo. Eixo suspenso vazio não conta.
- **Estimado (planejamento) × Real (extrato Veloe).** Pedágio só frota interna — ver [[project-pedagio-veloe]].
- **Bloqueador #1: depende do cadastro de clientes/destinos com lat/lng existir** (Fase 0 = gap #1 do [[project-levantamento-logistica]]). Fase 1 (rota+ETA, grátis) já entrega valor sozinha.

Decisões pendentes do Wesley: (1) Caminho A API vs B grátis; (2) fazer junto com o cadastro de clientes ou depois.

Relacionado: [[project-levantamento-logistica]], [[project-pedagio-veloe]], [[project_modulo_terceiros]]

---

## Relacionado por tema

- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **roteirizacao**: [[feedback-svg-logo-iteration-cost]] · [[feedback_falar_inviavel_cedo]] · [[feedback_nodejs_only]]
