---
name: project-pontual
description: "Sistema Pontual Logística — gestão de frota e despacho para distribuidora de combustíveis, stack Firebase + React + FastAPI"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2ce7c21f-4561-4856-b5e5-3abd5884cd1d
---

**Projeto:** Sistema Pontual Logística IA — construído do zero para distribuidora de combustíveis.

**Why:** Empresa usa Excel + SASCAR hoje, sem sistema próprio. Objetivo final: vender como SaaS para outras distribuidoras/transportadoras.

**How to apply:** Toda sugestão técnica deve considerar o contexto de frota, despacho e combustíveis. Priorizar simplicidade operacional pois usuários finais são despachantes, não técnicos.

---

## Empresa
- Clientes: 60+ postos bandeira branca
- Frota: ~37 caminhões (simples, bitrem, rodotrem) — capacidade até 35.000L
- Compartimentos multi-setas: múltiplos produtos por caminhão
- Produtos: Anidro, S10, S500, Gasolina
- Motoristas: todos com celular (Android/iPhone)
- 3 despachantes simultâneos
- Emite NF-e

## Stack Técnica (decisões confirmadas)
| Componente | Tecnologia |
|---|---|
| Backend | Python (FastAPI) |
| Banco | **Firebase Firestore** (mudou de PostgreSQL em 2026-05-07) |
| Auth | Firebase Authentication (email/senha) |
| Frontend | React |
| App motorista | PWA |
| Hospedagem | Local (dev) → VPS depois |
| Pagamentos (SaaS) | Stripe |
| Propriedade | Registrar no INPI (~R$80) |

## Ambiente de Dev (PC atual — Windows 11)
- Python 3.14.4
- Node.js v24.14.1
- Git 2.53.0
- Firebase (nuvem, sem instalar localmente)

## Arquitetura de Acesso (RBAC)
- Usuário → Setor → Cargo → Permissões (`modulo.acao`)
- Firestore: `setores`, `cargos`, `permissoes_catalogo`, `usuarios`
- Hook: `useRBAC()` / componente `<ProtegerPor>`
- Super Admin ignora todas as validações

## Regras de Negócio Críticas
1. Caminhão com jornada no limite NÃO pode ser despachado
2. Compartimento só carrega 1 produto por vez
3. OC bloqueia veículo para outros despachantes
4. Litros entregues conciliados com NF-e
5. Carga de retorno: vazio + posição SASCAR → nova OC possível
6. OS aberta bloqueia veículo automaticamente (campo `veiculos.bloqueio.ativo`, origem `"os"`) — libera só ao finalizar. OS editável só por 24h.

## Status em 2026-05-07 (último backup)
- Firebase projeto: `pontual-logistica`
- RBAC implementado com seed (`scripts/seed_rbac.py` — 6 setores, 12 cargos, ~60 permissões)
- Frota (`frota_pontual.html`) ainda em localStorage — migração para Firestore pendente
- Backup do projeto em: `D:\Backup-Claude-2026-05-28\projetos\logistica-ia\`

## Visão SaaS
- Multi-tenancy: cada empresa isolada no Firebase
- Cobrança: Stripe
- INPI: registrar como programa de computador

---
*Ver também: [[MEMORY|Índice de memórias]] · [[INDICE|Dashboard]] · [[CLAUDE|Contexto Pontual]]*

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **rbac**: [[feedback_sem_permissao]] · [[project-logistica-ia-frontend]] · [[project_apresentacao_mensal]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
