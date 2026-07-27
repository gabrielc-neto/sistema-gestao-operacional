@echo off
REM Exporta a conversa Claude Code mais recente pra Markdown legível no Obsidian.
REM Uso: duplo clique — aparece em docs/conversas-claude/
cd /d "%~dp0"
node scripts\exportar-conversa-claude.mjs
echo.
echo Feito. Abra no Obsidian: docs/conversas-claude/
timeout /t 5 >nul
