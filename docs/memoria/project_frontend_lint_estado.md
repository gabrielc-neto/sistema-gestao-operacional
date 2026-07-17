---
name: project_frontend_lint_estado
description: "Estado do lint no frontend logistica-ia — 25 avisos de hook deixados de propósito, react-refresh desligado"
metadata: 
  node_type: memory
  type: project
  originSessionId: 286a1167-0f8d-4338-9f46-c8e87c86d92c
---

Frontend em `C:\Users\Logistica01\projetos\logistica-ia\frontend` (Vite+React, dev em 192.168.20.131:5173). Atalho Desktop "Logistica" aponta pra pasta de dados errada (F:\Users\Logistica), NÃO pro projeto.

**Estado do `npx eslint src` (2026-05-22):**
- Todos os `no-unused-vars` / `no-useless-assignment` corrigidos.
- Regra `react-refresh/only-export-components` **desligada** no `eslint.config.js` de propósito (contextos exportam Provider+hook no mesmo arquivo; só afeta Fast Refresh em dev, não runtime).
- **5 baixo-risco resolvidos via `eslint-disable-next-line` justificado** (não reestruturação): fetch-on-mount em Setores/Cargos/Usuarios/Motoristas + reset de permsLocal no Cargos. São padrões corretos que a regra nova marca como falso-positivo; `carregar()` é reusado no refresh então `setLoading(true)` não pode sair.
- **Restam 20 avisos de hook deixados intencionalmente:** `set-state-in-effect` (10), `exhaustive-deps` (7), `purity` (2), `refs` (1) — telas médio/alto risco: Rastreamento/mapa ao vivo, MapaFrota, useSascarPosicoes, useJornada, PermissionsContext, RBACContext, Atrelamento, Ferias, Historico, OC, Permissoes, Manutencao, Jornada.

**Why:** Wesley autorizou só os baixo-risco. Os 20 restantes mexem em mapa ao vivo, polling SASCAR (risco de loop = custo) e login/permissões (maior blast radius). Sem teste automatizado pra validar refactor.

**How to apply:** NÃO "re-corrigir" os 20 sem pedido explícito. Se atacar, tela-por-tela com dev server aberto. 🔴 alto risco (Rastreamento, MapaFrota, useSascarPosicoes, contexts) = só com teste manual cuidadoso. Dashboard.jsx 100% limpo. Estilo cauteloso reforçado por [[feedback_analise_esportiva_checklist]].

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **rbac**: [[feedback_sem_permissao]] · [[project-logistica-ia-frontend]] · [[project_apresentacao_mensal]]
