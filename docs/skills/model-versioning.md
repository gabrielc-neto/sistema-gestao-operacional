---
name: model-versioning
description: >
  Skill completa para versionar modelos de ML: salvar v1/v2/v3 no S3, registrar metadados,
  promover versão para produção, rollback e rastreabilidade com MLflow ou solução própria.
  Use sempre que o usuário mencionar versionar modelo, v1 v2 v3 modelo, MLflow, registro de
  modelos, model registry, promover modelo, rollback de modelo, histórico de modelos, ou
  quando pedir "salvar versão do modelo", "qual modelo está em produção", "voltar versão
  anterior", "registrar modelo", "comparar versões", "promover para produção".
---

# Model Versioning — Controle de Versões de Modelos

## Estrutura no S3

```
s3://meu-bucket-feedback/
└── models/
    ├── registry/
    │   ├── producao.json          ← versão atual em produção
    │   └── historico.json         ← todas as versões
    ├── classificador/
    │   ├── v20250115_143022/
    │   │   ├── modelo.pkl
    │   │   └── metadata.json
    │   └── v20250116_091500/
    │       ├── modelo.pkl
    │       └── metadata.json
    └── finetune/
        ├── jobs/
        │   └── ftjob-xxx.json
        └── modelos.json           ← lista de fine-tuned models
```

---

## model_registry.py — Gerenciar Versões

```python
import json
import pickle
import boto3
import logging
from datetime import datetime
from io import BytesIO

logger = logging.getLogger()
s3 = boto3.client("s3")
BUCKET = "meu-bucket-feedback"


class ModelRegistry:
    """Registro simples de modelos no S3 (alternativa ao MLflow)."""

    def registrar(self, versao: str, s3_key_modelo: str, metricas: dict, tipo: str = "classificador"):
        """Registrar nova versão no histórico."""
        historico = self._carregar_historico()

        entrada = {
            "versao": versao,
            "tipo": tipo,
            "s3Key": s3_key_modelo,
            "metricas": metricas,
            "status": "candidato",    # candidato → staging → producao | descartado
            "criadoEm": datetime.now().isoformat(),
            "promovidoEm": None,
        }

        historico.append(entrada)
        self._salvar_historico(historico)
        logger.info(f"Versão registrada: {versao} | Métricas: {metricas}")
        return entrada

    def promover_producao(self, versao: str):
        """Promover versão para produção."""
        historico = self._carregar_historico()
        producao_atual = self._carregar_producao()

        # Rebaixar versão atual para 'anterior'
        if producao_atual:
            for item in historico:
                if item["versao"] == producao_atual["versao"]:
                    item["status"] = "anterior"

        # Promover nova versão
        for item in historico:
            if item["versao"] == versao:
                item["status"] = "producao"
                item["promovidoEm"] = datetime.now().isoformat()
                self._salvar_producao(item)
                break

        self._salvar_historico(historico)
        logger.info(f"Versão {versao} promovida para produção")

    def rollback(self):
        """Voltar para versão anterior."""
        historico = self._carregar_historico()
        anteriores = [h for h in historico if h["status"] == "anterior"]

        if not anteriores:
            raise Exception("Nenhuma versão anterior disponível")

        # Pegar a mais recente versão anterior
        anterior = sorted(anteriores, key=lambda x: x["criadoEm"], reverse=True)[0]
        self.promover_producao(anterior["versao"])
        logger.info(f"Rollback para: {anterior['versao']}")
        return anterior

    def get_producao(self) -> dict:
        """Retornar versão atual em produção."""
        return self._carregar_producao()

    def listar_versoes(self) -> list:
        return self._carregar_historico()

    def carregar_modelo_producao(self):
        """Carregar modelo pkl da versão em produção."""
        producao = self.get_producao()
        if not producao:
            raise Exception("Nenhum modelo em produção")

        obj = s3.get_object(Bucket=BUCKET, Key=producao["s3Key"])
        return pickle.loads(obj["Body"].read())

    # ── Helpers S3 ──
    def _carregar_historico(self) -> list:
        try:
            obj = s3.get_object(Bucket=BUCKET, Key="models/registry/historico.json")
            return json.loads(obj["Body"].read())
        except s3.exceptions.NoSuchKey:
            return []

    def _salvar_historico(self, historico: list):
        s3.put_object(
            Bucket=BUCKET,
            Key="models/registry/historico.json",
            Body=json.dumps(historico, indent=2, ensure_ascii=False),
        )

    def _carregar_producao(self) -> dict | None:
        try:
            obj = s3.get_object(Bucket=BUCKET, Key="models/registry/producao.json")
            return json.loads(obj["Body"].read())
        except s3.exceptions.NoSuchKey:
            return None

    def _salvar_producao(self, versao: dict):
        s3.put_object(
            Bucket=BUCKET,
            Key="models/registry/producao.json",
            Body=json.dumps(versao, indent=2),
        )
```

---

## Uso no Pipeline de Re-treinamento

```python
from model_registry import ModelRegistry

registry = ModelRegistry()

# Após treinar novo modelo
versao = "v20250116_091500"
metricas = {"acuracia": 0.87, "f1": 0.85, "exemplos_treino": 342}
registry.registrar(versao, f"models/classificador/{versao}/modelo.pkl", metricas)

# Validar em staging antes de promover
# ... rodar testes A/B ...

# Promover para produção
registry.promover_producao(versao)

# Se der problema, rollback
registry.rollback()
```

---

## Versionar Fine-tuned Models OpenAI

```python
def registrar_finetune(job_id: str, modelo_id: str, metricas: dict):
    """Registrar modelo fine-tuned do OpenAI."""
    registry = ModelRegistry()
    registry.registrar(
        versao=modelo_id,           # ex: ft:gpt-4o-mini:prod-2025-01-15:xxx
        s3_key_modelo=f"models/finetune/jobs/{job_id}.json",
        metricas=metricas,
        tipo="finetune-openai",
    )
```

---

## Endpoint de Gerenciamento (Lambda Admin)

```javascript
// GET /admin/modelos → listar versões
// POST /admin/modelos/:versao/promover → promover para produção
// POST /admin/modelos/rollback → rollback para versão anterior

exports.handler = async (event) => {
  const path = event.rawPath;
  const method = event.requestContext?.http?.method;

  if (method === "GET" && path === "/admin/modelos") {
    // Chamar script Python via subprocess ou Lambda separada
    const versoes = await listarVersoes();
    return resp(200, { versoes });
  }
  // ...
};
```
