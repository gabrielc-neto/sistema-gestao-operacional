---
name: rastreamento-eta-destino
description: "Rastreamento ganhou painel \"Definir destino\" no popup de cada veiculo — autocomplete Nominatim, calcula rota truck+hazmat via Valhalla, mostra distancia+ETA. Sem persistencia."
metadata: 
  node_type: memory
  type: project
  originSessionId: 2899166c-546d-4ca0-ad27-bfa83d8cb768
---

Em 2026-06-03 foi adicionada no `/rastreamento` a capacidade de definir um destino por veiculo e ver **quanto tempo / quantos km faltam** ate chegar. Popup do veiculo no mapa Leaflet ganhou secao azul "📍 DESTINO · ETA" com:

- Autocomplete via **Nominatim** (`buscarSugestoes` em `frontend/src/utils/roteamento.js`) — restrito a Brasil
- Rota calculada por **Valhalla** (`valhalla1.openstreetmap.de`) com `costing: "truck"` + `costing_options.truck.hazmat: true`
  - Fallback automatico pra **OSRM** (carro, sem hazmat) se Valhalla cair
  - Reaproveita protótipo `Desktop/teste_rota.html` ja validado
- Mostra: distancia rodoviaria, ETA (h+min), perfil usado
- Rota desenhada como linha azul tracejada no mapa + CircleMarker no destino
- Botão "Limpar destino"

**Why:** Wesley pediu "saber aproximadamente onde o veiculo esta ate outro lugar". Reaproveita pesquisa de roteirizacao do Doc 15. Toda carga da Pontual e perigosa (hazmat sempre) — usa perfil truck correto.

**How to apply:**
- Destino e **ad-hoc** (sem persistencia em Firestore): some quando recarrega a pagina. Cada veiculo tem destino independente, guardado em Map<placa, dados> dentro do `MapaFrota.jsx`.
- Busca por **nome de empresa BR** (ex: "Pontual Brasil Petroleo") **NAO funciona** com Nominatim/Photon — base OSM nao cobre essas empresas. Wesley testou e ficou frustrado. Soluções avaliadas e rejeitadas:
  - Google Places API: paga, requer cartao, ele recusou
  - Cadastro proprio no Firestore: exigiria deploy de regras (pausado por causa do Blaze)
  - Photon: testado, mesma cobertura ruim que Nominatim pra empresas pequenas
- Solucao real pra empresa especifica: **colar endereço completo** (Rua, num, cidade UF) que Nominatim acha. Ou clicar manualmente no mapa (feature nao implementada — ele recuou antes).
- Commit principal: `119e021 feat(rastreamento): destino + ETA por veiculo via Valhalla truck+hazmat`.
- Lembrete pra futuras features: [[falar-inviavel-cedo]] — Wesley quer que eu fale ANTES quando uma capacidade nao e viavel no orcamento dele, em vez de tentar varias abordagens.

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **roteirizacao**: [[feedback-svg-logo-iteration-cost]] · [[feedback_falar_inviavel_cedo]] · [[feedback_nodejs_only]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
