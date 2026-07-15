# 11 — Cercas Eletrônicas

[← Voltar para o índice](README.md)

Sistema de geofences (cercas eletrônicas) integrado ao rastreamento SASCAR. Gera eventos de entrada/saída automaticamente a cada poll do callable `sascarPosicoes`. Disponível em `/cercas` (cadastro/edição) e na lateral de `/rastreamento` (visualização + lista de eventos).

Para schema completo das coleções ver [`03-modelo-dados.md`](03-modelo-dados.md). Para módulo de rastreamento ver [`09-rastreamento.md`](09-rastreamento.md). Para Cloud Functions ver [`10-sascar-integracao.md`](10-sascar-integracao.md).

## Status de entrega — Fase 1

| Feature | Status | Onde |
|---|---|---|
| Cerca polígono (3+ pontos) | ✅ | `pages/Cercas.jsx` |
| Cerca circular (centro + raio) | ✅ Fase 1 | `pages/Cercas.jsx` |
| Edição de forma (drag handles) | ✅ Fase 1 | `pages/Cercas.jsx` |
| Detecção entrada/saída | ✅ Fase 1 | `functions/index.js` |
| Persistência de eventos | ✅ Fase 1 | Firestore `cercas_eventos` |
| Painel de eventos no rastreamento | ✅ Fase 1 | `pages/Rastreamento.jsx` |
| Busca de endereço (Nominatim+ViaCEP) | ✅ Fase 1 | `pages/Cercas.jsx` |
| Filtro client-side de cercas | ✅ Fase 1 | `pages/Cercas.jsx` |
| Permanência prolongada | 🔜 Fase 2 | — |
| Velocidade dentro da cerca | 🔜 Fase 2 | — |
| Horário não permitido | 🔜 Fase 2 | — |
| Notificação push (FCM) | 🔜 Fase 3 | — |
| Notificação por e-mail | 🔜 Fase 3 | — |
| Som de alerta no painel | 🔜 Fase 3 | — |
| Corredor de rota | 🔜 Fase 4 | — |
| Grupos de veículos | 🔜 Fase 4 | — |

## Arquitetura

