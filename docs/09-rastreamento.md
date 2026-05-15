# 09 — Rastreamento de Frota

[← Voltar para o índice](README.md)

Módulo de rastreamento ao vivo integrado à API SASCAR. Disponível em `/rastreamento`.

Esta doc cobre **arquitetura, decisões técnicas e detalhes de implementação**. Para schema de dados ver [`03-modelo-dados.md`](03-modelo-dados.md), para visão de produto ver [`04-modulos.md`](04-modulos.md), para integração SASCAR/Cloud Functions ver [`10-sascar-integracao.md`](10-sascar-integracao.md).

## Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| Biblioteca de mapas | **Leaflet 1.9** via `react-leaflet 5` | Open source maduro, ilimitado, plugins ricos |
| Tiles principal | **OpenStreetMap** | Gratuito, sem API key, sem cadastro |
| Tiles satélite | **Esri World Imagery** | Gratuito, sem cadastro, qualidade boa até zoom 19 |
| Renderização markers | `divIcon` (HTML+SVG inline) | Mais flexível que ícones estáticos, suporta rotação CSS |
| State sync (cercas) | Firestore `onSnapshot` | Live update sem polling |
| State sync (posições) | Polling 30s na Cloud Function | Respeita rate limit SASCAR (1 req simultânea) |

## Arquitetura

```
┌─────────────┐ polling 30s ┌──────────────────────┐ SOAP    ┌──────────┐
│ Rastreamento├─────────────►│ sascarPosicoes (CF)  ├────────►│  SASCAR  │
│ (React)     │              │ + cache 30s memória  │         │ (TLS 1.2)│
│             │              │ + persistência       │         └──────────┘
│             │              │   sascar_posicoes/*  │
│             │ httpsCallable│ + leitura OC live    │
│             │              │ + status do motor    │
│             │              │   (ignição+velocidade)│
│             │              └──────────────────────┘
│             │ onSnapshot
│             │◄─────────────  Firestore: cercas_eletronicas (live)
│             │
│             │ getDocs
│             │◄─────────────  Firestore: ordens_carregamento (48h)
└─────────────┘
```

## Componentes frontend

### `pages/Rastreamento.jsx`

- Estado central: `view` (mapa/tabela), `busca`, `filtroStatus`
- Recebe posições do hook `useSascarPosicoes`
- Recebe OCs do hook `useOcsAtivas`
- Filtragem local por placa/cidade/motorista (case-insensitive) + status
- KPIs clicáveis filtram (toggle)
- Responsivo via media queries inline (mobile abaixo de 640px, tablet abaixo de 900px)

### `components/MapaFrota.jsx`

- `MapContainer` + `LayersControl` (Mapa / Satélite)
- `FitBounds` componente filho — usa `useMap` pra dar zoom automático no conjunto visível
- `makeIcon(p)` constrói `divIcon` com SVG do caminhão rotacionado por `direcao`
- `buildMarkerHtml(p)` monta HTML: placa, motorista, badge velocidade, badge sinal velho
- Popup completo com `Row` reutilizável
- Botões externos: Street View (`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=LAT,LON`) e Google Maps (`https://www.google.com/maps?q=LAT,LON`)
- Legenda fixa canto inferior direito
- Animação CSS `truckpulse` em torno de markers em movimento
- Transição `transform 600ms` no marker pra movimento parecer fluido entre polls

### `components/CercaEletronica.jsx`

- Renderiza `Polygon` ou `Circle` do react-leaflet por cerca conforme `formato`
- `Tooltip` sticky com nome da cerca
- Exporta `pontoEmPoligono`, `pontoEmCerca` (round-robin polígono/círculo), `areaDoPonto`, `haversineMetros`

### `pages/Cercas.jsx`

- Editor visual com toggle Polígono / Círculo
- Polígono: cliques adicionam vértices, polyline parcial → polígono fechado ≥3
- Círculo: 1 clique no mapa = centro, slider/input pro raio (50m-5km)
- Modal de salvar: nome, tipo, cor
- Lista lateral com filtro client-side (nome/tipo)
- Edição com drag handles (clique na cerca no mapa OU ✏️ na lista)
- Busca de endereço via ViaCEP + Nominatim estruturado + fallbacks
- Detalhes completos em [`11-cercas-eletronicas.md`](11-cercas-eletronicas.md)

### Painel de eventos em `pages/Rastreamento.jsx`

- Componente `EventosCercaPanel` colapsável abaixo da busca
- Hook `useEventosCerca({ horasAtras: 12, limite: 100 })` — snapshot live
- Lista ENTRADA (verde) / SAÍDA (laranja) com placa, cerca, tempo relativo
- Badge contador 12h, prévia do último evento quando fechado

## Hooks

### `hooks/useSascarPosicoes.js`

```js
const { data, loading, error, lastFetch, refetch } = useSascarPosicoes({ intervalMs: 30_000 });
```

- Chama `sascarPosicoes` callable do Firebase Functions
- Polling automático a cada `intervalMs` (default 30s)
- Refetch ao voltar pra aba (`visibilitychange`)
- Retorna `data.posicoes` (array) e `data.cache` (idade do cache do servidor)

