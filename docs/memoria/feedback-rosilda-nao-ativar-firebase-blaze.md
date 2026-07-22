---
name: feedback-rosilda-nao-ativar-firebase-blaze
description: "REGRA PERMANENTE: user (Rosilda) NÃO quer ativar Firebase Blaze (plano pago pay-as-you-go). NÃO sugerir esse caminho novamente. Toda migração/backup Firestore deve trabalhar dentro do free tier (50k reads/dia + 20k writes/dia) OU esperar reset diário às 21h Brasília."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2026-07-22
---

## Regra

**NÃO ativar Firebase Blaze. NÃO sugerir Blaze pra user.**

Preferência explícita da Rosilda (2026-07-22):
- *"eu não quero pagar nada"* — no contexto de discussão sobre ativar Blaze pra desbloquear quota
- Migração pra Hostinger está em andamento — Firebase será desligado logo, não faz sentido investir em plano pago pra algo que vai sair

## Como aplicar

**Quando quota Firestore estourar (`RESOURCE_EXHAUSTED: Quota exceeded`):**
1. Confirmar pra user que quota estourou
2. Explicar: reset é às **21h Brasília** (00h UTC)
3. **NÃO sugerir Blaze como solução**
4. Oferecer 2 opções válidas:
   - a) Aguardar reset (grátis)
   - b) Bypass técnico se possível (ex: cache em memória, evitar writes Firestore, pular gravação temporariamente — só se não perder dados críticos)

**Ao planejar migração/backup em massa:**
- Distribuir operações ao longo de vários dias respeitando 50k reads/dia
- OU fazer late night (após reset 21h)
- OU otimizar queries (batch, cache, agregações)

## Contexto financeiro pra user

- Ela é gestora, não desenvolvedora
- Sistema Pontual é da empresa mas ela decide gastos técnicos
- R$ 5-15 pra migração parece pouco, mas ela prefere zero
- Alinhado com estratégia de sair 100% do Firebase → Hostinger (sem custo adicional)

## Alternativas ao Blaze que valem sugerir

- Aguardar reset 21h
- Bypass técnico (só reads → cache)
- Migração incremental (spread ao longo de dias)
- Blaze **TEMPORÁRIO só pra migração + cancelar** — NÃO sugerir mais, ela recusou

Ver também: [[feedback-so-mudar-o-que-user-pediu]] · [[project-hostinger-vps-setup-decisoes]] · [[project-sascar-api-paginacao-antigo-primeiro]]
