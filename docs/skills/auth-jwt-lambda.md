---
name: auth-jwt-lambda
description: >
  Skill completa de autenticação JWT em Lambda: login, registro, refresh token, proteção de rotas,
  hash de senha e armazenamento no DynamoDB. Use sempre que o usuário mencionar autenticação,
  login, registro, JWT, token de acesso, refresh token, senha, hash, bcrypt, proteção de rota,
  autorização, Bearer token, middleware de auth, sessão de usuário, ou quando pedir "criar sistema
  de login", "proteger endpoint", "verificar token", "usuário autenticado", "cadastro de usuário",
  "trocar senha", "token expirado". Também acionar para fluxos de onboarding com autenticação.
---

# Auth JWT — Lambda + DynamoDB

## Fluxo Completo

```
POST /auth/registro  → criar usuário → retornar JWT
POST /auth/login     → validar senha → retornar JWT + refresh token
POST /auth/refresh   → validar refresh → retornar novo JWT
GET  /perfil         → verificar JWT → retornar dados do usuário
```

---

## Estrutura de Usuário no DynamoDB

```json
{
  "userId": "uuid-gerado",
  "email": "joao@email.com",
  "senhaHash": "$2b$10$...",
  "nome": "João Silva",
  "plano": "free",
  "ativo": true,
  "criadoEm": "2025-01-01T00:00:00Z",
  "refreshToken": "token-hash"
}
```

---

## Código Completo

```javascript
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const dynamo = new DynamoDBClient({ region: "us-east-1" });
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const TABLE = "Usuarios";

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.rawPath || event.path;
  const body = JSON.parse(event.body || "{}");

  try {
    if (method === "POST" && path === "/auth/registro") return await registro(body);
    if (method === "POST" && path === "/auth/login") return await login(body);
    if (method === "POST" && path === "/auth/refresh") return await refresh(body);

    // Rotas protegidas
    const usuario = autenticar(event);
    if (method === "GET" && path === "/perfil") return await getPerfil(usuario.userId);

    return resp(404, { erro: "Rota não encontrada" });
  } catch (err) {
    if (err.status) return resp(err.status, { erro: err.message });
    console.error("Erro auth:", err);
    return resp(500, { erro: "Erro interno" });
  }
};

// REGISTRO
async function registro({ email, senha, nome }) {
  if (!email || !senha || !nome) throw { status: 400, message: "Campos obrigatórios: email, senha, nome" };
  if (senha.length < 6) throw { status: 400, message: "Senha deve ter ao menos 6 caracteres" };

  const existe = await buscarPorEmail(email);
  if (existe) throw { status: 409, message: "Email já cadastrado" };

  const userId = uuidv4();
  const senhaHash = await bcrypt.hash(senha, 10);

  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall({
      userId, email, senhaHash, nome,
      plano: "free", ativo: true,
      criadoEm: new Date().toISOString(),
    }),
  }));

  const { accessToken, refreshToken } = gerarTokens(userId, email);
  await salvarRefreshToken(userId, refreshToken);

  return resp(201, { accessToken, refreshToken, userId, nome });
}

// LOGIN
async function login({ email, senha }) {
  if (!email || !senha) throw { status: 400, message: "Email e senha obrigatórios" };

  const usuario = await buscarPorEmail(email);
  if (!usuario) throw { status: 401, message: "Credenciais inválidas" };

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaValida) throw { status: 401, message: "Credenciais inválidas" };

  if (!usuario.ativo) throw { status: 403, message: "Conta desativada" };

  const { accessToken, refreshToken } = gerarTokens(usuario.userId, email);
  await salvarRefreshToken(usuario.userId, refreshToken);

  return resp(200, { accessToken, refreshToken, userId: usuario.userId, nome: usuario.nome, plano: usuario.plano });
}

// REFRESH TOKEN
async function refresh({ refreshToken }) {
  if (!refreshToken) throw { status: 400, message: "Refresh token obrigatório" };

  let payload;
  try {
    payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch {
    throw { status: 401, message: "Refresh token inválido ou expirado" };
  }

  const { accessToken, refreshToken: novoRefresh } = gerarTokens(payload.userId, payload.email);
  await salvarRefreshToken(payload.userId, novoRefresh);

  return resp(200, { accessToken, refreshToken: novoRefresh });
}

// MIDDLEWARE DE AUTENTICAÇÃO
function autenticar(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization;
  if (!auth?.startsWith("Bearer ")) throw { status: 401, message: "Token não fornecido" };

  try {
    return jwt.verify(auth.split(" ")[1], JWT_SECRET);
  } catch {
    throw { status: 401, message: "Token inválido ou expirado" };
  }
}

// HELPERS
function gerarTokens(userId, email) {
  const accessToken = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ userId, email }, JWT_REFRESH_SECRET, { expiresIn: "30d" });
  return { accessToken, refreshToken };
}

async function buscarPorEmail(email) {
  const { Items } = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "email-index",
    KeyConditionExpression: "email = :email",
    ExpressionAttributeValues: { ":email": { S: email } },
  }));
  return Items?.length ? unmarshall(Items[0]) : null;
}

async function salvarRefreshToken(userId, refreshToken) {
  const hash = require("crypto").createHash("sha256").update(refreshToken).digest("hex");
  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall({ userId, refreshTokenHash: hash }),
    ConditionExpression: "attribute_exists(userId)",
  })).catch(() => {}); // Fallback: UpdateItem
}

async function getPerfil(userId) {
  const { Item } = await dynamo.send(new GetItemCommand({
    TableName: TABLE,
    Key: { userId: { S: userId } },
  }));
  if (!Item) throw { status: 404, message: "Usuário não encontrado" };
  const { senhaHash, refreshTokenHash, ...perfil } = unmarshall(Item);
  return resp(200, perfil);
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

## Tabela DynamoDB + GSI por Email

```bash
aws dynamodb create-table \
  --table-name Usuarios \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName": "email-index",
    "KeySchema": [{"AttributeName":"email","KeyType":"HASH"}],
    "Projection": {"ProjectionType":"ALL"}
  }]' \
  --billing-mode PAY_PER_REQUEST
```

---

## Variáveis de Ambiente

```
JWT_SECRET=segredo-muito-longo-e-aleatorio
JWT_REFRESH_SECRET=outro-segredo-diferente
```

## package.json

```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "uuid": "^9.0.0",
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/util-dynamodb": "^3.0.0"
  }
}
```
