# Arquitetura Real do Arsenal — Wesley/Pontual (2026-08-24)

Mapa exaustivo de tudo que existe no ambiente Claude Code do Wesley. Fonte de verdade — atualizar quando adicionar/remover peça.

---

## Diagrama macro (v2 — reformulado 2026-08-24)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  USUÁRIO — Wesley Farley                                                  ║
║    Terminal Claude Code · RuFlo v3.5 · Obsidian vault · BRAIN.md          ║
╚═══════════════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
╔═══════════════════════════════════════════════════════════════════════════╗
║  🧠 CADEIA DE CÉREBRO                                                     ║
║ ─────────────────────────────────────────────────────────────────────────  ║
║  MENTE ................ Claude Opus 4.7                                   ║
║  BEHAVIOR (7 skills) .. godmode · ponytail · superpowers · no-ai-slop     ║
║                         i-have-adhd · karpathy-guidelines · ralph        ║
║  MEMÓRIA (4 camadas) .. auto-memory · Obsidian sessões · serena MCP       ║
║                         BRAIN.md · ruflo-core MCP (333 tools · HNSW·RAG)  ║
║  ORQUESTRAÇÃO* ........ LoopX · crewAI · OpenHands · Hermes · agency     ║
║  COMANDOS ............. 274 skills/cmds · hive-mind · swarm · sparc · gsd ║
╚═══════════════════════════════════════════════════════════════════════════╝
      │           │              │              │              │
      ▼           ▼              ▼              ▼              ▼
┌───────────┐ ┌───────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐
│  CÓDIGO   │ │  WEB &    │ │ SEGURANÇA  │ │CONECTIVID. │ │  COMUNICAÇÃO   │
│  & DESIGN │ │ SCRAPING  │ │  QA/AUDIT  │ │  & RAG     │ │ & PRODUTIVIDADE│
└───────────┘ └───────────┘ └────────────┘ └────────────┘ └────────────────┘
▸ OpenHands   ▸ browser-use ▸ Strix         ▸ Exa MCP✨    ▸ Gmail (28t)
▸ Hermes*     ▸ playwright  ▸ VulnClaw      ▸ context7 MCP ▸ Calendar (9t)
▸ agency*     ▸ chrome-dev  ▸ Sentry MCP    ▸ serena MCP   ▸ Drive (8t)
▸ ui-ux-pro-  ▸ crawl4ai    ▸ no-ai-slop    ▸ n8n-mcp      ▸ Canva (32t)
  max         ▸ Scrapling   ▸ superpowers   ▸ LangFlow     ▸ MS Learn (3t)
▸ frontend-   ▸ agent-reach ▸ godmode       ▸ ruflo-core   ▸ MS 365 ⚠
  design      ▸ maxun*      ▸ karpathy         (333 tools) ▸ slack-notif
▸ freebuff    ▸ Vane*       ▸ verify/*      ▸ TencentDB*   ▸ stripe-bill
▸ Codex (off) ▸ Exa MCP✨   ▸ truth/*       ▸ token-opt-   ▸ oauth-google
▸ skill-      ▸ WebSearch   ▸ security-*      mcp          ▸ whatsapp-*
  creator     ▸ WebFetch    ▸ xss-scan
▸ excalidraw                ▸ forensic
▸ hive-mind/                ▸ nikto
▸ swarm/                    ▸ codeql-bundle
▸ sparc/                    ▸ metasploitable
▸ gsd/                      ▸ pentestgpt-venv
▸ pair/
▸ tdd/
▸ build-*/review-*/
▸ refactor/legacy-*
▸ cost-optimize/docker

                                    │
                                    ▼
