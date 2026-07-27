---
name: project-migracao-laravel-hostinger
description: Sistema atual React+Firebase será migrado pra Laravel+MySQL na Hostinger. Fases planejadas + trade-offs concretos + esforço estimado
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Decisão

Migrar backend do sistema logistica-ia de **Firebase (Firestore + Auth + Functions + Storage)** pra **Laravel 11 + MySQL** hospedado na Hostinger.

**Data da decisão preliminar:** 2026-07-17 (user pediu comparativo antes de decidir final).
**Branch base:** `feat/conversao-php-laravel` já existe no GitHub (gabrielc-neto/sistema-gestao-operacional).

## Why

- Hostinger não roda Firebase nativo, roda PHP/MySQL de fábrica → custo fixo ~R$ 30-80/mês vs Firebase pay-as-you-go
- Sistema fiscal (NF-e/CT-e/**MDF-e** — vale muito, hoje feito no XADM legado) tem lib PHP madura: `nfephp-org` grátis
- SQL relacional é melhor pra OS/Frota/Financeiro que exigem JOINs e transactions ACID (Firestore força desnormalizar tudo)
- Backup SQL trivial com mysqldump
- Sair do vendor lock-in Google
- Regra já existente [[project-migracao-hostinger]] avisa "não subir novos dados no Firestore"

## O que muda / não muda

**NÃO muda:**
- Frontend React continua igual — só troca camada de dados (Firebase SDK → axios + REST)
- APIs externas (SASCAR SOAP, CTA Smart XML, BrasilAPI, ViaCEP, OSRM, Nominatim, Open-Meteo) — todas HTTP, agnóstico de linguagem. Ver [[reference-cta-smart-api]] · [[reference_sascar_api]]
- Dados: script Python já lê Firestore → gera MySQL

**MUDA:**
- Firebase Auth → **Sanctum** (SPA auth do Laravel) — reescrever login/RBAC
- Firestore `onSnapshot` (tempo real) → **Laravel Reverb** (WebSocket self-hosted grátis) ou **Pusher** (~US$ 49/mês)
- Cloud Functions Node → **Jobs/Queues Laravel** + cron Hostinger (que é grátis, sem cobrança por execução)
- Firebase Storage → disco Hostinger ou S3
- Emulator Firebase local → PHP local (Laragon/Xampp/Docker)

## Fases propostas (14 semanas total)

1. **Fase 1 (4 sem)** — Laravel vazio + Sanctum + módulo Frota. Firebase segue rodando pros outros
2. **Fase 2 (6 sem)** — Migrar Motoristas, Clientes, OS/Manutenção, Vencimentos
3. **Fase 3 (4 sem)** — Migrar Despacho/OC (Reverb pro real-time) + desligar Firebase

## How to apply

- **Nunca merge inteiro** da branch `feat/migracao-supabase` — ela removeu Pneus/Vencimentos/Manutenção. Ver [[feedback-branch-supabase-nao-merge-tudo]]
- **Cherry-pick seletivo** de features boas dessa branch pro master (Compras, Intranet, ExportBar, GraficoEvolucaoCustos, MenuNavegacao, ModuleHeader)
- Ao criar módulos novos daqui pra frente: já pensar em SQL schema, não Firestore
- APIs externas: portar rate limits e workarounds (ex: CTA XML bug ano `0018`→`2018`) do Node pro PHP
- Emulador local vira Laragon (Windows) ou Docker

Ver também: [[project-migracao-hostinger]] · [[project-xadm-fiscal]] · [[project-branches-github-multiplas]]
