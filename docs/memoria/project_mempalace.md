---
name: MemPalace — Configuração e Automação
description: MemPalace instalado e configurado em 2026-04-28 com mineração diária automática
type: project
originSessionId: c50ae964-4000-41a2-9ac3-2206086298e5
---
MemPalace 3.3.3 instalado e operacional em 2026-04-28.

**Setup:**
- Python 3.14.4 instalado em `C:\Users\Logistica01\AppData\Local\Python\pythoncore-3.14-64\`
- Scripts PATH: `C:\Users\Logistica01\AppData\Local\Python\pythoncore-3.14-64\Scripts` (adicionado ao PATH do usuário)
- Palace inicializado em `C:\Users\Logistica01` (27.098 arquivos, 26 rooms)
- MCP registrado: `claude mcp add mempalace -- mempalace-mcp.exe`
- Config: `C:\Users\Logistica01\mempalace.yaml`
- Entities: `C:\Users\Logistica01\entities.json`

**Automação:**
- Task Scheduler: `MemPalace_Mine_Daily` — todo dia às 05:00 (junto com `Pontual_AutoPicos`)
- Comando: `python -c "import os; os.environ['PYTHONUTF8']='1'... mempalace mine C:\Users\Logistica01"`
- Encoding fix obrigatório: `PYTHONUTF8=1 PYTHONIOENCODING=utf-8` (terminal Windows cp1252 causa UnicodeEncodeError)

**Why:** Usuário quer memória persistente e pesquisa semântica sobre arquivos e histórico de projetos.

**How to apply:** Ao rodar mempalace via CLI, sempre usar `PYTHONUTF8=1 PYTHONIOENCODING=utf-8` antes do comando ou usar caminho completo do executável.

---
*Ver também: [[MEMORY|Índice de memórias]] · [[INDICE|Dashboard]] · [[CLAUDE|Contexto Pontual]]*

---

## Relacionado por tema

- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
