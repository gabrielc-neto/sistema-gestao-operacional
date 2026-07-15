---
name: dynamodb-patterns
description: >
  Skill completa de DynamoDB: modelagem de dados, operações CRUD, queries, índices GSI/LSI,
  TTL, custos e boas práticas. Use sempre que o usuário mencionar DynamoDB, tabela NoSQL,
  chave primária, partition key, sort key, GSI, LSI, scan, query, PutItem, GetItem, UpdateItem,
  DeleteItem, expressão de filtro, índice secundário, TTL, expiração de item, custo DynamoDB,
  modelagem NoSQL, ou quando pedir para "adicionar campo", "buscar por data", "criar índice",
  "otimizar consulta DynamoDB", "estrutura da tabela". Também acionar para padrões de acesso
  único (single-table design) e integração com Lambda.
---

# DynamoDB — Padrões e Boas Práticas

## Conceitos Fundamentais

| Conceito | Descrição |
|----------|-----------|
| **Partition Key (PK)** | Chave principal — distribui dados entre partições |
| **Sort Key (SK)** | Chave secundária — ordena itens dentro de uma partição |
| **GSI** | Global Secondary Index — consultar por outros atributos |
| **LSI** | Local Secondary Index — sort key alternativa (mesma partição) |
| **TTL** | Time To Live — expirar itens automaticamente |

---

## Padrão Atual (TokenUsage)

```
Tabela: TokenUsage
PK: userId (String)
Atributos: tokens_YYYY-MM-DD (Number), updatedAt (String)
```

### Evolução recomendada com Sort Key

```
Tabela: TokenUsage
PK: userId (String)
SK: data (String) — formato YYYY-MM-DD

Benefício: buscar histórico por período sem Scan
```

---

## Operações CRUD

```javascript
const { DynamoDBClient, GetItemCommand, PutItemCommand,
        UpdateItemCommand, DeleteItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");

const dynamo = new DynamoDBClient({ region: "us-east-1" });

// GET — buscar item
async function getItem(userId) {
  const { Item } = await dynamo.send(new GetItemCommand({
    TableName: "TokenUsage",
    Key: { userId: { S: userId } },
  }));
  return Item ? unmarshall(Item) : null;
}

// PUT — criar/substituir item completo
async function putItem(dados) {
  await dynamo.send(new PutItemCommand({
    TableName: "TokenUsage",
    Item: marshall(dados),
  }));
}

// UPDATE — atualizar campos específicos (sem sobrescrever o resto)
async function updateItem(userId, campos) {
  const exprs = [];
  const names = {};
  const values = {};

  for (const [k, v] of Object.entries(campos)) {
    exprs.push(`#${k} = :${k}`);
    names[`#${k}`] = k;
    values[`:${k}`] = typeof v === "number" ? { N: String(v) } : { S: v };
  }

  await dynamo.send(new UpdateItemCommand({
    TableName: "TokenUsage",
    Key: { userId: { S: userId } },
    UpdateExpression: `SET ${exprs.join(", ")}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

// Incrementar contador atomicamente
async function incrementarTokens(userId, data, quantidade) {
  await dynamo.send(new UpdateItemCommand({
    TableName: "TokenUsage",
    Key: { userId: { S: userId } },
    UpdateExpression: "ADD #tokens :qtd SET #upd = :upd",
    ExpressionAttributeNames: {
      "#tokens": `tokens_${data}`,
      "#upd": "updatedAt",
    },
    ExpressionAttributeValues: {
      ":qtd": { N: String(quantidade) },
      ":upd": { S: new Date().toISOString() },
    },
  }));
}
```

---

## Marshall/Unmarshall (simplifica o SDK)

```javascript
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

// marshall: objeto JS → formato DynamoDB
const item = marshall({ userId: "u123", tokens: 500, ativo: true });
// { userId: { S: "u123" }, tokens: { N: "500" }, ativo: { BOOL: true } }

// unmarshall: formato DynamoDB → objeto JS
const obj = unmarshall(Item);
// { userId: "u123", tokens: 500, ativo: true }
```

---

## Query (com Sort Key)

```javascript
// Buscar todos os registros de um userId (com SK)
async function queryPorUsuario(userId) {
  const { Items } = await dynamo.send(new QueryCommand({
    TableName: "TokenUsage",
    KeyConditionExpression: "userId = :uid",
    ExpressionAttributeValues: { ":uid": { S: userId } },
  }));
  return Items.map(unmarshall);
}

// Buscar por período
async function queryPorPeriodo(userId, dataInicio, dataFim) {
  const { Items } = await dynamo.send(new QueryCommand({
    TableName: "TokenUsage",
    KeyConditionExpression: "userId = :uid AND #data BETWEEN :ini AND :fim",
    ExpressionAttributeNames: { "#data": "data" },
    ExpressionAttributeValues: {
      ":uid": { S: userId },
      ":ini": { S: dataInicio },
      ":fim": { S: dataFim },
    },
  }));
  return Items.map(unmarshall);
}
```

---

## TTL — Expirar itens automaticamente

```javascript
// Configurar TTL no item (Unix timestamp em segundos)
function calcularExpiracao(dias = 30) {
  return Math.floor(Date.now() / 1000) + (dias * 24 * 60 * 60);
}

// Salvar item com TTL
await putItem({
  userId: "u123",
  data: "2025-01-01",
  tokens: 500,
  expiracao: calcularExpiracao(30), // campo TTL configurado na tabela
});
```

> Para ativar: Console AWS → Tabela → "Manage TTL" → campo `expiracao`

---

## GSI — Global Secondary Index

**Caso de uso:** Buscar todos os usuários que usaram tokens em uma data específica.

```javascript
// Criar GSI: PK = data, SK = userId

// Query no GSI
const { Items } = await dynamo.send(new QueryCommand({
  TableName: "TokenUsage",
  IndexName: "data-index",
  KeyConditionExpression: "#data = :data",
  ExpressionAttributeNames: { "#data": "data" },
  ExpressionAttributeValues: { ":data": { S: "2025-01-01" } },
}));
```

---

## Custo — Referência Rápida

| Operação | Custo (on-demand) |
|----------|-------------------|
| GetItem (1KB) | ~$0.00000025 |
| PutItem (1KB) | ~$0.00000125 |
| Query (1KB retornado) | ~$0.00000025 |
| Scan | **Evitar** — lê a tabela inteira |
| Armazenamento | $0.25/GB/mês |

**Dicas para reduzir custo:**
- Usar `Query` em vez de `Scan` sempre que possível
- Usar `ProjectionExpression` para retornar só os campos necessários
- Ativar TTL para remover dados antigos automaticamente
- Usar `BatchGetItem` para buscar múltiplos itens de uma vez

---

## Checklist de Modelagem

- [ ] Definir todos os padrões de acesso antes de criar a tabela
- [ ] Usar SK quando precisar de ordenação ou filtro por range
- [ ] Criar GSI para consultas por atributos não-chave
- [ ] Ativar TTL para dados temporários (sessões, logs, tokens diários)
- [ ] Nunca usar Scan em produção
- [ ] Logar consumo de Read/Write Capacity Units (RCUs/WCUs) no CloudWatch
- [ ] Usar `UpdateItem` com `ADD` para contadores (operação atômica)
