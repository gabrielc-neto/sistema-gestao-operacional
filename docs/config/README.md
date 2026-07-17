# 📋 Config espelhada — Claude Code + hooks

Espelhos dos arquivos de configuração que estão FORA do repo (em `.claude/` global do usuário) mas que fazem parte do sistema. Copiados aqui pra Obsidian indexar e você conseguir consultar/documentar.

**⚠️ Estes espelhos NÃO são autoritativos.** Se editar aqui, precisa copiar de volta manualmente pra `.claude/`. O original vale sempre.

## Arquivos

| Espelho | Original |
|---|---|
| `claude-global.md` | `C:\Users\Logistica01\.claude\CLAUDE.md` (contexto Claude global) |
| `claude-settings.json` | `C:\Users\Logistica01\.claude\settings.json` (hooks, permissões) |
| `hooks/contexto-projeto-hook.mjs` | `.claude/helpers/` (SessionStart) |
| `hooks/salvar-prompt-user.mjs` | `.claude/helpers/` (UserPromptSubmit) |
| `hooks/salvar-conversa-realtime.mjs` | `.claude/helpers/` (Stop) |

## Fluxo dos hooks

```
Sessão abre → SessionStart hook (contexto-projeto-hook.mjs) → injeta contexto no prompt
User digita → UserPromptSubmit hook (salvar-prompt-user.mjs) → grava em docs/prompts-user/
Claude responde → Stop hook (salvar-conversa-realtime.mjs) → exporta docs/conversas-claude/
```

Ver [[BRAIN|BRAIN.md]] pra fluxo completo.
