---
name: project-rastreamento-precisao-2026-06-08
description: REVERTIDO 2026-06-08 — 4 correcoes de precisao no rastreamento aplicadas e revertidas no mesmo dia. Wesley achou pior. Manter como registro do que NAO fazer sem mais info.
metadata: 
  node_type: memory
  type: project
  originSessionId: 8295294f-cd4c-494c-b2bb-7c90a438b8a3
---

## STATUS: REVERTIDO (mesmo dia)

Wesley olhou as 4 mudancas no front (HMR refletiu nos Vites ja abertos), avaliou e disse "antes ficou melhor". Pediu reverter TUDO. Backend nem chegou a rodar com as mudancas (Functions emulator antigo permaneceu ativo).

**O que NAO repetir sem novo pedido explicito:**
- Botao "Rastro" no header com toggle
- Banner amarelo de "Defasagem maxima: X min"
- Polyline de trail no mapa (mesmo cinza tracejada)
- Reverse geocode Nominatim no backend pra preencher rua vazia

**Causa provavel da rejeicao** (sem confirmacao do Wesley): poluicao visual. O header ja tem 5 controles (Voltar, Cercas, Mapa/Tabela, Atualizado, Atualizar) — Rastro virou 6. Banner amarelo aparece toda vez que algum veiculo passa de 5min (frequente).

**Licao:** mesmo com aprovacao explicita ("corrige todos, quero 100% preciso"), Wesley pode rejeitar quando ve. Pra rastreamento, **mostrar mockup/preview antes de codar** quando a mudanca for visual no header ou no mapa. Codigo backend invisivel (reverse, direcao preservada) talvez seja menos arriscado, mas tampouco testado em prod.

## O que foi feito e revertido (referencia tecnica)

Backend `functions/index.js`:
- Helper `reverseGeocode` + `REVERSE_CACHE Map` (cache 1km/24h, timeout 1.2s/2s) — REMOVIDO
- Refactor do loop em 3 passos (collect → reverse paralelo → enrich) — REVERTIDO ao loop original
- Preservacao de `direcao` quando vel=0 — REMOVIDO

Frontend:
- `hooks/useTrails.js` — APAGADO
- `MapaFrota.jsx` props `trails`/`mostrarRastro` + bloco Polyline trail — REMOVIDO
- `Rastreamento.jsx` imports `Route`/`Clock`/`useTrails`, state `mostrarRastro`/`defasagem`, botao Rastro, banner defasagem, props pro MapaFrota — TUDO REMOVIDO

**Item 5** (fallback Valhalla→OSRM em `roteamento.js:104`) seguiu intacto — ja existia antes.

## O que continua valendo

Auditoria identificou estes pontos de imprecisao (validos, so a SOLUCAO foi rejeitada):
1. Direcao errada quando parado (SASCAR manda heading desatualizado)
2. Rua vazia em estrada (SASCAR nao reverse-geocoda fora de cidade)
3. Sem trail/historico recente
4. Defasagem so visivel no popup, nao no header
5. Sem snapshot historico cross-session (depende AWS [[banco-aws-decidido]])

Se voltar ao tema "rastreamento mais preciso", PERGUNTAR ANTES o formato (mockup ASCII, descricao verbal) antes de aplicar no codigo.

## Relacionado

- [[rastreamento-sascar-fase2]] — base do modulo, intacto
- [[rastreamento-eta-destino]] — ETA Valhalla, intacto
- [[ui-perguntar-largura-altura]] — feedback parecido: perguntar antes de chutar UI
- [[banco-aws-decidido]] — info AWS continua valida, sem relacao com a reversao

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **roteirizacao**: [[feedback-svg-logo-iteration-cost]] · [[feedback_falar_inviavel_cedo]] · [[feedback_nodejs_only]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
