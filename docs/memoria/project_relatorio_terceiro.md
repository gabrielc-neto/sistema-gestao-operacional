---
name: Relatório Transportadores Terceiros — Erlei e João
description: Geração de PPTX de análise anual para transportadores terceirizados Erlei e João, dados 2025, com colunas de litros inconsistentes entre arquivos
type: project
originSessionId: 2e563b98-6d80-45c6-9243-5d0562ef0cf6
---
Script gerador: `C:/Users/Logistica01/Downloads/gerar_relatorio_terceiro.js`
Arquivo gerado: `C:/Users/Logistica01/Downloads/RELATORIO_TRANSPORTE_2026_04_v2.pptx`
Fonte de dados: 24 arquivos XLSX em `C:/Users/Logistica01/Downloads/` (Erlei + João, Jan–Dez 2025)

## Estrutura dos arquivos

Arquivos nomeados: `Erlei 01-MM a 31-MM.xlsx`, `Joao 01-MM a 31-MM.xlsx`, `01-12 a 31-12-25 Erlei/Joao.xlsx`

Sheet única: "Extrato Bancário" — título real: RELAÇÃO MENSAL DE EMBARQUES

Colunas: NUMERO NF | [LITROS — posição varia] | DATA EMISSAO | VALOR DA NF | DATA EMBARQUE | ORIGEM | DESTINO | RAZAO SOCIAL TRANSPORTADORA | PLACA | NOME | CPF

## Coluna de LITROS — inconsistências críticas

| Arquivo | Col LITROS | Observação |
|---|---|---|
| Erlei Jan | col 6 (null header, entre DESTINO e RAZAO) | implícita |
| Erlei Fev–Set, Nov não | col 1 (null header) | implícita |
| Erlei Abr | col 1 (label: "QUANTIDADE LITROS") | explícita |
| **Erlei Out** | col 1 | valores em MILHARES → multiplicar ×1000 (ex: 8 = 8.000 L) |
| **Erlei Nov, Dez** | **SEM COLUNA** | dados indisponíveis |
| **João (todos os meses)** | **SEM COLUNA** | dados indisponíveis |

Detecção: script usa lógica por valor (col null com inteiros 1–100.000 nas 10 primeiras linhas).

## Totais auditados (2025)

- Total NFs/viagens: 5.665 (sem duplicatas)
- Com litros disponíveis: 3.817 registros (apenas Erlei Jan–Out)
- Total litros real: 19.243.550 L
- Transportadoras: Erlei e João

## Estrutura da apresentação (8 slides)

1. Capa
2. Visão Geral — KPIs + resumo por transportadora
3. Comparativo Erlei vs João
4. Top Rotas — tabela
5. Gráfico Rotas × Viagens × Litros
6. Evolução Mensal de Litros (linha)
7. Detalhe por Placa e Mês
8. Alertas e Observações

**Why:** Apresentação para diretoria da Pontual com dados reais de viagens e volumes dos terceiros.

**How to apply:** Ao regerar o relatório, sempre usar detecção dinâmica de colunas (por valor, não por posição fixa). Multiplicar ×1000 valores < 100 no campo litros. Avisar sobre ausência de litros para João e Erlei Nov/Dez.

---
*Ver também: [[MEMORY|Índice de memórias]] · [[INDICE|Dashboard]] · [[CLAUDE|Contexto Pontual]]*

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **planilha**: [[feedback_auto_skills]] · [[feedback_dados_reais]] · [[feedback_nao_inventar_colunas]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