### `hooks/useCercas.js`

- `onSnapshot` em `cercas_eletronicas` ordenado por nome
- Live update — nova cerca aparece em todos os clientes sem refresh

### `hooks/useOcsAtivas.js`

- One-shot `getDocs` filtrado `where("criadoEm", ">=", desde)` (últimas 48h)
- Constrói `Map<placa, OC>` com a OC mais recente por placa
- Heurística: OC mais recente da placa = ativa (modelo atual de OC não tem campo `status`)

## Decisões técnicas

### Por que não usamos o campo `bloqueio` da SASCAR

A API SASCAR retorna no pacote de posição um campo `bloqueio: 0 | 1`. A documentação dela diz: *"informa se o veículo está bloqueado"*. **Isso é enganoso.**

Na operação real:
- Caminhões em movimento, motorista trabalhando, motor ligado → `bloqueio=1` retornado pela SASCAR
- Caminhões parados em base com bloqueio desarmado → `bloqueio=0`
- A inconsistência fica clara em frota com 38 caminhões ativos

**Hipótese (confirmada por inspeção):** o campo `bloqueio` reflete o **estado da saída elétrica do equipamento** (a saída padrão de bloqueio do equipamento SASCAR), não comando pendente. Esse estado é armado por padrão de fábrica em quase todos os equipamentos da frota Pontual.

**Decisão:** o status do veículo é calculado apenas a partir de ignição + velocidade. Não usamos `bloqueio`. Para um "bloqueio real" (comando armado da central), seria necessário registro próprio em coleção paralela ou integração com a API XML-RPC de comandos da SASCAR (que não temos doc).

Implementação em `functions/index.js`:
```js
function statusFromPacote(p) {
  const vel = p.velocidade ?? 0;
  const ign = p.ignicao === 1;
  if (ign && vel > 0) return 'EM_MOVIMENTO';
  if (ign) return 'PARADO_LIGADO';
  return 'ESTACIONADO';
}
```

### Por que persistir em Firestore

A API SASCAR retorna **apenas pacotes recentes** (até 3000 por chamada, ordenados por data). Durante operação ativa de manhã, caminhões em movimento bombardeiam a janela com pacotes a cada poucos segundos — caminhões parados podem **sumir** da resposta porque seu pacote mais novo é "antigo demais".

Resultado em testes: chamada com 3000 pacotes retornava só 9 dos 38 veículos.

**Solução:** persistir em `sascar_posicoes/{idVeiculo}` (1 doc por veículo). A cada chamada do callable:
1. Lê snapshot da coleção (todos os 38 veículos com sua última posição conhecida)
2. Chama SASCAR e identifica posições novas (`idPacote` maior que o salvo)
3. Batch write das novas
4. Resultado é merge: posição salva + atualizações dessa chamada

Veículo parado há 1 semana ainda aparece com sua última posição conhecida.

### Por que Leaflet e não Google Maps

Comparação detalhada em [`04-modulos.md`](04-modulos.md). Resumo:
- Leaflet + OSM: $0/mês ilimitado, sem cadastro
- Google Maps: free tier $200/mês, depois cobra; exige billing ativo

Pra operação interna (38 caminhões, ~10 usuários simultâneos máximo) Leaflet sobra. Pra portal cliente externo no futuro, considerar Google Maps só nessa parte.

### Por que cache 30s no servidor

- SASCAR tem rate limit de 1 chamada simultânea por integradora
- Múltiplos usuários do dashboard fariam várias chamadas concorrentes
- Cache 30s na memória da função absorve picos de uso
- Frontend faz polling 30s, então normalmente cada ciclo tem 1 chamada ao SASCAR mesmo com N usuários

## Acesso pela rede interna

Pra operação no celular dentro da Pontual:
- Vite: `host: true` (já configurado em `vite.config.js`)
- Functions emulator: `host: "0.0.0.0"` em `firebase.json > emulators`
- `firebase/config.js` detecta `window.location.hostname` e conecta no Functions emulator pelo mesmo IP
- Firewall: regra TCP 5001 e 5173 (`scripts/liberar-firewall-dev.bat`, rodar como administrador 1x)
- URL: `http://192.168.20.131:5173` (IP da estação dev)

Detalhes em [`10-sascar-integracao.md`](10-sascar-integracao.md).

## Roadmap

Próximos itens previstos pro módulo (não implementados ainda):
- Histórico de trajeto (linha colorida no mapa últimas 24h) — usar subcoleção `sascar_posicoes/{id}/historico/{idPacote}`
- Cercas Fase 2-4 (permanência, velocidade dentro, horário, push/email/som, corredor de rota, grupos) — ver [`11-cercas-eletronicas.md`](11-cercas-eletronicas.md)
- Alertas WhatsApp: parada não programada fora de cerca, desvio de rota
- Score motorista: frenagem brusca, curva agressiva (campos `eventos` do pacote SASCAR)
- Integração com OC: bloqueio de OC quando motorista não cumpriu 11h de descanso (precisa VDO antes)
- Bloqueio remoto via UI: pendente da doc XML-RPC da SASCAR