╔═══════════════════════════════════════════════════════════════════════════╗
║  🏢 DOMÍNIO PONTUAL (skills específicas do sistema)                       ║
║ ─────────────────────────────────────────────────────────────────────────  ║
║  Infra AWS ........... cloud-aws · auth-jwt-lambda · dynamodb-patterns    ║
║                        lambda-layers · deploy-aws-checklist · s3-file-    ║
║                        handler · error-tracking · webhook-handler         ║
║  Produto/Bot ......... chatbot-builder · plano-saas · onboarding-usuario  ║
║                        whatsapp-twilio · api-rest-nodejs                  ║
║  ML/IA ............... feedback-loop-ai · dataset-builder · model-        ║
║                        retraining · model-versioning · auto-deploy-model  ║
║                        ml-inference-api · auto-sklearn · ml-pipeline      ║
║                        model-route                                        ║
║  Docs ................ xlsx · pptx · docx · pdf · pdf-reading · file-read ║
║  Prompts ............. openai-prompts · criar-prompts · skill-de-prom-it  ║
║                        skill-create · skill-health · criador-habilidades  ║
║  Testes/KPI .......... testes-lambda · kpi-assistant                      ║
║  Ambiente Pontual .... postgresql-patterns · react-19-patterns            ║
║                        linux-admin-ubuntu · s3-backup-external            ║
║                        sentry-error-tracking                              ║
║  Integrações Pontual . sascar-integration-completa · cta-smart-integr.    ║
║                        nfe-integration · google-maps-routes               ║
╚═══════════════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
╔═══════════════════════════════════════════════════════════════════════════╗
║  📚 APOIO / REFERÊNCIA (não binários — fontes de consulta)                ║
║   public-apis · free-for-dev · awesome-llm-apps · awesome-mcp-servers     ║
║   awesome-claude-skills · ECC · llm-config · youtube-transcrever          ║
╚═══════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════
LEGENDA
  ✨ = adicionado hoje (24/08)
  *  = on-demand (Claude sobe/derruba sob comando — Vane, TencentDB,
       hermes-agent, agency-agents, maxun, crewAI, OpenHands, LangFlow)
  ⚠  = precisa OAuth (opcional)
  (off) = descartado por Wesley
  ▸  = peça ativa no pilar
═══════════════════════════════════════════════════════════════════════════

CONTRATOS
  📌 INSTALAR peça  → Claude atualiza este mapa na mesma tarefa (Rota A)
  📌 REMOVER peça   → só Wesley decide, ordem explícita nomeando a peça
  📌 Fallback       → "atualiza mapa" regenera via scripts/varredura-
                     arsenal.sh (varre MCPs + plugins + uv + npm + tools)

