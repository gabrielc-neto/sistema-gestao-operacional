---
name: project-sascar-retencao-eventos
description: SASCAR API obterEventosTempoDirecao tem retenção curta — eventos > 3-4 dias retornam vazio. Bloqueador pra período longo na página /jornada. Descoberto 2026-05-19.
metadata: 
  node_type: memory
  type: project
  originSessionId: dad63364-1a18-4047-bcae-688259c317b0
---

# SASCAR — retenção curta de eventos do tablet (problema descoberto)

Status: **Confirmado 2026-05-19. Não é bug do nosso código.** Bloqueia consulta de períodos longos na página `/jornada`.

**Why:** Wesley pediu pra verificar se período (`jornadaPeriodo`) contabiliza tudo certo. Teste 13/05 a 19/05 mostrou:
- 13/05 a 16/05 (terça-sexta) → SASCAR retornou **0 eventos** (deveria ter ~30 motoristas/dia útil)
- 17/05 (domingo) → 1 motorista (provável retenção parcial)
- 18/05 (segunda) → 22 motoristas
- 19/05 (terça) → 30 motoristas / 247 eventos

Janela UTC enviada está correta (`dataInicio 03:00:00`, `dataFim+1 02:59:00`). Não é bug nosso.

**How to apply:** Ao discutir período longo na /jornada com Wesley, lembrar dessa limitação. Pra resolver definitivo, precisa Caminho B (snapshot diário no Firestore — exige Blaze).

## Hipótese mais provável

`obterEventosTempoDirecao` só mantém histórico recente (3-5 dias). Pra dados antigos, possíveis caminhos na própria SASCAR:
- `obterEventoTelemetriaIntegracao` (já investigado em [[project_jornada_motorista_plano]], ok mas usa janela curta também)
- `obterPacotePosicaoHistorico` (existe, mas é posição GPS, não eventos do tablet)
- Endpoint específico de histórico (não documentado em SasIntegra v2.05)

## 3 caminhos pra resolver

### A — Perguntar ao suporte SASCAR (zero custo de código)
1. Qual a retenção do `obterEventosTempoDirecao`?
2. Existe método pra histórico antigo? Qual?
3. Existe export de histórico de tablet?

### B — Snapshot diário no Firestore (resolve definitivo, exige Blaze)
- Cloud Function scheduled (cron `0 23 * * *`) → chama `jornadaDia(hoje)` → salva em `motoristas/{id}/jornadas/{data}`
- `jornadaPeriodo` muda lógica: lê primeiro do Firestore (histórico), só chama SASCAR pros dias que faltam (hoje + ontem)
- Custo: cron é feature Blaze (não tem free tier de scheduler)
- Bloqueador: [[project_producao_deploy_pausado]] precisa ativar antes

### C — Aviso no frontend (mitigação rápida)
Adicionar banner na /jornada quando período passa de 4 dias:
> "⚠ Períodos > 4 dias podem ter dados incompletos pela retenção da API SASCAR"

## Estado atual

- Período 1-3 dias: funciona 100%
- Hoje + ontem: funciona 100%
- Mês fechado, semana passada: **falha silenciosamente** (retorna 0)

## Como retomar

Wesley diz "ainda tá puxando errado o período" ou "vou perguntar SASCAR sobre histórico" → revisar este arquivo + decidir entre Caminho A/B/C.

Relacionado: [[project_jornada_motorista_plano]], [[project_jornada_3fontes_plano]], [[reference_sascar_api]], [[project_producao_deploy_pausado]]

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
