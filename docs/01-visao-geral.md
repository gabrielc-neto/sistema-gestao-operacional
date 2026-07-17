# 01 — Visão Geral

[← Voltar para o índice](README.md)

## Propósito

O **Logística IA** é o sistema de gestão operacional da **Pontual Logística**, uma distribuidora de combustíveis (petróleo). Ele substitui o controle anterior baseado em Excel + SASCAR e centraliza a operação de frota, motoristas, ordens de carregamento e documentação obrigatória.

## Contexto do negócio

| Aspecto | Detalhe |
|---|---|
| Setor | Distribuidora de combustíveis (petróleo) |
| Clientes | 60+ postos bandeira branca |
| Frota | ~37 caminhões: simples, bitrem, rodotrem |
| Capacidade | Até 35.000 litros por veículo |
| Compartimentos | Multi-setas (vários produtos por caminhão) |
| Produtos | Anidro, S10, S500, Gasolina (líquidos) |
| Despachantes | 3 simultâneos |
| Motoristas | Todos com celular Android/iPhone |
| Tecnologia legada | Excel + SASCAR |
| NF-e | Sim, emite |

## Operação crítica — Carga de Retorno

Caminhão fica vazio na rota → gestor detecta posição via SASCAR → envia ordem para carregar em usina → caminhão retorna com nova carga.

O sistema precisa suportar **despacho dinâmico em tempo real** — esse é o diferencial frente a planilhas.

## Stakeholders

| Papel | O que precisa |
|---|---|
| Diretor | Visão consolidada, indicadores, custos, lucratividade |
| Gestor de Logística | Painel de operação em tempo real, decisões de despacho |
| Despachante | Criar OCs, montar rotas, atribuir motorista e veículo |
| Motorista | Ver ordem do dia, confirmar entrega, registrar ocorrências (PWA mobile) |
| RH | Documentos obrigatórios, férias, eSocial |
| Faturamento | Conciliar OC com NF-e |
| Comercial | Pedidos dos clientes |
| Manutenção | Vencimentos de CIV, CIPP, CRLV, revisões |

## Visão comercial — SaaS

O sistema é construído desde o início pensando em **revenda para outras empresas** (distribuidoras, transportadoras). Por isso:

- Arquitetura prevê **multi-tenancy** (cada empresa isolada no Firebase)
- Cobrança via Stripe (a ativar quando entrar em vendas)
- Registro de software no INPI planejado
- Copyright em todos os arquivos

## Roadmap em fases

### Fase 1A — Base Operacional (semanas 1-4) ✅ Em execução
- Cadastros: veículos + compartimentos, motoristas, clientes (postos), produtos, usinas
- Registro de pedidos
- Estrutura do banco Firestore + regras de segurança

### Fase 1B — Despacho (semanas 4-6)
- Ordem de carregamento (substitui Excel) ✅
- Montagem de rota com paradas
- Romaneio PDF digital
- Painel dos 3 despachantes em tempo real

### Fase 2A — App Motorista (semanas 6-8)
- PWA: ver ordem do dia
- Confirmar entrega por compartimento
- Registrar ocorrências

### Fase 2B — Integrações (semanas 8-10)
- SASCAR: posição em tempo real e jornada
- NF-e: leitura e conciliação

### Fase 2C — Carga Dinâmica (semanas 10-12)
- Detecção de caminhão vazio
- Despacho de ordem de retorno
- Histórico de viagens

### Fase 3 — IA (meses 4-6)
- Previsão de demanda por posto
- Otimização de rotas
- Detecção de anomalias (litros divergentes)
- Alertas preditivos

## O que já está em produção

URL: https://pontual-logistica.web.app

- ✅ Login com Firebase Authentication
- ✅ Dashboard com KPIs e últimas OCs
- ✅ Frota (cavalos + carretas, atrelamento, bloqueios)
- ✅ Motoristas (cadastro, CNH, MOPP, NR-20, NR-35)
- ✅ Atrelamento (operações ATR/DES/SUB com histórico)
- ✅ Ordens de Carregamento (CRUD, numeração automática, multi-entrega)
- ✅ Manutenção (27 tipos de itens: documentação, motorista, mecânica)
- ✅ Férias (eSocial, alertas, status calculado)
- ✅ Histórico unificado (atrelamentos + OCs + manutenções)
- ✅ Usuários, Setores, Cargos com RBAC granular
- ✅ Tema claro/escuro

## O que ainda não está pronto

- ⏳ Integração SASCAR (rastreamento)
- ⏳ App PWA do motorista
- ⏳ NF-e (leitura e conciliação)
- ⏳ Relatórios PDF / Excel
- ⏳ Multi-tenancy ativo (estrutura prevista, ainda não isolado por empresa)
- ⏳ Cobrança Stripe
- ⏳ Módulo Financeiro

---

## Relacionado

- Próximo: [[02-arquitetura]]
- [[INDICE|🏠 Voltar ao índice]]
- [[CLAUDE|📖 Contexto do sistema]]
- [[MEMORY|🧠 Memórias]]
