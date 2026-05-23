---
name: project-rastreamento-sascar-fase2
description: "Fase 2 do TMS Pontual entregue — Firebase Functions + módulo Rastreamento React com mapa Leaflet, busca, motorista logado, status em tempo real"
metadata: 
  node_type: memory
  type: project
  originSessionId: bdcfcba3-82cf-4e31-b119-80741c712de4
---

Módulo Rastreamento (Fase 2 do TMS) implementado e validado em 2026-05-14.

**Why:** Pontual contratou SASCAR pra rastrear os 38 cavalos de combustível. A integração entrega mapa ao vivo, motorista logado (via iButton), status (movimento/parado/ligado/bloqueado), busca e filtros — primeira camada da [[reference-sascar-api]] aplicada no produto.

**How to apply:** Consultar ao mexer no módulo Rastreamento ou ao integrar novos endpoints SASCAR.

## Stack adicionada
- **Backend:** Firebase Cloud Functions v2, region `southamerica-east1`, node 22
- **Pasta:** `functions/` na raiz do projeto (irmã de `frontend/`)
- **Endpoints callable:**
  - `sascarVeiculos` — lista frota (cache 1h em memória)
  - `sascarPosicoes` — última posição por veículo, com motorista logado (cache 30s)
- **Segredos:** SASCAR_USUARIO + SASCAR_SENHA via Secret Manager (deploy) ou `functions/.secret.local` (emulator)
- **Auth:** exige Firebase Auth ID token; bypass `x-dev-bypass: true` SÓ no emulator (`process.env.FUNCTIONS_EMULATOR === 'true'`)
- **SOAP client em** `functions/src/sascar/soap.js` — `obterVeiculos`, `obterClientes`, `obterPacotePosicoes`, `obterPacotePosicoesMotorista`
- **Frontend:**
  - `frontend/src/firebase/config.js` — exporta `functions` + auto-detecta host do emulator pelo `window.location.hostname` (resolve celular)
  - `frontend/src/hooks/useSascarPosicoes.js` — polling 30s + refetch ao voltar pra aba
  - `frontend/src/components/MapaFrota.jsx` — Leaflet + OpenStreetMap, marker SVG rotacionado pela direcao, placa + motorista em label permanente, pulso verde pros em movimento
  - `frontend/src/pages/Rastreamento.jsx` — toggle Mapa/Tabela, KPIs clicáveis (filtram), busca por placa/cidade/motorista
- **Rota:** `/rastreamento` (qualquer logado, sem permissão dedicada ainda)
- **Dashboard:** card "Rastreamento" agora linka pra rota

## Status, cores e mapeamento

| statusTexto | Quando | Cor |
|---|---|---|
| `EM_MOVIMENTO` | ignicao=1 + velocidade > 0 | verde #16a34a + pulso |
| `PARADO_LIGADO` | ignicao=1 + velocidade=0 | amarelo #eab308 |
| `ESTACIONADO` | ignicao=0 + bloqueio=0 | cinza #475569 |
| `BLOQUEADO` | bloqueio=1 | vermelho #dc2626 |

Calculado em `functions/index.js:statusFromPacote`.

## Acesso pelo celular (rede interna Pontual)

- Vite escuta em `0.0.0.0:5173` (`host: true` no vite.config.js)
- Emulator escuta em `0.0.0.0:5001/9099/8080` (`firebase.json` → emulators.*.host)
- Firewall do Windows: script `scripts/liberar-firewall-dev.bat` (precisa **Executar como administrador** — 1 vez só)
- IP da máquina dev: `192.168.20.131` — URL no celular: `http://192.168.20.131:5173/dashboard`

## Status do deploy

**Aguardando semana de 2026-05-19**: Blaze upgrade adiado por decisão da Pontual (custo). Frontend e Functions tudo pronto pra deploy — falta só ativar Blaze + gravar secrets + `firebase deploy`. Sistema continua rodando no emulator local até lá.

## Para subir pra PRODUÇÃO

Wesley precisa autorizar antes (memória do projeto principal diz isso).

1. **Ativar Blaze:** https://console.firebase.google.com/project/pontual-logistica/usage/details
2. Gravar secrets (terminal, raiz do projeto):
   ```
   firebase functions:secrets:set SASCAR_USUARIO
   firebase functions:secrets:set SASCAR_SENHA
   ```
3. Deploy: `firebase deploy --only functions`
4. **Remover** linha `VITE_USE_FUNCTIONS_EMULATOR=true` do `frontend/.env.local` (ou criar `.env.production` sem essa var)
5. Build frontend + deploy hosting: `npm run build` em `frontend/` → `firebase deploy --only hosting`

Free tier do Blaze (2M invocações/mês) cobre folgado o uso da Pontual.

## Frota observada (validação 2026-05-14 manhã)

