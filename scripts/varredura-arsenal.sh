#!/bin/bash
# Varredura completa do arsenal Claude Code do Wesley.
# Uso: bash ~/projetos/logistica-ia/scripts/varredura-arsenal.sh
# Saída bruta pra Claude regenerar ARQUITETURA-COMPLETA.md

set -eu

echo "### MCPs ativos ###"
claude mcp list 2>&1 || true
echo ""

echo "### Plugins Claude Code ###"
claude plugin list 2>&1 || true
echo ""

echo "### UV tools Python ###"
uv tool list 2>&1 || true
echo ""

echo "### NPM globals ###"
npm ls -g --depth=0 2>&1 | grep -viE "^npm@|^$" || true
echo ""

echo "### Skills/commands (root .md) ###"
ls ~/.claude/commands/*.md 2>/dev/null | xargs -n1 basename 2>/dev/null | sed 's/\.md$//' | sort || true
echo ""

echo "### Skills/commands (subdirs) ###"
find ~/.claude/commands -maxdepth 1 -type d ! -path ~/.claude/commands 2>/dev/null | xargs -n1 basename | sort || true
echo ""

echo "### Plugins dir (~/.claude/plugins) ###"
ls ~/.claude/plugins/ 2>&1 || true
echo ""

echo "### Repos em ~/tools/ ###"
ls -d ~/tools/*/ 2>&1 | xargs -n1 basename 2>&1 | sort || true
echo ""

echo "### Skills domínio Pontual (SKILLS_CONTEXT.md) ###"
grep -oE '^\*\*[a-z][a-z0-9-]+\*\*' ~/.claude/CLAUDE.md 2>/dev/null | sort -u || true
echo ""

echo "=== FIM DA VARREDURA ==="
