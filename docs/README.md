# Documentação Técnica — Logística IA

Sistema de gestão operacional para distribuidora de combustíveis (Pontual Logística).

## Sumário

| # | Documento | Conteúdo |
|---|---|---|
| 01 | [Visão Geral](01-visao-geral.md) | Contexto de negócio, escopo, stakeholders, operação crítica |
| 02 | [Arquitetura](02-arquitetura.md) | Stack tecnológica, camadas, fluxo de autenticação, decisões |
| 03 | [Modelo de Dados](03-modelo-dados.md) | Coleções Firestore, campos, relacionamentos, exemplos |
| 04 | [Módulos do Sistema](04-modulos.md) | Cada módulo: regras, telas, fluxos |
| 05 | [Segurança e RBAC](05-seguranca-rbac.md) | Controle de acesso granular, regras Firestore, Super Admin |
| 06 | [Deploy e Operação](06-deploy.md) | Build, deploy, hosting, rollback, monitoramento |
| 07 | [Scripts Python](07-scripts.md) | Seeds, importação, manutenção, deploy de regras |
| 08 | [Desenvolvimento](08-desenvolvimento.md) | Setup local, padrões de código, troubleshooting |
| 09 | [Rastreamento de Frota](09-rastreamento.md) | Mapa Leaflet, cercas, OC ativa, decisões técnicas |
| 10 | [Integração SASCAR](10-sascar-integracao.md) | Cloud Functions, SOAP, Secret Manager, emulator local, deploy |
| 11 | [Cercas Eletrônicas](11-cercas-eletronicas.md) | Polígono/círculo, eventos entrada/saída, edição com handles, ViaCEP, schema |

## Links rápidos

- **Aplicação em produção**: https://pontual-logistica.web.app
- **Firebase Console**: https://console.firebase.google.com/project/pontual-logistica
- **Repositório**: `C:\Users\Logistica01\projetos\logistica-ia`
- **Contexto rápido para Claude/agentes**: [`../CLAUDE.md`](../CLAUDE.md)
- **Documentação do RBAC** (componentes React): [`../frontend/src/rbac/README.md`](../frontend/src/rbac/README.md)

## Convenções desta documentação

- Caminhos absolutos sempre que possível
- Código de exemplo em blocos com linguagem identificada
- Tabelas para campos, decisões e mapeamentos
- Cada documento começa com um sumário breve e os pré-requisitos para entendê-lo

## Histórico de versões

| Data | Marco |
|---|---|
| 2026-05-05 | Decisão inicial: FastAPI + PostgreSQL + React |
| 2026-05-07 | Migração para Firebase Firestore + Authentication |
| 2026-05-12 | Estrutura inicial (login, frota, motoristas, OC, atrelamento, manutenção, férias, histórico) |
| 2026-05-13 | RBAC granular (setores, cargos, permissões denormalizadas) |
| 2026-05-13 | Documentação técnica completa criada |
| 2026-05-14 | Módulo Rastreamento (Leaflet + SASCAR), Cercas eletrônicas, Cloud Functions, persistência Firestore, aba OS na Manutenção, acesso pela rede interna |
| 2026-05-14 | Docs 09 e 10 adicionados; modelo de dados e módulos atualizados |
| 2026-05-15 | Cercas Fase 1: cerca circular, edição com drag handles, detecção entrada/saída em `sascarPosicoes`, coleção `cercas_eventos`, painel de eventos no rastreamento, busca de endereço via ViaCEP + Nominatim estruturado, filtro client-side de cercas |
| 2026-05-15 | Doc 11 adicionado; `cercas_eletronicas` ganhou formato/centro/raio; nova coleção `cercas_eventos`; `sascar_posicoes.ultimaPosicao` ganhou `dentroDe` |
