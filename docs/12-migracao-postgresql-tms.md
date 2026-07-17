o que # 12 — Migração para PostgreSQL + Arquitetura do TMS (produto SaaS)

[← voltar ao índice](README.md)

> **Status:** PLANO (decisão estratégica 2026-05-21). Nada implementado ainda.
> A Pontual continua rodando no sistema atual (Firebase) enquanto o produto novo é construído.

## 1. Decisão e contexto

| Pergunta | Resposta (Wesley, 2026-05-21) |
|----------|-------------------------------|
| Pra que serve o TMS? | **Produto pra vender** a outras transportadoras (SaaS multi-empresa) |
| Quem constrói? | **Wesley + Gabriel** agora; contratar mais quando validar |
| Banco escolhido | **PostgreSQL** (via Supabase) |

**Por que sair do Firestore:** um TMS é fortemente relacional/financeiro (pedidos→rotas→frete→fatura→cliente) e **multi-empresa** (isolamento de dados por transportadora). Isso é a força do PostgreSQL e a fraqueza do Firestore. Como vira produto, a base sólida importa mais que a rapidez do NoSQL.

## 2. Stack alvo — Supabase

Escolhido por entregar, num pacote gerenciado, tudo que precisamos sem time de infra:

| Componente | Tecnologia | Substitui no Firebase |
|------------|-----------|------------------------|
| Banco | **PostgreSQL** (Supabase) | Firestore |
| Isolamento multi-empresa | **Row-Level Security (RLS)** | Firestore rules |
| Login | **Supabase Auth** (importa usuários do Firebase com hash) | Firebase Authentication |
| Tempo real (mapa ao vivo) | **Supabase Realtime** | Firestore onSnapshot |
| Backend/lógica | **Edge Functions (Deno)** ou serviço Node | Cloud Functions |
| Storage (PDFs, fotos) | **Supabase Storage** | Firebase Storage |
| Frontend | **React + Vite** (mantém, troca só a camada de dados) | igual |

Alternativas consideradas: GCP Cloud SQL / AWS RDS — descartadas por exigir mais devops que 2 devs não querem carregar agora. Supabase = Postgres de verdade por baixo, então escala quando o time crescer.

## 3. Regra de ouro: multi-tenant desde o dia 1

**Toda tabela de negócio nasce com `empresa_id` + política RLS.** É barato agora, caríssimo de remendar depois.

```sql
-- Toda tabela:  empresa_id uuid not null references empresas(id)
-- Política padrão (isola por empresa do usuário logado):
create policy tenant_isolation on <tabela>
  using (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);
```

Tabelas globais (compartilhadas entre empresas) NÃO levam `empresa_id`: ex. `permissoes_catalogo`.

## 4. Schema relacional (núcleo)

### 4.1 Multi-tenant + RBAC
```
empresas            (id, nome, cnpj, plano, ativo, criado_em)        ← TENANT
usuarios            (id=auth.uid, empresa_id, nome, email, setor_id, cargo_id, ativo)
setores             (id, empresa_id, nome)
cargos              (id, empresa_id, nome)
cargo_permissoes    (cargo_id, permissao)                            ← join (era array no Firestore)
permissoes_catalogo (codigo, descricao)                             ← GLOBAL, sem empresa_id
historico           (id, empresa_id, usuario_id, acao, entidade, dados jsonb, criado_em)
```

### 4.2 Frota e pessoas
```
veiculos      (id, empresa_id, placa, tipo, descricao, id_sascar, ativo)
motoristas    (id, empresa_id, nome, cnh, venc_cnh, venc_mopp, venc_nr20, venc_nr35,
               tipo_contrato 'interno'|'px', id_sascar, ativo)       ← ativo=false = "desligado"
atrelamentos  (id, empresa_id, cavalo_id, reboque_ids[], ...)
ferias        (id, empresa_id, motorista_id, inicio, fim, ...)
```
> O "motorista desligado" e o "tipo interno/px" (hoje em coleções separadas no Firestore: `motoristas_desligados`, `motoristas_classificacao`) viram **colunas** em `motoristas`. Mais limpo.

### 4.3 Rastreamento SASCAR
```
veiculos_posicoes (id, empresa_id, veiculo_id, lat, lng, direcao, velocidade,
                   ignicao, cidade, uf, rua, id_motorista_sascar, data_posicao)
```
- Live: última posição por veículo. Histórico: mesma tabela com índice em (veiculo_id, data_posicao).
- **Realtime:** frontend assina mudanças → caminhões andam no mapa ao vivo.

### 4.4 Jornada (resolve o histórico que era bloqueado!)
```
jornada_dia (id, empresa_id, motorista_id, data, tipo_dia, tipo_contrato,
             total_ativo_min, dirigindo_min, refeicao_min, pausa_min,
             direcao_continua_max_min, encerrou, infracoes jsonb, timeline jsonb, ciclos jsonb)
```
- Um **job diário** (pg_cron / edge function agendada) grava o snapshot antes da SASCAR apagar (~3-4 dias).
- **Isso resolve o problema do relatório mensal/folha** que no Firebase estava bloqueado por falta de cron no plano free.

