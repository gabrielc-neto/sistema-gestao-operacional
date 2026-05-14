# Sistema Logística IA — Distribuidora de Petróleo

## Contexto da Empresa

- **Setor**: Distribuidora de combustíveis (petróleo)
- **Clientes**: 60+ postos bandeira branca
- **Frota**: ~37 caminhões (simples, bitrem, rodotrem)
- **Capacidade máxima**: 35.000 litros por veículo
- **Compartimentos**: multi-setas (múltiplos produtos por caminhão)
- **Produtos**: Anidro, S10, S500, Gasolina e similares (só líquidos)
- **Motoristas**: todos têm celular (Android/iPhone)
- **Equipe de despacho**: 3 despachantes simultâneos
- **Tecnologia atual**: Excel + SASCAR (rastreamento e jornada)
- **NF-e**: sim, emite nota fiscal eletrônica
- **Sistema atual**: NENHUM — construindo do zero

## Operação Crítica — Carga de Retorno

Quando caminhão fica vazio na rota, gestor detecta posição via SASCAR
e envia ordem para carregar em usina e retornar com nova carga.
Sistema precisa suportar despacho dinâmico em tempo real.

## Decisões Técnicas

| Componente | Tecnologia | Status |
|---|---|---|
| Backend | Python (FastAPI) | Definido |
| Banco de dados | Firebase Firestore | Mudado em 2026-05-07 (era PostgreSQL) |
| Frontend | React | Definido |
| App motorista | PWA (web no celular) | Definido |
| Integração | SASCAR API | Planejado |
| Hospedagem | Local (dev) → VPS depois | Em dev local |

## Ambiente do Desenvolvedor

- OS: Windows 10 Pro
- Python: 3.14.4
- Node.js: v24.14.1
- Git: 2.53.0
- Banco: Firebase Firestore + Firebase Authentication (nuvem, sem instalar nada)
- Disco C: liberado (~5GB livres após limpeza em 2026-05-05)

## Fases do Projeto

### Fase 1A — Base Operacional (semanas 1-4)
- [ ] PostgreSQL instalado na máquina 2 e configurado
- [ ] Acesso remoto: pg_hba.conf + postgresql.conf + firewall porta 5432
- [ ] Estrutura do banco de dados
- [ ] Cadastro: veículos + compartimentos
- [ ] Cadastro: motoristas
- [ ] Cadastro: clientes (postos)
- [ ] Cadastro: produtos
- [ ] Cadastro: usinas
- [ ] Registro de pedidos

### Fase 1B — Despacho (semanas 4-6)
- [ ] Ordem de carregamento (substitui Excel)
- [ ] Montagem de rota com paradas
- [ ] Romaneio PDF digital
- [ ] Painel dos 3 despachantes (tempo real)

### Fase 2A — App Motorista (semanas 6-8)
- [ ] PWA: ver ordem do dia
- [ ] Confirmar entrega por compartimento
- [ ] Registrar ocorrências

### Fase 2B — Integrações (semanas 8-10)
- [ ] SASCAR: posição em tempo real
- [ ] SASCAR: alerta de jornada
- [ ] NF-e: leitura e conciliação

### Fase 2C — Carga Dinâmica (semanas 10-12)
- [ ] Detecção de caminhão vazio
- [ ] Despacho de ordem de retorno
- [ ] Histórico de viagens

### Fase 3 — IA (meses 4-6)
- [ ] Previsão de demanda por posto
- [ ] Otimização de rotas
- [ ] Detecção de anomalias (litros divergentes)
- [ ] Alertas preditivos

## Modelo de Dados Principal

```
VEICULO
  placa, tipo (simples/bitrem/rodotrem), capacidade_total
  COMPARTIMENTOS: numero, capacidade_litros, produto_atual

MOTORISTA
  nome, cnh, categoria, telefone, status_jornada

CLIENTE (posto)
  razao_social, cnpj, endereco, coordenadas, contato

PRODUTO
  nome, codigo_anp, unidade (litros)

USINA
  nome, endereco, coordenadas, produtos_disponiveis[]

PEDIDO
  cliente, produto, litros, data_solicitada, status, nfe_vinculada

ORDEM_CARREGAMENTO
  veiculo, motorista, usina_origem, despachante
  ITENS: compartimento, produto, litros
  PARADAS: sequencia, cliente, compartimentos[], litros, status

VIAGEM
  ordem, status (aguardando/carregando/em_rota/vazio/concluida)
  posicao_sascar, historico_eventos[]
```

