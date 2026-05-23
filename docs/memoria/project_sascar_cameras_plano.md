---
name: project-sascar-cameras-plano
description: Plano de 4 fases pra integrar câmeras SASCAR (Streamax) no dashboard. Fase 0 = ligar SASCAR e descobrir o que está liberado antes de codar.
metadata: 
  node_type: memory
  type: project
  originSessionId: 5ecc1bc2-6fdb-465e-bcfc-312ac32cd458
---

# Câmeras SASCAR — Plano em estudo

Status: **Fase 0 (descoberta)** — aguardando Wesley ligar pra SASCAR comercial.

## O que a API documentada (SasIntegra v2.05) entrega hoje
- Método único: `getSmartCamerasEvents` → metadata de alarmes de câmera (placa, motorista, lat/lon, timestamp, status do vídeo)
- Status possíveis: `validated`, `not_validated`, `waiting_video`, `failed`
- Hardware: **Streamax** DVR
- **NÃO retorna**: URL/binário do vídeo, streaming ao vivo, snapshot sob demanda

## Perguntas pra fazer pra SASCAR (Fase 0)
1. A liberação inclui método pra obter URL do vídeo gravado por evento Smart Cameras?
2. Existe API REST/SOAP pra streaming ao vivo das Streamax, ou só pelo portal web?
3. Tem doc separada da `SasIntegra v2.05` pra mídia das câmeras?
4. Nossa conta atual já inclui módulo de câmeras ou precisa contratar?
5. Pedir WSDL completo (não só PDF) + exemplo real de payload com vídeo `validated`

## Fases
- **Fase 1** — POC: script isolado `projetos/logistica-ia/scripts/sascar-cameras-poc.js` chamando `getSmartCamerasEvents` últimos 7 dias pra ver o que vem
- **Fase 2** — Aba `/cameras` no dashboard: tabela de eventos + filtros + pin no mapa Leaflet. Sem player.
- **Fase 3** — Player de vídeo gravado (se SASCAR liberar URL de mídia). Cache URLs no Firestore (TTL).
- **Fase 4** — Streaming ao vivo (se contratar Smart Cameras streaming): HLS.js ou iframe do portal SASCAR. Botão na página `/rastreamento`.

## Como retomar
Wesley diz "vamos pra fase X de câmeras SASCAR" → seguir daqui. Doc oficial em `projetos/logistica-ia/docs/sascar/`.

Relacionado: [[reference_sascar_api]], [[project_rastreamento_sascar_fase2]]
