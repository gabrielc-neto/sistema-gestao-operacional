# 🧠 BRAIN — Cérebro Compartilhado (qualquer Claude começa aqui)

> **REGRA ABSOLUTA:** Toda instância de Claude (Claude Code, Claude.ai, ChatGPT, Gemini, Copilot ou qualquer outra) que trabalhe neste projeto DEVE ler este arquivo ANTES da primeira resposta.
>
> Se você é uma **IA nova** (Claude.ai, ChatGPT, etc), leia primeiro: [[PROTOCOLO-MULTI-IA]] — regras de continuidade bidirecional.

> Este é o "cérebro compartilhado" — permite continuidade sem perda quando o limite de tokens acaba e o user migra pra outra instância.

**Última atualização:** auto pelo hook Stop (`.claude/helpers/salvar-conversa-realtime.mjs`)

---

## 🔴 SE VOCÊ É UM CLAUDE ABRINDO AGORA — LEIA NESTA ORDEM

### 1. Perfil do user
- [[docs/PERFIL-USER|👤 Quem é o user, como se comunica, o que espera]]

### 2. Regras de trabalho
- [[docs/REGRAS-DE-TRABALHO|📏 Como trabalhar com o user — decisões, tom, cadência]]

### 3. Estado atual do sistema
- [[docs/memoria/project_estado_atual|📊 Onde o projeto está agora]]
- Última sessão registrada: `docs/sessoes/YYYY-MM-DD.md` (pega a mais recente)
- Última conversa completa: `docs/conversas-claude/*.md` (pega a maior/mais recente)

### 4. Pendências ativas
- Ver seção "Pendente" no fim da última sessão em `docs/sessoes/`

### 5. Skills e memórias
- [[docs/memoria/MEMORY|🧠 Índice de 91 memórias (feedbacks, projects, decisões)]]
- [[docs/skills/INDICE-SKILLS|🎯 561 skills disponíveis por categoria]]

### 6. Arquitetura do arsenal (arma de trabalho)
- [[docs/ARQUITETURA-COMPLETA|🗺️ Mapa vivo do arsenal — MCPs, plugins, skills, uv tools, npm, on-demand]]

**Contrato de manutenção do mapa (Rota A — 2026-08-24):**
- **INSTALO** → atualizo `ARQUITETURA-COMPLETA.md` na mesma tarefa, sem perguntar. Aviso em 1 linha: "mapa atualizado — adicionei X".
- **REMOVO** → **só quando Wesley pedir explícito**. Nunca sozinho. Nem "limpeza", nem "duplicata", nem "não usa". Se ver algo que parece dispensável, aponto em texto — não removo.
- Fallback manual: Wesley diz "atualiza mapa" → rodar `scripts/varredura-arsenal.sh` e regenerar.

---

## 📌 CONTEXTO ESSENCIAL — TL;DR

**Projeto:** Sistema de gestão para **Pontual Logística** — distribuidora de combustível/petróleo em Araucária/PR.

**Frota:** ~37 caminhões — 100% cavalo trucado/traçado (3 eixos). Combinações: **carreta simples (5 eixos)**, **bitrem (7 eixos)**, **rodotrem (9 eixos)**. 99% operação no Paraná.

**Stack atual:**
- Frontend: **React + Vite** (`frontend/`)
- Backend: **Cloud Functions** (`functions/`, Node 22)
- Banco: **Firebase Firestore** (projeto `pontual-logistica`)
- Auth: **Firebase Authentication** (email/senha + RBAC)
- Rastreamento: **SASCAR** SOAP API
- Abastecimento: **CTA Smart** XML API (bomba do pátio)

**Migração planejada:** vai sair do Firebase pra **Hostinger** (MySQL provavelmente). Ver [[docs/memoria/project-migracao-hostinger]] — **NÃO subir mais dados no Firestore** até definir a stack.

---

## 🚦 REGRAS PERMANENTES (não negociáveis)

Todas foram estabelecidas pelo user em conversas passadas. Violá-las quebra a confiança.

1. **CONSULTAR CONTEXTO ao abrir sessão** — ler `docs/sessoes/` + `docs/memoria/MEMORY.md` antes de responder. NÃO perguntar "onde paramos?" — está tudo no vault. Ver [[docs/memoria/feedback-abertura-sessao-consultar-contexto]].

2. **REGISTRAR TODA MODIFICAÇÃO em `docs/sessoes/YYYY-MM-DD.md`** — mesmo sem commit git. User pode fechar terminal sem querer. Ver [[docs/memoria/feedback-log-sessao-obsidian]].

3. **TODA mensagem do user vai pro vault** — hook `UserPromptSubmit` grava em `docs/prompts-user/YYYY-MM-DD.md`. Ver [[docs/memoria/feedback-salvar-tudo-user-diz]].

4. **CONVERSA COMPLETA em tempo real** — hook `Stop` exporta a cada resposta pro `docs/conversas-claude/*.md`. User migra entre Claudes quando o limite acaba. Ver [[docs/memoria/feedback-conversa-realtime-multi-claude]].

5. **Downloads do PC NUNCA entra no Obsidian** — `arquivo/downloads-*/` sempre ignorado. Ver [[docs/memoria/feedback-downloads-nao-entra-obsidian]].

6. **Frota Pontual: cavalo sempre 3 eixos** (trucado/traçado). Não existe toco/truck/bitruck. Ver [[docs/memoria/project-frota-pontual-eixos]].

7. **99% Paraná** — Novos Caminhos ANTT (tarifas R$ 2,30–3,50). Ver [[docs/memoria/project_pontual]].

8. **Disco F: intocável** — Wesley vetou. Nunca apagar/mover/organizar nada em F:\. Ver [[docs/memoria/feedback_disco_f_intocavel]].

