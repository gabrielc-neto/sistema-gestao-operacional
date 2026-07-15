---
name: ml-inference-api
description: >
  Skill completa para servir modelos de ML via Lambda: carregar modelo mais recente do S3,
  fazer inferência, cache em memória, fallback para modelo anterior e A/B testing. Use sempre
  que o usuário mencionar servir modelo, inferência, predição, endpoint de ML, API de modelo,
  carregar modelo, usar modelo em produção, predição em tempo real, ou quando pedir "usar
  o modelo treinado", "fazer predição", "servir modelo na Lambda", "endpoint de inferência",
  "API para o modelo", "modelo responder requisições", "usar modelo novo".
---

# ML Inference API — Servir Modelos via Lambda

## Arquitetura

```
Request → Lambda Inference
              ├── Cache em memória (warm) → Modelo carregado
              └── Cache frio → S3: models/registry/producao.json
                                   └── Carregar modelo.pkl / chamar OpenAI fine-tuned
```

---

## inference_handler.py — Classificador sklearn

```python
import json
import pickle
import boto3
import logging
import os
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")
BUCKET = os.environ["FEEDBACK_BUCKET"]

# Cache em memória (persiste entre invocações warm)
_cache = {
    "modelo": None,
    "versao": None,
    "carregadoEm": None,
    "ttl_minutos": 30,
}


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
        input_texto = body.get("input")
        forcar_reload = body.get("forcarReload", False)

        if not input_texto:
            return resp(400, {"erro": "Campo 'input' obrigatório"})

        # Carregar modelo (com cache)
        modelo, versao = get_modelo(forcar_reload)

        # Extrair features
        features = extrair_features(input_texto)

        # Fazer predição
        predicao = modelo.predict([features])[0]
        probabilidade = modelo.predict_proba([features])[0]

        resultado = {
            "predicao": "positivo" if predicao == 1 else "negativo",
            "confianca": float(max(probabilidade)),
            "versaoModelo": versao,
            "features": features,
        }

        logger.info(json.dumps({
            "evento": "inference",
            "predicao": resultado["predicao"],
            "confianca": resultado["confianca"],
            "versao": versao,
        }))

        return resp(200, resultado)

    except Exception as e:
        logger.error(f"Erro na inferência: {e}")
        return resp(500, {"erro": "Erro interno"})


def get_modelo(forcar_reload: bool = False):
    """Carregar modelo com cache em memória."""
    agora = datetime.now()

    # Verificar se cache ainda é válido
    if (not forcar_reload
            and _cache["modelo"] is not None
            and _cache["carregadoEm"] is not None):
        minutos_passados = (agora - _cache["carregadoEm"]).seconds / 60
        if minutos_passados < _cache["ttl_minutos"]:
            return _cache["modelo"], _cache["versao"]

    logger.info("Carregando modelo do S3...")

    # Buscar versão em produção
    producao = json.loads(
        s3.get_object(Bucket=BUCKET, Key="models/registry/producao.json")["Body"].read()
    )

    # Carregar modelo pkl
    obj = s3.get_object(Bucket=BUCKET, Key=producao["s3Key"])
    modelo = pickle.loads(obj["Body"].read())

    # Atualizar cache
    _cache["modelo"] = modelo
    _cache["versao"] = producao["versao"]
    _cache["carregadoEm"] = agora

    logger.info(f"Modelo carregado: {producao['versao']}")
    return modelo, producao["versao"]


def extrair_features(texto: str) -> list:
    """Extrair features numéricas do texto."""
    return [
        len(texto),                           # comprimento
        len(texto.split()),                   # palavras
        int("?" in texto),                    # tem pergunta
        int(any(c.isupper() for c in texto)), # tem maiúsculas
        sum(1 for c in texto if c == "!"),    # exclamações
    ]


def resp(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, ensure_ascii=False),
    }
```

---

## inference_openai.py — Fine-tuned Model OpenAI

```python
from openai import OpenAI
import boto3, json, os

openai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
s3 = boto3.client("s3")
BUCKET = os.environ["FEEDBACK_BUCKET"]

_modelo_cache = {"id": None}


def get_modelo_finetunado() -> str:
    """Retornar ID do modelo fine-tuned em produção."""
    if _modelo_cache["id"]:
        return _modelo_cache["id"]

    producao = json.loads(
        s3.get_object(Bucket=BUCKET, Key="models/registry/producao.json")["Body"].read()
    )

    # versao = "ft:gpt-4o-mini:prod-2025-01-15:xxx"
    _modelo_cache["id"] = producao["versao"]
    return _modelo_cache["id"]


async def responder_com_modelo_treinado(mensagem: str, system_prompt: str) -> dict:
    modelo_id = get_modelo_finetunado()

    try:
        completion = openai.chat.completions.create(
            model=modelo_id,                  # usa o fine-tuned
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": mensagem},
            ],
            max_tokens=500,
        )
        return {
            "resposta": completion.choices[0].message.content,
            "modelo": modelo_id,
            "tokens": completion.usage.total_tokens,
        }

    except Exception as e:
        # Fallback para modelo base se fine-tuned falhar
        print(f"Fine-tuned falhou ({e}), usando base")
        completion = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": mensagem}],
        )
        return {
            "resposta": completion.choices[0].message.content,
            "modelo": "gpt-4o-mini (fallback)",
            "tokens": completion.usage.total_tokens,
        }
```

---

## A/B Testing entre versões

```python
import random

def escolher_modelo(userId: str, percentual_novo: float = 0.1) -> str:
    """Enviar X% dos usuários para novo modelo."""
    # Determinístico por userId (mesmo usuário sempre cai no mesmo grupo)
    hash_usuario = hash(userId) % 100
    if hash_usuario < (percentual_novo * 100):
        return "novo"
    return "producao"
```

---

## Variáveis de Ambiente

```
FEEDBACK_BUCKET=meu-bucket-feedback
OPENAI_API_KEY=sk-...
```
