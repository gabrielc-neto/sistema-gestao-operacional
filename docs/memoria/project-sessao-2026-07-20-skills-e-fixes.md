---
name: project-sessao-2026-07-20-skills-e-fixes
description: "Sessão 20/07 — instalação 8 skills externas, fix Firestore rules Compras, aumento fontes mobile, auditoria Playwright completa"
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Resumo do dia (2026-07-20)

### 8 Skills externas instaladas

Todas em `~/.claude/external-skills/` + registradas em `~/.claude/settings.json`:

**MCPs (npm install -g):**
- `@playwright/mcp` v0.0.78
- `chrome-devtools-mcp` v1.6.0
- `claude-mem` v13.11.0 (memória persistente)

**Plugins Claude Code (`.claude-plugin/`):**
- `ui-ux-pro-max` v2.11.0 — 84 estilos, 192 paletas, 74 pares tipográficos, 22 stacks (React, Nuxt, Svelte, Astro, SwiftUI, Flutter, shadcn, etc)
- `andrej-karpathy-skills` v1.0.0 — guidelines pra reduzir LLM coding pitfalls
- `ralph-skills` v1.0.0 — gera PRDs pra automação de agentes

**Skills tradicionais:**
- `excalidraw-diagram` — gera diagramas Excalidraw JSON (ATIVOU IMEDIATAMENTE, os outros precisam reload)

**CLI standalone:**
- `agent-browser` v0.32.3 — Rust CLI + Chrome 151 baixado (192 MB) em `~/.agent-browser/browsers/`

**Ativação:** todos ficam ativos após fechar+abrir sessão do Claude Code (settings.json lido só no boot).

### Fixes do dia

- **Firestore rules Compras/Intranet** — adicionado em `firestore.rules`. Emulator não recarrega em runtime → precisa restart emulator ou deploy manual via console Firebase (service account não tem `serviceusage.services.get`)
- **Fontes mobile aumentadas** — `html { font-size: 17px }` em mobile + regras `[style*="fontSize:.66rem"]` etc → 12px mínimo. Reduziu 30-40% os textos < 12px por página
- **SASCAR marker cinza** — threshold `veryStale` de 60min → 720min (12h). Antes cores sumiam depois de 1h só

### Auditoria Playwright completa

Rodou headless com login (`silvasampaiowesley03@gmail.com`) em 2 viewports (Desktop 1400×900 + Mobile 390×844) e 11 módulos:
- ✅ Zero overflow horizontal (fixes mobile funcionam)
- ⚠️ `/compras` dá `FirebaseError: Missing or insufficient permissions` — rules estão no arquivo mas emulator ainda com cache antigo
- Fontes mobile reduziu ~30% mas ainda há elementos com 11px hardcoded

### Regra confirmada

**Claude Code lê `settings.json` só no boot.** MCPs, plugins e hooks (partial) só ativam com restart. Alternativa: `/mcp reconnect` se existir.

Ver também: [[feedback-hook-auto-memory-placeholder]] · [[project-sessao-2026-07-17-mudancas]] · [[project-migracao-laravel-hostinger]]
