---
name: error-tracking
description: >
  Skill completa para capturar, tratar e monitorar erros em Lambda: logs estruturados, integração
  com Sentry, alarmes CloudWatch, notificação por email/Slack e rastreamento de erros por usuário.
  Use sempre que o usuário mencionar erro em produção, Sentry, monitoramento de erros, log de erro,
  rastreamento de falha, alerta de erro, CloudWatch alarm, notificação de erro, debugging produção,
  ou quando pedir "saber quando a Lambda falha", "receber alerta de erro", "logar erros melhor",
  "integrar Sentry", "monitorar falhas", "capturar exceções".
---

# Error Tracking — Lambda

## Logs Estruturados (Base)

```javascript
// logger.js — usar em toda Lambda
const logger = {
  info: (evento, dados = {}) => console.log(JSON.stringify({
    nivel: "INFO", evento, ...dados, ts: new Date().toISOString()
  })),
  warn: (evento, dados = {}) => console.warn(JSON.stringify({
    nivel: "WARN", evento, ...dados, ts: new Date().toISOString()
  })),
  error: (evento, err, dados = {}) => console.error(JSON.stringify({
    nivel: "ERROR", evento,
    erro: err.message,
    stack: err.stack,
    ...dados,
    ts: new Date().toISOString()
  })),
};

module.exports = logger;
```

---

## Wrapper de Handler com Error Tracking

```javascript
const logger = require("./logger");

// Envolver qualquer handler com tratamento de erros completo
function comErrorTracking(handler) {
  return async (event) => {
    const inicio = Date.now();
    const requestId = event.requestContext?.requestId || "local";

    try {
      const resultado = await handler(event);

      logger.info("request_ok", {
        requestId,
        statusCode: resultado.statusCode,
        duracao: Date.now() - inicio,
      });

      return resultado;
    } catch (err) {
      const duracao = Date.now() - inicio;

      logger.error("request_erro", err, {
        requestId,
        duracao,
        path: event.rawPath,
        method: event.requestContext?.http?.method,
        userId: extrairUserId(event),
      });

      // Notificar SNS em erros críticos
      if (process.env.SNS_ALERTS_ARN) {
        await notificarSNS(err, event).catch(() => {}); // não deixar falhar por isso
      }

      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ erro: "Erro interno do servidor" }),
      };
    }
  };
}

// Uso
const meuHandler = async (event) => {
  // ... lógica normal
};

exports.handler = comErrorTracking(meuHandler);
```

---

## Integração com Sentry

```javascript
const Sentry = require("@sentry/aws-serverless");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.STAGE || "production",
  tracesSampleRate: 0.1, // 10% das transações
});

exports.handler = Sentry.wrapHandler(async (event) => {
  // Adicionar contexto do usuário
  const userId = extrairUserId(event);
  if (userId) Sentry.setUser({ id: userId });

  // ... lógica normal
});
```

```bash
npm install @sentry/aws-serverless
```

---

## Notificação de Erros via SNS → Email/Slack

```javascript
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const sns = new SNSClient({ region: "us-east-1" });

async function notificarSNS(err, event) {
  await sns.send(new PublishCommand({
    TopicArn: process.env.SNS_ALERTS_ARN,
    Subject: `🚨 Erro Lambda: ${process.env.AWS_LAMBDA_FUNCTION_NAME}`,
    Message: JSON.stringify({
      funcao: process.env.AWS_LAMBDA_FUNCTION_NAME,
      erro: err.message,
      path: event.rawPath,
      horario: new Date().toISOString(),
    }, null, 2),
  }));
}
```

```bash
# Criar tópico SNS e inscrever email
aws sns create-topic --name lambda-alertas
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:CONTA:lambda-alertas \
  --protocol email \
  --notification-endpoint seu@email.com
```

---

## CloudWatch — Query para Analisar Erros

```
# Todos os erros das últimas 24h
fields @timestamp, evento, erro, userId, path
| filter nivel = "ERROR"
| sort @timestamp desc
| limit 50

# Erros mais frequentes
fields erro
| filter nivel = "ERROR"
| stats count(*) as total by erro
| sort total desc

# Taxa de erro por hora
fields @timestamp
| filter nivel = "ERROR"
| stats count(*) as erros by bin(1h)
```

---

## Alarme CloudWatch — Erros Críticos

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "Lambda-Erros-5min" \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=NomeDaFuncao \
  --statistic Sum \
  --period 300 \
  --threshold 3 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:CONTA:lambda-alertas \
  --treat-missing-data notBreaching
```

---

## Variáveis de Ambiente

```
SENTRY_DSN=https://xxx@sentry.io/xxx
SNS_ALERTS_ARN=arn:aws:sns:us-east-1:CONTA:lambda-alertas
STAGE=production
```
