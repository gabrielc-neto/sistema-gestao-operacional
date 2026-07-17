# 🔄 Protocolo Multi-Claude — Continuidade Bidirecional

> User usa APENAS Claude (Claude Code + Claude.ai). Este arquivo é obrigatório pra qualquer instância Claude que assuma o trabalho neste projeto.

## 👤 Contas Claude do user

| Conta | Email | Ambiente |
|---|---|---|
| **Principal** | `rosilda.lima75@gmail.com` | Claude Code (esta máquina) + Claude.ai |
| **Corporativa** | `logistica01@pontualpetroleo.com.br` | Uso futuro quando limite da principal acabar |

**Não usa:** ChatGPT, Gemini, Copilot, Codex, Cursor. Só Claude.

## 🎯 A regra

**O vault Obsidian (`C:\Users\Logistica01\projetos\logistica-ia`) é o cérebro compartilhado.**

Toda instância Claude deve:
1. **LER** o estado atual antes de responder
2. **ESCREVER** cada mudança em tempo real
3. **DEIXAR PRONTO** pra próxima instância continuar

---

## 📥 O QUE LER AO ASSUMIR (na ordem)

1. **`BRAIN.md`** — visão geral + regras + credenciais
2. **`docs/PERFIL-USER.md`** — como Rosilda se comunica
3. **`docs/REGRAS-DE-TRABALHO.md`** — princípios não negociáveis
4. **`docs/sessoes/YYYY-MM-DD.md`** — o mais recente (ver seção "Pendente" no fim)
5. **`docs/conversas-claude/*.md`** — a maior/mais recente (conversa completa)
6. **`docs/memoria/MEMORY.md`** — índice de 92+ memórias

**Comece a resposta com:** *"Vi que paramos em [X]. Continuando..."* — nunca *"onde paramos?"*.

---

## 📤 O QUE ESCREVER (durante o trabalho)

### Se você é Claude Code (tem acesso ao disco)

Automático via hooks:
- **UserPromptSubmit** → salva em `docs/prompts-user/YYYY-MM-DD.md`
- **Stop** → exporta conversa completa em `docs/conversas-claude/*.md`

Manual, cada bloco de trabalho:
- Append em `docs/sessoes/YYYY-MM-DD.md`:
  ```markdown
  ## HH:MM — [título curto]
  Arquivos: X, Y. Resultado: OK/erro.
  ```

### Se você é Claude.ai web (SEM acesso ao disco)

**No FIM de cada resposta importante**, gere um bloco:

````markdown
### 📝 SALVAR NO OBSIDIAN — cole no arquivo `docs/sessoes/2026-XX-XX.md`

## HH:MM — [título] (via Claude.ai)

O que fiz:
- ...

Arquivos afetados:
- `caminho/arquivo`

Próximo passo: ...
````

Rosilda copia esse bloco e cola no arquivo. Assim quando ela voltar pra Claude Code, o hook SessionStart lê e continua.

**Tag de origem:** sempre marcar `(via Claude.ai)` nas seções, pra distinguir de Claude Code.

---

## 🔄 Fluxos de troca

### Cenário A — Claude Code → Claude.ai (limite acabou aqui)
1. Rosilda pega o link ou faz upload de:
   - `BRAIN.md`
   - `PROTOCOLO-MULTI-IA.md` (este)
   - `docs/conversas-claude/[mais_recente].md`
   - `docs/sessoes/[mais_recente].md`
2. Cola na Claude.ai + o template abaixo

### Cenário B — Claude.ai → Claude Code (voltando)
1. Rosilda abre Claude Code
2. Hook `SessionStart` (`contexto-projeto-hook.mjs`) roda automático:
   - Lê `docs/sessoes/` mais recente
   - Extrai últimos 3 blocos + pendências
   - Injeta no meu contexto
3. Eu detecto blocos com tag `(via Claude.ai)` e continuo:
   > *"Vi que na Claude.ai você [X], continuando daqui..."*

### Cenário C — troca de conta (rosilda → logistica01)
Mesmo fluxo A/B — vault é local, não depende de conta. Ambas contas usam o mesmo vault no mesmo PC.

---

## 🧬 Template pra colar em Claude.ai nova

```
Sou Rosilda (Pontual Logística). Meu Claude Code está sem tokens.

Este projeto tem sistema de continuidade em vault Obsidian local.
Vou colar 3 arquivos pra você entender o contexto:

[colar BRAIN.md]

[colar docs/sessoes/YYYY-MM-DD.md mais recente]

[colar últimas 200 linhas da conversa em docs/conversas-claude/*.md]

Comece com "Vi que paramos em [X], continuando..." — não pergunte contexto.

No fim de cada resposta importante, gere bloco "SALVAR NO OBSIDIAN"
pra eu copiar e colar em docs/sessoes/YYYY-MM-DD.md — assim quando eu
voltar pro Claude Code ele lê o que você fez.

Regras completas: PROTOCOLO-MULTI-IA.md e BRAIN.md.
```

---

## 🚨 REGRAS NÃO NEGOCIÁVEIS (herdadas — valem em qualquer Claude)

1. **Nunca perguntar "onde paramos?"** — está no vault.
2. **Registrar toda modificação em tempo real** — mesmo sem commit git.
3. **Toda mensagem do user vai pro vault** — hook auto (Code) ou manual (Web).
4. **Downloads do PC nunca entra no Obsidian** — `arquivo/downloads-*/` sempre ignorado.
5. **Frota Pontual: cavalo sempre 3 eixos** (trucado/traçado). Carreta=5, bitrem=7, rodotrem=9.
6. **99% Paraná** — Novos Caminhos ANTT.
7. **Disco F: intocável** — nunca apagar/mover nada de F:\.
8. **Nunca resetar senha** sem pedido explícito.
9. **NF Nordica substitui SÓ CIV** (nunca CIPP), validade 12 meses.
10. **Módulo de vencimentos JÁ EXISTE** em `frontend/src/manutencao/AbaConjuntoVencimentos.jsx`.
11. **NÃO subir novos dados no Firestore** — migração pra Hostinger pendente.
12. **Ler pelo CONTEÚDO, não pelo nome** — arquivos podem ter nome errado.
13. **Antes de sugerir criar** algo → `grep -r` no `frontend/src` pra ver se já existe.

---

## 🔗 Fluxo bidirecional resumido

```
Claude Code                  Claude.ai
(email 1 ou 2)              (email 1 ou 2)
     │                           │
     └────→ Vault Obsidian ←─────┘
         (fonte única da verdade)
      C:\Users\Logistica01\projetos\logistica-ia\

Toda instância LÊ ao começar.
Toda instância ESCREVE ao trabalhar.
Nada se perde na troca de conta ou de sessão.
```

Ver também: [[BRAIN]] · [[docs/PERFIL-USER]] · [[docs/REGRAS-DE-TRABALHO]] · [[docs/memoria/project-contas-claude-user]] · [[docs/memoria/feedback-fluxo-bidirecional-multi-ia]]