FONTE DE VERDADE ...... ~/projetos/logistica-ia/docs/ARQUITETURA-COMPLETA.md
LINK NO BRAIN.md ...... seção 6 "Arquitetura do arsenal"
═══════════════════════════════════════════════════════════════════════════
```

---

## PILAR 1 — INTERFACE

| Peça | Status | Nota |
|---|---|---|
| Terminal Claude Code (RuFlo v3.5) | ativo | canal padrão, Wesley → eu |
| Hermes via Telegram/Discord (futuro) | 🧠 on-demand | precisa WSL + provider LLM |

---

## PILAR 2 — CADEIA DE CÉREBRO (orquestração)

### Mente
| Peça | Status | Função |
|---|---|---|
| Claude Opus 4.7 | ativo | LLM primário |
| RuFlo v3.5 | ativo | harness / runtime |

### Skills que moldam comportamento (plugins Claude Code)
| Plugin | v | Função |
|---|---|---|
| godmode | 1.0.0 | ✔ quality gate, protocolos rigor |
| ponytail | 4.9.0 | ✔ lazy senior dev — código enxuto |
| superpowers | 5.1.0 | ✔ TDD, brainstorming, plans, review |
| ruflo-core | 0.2.6 | ✔ 333 MCP tools (agents, memory, hooks, patterns) |
| i-have-adhd | 0.2.0 | ✔ action-first, no burying |
| sentry-mcp | ✔ | error monitoring |

### Skills adicionais em `~/.claude/plugins/`
| Skill | Uso |
|---|---|
| andrej-karpathy-skills / karpathy-guidelines | evitar erros comuns LLM ao codar |
| ralph | RFC-driven multi-agent DAG |
| ui-ux-pro-max-skill | design system + componentes |

### Memória
| Camada | Local | Uso |
|---|---|---|
| Auto-memory | `~/.claude/projects/.../memory/` | perfil Wesley + regras + feedback + projeto |
| Obsidian vault | `~/projetos/logistica-ia/docs/sessoes/` | log de toda sessão (bloco por mudança) |
| serena MCP | `uv tool run serena` | memória semântica de código (find_symbol, references) |
| BRAIN.md | `~/projetos/logistica-ia/BRAIN.md` | cérebro compartilhado entre Claudes |

### Delegação (invoco sob comando — cadeia de cérebro)
| Peça | Ativação |
|---|---|
| crewAI (uv tool `crewai`) | 🧠 on-demand; aviso Wesley quando exigir LLM key |
| OpenHands (uv tool `openhands`) | 🧠 on-demand; aviso Wesley quando exigir LLM key |
| LangFlow (uv tool `langflow`) | 🧠 on-demand; aviso Wesley quando exigir LLM key |
| LoopX (uv tool `loopx`) | ✔ ativo (state kernel, sem LLM próprio) |
| Hermes Agent (`~/tools/hermes-agent`) | 🧠 on-demand via WSL, aviso quando pedir |
| agency-agents (`~/tools/agency-agents`) | 🧠 personas MD, colar quando task pedir |

---

## PILAR 3 — CÓDIGO / DESIGN

| Peça | Tipo | Status | Função |
|---|---|---|---|
| **@anthropic-ai/claude-code** | npm | ativo | próprio harness |
| **playwright MCP** | MCP | ✔ 24 tools | automation browser |
| **chrome-devtools MCP** | MCP | ✔ 29 tools | debug + DOM live |
| **agent-browser** | npm CLI | ativo | browser automation p/ agentes |
| **codex** (@openai/codex) | npm CLI | instalado (não usar) | Wesley descartou login |
| **Codebuff/freebuff** | npm CLI | ativo | coding CLI free-tier |
| **superpowers** skill: TDD | plugin | ativo | red/green/refactor |
| **ruflo-core**: `mcp__plugin_ruflo-core_ruflo__coder` | MCP | ativo | code writer agente |
| **ui-ux-pro-max** | skill | ativo | design tokens, patterns |
| **frontend-design** | skill | ativo | UI produção sem "AI aesthetic" |
| **excalidraw-diagram** | skill | ativo | diagramas |
| **skill-creator** / **criador-de-habilidades** | skill | ativo | criar/testar skills |

---

## PILAR 4 — WEB / DADOS / SCRAPING

| Peça | Tipo | Status |
|---|---|---|
| **WebSearch** (built-in) | Claude Code | ✔ zero custo, sem key |
| **WebFetch** (built-in) | Claude Code | ✔ puxa URL |
| **exa MCP** | MCP | ✔ neural + find_similar + deep_research (1000/mês + $10 crédito) |
| **playwright MCP** | MCP | ✔ 24 tools |
| **chrome-devtools MCP** | MCP | ✔ 29 tools |
| **browser-use** (uv tool) | CLI | ✔ instalado (precisa LLM p/ decisão autônoma) |
| **crawl4ai** (uv tool) | CLI | ✔ scrape sem key |
| **scrapling** (D4Vinci) | uv tool | ✔ stealth scraper |
| **agent-reach** | skill | ✔ Twitter/Reddit/YouTube/GitHub/LinkedIn/XiaoHongShu/Douyin/WeChat/Boss/RSS |
| **Vane** (ItzCrazyKns) | Docker | 🧠 Perplexity local, subo quando pedir |
| **maxun** | Docker | 🧠 RPA visual (getmaxun) |

---

## PILAR 5 — SEGURANÇA / AUDITORIA / QUALIDADE

| Peça | Tipo | Status |
|---|---|---|
| **strix-agent** | uv tool | ✔ pentest AI autônomo |
| **vulnclaw** | uv tool | ✔ SAST + AI agent (interface CN) |
| **sentry MCP** | MCP | ✔ 9 tools (issues, events, seer) |
| **superpowers** skill: verification-before-completion | plugin | ativo |
| **no-ai-slop** | skill | ativo (petergyang) |
| **godmode** skill: quality-gate | plugin | ativo |
| **karpathy-guidelines** | skill | ativo |
| **nikto** (`~/tools/nikto`) | binário | ativo |
| **metasploitable** (`~/tools/metasploitable`) | lab | disponível p/ prática |
| **pentestgpt-venv** (`~/tools/pentestgpt-venv`) | venv | disponível |
| **codeql-bundle** (`~/tools/codeql-bundle`) | binário | ativo SAST GitHub |
| Skills: security-audit / xss-scan / security-scan / security-sast / security-hardening / forensic | Claude Code cmds | ativas |

---

## PILAR 6 — CONECTIVIDADE / RAG / WORKFLOWS

| Peça | Tipo | Status |
|---|---|---|
| **context7 MCP** | MCP | ✔ docs de libs atualizados |
| **serena MCP** | MCP | ✔ 23 tools código semântico |
| **n8n-mcp** | MCP | ✔ 7 tools (nodes, templates, workflow validate) |
| **ruflo-core** MCP | MCP | ✔ 333 tools (embeddings, HNSW, RAG, session) |
| **LangFlow** (uv tool) | CLI | ⏸️ dorme (precisa LLM key) |
| **TencentDB-Agent-Memory** | Node.js | 🧠 memoria L0-L3 sob comando |
| **@ooples/token-optimizer-mcp** | npm | instalado — utility |

### MCPs claude.ai (nuvem — logados via OAuth)
| MCP | Tools | Status |
|---|---|---|
| Gmail | 28 | ✔ |
| Google Calendar | 9 | ✔ |
| Google Drive | 8 | ✔ |
| Canva | 32 | ✔ |
| Microsoft Learn | 3 | ✔ |
| Microsoft 365 | ? | ❌ needs auth (opcional) |

---

## PILAR 7 — DOMÍNIO PONTUAL (skills específicas do sistema)

Todas em `~/.claude/commands/*.md` — carregam sob trigger.

### Infra AWS (skill legado, hoje sistema tá em VPS Hostinger)
- cloud-aws · auth-jwt-lambda · dynamodb-patterns · lambda-layers
- deploy-aws-checklist · s3-file-handler · error-tracking · webhook-handler

### Produto / Bot
- chatbot-builder · plano-saas · onboarding-usuario · whatsapp-twilio · api-rest-nodejs

### ML/IA
- feedback-loop-ai · dataset-builder · model-retraining · model-versioning
- auto-deploy-model · ml-inference-api · auto-sklearn · ml-pipeline · model-route

### Docs
- xlsx · pptx · docx · pdf · pdf-reading · file-reading

### Prompts
- openai-prompts · criar-prompts · skill-de-prom-it · skill-create · skill-health

### Testes / KPI
- testes-lambda · kpi-assistant

### Integrações Pontual-específicas
- `~/.claude/commands/sascar-integration-completa/`
- `~/.claude/commands/cta-smart-integration/`
- `~/.claude/commands/nfe-integration/`
- `~/.claude/commands/google-maps-routes/`

### Domínio ambiente Pontual
- postgresql-patterns · react-19-patterns · linux-admin-ubuntu · s3-backup-external
- oauth-google · slack-notifications · sentry-error-tracking · stripe-billing
- whatsapp-cloud-api

---

## PILAR 8 — DEV / DEVOPS (multi-linguagem, genéricos)

**Build**: build · build-fix · cpp-build · flutter-build · go-build · rust-build · kotlin-build · react-build · gradle-build · docker
**Review**: code-review · cpp-review · fastapi-review · flutter-review · go-review · kotlin-review · python-review · react-review · rust-review · vue-review
**Test**: test · test-coverage · test-generate · tdd-cycle · tdd-red · tdd-green · tdd-refactor · playwright-e2e
**Git**: commit-push-pr · pr · pr-enhance · review-pr · patch · revert · commit
**Deploy**: deploy-aws-checklist · webhook-handler · sql-migrations · monitor-setup · incident-response
**Refactor**: refactor-clean · code-simplify · code-migrate · tech-debt · legacy-modernize
**Perf**: performance-optimization · cost-optimize · token-saver
**Docs**: doc-generate · update-codemaps · update-docs

### Orquestração de agentes (Claude-Flow, ruflo-core, SPARC)
- **hive-mind/**: init · spawn · consensus · memory · metrics · sessions · status · wizard · resume · stop
- **swarm/**: init · monitor · spawn · analysis · development · maintenance · optimization · research · testing
- **sparc/**: 30+ modos (architect, coder, tester, debugger, security-review, TDD, orchestrator, batch-executor, etc)
- **gsd/**: 60+ comandos (plan-phase, execute-phase, code-review, debug, milestone, project-*, verify, etc)
- **coordination/**: init · orchestrate · spawn · task-orchestrate · swarm-init
- **automation/**: auto-agent · smart-agents · smart-spawn · self-healing · workflow-select · session-memory
- **workflows/**: create · execute · export · development · research · best-practices
- **stream-chain/**: pipeline · run
- **pair/**: start · session · modes · commands · config · examples

### Memory / Verify / Truth
- memory/: memory-persist · memory-search · memory-usage · neural
- verify/: check · start
- truth/: start
- checkpoint · context-save · context-restore · resume-session · save-session

---

## PILAR 9 — APOIO / REFERÊNCIA (não binários — clonados como fonte)

| Repo | Local | Uso |
|---|---|---|
| public-apis | fora do arsenal | referência APIs |
| free-for-dev | fora | free-tier providers |
| awesome-llm-apps | fora | apps LLM |
| awesome-mcp-servers | fora | catálogo MCP |
| awesome-claude-skills | fora | catálogo skills |

### Repos clonados em `~/tools/` mas ainda sem uso ativo
| Repo | Nota |
|---|---|
| youtube-transcrever | script pessoal |
| ECC | Everything Claude Code — kit ref |
| llm-config | pasta vazia (reserva) |

---

## STATUS DE ATIVAÇÃO — resumo

### ✅ Ativos agora (sem ação sua)
- 13 MCPs (Microsoft 365 fora, opcional)
- 6 plugins Claude Code
- 3 skills adicionais (karpathy, ralph, ui-ux-pro-max)
- 10 uv tools
- 10 npm globals
- 274 skills/commands Claude Code
- Auto-memory + Obsidian vault + BRAIN.md

### 🧠 Sob comando meu (on-demand cadeia de cérebro)
- Vane · TencentDB · hermes-agent · agency-agents · maxun
- **crewAI · OpenHands · LangFlow** — só uso quando task exigir; se exigir, aviso Wesley que precisa LLM key naquele momento

### ⏸️ Bloqueio real (precisa ação sua)
- **Microsoft 365 MCP** — `/mcp` → Microsoft 365 → OAuth (opcional, não pediu)
- **WSL2** — só se Hermes for rodar autônomo
- **Restart Claude Code** p/ tools `mcp__exa__*` aparecerem no meu tool list

### ❌ Removidos por sua ordem
- open-webui · agenticSeek · llm-council · ai-job-search · OmniRoute · codex login

---

## Como o fluxo funciona na prática

1. Você pede algo no terminal
2. Eu classifico em qual pilar bate
3. Escolho ferramenta code-first (MCP/CLI/skill) — mais rápido, sem key
4. Se precisar autônomo/24-7 → aviso que precisa LLM provider e derrubo o pedido pra você decidir
5. Se subir Docker (Vane/maxun/TencentDB) → subo, uso, derrubo
6. Registro em `docs/sessoes/YYYY-MM-DD.md`
7. Se aprender algo permanente → memória `~/.claude/projects/.../memory/`

---

## Manutenção deste arquivo

- Ao adicionar peça nova: linha na tabela do pilar correto + status
- Ao remover peça: mover pra seção "Removidos"
- Ao mudar status (ativo → on-demand → dorme): atualizar coluna Status
- Fonte de verdade quando alguém pergunta "o que tem no arsenal"
