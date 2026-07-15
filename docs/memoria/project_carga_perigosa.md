---
name: project-carga-perigosa
description: "100% da carga da Pontual é perigosa (combustível, classe ONU). Hazmat é sempre ligado — sem toggle por viagem."
metadata: 
  node_type: memory
  type: project
  originSessionId: abeae20b-7cc7-44ce-997c-8ecfd30e6159
---

**Toda** a carga transportada pela Pontual é **carga perigosa** (combustível: gasolina/diesel/etanol — classes ONU 3/1203/1202/1170 etc). Confirmado por Wesley em 2026-05-28.

**Why:** A Pontual é distribuidora de combustível. Não existe viagem com carga "comum" — é sempre hazmat.

**How to apply (afeta 3 features):**
- **Roteirização:** o perfil de rota é **sempre caminhão + hazmat** (evita túnel/centro urbano/restrição). NÃO criar opção "é carga perigosa?" — é constante. Ver [[project-roteirizacao-plano]] (Doc 15).
- **NBR 7503 (Ficha de Emergência + Envelope):** obrigação legal em **toda** OC, nunca opcional. É o gap #2 do [[project-levantamento-logistica]].
- **Cadastro de produtos:** todo produto carrega classe/número ONU. O cadastro de combustível deve ter campo ONU obrigatório.

Relacionado: [[project-roteirizacao-plano]], [[project-levantamento-logistica]], [[project_tms_mapa_completo]]

---

## Relacionado por tema

- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **roteirizacao**: [[feedback-svg-logo-iteration-cost]] · [[feedback_falar_inviavel_cedo]] · [[feedback_nodejs_only]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
