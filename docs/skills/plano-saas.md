---
name: plano-saas
description: >
  Skill completa para estruturar planos Free/Pro/Enterprise em SaaS: controle de limites por plano,
  upgrade/downgrade, integração com Stripe, controle de uso no DynamoDB e regras de acesso por
  feature. Use sempre que o usuário mencionar plano, free, pro, premium, enterprise, assinatura,
  limite de uso, cota, upgrade de plano, feature flag, cobrança, Stripe, pagamento recorrente,
  ou quando pedir "criar planos para meu produto", "limitar uso por plano", "liberar feature pro",
  "controlar tokens por plano", "usuário atingiu limite", "bloquear por plano".
---

# Plano SaaS — Controle de Limites e Features

## Estrutura de Planos

```javascript
// planos.js
const PLANOS = {
  free: {
    nome: "Free",
    preco: 0,
    limites: {
      tokensDiarios: 1000,
      mensagensDiarias: 20,
      arquivosUpload: 0,
      historicoMensagens: 5,
    },
    features: {
      chatIA: true,
      uploadArquivos: false,
      apiAccess: false,
      suportePrioritario: false,
      multiplosBots: false,
    },
  },
  pro: {
    nome: "Pro",
    preco: 29.90,
    limites: {
      tokensDiarios: 10000,
      mensagensDiarias: 200,
      arquivosUpload: 50,
      historicoMensagens: 50,
    },
    features: {
      chatIA: true,
      uploadArquivos: true,
      apiAccess: true,
      suportePrioritario: false,
      multiplosBots: false,
    },
  },
  enterprise: {
    nome: "Enterprise",
    preco: 199.90,
    limites: {
      tokensDiarios: 100000,
      mensagensDiarias: -1, // ilimitado
      arquivosUpload: -1,
      historicoMensagens: -1,
    },
    features: {
      chatIA: true,
      uploadArquivos: true,
      apiAccess: true,
      suportePrioritario: true,
      multiplosBots: true,
    },
  },
};

module.exports = PLANOS;
```

---

## Verificar Limite e Feature

```javascript
const PLANOS = require("./planos");

// Verificar se usuário pode usar uma feature
function podeUsarFeature(plano, feature) {
  return PLANOS[plano]?.features[feature] === true;
}

// Verificar se atingiu limite
function atingiuLimite(plano, tipo, usoAtual) {
  const limite = PLANOS[plano]?.limites[tipo];
  if (limite === undefined) return true; // plano inválido
  if (limite === -1) return false;       // ilimitado
  return usoAtual >= limite;
}

// Middleware de verificação no handler
async function verificarPlano(userId, feature, tipoLimite, usoAtual) {
  const usuario = await buscarUsuario(userId);
  const plano = usuario?.plano || "free";

  if (!podeUsarFeature(plano, feature)) {
    return {
      permitido: false,
      motivo: "feature_nao_disponivel",
      mensagem: `Esta feature requer o plano Pro ou superior`,
      planoAtual: plano,
    };
  }

  if (tipoLimite && atingiuLimite(plano, tipoLimite, usoAtual)) {
    const limite = PLANOS[plano].limites[tipoLimite];
    return {
      permitido: false,
      motivo: "limite_atingido",
      mensagem: `Limite de ${tipoLimite} atingido (${limite}/dia). Faça upgrade para continuar.`,
      planoAtual: plano,
      limite,
    };
  }

  return { permitido: true, plano };
}
```

---

## Uso no Handler

```javascript
exports.handler = async (event) => {
  const { userId, mensagem } = JSON.parse(event.body || "{}");

  // Verificar uso atual
  const hoje = new Date().toISOString().split("T")[0];
  const usoAtual = await getTokenUsage(userId, hoje);

  // Verificar plano
  const verificacao = await verificarPlano(userId, "chatIA", "tokensDiarios", usoAtual);

  if (!verificacao.permitido) {
    return resp(403, {
      erro: verificacao.mensagem,
      motivo: verificacao.motivo,
      planoAtual: verificacao.planoAtual,
      upgradeUrl: "https://seusite.com/planos",
    });
  }

  // ... continuar com a lógica normal
};
```

---

## Upgrade de Plano via Webhook Stripe

```javascript
// Ao receber payment_intent.succeeded do Stripe
async function ativarPlano(userId, plano) {
  await dynamo.send(new UpdateItemCommand({
    TableName: "Usuarios",
    Key: { userId: { S: userId } },
    UpdateExpression: "SET plano = :plano, planoAtualizadoEm = :data",
    ExpressionAttributeValues: {
      ":plano": { S: plano },
      ":data": { S: new Date().toISOString() },
    },
  }));
  console.log(JSON.stringify({ evento: "plano_ativado", userId, plano }));
}

// Ao cancelar assinatura
async function rebaixarParaFree(userId) {
  await ativarPlano(userId, "free");
}
```

---

## Estrutura DynamoDB — Campo plano no Usuário

```json
{
  "userId": "u123",
  "email": "joao@email.com",
  "plano": "pro",
  "planoAtualizadoEm": "2025-01-15T10:00:00Z",
  "stripeCustomerId": "cus_xxx",
  "stripeSubscriptionId": "sub_xxx"
}
```

---

## Resposta Padrão para Limite Atingido

```json
{
  "erro": "Limite de tokensDiarios atingido (1000/dia). Faça upgrade para continuar.",
  "motivo": "limite_atingido",
  "planoAtual": "free",
  "upgradeUrl": "https://seusite.com/planos"
}
```
