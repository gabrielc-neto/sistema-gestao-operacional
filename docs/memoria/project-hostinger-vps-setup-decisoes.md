---
name: project-hostinger-vps-setup-decisoes
description: Decisões da user Rosilda na contratação do VPS Hostinger (2026-07-22) e roadmap de setup pós-provisionamento. Backup automático pago foi RECUSADO — user optou por backup grátis custom implementado depois.
metadata: 
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Fato

**Migração completa Firestore → Hostinger** decidida por Rosilda em 2026-07-22.

## Escolhas confirmadas na contratação Hostinger

| Item | Escolha | Motivo |
|---|---|---|
| Produto | **VPS KVM 2** (2 vCPU · 8 GB RAM · 100 GB SSD) | Cabe Pontual + folga pra 100 usuários com config certa |
| Sistema operacional | **Ubuntu 24.04 LTS** | Suporte até 2029, produção-ready |
| Datacenter | São Paulo | Menor latência pro Brasil |
| Detector de malware (grátis) | ✅ Marcado | Grátis, benefício claro |
| **Backups automáticos diários (pago)** | ❌ **RECUSADO** | User: "faço backup grátis depois" |
| Gerenciador Docker | ❌ Desmarcado | Não precisa — Node roda direto no VPS |
| Senha root | Gerada pela Hostinger (regenerada após aparecer em screenshot) | User salvou em local próprio |

## Escopo da migração acordado

**Tudo dentro da Hostinger — ZERO Firebase.** Migração completa:

- Frontend React (build estático) → Nginx no VPS
- Backend Node.js → PM2 cluster mode no VPS
- Firestore → **MySQL** no VPS
- Firebase Auth → **JWT próprio** (jsonwebtoken)
- Firebase Storage → **disco local do VPS** (multer + `/uploads/`)
- Cloud Functions emulator → deixa de existir (Node direto)

Referência técnica anterior: [[project-migracao-hostinger]] (se existir) ·
Branch `feat/conversao-php-laravel` (Laravel — decidido NÃO usar; mantém Node)

## Roadmap de setup pós-VPS provisionado

### Fase 1 — VPS configurado (dia 1, ~4h)
- Firewall (ufw): abrir 22, 80, 443 · fechar resto
- Atualiza pacotes (`apt update && apt upgrade`)
- Instala: Node 20+, MySQL 8, Nginx, Certbot, PM2, Redis, Git, curl, ufw
- Cria usuário não-root pra operar (evitar login root direto)
- Chave SSH pra Rosilda (pra ela conectar sem senha depois)

### Fase 2 — Deploy sistema (dia 2-3, ~8h)
- `git clone` do repo
- `npm install` (frontend + functions)
- `npm run build` (frontend → dist)
- Nginx: serve `dist/` como estático + proxy `/api/*` pro Node
- PM2 sobe backend com cluster mode
- SSL Let's Encrypt via Certbot
- Domínio Hostinger aponta pra IP do VPS

### Fase 3 — Migração de dados (dia 3-4, ~8h)
- Script exporta Firestore → JSON (todas as coleções)
- Cria schema MySQL espelhando estrutura
- Importa JSON → MySQL
- Cria índices otimizados (placa, motorista_id, data, venc)
- Verifica integridade (contagens antes/depois)

### Fase 4 — Reescrita camada de dados (dia 5-7, ~16h)
- Substitui `firebase-admin` por `mysql2` no backend
- Substitui `firebase-auth` por JWT + bcrypt
- Substitui `firebase-storage` por multer + disco
- Substitui `onSnapshot` do frontend por polling (perde tempo real)
- Adapta 15+ coleções

### Fase 5 — Testes + backup grátis (dia 7, ~4h)
- **BACKUP CUSTOM (user optou por essa via em vez do plano pago Hostinger):**
  - Script bash `mysqldump` diário via cron (retenção 30 dias)
  - `tar` pasta `/uploads/` diário
  - Rsync pra disco secundário do VPS + upload semanal pro OneDrive/Google Drive user
  - Monitoring: email se backup falhar
- Testes E2E via Playwright
- Compara sistema Hostinger vs Firebase em paralelo por 1-2 dias

### Fase 6 — Corte definitivo (dia 8, ~2h)
- Domínio DNS aponta 100% pra Hostinger
- Desliga Cloud Functions (Firebase gratuito continua, só sem uso)
- Firestore como backup passivo por 30 dias, depois arquiva ou apaga

## Otimizações pra 100 usuários simultâneos

- **Nginx:** gzip + brotli + keep-alive + serve estáticos direto
- **Node:** PM2 cluster mode (usa 2 vCPUs paralelo)
- **MySQL:** índices em todas colunas de busca (placa, veiculo_id, motorista_id, data, venc)
- **Redis:** cache 30s-5min pra KPIs, lista OS, CPK
- **Cloudflare:** grátis, na frente do VPS (CDN + DDoS)
- **Rate limit:** 100 req/min por IP (evita abuso)

## Estimativa custo mensal pós-migração

- VPS KVM 2 Hostinger: R$ 40
- Cloudflare: R$ 0 (grátis)
- Domínio `pontualpetroleo.com.br`: R$ 40/ano (~R$ 3,30/mês)
- Firebase: R$ 0 (não usa mais)
- Total: **~R$ 45/mês** (vs Firebase pay-as-you-go quando escalar)

## Regras críticas pra qualquer Claude executando

1. **NÃO executar migração sem confirmação explícita da user** em cada fase
2. **NÃO deletar dados do Firestore** até user confirmar que Hostinger está estável
3. **Manter Firebase pago desligado (Blaze)** — só Free tier durante paralelo
4. **Backup ANTES de qualquer script destrutivo** (dump Firestore, dump MySQL)
5. **Playwright smoke test** após cada fase — verificar zero regressão

Ver também: [[feedback-so-mudar-o-que-user-pediu]] · [[feedback-abertura-sessao-consultar-contexto]]
