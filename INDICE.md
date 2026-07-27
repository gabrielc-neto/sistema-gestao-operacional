
# 🏠 Sistema Logística IA — Índice

Dashboard central do vault. Clique em qualquer link pra navegar.

## 📖 Contexto do sistema

- [[CLAUDE|Contexto Pontual — RBAC, decisões técnicas, fases]]
- [[README|README do repositório]]
- [[SECURITY|Segurança do sistema]]

## 📚 Documentação técnica

- [[docs/01-visao-geral|1. Visão geral]]
- [[docs/02-arquitetura|2. Arquitetura]]
- [[docs/03-modelo-dados|3. Modelo de dados Firestore]]
- [[docs/04-modulos|4. Módulos do sistema]]
- [[docs/05-seguranca-rbac|5. Segurança e RBAC]]
- [[docs/06-deploy|6. Deploy]]
- [[docs/07-scripts|7. Scripts auxiliares]]
- [[docs/08-desenvolvimento|8. Guia de desenvolvimento]]
- [[docs/09-rastreamento|9. Rastreamento]]
- [[docs/10-sascar-integracao|10. Integração SASCAR]]
- [[docs/11-cercas-eletronicas|11. Cercas eletrônicas]]
- [[docs/12-migracao-postgresql-tms|12. Migração PostgreSQL → Firestore]]
- [[docs/13-modulo-terceiros|13. Módulo terceiros]]
- [[docs/14-levantamento-logistica|14. Levantamento logística]]
- [[docs/15-roteirizacao|15. Roteirização]]

## 🧠 Memória do projeto

Descobertas, decisões e feedbacks ao longo do tempo:

- [[docs/memoria/MEMORY|Índice de memórias]]
- [[docs/memoria/project_estado_atual|Estado atual do projeto]]

## 💬 Conversas Claude Code

Histórico completo de todas as sessões (exportado do `.jsonl` para .md legível):

- 📂 `docs/conversas-claude/` — uma conversa por arquivo, com timestamp
- 🔄 Novo snapshot criado automaticamente a cada boot (via `iniciar-sistema.bat`)
- 📥 Snapshot manual: duplo clique em `salvar-conversa.bat`

## 🎯 Skills disponíveis (560)

Todas as skills do Claude Code — com descrição do que cada uma faz:

- [[docs/skills/INDICE-SKILLS|📚 Índice completo por categoria]] (23 categorias)
- Suas skills personalizadas Pontual:
  - [[docs/skills/kpi-assistant|kpi-assistant]] — análise de KPIs logísticos
  - [[docs/skills/logistics-exception-management|logistics-exception-management]] — exceções de freight
  - [[docs/skills/returns-reverse-logistics|returns-reverse-logistics]] — logística reversa
  - [[docs/skills/weather-fetcher|weather-fetcher]] · [[docs/skills/weather-svg-creator|weather-svg-creator]]
- Atualizar: `python scripts/indexar-skills.py`

## 🗂 Arquivo

Material auxiliar não-versionado (planilhas, PPTs, fiscais, protótipos):

- `arquivo/desktop/` — 43 arquivos que estavam no Desktop
- `arquivo/documents-fiscal/` — 96 CTes/XMLs/PDFs fiscais
- `arquivo/downloads-pontual/` — 2001 arquivos de trabalho movidos do Downloads
- `experimentos/` — protótipos antigos (pedagio-work, xadm-processor, sistema-supabase-antigo)

## 🚀 URLs do sistema

- [[TUNNEL-URL|🌐 URL do Túnel Cloudflare — atual]] (arquivo atualizado a cada boot)
- **Produção:** https://pontual-logistica.web.app
- **Dev local:** http://localhost:5173 (após próximo boot)
- **Emu UI:** http://localhost:4000

## 🔧 Git

- Branch estável: `master` @ `dd5a1ea`
- Branch ativa: `feat/14-jul-cta-rotas` (12 commits acima)
- Ainda não empurrada pro remote — quando validado, `git push -u origin feat/14-jul-cta-rotas`

## Todas as memorias


### Usuario (1)

- [[user_wesley]]

### Projeto (53)

- [[project-logistica-ia-frontend]]
- [[project-pendrive-backup]]
- [[project-pontual-logo-white-aprovada]]
- [[project_apresentacao_mensal]]
- [[project_banco_aws_decidido]]
- [[project_carga_perigosa]]
- [[project_estado_atual]]
- [[project_excel_vencimentos_frota]]
- [[project_firestore_emulator_off]]
- [[project_frontend_lint_estado]]
- [[project_frota_pontual_html]]
- [[project_gestao_financeira_preview]]
- [[project_github]]
- [[project_ibutton_descontinuado]]
- [[project_jornada_3fontes_plano]]
- [[project_jornada_historico_plano]]
- [[project_jornada_motorista_plano]]
- [[project_levantamento_logistica]]
- [[project_logistica_ia]]
- [[project_logistica_rastreamento_levantamento]]
- [[project_manutencao_3abas]]
- [[project_manutencao_arquivo_zerado_incidente]]
- [[project_manutencao_os_wip]]
- [[project_mcp_config]]
- [[project_mempalace]]
- [[project_migracao_postgresql_tms]]
- [[project_modulo_terceiros]]
- [[project_motorista_caminhao_pontual]]
- [[project_operacao_pontual_tamanho]]
- [[project_padrao_apresentacoes]]
- [[project_pedagio_veloe]]
- [[project_pontual]]
- [[project_producao_deploy_pausado]]
- [[project_proposta_valor_tms]]
- [[project_rastreamento_eta_destino]]
- [[project_rastreamento_precisao_2026-06-08]]
- [[project_rastreamento_sascar_fase2]]
- [[project_relatorio_px]]
- [[project_relatorio_terceiro]]
- [[project_relatorio_vdo]]
- [[project_responsivo_mobile]]
- [[project_roteirizacao_plano]]
- [[project_roteirizacao_teste]]
- [[project_sascar_cameras_plano]]
- [[project_sascar_cercas_api_bloqueada]]
- [[project_sascar_ibutton_diagnostico]]
- [[project_sascar_retencao_eventos]]
- [[project_scraping_tms]]
- [[project_sessao_2026-06-03]]
- [[project_tms_mapa_completo]]
- [[project_tms_saas_decisao]]
- [[project_valorizacao_monetizacao]]
- [[project_vdo_api_solicitacao]]

