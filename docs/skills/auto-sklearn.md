---
name: auto-sklearn
description: >
  Toolkit completo para usar o auto-sklearn (AutoML sobre scikit-learn). Use esta skill sempre que
  o usuário mencionar auto-sklearn, AutoML, AutoSklearnClassifier, AutoSklearnRegressor, seleção
  automática de modelos, otimização de hiperparâmetros automática, ensemble automático, substituição
  drop-in de estimadores sklearn, ou qualquer tarefa de machine learning automatizado com Python.
  Inclui instalação, classificação, regressão, pipelines avançados, inspeção de modelos e boas práticas.
---

# Auto-Sklearn — Guia Completo

Auto-sklearn é um toolkit de **Automated Machine Learning (AutoML)** compatível com scikit-learn.
Ele automatiza a seleção de algoritmos, pré-processamento e otimização de hiperparâmetros usando
meta-aprendizado e busca bayesiana (SMAC).

---

## Instalação

```bash
# Requer Python 3.7+ e Linux/macOS (não suporta Windows nativamente)
pip install auto-sklearn

# Dependências do sistema (Ubuntu/Debian)
sudo apt-get install build-essential swig

# Via conda (recomendado)
conda install -c conda-forge auto-sklearn
```

> ⚠️ **Windows**: use WSL2 ou Docker. Não há suporte nativo.

---

## Uso em 4 linhas

```python
import autosklearn.classification

cls = autosklearn.classification.AutoSklearnClassifier()
cls.fit(X_train, y_train)
predictions = cls.predict(X_test)
```

---

## Classificação

```python
import sklearn.datasets
import sklearn.metrics
import sklearn.model_selection
import autosklearn.classification

# Carregar dados
X, y = sklearn.datasets.load_breast_cancer(return_X_y=True)
X_train, X_test, y_train, y_test = sklearn.model_selection.train_test_split(
    X, y, random_state=1
)

# Treinar com limite de tempo
automl = autosklearn.classification.AutoSklearnClassifier(
    time_left_for_this_task=120,   # tempo total em segundos
    per_run_time_limit=30,          # tempo máximo por modelo
    tmp_folder="/tmp/autosklearn_tmp",
)
automl.fit(X_train, y_train, dataset_name="meu_dataset")

# Inspecionar resultados
print(automl.leaderboard())         # ranking dos modelos testados
from pprint import pprint
pprint(automl.show_models(), indent=4)  # ensemble final

# Avaliar
predictions = automl.predict(X_test)
print("Acurácia:", sklearn.metrics.accuracy_score(y_test, predictions))
```

---

## Regressão

```python
import autosklearn.regression
import sklearn.datasets
import sklearn.metrics
import sklearn.model_selection

X, y = sklearn.datasets.load_diabetes(return_X_y=True)
X_train, X_test, y_train, y_test = sklearn.model_selection.train_test_split(
    X, y, random_state=1
)

automl = autosklearn.regression.AutoSklearnRegressor(
    time_left_for_this_task=120,
    per_run_time_limit=30,
    tmp_folder="/tmp/autosklearn_regression_tmp",
)
automl.fit(X_train, y_train, dataset_name="diabetes")

print(automl.leaderboard())
pprint(automl.show_models(), indent=4)

train_pred = automl.predict(X_train)
test_pred  = automl.predict(X_test)
print("R² treino:", sklearn.metrics.r2_score(y_train, train_pred))
print("R² teste: ", sklearn.metrics.r2_score(y_test,  test_pred))
```

---

## Parâmetros principais do construtor

| Parâmetro | Padrão | Descrição |
|---|---|---|
| `time_left_for_this_task` | 3600 | Tempo total de busca (segundos) |
| `per_run_time_limit` | 360 | Tempo máximo por pipeline |
| `n_jobs` | 1 | Paralelismo (-1 = todos os cores) |
| `ensemble_size` | 50 | Tamanho do ensemble final |
| `include` | None | Restringir algoritmos a usar |
| `exclude` | None | Excluir algoritmos específicos |
| `resampling_strategy` | `'holdout'` | Estratégia de validação |
| `metric` | None | Métrica de otimização |
| `memory_limit` | 3072 | Limite de RAM em MB |
| `tmp_folder` | None | Pasta para arquivos temporários |
| `seed` | 1 | Semente aleatória |

