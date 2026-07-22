---
name: project-migracao-hostinger-plano-05-08
description: "Plano de migração completa Firebase→VPS Hostinger em 2 sprints. Sprint 1 até 27/07 (fachada Hostinger pra reunião de sócios 28/07). Sprint 2 até 05/08 (100% independente do Firebase — PostgreSQL + JWT + Storage local)."
metadata:
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Prazo e motivo

- **28/07/2026**: reunião com diretoria (Rosilda é dona, não tem sócio). Precisa mostrar sistema rodando "em servidor próprio".
- **05/08/2026**: 100% independente do Firebase (prazo real acordado com user).
- Hoje da decisão: **22/07/2026**.

## Sprint 1 (22/07 → 27/07 — 6 dias)

**Meta:** fachada Hostinger pronta pra reunião 28/07.

Frontend + Backend rodando no VPS, mas backend ainda usa Firebase como proxy (transparente).
Diretoria acessam `https://srv1464919.hstgr.cloud` e veem sistema "próprio".

Tarefas:
1. Setup infra VPS (Node 20, Nginx, PostgreSQL 16, PM2, Certbot/SSL)
2. Frontend build estático + Nginx config
3. Backend Node/Express skeleton (rotas proxy pra Firebase)
4. DNS/SSL — dominio grátis `srv1464919.hstgr.cloud`
5. Monitoramento básico (PM2 status)

## Sprint 2 (28/07 → 05/08 — 9 dias)

**Meta:** eliminar toda dependência do Firebase.

Tarefas:
6. Schema PostgreSQL completo (todas coleções Firestore mapeadas)
7. Backend Express usando PostgreSQL real (substitui proxy)
8. Auth JWT próprio (login, refresh, middleware) — substitui Firebase Auth
9. Storage local em `/var/pontual/uploads/` — substitui Cloudinary + Firebase Storage
10. Script migração de dados Firestore → PostgreSQL com validação
11. Cutover: mudar URLs frontend, testes E2E
12. Backup automático diário (pg_dump + rotação 30 dias)
13. Firewall UFW + fail2ban

## Restrições e regras

- **Sistema atual continua no ar durante toda migração** — cutover só quando testes passarem.
- **Rollback plan:** DNS pode voltar pra Firebase Hosting em 5 min se algo dar errado.
- **Gabriel tem sistema no mesmo VPS** — respeitar diretório dele, usar `/var/pontual/` isolado.
- **User não quer pagar nada** — plano free tier de tudo enquanto migra + $0 no VPS que já é pago.
- **Backup Hostinger pago RECUSADO** — usar dump PostgreSQL nightly + copia pro pendrive dela.

## Blockers atuais

- **SSH access ao VPS** — user precisa gerar senha SSH no Hostinger Panel e passar.
- Sem SSH, nada começa.

## Estado antes da migração

- Frontend: Vite + React em `C:/Users/Logistica01/projetos/logistica-ia/frontend`
- Backend: Firebase Functions (SASCAR, jornada, CTA, etc)
- Banco: Firestore em projeto `pontual-logistica`
- Auth: Firebase Auth (email/senha)
- Storage: Cloudinary (cloud=oskn4pzq, preset=motoristas_docs) — desde 2026-07-22
- Estava antes em Firebase Storage mas exige Blaze — ver [[project-firebase-storage-requer-blaze]]

## Ver também

- [[project-hostinger-vps-setup-decisoes]] — decisões prévias sobre a VPS
- [[project-rosilda-eh-dona-do-sistema-vps-pontual]] — Rosilda é dona (não Gabriel)
- [[feedback-rosilda-nao-ativar-firebase-blaze]] — regra permanente contra pagar
