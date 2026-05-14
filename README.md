# Logística IA — Pontual Logística

Sistema de gestão operacional para distribuidora de combustíveis.

**Produção:** https://pontual-logistica.web.app

---

## Quick start

```bash
# Instalar dependências
cd frontend
npm install

# Rodar local
npm run dev
# → http://localhost:5173

# Build + deploy
cd ..
deploy.bat
```

## Documentação

Toda a documentação técnica está em [`docs/`](docs/README.md):

| # | Documento | Resumo |
|---|---|---|
| 01 | [Visão Geral](docs/01-visao-geral.md) | Contexto de negócio, escopo, roadmap |
| 02 | [Arquitetura](docs/02-arquitetura.md) | Stack, camadas, decisões |
| 03 | [Modelo de Dados](docs/03-modelo-dados.md) | Coleções Firestore, campos, relacionamentos |
| 04 | [Módulos do Sistema](docs/04-modulos.md) | Frota, OC, Motoristas, Manutenção, etc. |
| 05 | [Segurança e RBAC](docs/05-seguranca-rbac.md) | Permissões granulares, regras Firestore |
| 06 | [Deploy e Operação](docs/06-deploy.md) | Build, deploy, hosting, monitoramento |
| 07 | [Scripts Python](docs/07-scripts.md) | Seeds, importação, manutenção |
| 08 | [Desenvolvimento](docs/08-desenvolvimento.md) | Setup local, padrões, troubleshooting |

## Documentação adicional

- [`CLAUDE.md`](CLAUDE.md) — contexto compacto para agentes Claude
- [`frontend/src/rbac/README.md`](frontend/src/rbac/README.md) — guia de uso dos componentes RBAC

## Stack

**Frontend:** React 19 + Vite 8 + react-router-dom 7 + Firebase SDK 12

**Backend:** Firebase Firestore + Firebase Authentication + Firebase Hosting

**Scripts:** Python 3.14 + firebase-admin

## Estrutura

```
logistica-ia/
├── frontend/          ← React SPA
│   └── src/
│       ├── pages/     ← rotas
│       ├── rbac/      ← controle de acesso
│       ├── contexts/  ← Auth, Theme
│       └── firebase/  ← config
├── scripts/           ← Python admin (seeds, import)
├── docs/              ← documentação técnica
├── firestore.rules    ← regras de segurança
├── firebase.json
└── deploy.bat
```

## Status do projeto

✅ **Em produção:** Login, Dashboard, Frota, Motoristas, Atrelamento, OC, Manutenção, Férias, Histórico, RBAC completo (Setores, Cargos, Usuários).

⏳ **Em desenvolvimento:** PWA motorista, integração SASCAR, relatórios PDF.

📋 **Planejado:** Multi-tenancy ativa, módulo Financeiro, IA preditiva.

Ver [docs/01-visao-geral.md](docs/01-visao-geral.md) para o roadmap completo.

## Licença

© 2026 Pontual Logística. Todos os direitos reservados. Sistema proprietário.
