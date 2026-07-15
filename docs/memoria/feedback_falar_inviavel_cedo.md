---
name: falar-inviavel-cedo
description: "Wesley quer que eu fale ANTES quando uma feature nao e viavel, em vez de tentar varias abordagens sem avisar"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2899166c-546d-4ca0-ad27-bfa83d8cb768
---

Quando uma feature pedida nao e viavel dentro das restricoes (gratis / sem deploy / sem cartao), eu devo dizer DE CARA "isso nao da gratis sem X" e parar — em vez de ficar testando alternativas pra ver se alguma funciona. Wesley paga por token; ciclo de "tentei A, falhou, tentei B, falhou, tentei C, ai precisa Y" desperdicaa muito.

**Why:** Em 2026-06-03, ao tentar implementar busca de empresa BR no Rastreamento, gastei varios turns testando Photon + Nominatim + plano de cadastro proprio + Google Places API antes de Wesley parar e dizer "se nao e viavel fala que nao e, evita gastar token a toa". A realidade era simples desde o inicio: busca por nome de empresa BR pequena/media NAO tem solucao gratuita confiavel sem cadastro proprio (que exigiria deploy de rules).

**How to apply:**
- Antes de codar uma feature, mapear as restricoes reais (free tier? requer deploy? requer cartao? requer chave?) e dizer **NA PRIMEIRA RESPOSTA** se algum requisito nao pode ser cumprido.
- Se a feature so funciona com infraestrutura X que Wesley nao quer (ex: deploy de rules pausado, cartao pausado), dizer isso ANTES de implementar.
- Formato preferido: "Pra fazer isso preciso de X. Voce ja tem ou quer criar? Se nao, ai a alternativa real e Y mais limitado."
- Aplicacao tipica: novas integracoes externas, recursos que dependem de coleção/regra Firestore nova, qualquer API paga.

---
*Ver também: [[MEMORY|Índice de memórias]] · [[INDICE|Dashboard]] · [[CLAUDE|Contexto Pontual]]*

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_projeto]] · [[feedback_solides_so_adm]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **roteirizacao**: [[feedback-svg-logo-iteration-cost]] · [[feedback_nodejs_only]] · [[feedback_projeto]]


## Mesma categoria (feedback)

[[feedback-auto-commit-quando-pedido]] | [[feedback-login-split-pattern]] | [[feedback-svg-logo-iteration-cost]] | [[feedback-windows-file-watcher]] | [[feedback_analise_esportiva_checklist]]
