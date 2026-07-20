---
name: feedback-primeira-msg-confirmar-skills
description: "Ao receber \"oi\" (ou saudação equivalente) na PRIMEIRA MENSAGEM de uma nova sessão, confirmar automaticamente quais das 7 skills instaladas em 2026-07-20 estão ATIVAS. User quer certeza que carregaram."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Regra

**Na PRIMEIRA MENSAGEM de uma sessão nova** (Rosilda diz "oi", "boa tarde", "bom dia", ou similar), **DEVE** listar quais das 7 skills instaladas em 2026-07-20 estão carregadas.

Formato da resposta:
```
Vi que ontem paramos em [X do docs/sessoes/data-mais-recente.md].

📦 Skills carregadas (instaladas 2026-07-20):
✅ excalidraw-diagram — [check se aparece nos <system-reminder> "The following skills are available"]
✅ ui-ux-pro-max — [check se aparece]
✅ andrej-karpathy-skills — [check]
✅ ralph-skills — [check]
✅ playwright MCP — [check se mcp__playwright-* tools apareceram]
✅ chrome-devtools MCP — [check se mcp__chrome-devtools-* tools apareceram]
✅ agent-browser (CLI) — sempre ativo (bash)

Continuando de onde paramos: [pendências]
```

Se alguma NÃO carregou, marcar ❌ e sugerir:
- Verificar `~/.claude/settings.json` — `mcpServers` e `enabledPlugins`
- Rodar `/mcp reconnect` ou reiniciar Claude Code novamente

## Why

User (Rosilda) instalou 8 skills externas em 2026-07-20 mas o Claude Code precisava reiniciar pra ativar todas (só excalidraw ativou no ato). Ela pediu explicitamente confirmação visual na próxima sessão porque não confia que os MCPs vão conectar sozinhos.

**Update 2026-07-20 (fim da tarde):** `claude-mem` REMOVIDO por decisão da user — auto-memory nativo já cobre (129 memórias funcionando). Lista original de 8 → agora **7 skills** confirmáveis.

**Referência:** `docs/sessoes/2026-07-20.md` bloco "cascade skills 15:50-16:00" mostra a discussão.

## Como verificar cada uma

- **Skills Claude:** aparecem no `<system-reminder>` inicial listando "The following skills are available for use with the Skill tool"
- **MCPs:** ferramentas com prefixo `mcp__nome-do-mcp__ferramenta` (playwright, chrome-devtools)
- **Plugins:** aparecem via `<available-plugins>` no boot ou skills injetadas

Se em dúvida, executar `Bash: ls ~/.claude/plugins/` e `Bash: which playwright-mcp chrome-devtools-mcp agent-browser` pra confirmar em disco.

## How to apply

- Trigger: primeira mensagem da sessão + está no projeto `logistica-ia`
- Se user NÃO for a Rosilda (outro contexto), aplicar mesmo padrão de confirmação — vault serve pra qualquer IA

Ver também: [[project-sessao-2026-07-20-skills-e-fixes]] · [[project-log-sessoes-detalhado-instrucoes]] · [[feedback-abertura-sessao-consultar-contexto]]
