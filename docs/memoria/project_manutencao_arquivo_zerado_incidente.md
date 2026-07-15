---
name: manutencao-arquivo-zerado-incidente
description: Incidente 1-jun a 3-jun — Manutencao.jsx zerado (0 bytes) por 3 dias sem ninguem perceber; padrao de risco
metadata: 
  node_type: memory
  type: project
  originSessionId: 2899166c-546d-4ca0-ad27-bfa83d8cb768
---

Em 2026-06-01 11:02 o arquivo `frontend/src/pages/Manutencao.jsx` foi truncado pra 0 bytes (provavel save corrompido de editor/IDE). Backup do pendrive E: do mesmo dia 11:02 ja capturou o arquivo zerado. O sistema ficou com `/manutencao` totalmente quebrado (page error "Cannot convert object to primitive value", tela em branco) de seg 01-jun ate qua 03-jun sem ninguem perceber — Wesley so descobriu durante smoke test que rodei. Recuperado via `git restore` do commit `b28ed3d` (mesma manha, 2513 linhas funcionais).

**Why:** Pontual nao tem CI nem teste de fumaca automatico. Sem o smoke test do Playwright, esse tipo de regressao silenciosa (arquivo zerado, mas Vite serve, mas pagina especifica quebra) so e descoberto quando alguem precisa usar a feature.

**How to apply:**
1. Rodar `python scripts/smoke_test.py` periodicamente (varre todas as rotas privadas com login e reporta page errors) — script ja existe untracked no projeto.
2. Sempre que ver `git status` mostrar arquivo com `M` num path que voce nao esperava ter mexido, conferir `git diff --stat path` — se aparecer `-2513 / +0` ou similar, e o sinal classico de truncamento.
3. Antes de fazer `git restore` num arquivo modificado, conferir tamanho do working tree (`wc -l`) vs HEAD (`git show HEAD:path | wc -l`) — se working tree estiver muito menor, e safe restaurar.

---
*Ver também: [[MEMORY|Índice de memórias]] · [[INDICE|Dashboard]] · [[CLAUDE|Contexto Pontual]]*

---

## Relacionado por tema

- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **roteirizacao**: [[feedback-svg-logo-iteration-cost]] · [[feedback_falar_inviavel_cedo]] · [[feedback_nodejs_only]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
