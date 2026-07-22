---
name: project-fechamento-motorista-so-bonificacao
description: "Módulo de fechamento de motorista da Pontual cobre APENAS bonificação/prêmio — NÃO calcula salário, HE, encargos, INSS ou holerite. Salário é responsabilidade do RH (fora do sistema)."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Fato

**Módulo de fechamento de motorista = SÓ bonificação.**

Confirmado por Rosilda em 2026-07-21 durante planejamento do módulo.

**NÃO faz parte do escopo:**
- ❌ Salário base (RH)
- ❌ Horas extras trabalhistas (RH)
- ❌ Adicional noturno (RH)
- ❌ Adicional periculosidade MOPP 30% (RH)
- ❌ INSS, IRRF, VT, VA (RH)
- ❌ Holerite formal (RH)
- ❌ Faltas, atrasos (RH)

**FAZ parte do escopo:**
- ✅ Bonificação/prêmio por produtividade
- ✅ Refeições/diárias pagas por viagem
- ✅ Bônus por meta (a definir — sem sinistro? entregas? km?)
- ✅ Consolidação de dados operacionais (SASCAR, viagens, vistorias)
- ✅ Recibo/relatório do valor bonificado

## Why

Separação de responsabilidades: **RH** cuida do contrato trabalhista formal
(CLT, encargos, folha), **Sistema Pontual** cuida da operação e do que a
empresa paga a MAIS além do salário como incentivo.

Motivo prático: sistema não deve virar folha de pagamento (regulação complexa,
riscos trabalhistas). Bonificação é dado operacional simples.

## How to apply

**Ao propor módulo:**
- Nomear como "Bonificação" ou "Fechamento operacional" — NUNCA "holerite" ou "folha"
- Sem campos de INSS/IRRF/encargos
- Sem cálculo de HE trabalhista (jornada SASCAR é pra Lei 13.103, não pagamento)
- Sem menção a "salário"

**Estrutura sugerida:**
```
Bonificação do motorista X — mês/período
├── Refeições (café/almoço/jantar por viagem)
├── Diárias (pernoite fora)
├── Prêmio produtividade (meta)
├── Bônus segurança (sem sinistro/vistoria OK)
└── Total bonificação a pagar
```

**Saída:** PDF com valores + assinatura digital (PadAssinatura existente).
**Integração:** exporta CSV/Excel pra RH complementar no holerite oficial.

Ver também: [[project-pontual-nao-desconta-multa-motorista]] ·
[[project-modelo-custo-viagem-pontual]] ·
[[project-custo-motorista-pontual]]
