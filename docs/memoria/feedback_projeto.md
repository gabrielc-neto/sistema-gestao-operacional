---
name: feedback-projeto
description: Feedbacks e decisões técnicas consolidadas do Wesley sobre o projeto Pontual
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2ce7c21f-4561-4856-b5e5-3abd5884cd1d
---

**VDO ≠ SASCAR** — são fornecedores diferentes, contratos separados. Não confundir.
**Why:** Foram confundidos em sessões anteriores.
**How to apply:** VDO Fleet é para tacógrafo digital (Continental), SASCAR é rastreamento/jornada. Nunca tratá-los como a mesma coisa.

---

**Sólides é só ADM** — motoristas usam SASCAR (tablet + GPS + VDO), não Sólides.
**Why:** Sólides é RH/ADM, não operação de frota.
**How to apply:** Não sugerir Sólides para funcionalidades de motorista.

---

**Bash: usar forward slashes** — em Git Bash no Windows usar `/c/Users/...` e não `C:\Users\...`.
**Why:** Bash no Windows interpreta `\` como escape.
**How to apply:** Sempre usar `/c/`, `/d/` etc. em comandos Bash.

---

**Disco F intocável** — não mexer no disco F: da máquina (uso desconhecido, pode ser crítico).
**Why:** Wesley sinalizou explicitamente.
**How to apply:** Nunca listar, ler ou modificar arquivos no disco F:.

---

**Regra direção contínua = 4h (interna Pontual)** — mais restritiva que a lei (5h30). Não reverter sem perguntar ao Wesley.
**Why:** Decisão de conformidade interna da empresa.
**How to apply:** Limite em `LIMITES.direcaoContinuaMax` = 4h (240min).

---

**Parada/Esperar resetam direção contínua** — qualquer pausa (Parada, Esperar, Pausa, Refeição, Encerrar) zera o contador de direção contínua. Só "Dirigindo" acumula.
**Why:** Decisão final após 3 revisões (2026-05-21).
**How to apply:** Não reverter sem consultar Wesley. Histórico: v1→v2→v3→v4 (atual).

---

**Círculo em /cercas** — Wesley achou a UX atual "ruim demais" e quer refazer estilo SASCAR (cerca circular: centro + raio em metros). Polígono fica como opcional.
**Why:** Comparou com SASCAR/SASGC e a UX atual não serve para o dia a dia.
**How to apply:** Ao retomar /cercas, implementar circular como padrão.

---
*Ver também: [[MEMORY|Índice de memórias]] · [[INDICE|Dashboard]] · [[CLAUDE|Contexto Pontual]]*

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_solides_so_adm]]
- **jornada**: [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]] · [[project_apresentacao_mensal]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **roteirizacao**: [[feedback-svg-logo-iteration-cost]] · [[feedback_falar_inviavel_cedo]] · [[feedback_nodejs_only]]


## Mesma categoria (feedback)

[[feedback-auto-commit-quando-pedido]] | [[feedback-login-split-pattern]] | [[feedback-svg-logo-iteration-cost]] | [[feedback-windows-file-watcher]] | [[feedback_analise_esportiva_checklist]]
