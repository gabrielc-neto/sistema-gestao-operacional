---
name: project-roteirizacao-teste
description: Protótipo isolado de roteirização (teste_rota.html no Desktop). Rota+ETA+pedágio funcionando fora do sistema. Estado e como retomar.
metadata: 
  node_type: memory
  type: project
  originSessionId: abeae20b-7cc7-44ce-997c-8ecfd30e6159
---

Protótipo de roteirização criado em 2026-05-28 a pedido do Wesley ("testar a rota só pra ver funcionando, ainda não subir pro sistema").

**Arquivo:** `C:\Users\Logistica01\Desktop\teste_rota.html` — single-file HTML, **ISOLADO** (não está no sistema, não grava Firestore). Abre com duplo clique.

**Why:** Validar a roteirização (Doc 15 / [[project-roteirizacao-plano]]) antes de portar pro app. Wesley quis ver rota + pedágio funcionando primeiro.

**O que o protótipo faz:**
- **Busca de endereço com autocomplete** estilo Google Maps (Nominatim, dropdown ↑↓/enter) — TESTADO, funciona.
- **Rota + ETA** perfil **caminhão + hazmat** via Valhalla (grátis, sem chave); fallback OSRM (carro); campo opcional de chave OpenRouteService. Wesley confirmou que desenha rota+km+ETA.
- **Pedágio em qualquer rota** = praças reais do **OpenStreetMap (Overpass) ao vivo** (cobre Brasil todo), filtradas a ≤2,5 km do traçado, dedupe de booths gêmeas. **Localização real; valor ESTIMADO** (`TARIFA_EIXO_ESTIMADA = 3.50` R$/eixo × nº eixos). Fallback = lista local `PRACAS` (SP/PR).
- Campo **nº de eixos** (default 6). Campo opcional **chave TollGuru** = sobrepõe a estimativa com valor pago mais preciso.

**Validado / não validado:**
- ✅ Autocomplete (Nominatim) e engine de detecção de praça (testado em Node) funcionam.
- ⚠ Overpass/Valhalla/OSRM **não testáveis do ambiente Claude** (rede só libera nominatim.openstreetmap.org). Funcionam no navegador do Wesley (têm CORS). Se der "Nenhum motor respondeu", criar chave ORS grátis (mais estável).

**Decisão de fonte de pedágio (pendente):**
- OSM = grátis, localização nacional, **sem tarifa de caminhão** → só estimativa.
- **QualP** (api.qualp.com.br) = PAGO, ideal BR (praça + balança + restrição + tarifa oficial por eixo). Melhor alvo p/ valor exato. Wesley ia ver preço/trial.
- TollGuru/Google = pagos, internacionais, menos completos pro BR.

**Onde parou / como retomar:** Wesley ia recarregar o HTML e conferir se as praças OSM aparecem na rota Paulínia→Ribeirão. Próximos passos: (1) confirmar cobertura OSM; (2) decidir QualP vs estimativa grátis; (3) portar pro sistema seguindo as fases do Doc 15 (depende do cadastro de clientes/destinos com lat/lng existir). Hazmat sempre ligado ([[project-carga-perigosa]]), pedágio só frota interna ([[project-pedagio-veloe]]).

Relacionado: [[project-roteirizacao-plano]], [[project-pedagio-veloe]], [[project-carga-perigosa]], [[project-levantamento-logistica]]

---

## Relacionado por tema

- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **roteirizacao**: [[feedback-svg-logo-iteration-cost]] · [[feedback_falar_inviavel_cedo]] · [[feedback_nodejs_only]]
