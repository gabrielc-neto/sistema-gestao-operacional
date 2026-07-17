#!/usr/bin/env bash
# Roda DEPOIS que robocopy terminar. Gera README + atualiza vault Obsidian.

set -eo pipefail
DEST="/c/Users/Logistica01/projetos/logistica-ia/arquivo/pendrive-completo"
VAULT="/c/Users/Logistica01/projetos/logistica-ia"

# 1) Aguarda robocopy sumir
echo "[$(date +%H:%M:%S)] Aguardando robocopy encerrar..."
until ! tasklist 2>/dev/null | grep -qi "robocopy.exe"; do
  sleep 60
done
echo "[$(date +%H:%M:%S)] Robocopy finalizado. Coletando stats..."

# 2) Stats
sz_dest=$(du -sh "$DEST" 2>/dev/null | awk '{print $1}')
n_dest=$(find "$DEST" -type f 2>/dev/null | wc -l | tr -d ' ')
sz_src=$(du -sh /d/ 2>/dev/null | awk '{print $1}')
n_src=$(find /d -type f 2>/dev/null | wc -l | tr -d ' ')

echo "  Origem:  $sz_src / $n_src arquivos"
echo "  Destino: $sz_dest / $n_dest arquivos"

# 3) README inventário na pasta copiada
cat > "$DEST/README.md" <<EOF
# 💾 Backup completo do pendrive D:

**Copiado em:** $(date '+%Y-%m-%d %H:%M:%S')
**Origem:** \`D:\\\` (pendrive)
**Total:** $sz_dest · $n_dest arquivos

## Estrutura

$(ls "$DEST" | grep -v README.md | grep -v _robocopy.log | sed 's/^/- \`/' | sed 's/$/\/`/')

## Como restaurar em outro PC (Claude Code do zero)

### Passo 1 — Copiar memórias Claude

\`\`\`bash
# Copia todas memory files pro perfil Claude do novo PC
xcopy /E /I "Backup-Claude-2026-06-24\.claude\projects" "%USERPROFILE%\.claude\projects"
\`\`\`

### Passo 2 — Copiar skills instaladas

\`\`\`bash
xcopy /E /I "Backup-Claude-2026-06-24\.claude\skills" "%USERPROFILE%\.claude\skills"
\`\`\`

### Passo 3 — Copiar agents

\`\`\`bash
xcopy /E /I "Backup-Claude-2026-06-24\.claude\agents" "%USERPROFILE%\.claude\agents"
\`\`\`

### Passo 4 — Restaurar config Claude

\`\`\`bash
copy "Backup-PC-Completo-2026-06-11\.claude.json" "%USERPROFILE%\.claude.json"
\`\`\`

### Passo 5 — Restaurar VS Code / npm

\`\`\`bash
# Extensions VS Code
type "Backup-Ruflo-Ecosystem-2026-06-11\VSCODE_EXTENSIONS.txt"
# Instalar cada extensão manualmente: code --install-extension <id>

# NPM globals
type "Backup-Ruflo-Ecosystem-2026-06-11\NPM_GLOBALS.json"
# npm i -g <cada pacote>
\`\`\`

### Passo 6 — Repo logistica-ia

\`\`\`bash
# Ou clone via git remote (se tiver), ou copia direto:
xcopy /E /I "backup-logistica-ia\2026-06-22-COMPLETO" "%USERPROFILE%\projetos\logistica-ia"
cd %USERPROFILE%\projetos\logistica-ia\frontend && npm install
cd ..\functions && npm install
\`\`\`

## Backup mais recente de cada tipo

| Tipo | Pasta mais recente | Tamanho |
|---|---|---|
| Claude configs | \`Backup-Claude-2026-06-24\` | 377 MB |
| Logística repo | \`Backup-Logistica-2026-06-30\` | ver |
| PC Completo | \`Backup-PC-Completo-2026-06-11\` | ver |
| Ruflo Ecosystem | \`Backup-Ruflo-Ecosystem-2026-06-11\` | 288 KB |

**Regra:** use sempre a data mais recente disponível de cada tipo.

## Notas

- Esta pasta é **gitignored** — não vai pro Git remoto
- Serve como "cofre digital" pra recuperação em outro PC
- Backup replicado do pendrive físico → HD interno C:
- Original ainda no pendrive D: enquanto plugado
EOF

echo "  README criado em $DEST/README.md"

# 4) Atualiza INDICE.md do vault com nova seção
INDICE="$VAULT/INDICE.md"
if ! grep -q "Backup Pendrive" "$INDICE" 2>/dev/null; then
cat >> "$INDICE" <<EOF

## 💾 Backup Pendrive

Cópia completa do pendrive D: em \`arquivo/pendrive-completo/\` — cofre pra restaurar Claude Code / repo em outro PC.

- [[arquivo/pendrive-completo/README|📄 Como restaurar em outro PC]]
- Copiado em: $(date '+%Y-%m-%d %H:%M')
- Total: $sz_dest · $n_dest arquivos
- Backups Claude, Logística (14 snapshots), PC-Completo, Ruflo-Ecosystem
EOF
  echo "  INDICE.md atualizado"
fi

# 5) Registro no log da sessão
LOG_SESSAO="$VAULT/docs/sessoes/2026-07-15.md"
if [ -f "$LOG_SESSAO" ] && ! grep -q "Cópia pendrive completa" "$LOG_SESSAO" 2>/dev/null; then
cat >> "$LOG_SESSAO" <<EOF

## $(date +%H:%M) — Cópia pendrive completa finalizada

Robocopy D:\\ → arquivo/pendrive-completo/ terminou.
- Origem: $sz_src / $n_src arquivos
- Destino: $sz_dest / $n_dest arquivos
- README de restauração gerado em pendrive-completo/README.md
- INDICE.md do vault ganhou seção "Backup Pendrive"
- Pasta gitignored (arquivo/) — não sobe pro remote
EOF
  echo "  Log da sessão atualizado"
fi

echo
echo "[$(date +%H:%M:%S)] TUDO PRONTO. Vault Obsidian atualizado."
EOF
chmod +x "/c/Users/Logistica01/projetos/logistica-ia/scripts/pos-copia-pendrive.sh"
echo "script pos-copia criado"