### 4.5 TMS comercial (os diferenciais de venda — núcleo relacional)
```
clientes    (id, empresa_id, nome, cnpj, ...)
pedidos     (id, empresa_id, cliente_id, origem, destino, produto, status, criado_em)
rotas       (id, empresa_id, pedido_id, ...)
viagens     (id, empresa_id, pedido_id, veiculo_id, motorista_id, inicio, fim, km)
fretes      (id, empresa_id, viagem_id, valor, tabela, ...)
custos      (id, empresa_id, viagem_id, tipo, valor)               ← combustível, pedágio, etc.
faturas     (id, empresa_id, cliente_id, periodo, valor_total, status)
itens_fatura(id, fatura_id, viagem_id, valor)
```
> Aqui é onde o SQL brilha: cruzar viagem×custo×frete pra calcular **margem**, faturar por cliente, relatório por período. Inviável de fazer bem no Firestore.

## 5. O que reaproveita vs reescreve

| Item | Reaproveita? | Nota |
|------|--------------|------|
| **Lógica SASCAR** (`soap.js` — cliente SOAP) | ✅ ~100% | fetch + parse de XML, portável pra Deno/Node |
| **Cálculo de jornada** (`jornada.js`) | ✅ ~100% | função pura sobre eventos; só muda onde grava |
| **Cálculo direção contínua / infrações** | ✅ | regra já madura (ver doc 10 + memória) |
| **Frontend React** (componentes, telas) | 🔶 UI sim, dados não | troca `firebase/firestore` por client Supabase |
| **Usuários + senhas** | ✅ | Supabase importa hash do Firebase Auth — login continua |
| Regras Firestore | ❌ | viram políticas RLS |
| Acesso a dados (queries) | ❌ | reescreve pra SQL |

## 6. Migração dos dados (Pontual = empresa nº 1)

Como o schema é multi-tenant, os dados atuais (single-tenant) entram como **tenant 1**:

1. Exporta o Firestore (JSON) — script `firebase firestore:export` ou SDK admin.
2. Cria `empresas` → linha "Pontual Logística".
3. Script de transformação: cada coleção → tabela, setando `empresa_id` = Pontual.
4. Importa usuários no Supabase Auth (com hash do Firebase) → mapeia `usuarios.empresa_id`.
5. Valida contagens (motoristas, veículos, OCs batem).

## 7. Fases de construção (com 2 devs — fazer por partes)

| Fase | Entrega | Reaproveita |
|------|---------|-------------|
| **0** | Supabase no ar: schema base, RLS, multi-tenant, auth (importa usuários) | — |
| **1** | Cadastros + RBAC (empresas, usuários, frota, motoristas, setores, cargos) | UI React |
| **2** | Rastreamento: poller SASCAR → `veiculos_posicoes` → mapa realtime | `soap.js`, MapaFrota |
| **3** | Jornada + **snapshot diário** (resolve histórico/folha) | `jornada.js` |
| **4** | OC, Manutenção, OS, Férias | UIs atuais |
| **5** | **TMS comercial**: clientes, pedidos, frete, custo, faturamento, margem | novo (diferencial de venda) |
| **6** | Cutover Pontual (importa dados como empresa 1) → abre pra outras transportadoras | script seção 6 |

Começar pelos módulos que **vendem** (2, 3, 5). Pontual valida como cliente real antes de abrir pra fora.

## 8. Onde a lógica SASCAR roda

- **Poller** (pega posições a cada 30s, grava em `veiculos_posicoes`): serviço Node pequeno OU edge function agendada. SOAP é fetch puro → roda em Deno.
- **Jornada sob demanda + snapshot diário:** edge function (chama SASCAR, calcula com `jornada.js` portado, grava `jornada_dia`).
- Credenciais SASCAR por empresa: cada transportadora tem o próprio usuário SASCAR → guardar criptografado por `empresa_id` (não hardcodar — ver lição de segurança das senhas).

## 9. Decisões ainda em aberto

1. **Poller SASCAR**: edge function agendada vs micro-serviço Node dedicado (custo × simplicidade).
2. **Hospedagem do frontend**: Vercel / Netlify / Supabase hosting.
3. **Plano Supabase**: free pra começar; Pro (~US$25/mês) quando escalar.
4. **Cada empresa cliente tem contrato SASCAR próprio?** (provável) → modelar credenciais SASCAR por empresa.
5. **VDO** (tacógrafo) entra no produto? (fornecedor separado — ver memória).

## 10. Riscos

- **Esforço com 2 devs**: é um produto, não um app pequeno. Mitigar com fases curtas e Pontual como validador.
- **Multi-tenant mal feito = vazamento entre clientes**: por isso RLS desde o dia 1, com testes.
- **Não parar a Pontual**: o sistema Firebase atual segue rodando até o cutover (fase 6).

---

**Próximos passos quando começar:** Fase 0 — criar projeto Supabase, modelar o schema (seção 4) com `empresa_id` + RLS, importar usuários. Validar isolamento multi-tenant com 2 empresas de teste antes de construir módulo.

---

## Relacionado

- Anterior: [[11-cercas-eletronicas]]
- Próximo: [[13-modulo-terceiros]]
- [[INDICE|🏠 Voltar ao índice]]
- [[CLAUDE|📖 Contexto do sistema]]
- [[MEMORY|🧠 Memórias]]
