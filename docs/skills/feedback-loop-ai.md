---
name: feedback-loop-ai
description: >
  Skill completa para capturar erros e feedback negativo em produção e transformar em
  aprendizado: salva input do usuário, resposta do modelo e erro no S3 e DynamoDB.
  Use sempre que o usuário mencionar feedback loop, capturar erros, aprender com erros,
  feedback negativo, log de erros da IA, melhorar modelo com produção, thumbs down,
  avaliação da resposta, ou quando pedir "salvar quando a IA errar", "capturar feedback
  do usuário", "registrar resposta ruim", "loop de aprendizado", "melhorar com dados reais".
---

# Feedback Loop AI — Captura e Aprendizado

## Fluxo Completo

```
Usuário recebe resposta
    ├── 👍 Positivo → registrar como exemplo bom
    └── 👎 Negativo → registrar como erro + contexto completo
            └── S3: raw/feedback/YYYY-MM-DD/uuid.json
            └── DynamoDB: índice para busca e análise
```

---

## handler.js — Endpoint de Feedback

```javascript
const { saveFeedback } = require("./saveFeedback");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const {
      userId,
      sessionId,
      mensagemUsuario,   // input original
      respostaModelo,    // o que o modelo respondeu
      feedback,          // "positivo" | "negativo"
      motivoErro,        // opcional: "resposta incorreta" | "fora do contexto" | "tom inadequado"
      correcaoSugerida,  // opcional: o que deveria ter respondido
      modelo,            // gpt-4o-mini, etc.
      tokensUsados,
    } = body;

    if (!userId || !mensagemUsuario || !respostaModelo || !feedback) {
      return resp(400, { erro: "Campos obrigatórios: userId, mensagemUsuario, respostaModelo, feedback" });
    }

    const registro = {
      id: require("crypto").randomUUID(),
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
      data: new Date().toISOString().split("T")[0],
      input: mensagemUsuario,
      output: respostaModelo,
      feedback,           // positivo ou negativo
      motivoErro: motivoErro || null,
      correcaoSugerida: correcaoSugerida || null,
      modelo: modelo || "gpt-4o-mini",
      tokensUsados: tokensUsados || 0,
      ambiente: process.env.STAGE || "production",
    };

    await saveFeedback(registro);

    console.log(JSON.stringify({
      evento: "feedback_capturado",
      id: registro.id,
      userId,
      feedback,
      motivoErro,
    }));

    return resp(200, { mensagem: "Feedback registrado", id: registro.id });

  } catch (err) {
    console.error("Erro ao salvar feedback:", err);
    return resp(500, { erro: "Erro interno" });
  }
};

function resp(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}
```

---

## saveFeedback.js — Salvar no S3 + DynamoDB

```javascript
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");

const s3 = new S3Client({ region: "us-east-1" });
const dynamo = new DynamoDBClient({ region: "us-east-1" });

const BUCKET = process.env.FEEDBACK_BUCKET;
const TABLE = "FeedbackLoop";

async function saveFeedback(registro) {
  // 1. Salvar raw no S3 (para dataset builder processar depois)
  const s3Key = `raw/feedback/${registro.data}/${registro.id}.json`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: JSON.stringify(registro, null, 2),
    ContentType: "application/json",
    Metadata: {
      userId: registro.userId,
      feedback: registro.feedback,
      data: registro.data,
    },
  }));

  // 2. Salvar metadados no DynamoDB (para consulta rápida)
  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall({
      id: registro.id,
      userId: registro.userId,
      data: registro.data,
      feedback: registro.feedback,
      motivoErro: registro.motivoErro,
      modelo: registro.modelo,
      s3Key,                         // referência para o arquivo completo no S3
      timestamp: registro.timestamp,
      processado: false,             // será true após dataset-builder processar
      expiracao: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // TTL 90 dias
    }),
  }));
}

module.exports = { saveFeedback };
```

---

## schema.json — Estrutura do Feedback

```json
{
  "id": "uuid-v4",
  "userId": "string",
  "sessionId": "string | null",
  "timestamp": "ISO-8601",
  "data": "YYYY-MM-DD",
  "input": "mensagem original do usuário",
  "output": "resposta que o modelo deu",
  "feedback": "positivo | negativo",
  "motivoErro": "resposta_incorreta | fora_contexto | tom_inadequado | incompleto | outro | null",
  "correcaoSugerida": "como deveria ter respondido | null",
  "modelo": "gpt-4o-mini",
  "tokensUsados": 150,
  "ambiente": "production | staging",
  "processado": false
}
```

---

## Tabela DynamoDB + GSI

```bash
aws dynamodb create-table \
  --table-name FeedbackLoop \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=feedback,AttributeType=S \
    AttributeName=data,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "feedback-data-index",
      "KeySchema": [
        {"AttributeName":"feedback","KeyType":"HASH"},
        {"AttributeName":"data","KeyType":"RANGE"}
      ],
      "Projection": {"ProjectionType":"ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST
# Ativar TTL no campo "expiracao"
```

---

## Integrar no chatbot-builder

```javascript
// Após enviar resposta ao usuário, adicionar botões de feedback
return resp(200, {
  resposta,
  feedbackUrl: `${process.env.API_URL}/feedback`,
  feedbackId: sessionId,  // para o frontend associar ao feedback
});

// Frontend envia ao clicar 👎:
// POST /feedback { userId, mensagemUsuario, respostaModelo, feedback: "negativo" }
```

---

## Variáveis de Ambiente

```
FEEDBACK_BUCKET=meu-bucket-feedback
STAGE=production
```
