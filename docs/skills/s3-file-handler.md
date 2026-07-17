---
name: s3-file-handler
description: >
  Skill completa para upload e download de arquivos com Lambda + S3: URLs pré-assinadas, upload
  direto do cliente, download seguro, controle de acesso por usuário e integração com DynamoDB.
  Use sempre que o usuário mencionar S3, upload de arquivo, download, imagem, documento, PDF,
  armazenamento de arquivos, URL pré-assinada, presigned URL, bucket S3, objeto S3, multipart,
  ou quando pedir "salvar arquivo", "upload de imagem", "gerar link de download", "armazenar
  documento", "arquivo por usuário", "link temporário para arquivo".
---

# S3 File Handler — Lambda

## Fluxo Recomendado (Upload Direto)

```
1. Cliente → Lambda: "quero fazer upload de foto.jpg"
2. Lambda → S3: gerar presigned URL (PUT)
3. Lambda → Cliente: retornar URL temporária
4. Cliente → S3: fazer upload direto (sem passar pela Lambda)
5. Lambda → DynamoDB: salvar metadados do arquivo
```

> Vantagem: arquivo não passa pela Lambda, sem limite de 6MB do API Gateway.

---

## Gerar URL Pré-assinada para Upload

```javascript
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");

const s3 = new S3Client({ region: "us-east-1" });
const BUCKET = process.env.S3_BUCKET;

// Gerar URL para upload (válida por 5 minutos)
async function gerarUrlUpload(userId, nomeArquivo, tipoMime) {
  const extensao = nomeArquivo.split(".").pop();
  const chave = `usuarios/${userId}/${uuidv4()}.${extensao}`;

  const url = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: BUCKET,
    Key: chave,
    ContentType: tipoMime,
    Metadata: { userId, nomeOriginal: nomeArquivo },
  }), { expiresIn: 300 }); // 5 minutos

  return { url, chave };
}

// Gerar URL para download (válida por 1 hora)
async function gerarUrlDownload(chave) {
  return await getSignedUrl(s3, new GetObjectCommand({
    Bucket: BUCKET,
    Key: chave,
  }), { expiresIn: 3600 }); // 1 hora
}

// Deletar arquivo
async function deletarArquivo(chave) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: chave }));
}
```

---

## Handler Completo

```javascript
exports.handler = async (event) => {
  const method = event.requestContext?.http?.method;
  const path = event.rawPath;
  const body = JSON.parse(event.body || "{}");
  const userId = event.headers?.["x-user-id"]; // ou via JWT

  try {
    // Solicitar URL de upload
    if (method === "POST" && path === "/arquivos/upload-url") {
      const { nome, tipo } = body;
      if (!nome || !tipo) return resp(400, { erro: "nome e tipo são obrigatórios" });

      const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!tiposPermitidos.includes(tipo)) return resp(400, { erro: "Tipo de arquivo não permitido" });

      const { url, chave } = await gerarUrlUpload(userId, nome, tipo);

      // Salvar metadados no DynamoDB
      await salvarMetadados({ userId, chave, nome, tipo, status: "pendente" });

      return resp(200, { uploadUrl: url, chave });
    }

    // Confirmar upload concluído
    if (method === "POST" && path === "/arquivos/confirmar") {
      const { chave } = body;
      await atualizarStatus(chave, "ativo");
      return resp(200, { mensagem: "Arquivo confirmado" });
    }

    // Gerar URL de download
    if (method === "GET" && path.startsWith("/arquivos/")) {
      const chave = decodeURIComponent(path.replace("/arquivos/", ""));
      const arquivo = await buscarMetadados(chave);
      if (!arquivo || arquivo.userId !== userId) return resp(403, { erro: "Sem permissão" });

      const downloadUrl = await gerarUrlDownload(chave);
      return resp(200, { downloadUrl, expiraEm: "1 hora" });
    }

    // Listar arquivos do usuário
    if (method === "GET" && path === "/arquivos") {
      const arquivos = await listarArquivos(userId);
      return resp(200, { arquivos });
    }

    return resp(404, { erro: "Rota não encontrada" });
  } catch (err) {
    console.error("Erro S3:", err);
    return resp(500, { erro: "Erro interno" });
  }
};
```

---

## Política S3 Bucket

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::meu-bucket/*",
      "Condition": {
        "StringNotEquals": { "aws:PrincipalArn": "arn:aws:iam::CONTA:role/LambdaRole" }
      }
    }
  ]
}
```

---

## IAM Lambda — Permissões S3

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
  "Resource": "arn:aws:s3:::meu-bucket/usuarios/*"
}
```

---

## Variáveis de Ambiente

```
S3_BUCKET=meu-bucket-producao
```

## package.json

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/s3-request-presigner": "^3.0.0",
    "uuid": "^9.0.0"
  }
}
```
