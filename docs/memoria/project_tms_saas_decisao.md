---
name: project-tms-saas-decisao
description: PAUSADO 2026-05-26 - ideia de virar SaaS para vender foi pausada. Foco volta a ser TMS interno da Pontual. Documentos antigos no Desktop ficam arquivados.
metadata: 
  node_type: memory
  type: project
  originSessionId: 12cdd38c-f760-4c59-a218-01e8cea6aa59
---

## STATUS: PAUSADO (2026-05-26)

Wesley decidiu pausar a ideia de virar SaaS multi-tenant pra vender pra outras transportadoras. **Foco volta a ser sistema interno da Pontual.**

NAO descartado de vez - so pausado. Pode voltar no futuro. Por enquanto:
- NAO usar argumento de "vai virar produto" em apresentacao
- NAO mencionar cliente n.2 / outros clientes
- NAO falar em CNPJ separado, split societario, mensalidade SaaS
- Tratar como TI interna da Pontual

## Decisao atual (substitui a antiga)

| Item | Decisao atual |
|------|---------------|
| Modelo | Sistema interno Pontual (single-tenant) |
| Cloud | AWS RDS PostgreSQL + S3 (banco + arquivos) - ou seguir Firebase |
| IA dev | Claude Code Max 5x x 2 seats (Wesley + Gabriel) = R$ 1.100/mes |
| Hardware | 2 notebooks bons = R$ 14-18 mil |
| Custo mensal total | ~R$ 1.500/mes (AWS + Claude Max + dominio) |
| Justificativa | Custo TI interno vs comprar TMS mercado (Senior/Microsiga R$ 3.500-8.000/mes) |

## Documentos antigos no Desktop (arquivados, NAO apagar)

1. `Apresentacao_TMS_SaaS_Pontual.pptx` - guardar como referencia se ideia voltar
2. `Doc_Interno_Estrutura_Juridica_Cobranca.pdf` - guardar como referencia

## Quando voltar a falar de SaaS

So mencionar se Wesley pedir explicitamente. Caso contrario, tratar TMS como projeto interno da Pontual.

## Relacionado

- [[wesley]] - dono Pontual + dev TMS
- [[migracao-postgresql-tms]] - plano tecnico de troca de banco (vale pra interno tambem)
- [[operacao-pontual-tamanho]] - 36 motoristas + 6 admin
- [[nao-expor-custos-wesley]] - nunca expor horas dele
- [[apresentacao-mensal]] - apresentacao operacional mensal (intocada)

---

## Relacionado por tema

- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **apresentacao**: [[feedback_arquivo_explicito_obrigatorio]] · [[feedback_auto_skills]] · [[feedback_dados_reais]]