## Visão Comercial — SaaS

- Sistema será vendido para outras empresas (distribuidoras, transportadoras) como SaaS
- Arquitetura já deve prever **multi-tenancy** — cada empresa isolada no Firebase
- Cobrança via **Stripe** (cartão/Pix/boleto) — só ativar quando for vender
- Registro de software no **INPI** (programa de computador) — ~R$ 80, pessoa física, `inpi.gov.br`
- Copyright em todos os arquivos: `© 2026 [Nome do Dono]. Todos os direitos reservados.`
- Se tiver sócio/empresa usando: contrato formal de licença de uso

## Segurança do Sistema

- Firebase Authentication → token JWT por sessão
- FastAPI valida token em toda requisição (quem é + tem permissão?)
- Firestore Rules → dupla proteção mesmo se API for bypassada
- HTTPS em tudo — dado viaja criptografado
- Log de auditoria completo — toda ação rastreável
- Dados por empresa isolados (multi-tenancy)

## Requisitos de UX / Comportamento

1. **Log de auditoria completo** — toda ação registrada: quem, o quê, quando, valor antes/depois
   - Editar placa, atrelar, desatrelar, criar OC, alterar usuário — tudo logado
2. **Sincronização em tempo real** — Firebase `onSnapshot`
   - Atrelar carreta → painel frota atualiza automaticamente para todos
   - Desatrelar → placa some do cavalo em tempo real
   - Sem precisar recarregar página
3. **Identidade visual Pontual** — definir antes de construir o frontend
   - Logo, cores hex, tipografia — aguardando arquivo/site do usuário

## Regras de Negócio Importantes

1. Caminhão com jornada no limite NÃO pode ser despachado
2. Compartimento só carrega 1 produto por vez
3. Ordem de carregamento bloqueia veículo para outros despachantes
4. Litros entregues devem ser conciliados com NF-e emitida
5. Carga de retorno: caminhão vazio + posição SASCAR → nova ordem possível

## Status Atual — 2026-05-07

### Decisões confirmadas:
- Banco migrado de PostgreSQL → **Firebase Firestore** (nuvem, sem servidor local)
- Autenticação: **Firebase Authentication** (email/senha)
- Controle de acesso: **RBAC granular** Usuário → Setor → Cargo → Permissões
- Admin cria usuários e atribui setor+cargo; cargos têm array de permissões `<modulo>.<acao>`
- Sistema cresce modularmente — novos módulos sem quebrar o que funciona
- Frota atual (`Desktop\frota_pontual.html`) vai migrar localStorage → Firestore

### Próximos passos:
1. Criar projeto no Firebase Console (`console.firebase.google.com`) → nome: `pontual-logistica`
2. Ativar Firebase Authentication (email/senha)
3. Ativar Firestore Database
4. Montar estrutura de coleções + regras de segurança
5. Criar painel de login + gerenciamento de usuários (admin)

## RBAC — Controle de Acesso

Documentação completa em `frontend/src/rbac/README.md`.

### Resumo

| Coleção | Conteúdo |
|---|---|
| `setores` | Departamentos (Logística, RH, Financeiro, ...) |
| `cargos` | Cargo por setor com array `permissoes: string[]` denormalizado |
| `permissoes_catalogo` | Catálogo de permissões `<modulo>.<acao>` |
| `usuarios` | + campos `setor_id`, `cargo_id`, `is_super_admin` |

### Como usar

```jsx
// Hook
import { useRBAC } from "@/rbac/RBACContext";
const { temPermissao } = useRBAC();
if (temPermissao("cargos.editar")) { ... }

// Componente
import ProtegerPor from "@/rbac/ProtegerPor";
<ProtegerPor permissao="cargos.editar"><BotaoEditar /></ProtegerPor>

// Rota
<Route path="/financeiro" element={
  <Privada permissao="financeiro.ver"><Financeiro /></Privada>
} />
```

### Telas administrativas

- `/admin/setores` — CRUD de setores
- `/admin/cargos` — CRUD de cargos + atribuir permissões (checkbox tree)
- `/usuarios` — Usuários com setor + cargo dinâmico + toggle Super Admin

### Seed inicial

```bash
python scripts/seed_rbac.py
```

Popula 6 setores, 12 cargos e ~60 permissões. Idempotente — pode rodar várias vezes.

### Super Admin

Usuário com `is_super_admin = true` ignora qualquer validação. Durante migração, `role: master`/`admin` legado também conta como Super Admin.
