# Sistema de Gestão Operacional — versão PHP (Laravel + MySQL)

Conversão do sistema original (Firebase + React + Cloud Functions Node.js) para
**PHP 8.2 / Laravel 11 + MySQL/MariaDB**.

© 2026 Pontual Petróleo. Todos os direitos reservados.

---

## 1. O que já está pronto nesta entrega

| Camada | Item | Status |
|---|---|---|
| **Banco** | Schema SQL completo (23 tabelas, FKs, índices, multi-tenancy) | ✅ `database/sql/01_schema.sql` |
| **Banco** | Seed RBAC (21 módulos × 4 ações + extras, 6 setores, 12 cargos), produtos, super admin | ✅ `database/sql/02_seed_rbac.sql` |
| **Auth** | Login/logout pela tabela `usuarios` (substitui Firebase Auth) | ✅ |
| **RBAC** | Middleware `perm:<modulo>.<acao>`, Gate, diretiva Blade `@perm` | ✅ |
| **Auditoria** | Log completo (quem/o quê/quando/antes/depois) em toda ação | ✅ |
| **Frota** | CRUD + bloqueio manual/OS + atrela motorista | ✅ |
| **Motoristas** | CRUD + vencimentos (CNH, MOPP, NR-20, NR-35) | ✅ |
| **Ordens de Serviço** | Abertura bloqueia veículo, edição só 24h, finalizar libera | ✅ (regra §6 do CLAUDE.md) |
| **Ordens de Carregamento** | CRUD + itens de entrega + valida veículo bloqueado | ✅ |
| **Manutenção** | Itens com vencimento (27 tipos) + status vencido/alerta/ok | ✅ |
| **Clientes / Produtos / Usinas** | CRUD | ✅ |
| **Histórico** | Tela de auditoria com filtros | ✅ |
| **SASCAR** | Cliente SOAP + comando agendado `sascar:sync` + geofencing portado | ✅ (estrutura; requer credenciais) |

### Ainda a fazer (próximas etapas)
- Telas administrativas de RBAC (Setores, Cargos, Usuários) — backend/DB já prontos
- Atrelamento (histórico ATR/DES/SUB) — tabela e model prontos, falta controller/views
- Férias — tabela e model prontos
- Mapa de Rastreamento e Cercas (Leaflet) — dados prontos, falta UI de mapa
- PWA do motorista, conciliação NF-e, módulo de IA (fase 3)

---

## 2. Pré-requisitos

- PHP 8.2+ com extensões `pdo_mysql`, `mbstring`, `openssl`, `soap` (ou `curl` p/ SASCAR)
- Composer 2
- MySQL 8 ou MariaDB 10.4+

---

## 3. Instalação

> O projeto usa o **scaffold padrão do Laravel** + estes arquivos de aplicação.
> O banco canônico é o **SQL em `database/sql/`** (importável via phpMyAdmin).

```bash
# 1) Criar o esqueleto do Laravel num diretório temporário
composer create-project laravel/laravel app-tmp

# 2) Copiar os arquivos desta pasta (app/, routes/, resources/, config/auth.php,
#    config/services.php, bootstrap/app.php, bootstrap/providers.php, composer.json,
#    .env.example) para dentro de app-tmp/, sobrescrevendo.

# 3) Dependências e chave
cd app-tmp
composer install
cp .env.example .env
php artisan key:generate

# 4) Banco de dados — criar e importar o SQL
mysql -u root -p -e "CREATE DATABASE pontual_logistica CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p pontual_logistica < database/sql/01_schema.sql
mysql -u root -p pontual_logistica < database/sql/02_seed_rbac.sql

# 5) Ajustar .env (DB_DATABASE, DB_USERNAME, DB_PASSWORD) e subir
php artisan serve
```

Acesse http://localhost:8000

> **Importante:** NÃO rode `php artisan migrate` — o schema vem do SQL acima.
> Apague os arquivos padrão em `database/migrations/` se preferir evitar confusão.

