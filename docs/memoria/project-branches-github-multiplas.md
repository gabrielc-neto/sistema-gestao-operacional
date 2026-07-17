---
name: project-branches-github-multiplas
description: 4 branches ativas no GitHub - cada uma com propósito específico + branch Laravel/MySQL já pronta pra migração Hostinger
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

# 🌿 Branches ativas — `gabrielc-neto/sistema-gestao-operacional`

## `master` (`dd5a1ea` · 2026-07-09)
Branch estável. Fix pneus-inspecao mobile.

## `main` (`6dbf51c` · 2026-05-15)
Fase 1 de cercas eletrônicas. **Provavelmente desatualizada** — trabalho ativo migrou pra `master`.

## `feat/migracao-supabase` (`5c3663f` · 2026-07-08) ⭐
User informou 2026-07-16 15:20 que **algumas funcionalidades desta branch vão pra principal**.
- Módulo Compras
- Barra de exportação
- Ajustes UI/RBAC
- **Ação:** cherry-pick essas features pra master antes de deprecar

## `feat/conversao-php-laravel` (`a9f1e1f` · 2026-06-30) 🎯 CRÍTICA PRA HOSTINGER
Sistema JÁ convertido pra **Laravel 11 + MySQL**.
- Frontend React mantido, backend virou PHP/Laravel
- **Isso é literalmente o que a Hostinger precisa** (MySQL + PHP padrão)
- **Ação:** avaliar reuso quando definir migração Hostinger — muito caminho andado
- Ver [[project-migracao-hostinger]]

## `feat/14-jul-cta-rotas` (`c3b0cf4` · 2026-07-15) — ATUAL
Branch ativa hoje (2026-07-15/16). 26+ commits acima de master:
- Integração CTA Smart
- Módulo Rotas + Locais + Pedágios ANTT
- APIs grátis (BrasilAPI, ViaCEP, Open-Meteo, ANP, Photon)
- Setup Obsidian completo
- 560 skills indexadas
- Auditoria completa da frota (91 placas + 37 motoristas + análise OCR)

## Fluxo típico
1. Trabalho novo em `feat/*` branch
2. Push pra GitHub como backup
3. Quando validado → merge pra `master`
4. `main` está desatualizada, considerar sincronizar

Ver também: [[project-migracao-hostinger]] · [[project_estado_atual]]
