# 02 — Arquitetura

[← Voltar para o índice](README.md)

## Stack tecnológica

| Camada | Tecnologia | Versão | Observação |
|---|---|---|---|
| Linguagem frontend | JavaScript ES2022 | — | sem TypeScript (decisão por velocidade inicial) |
| Framework UI | React | 19.2.5 | hooks + functional components |
| Build tool | Vite | 8.0.11 | usando Rolldown como bundler |
| Roteamento | react-router-dom | 7.15.0 | BrowserRouter, lazy routes |
| Ícones | lucide-react | 1.14.0 | tree-shakeable |
| Backend | Firebase Firestore | 12.13.0 | NoSQL, real-time |
| Autenticação | Firebase Authentication | 12.13.0 | email/senha |
| Hosting | Firebase Hosting | — | CDN global, HTTPS automático |
| Storage | Firebase Storage | — | preparado, ainda não usado |
| Linguagem scripts | Python | 3.14.4 | seeds, imports, manutenção |
| SDK Admin | firebase-admin (Python) | — | para operações privilegiadas |

## Decisões arquiteturais

### 1. Por que Firestore em vez de PostgreSQL?

A decisão original (2026-05-05) era PostgreSQL local em uma segunda máquina. Mudou para Firestore em **2026-05-07** pelos motivos:

- **Sem servidor para administrar**: zero downtime, zero backup manual
- **Real-time nativo**: `onSnapshot` substitui WebSocket custom
- **Auth integrada**: Firebase Authentication economiza JWT manual
- **Custo**: tier gratuito generoso (50k leituras/dia)
- **Multi-tenancy**: regras de segurança nativas já dão isolamento por tenant
- **Acesso remoto sem rede privada**: motoristas usam direto do celular

Trade-off: NoSQL exige **denormalização** (campos repetidos em vários docs). Aceito porque a estrutura é estável.

### 2. Por que sem TypeScript?

Velocidade no início. O escopo está bem mapeado e o time é pequeno. Adicionar TS é simples no futuro — basta renomear `.jsx → .tsx` e ir tipando incrementalmente.

### 3. Por que Vite 8 + Rolldown?

- Build em < 1s para o projeto inteiro
- HMR (hot module replacement) instantâneo
- Rolldown (Rust) já estável o suficiente para produção

### 4. Por que sem framework de UI (sem MUI, Mantine, etc.)?

CSS inline com `const styles = { ... }`. Razões:

- Bundle menor (sem 100kb+ de CSS-in-JS)
- Zero conflito de versões de UI lib
- Identidade visual Pontual (cores hex específicas) sem fight contra defaults

Tema dark/light via CSS Custom Properties (`var(--bg)`, `var(--text)`) controladas pelo `ThemeContext`.

## Camadas do frontend

```
┌──────────────────────────────────────────────────┐
│ pages/         ← rotas (Login, Dashboard, Frota...) │
├──────────────────────────────────────────────────┤
│ rbac/          ← controle de acesso granular        │
│ contexts/      ← Auth, Permissions (legacy), Theme  │
│ components/    ← reutilizáveis (LogoPontual, Menu)  │
├──────────────────────────────────────────────────┤
│ firebase/      ← config + SDKs                     │
└──────────────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────────────┐
│ Firebase Auth         Firestore        Hosting    │
└──────────────────────────────────────────────────┘
```

### Provedores aninhados no `App.jsx`

```jsx
<ThemeProvider>
  <AuthProvider>
    <RBACProvider>
      <PermissionsProvider>   ← wrapper legado (mantido p/ compatibilidade)
        <BrowserRouter>
          <Routes>...</Routes>
        </BrowserRouter>
      </PermissionsProvider>
    </RBACProvider>
  </AuthProvider>
</ThemeProvider>
```

Ordem importa: `AuthProvider` precisa estar acima de `RBACProvider` (que consome user/profile).

## Fluxo de autenticação

```
1. Login.jsx
   └─→ signInWithEmailAndPassword(auth, email, senha)
         └─→ Firebase Auth retorna ID token

2. AuthContext (onAuthStateChanged)
   └─→ getDoc(usuarios/{uid})
         └─→ profile = { nome, email, role, setor_id, cargo_id, is_super_admin, ativo }

3. RBACContext (efeito reactivo a profile)
   └─→ getDoc(setores/{setor_id})  +  getDoc(cargos/{cargo_id})
         └─→ permissoes = cargo.permissoes  (array de strings)

4. Componentes usam temPermissao("modulo.acao") em tempo real
5. Firestore Rules validam novamente do lado do servidor
```

## Fluxo de dados — exemplo de criação de OC

