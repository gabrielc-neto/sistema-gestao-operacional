# 10 — Integração SASCAR (Cloud Functions)

[← Voltar para o índice](README.md)

Backend que consome a API SASCAR e expõe endpoints internos pro frontend React. Implementado como Firebase Cloud Functions v2 (Node 22) na região `southamerica-east1`.

## Visão geral

```
React (frontend)
   │ httpsCallable
   ▼
Cloud Functions (southamerica-east1)
   │ - cache 30s em memória
   │ - autenticação via Firebase Auth ID token
   ▼
SOAP client (Node fetch)
   │ HTTPS + TLS 1.2
   ▼
SASCAR SasIntegra WebService
   https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService
```

Detalhes da API SASCAR (endpoint, autenticação, métodos): `docs/sascar/WebService_SasIntegra_v2.05_Portugues.pdf` (manual oficial baixado) e arquivo de referência na memória persistente do projeto.

## Estrutura

```
functions/
├── package.json         (node 22, firebase-functions v6, firebase-admin v12)
├── index.js             (exporta sascarVeiculos e sascarPosicoes)
├── .gitignore
├── .secret.local        (credenciais emulator local — NUNCA commitado)
└── src/
    └── sascar/
        ├── soap.js      (cliente SOAP minimalista)
        └── cache.js     (TTL em memória, sobrevive entre invocações)
```

## Endpoints (HTTPS Callable)

### `sascarVeiculos`

Lista a frota cadastrada na SASCAR.

```js
const result = await httpsCallable(functions, 'sascarVeiculos')({});
// result.data = { veiculos: Array<{idVeiculo, placa, idCliente, descricao, idEquipamento, idEquipamentoDesc, satelital}>,
//                 total: number,
//                 cache: { age, fresh } }
```

- Cache em memória **1 hora** (a frota muda raramente)
- Auth: exige `request.auth.uid` (Firebase Auth ID token)
- Secrets usados: `SASCAR_USUARIO`, `SASCAR_SENHA`

### `sascarPosicoes`

Última posição GPS de cada veículo (com motorista logado via iButton, quando houver).

```js
const result = await httpsCallable(functions, 'sascarPosicoes')({});
// result.data = { posicoes: Array<{idVeiculo, placa, dataPosicao, latitude, longitude,
//                                  velocidade, direcao, ignicao, gps, uf, cidade, rua,
//                                  pontoReferencia, motoristaLogado, statusTexto, ...}>,
//                 total: number,
//                 cache: { age, fresh },
//                 gravadosNoFirestore: number }
```

- Cache em memória **30 segundos** (frota dinâmica)
- **Persiste em Firestore** (`sascar_posicoes/{idVeiculo}`) — resolve "veículo sumir" entre invocações
- Auth: exige `request.auth.uid`
- Secrets usados: `SASCAR_USUARIO`, `SASCAR_SENHA`
- Usa internamente `obterPacotePosicoesMotorista` (não `obterPacotePosicoes`) — esse traz `idMotorista` e `nomeMotorista`

## Cliente SOAP

`functions/src/sascar/soap.js` — cliente minimalista, sem dependência externa (usa `fetch` nativo do Node 22).

Funções exportadas:

| Função | Método SOAP | Uso |
|---|---|---|
| `obterVeiculos({usuario, senha, quantidade, idVeiculo})` | `obterVeiculos` | Listar frota |
| `obterClientes({usuario, senha, quantidade, idCliente})` | `obterClientes` | Listar clientes integrador |
| `obterPacotePosicoes({usuario, senha, quantidade})` | `obterPacotePosicoes` | Última posição (sem motorista) |
| `obterPacotePosicoesMotorista({usuario, senha, quantidade})` | `obterPacotePosicoesMotorista` | Posição + motorista logado |
| `ultimaPorVeiculo(pacotes)` | helper | Reduz array de pacotes pra última posição por veículo |

**Detalhes técnicos:**
- Endpoint: `https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService`
- Protocolo: SOAP 1.1 sobre HTTPS, TLS 1.2 obrigatório
- Namespace: `http://webservice.web.integracao.sascar.com.br/`
- Auth: `usuario` + `senha` como parâmetros em CADA método (não header SOAP)
- Parse: regex simples sobre o XML de retorno (não usa lib pesada)
- Quantidade máxima por chamada: 3000 pacotes
- Limite simultâneo: 1 chamada por integradora (mitigado pelo cache 30s)

