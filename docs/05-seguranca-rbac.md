# 05 — Segurança e RBAC

[← Voltar para o índice](README.md)

## Modelo RBAC

```
Usuário → Setor → Cargo → Permissões
```

| Conceito | Descrição |
|---|---|
| **Setor** | Departamento da empresa (Logística, Operação, RH, Financeiro, Comercial, Faturamento) |
| **Cargo** | Função dentro do setor (Gestor, Supervisor, Operador, …) |
| **Permissão** | String `<modulo>.<acao>` (ex: `cargos.editar`) |
| **Super Admin** | Usuário com `is_super_admin: true` — ignora qualquer validação |

> Documentação detalhada dos componentes React: [`../frontend/src/rbac/README.md`](../frontend/src/rbac/README.md).

## Catálogo de permissões

Total: **60 permissões** geradas a partir de:

**14 módulos × 4 ações padrão** (`ver`, `criar`, `editar`, `excluir`) **+ 4 permissões extras**.

| Módulo | Ações disponíveis |
|---|---|
| dashboard, frota, motoristas, atrelamento, oc, manutencao, ferias, historico, relatorios, financeiro, usuarios, setores, cargos, permissoes | `ver`, `criar`, `editar`, `excluir` |
| relatorios | + `exportar` |
| financeiro | + `aprovar` |
| oc | + `aprovar` |
| historico | + `exportar` |

Catálogo centralizado em:
- Frontend: `frontend/src/rbac/permissoes-catalogo.js`
- Backend: `scripts/seed_rbac.py` (mesma lista, sincronizada)
- Firestore: coleção `permissoes_catalogo`

## Fluxo de autorização

```
Usuário tenta acessar /financeiro
   │
   ▼
[1] React Router monta <RotaProtegida permissao="financeiro.ver">
       │
       ▼
[2] RBACContext já carregou:
    profile.is_super_admin? → ignora tudo, permite
    permissoes = cargo.permissoes (array)
       │
       ▼
[3] temPermissao("financeiro.ver") → true/false
       │
   permitido: renderiza      negado: <Navigate to="/dashboard" />
       │
       ▼
[4] Página tenta ler /clientes do Firestore
       │
       ▼
[5] firestore.rules valida temPermissao() do lado servidor
    (mesma lógica, mas no Firestore — não confia no cliente)
       │
       ▼
Permitido: retorna dados | Negado: PermissionDeniedError
```

## Como usar — Frontend

### Hook simples
```jsx
import { usePermissao } from "@/rbac/usePermissao";

function BotaoEditar() {
  const pode = usePermissao("oc.editar");
  if (!pode) return null;
  return <button>Editar OC</button>;
}
```

### Componente declarativo
```jsx
import ProtegerPor from "@/rbac/ProtegerPor";

<ProtegerPor permissao="oc.aprovar">
  <BotaoAprovar />
</ProtegerPor>

<ProtegerPor algumaDe={["financeiro.ver","financeiro.editar"]}>
  <MenuFinanceiro />
</ProtegerPor>

<ProtegerPor todasDe={["oc.editar","oc.aprovar"]} fallback={<p>Sem acesso</p>}>
  <Aprovacao />
</ProtegerPor>
```

### Guarda de rota
```jsx
<Route path="/oc" element={
  <Privada permissao="oc.ver">
    <OC />
  </Privada>
} />
```

### API completa
```jsx
const {
  setor, cargo, permissoes,            // dados do usuário
  isSuperAdmin, loading,
  temPermissao,                         // (string) → bool
  temAlguma,                            // (string[]) → bool
  temTodas,                             // (string[]) → bool
} = useRBAC();
```

## Como usar — Firestore Rules

O `firestore.rules` define helpers que espelham a lógica do frontend:

```javascript
function logado() { return request.auth != null; }

function userDoc() {
  return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data;
}

function isSuperAdmin() {
  return logado() && (
    userDoc().is_super_admin == true
    || userDoc().role in ['master','admin']     // legacy fallback
  );
}

function isAtivo() {
  return logado() && userDoc().get('ativo', true) == true;
}

function cargoPermissoes() {
  return get(/databases/$(database)/documents/cargos/$(userDoc().cargo_id))
         .data.get('permissoes', []);
}

function temPermissao(p) {
  return isSuperAdmin()
    || (isAtivo()
        && userDoc().cargo_id is string
        && p in cargoPermissoes());
}
```

