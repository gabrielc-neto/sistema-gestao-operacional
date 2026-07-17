---
name: project-modulo-compras-branch-supabase
description: Módulo Compras existe pronto na branch feat/migracao-supabase (1023 linhas Compras.jsx + 80 utils/compras.js). Cherry-pick recomendado antes da migração Laravel
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## O que existe

Na branch `feat/migracao-supabase` (commit `5c3663f — feat: modulo Compras, barra de exportacao e ajustes de UI/RBAC`):

- **`frontend/src/pages/Compras.jsx`** — 1023 linhas — módulo completo de compras (pedidos, fornecedores, itens, aprovação, histórico)
- **`frontend/src/utils/compras.js`** — 80 linhas — helpers
- Ajustes em `rbac/permissoes-catalogo.js` +32 linhas — provavelmente adicionou permissões `compras.ver/criar/aprovar/etc`

## Why

Compras é módulo grande já pronto. Se master perder tempo redesenvolvendo do zero é retrabalho puro. Trazer pro master AGORA (antes da migração Laravel) faz sentido porque:
- Vai virar tabela MySQL na migração — mais fácil migrar SQL de uma tela que já funciona
- Dá pra usar em produção enquanto backend Laravel é construído em paralelo
- Se esperar migração, atrasa mais 3 meses

## How to apply

**Cherry-pick recomendado (na ordem):**
1. `git cherry-pick 5c3663f` — traz Compras + ExportBar + ajustes RBAC de uma vez
2. Resolver conflitos (provavelmente em `App.jsx` pela rota + `permissoes-catalogo.js`)
3. Testar: `/compras` deve carregar; permissões `compras.*` devem aparecer no Cargos
4. NÃO trazer outros commits dessa branch — ver [[feedback-branch-supabase-nao-merge-tudo]]

**Cuidado com Firestore:**
- Compras.jsx provavelmente usa Firestore (`db.collection('compras')`). Se sim, funciona no master
- Se usar `supabase.from('compras')`, precisa reescrever a camada de dados antes de merge

## Onde ver o diff

```bash
git diff origin/master..origin/feat/migracao-supabase -- frontend/src/pages/Compras.jsx | head -50
```

Ver também: [[feedback-branch-supabase-nao-merge-tudo]] · [[project-migracao-laravel-hostinger]]
