---
name: feedback-ui-perguntar-largura-altura
description: "Quando Wesley pede ajuste de tamanho em UI (gráfico/card/modal), perguntar de cara largura/altura/ambos com opções concretas em vez de chutar uma dimensão e ir testando."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f19d7b28-476c-497b-956f-db7e0a18f02f
---

Quando Wesley diz "diminui", "aumenta", "tá pequeno", "tá grande" sobre uma UI, NÃO chutar qual dimensão mexer. Perguntar de cara com `AskUserQuestion` ou pelo menos numa frase:

- Largura, altura ou ambos?
- Quantos por linha? (1, 2, 3, scroll horizontal)
- Layout: cards separados OU um gráfico só com agrupamento?

Também: quando ele diz "do lado do outro" sobre gráficos, padrão é **barras agrupadas no mesmo gráfico** (eixo X = mês, dentro do mês N barras coloridas), NÃO N gráficos separados lado a lado. Confirmar antes de codar.

**Why:** Em 2026-06-05 fiquei 12+ ciclos ajustando largura/altura/grid do gráfico de Manutenção/Lançamento NF porque interpretei "maior/menor" como container, depois viewBox, depois gridTemplateColumns. Wesley cansou — "puta que pariu, para de ser burro". Cada chute custou um round-trip e ele teve que repetir a mesma coisa de jeitos diferentes. O erro grosso foi montar 1 gráfico por categoria quando ele queria barras agrupadas (1 gráfico com Lavagem+Manutenção+Peça lado a lado dentro do mês).

**How to apply:** Primeiro ajuste de tamanho/layout em UI → pergunta. Segundo ajuste no mesmo elemento → continua perguntando se ainda tiver ambiguidade (largura X, altura Y, etc). Só sair chutando quando ele explicitar a dimensão (ex: "diminui só a largura"). Relacionado: [[feedback_falar_inviavel_cedo]] e [[feedback_arquivo_explicito_obrigatorio]] — ambos são sobre alinhar ANTES de executar.

---

## Relacionado por tema

- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]


## Mesma categoria (feedback)

[[feedback-auto-commit-quando-pedido]] | [[feedback-login-split-pattern]] | [[feedback-svg-logo-iteration-cost]] | [[feedback-windows-file-watcher]] | [[feedback_analise_esportiva_checklist]]
