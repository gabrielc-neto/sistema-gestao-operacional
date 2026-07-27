---
name: project-pendrive-backup
description: "Pendrive de backup do user é D: (NUNCA F:), com padrão Backup-Logistica-YYYY-MM-DD"
metadata: 
  node_type: memory
  type: project
  originSessionId: bea2d293-533f-492f-9820-63d606846d7e
---

Pendrive de backup do user é **D:** — sempre. F: é disco corporativo da empresa (Apps, Departamentos, Xadm, LabSolutions) e write-protected na raiz; gravar dados pessoais em F: é risco de violação de política. User já confundiu uma vez e disse "EU QUE MANDEI ERRADO".

D: tem ~57 GB total, com histórico de backups seguindo o padrão `D:\Backup-Logistica-YYYY-MM-DD\` (alguns também `Backup-PC-Completo-` e `Backup-Claude-`). Origens recorrentes do backup completo: Documents, Desktop, projetos (incluindo logistica-ia), Projects, Pictures, Videos.

**Why:** Confusão entre F: (corporativo, write-protected) e D: (pendrive pessoal) já aconteceu nessa sessão e o backup pra F: falhou com "acesso negado". Gravar dados pessoais em drive corporativo pode violar política da empresa.

**How to apply:** Quando o user pedir backup pro "pendrive" sem letra, assumir D:. Se ele disser F:, perguntar antes de copiar arquivos pessoais — F: tem cara de servidor de aplicações corporativo. Usar `robocopy /E /XO` (incremental, sem deletar) e pasta nova `Backup-Logistica-YYYY-MM-DD` pra manter histórico.

---
*Ver também: [[MEMORY|Índice de memórias]] · [[INDICE|Dashboard]] · [[CLAUDE|Contexto Pontual]]*

---

## Relacionado por tema

- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]] | [[project_carga_perigosa]]
