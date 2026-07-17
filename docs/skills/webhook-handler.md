---
name: webhook-handler
description: >
  Skill completa para receber e validar webhooks de qualquer serviço na Lambda: Stripe, GitHub,
  WhatsApp, Hotmart, PagSeguro, Mercado Pago, etc. Inclui validação de assinatura, retry,
  idempotência e fila SQS. Use sempre que o usuário mencionar webhook, evento externo, callback,
  notificação de pagamento, integração com Stripe, GitHub Actions, Hotmart, PagSeguro,
  Mercado Pago, ou quando pedir "receber eventos", "processar pagamento", "notificação de compra",
  "Lambda receber webhook", "validar assinatura webhook".
---

# Webhook Handler — Lambda

## Estrutura Universal de Webhook

```javascript
exports.handler = async (event) => {
  const source = detectarFonte(event);
  const body = event.body;
  const headers = event.headers || {};

  // 1. Validar assinatura
  const valido = await validarAssinatura(source, body, headers);
  if (!valido) {
    console.warn(JSON.stringify({ evento: "webhook_invalido", source, headers }));
    return resp(403, { erro: "Assinatura inválida" });
  }

  // 2. Parsear payload
  const payload = JSON.parse(body);

  // 3. Idempotência — evitar processar duas vezes
  const eventId = extrairEventId(source, payload);
  if (eventId && await jaProcessado(eventId)) {
    return resp(200, { mensagem: "Já processado" });
  }

  // 4. Processar evento
  await processarEvento(source, payload);

  // 5. Marcar como processado
  if (eventId) await marcarProcessado(eventId);

  return resp(200, { mensagem: "OK" });
};
```

---

## Validação por Fonte

```javascript
const crypto = require("crypto");

async function validarAssinatura(source, body, headers) {
  switch (source) {
    case "stripe":
      return validarStripe(body, headers["stripe-signature"]);
    case "github":
      return validarGitHub(body, headers["x-hub-signature-256"]);
    case "mercadopago":
      return true; // MP usa token na URL
    case "hotmart":
      return validarHotmart(body, headers["x-hotmart-hottok"]);
    default:
      return true;
  }
}

// Stripe
function validarStripe(body, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const hmac = crypto.createHmac("sha256", secret);
  const [, timestamp] = signature.split(",t=");
  const payload = `${timestamp}.${body}`;
  const expected = hmac.update(payload).digest("hex");
  return signature.includes(expected);
}

// GitHub
function validarGitHub(body, signature) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const hmac = crypto.createHmac("sha256", secret);
  const expected = "sha256=" + hmac.update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// Hotmart
function validarHotmart(body, hottok) {
  return hottok === process.env.HOTMART_TOKEN;
}
```

---

## Idempotência com DynamoDB

```javascript
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const dynamo = new DynamoDBClient({ region: "us-east-1" });

async function jaProcessado(eventId) {
  try {
    const { Item } = await dynamo.send(new GetItemCommand({
      TableName: "WebhookEvents",
      Key: { eventId: { S: eventId } },
    }));
    return !!Item;
  } catch { return false; }
}

async function marcarProcessado(eventId) {
  const expiracao = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 dias
  await dynamo.send(new PutItemCommand({
    TableName: "WebhookEvents",
    Item: {
      eventId: { S: eventId },
      processadoEm: { S: new Date().toISOString() },
      expiracao: { N: String(expiracao) },
    },
  }));
}
```

---

## Processamento por Tipo de Evento

```javascript
async function processarEvento(source, payload) {
  if (source === "stripe") {
    switch (payload.type) {
      case "payment_intent.succeeded":
        await ativarPlano(payload.data.object.metadata.userId);
        break;
      case "customer.subscription.deleted":
        await cancelarPlano(payload.data.object.metadata.userId);
        break;
    }
  }

  if (source === "hotmart") {
    switch (payload.event) {
      case "PURCHASE_APPROVED":
        await liberarAcesso(payload.data.buyer.email);
        break;
      case "PURCHASE_REFUNDED":
        await revogarAcesso(payload.data.buyer.email);
        break;
    }
  }
}
```

---

## Tabela DynamoDB — WebhookEvents

```bash
aws dynamodb create-table \
  --table-name WebhookEvents \
  --attribute-definitions AttributeName=eventId,AttributeType=S \
  --key-schema AttributeName=eventId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
# Ativar TTL no campo "expiracao"
```

---

## Variáveis de Ambiente

```
STRIPE_WEBHOOK_SECRET=whsec_xxx
GITHUB_WEBHOOK_SECRET=xxx
HOTMART_TOKEN=xxx
```