Cada coleção usa o helper:

```javascript
match /ordens_carregamento/{id} {
  allow read:   if temPermissao('oc.ver');
  allow create: if temPermissao('oc.criar');
  allow update: if temPermissao('oc.editar') || temPermissao('oc.aprovar');
  allow delete: if temPermissao('oc.excluir');
}
```

## Super Admin

**Como funciona:**
- Campo `is_super_admin: true` no documento `usuarios/{uid}`
- O `RBACContext` detecta e seta `isSuperAdmin = true`
- `temPermissao(qualquer)` retorna `true`
- `firestore.rules` faz o mesmo bypass do lado servidor

**Compatibilidade legacy:** usuários com `role: master` ou `role: admin` (criados pelo `seed_masters.py` antigo) são tratados como Super Admin **automaticamente** durante a migração.

**Quando promover alguém:**
1. Logado como Super Admin atual, acesse `/usuarios`
2. Edite o usuário → marque o checkbox **"Super Admin (ignora todas as permissões)"**
3. Salve

## Multi-tenancy futura

A regra `temPermissao()` atual não filtra por empresa porque o sistema ainda atende **uma empresa só** (Pontual Logística). Quando o sistema for vendido como SaaS, a regra evoluirá:

```javascript
function pertenceEmpresa(docEmpresaId) {
  return userDoc().empresa_id == docEmpresaId;
}

match /empresas/{empresaId}/veiculos/{id} {
  allow read: if pertenceEmpresa(empresaId) && temPermissao('frota.ver');
  ...
}
```

## Princípios de segurança aplicados

| Princípio | Implementação |
|---|---|
| **Defense in depth** | Validação no front (UX) + no Firestore Rules (autoridade) |
| **Menor privilégio** | Permissões granulares por ação, não bloco "admin/user" |
| **Separação de credenciais** | `serviceAccountKey.json` (admin) separado do `firebaseConfig` (cliente) |
| **Auditoria** | Coleção `historico` registra ações relevantes |
| **Identidade rastreável** | Firebase Auth UID como chave do documento de usuário |
| **Soft delete** | Usuários são desativados (`ativo: false`), não excluídos |
| **Senha forte (mínimo 6)** | Reforçado no front; Firebase impõe regras adicionais |
| **Limite de tentativas** | Login bloqueia após 5 tentativas falhas |
| **Sessão Firebase** | Token JWT auto-renovado, expira em horas |

## O que NÃO é coberto pelo RBAC

- **Row-level filtering**: o RBAC controla "pode ler a coleção?", não "pode ler ESTE doc específico". Se o usuário tem `motoristas.ver`, vê todos os motoristas.
- **Edição parcial de campos**: se tem `editar`, pode alterar qualquer campo.
- **Auditoria automática**: o `historico` precisa ser populado manualmente pelas páginas; não há hook global.

Esses pontos podem evoluir conforme a operação crescer.

## Lista de permissões reais usadas

Para evitar typos, todas as permissões válidas estão em `frontend/src/rbac/permissoes-catalogo.js`. Ao adicionar uma nova:

1. Acrescentar em `permissoes-catalogo.js` (campo `MODULOS` ou `EXTRAS`)
2. Espelhar em `scripts/seed_rbac.py`
3. Rodar `python scripts/seed_rbac.py` (idempotente)
4. Usar no código

## Renovação da chave admin

Se o `serviceAccountKey.json` for comprometido:

1. Firebase Console → Configurações → Contas de serviço
2. Clique no menu ⋮ ao lado da chave atual → **Excluir**
3. Clique em **Gerar nova chave privada**
4. Salve em `scripts/serviceAccountKey.json` (sobrescrevendo)

A chave excluída deixa de funcionar imediatamente.

---

## Relacionado

- Anterior: [[04-modulos]]
- Próximo: [[06-deploy]]
- [[INDICE|🏠 Voltar ao índice]]
- [[CLAUDE|📖 Contexto do sistema]]
- [[MEMORY|🧠 Memórias]]