### Login inicial
- **E-mail:** `administrativo@pontualpetroleo.com.br`
- **Senha:** `password` → **troque após o primeiro acesso**

Para gerar outro hash de senha:
```bash
php -r "echo password_hash('SuaNovaSenha', PASSWORD_BCRYPT), PHP_EOL;"
```
e atualize a coluna `usuarios.password`.

---

## 4. Integração SASCAR (rastreamento)

1. Preencha no `.env`:
   ```
   SASCAR_USUARIO=seu_usuario
   SASCAR_SENHA=sua_senha
   ```
2. Habilite o agendador do Laravel (cron do sistema, 1×/min):
   ```cron
   * * * * * cd /caminho/do/projeto && php artisan schedule:run >> /dev/null 2>&1
   ```
   O comando `sascar:sync` busca posições, persiste a última por veículo e
   gera eventos de entrada/saída de cerca (geofencing).

---

## 5. Mapa Firestore → SQL

| Firestore (coleção) | SQL (tabela) | Observação |
|---|---|---|
| `usuarios` | `usuarios` | UID Firebase → `id` BIGINT; senha agora em bcrypt |
| `setores` / `cargos` | `setores` / `cargos` | — |
| `permissoes_catalogo` | `permissoes_catalogo` | — |
| `cargos.permissoes[]` (array) | `cargo_permissao` (pivot) | denormalizado → relacional |
| `veiculos` (+ `bloqueio` map) | `veiculos` (colunas `bloqueio_*`) | — |
| compartimentos (subdoc) | `compartimentos` | tabela própria |
| `motoristas` | `motoristas` | datas viram `DATE` |
| `clientes` / `produtos` / `usinas` | idem | coordenadas → `lat`/`lng` |
| `ordens_carregamento` (+ `entregas[]`) | `ordens_carregamento` + `oc_entregas` | array → tabela filha |
| `atrelamentos` | `atrelamentos` | — |
| `manutencoes` | `manutencoes` (+ `manutencao_anexos`) | status calculado no model |
| `ordens_servico` | `ordens_servico` | regras de bloqueio no controller |
| `ferias` | `ferias` | — |
| `viagens` | `viagens` + `viagem_eventos` | — |
| `sascar_posicoes` | `sascar_posicoes` | doc por `idVeiculo` → linha única |
| `cercas_eletronicas` / `cercas_eventos` | idem | `pontos` em coluna JSON |
| `historico` (consolidado em leitura) | `historico` | agora tabela real de auditoria |

### Equivalências de conceito
| Firebase / React | Laravel |
|---|---|
| Firebase Auth (JWT) | Sessão Laravel + `usuarios.password` bcrypt |
| Firestore Rules | Middleware `perm:` + escopo `empresa_id` |
| `onSnapshot` (tempo real) | Polling / recarregar (ou Laravel Echo no futuro) |
| Cloud Function agendada | `php artisan schedule:run` (cron) |
| RBAC `useRBAC()` / `temPermissao` | `@perm(...)` + `$user->temPermissao(...)` |
| Multi-tenancy por projeto | Coluna `empresa_id` em todas as tabelas |

---

## 6. Estrutura

```
sistema-php/
├── app/
│   ├── Console/Commands/SascarSync.php     # cron SASCAR
│   ├── Http/
│   │   ├── Controllers/                     # Frota, OC, OS, Manutenção...
│   │   └── Middleware/VerificaPermissao.php # RBAC
│   ├── Models/                              # 22 models Eloquent
│   ├── Providers/AppServiceProvider.php     # Gate + @perm
│   └── Services/                            # Auditoria, Geofence, Sascar
├── config/{auth,services}.php
├── database/sql/{01_schema,02_seed_rbac}.sql
├── resources/views/                         # Blade (layout + módulos)
├── routes/{web,console}.php
└── bootstrap/{app,providers}.php
```
