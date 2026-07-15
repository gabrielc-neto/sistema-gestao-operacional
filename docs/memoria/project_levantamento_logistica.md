---
name: project-levantamento-logistica
description: "Inventário do TMS na parte de logística operacional (escopo: tudo MENOS CT-e/MDF-e/RBAC/financeiro). Doc 14 no repo. Top 5 gaps e top 5 bloqueadores externos identificados em 2026-05-23"
metadata: 
  node_type: memory
  type: project
  originSessionId: f5541ecf-d17a-405b-a9a4-57f01ecbea56
---

Doc completo: `projetos/logistica-ia/docs/14-levantamento-logistica.md` (commitado no repo).

**Why:** Wesley pediu (2026-05-23) inventário do que precisa no TMS na parte de logística, excluindo CT-e/MDF-e que a Pontual não usa diretamente (MDF-e via Focus NFe quando precisar, CT-e nunca emite).

**How to apply:** Quando Wesley falar em "próximo passo do TMS", "o que falta pro sistema", priorizar pelos top 5 gaps abaixo. Quando aparecer dúvida sobre cadastro fiscal × cadastro interno, lembrar que **CNPJ de cliente NÃO precisa de homologação SEFAZ** — só BrasilAPI (grátis) pra validar. Homologação é só pra emitir documento fiscal, e quem cuida disso é o Focus NFe.

**Top 5 gaps (alto impacto × baixo esforço):**
1. Cadastro de clientes/destinos (destrava ETA, janela, ranking)
2. Ficha de Emergência + Envelope NBR 7503 (obrigação legal carga perigosa)
3. CTA Smart + hodômetro SASCAR (custo/viagem, km/l, manut por km)
4. Ocorrências + canhoto digital (fecha ciclo da viagem)
5. Roteirização ORS grátis (desvio, ETA, custo planejado)

**Top 5 bloqueadores externos:**
1. Suporte VDO liberar API (texto pronto, pendente Wesley enviar — ver [[project_vdo_api_solicitacao]])
2. SASCAR liberar `obterPontosReferencia` (cercas oficiais — ver [[project_sascar_cercas_api_bloqueada]])
3. SASCAR confirmar hodômetro/nível combustível na API
4. Wesley aprovar cartão Blaze (cron, snapshot, WhatsApp — ver [[project_producao_deploy_pausado]])
5. CTA Smart liberar API ou export CSV

**Núcleo logístico que JÁ funciona 100%:** frota + motoristas + cercas + OC + atrelamento + 27 itens manutenção + OS + rastreamento ao vivo + jornada completa (HE/PX×CLT/trajeto GPS).

**Esclarecimento fiscal recorrente:**
- Cadastro de cliente no sistema = base interna, validação via BrasilAPI = grátis, sem SEFAZ
- OC = documento interno, não fiscal
- MDF-e = único documento fiscal Pontual hoje, via Focus NFe homologado
- CT-e = Pontual NÃO emite (frota própria entregando carga própria); CT-e quem emite é REPLAN ou STANYTCHYL/LODI quando terceiro

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **cta**: [[feedback-windows-file-watcher]] · [[project_estado_atual]] · [[project_logistica_ia]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
