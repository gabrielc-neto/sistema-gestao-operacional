---
name: project-pontual-devolucao-pattern
description: Como identificar devoluções de venda na planilha de Faturamento Pontual (não existe coluna explícita)
metadata: 
  node_type: memory
  type: project
  originSessionId: 8cf1f522-ae2c-49a7-9866-c55ada8bd1d1
---

A planilha de Faturamento da Pontual (formato ERP "TOTALIZADO P/TRANSPORTADOR") **não tem coluna CFOP nem campo "devolução"**. Para distinguir devolução de compra real, usar este padrão validado pelo user em 2026-06-30:

## Heurística confirmada

Uma linha Status='E' (Entrada) é **DEVOLUÇÃO DE VENDA** quando:
1. A contraparte (coluna Cliente) **também aparece como cliente em Status='S'** na mesma planilha
2. Tem valor e quantidade idênticos a uma venda recente do mesmo cliente (geralmente 1-7 dias antes)

**Caso confirmado:** LUCCA PETRO - COMBUSTIVEIS LTDA — 3 notas E (531245/531247/531248 em 28/05/26) eram devoluções de 3 vendas (531057/531084/531085 em 26/05/26), mesmo valor, mesma qtd, mesma placa.

## Fornecedores REAIS (não confundir com devolução)

Aparecem **só** como Status='E', nunca como cliente Status='S':

| Fornecedor | Produto |
|---|---|
| POTENCIAL BIODIESEL | B100 |
| BE8 S.A. | B100 |
| COCAMAR MAQUINAS AGRICOLAS | B100 |
| COOPCANA | Etanol Anidro |
| RAIZEN CAARAPO ACUCAR E ALCOOL | Etanol Anidro |
| CPA TERMINAL PARANAGUA | Diesel A / Gasolina A (terminal portuário) |

## Casos ambíguos a confirmar com fiscal

- **23 entradas em Araucária via placas TBX-5H17/TBX-5H14/BBE-9588** — user classificou como RETORNO, mas as contrapartes (GP, SMALL, ESTRADA, ART PETRO) também são clientes regulares. Pode ser devolução, broker, ou compra triangular. Só CFOP da NF resolve.

**Why:** Sem CFOP no relatório, qualquer Status='E' precisa de regra heurística pra separar compra de matéria-prima vs devolução de cliente. Se misturar, o "faturamento de venda" fica inflado pelo valor das devoluções.

**How to apply:** Sempre que rodar análise da planilha Maio FATURAMENTO (ou similar), marcar 3 categorias de Status='E':
1. **COMPRA FORNECEDOR** — contraparte só em E, não em S
2. **DEVOLUÇÃO** — contraparte também em S + valores casados
3. **RETORNO/A CONFIRMAR** — placas Pontual em Araucária ou outros padrões não casados

Faturamento líquido real = soma das vendas (Status=S) - devoluções confirmadas.

Relacionado: [[project-pontual-logo-white-aprovada]]
