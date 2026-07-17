---
name: testes-lambda
description: >
  Skill completa para testar funções Lambda com Jest: testes unitários, mock de DynamoDB e OpenAI,
  testes de integração, cobertura de código e CI básico. Use sempre que o usuário mencionar testes,
  Jest, unit test, mock, stub, cobertura, coverage, TDD, teste de Lambda, teste de função,
  teste de API, ou quando pedir "como testar minha Lambda", "mockar DynamoDB", "mockar OpenAI",
  "criar testes automatizados", "CI para Lambda", "garantir qualidade do código".
---

# Testes Lambda — Jest

## Setup

```bash
npm install --save-dev jest @jest/globals

# package.json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageThreshold": {
      "global": { "lines": 80 }
    }
  }
}
```

---

## Mock de DynamoDB

```javascript
// __mocks__/@aws-sdk/client-dynamodb.js
const mockSend = jest.fn();

class DynamoDBClient {
  send(command) { return mockSend(command); }
}

class GetItemCommand { constructor(params) { this.params = params; } }
class PutItemCommand { constructor(params) { this.params = params; } }
class UpdateItemCommand { constructor(params) { this.params = params; } }
class QueryCommand { constructor(params) { this.params = params; } }

module.exports = { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, QueryCommand, mockSend };
```

---

## Mock de OpenAI

```javascript
// __mocks__/openai.js
const mockCreate = jest.fn();

class OpenAI {
  constructor() {
    this.chat = {
      completions: { create: mockCreate }
    };
  }
}

module.exports = OpenAI;
module.exports.mockCreate = mockCreate;
```

---

## Testes do Handler Principal

```javascript
// __tests__/handler.test.js
const { mockSend } = require("@aws-sdk/client-dynamodb");
const { mockCreate } = require("openai");
const { handler } = require("../index");

// Evento base reutilizável
const eventoBase = (body) => ({
  body: JSON.stringify(body),
  headers: {},
});

describe("Chat Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = "sk-test";
  });

  test("retorna 400 se userId ausente", async () => {
    const resp = await handler(eventoBase({ mensagem: "Olá" }));
    expect(resp.statusCode).toBe(400);
    expect(JSON.parse(resp.body).erro).toContain("userId");
  });

  test("retorna 400 se mensagem ausente", async () => {
    const resp = await handler(eventoBase({ userId: "u1" }));
    expect(resp.statusCode).toBe(400);
  });

  test("retorna 429 se limite diário atingido", async () => {
    const hoje = new Date().toISOString().split("T")[0];
    mockSend.mockResolvedValue({
      Item: {
        userId: { S: "u1" },
        [`tokens_${hoje}`]: { N: "5000" },
      },
    });

    const resp = await handler(eventoBase({ userId: "u1", mensagem: "Olá" }));
    expect(resp.statusCode).toBe(429);
  });

  test("retorna 200 com resposta da IA", async () => {
    const hoje = new Date().toISOString().split("T")[0];

    // DynamoDB: sem uso ainda
    mockSend
      .mockResolvedValueOnce({ Item: null }) // GetItem
      .mockResolvedValueOnce({});            // PutItem

    // OpenAI: resposta mockada
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "Olá! Como posso ajudar?" } }],
      usage: { total_tokens: 50 },
    });

    const resp = await handler(eventoBase({ userId: "u1", mensagem: "Olá" }));
    expect(resp.statusCode).toBe(200);

    const body = JSON.parse(resp.body);
    expect(body.resposta).toBe("Olá! Como posso ajudar?");
    expect(body.tokensUsados).toBe(50);
  });

  test("retorna 500 se OpenAI falhar", async () => {
    mockSend.mockResolvedValue({ Item: null });
    mockCreate.mockRejectedValue(new Error("OpenAI indisponível"));

    const resp = await handler(eventoBase({ userId: "u1", mensagem: "Olá" }));
    expect(resp.statusCode).toBe(500);
  });
});
```

---

## Testar Funções Auxiliares Isoladas

```javascript
// __tests__/tokens.test.js
const { getTokenUsage, updateTokenUsage } = require("../tokens");
const { mockSend } = require("@aws-sdk/client-dynamodb");

describe("Token Usage", () => {
  test("retorna 0 se usuário não existe", async () => {
    mockSend.mockResolvedValue({ Item: null });
    const uso = await getTokenUsage("u999", "2025-01-01");
    expect(uso).toBe(0);
  });

  test("retorna tokens do dia correto", async () => {
    mockSend.mockResolvedValue({
      Item: { userId: { S: "u1" }, "tokens_2025-01-01": { N: "1234" } },
    });
    const uso = await getTokenUsage("u1", "2025-01-01");
    expect(uso).toBe(1234);
  });
});
```

---

## Rodar e Ver Cobertura

```bash
# Rodar todos os testes
npm test

# Cobertura detalhada
npm run test:coverage

# Resultado esperado:
# ✅ handler.test.js (5 tests)
# ✅ tokens.test.js (2 tests)
# Coverage: 85% lines
```

---

## CI Básico (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: "18" }
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```