---

## Configurações avançadas

### Restringir modelos (modelos interpretáveis)

```python
from autosklearn.pipeline.components.classification import ClassifierChoice
from autosklearn.pipeline.components.feature_preprocessing import FeaturePreprocessorChoice

# Listar todos os classificadores disponíveis
for name in ClassifierChoice.get_components():
    print(name)

# Listar pré-processadores disponíveis
for name in FeaturePreprocessorChoice.get_components():
    print(name)

# Usar apenas modelos interpretáveis
automl = autosklearn.classification.AutoSklearnClassifier(
    time_left_for_this_task=60,
    include={
        "classifier": ["decision_tree", "random_forest"],
        "feature_preprocessor": ["no_preprocessing"],
    },
)
```

### Métrica customizada

```python
import autosklearn.metrics
from sklearn.metrics import f1_score

f1 = autosklearn.metrics.make_scorer(
    "f1_macro",
    f1_score,
    average="macro"
)

automl = autosklearn.classification.AutoSklearnClassifier(
    time_left_for_this_task=60,
    metric=f1,
)
```

### Validação cruzada

```python
automl = autosklearn.classification.AutoSklearnClassifier(
    time_left_for_this_task=120,
    resampling_strategy="cv",
    resampling_strategy_arguments={"folds": 5},
)
```

### Múltiplas métricas de avaliação

```python
automl.fit(X_train, y_train)
automl.refit(X_train, y_train)

predictions = automl.predict(X_test)
print("Acurácia:", sklearn.metrics.accuracy_score(y_test, predictions))
print("F1 macro:", sklearn.metrics.f1_score(y_test, predictions, average="macro"))
print("ROC AUC: ", sklearn.metrics.roc_auc_score(y_test, automl.predict_proba(X_test)[:, 1]))
```

---

## Inspecionar o pipeline encontrado

```python
# Ver todos os modelos testados
print(automl.leaderboard())

# Ver o ensemble final com pesos
pprint(automl.show_models(), indent=4)

# Acessar os modelos do ensemble individualmente
for weight, pipeline in automl.get_models_with_weights():
    print(f"Peso: {weight:.3f}")
    print(pipeline.steps)
```

---

## Serialização (salvar/carregar modelo)

```python
import pickle

# Salvar
with open("modelo_automl.pkl", "wb") as f:
    pickle.dump(automl, f)

# Carregar
with open("modelo_automl.pkl", "rb") as f:
    automl_carregado = pickle.load(f)

predictions = automl_carregado.predict(X_test)
```

---

## Boas práticas

1. **Tempo mínimo recomendado**: `time_left_for_this_task >= 60s` para resultados úteis; 300s+ para produção.
2. **`per_run_time_limit`** deve ser ≤ `time_left_for_this_task / 5`.
3. **Pasta temporária**: sempre especifique `tmp_folder` para evitar conflitos entre execuções.
4. **`n_jobs=-1`**: use paralelismo em máquinas com múltiplos cores.
5. **`refit`**: após a busca, chame `automl.refit(X_train, y_train)` para retreinar o ensemble com todos os dados.
6. **Dados categóricos**: passe `feat_type` no `.fit()` para identificar colunas categóricas.
7. **Memória**: ajuste `memory_limit` se tiver OOM errors (padrão: 3072 MB).

---

## Referências

- Documentação oficial: https://automl.github.io/auto-sklearn/
- Paper original (NeurIPS 2015): *Efficient and Robust Automated Machine Learning* — Feurer et al.
- Auto-Sklearn 2.0 (arXiv:2007.04074): *Hands-free AutoML via Meta-Learning* — Feurer et al.
- Blog: https://www.automl.org/blog/
