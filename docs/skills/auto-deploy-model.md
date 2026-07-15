---
name: auto-deploy-model
description: >
  Skill completa para deploy automático de modelos: detecta novo modelo treinado via S3
  trigger, valida métricas, promove para produção e notifica. O mais importante do pipeline
  de ML fechando o loop. Use sempre que o usuário mencionar deploy automático de modelo,
  CI/CD para ML, trigger de deploy, promover modelo automaticamente, pipeline de ML completo,
  ou quando pedir "deployar modelo automaticamente", "detectar novo modelo", "promover quando
  treino terminar", "pipeline automático de ML", "fechar o loop de ML", "deploy ao treinar".
---

# Auto Deploy Model — Fechando o Loop de ML

## Fluxo Completo

```
dataset-builder salva → S3: datasets/YYYY-MM-DD/dataset.jsonl
                                    ↓
                         S3 Event Trigger
                                    ↓
                         Lambda: pipeline-orquestrador
                                    ↓
                    ┌──────────────────────────────┐
                    │  1. model-retraining          │
                    │  2. validar métricas          │
                    │  3. model-versioning registrar│
                    │  4. promover se métricas OK   │
                    │  5. notificar                 │
                    └──────────────────────────────┘
                                    ↓
                         ml-inference-api usa novo modelo
```

---

## pipeline_orquestrador.py — Lambda Principal

```python
import json
import boto3
import logging
import os
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

lambda_client = boto3.client("lambda")
s3 = boto3.client("s3")
sns = boto3.client("sns")

BUCKET = os.environ["FEEDBACK_BUCKET"]
SNS_TOPIC = os.environ.get("SNS_ALERTS_ARN")
LIMIAR_ACURACIA = float(os.environ.get("LIMIAR_ACURACIA", "0.75"))  # 75% mínimo


def lambda_handler(event, context):
    """
    Triggered por:
    - S3 Event: novo dataset salvo
    - EventBridge: agendamento diário
    - Manual: payload com 'data'
    """
    logger.info(f"Pipeline iniciado: {json.dumps(event)}")

    # Extrair data do evento S3 ou manual
    data = extrair_data(event)
    logger.info(f"Processando data: {data}")

    resultado = {
        "data": data,
        "etapas": {},
        "sucesso": False,
    }

    try:
        # ETAPA 1: Re-treinar modelo
        logger.info("Etapa 1: Re-treinamento...")
        res_treino = invocar_lambda("model-retraining", {"data": data})
        resultado["etapas"]["retraining"] = res_treino

        if not res_treino.get("versao"):
            raise Exception(f"Re-treinamento falhou: {res_treino}")

        versao = res_treino["versao"]
        metricas = res_treino.get("metricas", {})
        logger.info(f"Modelo treinado: {versao} | Métricas: {metricas}")

        # ETAPA 2: Validar métricas
        logger.info("Etapa 2: Validando métricas...")
        acuracia = metricas.get("acuracia", 0)
        aprovado = acuracia >= LIMIAR_ACURACIA

        resultado["etapas"]["validacao"] = {
            "acuracia": acuracia,
            "limiar": LIMIAR_ACURACIA,
            "aprovado": aprovado,
        }

        if not aprovado:
            logger.warning(f"Modelo reprovado: {acuracia:.2%} < {LIMIAR_ACURACIA:.2%}")
            notificar(
                f"⚠️ Modelo reprovado: acurácia {acuracia:.2%} abaixo do limiar {LIMIAR_ACURACIA:.2%}",
                tipo="alerta"
            )
            return resultado

        # ETAPA 3: Registrar versão
        logger.info("Etapa 3: Registrando versão...")
        res_registro = invocar_lambda("model-versioning", {
            "acao": "registrar",
            "versao": versao,
            "metricas": metricas,
        })
        resultado["etapas"]["versioning"] = res_registro

        # ETAPA 4: Promover para produção
        logger.info("Etapa 4: Promovendo para produção...")
        res_promocao = invocar_lambda("model-versioning", {
            "acao": "promover",
            "versao": versao,
        })
        resultado["etapas"]["promocao"] = res_promocao

        # ETAPA 5: Forçar reload no inference (limpar cache)
        logger.info("Etapa 5: Recarregando inference...")
        invocar_lambda("ml-inference-api", {"forcarReload": True})

        resultado["sucesso"] = True
        logger.info(f"Pipeline concluído! Versão em produção: {versao}")

        # Notificar sucesso
        notificar(
            f"✅ Deploy automático concluído!\n"
            f"Versão: {versao}\n"
            f"Acurácia: {acuracia:.2%}\n"
            f"Data: {data}",
            tipo="sucesso"
        )

    except Exception as e:
        logger.error(f"Pipeline falhou: {e}")
        resultado["erro"] = str(e)
        notificar(f"❌ Pipeline de ML falhou: {e}", tipo="erro")

    return resultado


def extrair_data(event: dict) -> str:
    """Extrair data do evento S3 ou usar hoje."""
    # Evento S3
    if "Records" in event:
        chave = event["Records"][0]["s3"]["object"]["key"]
        # ex: datasets/2025-01-15/dataset.jsonl → 2025-01-15
        partes = chave.split("/")
        if len(partes) >= 2:
            return partes[1]

    return event.get("data") or datetime.now().strftime("%Y-%m-%d")


def invocar_lambda(nome: str, payload: dict) -> dict:
    """Invocar outra Lambda e retornar resultado."""
    resposta = lambda_client.invoke(
        FunctionName=nome,
        InvocationType="RequestResponse",
        Payload=json.dumps(payload),
    )
    return json.loads(resposta["Payload"].read())


def notificar(mensagem: str, tipo: str = "info"):
    """Notificar via SNS → email/Slack."""
    if not SNS_TOPIC:
        return
    try:
        sns.publish(
            TopicArn=SNS_TOPIC,
            Subject=f"[ML Pipeline] {tipo.upper()}",
            Message=mensagem,
        )
    except Exception as e:
        logger.warning(f"Falha ao notificar: {e}")
```

---

## Trigger S3 — Disparar ao salvar dataset

```bash
# Configurar notificação S3 para disparar Lambda ao criar arquivo em datasets/
aws s3api put-bucket-notification-configuration \
  --bucket meu-bucket-feedback \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:CONTA:function:pipeline-orquestrador",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {"Name": "prefix", "Value": "datasets/"},
            {"Name": "suffix", "Value": "dataset.jsonl"}
          ]
        }
      }
    }]
  }'
```

---

## IAM — Permissões do Orquestrador

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": [
        "arn:aws:lambda:*:*:function:model-retraining",
        "arn:aws:lambda:*:*:function:model-versioning",
        "arn:aws:lambda:*:*:function:ml-inference-api"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::meu-bucket-feedback/*"
    },
    {
      "Effect": "Allow",
      "Action": ["sns:Publish"],
      "Resource": "*"
    }
  ]
}
```

---

## Variáveis de Ambiente

```
FEEDBACK_BUCKET=meu-bucket-feedback
SNS_ALERTS_ARN=arn:aws:sns:us-east-1:CONTA:alertas
LIMIAR_ACURACIA=0.75
```
