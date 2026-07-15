# 06 — Deploy e Operação

[← Voltar para o índice](README.md)

## Ambientes

| Ambiente | URL | Como acessar |
|---|---|---|
| **Produção** | https://pontual-logistica.web.app | Firebase Hosting |
| **Dev local** | http://localhost:5173 | `npm run dev` |
| **Console Firebase** | https://console.firebase.google.com/project/pontual-logistica | login Google |

Atualmente há **um único ambiente Firebase** (`pontual-logistica`). Não existe stage/preview separado. Quando crescer, criar `pontual-logistica-stage` como projeto Firebase paralelo.

## Pré-requisitos

```bash
node --version    # >= 18 (projeto usa 24.14.1)
npm --version     # >= 9
firebase --version    # Firebase CLI

# Instalar CLI se não tiver:
npm install -g firebase-tools

# Autenticar (uma vez):
firebase login
```

## Deploy completo (recomendado)

Script único na raiz do projeto:

```cmd
deploy.bat
```

O que faz:
1. `cd frontend && npm run build` (Vite build)
2. `firebase deploy --only hosting`
3. Mostra URL final

Cuidado: o `deploy.bat` **só faz hosting**. Para regras, ver abaixo.

## Deploy parcial — apenas hosting (frontend)

```bash
cd frontend
npm run build

cd ..
firebase deploy --only hosting
```

Saída esperada:
```
+  hosting[pontual-logistica]: file upload complete
+  hosting[pontual-logistica]: version finalized
+  hosting[pontual-logistica]: release complete
+  Deploy complete!
Hosting URL: https://pontual-logistica.web.app
```

## Deploy parcial — apenas regras (firestore.rules)

```bash
firebase deploy --only firestore:rules
```

Saída esperada:
```
+  cloud.firestore: rules file firestore.rules compiled successfully
+  firestore: released rules firestore.rules to cloud.firestore
+  Deploy complete!
```

⚠️ As regras valem **imediatamente** após o deploy. Se quebrar a regra, usuários perdem acesso na mesma hora. Sempre testar localmente antes (ver abaixo).

## Deploy parcial — apenas índices Firestore

```bash
firebase deploy --only firestore:indexes
```

(Hoje não há índices compostos declarados. Quando aparecer erro "needs an index", criar via Firebase Console, exportar para `firestore.indexes.json` e versionar.)

## Deploy de tudo de uma vez

```bash
firebase deploy
```

Faz: hosting + firestore:rules + firestore:indexes + storage:rules (se houver).

## Rollback

### Rollback do hosting

Cada deploy gera uma versão arquivada. Para reverter:

1. Firebase Console → Hosting
2. Histórico de versões
3. Clique nos três pontos da versão anterior → **Reverter**

Reverte em segundos. Não afeta dados nem regras.

### Rollback de regras

Não há histórico automático. Mantenha versões anteriores em git (`git log firestore.rules`) e:

```bash
git show HEAD~1:firestore.rules > firestore.rules.bak
mv firestore.rules.bak firestore.rules
firebase deploy --only firestore:rules
```

## Teste de regras localmente

Antes de fazer deploy de regras de produção, validar com o emulator:

```bash
# Instalar emulator suite (uma vez)
firebase init emulators

# Rodar
firebase emulators:start --only firestore
```

Acesse http://localhost:4000 para testar regras com diferentes UIDs/perfis sem afetar produção.

## Configuração do projeto

### `firebase.json`

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "hosting": {
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

O **rewrite** garante que todas as URLs (`/frota`, `/usuarios`, etc.) caem no `index.html` para o React Router resolver client-side.

### `.firebaserc`

```json
{
  "projects": {
    "default": "pontual-logistica"
  }
}
```

Para alternar projetos: `firebase use <alias>`.

## Monitoramento

| Métrica | Onde acompanhar |
|---|---|
| Erros de regra | Firebase Console → Firestore → Regras → Erros |
| Uso (leituras/escritas) | Firebase Console → Firestore → Uso |
| Tráfego hosting | Firebase Console → Hosting → Estatísticas |
| Auth (logins/falhas) | Firebase Console → Authentication → Usage |
| Tier free atual | 50k leituras/dia, 20k escritas/dia, 10GB hosting |

## Política de senhas e usuários

- Criar usuários **apenas pela tela `/usuarios`** (logado como Super Admin) — não pelo console
- Reset de senha: motorista/usuário pede ao admin → admin gera nova senha no console:
  - Firebase Console → Authentication → Users → ⋮ → **Redefinir senha**
- Bloquear acesso sem deletar: marcar `ativo: false` na tela de usuários (preserva histórico)

## Custo

| Item | Tier free | Custo extra |
|---|---|---|
| Authentication | 50k MAU | Inicia em $0,055/MAU acima |
| Firestore leituras | 50.000/dia | $0,06 por 100k acima |
| Firestore escritas | 20.000/dia | $0,18 por 100k acima |
| Firestore armazenamento | 1 GB | $0,18/GB/mês acima |
| Hosting | 10 GB/mês, 360 MB armazenado | $0,15/GB acima |

Para o tamanho atual da operação (3 despachantes, ~30 motoristas, ~37 caminhões), o uso fica **dentro do tier gratuito** com folga.

## Checklist pré-deploy

Antes de cada deploy de produção:

- [ ] Rodar `npm run build` local — verificar 0 erros
- [ ] Testar a feature no dev local (`npm run dev`)
- [ ] Se mudou `firestore.rules`: testar com emulator
- [ ] Verificar `git status` — sem arquivos sensíveis (`serviceAccountKey.json`, `.env`)
- [ ] Confirmar `.firebaserc` aponta para `pontual-logistica`
- [ ] Após deploy, abrir em aba anônima — Ctrl+Shift+R
- [ ] Smoke test: login → dashboard → entrar em 2 módulos críticos

## Troubleshooting de deploy

### "Permission denied" ao deployar
```bash
firebase login --reauth
```

### "Project not found"
```bash
firebase projects:list
firebase use pontual-logistica
```

### Build falha com `out of memory`
```bash
# Aumentar memória do Node
set NODE_OPTIONS=--max-old-space-size=4096
npm run build
```

### Rewrite não funciona — F5 dá 404
Confirmar que `firebase.json` tem o bloco `rewrites` apontando todas as rotas para `/index.html`.

### Mudança não aparece após deploy
- Pressione **Ctrl + Shift + R** (reload sem cache)
- Aba anônima (Ctrl + Shift + N)
- DevTools → Network → marcar "Disable cache"
- Aguardar 5-10 min — Firebase tem CDN global, propagação não é instantânea

---

## Relacionado

- Anterior: [[05-seguranca-rbac]]
- Próximo: [[07-scripts]]
- [[INDICE|🏠 Voltar ao índice]]
- [[CLAUDE|📖 Contexto do sistema]]
- [[MEMORY|🧠 Memórias]]