## Cache

`functions/src/sascar/cache.js` — TTL simples em `Map<string, {data, t}>`.

```js
const { data, age, fresh } = await cached('chave', ttlMs, async () => {
  return await algumaLogicaCara();
});
```

- Vida útil: enquanto a instância Cloud Run estiver quente (varia, tipicamente minutos a horas)
- **Persistência verdadeira** está no Firestore (vide próxima seção), não no cache em memória

## Persistência em Firestore

Resolve o problema de a SASCAR retornar **apenas pacotes recentes** (frota ativa enche a janela e veículos parados somem da resposta).

Workflow do callable `sascarPosicoes`:

1. Em paralelo:
   - `obterPacotePosicoesMotorista` (SOAP)
   - `obterVeiculos` (SOAP)
   - `db.collection('sascar_posicoes').get()` (Firestore snapshot)
2. Identifica posições NOVAS (`idPacote > anterior.idPacote` do Firestore)
3. Batch write das novas em `sascar_posicoes/{idVeiculo}` com merge:
   ```
   {
     idVeiculo, placa, idEquipamentoDesc,
     ultimaPosicao: { ...pacote, statusTexto, motoristaLogado },
     atualizadoEm: serverTimestamp()
   }
   ```
4. Resultado retornado é **merge**: posições persistidas + atualizações da chamada atual
5. Veículos cadastrados na SASCAR mas sem doc no Firestore retornam `statusTexto: 'SEM_DADOS'`

**Em produção:** as credenciais do Firebase Admin SDK são automáticas. **Em emulator local:** carrega `scripts/serviceAccountKey.json` (mesmo usado pelos scripts Python).

```js
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  initializeApp({
    credential: cert(resolve(__dirname, '../scripts/serviceAccountKey.json')),
    projectId: 'pontual-logistica',
  });
} else {
  initializeApp();
}
```

> Dados gravados no emulator local vão pro Firestore de **PRODUÇÃO**. Não há emulator Firestore ativo nesta configuração — usar produção evita pollution de dados fakes e mantém ambiente consistente.

## Autenticação

Cada callable verifica `request.auth?.uid` antes de executar. Em produção é Firebase Auth ID token automático (qualquer usuário logado no app).

**Bypass de desenvolvimento (apenas emulator):**

```js
function requireAuth(request) {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
  const devHeader = request.rawRequest?.headers?.['x-dev-bypass'] === 'true';
  if (isEmulator && devHeader) return;
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Login obrigatório');
}
```

A variável `FUNCTIONS_EMULATOR` é setada apenas pelo Firebase Emulator Suite, nunca em produção. Em prod o bypass é literalmente impossível.

Usado pelos scripts de teste (`scripts/test-sascar-*.mjs`) que precisam chamar a função sem rodar a UI inteira.

## Secrets

Credenciais SASCAR via Firebase Secret Manager (Functions v2 padrão).

**Produção:**
```powershell
firebase functions:secrets:set SASCAR_USUARIO   # cola valor
firebase functions:secrets:set SASCAR_SENHA     # cola valor
firebase deploy --only functions                # deploy automático com binding
```

**Emulator local:** arquivo `functions/.secret.local` (gitignored):
```
SASCAR_USUARIO=PONTUALPONTUAL
SASCAR_SENHA=***
```

O Firebase Emulator lê esse arquivo automaticamente. Em produção não tem efeito.

## Setup pro emulator local

### Pré-requisitos
- Node.js 22+
- Firebase CLI logado (`firebase login`)
- `scripts/serviceAccountKey.json` presente

### Iniciar

```powershell
cd C:\Users\Logistica01\projetos\logistica-ia
firebase emulators:start --only functions --project pontual-logistica
```

Saída esperada:
```
+  functions[southamerica-east1-sascarPosicoes]: http function initialized
+  functions[southamerica-east1-sascarVeiculos]: http function initialized
+  All emulators ready!
```

### Frontend conectar no emulator

