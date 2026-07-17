---
name: cloud-aws
description: >
  Skill completa para desenvolvimento, configuração e deploy de soluções AWS com foco no padrão
  Lambda + OpenAI + DynamoDB. Use esta skill sempre que o usuário mencionar AWS, Lambda, DynamoDB,
  API Gateway, IAM, OpenAI na nuvem, controle de tokens, deploy serverless, arquitetura cloud,
  função Lambda, tabela DynamoDB, variáveis de ambiente AWS, permissões IAM, ou qualquer
  combinação desses termos. Também acionar para dúvidas sobre Node.js em Lambda, integração
  OpenAI SDK com AWS, limite de tokens, custo por uso, cold start, layers Lambda, ou quando o
  usuário pedir para "evoluir o código", "melhorar a Lambda", "adicionar funcionalidade no backend"
  ou "ajustar o DynamoDB". Se houver qualquer menção a infraestrutura cloud, backend serverless
  ou integração de IA com AWS, esta skill deve ser usada.
---

# Cloud AWS — Padrão Lambda + OpenAI + DynamoDB

## Visão Geral do Padrão

O padrão base desta skill é:

```
API Gateway (HTTP POST)
    └── Lambda (Node.js 18+)
            ├── OpenAI SDK (gpt-4o-mini ou modelo configurado)
            ├── DynamoDB (controle de tokens e estado)
            └── Resposta JSON ao cliente
```

### Parâmetros padrão
| Item | Valor |
|------|-------|
| Runtime | Node.js 18.x |
| Tabela DynamoDB | `TokenUsage` |
| PK DynamoDB | `userId` (String) |
| Limite diário tokens | 5000 |
| Variável env | `OPENAI_API_KEY` |
| Permissão IAM | `AmazonDynamoDBFullAccess` |
| Endpoint | HTTP POST `{ userId, mensagem }` |

---

## Estrutura do Código Base (index.js)

```javascript
const { OpenAI } = require("openai");
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });

const TABLE_NAME = "TokenUsage";
const DAILY_LIMIT = 5000;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { userId, mensagem } = body;

    if (!userId || !mensagem) {
      return response(400, { erro: "userId e mensagem são obrigatórios" });
    }

    // Verificar uso de tokens do dia
    const hoje = new Date().toISOString().split("T")[0];
    const uso = await getTokenUsage(userId, hoje);

    if (uso >= DAILY_LIMIT) {
      return response(429, { erro: "Limite diário de tokens atingido", limite: DAILY_LIMIT, usado: uso });
    }

    // Chamada OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: mensagem }],
      max_tokens: Math.min(1000, DAILY_LIMIT - uso),
    });

    const tokensUsados = completion.usage.total_tokens;
    const resposta = completion.choices[0].message.content;

    // Atualizar uso no DynamoDB
    await updateTokenUsage(userId, hoje, uso + tokensUsados);

    return response(200, {
      resposta,
      tokensUsados,
      totalDia: uso + tokensUsados,
      limiteRestante: DAILY_LIMIT - (uso + tokensUsados),
    });

  } catch (err) {
    console.error("Erro:", err);
    return response(500, { erro: "Erro interno", detalhe: err.message });
  }
};

async function getTokenUsage(userId, data) {
  try {
    const { Item } = await dynamo.send(new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { userId: { S: userId } },
    }));
    if (!Item) return 0;
    const diaAtual = Item[`tokens_${data}`];
    return diaAtual ? parseInt(diaAtual.N) : 0;
  } catch {
    return 0;
  }
}

async function updateTokenUsage(userId, data, total) {
  await dynamo.send(new PutItemCommand({
    TableName: TABLE_NAME,
    Item: {
      userId: { S: userId },
      [`tokens_${data}`]: { N: String(total) },
      updatedAt: { S: new Date().toISOString() },
    },
  }));
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}
```

---

## Evoluções Comuns

### 1. Adicionar histórico de conversa (multi-turn)
```javascript
// Buscar histórico do DynamoDB
const historico = await getHistorico(userId);

const messages = [
  { role: "system", content: "Você é um assistente útil." },
  ...historico,
  { role: "user", content: mensagem }
];

// Salvar mensagem + resposta
await salvarHistorico(userId, mensagem, resposta);
```

