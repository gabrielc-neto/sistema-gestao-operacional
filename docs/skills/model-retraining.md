---
name: model-retraining
description: >
  Skill completa para re-treinar modelos automaticamente com novos dados: fine-tuning via
  OpenAI API, treinamento com auto-sklearn, atualização incremental e validação antes de
  promover. Use sempre que o usuário mencionar re-treinar modelo, fine-tuning, atualizar
  modelo, aprender com novos dados, treinar com feedback, auto-sklearn, model.fit,
  ou quando pedir "treinar com dados de produção", "melhorar o modelo", "fine-tuning OpenAI",
  "re-treinar automaticamente", "atualizar modelo com erros", "aprender com feedback".
---

# Model Retraining — Aprender com Produção

## Dois caminhos de re-treinamento

| Abordagem | Quando usar | Complexidade |
|-----------|-------------|--------------|
| **Fine-tuning OpenAI** | Melhorar respostas do chatbot | Baixa |
| **Auto-sklearn (classificador)** | Classificar intenções/qualidade | Média |
| **Atualização incremental** | Dados chegam continuamente | Média |

---

## Caminho 1: Fine-tuning OpenAI (recomendado para chatbot)

```python
# finetune_openai.py
import json
import boto3
import logging
from openai import OpenAI
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

openai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
s3 = boto3.client("s3")
BUCKET = os.environ["FEEDBACK_BUCKET"]


def lambda_handler(event, context):
    data = event.get("data") or datetime.now().strftime("%Y-%m-%d")

    # 1. Baixar dataset do S3
    dataset_key = f"datasets/{data}/dataset.jsonl"
    local_path = "/tmp/dataset.jsonl"
    s3.download_file(BUCKET, dataset_key, local_path)

    # 2. Validar tamanho mínimo
    with open(local_path) as f:
        linhas = f.readlines()

    if len(linhas) < 10:
        logger.warning(f"Dataset pequeno ({len(linhas)} exemplos). Mínimo: 10.")
        return {"statusCode": 200, "body": "Dataset insuficiente para treino"}

    logger.info(f"Iniciando fine-tuning com {len(linhas)} exemplos")

    # 3. Upload do dataset para OpenAI
    with open(local_path, "rb") as f:
        arquivo = openai.files.create(file=f, purpose="fine-tune")

    logger.info(f"Arquivo enviado: {arquivo.id}")

    # 4. Criar job de fine-tuning
    job = openai.fine_tuning.jobs.create(
        training_file=arquivo.id,
        model="gpt-4o-mini-2024-07-18",   # modelo base para fine-tuning
        hyperparameters={"n_epochs": 3},
        suffix=f"prod-{data}",            # nome do modelo: gpt-4o-mini:prod-2025-01-15
    )

    logger.info(f"Job criado: {job.id} | Status: {job.status}")

    # 5. Salvar referência do job no S3
    meta = {
        "jobId": job.id,
        "data": data,
        "exemplos": len(linhas),
        "status": job.status,
        "criadoEm": datetime.now().isoformat(),
    }
    s3.put_object(
        Bucket=BUCKET,
        Key=f"models/jobs/{job.id}.json",
        Body=json.dumps(meta),
    )

    return {"statusCode": 200, "body": json.dumps(meta)}


def verificar_job(job_id: str):
    """Verificar status do fine-tuning (chamar periodicamente)."""
    job = openai.fine_tuning.jobs.retrieve(job_id)
    logger.info(f"Job {job_id}: {job.status} | Modelo: {job.fine_tuned_model}")

    if job.status == "succeeded":
        return {
            "concluido": True,
            "modeloId": job.fine_tuned_model,  # ex: ft:gpt-4o-mini:prod-2025-01-15:xxx
        }
    elif job.status == "failed":
        return {"concluido": False, "erro": job.error}

    return {"concluido": False, "status": job.status}
```

---

## Caminho 2: Auto-sklearn (classificador de qualidade)

```python
# train_classifier.py
import pickle
import boto3
import pandas as pd
import logging
from datetime import datetime

logger = logging.getLogger()
s3 = boto3.client("s3")
BUCKET = os.environ["FEEDBACK_BUCKET"]


def treinar_classificador(data: str):
    """Treina classificador para prever se resposta será boa ou ruim."""
    # Importar auto-sklearn (requer Lambda com Docker ou Layer pesado)
    try:
        import autosklearn.classification as asc
        usar_autosklearn = True
    except ImportError:
        from sklearn.ensemble import RandomForestClassifier
        usar_autosklearn = False

    # Carregar dataset
    df = pd.read_csv(f"/tmp/dataset.csv")

    # Features: comprimento do input, comprimento do output, etc.
    df["input_len"] = df["input"].str.len()
    df["output_len"] = df["output"].str.len()
    df["tem_pergunta"] = df["input"].str.contains(r"\?").astype(int)
    df["label"] = (df["feedback"] == "positivo").astype(int)

    X = df[["input_len", "output_len", "tem_pergunta"]]
    y = df["label"]

    if len(X) < 20:
        logger.warning("Dados insuficientes para treino")
        return None

    # Treinar modelo
    if usar_autosklearn:
        modelo = asc.AutoSklearnClassifier(time_left_for_this_task=120, per_run_time_limit=30)
    else:
        modelo = RandomForestClassifier(n_estimators=100, random_state=42)

    modelo.fit(X, y)

    # Salvar modelo
    versao = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    modelo_path = f"/tmp/modelo_{versao}.pkl"
    with open(modelo_path, "wb") as f:
        pickle.dump(modelo, f)

    # Upload para S3
    s3_key = f"models/classificador/{versao}/modelo.pkl"
    s3.upload_file(modelo_path, BUCKET, s3_key)

    logger.info(f"Modelo salvo: {s3_key}")
    return versao, s3_key
```

---

## Atualização Incremental (online learning)

```python
# Para modelos que suportam partial_fit (SGD, PassiveAggressive, etc.)
from sklearn.linear_model import SGDClassifier

def atualizar_incremental(modelo_atual, novos_X, novos_y):
    """Atualiza modelo sem re-treinar do zero."""
    modelo_atual.partial_fit(novos_X, novos_y, classes=[0, 1])
    return modelo_atual
```

---

## Variáveis de Ambiente

```
OPENAI_API_KEY=sk-...
FEEDBACK_BUCKET=meu-bucket-feedback
```

## requirements.txt

```
openai>=1.0.0
boto3>=1.26.0
pandas>=2.0.0
scikit-learn>=1.3.0
# auto-sklearn>=0.15.0  (requer Docker - ver skill docker-lambda)
```
