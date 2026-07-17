---
name: project-pedagio-veloe
description: Provedor de pedágio da frota interna Pontual é Veloe (não Sem Parar/ConectCar). Alvo da futura integração de custo/viagem.
metadata: 
  node_type: memory
  type: project
  originSessionId: abeae20b-7cc7-44ce-997c-8ecfd30e6159
---

Pedágio da **frota interna** da Pontual usa **Veloe** (tag de pedágio, grupo Alelo/Elopar). Confirmado por Wesley em 2026-05-28.

**Why:** O Doc 14 (levantamento logística) listava genericamente "TAG Sem Parar/ConectCar" — estava errado. A integração de pedágio real (custo/viagem, fase 5) deve mirar a **Veloe** (API ou export CSV), não os concorrentes.

**How to apply:**
- Quando for planejar/implementar **pedágio real** ou **custo por viagem**, o alvo é Veloe — verificar se Veloe tem API/portal de export antes de assumir scraping.
- "Frota interna" = motoristas próprios. **Terceiros (E C STANYTCHYL, LODI E SCHUSARZ) pagam pedágio por conta deles** (confirmado Wesley 2026-05-28) — pedágio NÃO entra no cálculo de custo de viagem de terceiro, só da frota interna. Custo de frete contratado de terceiro já vem fechado.
- Pedágio é um dos itens de **custo logístico** ainda ❌ no Doc 14 (seção 7), junto de diesel (CTA Smart) e km/hodômetro (SASCAR).

Relacionado: [[project-levantamento-logistica]], [[project_modulo_terceiros]], [[project_tms_mapa_completo]]

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **cta**: [[feedback-windows-file-watcher]] · [[project_estado_atual]] · [[project_levantamento_logistica]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
