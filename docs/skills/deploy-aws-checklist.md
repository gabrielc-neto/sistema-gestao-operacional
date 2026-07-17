---
name: deploy-aws-checklist
description: >
  Checklist completo e boas práticas para deploy seguro, econômico e performático na AWS com
  foco em Lambda, DynamoDB, API Gateway e OpenAI. Use sempre que o usuário mencionar deploy,
  publicar Lambda, subir pra produção, ir ao ar, release, lançamento, configurar ambiente,
  ambiente de produção, staging, custo AWS, otimizar Lambda, segurança AWS, monitoramento,
  CloudWatch, alarmes, logs, ou quando pedir "está pronto pra produção?", "como faço deploy",
  "preciso publicar", "verificar antes de subir", "quanto vai custar", "como monitorar".
  Também acionar para revisão de segurança, IAM mínimo e estimativa de custos.
---

# Deploy AWS — Checklist Completo

## 1. Segurança

### IAM — Princípio do menor privilégio
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:CONTA:table/TokenUsage"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```
> ❌ Nunca usar `AdministratorAccess` ou `AmazonDynamoDBFullAccess` em produção

### Variáveis de Ambiente — Segredos
```bash
# ❌ ERRADO — hardcoded no código
const apiKey = "sk-abc123";

# ✅ CERTO — via variável de ambiente Lambda
const apiKey = process.env.OPENAI_API_KEY;

# ✅ MELHOR — via AWS Secrets Manager (produção crítica)
const secret = await secretsManager.getSecretValue({ SecretId: "openai-key" });
```

### Checklist de Segurança
- [ ] Nenhuma chave/secret hardcoded no código
- [ ] IAM com permissões mínimas necessárias
- [ ] `OPENAI_API_KEY` em variável de ambiente Lambda
- [ ] API Gateway com throttling habilitado
- [ ] CORS configurado para domínios específicos (não `*` em produção crítica)
- [ ] CloudTrail habilitado para auditoria

---

## 2. Performance

### Configurações Lambda
| Configuração | Desenvolvimento | Produção |
|---|---|---|
| Memória | 128 MB | 256–512 MB |
| Timeout | 10s | 30s |
| Concorrência reservada | — | 10–50 |
| Provisioned Concurrency | Não | Se latência crítica |

```bash
# Atualizar configurações via CLI
aws lambda update-function-configuration \
  --function-name NomeDaFuncao \
  --timeout 30 \
  --memory-size 256
```

### Reduzir Cold Start
```javascript
// ✅ Inicializar clientes FORA do handler (reutiliza entre invocações)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const dynamo = new DynamoDBClient({ region: "us-east-1" });

exports.handler = async (event) => {
  // Usar openai e dynamo já inicializados
};

// ❌ Errado — reinicializa a cada invocação
exports.handler = async (event) => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};
```

---

## 3. Monitoramento

### CloudWatch — Métricas essenciais para monitorar
| Métrica | Alarme sugerido |
|---------|-----------------|
| `Errors` | > 5 em 5 minutos |
| `Duration` | > 25000ms (próximo do timeout) |
| `Throttles` | > 0 |
| `ConcurrentExecutions` | > 80% do limite |

### Criar alarme de erros via CLI
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "Lambda-Erros-Criticos" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --dimensions Name=FunctionName,Value=NomeDaFuncao \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:CONTA:alertas
```

### Logs estruturados (facilita CloudWatch Insights)
```javascript
// ✅ Logar como JSON para filtrar facilmente
console.log(JSON.stringify({
  evento: "chat_request",
  userId,
  tokensUsados,
  modelo: "gpt-4o-mini",
  duracao: Date.now() - inicio,
  sucesso: true,
}));
```

### Query útil no CloudWatch Insights
```
fields @timestamp, userId, tokensUsados, duracao
| filter evento = "chat_request"
| stats sum(tokensUsados) as totalTokens by userId
| sort totalTokens desc
| limit 20
```

---

## 4. Estimativa de Custo

### Lambda
```
Invocações gratuitas/mês: 1.000.000
Preço após gratuito: $0.20 por 1M invocações

Custo de computação:
- 256MB × 5s por invocação = 1.280.000 GB-s por 1M requisições
- Preço: $0.0000166667 por GB-s
- Custo: ~$21 por 1M requisições
```

### DynamoDB (On-Demand)
```
Leitura: $0.25 por 1M RCUs
Escrita: $1.25 por 1M WCUs
Armazenamento: $0.25 por GB/mês

Estimativa para 10.000 req/dia:
- ~20.000 leituras + 20.000 escritas = $0.03/dia ≈ $1/mês
```

### OpenAI (gpt-4o-mini)
```
Input: $0.15 por 1M tokens
Output: $0.60 por 1M tokens

Estimativa para 10.000 req/dia (média 200 tokens/req):
- 2M tokens/dia = $0.30 input + $1.20 output = $1.50/dia ≈ $45/mês
```

---

## 5. Script de Deploy

```bash
#!/bin/bash
# deploy.sh — deploy completo

FUNCAO="NomeDaFuncao"
REGIAO="us-east-1"

echo "🔧 Instalando dependências..."
npm install --production

echo "📦 Criando pacote..."
zip -r function.zip index.js node_modules package.json

echo "🚀 Fazendo deploy..."
aws lambda update-function-code \
  --function-name $FUNCAO \
  --zip-file fileb://function.zip \
  --region $REGIAO

echo "⏳ Aguardando atualização..."
aws lambda wait function-updated \
  --function-name $FUNCAO \
  --region $REGIAO

echo "🧪 Testando..."
aws lambda invoke \
  --function-name $FUNCAO \
  --payload '{"body":"{\"userId\":\"test\",\"mensagem\":\"ping\"}"}' \
  --region $REGIAO \
  response.json

cat response.json
echo ""
echo "✅ Deploy concluído!"

# Limpeza
rm -f function.zip response.json
```

---

## Checklist Completo Pré-Deploy

### Código
- [ ] Clientes OpenAI e DynamoDB inicializados fora do handler
- [ ] Timeout Lambda ≥ 15s (ideal 30s)
- [ ] Memória Lambda ≥ 256MB
- [ ] Tratamento de erros em todas as chamadas externas
- [ ] Logs estruturados em JSON

### Segurança
- [ ] Nenhuma chave hardcoded
- [ ] IAM com permissões mínimas
- [ ] OPENAI_API_KEY em variável de ambiente
- [ ] API Gateway com throttling

### DynamoDB
- [ ] Tabela criada na região correta
- [ ] TTL habilitado (se aplicável)
- [ ] Backup automático habilitado

### Monitoramento
- [ ] Alarme de erros criado
- [ ] Alarme de duration criado
- [ ] Log group com retenção definida (30 dias)

### Teste
- [ ] Teste com payload válido ✅
- [ ] Teste com payload inválido (userId ausente) ✅
- [ ] Teste de limite de tokens ✅
- [ ] Teste de carga básico (10 req simultâneas)
