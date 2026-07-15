---
name: project-motorista-caminhao-pontual
description: "Regra operacional da Pontual — motorista tem CAMINHÃO HABITUAL mas pode trocar quando o normal vai pra serviço/manutenção. iButton segue o motorista, não o caminhão."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5ecc1bc2-6fdb-465e-bcfc-312ac32cd458
---

# Motorista ↔ caminhão na Pontual

## Regra confirmada por Wesley (2026-05-18)

- Cada motorista tem um **caminhão habitual** (ex: Cosme da Silva → BBE9588-2)
- Quando o caminhão habitual vai pra serviço/manutenção, o motorista **migra pra outro caminhão disponível** (ex: Cosme → SEF1H28)
- **iButton é do motorista, não do caminhão** — basta encostar no leitor do veículo que vai usar

## Implicação pro sistema

- **NÃO** vincular motorista a caminhão fixo no cadastro (ou se vincular, deixar como "habitual" e permitir override)
- Jornada por motorista é o caminho certo — independente de qual caminhão ele dirigiu
- Se aparecer mesmo motorista em 2+ caminhões no mesmo dia = normal, é troca
- Atrelamento/OC precisam refletir caminhão real do dia, não o habitual

## Como retomar
Ao fazer cadastro ou tela que vincule motorista a caminhão, manter regra acima. Conferir com Wesley se aparecer dúvida.

Relacionado: [[project_jornada_motorista_plano]], [[project_logistica_ia]]

---

## Relacionado por tema

- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