```
[Frontend: OC.jsx]
  ├─ usuário preenche formulário
  ├─ valida campos obrigatórios
  ├─ addDoc(collection(db, "ordens_carregamento"), { ... })
  │
[Firestore]
  ├─ firestore.rules avalia temPermissao("oc.criar")
  ├─ se ok, escreve doc
  ├─ dispara onSnapshot em todos os clientes conectados
  │
[Dashboard de outros usuários]
  └─ contador "OCs hoje" atualiza automaticamente
```

## Estrutura de pastas

```
logistica-ia/
├── frontend/                     ← React SPA
│   ├── src/
│   │   ├── App.jsx              ← rotas + providers
│   │   ├── main.jsx             ← entry point
│   │   ├── firebase/config.js   ← apiKey, projectId, etc.
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── PermissionsContext.jsx  ← legado
│   │   │   └── ThemeContext.jsx
│   │   ├── rbac/                ← RBAC granular (sistema novo)
│   │   │   ├── RBACContext.jsx
│   │   │   ├── ProtegerPor.jsx
│   │   │   ├── RotaProtegida.jsx
│   │   │   ├── usePermissao.js
│   │   │   ├── permissoes-catalogo.js
│   │   │   └── README.md
│   │   ├── pages/
│   │   │   ├── Login.jsx, Dashboard.jsx
│   │   │   ├── Frota.jsx, Motoristas.jsx, Atrelamento.jsx
│   │   │   ├── OC.jsx, Manutencao.jsx, Ferias.jsx
│   │   │   ├── Historico.jsx, Usuarios.jsx
│   │   │   ├── Permissoes.jsx     ← legado
│   │   │   ├── ImportAdmin.jsx
│   │   │   └── admin/
│   │   │       ├── Setores.jsx
│   │   │       └── Cargos.jsx
│   │   ├── components/
│   │   │   ├── LogoPontual.jsx
│   │   │   └── SettingsMenu.jsx
│   │   └── data/                ← seed estático (frota inicial)
│   ├── dist/                    ← build output
│   ├── public/                  ← favicon, icons
│   └── package.json
│
├── scripts/                     ← scripts Python (admin)
│   ├── seed_masters.py          ← cria usuários admin iniciais
│   ├── seed_rbac.py             ← popula setores/cargos/permissoes
│   ├── check_rbac.py            ← valida dados no Firestore
│   ├── importar_frota.py        ← migra frota do HTML antigo
│   ├── migrar_calibragem.py     ← migração one-off
│   ├── corrigir_tacografo.py    ← correção one-off
│   ├── deploy_rules.py          ← deploy alternativo
│   └── serviceAccountKey.json   ← credencial admin (não commitado)
│
├── firestore.rules              ← regras de segurança
├── firebase.json                ← config Firebase Hosting + Firestore
├── .firebaserc                  ← projeto: pontual-logistica
├── deploy.bat                   ← script de deploy Windows
├── CLAUDE.md                    ← contexto para agentes Claude
└── docs/                        ← esta documentação
```

## Real-time e sincronização

Atualmente o projeto usa `getDocs()` (one-shot) com refresh por `visibilitychange` e polling de 60s no Dashboard. **Próxima evolução**: migrar leituras críticas (Frota, OC, Atrelamento) para `onSnapshot()` real-time.

Isso vai permitir:
- Atrelar carreta → painel de todos os despachantes atualiza instantaneamente
- Sem necessidade de F5 / botão "Atualizar"

## Multi-tenancy (planejado)

Para venda como SaaS, a estrutura prevê isolamento por empresa:

**Opção 1 — Subcoleção por tenant** (recomendada quando ativar):
```
empresas/{empresaId}/veiculos/{veiculoId}
empresas/{empresaId}/motoristas/{motoristaId}
empresas/{empresaId}/ordens_carregamento/{ocId}
...
```

**Opção 2 — Campo `empresa_id` em cada doc** (mais simples, menos isolada).

Hoje todas as coleções são root (uma empresa só). Migração futura via script Python que move docs para subcoleções.

## Performance

| Métrica | Valor |
|---|---|
| Build time | < 1s (Vite + Rolldown) |
| Bundle inicial (gzipped) | ~210 kB (react + firebase + app) |
| Maior chunk lazy | ImportAdmin: 102 kB |
| Tempo de boot estimado | 1-2s em 3G |
| Limite Firestore tier free | 50k leituras/dia, 20k escritas/dia |

---

## Relacionado

- Anterior: [[01-visao-geral]]
- Próximo: [[03-modelo-dados]]
- [[INDICE|🏠 Voltar ao índice]]
- [[CLAUDE|📖 Contexto do sistema]]
- [[MEMORY|🧠 Memórias]]
