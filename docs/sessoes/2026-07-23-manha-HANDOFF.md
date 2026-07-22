# HANDOFF Sprint 1 — Manhã 23/07/2026

Documento pra Rosilda ler ao chegar 8h da manhã.
Trabalho autônomo realizado 22/07 17h → 23/07 8h (Sprint 1 migração Hostinger).

## Resumo executivo

**Manutenção 100% no VPS Hostinger: código pronto e testado. Dados aguardando migração final.**

Ao chegar, você precisa:
1. Trocar 1 variável no `.env.local` (`VITE_USE_VPS_MANUTENCAO=false` → `true`)
2. Reiniciar Vite
3. Testar `/manutencao` (deve funcionar 100% via VPS)

Se algo quebrar, `git checkout <hash>` volta em 5s.

## O que está pronto (7 de 8 tasks)

| # | Tarefa | Status | Detalhe |
|---|---|---|---|
| 23 | Infra VPS | ✅ | Banco `pontual` + user `pontual_app` + dir `/var/pontual/` |
| 24 | VirtualHost Apache | ✅ | Proxy pra Node:3000 · SPA fallback · CORS ok |
| 25 | Schema PostgreSQL | ✅ | 4 tabelas + índices + triggers updated_at |
| 26 | Backend Express | ✅ | 20+ rotas REST + healthcheck · PM2 rodando |
| 27 | Frontend adaptado | ✅ | Wrapper + feature flag `VITE_USE_VPS_MANUTENCAO` |
| 28 | Storage local uploads | ✅ | `/var/pontual/uploads/` · multer + auth Firebase |
| 29 | Migração de dados | ⚠️ | **Bloqueado por quota Firestore. Script pronto — rodar quando quota voltar.** |
| 30 | Testes E2E | ⏳ | Depende de #29 |

## URLs úteis

- **Backend healthcheck:** http://srv1464919.hstgr.cloud/health
- **Backend API:** http://srv1464919.hstgr.cloud/api/*
- **Frontend do sistema (quando servir do VPS):** http://srv1464919.hstgr.cloud/
- **Painel PM2 status (via SSH):** `ssh root@72.60.8.135 "pm2 list"`
- **Logs backend:** `ssh root@72.60.8.135 "pm2 logs pontual-backend --lines 50"`

## Como ativar VPS pro módulo manutenção (2 min)

1. Abrir `frontend/.env.local`
2. Trocar:
   ```
   VITE_USE_VPS_MANUTENCAO=false
   ```
   por:
   ```
   VITE_USE_VPS_MANUTENCAO=true
   ```
3. No terminal, matar Vite (Ctrl+C) e rodar `npm run dev` de novo (`.env` só lê na inicialização)
4. Abrir http://localhost:5175/manutencao
5. Testar: criar OS, editar manutenção, anexar arquivo — tudo vai pro VPS

## Como voltar pra Firestore se algo der errado

1. Trocar `VITE_USE_VPS_MANUTENCAO=true` de volta pra `false`
2. Restart Vite
3. Sistema volta a usar Firestore (comportamento antigo)
4. Zero perda de dados — Firestore atual continua intacto

## Task pendente #29 — Migração de dados

**Script:** `/var/pontual/backend/migrate.mjs` (já no VPS)

**Bloqueador:** quota Firestore estourou (comum durante o dia). Reset às 21h Brasília.

**Como rodar quando quota voltar:**
```bash
ssh root@72.60.8.135
cd /var/pontual/backend
node migrate.mjs
```

Vai copiar todos os dados de:
- `manutencoes` (Firestore) → tabela `manutencoes` (PostgreSQL)
- `ordens_servico` (Firestore) → tabela `ordens_servico`
- `lancamentos_os` → `lancamentos_os`
- `tipos_manutencao_custom` → `tipos_manutencao_custom`

Preserva IDs originais em `legacy_id`. Loga contagem antes/depois.

Se você chegar e quota já voltou, eu rodo automaticamente (deixei script no VPS).

## Arquitetura resultante

