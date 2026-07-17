---
name: chatbot-builder
description: >
  Skill completa para construção de chatbots com IA: fluxo de conversa, histórico, contexto,
  personalidade, intenções, fallback e integração com OpenAI/Lambda/DynamoDB. Use sempre que
  o usuário mencionar chatbot, bot de atendimento, assistente virtual, fluxo de conversa,
  histórico de mensagens, contexto da conversa, intenção do usuário, NLP, resposta automática,
  bot para WhatsApp, bot para site, agente de IA, ou quando pedir para "criar um bot",
  "adicionar memória ao bot", "bot que lembra o contexto", "treinar o assistente",
  "personalizar o chatbot", "bot com histórico", "fluxo de atendimento automatizado".
---

# Chatbot Builder — Fluxo Completo com IA

## Arquitetura Padrão

```
Cliente (WhatsApp/Web/App)
    └── API Gateway (POST /chat)
            └── Lambda
                    ├── DynamoDB (histórico + perfil do usuário)
                    ├── OpenAI (gpt-4o-mini)
                    └── Resposta ao cliente
```

---

## Código Completo — Lambda Chatbot com Histórico

```javascript
const { OpenAI } = require("openai");
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const dynamo = new DynamoDBClient({ region: "us-east-1" });

const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || `
Você é um assistente virtual prestativo e amigável.
Responda sempre em português, de forma clara e objetiva.
Se não souber algo, diga honestamente.
`.trim();

const MAX_HISTORICO = 10;     // últimas N mensagens
const MAX_TOKENS_RESPOSTA = 500;
const LIMITE_DIARIO = parseInt(process.env.LIMITE_DIARIO || "5000");

exports.handler = async (event) => {
  try {
    const { userId, mensagem, sessaoId } = JSON.parse(event.body || "{}");

    if (!userId || !mensagem) {
      return resp(400, { erro: "userId e mensagem são obrigatórios" });
    }

    // Carregar perfil + histórico
    const perfil = await carregarPerfil(userId);

    // Verificar limite diário
    const hoje = new Date().toISOString().split("T")[0];
    if ((perfil.tokens[hoje] || 0) >= LIMITE_DIARIO) {
      return resp(429, { erro: "Limite diário atingido", resetEm: "meia-noite" });
    }

    // Montar mensagens para OpenAI
    const messages = [
      { role: "system", content: montarSystemPrompt(perfil) },
      ...perfil.historico.slice(-MAX_HISTORICO),
      { role: "user", content: mensagem },
    ];

    // Chamar OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: MAX_TOKENS_RESPOSTA,
      temperature: 0.7,
    });

    const resposta = completion.choices[0].message.content;
    const tokensUsados = completion.usage.total_tokens;

    // Atualizar histórico e tokens
    perfil.historico.push(
      { role: "user", content: mensagem },
      { role: "assistant", content: resposta }
    );
    perfil.tokens[hoje] = (perfil.tokens[hoje] || 0) + tokensUsados;
    perfil.ultimaInteracao = new Date().toISOString();

    await salvarPerfil(userId, perfil);

    return resp(200, {
      resposta,
      tokensUsados,
      totalDia: perfil.tokens[hoje],
    });

  } catch (err) {
    console.error("Erro chatbot:", err);
    return resp(500, { erro: "Erro interno" });
  }
};

// Personalizar system prompt com dados do usuário
function montarSystemPrompt(perfil) {
  let prompt = SYSTEM_PROMPT;
  if (perfil.nome) prompt += `\nVocê está falando com ${perfil.nome}.`;
  if (perfil.contexto) prompt += `\nContexto: ${perfil.contexto}`;
  return prompt;
}

async function carregarPerfil(userId) {
  try {
    const { Item } = await dynamo.send(new GetItemCommand({
      TableName: "ChatbotPerfis",
      Key: { userId: { S: userId } },
    }));
    return Item ? unmarshall(Item) : { userId, historico: [], tokens: {}, nome: null, contexto: null };
  } catch {
    return { userId, historico: [], tokens: {}, nome: null, contexto: null };
  }
}

async function salvarPerfil(userId, perfil) {
  // Limitar histórico salvo (evitar item crescer indefinidamente)
  perfil.historico = perfil.historico.slice(-20);

  await dynamo.send(new PutItemCommand({
    TableName: "ChatbotPerfis",
    Item: marshall(perfil),
  }));
}

function resp(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}
```

---

## Tabela DynamoDB — ChatbotPerfis

```bash
aws dynamodb create-table \
  --table-name ChatbotPerfis \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Estrutura do item salvo
```json
{
  "userId": "u123",
  "nome": "João",
  "contexto": "cliente premium",
  "historico": [
    { "role": "user", "content": "Olá" },
    { "role": "assistant", "content": "Olá! Como posso ajudar?" }
  ],
  "tokens": {
    "2025-01-15": 1200,
    "2025-01-16": 800
  },
  "ultimaInteracao": "2025-01-16T10:30:00.000Z"
}
```

---

## Funcionalidades para Evoluir

### 1. Detectar intenção do usuário
```javascript
const intencoes = {
  saudacao: ["oi", "olá", "bom dia", "boa tarde", "boa noite"],
  despedida: ["tchau", "até", "obrigado", "valeu"],
  ajuda: ["ajuda", "como", "o que", "qual", "quando"],
};

function detectarIntencao(mensagem) {
  const lower = mensagem.toLowerCase();
  for (const [intencao, palavras] of Object.entries(intencoes)) {
    if (palavras.some(p => lower.includes(p))) return intencao;
  }
  return "geral";
}
```

### 2. Salvar nome do usuário automaticamente
```javascript
// No system prompt, pedir ao modelo para extrair o nome
const SYSTEM_PROMPT = `
...
Se o usuário disser seu nome, responda com: NOME:[nome detectado]
no início da mensagem, seguido da resposta normal.
`;

// Processar resposta
if (resposta.startsWith("NOME:")) {
  const [nomeParte, ...restoParts] = resposta.split("\n");
  perfil.nome = nomeParte.replace("NOME:", "").trim();
  resposta = restoParts.join("\n").trim();
}
```

### 3. Resetar conversa
```javascript
// Endpoint POST /chat/reset
perfil.historico = [];
await salvarPerfil(userId, perfil);
return resp(200, { mensagem: "Conversa reiniciada" });
```

### 4. Handoff para humano
```javascript
const GATILHOS_HUMANO = ["falar com atendente", "humano", "pessoa real", "gerente"];
const precisaHumano = GATILHOS_HUMANO.some(g => mensagem.toLowerCase().includes(g));

if (precisaHumano) {
  // Notificar equipe (SNS, email, Slack...)
  return resp(200, {
    resposta: "Vou transferir para um atendente. Aguarde um momento!",
    transferir: true,
  });
}
```

---

## Variáveis de Ambiente

```
OPENAI_API_KEY=sk-...
SYSTEM_PROMPT=Você é um assistente de [empresa]...
LIMITE_DIARIO=5000
OPENAI_MODEL=gpt-4o-mini
```

---

## Checklist do Chatbot

- [ ] System prompt define claramente o papel e restrições do bot
- [ ] Histórico limitado para controlar tokens
- [ ] TTL nos perfis para limpar dados antigos
- [ ] Fallback definido para perguntas fora do escopo
- [ ] Gatilho de handoff para atendente humano
- [ ] Logs de tokens por usuário no CloudWatch
- [ ] Teste com conversas longas (10+ turnos)
- [ ] Teste com inputs inesperados (emojis, textos longos, vazio)
