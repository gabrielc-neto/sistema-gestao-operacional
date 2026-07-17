---
name: lambda-layers
description: >
  Skill completa para criar e gerenciar Lambda Layers: empacotar dependências (OpenAI SDK,
  AWS SDK, bcrypt, etc.), publicar layer, versionar e associar a funções. Use sempre que o
  usuário mencionar Lambda Layer, layer, dependências compartilhadas, reutilizar node_modules,
  pacote muito grande, deploy lento, shared dependencies, ou quando pedir "criar layer OpenAI",
  "compartilhar bibliotecas entre Lambdas", "reduzir tamanho do pacote", "layer Node.js",
  "publicar layer AWS", "associar layer à função".
---

# Lambda Layers — Dependências Compartilhadas

## Por que usar Layers?

| Sem Layer | Com Layer |
|-----------|-----------|
| node_modules em cada ZIP (~50MB) | ZIP da função pequeno (~10KB) |
| Deploy lento | Deploy rápido |
| Dependências duplicadas | Dependências centralizadas |
| Atualizar = re-zipar tudo | Atualizar layer separado |

---

## Criar Layer — OpenAI + AWS SDK

```bash
#!/bin/bash
# criar-layer.sh

mkdir -p layer/nodejs
cd layer/nodejs

# Instalar dependências que serão compartilhadas
npm init -y
npm install \
  openai \
  @aws-sdk/client-dynamodb \
  @aws-sdk/util-dynamodb \
  @aws-sdk/client-s3 \
  @aws-sdk/s3-request-presigner \
  jsonwebtoken \
  bcryptjs \
  uuid

cd ..

# Criar ZIP do layer
zip -r ../layer-deps.zip nodejs/
echo "✅ layer-deps.zip criado: $(du -sh ../layer-deps.zip)"
```

---

## Publicar Layer na AWS

```bash
# Publicar layer
aws lambda publish-layer-version \
  --layer-name "deps-nodejs" \
  --description "OpenAI + AWS SDK + Auth libs" \
  --zip-file fileb://layer-deps.zip \
  --compatible-runtimes nodejs18.x nodejs20.x \
  --region us-east-1

# Anotar o LayerVersionArn retornado:
# arn:aws:lambda:us-east-1:CONTA:layer:deps-nodejs:1
```

---

## Associar Layer à Função Lambda

```bash
# Via CLI
aws lambda update-function-configuration \
  --function-name NomeDaFuncao \
  --layers arn:aws:lambda:us-east-1:CONTA:layer:deps-nodejs:1

# Associar múltiplos layers
aws lambda update-function-configuration \
  --function-name NomeDaFuncao \
  --layers \
    arn:aws:lambda:us-east-1:CONTA:layer:deps-nodejs:1 \
    arn:aws:lambda:us-east-1:CONTA:layer:utils:2
```

---

## Código da Função com Layer

```javascript
// ✅ Com layer: importar normalmente, sem node_modules no ZIP
const { OpenAI } = require("openai");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// O layer fica disponível em /opt/nodejs/node_modules
// Node.js resolve automaticamente
```

---

## Deploy da Função (sem node_modules)

```bash
#!/bin/bash
# deploy-sem-deps.sh — apenas o código, sem node_modules

FUNCAO="NomeDaFuncao"

# ZIP apenas do código (sem node_modules)
zip function.zip index.js

# Deploy ultra-rápido
aws lambda update-function-code \
  --function-name $FUNCAO \
  --zip-file fileb://function.zip

echo "✅ Deploy concluído! (ZIP: $(du -sh function.zip))"
rm function.zip
```

---

## Atualizar Layer (nova versão)

```bash
# Atualizar dependências
cd layer/nodejs && npm update && cd ..
zip -r layer-deps-v2.zip layer/nodejs/

# Publicar nova versão (versão anterior continua disponível)
aws lambda publish-layer-version \
  --layer-name "deps-nodejs" \
  --zip-file fileb://layer-deps-v2.zip \
  --compatible-runtimes nodejs18.x nodejs20.x

# Atualizar funções para usar nova versão
aws lambda update-function-configuration \
  --function-name NomeDaFuncao \
  --layers arn:aws:lambda:us-east-1:CONTA:layer:deps-nodejs:2
```

---

## Listar Layers Disponíveis

```bash
aws lambda list-layers --compatible-runtime nodejs18.x

aws lambda list-layer-versions --layer-name deps-nodejs
```

---

## Limites e Boas Práticas

| Limite | Valor |
|--------|-------|
| Layers por função | 5 |
| Tamanho total (layers + código) | 250 MB descomprimido |
| Tamanho do ZIP | 50 MB |

- Separar layers por domínio: `layer-openai`, `layer-auth`, `layer-utils`
- Versionar layers semanticamente nos metadados
- Manter `package.json` do layer no Git para reproduzir
- Usar a mesma versão de Node.js no layer e na função
