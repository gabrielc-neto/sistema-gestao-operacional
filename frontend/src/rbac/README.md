# RBAC — Controle de Acesso Baseado em Papéis

Sistema de permissões granulares para o Logística IA.

## Modelo

```
Usuário → Setor → Cargo → Permissões
```

- **Setor**: agrupador organizacional (Logística, RH, Financeiro, …)
- **Cargo**: função dentro do setor, possui um array de permissões
- **Permissão**: string no formato `<modulo>.<acao>` (ex: `cargos.editar`)
- **Super Admin**: usuário com `is_super_admin = true` ignora qualquer validação

## Coleções Firestore

| Coleção | Documento | Campos principais |
|---|---|---|
| `setores` | id auto | nome, descricao, status, created_at, updated_at |
| `cargos` | id auto | setor_id, nome, nivel, descricao, status, **permissoes[]**, created_at, updated_at |
| `permissoes_catalogo` | `<modulo>.<acao>` | nome, descricao, modulo, acao |
| `usuarios` | uid Firebase Auth | nome, email, setor_id, cargo_id, is_super_admin, ativo, role (legacy) |

> Permissões ficam denormalizadas dentro do cargo (`permissoes: string[]`) — 1 leitura do cargo já traz tudo, em vez de joins.

## Como usar no frontend

### 1. Hook de permissão única

```jsx
import { usePermissao } from "@/rbac/usePermissao";

function BotaoEditar() {
  const pode = usePermissao("cargos.editar");
  if (!pode) return null;
  return <button>Editar</button>;
}
```

### 2. Componente declarativo

```jsx
import ProtegerPor from "@/rbac/ProtegerPor";

<ProtegerPor permissao="cargos.editar">
  <BotaoEditar />
</ProtegerPor>

<ProtegerPor algumaDe={["financeiro.ver","financeiro.editar"]} fallback={<p>Sem acesso</p>}>
  <PainelFinanceiro />
</ProtegerPor>
```

### 3. Proteção de rotas

```jsx
// App.jsx
<Route path="/financeiro" element={
  <Privada permissao="financeiro.ver">
    <Financeiro />
  </Privada>
} />
```

### 4. API completa do hook

```jsx
import { useRBAC } from "@/rbac/RBACContext";

const { setor, cargo, permissoes, isSuperAdmin, temPermissao, temAlguma, temTodas, loading } = useRBAC();
```

## Catálogo de permissões

Definido em `permissoes-catalogo.js`. Para cada módulo são geradas as ações `ver`, `criar`, `editar`, `excluir`. Permissões especiais (ex: `oc.aprovar`, `financeiro.aprovar`) ficam em `EXTRAS`.

Ao adicionar nova permissão:
1. Acrescente em `permissoes-catalogo.js` (módulo ou EXTRAS)
2. Espelhe em `scripts/seed_rbac.py` (mesma lista)
3. Rode `python scripts/seed_rbac.py` para popular no Firestore
4. Use `temPermissao('novo.permissao')` no código

## Compatibilidade durante migração

Durante a transição, o sistema mantém:

- O campo `role` legado nos usuários (vazio para novos cadastros)
- Usuários com `role` `master`/`admin` recebem `is_super_admin` automaticamente
- A tela `/permissoes` (legada, matriz role × módulo) continua funcionando
- `usePermissions().canView('frota')` é redirecionado para `temPermissao('frota.ver')`

Quando todos os usuários tiverem `setor_id` + `cargo_id`, pode-se:
1. Remover o campo `role` dos documentos
2. Apagar `contexts/PermissionsContext.jsx`
3. Migrar `pages/Permissoes.jsx` ou remover

## Seed inicial

```bash
# baixar serviceAccountKey.json em Firebase Console > Contas de serviço
python scripts/seed_rbac.py
```

Cria:
- 50+ permissões no catálogo
- 6 setores (Logística, Operação, RH, Financeiro, Comercial, Faturamento)
- 12 cargos com permissões pré-configuradas

## Regras Firestore

Em `firestore.rules`, o helper `temPermissao(p)` lê o `cargo_id` do usuário e checa se `p` está no array `permissoes` do cargo. Super Admin ignora tudo.

```js
function temPermissao(p) {
  return isSuperAdmin()
    || (isAtivo()
        && userDoc().cargo_id is string
        && p in cargoPermissoes());
}
```
