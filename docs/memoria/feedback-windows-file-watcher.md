---
name: feedback-windows-file-watcher
description: "Vite/HMR on Windows ignores file edits made from Claude's bash shell — user must restart dev server manually"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2f7e3d50-3571-4b84-bb8a-7b9e0bfbd827
---

Windows file watcher (Vite HMR) não detecta edits que o shell do Claude faz nos arquivos. Mudança fica no disco mas dev server não recarrega.

**Why:** Aconteceu em 2026-06-15 no projeto logistica-ia/frontend. Editei main.jsx para forçar HMR, watcher ignorou, processo Vite (PID 28996) continuou servindo versão antiga. Tentar matar via `kill` no bash falhou (permission denied — processo do usuário Windows).

**How to apply:** Quando precisar recarregar dev server Windows:
1. Não tentar `kill -9` no bash NEM `Stop-Process` no PowerShell — ambos dão "Acesso negado" em processos do user Windows
2. **Subir novo dev EU mesmo (autonomia confirmada pelo user 2026-06-15):**
   ```bash
   cd "C:/Users/Logistica01/projetos/logistica-ia/frontend" && npm run dev > vite-bg.log 2>&1 &
   sleep 10
   cat vite-bg.log | tail -10
   ```
   Vite escolhe próxima porta livre (5173 → 5174 → 5175 → 5176...) deixando os zumbis pra trás. Validar com `curl http://localhost:<porta>/`. Atualizar a porta na memória [[project-logistica-ia-frontend]] quando subir.
3. Zumbis só morrem se o user reiniciar a máquina ou matar pelo Gerenciador de Tarefas dele

Relacionado: [[project-logistica-ia-frontend]]

---

## Relacionado por tema

- **cta**: [[project_estado_atual]] · [[project_levantamento_logistica]] · [[project_logistica_ia]]
- **manutencao**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]


## Mesma categoria (feedback)

[[feedback-auto-commit-quando-pedido]] | [[feedback-login-split-pattern]] | [[feedback-svg-logo-iteration-cost]] | [[feedback_analise_esportiva_checklist]] | [[feedback_arquivo_explicito_obrigatorio]]