```
┌─────────────────────────────┐                ┌─────────────────────────────┐
│  Cercas.jsx                 │                │  Rastreamento.jsx           │
│  (CRUD + edição de cercas)  │                │  (mapa + painel de eventos) │
└──────────┬──────────────────┘                └─────────────┬───────────────┘
           │  addDoc / updateDoc / deleteDoc                  │  onSnapshot
           ▼                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Firestore                                                                   │
│  ┌─────────────────────┐   ┌──────────────────┐   ┌────────────────────────┐ │
│  │ cercas_eletronicas  │   │ cercas_eventos   │   │ sascar_posicoes        │ │
│  │ (CRUD pelo usuário) │   │ (write: Functions)│  │ (write: Functions)     │ │
│  │                     │   │ (read: logado)    │  │ ultimaPosicao.dentroDe │ │
│  └────────┬────────────┘   └─────▲────────────┘  └────────▲───────────────┘ │
└───────────┼─────────────────────┬┼───────────────────────┼─────────────────┘
            │ getDocs              ││                       │
            ▼                      ││ batch.set             │ batch.set
┌─────────────────────────────────────────────────────────────────────────────┐
│  Cloud Function `sascarPosicoes` (functions/index.js)                       │
│  - Lê cercas + estado anterior em paralelo (Promise.all)                    │
│  - cercasContendoPonto(lat, lng, cercas) → array de cercaIds                │
│  - Compara `dentroDe` atual vs anterior → gera eventos ENTRADA/SAIDA        │
│  - Persiste eventos em batch único junto com nova posição                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Formatos de cerca

A cerca tem campo `formato`:

| Formato | Campos obrigatórios | Visualização |
|---|---|---|
| `"poligono"` | `pontos: [[lat, lng], ...]` (≥3) | `<Polygon>` do react-leaflet |
| `"circulo"` | `centro: {lat, lng}` + `raio` (metros) | `<Circle>` do react-leaflet |

Cercas legadas sem o campo `formato` são tratadas como polígono por compatibilidade (default no helper `pontoEmCerca`).

## Schema Firestore

### `cercas_eletronicas/{id}`

```js
{
  // Identificação
  nome: string,                          // "Base PONTUAL", "Replan"
  tipo: "Base" | "Cliente" | "Restrita" | "Posto" | "Refinaria" | "Oficina" | "Outro",
  cor: string,                           // hex "#2563eb"

  // Forma (um dos dois grupos abaixo)
  formato: "poligono" | "circulo",

  // Se polígono:
  pontos?: number[][],                   // [[lat, lng], ...] (≥3)

  // Se círculo:
  centro?: { lat: number, lng: number },
  raio?: number,                         // metros (50-50000)

  // Auditoria
  criadoEm: timestamp,
  criadoPor: string,                     // email
  atualizadoEm?: timestamp,              // setado em edições
  atualizadoPor?: string,
}
```

### `cercas_eventos/{id}`

ID composto pra idempotência: `{idVeiculo}_{cercaId}_{idPacote}_{E|S}`. Re-execução da função com mesmo idPacote não duplica o evento.

```js
{
  tipo: "ENTRADA" | "SAIDA",
  idVeiculo: number,
  placa: string,
  cercaId: string,                       // doc id da cerca
  cercaNome: string,                     // denormalizado
  cercaTipo: string,                     // denormalizado
  latitude: number,
  longitude: number,
  idPacote: number | null,               // pacote SASCAR que disparou o evento
  dataPosicao: string | null,            // "2026-05-15T09:12:34.0" (data da SASCAR)
  timestamp: serverTimestamp,            // hora do servidor Firestore (ordenação canônica)
  criadoEmMs: number,                    // Date.now() do servidor — usado pra queries por janela de tempo
}
```

### `sascar_posicoes/{id}.ultimaPosicao` — campo novo

```js
{
  ...campos existentes...
  dentroDe: string[],                    // cercaIds em que o veículo está NESTE momento
}
```

`dentroDe` é a "memória" entre invocações da Cloud Function — permite detectar transição comparando estado anterior (Firestore) com novo (calculado).

## Helpers

### `functions/src/sascar/geofence.js`

Helper server-side, usado em `sascarPosicoes`:

```js
export function haversineMetros(lat1, lng1, lat2, lng2)
export function pontoEmCerca(lat, lng, cerca)
export function cercasContendoPonto(lat, lng, cercas)  // → array de cercaIds
```

- Círculo: distância haversine ≤ raio
- Polígono: ray-casting
- Cerca sem `formato` → trata como polígono

### `frontend/src/components/CercaEletronica.jsx`

Mesma lógica do server, mais helpers de render:

```js
export function haversineMetros(...)
export function pontoEmPoligono(lat, lon, pontos)
export function pontoEmCerca(lat, lng, cerca)
export function areaDoPonto(lat, lon, cercas = [])     // → cerca em que o ponto está
export default function CercaEletronica({ cercas })    // renderiza Polygon/Circle
```

## Detecção de entrada/saída

Em `functions/index.js`, dentro do callable `sascarPosicoes` (cache 30s):

```js
// 1) Lê em paralelo: SASCAR + estado anterior + cercas
const [pacotes, veiculos, snapshot, cercasSnap] = await Promise.all([
  obterPacotePosicoesMotorista(...),
  obterVeiculos(...),
  db.collection('sascar_posicoes').get(),
  db.collection('cercas_eletronicas').get(),
]);

// 2) Pra cada veículo com posição NOVA (idPacote maior):
const dentroDe = cercasContendoPonto(lat, lng, cercas);
const dentroAntes = anterior?.dentroDe || [];

// 3) ENTRADA: presente agora mas não antes
// 4) SAIDA: presente antes mas não agora
// 5) Eventos vão pro mesmo batch que persiste a posição
```

Eventos só disparam quando **já existia estado anterior** — primeiro snapshot não gera spam de "entrada" pra cercas pré-existentes.

## UI

### `/cercas` — cadastro e edição

**Header**
- Botões `Círculo` / `Polígono` quando ocioso
- Modo desenho: `Concluir` + `Cancelar`
- Modo desenho polígono: `Desfazer ponto`

**Sidebar**
- Busca de endereço (ViaCEP + Nominatim estruturado + fallback livre)
- Filtro client-side de cercas (por nome ou tipo, instantâneo)
- Lista de cercas com ✏️ (editar) e 🗑 (excluir) por item
- Painel "Modo desenho" ou "Editando cerca" conforme estado
- Slider de raio quando círculo (50m–5km, input manual também)

**Mapa**
- LayersControl: Mapa (OSM) | Satélite (Esri)
- Cercas existentes clicáveis (entram em edição) com tooltip do nome
- Cerca em edição: contorno laranja + handles arrastáveis
  - Círculo: 1 marker no centro draggable + slider pro raio
  - Polígono: marker draggable em cada vértice; clique-direito remove (mín. 3)

### `/rastreamento` — visualização + eventos

- Painel colapsável "Eventos de cerca" abaixo da busca:
  - Badge contador (12h) com cor vermelha se houver eventos
  - Prévia do último evento quando fechado
  - Lista expandida: ENTRADA (verde) / SAÍDA (laranja) com placa, cerca, tempo relativo
- Hook: `useEventosCerca({ horasAtras: 12, limite: 100 })` — onSnapshot live
- Cercas no mapa via `<CercaEletronica cercas={cercas} />`

## Busca de endereço (ViaCEP + Nominatim)

Robusta pra endereços brasileiros:

1. **Detecta CEP** no input via regex `(\d{5})[- ]?(\d{3})`
2. **Resolve CEP via ViaCEP** (oficial Correios, sem auth, sem rate limit) → obtém logradouro/bairro/cidade/UF oficiais
3. **Busca estruturada no Nominatim** com `street`, `city`, `state`, `postalcode` — alta acurácia
4. **Fallbacks em cascata**:
   - Texto livre com endereço ViaCEP
   - Texto original normalizado (R. → Rua, Av. → Avenida, etc.)
   - Localização aproximada só pelo CEP
5. **Timeouts de 4-6s** por provider via `AbortController` — botão não trava

## Segurança (Firestore Rules)

```js
match /cercas_eletronicas/{id} {
  allow read:   if logado();
  allow create: if isAtivo();
  allow update: if isAtivo();
  allow delete: if isAtivo();
}