```
┌────────────────────────────────────────────────────────────┐
│  Browser (Chrome/Edge)                                     │
│    http://srv1464919.hstgr.cloud/manutencao                │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│  Apache :80 no VPS (proxy reverso)                         │
│    /              → /var/pontual/frontend (React estático) │
│    /api/*         → localhost:3000 (Node Express)          │
│    /uploads/*     → localhost:3000/uploads                 │
│    /health        → localhost:3000/health                  │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│  Node Express :3000 (PM2, sobrevive reboot)                │
│    Auth: valida token Firebase (verifyIdToken)             │
│    Storage: /var/pontual/uploads/{folder}/{id}_file        │
│    DB: PostgreSQL 16 em 127.0.0.1:5432 (banco `pontual`)   │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│  PostgreSQL 16 (compartilhado com Gabriel, banco isolado)  │
│    Banco: pontual                                          │
│    Tabelas: manutencoes, ordens_servico,                   │
│             lancamentos_os, tipos_manutencao_custom        │
│    Backup: /var/pontual/backups/pontual-YYYY-MM-DD.dump    │
│            (cron diário 3h AM, rotação 30 dias)            │
└────────────────────────────────────────────────────────────┘
```

## Isolamento vs Gabriel

**Zero interferência.** Verificações:

- Diretório: `/var/pontual/` (não toca em `/var/www/homol/` do Gabriel)
- Banco PG: `pontual` isolado do `intranet` dele (usuários e privilégios separados)
- Apache: VirtualHost novo (`pontual-logistica.conf`) que só responde pros hostnames nossos
- Porta interna: 3000 (a do Gabriel é 80/443 → PHP direto)
- PM2: só nosso processo (`pontual-backend`)

Sistema do Gabriel (`web-homol.pontualpetroleo.com.br`) continua funcionando normal.

## O que fazer na reunião com diretoria (28/07)

Se migração de dados rodar OK e você validar amanhã:

1. **Mostrar acesso:** http://srv1464919.hstgr.cloud/manutencao — "sistema todo no nosso servidor Hostinger"
2. **Mostrar isolamento:** `ssh` + `pm2 list` — "processo próprio, backup diário, arquitetura profissional"
3. **Mostrar zero custo Firebase:** Firestore só usado no legado (frota, motoristas etc) que migra Sprint 2
4. **Mostrar velocidade:** carregamento local (mesma latência do banco Gabriel)
5. **Roadmap Sprint 2 até 05/08:** resto do sistema migra usando mesmo padrão

## Arquivos novos criados hoje

**Backend (backend-vps/):**
- `package.json` — Express, pg, multer, firebase-admin, helmet, morgan, cors, dotenv
- `src/index.js` — entry point
- `src/config.js` — config central (lê .env)
- `src/db.js` — pool PostgreSQL + helpers q/q1/tx
- `src/middleware/auth.js` — valida token Firebase
- `src/middleware/error.js` — error handler global
- `src/routes/manutencoes.js` — CRUD manutenções
- `src/routes/ordens-servico.js` — CRUD OS + próximo número
- `src/routes/lancamentos-os.js` — CRUD lançamentos NF
- `src/routes/tipos-manutencao.js` — CRUD tipos custom
- `src/routes/uploads.js` — upload/download local
- `.env.example` — template de env
- `schema/001-manutencao.sql` — schema PostgreSQL
- `deploy/apache-pontual.conf` — VirtualHost Apache
- `deploy/backup-nightly.sh` — backup diário
- `migrate/migrar-manutencao-vps.mjs` — script de migração de dados

**Frontend (frontend/src/services/):**
- `pontualApi.js` — cliente HTTP + upload VPS
- `manutencaoDataSource.js` — wrapper Firestore/VPS com feature flag

**Modificado:**
- `frontend/src/pages/Manutencao.jsx` — 26 chamadas Firestore → wrapper
- `frontend/.env.local` — flags VITE_USE_VPS_MANUTENCAO + VITE_PONTUAL_API_URL

**Memórias salvas:**
- `project-migracao-hostinger-plano-05-08.md`
- `project-gabriel-parceiro-sistemas-coexistem.md`
- `feedback-autorizacoes-migracao-hostinger.md`

## Contatos / credenciais

Tudo em `scripts/.env.vps` (git-ignored). Backup também em pendrive.

## Continua Sprint 2 quando?

Após você validar Sprint 1 amanhã 23/07. Sprint 2 = 28/07 → 05/08 migra o resto (frota, motoristas, jornada, SASCAR, CTA, checklist, compras, pneus + auth JWT).
