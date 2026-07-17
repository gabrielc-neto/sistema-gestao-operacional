---
name: project-migracao-hostinger
description: Sistema vai migrar pra banco de dados Hostinger — NÃO subir mais dados no Firestore
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

**Decisão estratégica user 2026-07-16:** o sistema vai migrar do Firebase Firestore pro banco de dados da Hostinger.

**Impacto imediato:**
- **NÃO fazer upload novo no Firestore** (nem coleções, nem Storage) — economiza quota e evita retrabalho
- Todo dado novo deve ser preparado em **formato neutro** (JSON + CSV + SQL) pronto pra importação futura
- Módulo de vencimentos da frota (analisado hoje) fica em `arquivo/frota-pontual/_vencimentos.json` até a migração

**Perguntas ainda em aberto (perguntar quando fizer sentido):**
- Banco Hostinger: MySQL ou PostgreSQL? (Hostinger padrão é MySQL/MariaDB)
- API vai ser feita em PHP (padrão Hostinger)? Node? Python?
- PDFs/anexos: FTP da Hostinger, S3 externo, ou outro?
- Migração total (todo sistema) ou por módulo?
- Timeline: quando começar?

**Estado atual do sistema (a preservar/migrar):**
- Firebase project: `pontual-logistica`
- Coleções ativas: veiculos, motoristas, atrelamentos, ordens_carregamento, abastecimentos_cta, sascar_posicoes, pneus, checklists_mensais, ferias, cercas_eletronicas, locais_favoritos, usuarios, setores, cargos + outras
- Firebase Auth ficará ou também migra? (importante — RBAC depende)
- Cloud Functions (SASCAR SOAP, jornada) — vão pra API PHP/Node?

**Ação atual (dados novos):**
- Frota-pontual dataset (477 PDFs analisados): mantido em JSON+CSV+SQL local
- Aguardar user definir stack Hostinger antes de escrever migração
- Ver também: [[project_migracao_postgresql_tms]] (tentativa anterior de sair do Firestore)
