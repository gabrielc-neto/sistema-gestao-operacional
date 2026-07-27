# 07 — Scripts Python

[← Voltar para o índice](README.md)

Scripts utilitários em `scripts/` que rodam com o **Firebase Admin SDK** (bypassam regras). Todos exigem `scripts/serviceAccountKey.json`.

## Pré-requisitos

- Python 3.14.4 (compatível com 3.10+)
- Pacote `firebase-admin`:
  ```bash
  pip install firebase-admin
  ```
- `scripts/serviceAccountKey.json` — chave privada do Firebase Admin

Cada script verifica a presença do arquivo e instala dependências automaticamente.

## Inventário de scripts

| Script | Propósito | Idempotente? |
|---|---|---|
| `seed_masters.py` | Cria usuários administradores iniciais | Sim |
| `seed_motoristas.py` | Cria motoristas de exemplo | Sim |
| `seed_rbac.py` | Popula setores, cargos, permissões | Sim |
| `check_rbac.py` | Lê e mostra os dados RBAC no Firestore | Sim (read-only) |
| `importar_frota.py` | Importa frota inicial | Sim |
| `import_frota.py` | Versão anterior do importador | Sim |
| `import_frota_atualizada.py` | Atualização one-off da frota | Não — apaga e recria |
| `migrar_calibragem.py` | Migração one-off de calibragem | Não |
| `corrigir_tacografo.py` | Correção one-off de dados | Não |
| `deploy_rules.py` | Deploy alternativo de firestore.rules | Sim |

## Como rodar

A partir da raiz do projeto:

```bash
python scripts/seed_rbac.py
```

Ou `cd scripts && python seed_rbac.py`.

## Scripts em detalhe

### `seed_masters.py`

Cria contas administrativas no Firebase Auth + documento em `usuarios/{uid}` com `role: master`.

**Editar antes de rodar:** lista `MASTERS` no topo do arquivo com os emails/senhas/nomes desejados.

**Idempotente:** se o email já existe, reaproveita o UID e atualiza o doc.

```bash
python scripts/seed_masters.py
```

Saída esperada:
```
Firestore OK: silvasampaiowesley03@gmail.com  UID: xxxxxxxxxxxxxxxxxx
```

### `seed_rbac.py`

Popula a estrutura RBAC inicial.

**Cria** (todos idempotentes — pode rodar múltiplas vezes):
- `permissoes_catalogo/` — 60 permissões (`<modulo>.<acao>`)
- `setores/` — 6 setores (Logistica, Operacao, RH, Financeiro, Comercial, Faturamento)
- `cargos/` — 12 cargos pré-configurados com arrays de permissões

**Estratégia de idempotência:**
- Permissões: usa o nome como Doc ID. Se existe, pula.
- Setores: lookup por `nome`. Se existe, pula.
- Cargos: lookup por `setor_id + nome`. Se existe, **atualiza apenas o array de permissões** (preserva o resto).

```bash
python scripts/seed_rbac.py
```

Saída resumida:
```
[1/3] Seed do catalogo de permissoes...
  Total: 60 permissoes
[2/3] Seed de setores...
  + Setor 'Logistica' criado -> YV05Q0aIxHSoH5ZV6ptZ
[3/3] Seed de cargos...
  + Cargo 'Logistica / Gestor' criado -> hPEXtMKPrFDXQdhbTNTn
Pronto!
```

**Após rodar:**
1. Edite seu usuário em `/usuarios` e atribua Setor + Cargo
2. Marque pelo menos um usuário como Super Admin
3. Ajuste permissões dos cargos em `/admin/cargos`

### `check_rbac.py`

Valida que os dados RBAC foram realmente criados.

```bash
python scripts/check_rbac.py
```

Saída:
```
=== SETORES ===
  7u3CjkbDJia8VL8T8kFQ  RH               ativo
  ...
=== CARGOS ===
  Gestor                setor=YV05Q0aI...  permissoes=38
  ...
=== CATALOGO PERMISSOES ===
  Total: 60 permissoes no catalogo
```

Útil também para depurar problemas no front (se a tela não mostrar dados, primeiro confirmar que os dados existem).

### `seed_motoristas.py`

Cria motoristas de exemplo na coleção `motoristas`. Editar `MOTORISTAS` no topo do arquivo.

```bash
python scripts/seed_motoristas.py
```

### `importar_frota.py`

Importa a frota inicial a partir de um arquivo JSON / CSV.

Lê `scripts/dados_frota_extraidos.json` (38 cavalos pré-extraídos do HTML antigo `frota_pontual.html`) e cria docs em `veiculos/`.

```bash
python scripts/importar_frota.py
```

Existem três versões (`importar_frota.py`, `import_frota.py`, `import_frota_atualizada.py`) — todas one-off de migração inicial. A "verdade" hoje é a coleção `veiculos` no Firestore. **Os scripts já foram executados, não precisam rodar de novo**.

### `migrar_calibragem.py` e `corrigir_tacografo.py`

Migrações one-off já executadas. Mantidos por histórico.

### `deploy_rules.py`

Alternativa ao `firebase deploy --only firestore:rules`. Use **apenas** se o Firebase CLI não estiver disponível.

```bash
python scripts/deploy_rules.py
```

Faz upload de `firestore.rules` direto via API do Firebase.

## Adicionando um novo script

Template recomendado:

```python
"""
Descricao curta do que o script faz.
"""
import sys, os
sys.stdout.reconfigure(encoding="utf-8")

SERVICE_ACCOUNT = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    os.system(f"{sys.executable} -m pip install firebase-admin")
    import firebase_admin
    from firebase_admin import credentials, firestore

if not os.path.exists(SERVICE_ACCOUNT):
    print(f"ERRO: {SERVICE_ACCOUNT} nao encontrado.")
    sys.exit(1)

cred = credentials.Certificate(SERVICE_ACCOUNT)
firebase_admin.initialize_app(cred)
db = firestore.client()

# ============== sua lógica aqui ==============
```

Convenções:
- Reportar progresso (`print(f"  + criado {nome}")`)
- Idempotente sempre que possível (re-rodar não duplica)
- Documentar o que faz no docstring
- Usar `serverTimestamp()` para `created_at` / `updated_at`
- Não logar dados sensíveis (CNH, CPF, senhas, telefones completos)

## Segurança dos scripts

- ❌ **NUNCA commitar `serviceAccountKey.json`** — já está no `.gitignore` global
- ❌ **NUNCA logar conteúdo da chave** no console ou em arquivos
- ❌ **NUNCA mandar a chave por email/chat** — basta gerar nova no Firebase Console
- ✅ **Apagar scripts one-off depois de rodar** se contiverem credenciais hardcoded (ex: senhas de seed)

---

## Relacionado

- Anterior: [[06-deploy]]
- Próximo: [[08-desenvolvimento]]
- [[INDICE|🏠 Voltar ao índice]]
- [[CLAUDE|📖 Contexto do sistema]]
- [[MEMORY|🧠 Memórias]]
