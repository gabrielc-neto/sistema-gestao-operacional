---
name: whatsapp-twilio
description: >
  Skill completa para integrar Lambda com WhatsApp via Twilio ou Z-API: webhook, receber e enviar
  mensagens, fluxo de conversa, validação de assinatura. Use sempre que o usuário mencionar
  WhatsApp, Twilio, Z-API, webhook WhatsApp, bot WhatsApp, chatbot WhatsApp, enviar mensagem
  WhatsApp, receber mensagem, integração WhatsApp, número WhatsApp Business, ou quando pedir
  "conectar bot ao WhatsApp", "responder WhatsApp automaticamente", "Lambda receber WhatsApp".
---

# WhatsApp — Integração Lambda

## Opções de Integração

| Provedor | Custo | Facilidade | Ideal para |
|----------|-------|------------|------------|
| **Twilio** | Pago por mensagem | Alta | Produção, confiável |
| **Z-API** | Assinatura mensal | Alta | Brasil, mais barato |
| **Meta Cloud API** | Gratuito (até limite) | Média | Oficial, escalável |

---

## Twilio — Webhook Lambda

```javascript
const twilio = require("twilio");

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER; // whatsapp:+14155238886

exports.handler = async (event) => {
  try {
    // Validar assinatura Twilio
    const assinaturaValida = validarAssinatura(event);
    if (!assinaturaValida) {
      return resp(403, "Assinatura inválida");
    }

    // Parsear body (Twilio envia form-urlencoded)
    const params = new URLSearchParams(event.body);
    const de = params.get("From");       // whatsapp:+5541999999999
    const mensagem = params.get("Body");
    const userId = de.replace("whatsapp:", "");

    console.log(JSON.stringify({ evento: "whatsapp_recebido", userId, mensagem }));

    // Processar mensagem (chamar OpenAI, etc.)
    const resposta = await processarMensagem(userId, mensagem);

    // Responder via TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message to="${de}">${resposta}</Message>
</Response>`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/xml" },
      body: twiml,
    };

  } catch (err) {
    console.error("Erro WhatsApp:", err);
    return resp(500, "Erro interno");
  }
};

function validarAssinatura(event) {
  const assinatura = event.headers?.["x-twilio-signature"];
  const url = `https://${event.headers.host}${event.rawPath}`;
  const params = Object.fromEntries(new URLSearchParams(event.body));
  return twilio.validateRequest(AUTH_TOKEN, assinatura, url, params);
}

function resp(statusCode, mensagem) {
  return { statusCode, body: mensagem };
}
```

---

## Z-API — Webhook Lambda

```javascript
exports.handler = async (event) => {
  const body = JSON.parse(event.body || "{}");

  // Z-API envia objeto com estrutura específica
  const { phone, text, isGroupMsg } = body;

  if (isGroupMsg) return { statusCode: 200, body: "Ignorado (grupo)" };
  if (!text?.message) return { statusCode: 200, body: "Sem texto" };

  const userId = phone; // número do remetente
  const mensagem = text.message;

  const resposta = await processarMensagem(userId, mensagem);

  // Enviar resposta via Z-API
  await enviarMensagemZAPI(phone, resposta);

  return { statusCode: 200, body: "OK" };
};

async function enviarMensagemZAPI(phone, mensagem) {
  const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
  const TOKEN = process.env.ZAPI_TOKEN;

  await fetch(`https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message: mensagem }),
  });
}
```

---

## Enviar Mensagem Proativa (Twilio)

```javascript
async function enviarWhatsApp(para, mensagem) {
  const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

  await client.messages.create({
    from: TWILIO_NUMBER,
    to: `whatsapp:${para}`,
    body: mensagem,
  });
}

// Uso: notificação, alerta, confirmação
await enviarWhatsApp("+5541999999999", "Seu pedido foi confirmado! ✅");
```

---

## Variáveis de Ambiente

```
# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Z-API
ZAPI_INSTANCE_ID=xxx
ZAPI_TOKEN=xxx
```

---

## Boas Práticas

- Sempre validar assinatura do Twilio (evitar spam)
- Ignorar mensagens de grupos (`isGroupMsg`)
- Responder em até 5s (Twilio tem timeout curto) — use SQS para processamento assíncrono se demorar
- Sanitizar mensagem antes de enviar para OpenAI (remover emojis problemáticos se necessário)
- Logar `userId` + `mensagem` para auditoria
