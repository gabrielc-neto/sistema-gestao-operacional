---
name: feedback-bash-forward-slashes
description: Nesta estação Windows o Bash tool come barras invertidas em paths — usar barras normais
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 26cb6b10-8ceb-4306-95ba-a3472531fa97
---

Na estação do Wesley (Windows, shell PowerShell mas Bash tool roda bash), passar path com barra invertida tipo `cd C:\Users\Logistica01\projetos\logistica-ia` FALHA — bash consome os `\` e vira `C:UsersLogistica01...` ("No such file or directory").

**Why:** O Bash tool interpreta `\` como escape antes do comando rodar. PowerShell aceitaria, mas as Bash calls não.

**How to apply:** Sempre usar barras normais e aspas em paths Windows no Bash tool: `cd "C:/Users/Logistica01/projetos/logistica-ia"`. Vale pra subir Vite/Functions emulator do projeto [[project-estado-atual]] e qualquer comando com caminho absoluto.

---

## Relacionado por tema

- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_colocar_no_ar_completo]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
