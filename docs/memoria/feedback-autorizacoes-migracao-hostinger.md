---
name: feedback-autorizacoes-migracao-hostinger
description: "Autorizações permanentes da Rosilda pra trabalho autônomo durante migração Hostinger 2026-07-22. Vale enquanto durar o Sprint 1 (até 28/07) e Sprint 2 (até 05/08). Depois disso reavaliar."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Contexto

Durante migração Hostinger (Sprints 1 e 2), Rosilda autorizou Claude a
trabalhar autonomamente sem esperar aprovação a cada decisão. Ela entra
8h da manhã. Fora do horário comercial, Claude usa julgamento próprio.

## Autorizações permanentes durante migração

### 1. Decisões técnicas — Claude decide

**Why:** Rosilda não é desenvolvedora, não tem preferências técnicas fortes,
prefere resultado a discussão. Cada pausa pra perguntar custa 2-3h.

**How to apply:**
- Framework backend: **Express + padrão REST comum**
- Estrutura de pastas: **/var/pontual/backend/{routes,controllers,db,middleware,uploads}**
- Nomes de rotas: **REST convencional /api/{recurso}/{id}**
- Ferramentas: usa boas práticas comuns (Node 20+, pg, multer, jsonwebtoken quando chegar hora, helmet, cors)
- Se algo não gostar depois, ajusta sem drama

### 2. Auth durante Sprint 1 — mantém Firebase Auth

**Why:** JWT próprio adiciona 1-2 dias de trabalho + risco de bug de login.
Sistema atual usa Firebase Auth funcionando bem — mantém no Sprint 1
enquanto Backend só valida token Firebase. JWT vira Sprint 2.

**How to apply:**
- Frontend continua importando `firebase/auth`
- Backend valida token via `firebase-admin` SDK (verifyIdToken)
- Migração pra JWT próprio SOMENTE quando Sprint 2 chegar

### 3. Pendrive D: sempre conectado durante migração

**Why:** Rosilda mantém pendrive D: com backup + credenciais Firebase.
Claude pode ler `serviceAccountKey.json` de lá pra fazer migração de dados
Firestore→PostgreSQL sozinha.

**How to apply:**
- Localização: `/d/Backup-Logistica-*/projetos/logistica-ia/scripts/serviceAccountKey.json`
- Setar env `GOOGLE_APPLICATION_CREDENTIALS` apontando pra lá
- Ver [[reference-firebase-service-account-pendrive]]

### 4. Emergência — priorizar não quebrar

**Why:** Fora do horário, Rosilda não responde. Pra não bloquear trabalho,
Claude decide sozinho MAS conservador. Reporta tudo amanhã.

**How to apply:**
- Se dados em risco: BACKUP antes de qualquer coisa. Nunca deletar sem cópia.
- Se decisão irreversível (deletar tabela, dropar banco, force push): NÃO faz. Deixa relatório detalhado.
- Se bug pode afetar sistema atual em produção: PARA. Sistema atual (Firebase) intocável.
- Se descobrir bug crítico já em produção: reporta amanhã, não tenta corrigir de madrugada.
- Se dúvida entre 2 opções técnicas: escolhe a mais **conservadora** (a que preserva o estado atual).

## O que Claude NÃO faz mesmo com autorização

1. **Deletar dados** de Firestore atual — jamais. Sistema atual continua rodando até cutover final.
2. **Mexer em /var/www/homol/** — código do Gabriel, intocável.
3. **Reboot da VPS** — pode derrubar sistema do Gabriel também.
4. **Force push** no git — reverte histórico. Só faz PR + commit atômico.
5. **Rotacionar credenciais** que estão em uso (Cloudinary API secret, Firebase service account).
6. **Aceitar contrato pago** em qualquer serviço externo — regra permanente de "não pagar".
7. **Cutover final Firebase→VPS** — só na presença dela, ela dá ok.

## Escopo de tempo

Válido durante:
- **Sprint 1**: 22/07/2026 → 27/07/2026 (deadline diretoria 28/07)
- **Sprint 2**: 28/07/2026 → 05/08/2026 (deadline final)

Após 05/08 reavaliar. Se autoridade permanece, atualizar essa memória.

## Ver também

- [[project-migracao-hostinger-plano-05-08]] — cronograma
- [[project-gabriel-parceiro-sistemas-coexistem]] — respeitar Gabriel
- [[feedback-so-mudar-o-que-user-pediu]] — não expandir escopo sozinho
- [[reference-firebase-service-account-pendrive]] — onde está serviceAccountKey
