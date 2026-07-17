---
name: dataset-builder
description: >
  Skill completa para converter feedbacks e erros do S3 em dataset de treino limpo:
  lê dados brutos, remove lixo, filtra erros válidos e gera JSON/CSV para fine-tuning
  ou re-treinamento. Use sempre que o usuário mencionar dataset, dados de treino, preparar
  dados, limpar dados, organizar feedback, gerar CSV, fine-tuning dataset, JSONL para OpenAI,
  ou quando pedir "transformar feedbacks em dataset", "preparar dados para treinar",
  "limpar dados de produção", "gerar dataset de erros", "exportar dados de treino".
---

# Dataset Builder — Feedback → Dataset de Treino

## Fluxo

```
S3: raw/feedback/YYYY-MM-DD/*.json
          ↓
    Leitura + Limpeza
          ↓
    Filtragem (só feedbacks negativos com correção)
          ↓
S3: datasets/YYYY-MM-DD/dataset.jsonl  (fine-tuning OpenAI)
S3: datasets/YYYY-MM-DD/dataset.csv    (sklearn / análise)
DynamoDB: marcar feedbacks como processados
```

---

## build_dataset.py — Script Principal

```python
import json
import csv
import boto3
import logging
from datetime import datetime, timedelta
from io import StringIO

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3", region_name="us-east-1")
dynamo = boto3.resource("dynamodb", region_name="us-east-1")
tabela = dynamo.Table("FeedbackLoop")

BUCKET = "meu-bucket-feedback"
MIN_INPUT_LEN = 5      # ignorar inputs muito curtos
MIN_OUTPUT_LEN = 10    # ignorar outputs vazios/muito curtos
MAX_INPUT_LEN = 2000   # ignorar inputs gigantes


def lambda_handler(event, context):
    """Triggered diariamente via EventBridge ou manualmente."""
    data_alvo = event.get("data") or (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    logger.info(f"Processando feedbacks de: {data_alvo}")

    # 1. Listar arquivos do dia no S3
    arquivos = listar_feedbacks(data_alvo)
    logger.info(f"Arquivos encontrados: {len(arquivos)}")

    if not arquivos:
        return {"statusCode": 200, "body": "Nenhum feedback para processar"}

    # 2. Carregar e processar
    registros_brutos = carregar_feedbacks(arquivos)
    logger.info(f"Registros carregados: {len(registros_brutos)}")

    # 3. Limpar e filtrar
    dataset_limpo = limpar_e_filtrar(registros_brutos)
    logger.info(f"Após limpeza: {len(dataset_limpo)} registros válidos")

    if not dataset_limpo:
        return {"statusCode": 200, "body": "Nenhum registro válido após limpeza"}

    # 4. Salvar dataset
    salvar_jsonl(dataset_limpo, data_alvo)   # para fine-tuning OpenAI
    salvar_csv(dataset_limpo, data_alvo)     # para análise / sklearn

    # 5. Marcar como processados
    marcar_processados(dataset_limpo)

    return {
        "statusCode": 200,
        "body": json.dumps({
            "data": data_alvo,
            "totalBrutos": len(registros_brutos),
            "totalLimpos": len(dataset_limpo),
            "s3Prefix": f"datasets/{data_alvo}/",
        })
    }


def listar_feedbacks(data: str) -> list:
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix=f"raw/feedback/{data}/")
    return [obj["Key"] for obj in resp.get("Contents", []) if obj["Key"].endswith(".json")]


def carregar_feedbacks(chaves: list) -> list:
    registros = []
    for chave in chaves:
        try:
            obj = s3.get_object(Bucket=BUCKET, Key=chave)
            registro = json.loads(obj["Body"].read())
            registros.append(registro)
        except Exception as e:
            logger.warning(f"Erro ao carregar {chave}: {e}")
    return registros


def limpar_e_filtrar(registros: list) -> list:
    limpos = []
    motivos_descarte = {}

    for r in registros:
        motivo = validar_registro(r)
        if motivo:
            motivos_descarte[motivo] = motivos_descarte.get(motivo, 0) + 1
            continue

        # Normalizar campos
        limpo = {
            "id": r["id"],
            "input": r["input"].strip(),
            "output": r["output"].strip(),
            "feedback": r["feedback"],
            "correcao": r.get("correcaoSugerida", "").strip() or None,
            "motivo_erro": r.get("motivoErro"),
            "modelo": r.get("modelo", "gpt-4o-mini"),
            "data": r["data"],
        }
        limpos.append(limpo)

    logger.info(f"Descartes por motivo: {motivos_descarte}")
    return limpos


def validar_registro(r: dict) -> str | None:
    """Retorna motivo de descarte ou None se válido."""
    if not r.get("input") or len(r["input"]) < MIN_INPUT_LEN:
        return "input_muito_curto"
    if not r.get("output") or len(r["output"]) < MIN_OUTPUT_LEN:
        return "output_muito_curto"
    if len(r["input"]) > MAX_INPUT_LEN:
        return "input_muito_longo"
    if r.get("ambiente") == "staging":
        return "ambiente_staging"
    # Detectar lixo: mensagens de teste
    lixo = ["teste", "test", "aaa", "xxx", "qqq", "123"]
    if any(r["input"].lower().strip() == l for l in lixo):
        return "mensagem_teste"
    return None


def salvar_jsonl(registros: list, data: str):
    """Formato JSONL para fine-tuning OpenAI."""
    linhas = []
    for r in registros:
        # Usar correção se disponível, senão output original (para positivos)
        resposta_ideal = r["correcao"] if r["correcao"] and r["feedback"] == "negativo" else r["output"]
        exemplo = {
            "messages": [
                {"role": "system", "content": "Você é um assistente útil."},
                {"role": "user", "content": r["input"]},
                {"role": "assistant", "content": resposta_ideal},
            ]
        }
        linhas.append(json.dumps(exemplo, ensure_ascii=False))

    conteudo = "\n".join(linhas)
    s3.put_object(
        Bucket=BUCKET,
        Key=f"datasets/{data}/dataset.jsonl",
        Body=conteudo.encode("utf-8"),
        ContentType="application/jsonl",
    )
    logger.info(f"JSONL salvo: datasets/{data}/dataset.jsonl ({len(linhas)} exemplos)")


def salvar_csv(registros: list, data: str):
    """CSV para análise e sklearn."""
    saida = StringIO()
    campos = ["id", "input", "output", "feedback", "correcao", "motivo_erro", "modelo", "data"]
    writer = csv.DictWriter(saida, fieldnames=campos, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(registros)

    s3.put_object(
        Bucket=BUCKET,
        Key=f"datasets/{data}/dataset.csv",
        Body=saida.getvalue().encode("utf-8"),
        ContentType="text/csv",
    )
    logger.info(f"CSV salvo: datasets/{data}/dataset.csv")


def marcar_processados(registros: list):
    for r in registros:
        try:
            tabela.update_item(
                Key={"id": r["id"]},
                UpdateExpression="SET processado = :v, processadoEm = :ts",
                ExpressionAttributeValues={
                    ":v": True,
                    ":ts": datetime.now().isoformat(),
                },
            )
        except Exception as e:
            logger.warning(f"Erro ao marcar {r['id']}: {e}")
```

---

## EventBridge — Rodar diariamente às 2h

```bash
aws events put-rule \
  --name "dataset-builder-diario" \
  --schedule-expression "cron(0 2 * * ? *)" \
  --state ENABLED

aws events put-targets \
  --rule dataset-builder-diario \
  --targets "Id=1,Arn=arn:aws:lambda:us-east-1:CONTA:function:dataset-builder"
```

---

## Variáveis de Ambiente

```
FEEDBACK_BUCKET=meu-bucket-feedback
```

## requirements.txt

```
boto3>=1.26.0
```
