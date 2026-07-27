---
name: project-banco-aws-decidido
description: "DECISAO confirmada 2026-06-12 — banco AWS RDS PostgreSQL + S3, rodando via Docker. Firebase temporario ate cutover."
metadata: 
  node_type: memory
  type: project
  originSessionId: 8295294f-cd4c-494c-b2bb-7c90a438b8a3
---

Wesley confirmou em 2026-06-08 e reiterou em **2026-06-12**: **banco do TMS sera Amazon AWS, usando Docker**.

- Banco: **AWS RDS PostgreSQL** (relacional, substitui Firestore)
- Arquivos: **S3**
- Infraestrutura: **Docker** (containers para subir localmente e em produção AWS)
- Substitui Supabase (plano antigo) e descarta caminho de seguir Firebase em prod

**Why:** Pontual eh single-tenant agora (SaaS pausado), AWS combina com perfil de TI interna controlada por IT/financeiro da empresa. RDS Postgres tambem casa com necessidade relacional do TMS (pedido→rota→frete→fatura, snapshot diario de jornada).

**How to apply:**
- Tratar Firebase atual como **temporario** — qualquer feature nova deve evitar criar dependencia gratuita em Firestore que dificulte migracao.
- Cache em memoria da Function, calculo client-side, IndexedDB local: TUDO agnostico, sobrevive migracao.
- Nao gastar tempo em otimizacao Blaze-only (snapshot historico Firestore) — ja replanejar pra DynamoDB on-demand ou RDS direto.
- Snapshot diario de jornada (resolveria [[sascar-retencao-eventos]]) — em AWS DynamoDB fica ~US$ 0,25 / milhao writes, viavel sem Blaze.
- Nada implementado ainda em AWS. Sistema atual segue Firebase ate cutover. Migracao = projeto separado, depende de plano.

**VDO API** — segue sem previsao. Wesley confirmou em 2026-06-08 que pedido pro suporte Continental ([[vdo-api-solicitacao]]) ainda nao retornou. Rastreamento NAO usa VDO mesmo (so SASCAR), entao nao bloqueia features de rastreamento; bloqueia futuro modulo de jornada com 3 fontes ([[jornada-3fontes-plano]]).

## Implicacoes nas correcoes de hoje ([[rastreamento-precisao-2026-06-08]])

Nenhuma cria dependencia adicional em Firestore:
- Reverse geocode: cache `Map` em memoria da Function — vai junto pra Lambda
- Direcao preservada: muda calculo no enriched, mesmas 3 colecoes
- Trail: 100% client-side (useRef + localStorage)
- Defasagem/banner: calculo no front

Status do deploy Firebase: ainda em standby ([[producao-deploy-pausado]]). Pode nem chegar a subir — se cutover AWS for rapido, pula direto.

## Relacionado

- [[tms-saas-decisao]] — SaaS pausado, AWS ja listado como possivel
- [[migracao-postgresql-tms]] — plano tecnico (precisa atualizar: trocar Supabase por AWS)
- [[producao-deploy-pausado]] — deploy Blaze adiado, pode virar irrelevante
- [[vdo-api-solicitacao]] — pedido VDO ainda sem retorno
- [[estado-atual]] — atualizar pra refletir alvo AWS

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_carga_perigosa]]
