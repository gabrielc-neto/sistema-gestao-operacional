---
name: project-migracao-postgresql-tms
description: "PLANO estratégico (2026-05-21): migrar Logística IA do Firebase pra PostgreSQL/Supabase e virar produto TMS SaaS multi-tenant pra vender a outras transportadoras"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6724ac89-4074-45e1-a2c6-093d41392374
---

Decisão estratégica de Wesley em 2026-05-21: o sistema vira **produto SaaS multi-empresa** (TMS) pra vender a outras transportadoras. Construído por Wesley + Gabriel. Banco escolhido: **PostgreSQL via Supabase**. Plano completo documentado em `projetos/logistica-ia/docs/12-migracao-postgresql-tms.md` (doc 12, indexado no README).

**Why:** TMS é fortemente relacional/financeiro (pedido→rota→frete→fatura→cliente) e multi-tenant (isolamento por transportadora) — força do Postgres, fraqueza do Firestore. Como vira produto, base sólida > rapidez NoSQL.

**How to apply:** Nada implementado ainda — a Pontual segue 100% no Firebase atual até o cutover (fase 6). Não é "migrar o app", é **construir o produto novo no Postgres + importar a Pontual como empresa nº 1**. Reescrita do data layer; UI React mantém.

Pontos-chave:
- **Stack alvo Supabase**: Postgres + RLS (isolamento) + Auth (importa hash do Firebase, login continua) + Realtime (mapa) + Edge Functions Deno + Storage. Frontend React+Vite mantido.
- **Regra de ouro**: toda tabela de negócio nasce com `empresa_id` + política RLS desde o dia 1. Globais (ex. `permissoes_catalogo`) sem `empresa_id`.
- **Reaproveita ~100%**: lógica SASCAR (`soap.js` SOAP→fetch, portável p/ Deno), cálculo de jornada (`jornada.js`, função pura), regras de direção contínua/infrações, usuários+senhas (hash importável). Reescreve: queries (→SQL), regras Firestore (→RLS).
- **Fases**: 0 schema+RLS+auth → 1 cadastros+RBAC → 2 rastreamento → 3 jornada+snapshot diário → 4 OC/Manutenção/OS/Férias → 5 TMS comercial (clientes/pedidos/frete/custo/faturamento/margem = diferencial de venda) → 6 cutover Pontual + abrir pra fora. Priorizar módulos que vendem (2,3,5).
- **Snapshot diário de jornada** no Postgres resolve o histórico efêmero da SASCAR — ver [[project_jornada_historico_plano]] e [[project_sascar_retencao_eventos]].
- **Credenciais SASCAR por empresa** (cada transportadora tem contrato próprio) — guardar criptografado por `empresa_id`, não hardcodar (lição das senhas vazadas em [[project_estado_atual]]).
- Em aberto: poller SASCAR (edge function agendada vs micro-serviço Node), hosting frontend (Vercel/Netlify), plano Supabase (free→Pro ~US$25/mês), VDO entra? ([[feedback_vdo_nao_sascar]]).

**Nota fiscal/escopo (2026-05-22):** Pontual é base de petróleo, carga própria, frota própria → **só MDF-e, sem CT-e e sem faturamento de frete** (não cobra frete de terceiro). Na fase 5 "TMS comercial" (frete/faturamento/CT-e), isso é pro **PRODUTO/outras transportadoras**, não pra Pontual. Pra Pontual a fase 5 vira **custo por viagem + margem interna** (combustível CTA Smart + pedágio), não receita de frete. Ver [[project_tms_mapa_completo]].

Relacionado: [[project_logistica_ia]], [[project_logistica_rastreamento_levantamento]], [[project_producao_deploy_pausado]] (deploy Blaze do sistema atual fica em standby — o futuro é Supabase).
