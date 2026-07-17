---
name: Gestão Financeira — Prévia aprovada
description: Layout e seções do módulo de custos/lucro/faturamento aprovado pelo Wesley para implementar futuramente
type: project
originSessionId: aa056d7a-4096-4359-8dfb-a0aba1233f5b
---
Wesley aprovou a prévia do módulo de Gestão Financeira (arquivo `Desktop\preview_custos.html`).

**Why:** Será implementado no sistema Pontual após OC completa e Jornada.

**How to apply:** Usar a prévia como referência fiel de layout e funcionalidades ao implementar.

## Seções aprovadas

### KPIs (linha topo)
- Receita Bruta
- Custo Total
- Lucro Líquido + margem %
- Custo por viagem
- Custo por KM (média frota)
- Receita por viagem (ticket médio)

### Gráfico — Receita × Custo × Lucro
- Barras agrupadas por mês, últimos 6 meses
- Cores: azul escuro (receita), vermelho (custo), verde (lucro)
- Mês atual destacado em amarelo

### Composição de Custos (barras de proporção)
1. Combustível ~57% — diesel S10, 38 cavalos
2. Pedágio ~14% — praças + tag
3. Manutenção ~16% — preventiva + corretiva
4. Pessoal (motoristas) ~10% — salário + encargos + diárias
5. Outros ~4% — documentação, seguros

### Margem por Base
- PONTUAL vs REPLAN — barra de progresso

### Resumo rápido (mês atual)
- Viagens realizadas vs meta
- KM total rodados
- Consumo médio (km/L)
- Preço médio diesel
- Litros abastecidos

### Tabela de OCs — Rentabilidade
Colunas: OC | Motorista | Rota (base) | Receita | Custo | Lucro | Margem %
- OCs sem custo lançado mostram ⚠ pendente
- Alerta no topo: viagens concluídas sem custo registrado

### Ranking Motoristas
- Ordenado por margem %
- Mostra: viagens, KM, lucro total, barra proporcional

### Ranking Veículos — Custo/KM
- Custo por KM + consumo (km/L)
- Destaque vermelho para veículos acima da média (precisam revisão)

## Abas planejadas
1. Visão Geral (implementada na prévia)
2. Por Viagem
3. Combustível
4. Faturamento
5. Relatórios

## Dados que o sistema vai precisar coletar
- Abastecimento: litros, valor/litro, posto, data, placa, KM
- Pedágio: valor, viagem vinculada (OC)
- Receita por OC: valor do frete (campo novo na OC)
- KM por viagem: odômetro saída/chegada

## Arquivo de referência
`C:\Users\Logistica01\Desktop\preview_custos.html` — HTML standalone com dados fictícios

---
*Ver também: [[MEMORY|Índice de memórias]] · [[INDICE|Dashboard]] · [[CLAUDE|Contexto Pontual]]*

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **rbac**: [[feedback_sem_permissao]] · [[project-logistica-ia-frontend]] · [[project_apresentacao_mensal]]