Em `frontend/.env.local`:
```
VITE_USE_FUNCTIONS_EMULATOR=true
```

`firebase/config.js` detecta:
- Modo dev (`import.meta.env.DEV === true`) AND env flag → conecta no emulator
- Build de produção (`npm run build`) ignora a flag — sempre prod

Auto-detecção do host: se acessar pelo IP da LAN (celular), conecta no Functions emulator do mesmo IP. Se acessar via `localhost`, usa 127.0.0.1.

### Acesso pela rede (celular)

`firebase.json` emulator host = `0.0.0.0`:
```json
"emulators": {
  "functions": { "host": "0.0.0.0", "port": 5001 },
  "auth":      { "host": "0.0.0.0", "port": 9099 },
  "firestore": { "host": "0.0.0.0", "port": 8080 },
  "ui":        { "enabled": true, "host": "0.0.0.0" }
}
```

Firewall Windows (executar como administrador 1 vez):
```
scripts/liberar-firewall-dev.bat
```

Cria regras Windows Firewall para portas 5001 (Functions) e 5173 (Vite) em perfil private/domain.

URL no celular: `http://<IP-DA-MAQUINA>:5173/rastreamento`

## Scripts de teste isolados

`scripts/test-sascar-api.mjs` — `obterVeiculos` (smoke test inicial, valida credenciais)
`scripts/test-sascar-clientes.mjs` — `obterClientes` (descobre nome real da conta)
`scripts/test-sascar-posicoes.mjs` — `obterPacotePosicoes` (300 KB de payload, 35-38 veículos)
`scripts/test-persist.mjs` — força reload do cache e mede persistência

Lêem credenciais de `.env` (raiz do projeto, gitignored).

## Deploy para produção

Pré-requisitos:
- Plano Blaze ativo no Firebase
- Secrets configurados via `firebase functions:secrets:set`

```powershell
cd C:\Users\Logistica01\projetos\logistica-ia
firebase deploy --only functions
```

Saída espera (~5 min na primeira vez por build de container):
```
+  functions[sascarVeiculos(southamerica-east1)]: Successful create operation.
+  functions[sascarPosicoes(southamerica-east1)]: Successful create operation.
```

Pra remover a flag de emulator do frontend antes do deploy de hosting:
```powershell
# Apagar/comentar a linha em frontend/.env.local:
# VITE_USE_FUNCTIONS_EMULATOR=true

cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

## Custos esperados (produção)

Cálculo pra 38 caminhões + ~10 usuários simultâneos:

| Recurso | Volume estimado | Custo BR mensal |
|---|---|---|
| Function invocations | 200-500k/mês | ~R$ 0 (free tier 2M) |
| GB-segundos | < 100k | ~R$ 0 (free tier 400k) |
| Firestore reads | < 1M/mês | R$ 0-5 |
| Firestore writes | ~3M/mês | R$ 10-15 |
| Hosting | < 1GB/mês | R$ 0 (free tier 10GB) |
| Egress | < 5GB/mês | R$ 0 (free tier) |
| **Total Firebase** | | **~R$ 15-25/mês** |

Sem WhatsApp, sem Google Maps, sem app PWA motorista.

## Limites conhecidos

1. **SASCAR é só leitura via SasIntegra** — comandos (bloqueio remoto) usam API XML-RPC separada, doc ausente. Vide `09-rastreamento.md` seção decisões.

2. **Cold start ~3s** — primeira invocação após instância morrer leva ~3s. Em uso contínuo (polling 30s) isso é raro.

3. **Cache em memória não é compartilhado entre instâncias** — se `maxInstances > 1` cada uma terá seu cache. Para essa escala (poucos usuários simultâneos) `maxInstances: 5` está OK.

4. **Persistência no Firestore não inclui histórico** — só a última posição é salva. Pra trajeto histórico, criar subcoleção `sascar_posicoes/{id}/historico/{idPacote}` no futuro (gera muito write/read; ponderar).

---

## Relacionado

- Anterior: [[09-rastreamento]]
- Próximo: [[11-cercas-eletronicas]]
- [[INDICE|🏠 Voltar ao índice]]
- [[CLAUDE|📖 Contexto do sistema]]
- [[MEMORY|🧠 Memórias]]