### Feedback (26)

- [[feedback-auto-commit-quando-pedido]]
- [[feedback-login-split-pattern]]
- [[feedback-svg-logo-iteration-cost]]
- [[feedback-windows-file-watcher]]
- [[feedback_analise_esportiva_checklist]]
- [[feedback_arquivo_explicito_obrigatorio]]
- [[feedback_arquivos_downloads]]
- [[feedback_auditoria_estatica_nao_basta]]
- [[feedback_auto_skills]]
- [[feedback_bash_forward_slashes]]
- [[feedback_colocar_no_ar_completo]]
- [[feedback_dados_reais]]
- [[feedback_disco_f_intocavel]]
- [[feedback_falar_inviavel_cedo]]
- [[feedback_nao_expor_custos_wesley]]
- [[feedback_nao_inventar_colunas]]
- [[feedback_nao_subir_sem_aprovacao]]
- [[feedback_nodejs_only]]
- [[feedback_notebooklm_consulta]]
- [[feedback_projeto]]
- [[feedback_salvar_contexto]]
- [[feedback_sem_permissao]]
- [[feedback_solides_so_adm]]
- [[feedback_ui_perguntar_largura_altura]]
- [[feedback_vdo_nao_sascar]]
- [[feedback_web_search_obrigatorio]]

### Referencia (3)

- [[reference_firestore_cache_offline]]
- [[reference_padrao_visual_pontual_xlsx]]
- [[reference_sascar_api]]


## Todas as conversas Claude

- [[2026-06-15_1558_ola-claude|2026-06-15_1558_ola-]]
- [[2026-06-22_1019_quero-o-beckut-de-tudo-tudo-que-estiver-faltando-no-pendrive|2026-06-22_1019_quer]]
- [[2026-06-24_1023_ola-claud-acesse-o-pendrive-usb-d-e-veja-se-todos-os-beckup|2026-06-24_1023_ola-]]
- [[2026-06-25_0924_ola-claude-quero-que-instale-essa-skill-por-completo-https|2026-06-25_0924_ola-]]
- [[2026-06-25_1016_ative-e-coloque-no-ar-o-httplocalhost5175dashboard-e-a|2026-06-25_1016_ativ]]
- [[2026-06-25_1545_local-command-caveatcaveat-the-messages-below-were-genera|2026-06-25_1545_loca]]
- [[2026-06-26_1531_estou-com-3-telas-mas-o-pc-no-est-identificando-pode-me-a|2026-06-26_1531_esto]]
- [[2026-06-27_0819_preiso-de-ajuda-estou-c|2026-06-27_0819_prei]]
- [[2026-06-27_1047_ola-quero-que-acesse-o-slide-apresentao-1-horas-que-est|2026-06-27_1047_ola-]]
- [[2026-06-29_1043_coloque-o-httplocalhost5175dashboard-no-ar-e-todos-os|2026-06-29_1043_colo]]
- [[2026-06-29_1150_instalei-o-msi-winusbdisplay-porem-ele-deu-windown-usb-disp|2026-06-29_1150_inst]]
- [[2026-06-29_1334_coloque-httplocalhost5175dashboard-no-ar|2026-06-29_1334_colo]]
- [[2026-06-29_1723_quero-que-acesse-acesse-a-plnilha-maio-faturamento-e-quero|2026-06-29_1723_quer]]
- [[2026-06-30_1413_httplocalhost5175dashboard-ative-o-sistema|2026-06-30_1413_http]]
- [[2026-07-01_0823_ola-quero-apresentao-de-em-power-point-quero-que-separe|2026-07-01_0823_ola-]]
- [[2026-07-08_1219_comite-tudo-de-hoje|2026-07-08_1219_comi]]
- [[2026-07-10_0941_separao-planilha-maio-e-junho|2026-07-10_0941_sepa]]
- [[2026-07-13_1006_httplocalhost5175manutencao-coloque-o-sistema-no-ar|2026-07-13_1006_http]]
- [[2026-07-13_1010_ola|2026-07-13_1010_ola]]
- [[2026-07-15_0830_httplocalhost5175dashboard-coloque-no-ar-junto-ao-https|2026-07-15_0830_http]]

## 💾 Backup Pendrive

Cópia completa do pendrive D: em `arquivo/pendrive-completo/` — cofre pra restaurar Claude Code / repo em outro PC.

- [[arquivo/pendrive-completo/README|📄 Como restaurar em outro PC]]
- Copiado em: 2026-07-15 15:24
- Total: 41G · 401807 arquivos
- Backups Claude, Logística (14 snapshots), PC-Completo, Ruflo-Ecosystem

## 💾 Backup Pendrive

Cópia completa do pendrive D: em `arquivo/pendrive-completo/` — cofre pra restaurar Claude Code / repo em outro PC.

- [[arquivo/pendrive-completo/README|📄 Como restaurar em outro PC]]
- Copiado em: 2026-07-15 15:24
- Total: 41G · 401807 arquivos
- Backups Claude, Logística (14 snapshots), PC-Completo, Ruflo-Ecosystem
