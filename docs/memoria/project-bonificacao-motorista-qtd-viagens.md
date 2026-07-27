---
name: project-bonificacao-motorista-qtd-viagens
description: "Bônus de produtividade do motorista Pontual = QUANTIDADE DE VIAGENS realizadas no período. Não é por km, entrega ou meta financeira — é literalmente número de viagens contadas."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Fato

**Bônus de produtividade = número de viagens realizadas no período.**

Confirmado por Rosilda em 2026-07-21.

## Detalhes ainda a confirmar

- Valor R$ por viagem (fixo? escala por quantidade?)
- Distinção por tipo? (curta local · longa fora do PR · bitrem vs simples)
- Meta mínima pra bater bônus?
- Contagem: viagem = 1 ida+volta ou 1 sentido só?
- Base do dado: SASCAR (viagens detectadas por movimento) ou OCs registradas?

## Why

Modelo simples de incentivo: quanto mais viagens no mês, maior o bônus.
Alinha o interesse do motorista com a operação da distribuidora
(mais viagens = mais entregas = mais faturamento).

## How to apply

**No módulo de bonificação/fechamento:**
- Contar viagens do motorista no período
- Multiplicar por R$/viagem (parametrizável)
- Somar ao total de bonificação
- Mostrar no recibo: "Nº de viagens × R$ Y = R$ TOTAL"

**Fonte do dado:**
- Preferência: Ordens de Carregamento (OC) finalizadas com motorista X
- Fallback: viagens SASCAR (calcular por movimentos + retornos ao pátio)

Ver também: [[project-fechamento-motorista-so-bonificacao]] ·
[[project-modelo-custo-viagem-pontual]]
