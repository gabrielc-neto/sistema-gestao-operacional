---
name: project-ibutton-descontinuado
description: 2026-06-09 — iButton SASCAR NÃO é mais usado. Substituído por login com usuário + senha que o motorista digita no tablet SasMDT.
metadata:
  node_type: memory
  type: project
  originSessionId: 22706086-23a9-4d35-8b77-32a27d9f6caa
---

iButton descontinuado. Identificação do motorista agora é **login com usuário + senha digitado no tablet SasMDT** (informado por Wesley em 2026-06-09).

**Why:** o iButton (chave física) não é mais usado pra identificar o motorista nos eventos SASCAR. Memórias antigas ([[project_sascar_ibutton_diagnostico]], [[project_jornada_motorista_plano]], [[project_motorista_caminhao_pontual]]) precisam ser lidas com esse ajuste.

**How to apply:**
- NÃO mencionar iButton como solução ativa, nem propor diagnóstico de iButton.
- NÃO levar pergunta sobre iButton pro suporte SASCAR.
- Quando ler "iButton segue o motorista" em memória antiga → traduzir como "login (user+senha) segue o motorista".
- A memória [[project_sascar_ibutton_diagnostico]] (7 perguntas pré-formatadas pro suporte) está OBSOLETA — não usar.
- Implicação pra /jornada "não iniciaram": cai na lista quem não fez login no tablet no dia. Inclui (a) desligados que continuam ativos no SASCAR, (b) folga/férias/atestado, (c) quem esqueceu de logar. Só (a) precisa ser zerado via botão "Desligado"; (b) e (c) são esperados.

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
