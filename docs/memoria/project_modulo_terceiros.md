---
name: project-modulo-terceiros
description: "Desenho do módulo Transportadoras Terceiras do TMS — cadastro, alocação na OC, frete contratado, CT-e recebido. Doc 13 no projeto"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6724ac89-4074-45e1-a2c6-093d41392374
---

Desenho do módulo **Transportadoras Terceiras** (2026-05-22). Documentado em `projetos/logistica-ia/docs/13-modulo-terceiros.md` (indexado no README).

**Why:** Pontual contrata transportadoras terceiras (frota delas) pra parte das cargas, além da frota própria — precisa gerenciar isso no TMS. Ver identidade fiscal em [[project_logistica_ia]] e [[project_tms_mapa_completo]].

**How to apply:** DESENHO, nada implementado. Serve pra Pontual e pro produto SaaS (toda transportadora subcontrata).

Pontos-chave:
- **Banco = PostgreSQL (Supabase), padrão do TMS** — multi-tenant, toda tabela com `empresa_id` + RLS. NÃO é Firestore (Firestore é só o sistema legado da Pontual, fora do TMS novo). Ver [[project_migracao_postgresql_tms]].
- **Tabela `transportadoras`**: id, empresa_id, cnpj (auto-preenche via BrasilAPI), razao_social, **rntrc** (obrigatório ANTT), contato jsonb, dados_bancarios jsonb, situacao_receita, ativo. Unique(empresa_id, cnpj).
- **OC ganha colunas**: `tipo_transporte` ('propria'|'terceiro'), `transportadora_id` (FK), `placa_terceiro`, `motorista_terceiro`, `frete_contratado`.
- **Tabela `ctes_recebidos`**: id, empresa_id, oc_id, transportadora_id, numero, chave, valor, xml_url, recebido_em.
- **4 telas**: lista transportadoras, cadastro (auto-CNPJ), toggle na OC, painel de gasto com terceiros.
- **Regras honestas**: terceiro NÃO aparece no rastreamento GPS (frota não é da Pontual, sem SASCAR) — status manual. Jornada não se aplica. Custo terceirizado = frete pago. Validar RNTRC/CNPJ. Pontual só recebe/guarda o CT-e deles, não emite.
- **Fases**: MVP (cadastro auto-CNPJ + tipo na OC + frete) → 2 (anexar CT-e + painel gasto) → 3 (validação RNTRC/CNPJ) → 4 (puxar CT-e via SEFAZ/Focus NFe, manifestação do tomador).

Terceiros confirmados (empresa/CNPJ): E C STANYTCHYL TRANSPORTES, LODI E SCHUSARZ TRANSPORTADORA LTDA.

Próximo passo oferecido: detalhar o MVP em tarefas prontas pra implementar (campos exatos na OC + tela de cadastro).

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
