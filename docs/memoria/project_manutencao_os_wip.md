---
name: project-manutencao-os-wip
description: "Fluxo \"abrir OS + finalizar OS\" em Manutencao.jsx está em WIP — não liberado pros usuários ainda. finalizarOS e acaoOS NÃO são código morto."
metadata: 
  node_type: memory
  type: project
  originSessionId: be23c403-cf7a-4d17-a039-3fa116394f9b
---

Fluxo de "abrir OS + finalizar OS" em `src/pages/Manutencao.jsx` está em STANDBY, ainda não liberado pros usuários (confirmado por Wesley em 2026-06-10).

**Não tratar como código morto:**
- `finalizarOS` (linhas 995-1022, 28 linhas)
- state `acaoOS` + `setAcaoOS` (linha 642)
- ESLint reporta como `no-unused-vars` — IGNORAR esse warning específico aqui

**Why:** Wesley reverteu o item 1 do relatório de auditoria. Função vai ser religada quando o fluxo de abrir/finalizar OS for ativado em produção.

**How to apply:** Não propor deletar essas linhas em auditorias futuras. Se for limpar warnings ESLint, ignorar este específico ou adicionar `// eslint-disable-next-line no-unused-vars` com comentário "WIP — fluxo abrir/finalizar OS em standby".

Memória relacionada: [[project_manutencao_3abas]] — diz que botão "Finalizar rápido" foi removido, mas a função inteira fica preservada pra reativação.

---

## Relacionado por tema

- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