9. **Nunca resetar senha sem pedido explícito** — Firebase Auth só guarda hash, ação irreversível.

10. **NF Nordica** substitui SÓ CIV (nunca CIPP), validade 12 meses. Ver [[docs/memoria/project-nf-nordica-substitui-civ]].

11. **Módulo de vencimentos JÁ EXISTE** em `frontend/src/manutencao/AbaConjuntoVencimentos.jsx`. NÃO criar módulo novo pra CIV/CIPP/CRLV/CNH — adicionar como tipos. Ver [[docs/memoria/project-modulo-vencimentos-existente]].

---

## 🔐 CREDENCIAIS e ACESSOS

**NUNCA versionar no git.** Estão em local gitignored:

- **Firebase Service Account:** `scripts/serviceAccountKey.json` (Firebase Admin SDK)
- **Firebase Project:** `pontual-logistica`
- **CTA Smart API Token:** `bEsu0JDwbL` (endpoint `https://ctasmart.com.br:8443/SvWebSincronizaAbastecimentos`)
- **Planilha completa de senhas:** [[arquivo/CREDENCIAIS|📄 arquivo/CREDENCIAIS.md]] (extraído de `arquivo/documents-fiscal/SENHAS PARA VOCE.xlsx`)
- **`.env` files:** raiz + `frontend/.env.local` + `functions/.env`
- **Hostinger:** a definir quando iniciar migração

---

## 🗺 MAPA DO VAULT

| O quê | Onde | Uso |
|---|---|---|
| **BRAIN.md** (este) | `BRAIN.md` | Ponto de entrada pra qualquer Claude |
| Perfil do user | `docs/PERFIL-USER.md` | Como ele é, o que quer |
| Regras de trabalho | `docs/REGRAS-DE-TRABALHO.md` | Como conduzir a conversa |
| Contexto Pontual | `CLAUDE.md` | Empresa, fases, decisões técnicas |
| Índice de memórias | `docs/memoria/MEMORY.md` | 91 arquivos categorizados |
| Índice de skills | `docs/skills/INDICE-SKILLS.md` | 561 skills disponíveis |
| Log de cada sessão | `docs/sessoes/YYYY-MM-DD.md` | O que foi feito, quando |
| Conversas exportadas | `docs/conversas-claude/*.md` | Trocas user+assistant completas |
| Prompts crus do user | `docs/prompts-user/YYYY-MM-DD.md` | Cada msg dele com timestamp |
| Docs numeradas | `docs/01-visao-geral.md` até `15-roteirizacao.md` | Arquitetura, RBAC, deploy, etc |

---

## 🧭 COMO MIGRAR PRA OUTRO CLAUDE (fluxo do user)

Quando o limite de tokens acabar aqui, o user pega:

1. **Este BRAIN.md** (raiz do repo)
2. **A conversa completa mais recente** de `docs/conversas-claude/`
3. **Última sessão** de `docs/sessoes/`

Cola no novo Claude (Claude.ai, ChatGPT, Gemini) e diz: **"leia isso, continue de onde paramos"**.

O novo Claude terá:
- Contexto completo do projeto
- Regras e memórias
- Estado atual e pendências
- Histórico da conversa

**Tudo funciona sem perder ritmo.**

---

## 🌐 URLs vivas

- **Produção:** https://pontual-logistica.web.app
- **Dev local:** http://localhost:5173 (após `iniciar-sistema.bat`)
- **Túnel Cloudflare:** ver `TUNNEL-URL.md` (muda a cada boot)
- **GitHub:** https://github.com/gabrielc-neto/sistema-gestao-operacional
- **Firebase Console:** https://console.firebase.google.com/project/pontual-logistica
- **Emulator UI (dev):** http://localhost:4000

## 🌿 Branches GitHub (4 ativas)

| Branch | Última | Situação |
|---|---|---|
| **`master`** | 2026-07-09 | Estável — fix mobile pneus |
| **`main`** | 2026-05-15 | Desatualizada (Fase 1 cercas) |
| **`feat/migracao-supabase`** | 2026-07-08 | ⭐ Reusar módulo Compras + barra exportação + UI/RBAC pra master |
| **`feat/conversao-php-laravel`** | 2026-06-30 | 🎯 **JÁ TEM Laravel 11 + MySQL** — quase pronto pra Hostinger |
| **`feat/14-jul-cta-rotas`** | AGORA | Trabalho ativo (CTA + Rotas + APIs + Obsidian + Frota audit) |

**Ver detalhes:** [[docs/memoria/project-branches-github-multiplas]]

## 🤖 Outras IAs / fontes de contexto no PC

Além de mim (Claude Code) e Claude.ai, o user tem:

- **Codex CLI** (`.codex\`) — 71 MB, memórias SQLite próprias
- **Claude Flow** (`.claude-flow\`) — orquestrador com sessões
- **ChatGPT VS Code extension** — instalada
- **OneDrive Backup automático** — `Backup-Sistema-2026-07-08\` (semanal)
- **Pendrive D:** — backups históricos (já em `arquivo/pendrive-completo/`)

**Ver detalhes:** [[docs/memoria/project-outras-ias-e-backups]]

## 💾 Redundância de dados (5 camadas)

1. **HD local** (repo) — versão viva
2. **arquivo/pendrive-completo** (41 GB) — snapshot pendrive físico
3. **GitHub** — 4 branches remotas
4. **OneDrive/Backup-Sistema-*** — snapshot semanal automático
5. **Desktop\frota-pontual** — cópia do módulo mais recente

Nada se perde se qualquer camada falhar.

---

*Este arquivo é READ-FIRST pra qualquer Claude/IA que entrar. Ao ler → ler as memórias linkadas → ler última sessão → responder.*
