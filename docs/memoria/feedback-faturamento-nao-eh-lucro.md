---
name: feedback-faturamento-nao-eh-lucro
description: "Nunca chamar valor de venda de \"lucro\" - faturamento é soma de notas, lucro é o que sobra depois de custos e impostos"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8cf1f522-ae2c-49a7-9866-c55ada8bd1d1
---

**REGRA:** Em análises financeiras (especialmente Pontual / combustíveis), **NUNCA** chamar valor de venda de "lucro". Faturamento bruto, faturamento líquido, receita e lucro são coisas distintas.

**Why:** Em 2026-06-30 escorreguei e rotulei R$ 66.936.353,17 como "TOTAL FATURAMENTO LIQUIDO (vendas)" no PPT — palavra "líquido" deu margem pro user ler como lucro. User corrigiu enfaticamente: "O FATURAMENTO NÃO É LUCRO". Em distribuidora de combustível margem é de 1-3% — confundir 66M de faturamento com 66M de lucro distorce a realidade por ~30x.

**How to apply:**
1. Usar termo **"faturamento bruto"** ou **"valor faturado"** quando o dado for só soma de notas
2. Nunca dizer "lucro", "rentabilidade", "margem" sem ter custo na planilha
3. Não usar a palavra "líquido" sem deixar claro o que foi descontado (devoluções? impostos? custos?)
4. Glossário correto:
   - **Faturamento bruto** = soma de NFs de venda
   - **Faturamento líquido** = bruto - devoluções - cancelamentos
   - **Receita líquida** = faturamento líquido - tributos sobre venda (ICMS/PIS/COFINS)
   - **Lucro bruto** = receita líquida - CPV (custo do produto vendido)
   - **Lucro operacional / EBIT** = lucro bruto - despesas operacionais
   - **Lucro líquido** = lucro operacional - despesas financeiras - IRPJ/CSLL
5. Se user pedir "lucro" e só tiver faturamento, **avisar explicitamente** que falta dado de custo

Relacionado: [[project-pontual-devolucao-pattern]]
