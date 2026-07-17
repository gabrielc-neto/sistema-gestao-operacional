---
name: project-jornada-historico-plano
description: Plano pra arquivar jornada diariamente no Firestore — habilita relatório mensal/folha. Hoje SASCAR só guarda ~3-4 dias e nada é salvo. Bloqueado por Blaze (cron).
metadata: 
  node_type: memory
  type: project
  originSessionId: dad63364-1a18-4047-bcae-688259c317b0
---

# Arquivamento histórico de jornada — PLANEJADO (próxima sessão)

Status: **Planejado, não iniciado.** Bloqueado por ativação do Blaze (cron exige plano pago, mas free tier cobre R$ 0).

**Why:** Wesley perguntou em 2026-05-20 como tirar relatório de jornada de períodos passados (ex: folha mensal). PROBLEMA descoberto: a jornada NÃO é armazenada — é calculada ao vivo da SASCAR toda vez. E a SASCAR só retém eventos ~3-4 dias ([[project_sascar_retencao_eventos]]). Resultado: só dá relatório dos últimos 3 dias; folha mensal é impossível hoje.

**How to apply:** Quando Wesley disser "vamos fazer o histórico de jornada" ou "preciso de relatório mensal" → seguir este plano. Idealmente após Blaze ativo ([[project_producao_deploy_pausado]]).

## O problema em 1 frase
Jornada é efêmera (busca ao vivo) + SASCAR esquece em 3-4 dias = sem backup, sem relatório antigo, sem fechamento de folha.

## Solução: snapshot diário no Firestore

### Componentes
1. **Cloud Function agendada (cron)** — roda todo dia 23h59 BRT
   - `onSchedule('59 23 * * *', ...)` do firebase-functions v2
   - Chama `obterEventosTempoDirecao` do dia + `calcularJornadas`
   - Grava em `jornadas_historico/{YYYY-MM-DD}` com a lista completa de motoristas
   - ⚠️ `onSchedule` (Cloud Scheduler) **exige Blaze** — não tem no free Spark

2. **Coleção nova** `jornadas_historico/{data}`
   - doc por dia: `{ data, geradoEm, jornadas: [...], totais: {...} }`
   - Permanente (nunca expira)
   - firestore.rules: leitura logado, escrita só Functions admin (`if false` no client)

3. **Relatório por período** — `jornadaPeriodo` muda lógica:
   - Pros dias já arquivados → lê de `jornadas_historico` (rápido, sempre disponível)
   - Pros dias recentes (hoje/ontem, ainda não arquivados) → busca SASCAR ao vivo
   - Merge dos dois

4. **Tela de relatório mensal** (nova ou estende /jornada)
   - Seletor de mês
   - Total de HE por motorista no mês (pra folha)
   - Export PDF/CSV do fechamento

### Plano B enquanto Blaze não vem (sem cron)
- Botão manual "Arquivar dia de hoje" na /jornada → grava o snapshot via client/Function callable
- OU script local rodado manualmente no fim do dia (`node scripts/arquivar-jornada.mjs`)
- Cobre o gap até o cron automático

## Ordem de implementação
1. Coleção `jornadas_historico` + regras (15min)
2. Função de snapshot (callable manual primeiro, sem cron) (1h)
3. `jornadaPeriodo` lê histórico + ao vivo (2h)
4. Quando Blaze ativo: trocar callable manual por `onSchedule` cron (30min)
5. Tela/relatório mensal de folha (3-4h)

## Decisões pendentes pro Wesley
1. Arquivar QUE horário? 23h59 cobre o dia, mas motorista que vira a noite (jornada cruza meia-noite) pode ficar partido. Talvez 03h da manhã do dia seguinte?
2. Relatório mensal precisa de valor R$/hora do motorista pra calcular custo de HE? (hoje só temos minutos)
3. Guardar eventos brutos também ou só a jornada calculada? (brutos = poder recalcular se regra mudar)

Relacionado: [[project_jornada_motorista_plano]], [[project_jornada_3fontes_plano]], [[project_sascar_retencao_eventos]], [[project_producao_deploy_pausado]], [[reference_sascar_api]]

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