- 38 veículos cadastrados (idCliente 1078 = PONTUAL BRASIL PETROLEO LTDA, CNPJ 02.886.685/0001-40)
- 36 com tracker LMU4230 (CalAmp), 2 com MSC830
- Telemetria embarcada (`descricao: "SASMDT SAT COM TELEMETRIA"`)
- 76% (29/38) com motorista logado via iButton durante operação
- Placas Mercosul (SEF*, SES*, SFL*) + antigas (BBE*, AKD*, TBX*), com sufixos -1/-2 indicando dois trackers no conjunto (cavalo + carreta)

## Limites operacionais SASCAR

- 1 chamada simultânea por integradora (cache 30s mitiga)
- Até 3000 pacotes por chamada (usamos 500)
- Pacotes saem ~1 min por veículo → latência real ≤ 1 min + cache 30s ≈ 1m30s

## Persistência em Firestore (resolve "perda de sinal" entre invocações)

Coleção `sascar_posicoes/{idVeiculo}` armazena `ultimaPosicao` de cada caminhão. Workflow:
1. `sascarPosicoes` chama SASCAR + lê snapshot da collection em paralelo
2. Faz merge: novos pacotes (idPacote > anterior) substituem; antigos persistidos no Firestore continuam visíveis
3. Batch write só dos veículos com posição realmente nova
4. Status `SEM_DADOS` só pros veículos que nunca apareceram em chamada nenhuma

**Why:** SASCAR só retorna pacotes recentes. Frota ativa de manhã enche os 3000 pacotes com telemetria dos veículos em movimento, sumindo com os parados antigos. Persistência elimina o problema.

**How to apply:** Não criar outro lugar pra essa info — `sascar_posicoes` é a fonte da verdade. Pra próximo features (histórico de trajeto, alertas), criar subcoleção `sascar_posicoes/{id}/historico/{idPacote}`.

### Credenciais no emulator local

- Service account JSON: `scripts/serviceAccountKey.json` (mesmo usado pelos scripts Python)
- `functions/index.js` carrega via `cert(keyPath)` quando `FUNCTIONS_EMULATOR === 'true'`
- Em produção: `initializeApp()` puro (credentials automáticas do Cloud Functions)
- Dados gravados na chamada local vão direto pra Firestore de PRODUÇÃO — não há emulator Firestore ativo

## Responsividade (mobile)

Página `Rastreamento.jsx` tem media queries em `<style>` inline:
- `@media (max-width: 900px)` — KPIs em 3 colunas
- `@media (max-width: 640px)` — KPIs 2 cols, header colapsa (ícones only), title abrevia, mapa vira 70vh, markers SVG escalam 0.78x via CSS transform

Validado 2026-05-14 em celular pela rede interna (192.168.20.131:5173).

## Features adicionais pra demo diretoria (2026-05-14)

1. **Status do motor corrigido** — `bloqueio=1` na SASCAR significa "atuador armado", não motor cortado. Status agora reflete realidade do motor; badge 🔒 separado mostra "bloqueio armado" quando aplicável. Campo `bloqueioArmado` no payload.
2. **Cluster de markers** — `react-leaflet-cluster`, agrupa caminhões próximos em círculo azul/roxo conforme densidade. Limpa visual da base Araucária.
3. **OC ativa no popup** — hook `useOcsAtivas` busca `ordens_carregamento` das últimas 48h, faz lookup por `cavaloPlaca` (normalizada). Mostra OC# + responsável + total litros + entregas + botão "Abrir OC". Heurística: OC mais recente da placa = ativa (modelo OC não tem campo status).
4. **Cercas eletrônicas dinâmicas** — collection `cercas_eletronicas` no Firestore com `{nome, tipo, cor, pontos: [[lat,lon]...]}`. Página `/cercas` permite desenhar clicando no mapa, escolher cor/tipo, listar e excluir. Mapa de Rastreamento renderiza polígonos + popup do caminhão mostra dentro de qual cerca está.
5. **Bloqueio remoto** — NÃO implementado. SASCAR usa API XML-RPC separada (não SOAP) que não temos doc. Adiar até receber a doc do serviço de comandos.

## API SASCAR — limitação descoberta

A doc `WebService_SasIntegra_v2.05` é SÓ leitura. Comandos (bloqueio, etc) usam **XML-RPC à parte**. Pra envio precisa pedir à SASCAR a doc do serviço de comandos.

## O que NÃO foi feito (próximas iterações)

- Mapa: cluster de markers próximos (37 caminhões na base Araucária empilham)
- Histórico de trajeto (linha no mapa) — usa `obterPacotePosicaoHistorico`
- Cerca eletrônica — definir polygons no Firestore + alertar entrada/saída
- Botão de bloqueio remoto na UI (precisa `obterTipoComando` + endpoint pra enviar comando)
- Persistência em Firestore (scheduled function 1min → vehicles/{id}/positions/{ts}) — vai liberar histórico real-time via onSnapshot sem mais hit no SASCAR
- Integração com OC: vincular OC ativa ao veículo no popup do mapa
- Notificação push de evento (parada não programada, desvio rota)