match /cercas_eventos/{id} {
  allow read:  if logado();
  allow write: if false; // só Cloud Functions admin SDK escreve
}
```

Eventos não podem ser escritos pelo cliente — só pela Cloud Function via Admin SDK. Garante imutabilidade do histórico.

## Edição com drag handles

Modo edição ativado por:
- Clique no ícone ✏️ na sidebar
- Clique direto na cerca no mapa

Em modo edição:
- Cerca passa a ser renderizada com contorno laranja sólido (3px, sem dasharray)
- A cerca original (cor configurada) some temporariamente do mapa
- Handles arrastáveis aparecem
- Painel "Editando cerca" mostra controles + Salvar/Cancelar
- `Iniciar desenho` cancela edição em curso
- `updateDoc` grava `atualizadoEm` + `atualizadoPor`

## Performance e custos

- Tiles OSM: gratuito ilimitado (uso interno respeita fair use)
- ViaCEP: gratuito ilimitado
- Nominatim: 1 req/seg (limit OSM Foundation) — fluxo atual emite 1-3 reqs por busca
- Firestore leituras: cada poll do `sascarPosicoes` agora lê +1 coleção (`cercas_eletronicas`); em frota com poucas cercas o custo é negligível
- Firestore writes: 1 doc por evento; cada cruzamento de borda = 1 ENTRADA e 1 SAIDA por veículo

## Deploy

Após mudanças nesta área:

```bash
# Frontend (Vite build + Firebase Hosting)
deploy.bat

# Cloud Functions (mudanças em functions/)
firebase deploy --only functions

# Regras de Firestore (necessário pra cercas_eventos funcionar em prod)
firebase deploy --only firestore:rules

# Tudo de uma vez
firebase deploy --only hosting,functions,firestore:rules
```

## Roadmap das próximas fases

### Fase 2 — alertas avançados
- `permanenciaPorCerca` na `ultimaPosicao` (timestamp de entrada por cercaId)
- Nova função `verificarAlertasCerca` (scheduled a cada 5 min) que percorre veículos com permanência > X min e gera evento `PERMANENCIA`
- Campo `regrasAlerta` na cerca: `{ permanenciaMaxMin, velocidadeMaxKmh, horarioPermitido: { de, ate } }`

### Fase 3 — canais de notificação
- Topic FCM por usuário/grupo
- Cloud Function trigger `onCreate` em `cercas_eventos` → push + email + Telegram opcional
- Configuração de assinatura por usuário em `usuarios/{uid}.alertasCerca`

### Fase 4 — corredor e grupos
- `cercas_eletronicas` ganha formato `"corredor"` com `linha: number[][]` + `larguraMetros`
- Helper `pontoEmCorredor` (distância perpendicular ao segmento mais próximo)
- Coleção `grupos_veiculos/{id}` com array de `idVeiculo`
- Campo `escopo` na cerca: `"frota"` | `"grupo"` | `"veiculos"` + array de IDs

---

## Relacionado

- Anterior: [[10-sascar-integracao]]
- Próximo: [[12-migracao-postgresql-tms]]
- [[INDICE|🏠 Voltar ao índice]]
- [[CLAUDE|📖 Contexto do sistema]]
- [[MEMORY|🧠 Memórias]]