### 2. Adicionar system prompt configurável
```javascript
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || "Você é um assistente útil.";

const completion = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: mensagem }
  ],
});
```

### 3. Trocar modelo dinamicamente
```javascript
const modelo = body.modelo || process.env.OPENAI_MODEL || "gpt-4o-mini";
```

### 4. Adicionar autenticação por API Key
```javascript
const apiKey = event.headers?.["x-api-key"];
if (apiKey !== process.env.APP_API_KEY) {
  return response(401, { erro: "Não autorizado" });
}
```

### 5. Rate limiting por minuto (além do diário)
```javascript
const agora = new Date();
const minuto = `${agora.toISOString().split("T")[0]}_${agora.getHours()}h${agora.getMinutes()}m`;
const usoPorMinuto = await getTokenUsage(userId, minuto);
const LIMITE_MINUTO = 500;

if (usoPorMinuto >= LIMITE_MINUTO) {
  return response(429, { erro: "Muitas requisições. Aguarde 1 minuto." });
}
```

---

## Configuração de Infraestrutura

### DynamoDB — Criar tabela
```bash
aws dynamodb create-table \
  --table-name TokenUsage \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Lambda — Variáveis de ambiente necessárias
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini       (opcional)
SYSTEM_PROMPT=...              (opcional)
AWS_REGION=us-east-1           (opcional, padrão)
APP_API_KEY=...                (opcional, para autenticação)
```

### IAM — Política mínima recomendada
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/TokenUsage"
    }
  ]
}
```
> Preferir esta política em vez de `AmazonDynamoDBFullAccess` em produção.

### package.json base
```json
{
  "name": "lambda-openai",
  "version": "1.0.0",
  "dependencies": {
    "openai": "^4.0.0",
    "@aws-sdk/client-dynamodb": "^3.0.0"
  }
}
```

### Deploy via ZIP
```bash
npm install
zip -r function.zip index.js node_modules package.json
aws lambda update-function-code \
  --function-name NomeDaFuncao \
  --zip-file fileb://function.zip
```

---

## Troubleshooting Comum

| Erro | Causa | Solução |
|------|-------|---------|
| `Cannot find module 'openai'` | node_modules não incluído no ZIP | Rodar `npm install` antes de zipar |
| `AccessDeniedException` DynamoDB | IAM sem permissão | Adicionar política DynamoDB à role Lambda |
| `Invalid API Key` OpenAI | Variável env ausente ou errada | Verificar `OPENAI_API_KEY` no Lambda |
| Timeout | Lambda com timeout baixo | Aumentar para 30s+ nas configurações |
| Cold start lento | Lambda sem Provisioned Concurrency | Habilitar se latência crítica |
| CORS error | Header ausente | Confirmar `Access-Control-Allow-Origin: *` |

---

## Boas Práticas

1. **Nunca hardcode** `OPENAI_API_KEY` — sempre via variável de ambiente ou AWS Secrets Manager
2. **Logs**: Use `console.log(JSON.stringify({ userId, tokens, modelo }))` para facilitar análise no CloudWatch
3. **Timeout Lambda**: Mínimo 15s para chamadas OpenAI, ideal 30s
4. **Memória Lambda**: 256MB é suficiente para este padrão
5. **TTL no DynamoDB**: Adicionar campo `expiracao` com TTL de 30 dias para controlar custos
6. **Tratar erros OpenAI**: Verificar `err.status === 429` (rate limit) e `err.status === 503` (serviço indisponível)

---

## Checklist de Deploy

- [ ] `OPENAI_API_KEY` configurada no Lambda
- [ ] Tabela `TokenUsage` criada no DynamoDB
- [ ] Role Lambda com permissão DynamoDB
- [ ] Timeout Lambda ≥ 15s
- [ ] API Gateway configurado com POST
- [ ] CORS habilitado no API Gateway
- [ ] Teste com `{ "userId": "test", "mensagem": "Olá" }`
