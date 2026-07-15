---
name: api-rest-nodejs
description: >
  Skill completa para construção de APIs REST com Node.js, incluindo validação, autenticação JWT,
  error handling, middlewares, rotas e boas práticas. Use sempre que o usuário mencionar API REST,
  Node.js, Express, autenticação, JWT, token de acesso, middleware, rota, endpoint, validação de
  dados, CORS, status HTTP, API segura, autorização, Bearer token, header Authorization, ou quando
  pedir para "proteger a API", "validar dados", "criar endpoint", "adicionar autenticação",
  "tratar erros da API". Também acionar para padrões de resposta JSON, versionamento de API
  e integração com Lambda/API Gateway.
---

# API REST — Node.js Boas Práticas

## Estrutura de Resposta Padrão

```javascript
// Sucesso
{ sucesso: true, dados: {...}, mensagem: "OK" }

// Erro
{ sucesso: false, erro: "Descrição do erro", codigo: "ERRO_ESPECIFICO" }

// Lista paginada
{ sucesso: true, dados: [...], total: 100, pagina: 1, limite: 20 }
```

---

## Status HTTP — Referência Rápida

| Código | Quando usar |
|--------|-------------|
| 200 | Sucesso geral |
| 201 | Recurso criado |
| 204 | Sucesso sem conteúdo (DELETE) |
| 400 | Dados inválidos enviados pelo cliente |
| 401 | Não autenticado (sem token) |
| 403 | Autenticado mas sem permissão |
| 404 | Recurso não encontrado |
| 429 | Muitas requisições (rate limit) |
| 500 | Erro interno do servidor |

---

## Autenticação JWT

```javascript
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Gerar token
function gerarToken(userId, papel = "user") {
  return jwt.sign(
    { userId, papel },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

// Middleware de autenticação
function autenticar(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token não fornecido" });
  }

  try {
    const token = auth.split(" ")[1];
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}

// Middleware de autorização por papel
function autorizar(...papeis) {
  return (req, res, next) => {
    if (!papeis.includes(req.usuario.papel)) {
      return res.status(403).json({ erro: "Sem permissão para esta ação" });
    }
    next();
  };
}
```

---

## Validação de Dados

```javascript
// Validação simples sem biblioteca
function validar(dados, campos) {
  const erros = [];
  for (const [campo, regras] of Object.entries(campos)) {
    const valor = dados[campo];
    if (regras.obrigatorio && !valor) {
      erros.push(`${campo} é obrigatório`);
    }
    if (valor && regras.minLength && valor.length < regras.minLength) {
      erros.push(`${campo} deve ter ao menos ${regras.minLength} caracteres`);
    }
    if (valor && regras.tipo === "email" && !valor.includes("@")) {
      erros.push(`${campo} deve ser um e-mail válido`);
    }
  }
  return erros;
}

// Uso
const erros = validar(body, {
  userId: { obrigatorio: true },
  mensagem: { obrigatorio: true, minLength: 1 },
  email: { tipo: "email" },
});

if (erros.length > 0) {
  return res.status(400).json({ erro: "Dados inválidos", detalhes: erros });
}
```

---

## Error Handler Global (Express)

```javascript
// Middleware de erro — deve ser o último app.use()
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    erro: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  }));

  const status = err.status || 500;
  res.status(status).json({
    sucesso: false,
    erro: status === 500 ? "Erro interno do servidor" : err.message,
  });
});

// Wrapper para async (evitar try/catch em toda rota)
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Uso
app.get("/usuarios/:id", asyncHandler(async (req, res) => {
  const usuario = await buscarUsuario(req.params.id);
  if (!usuario) throw Object.assign(new Error("Usuário não encontrado"), { status: 404 });
  res.json({ sucesso: true, dados: usuario });
}));
```

---

## Padrão Lambda + API Gateway

```javascript
// Handler adaptado para Lambda (sem Express)
exports.handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method;
  const path = event.path || event.rawPath;
  const body = JSON.parse(event.body || "{}");
  const headers = event.headers || {};

  // Roteamento manual
  if (method === "POST" && path === "/chat") {
    return await handleChat(body, headers);
  }
  if (method === "GET" && path === "/status") {
    return response(200, { status: "ok" });
  }

  return response(404, { erro: "Rota não encontrada" });
};

function response(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,x-api-key",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}
```

---

## Rate Limiting por IP/userId

```javascript
const contadores = new Map(); // Em produção, usar DynamoDB ou Redis

function rateLimiter(limite = 60, janelaMs = 60000) {
  return (req, res, next) => {
    const chave = req.ip || req.headers["x-forwarded-for"];
    const agora = Date.now();
    const entrada = contadores.get(chave) || { count: 0, inicio: agora };

    if (agora - entrada.inicio > janelaMs) {
      entrada.count = 0;
      entrada.inicio = agora;
    }

    entrada.count++;
    contadores.set(chave, entrada);

    res.setHeader("X-RateLimit-Limit", limite);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, limite - entrada.count));

    if (entrada.count > limite) {
      return res.status(429).json({ erro: "Muitas requisições. Tente em 1 minuto." });
    }
    next();
  };
}
```

---

## Checklist de API Segura

- [ ] Validar todos os campos de entrada
- [ ] Sanitizar dados antes de salvar (remover HTML, scripts)
- [ ] Autenticação em todas as rotas privadas
- [ ] HTTPS obrigatório em produção
- [ ] Rate limiting habilitado
- [ ] Não expor stack traces em produção
- [ ] Logar erros com contexto (userId, path, method)
- [ ] `JWT_SECRET` em variável de ambiente, nunca hardcoded
- [ ] Tokens com expiração definida
- [ ] CORS configurado para domínios específicos em produção
