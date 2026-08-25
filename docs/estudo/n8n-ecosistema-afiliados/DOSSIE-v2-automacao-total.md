# n8n — Dossiê V2: Automação Total (2026)

**Data:** 2026-08-12
**Complementa:** `n8n-ecossistema-grupo-ofertas-DOSSIE.md` (v1, 2026-08-11)
**Foco:** cenário completo — AI Agents, self-hosted enterprise, integrações omnichannel, LLMs, templates.

---

## 0. TL;DR — o que mudou de 2025 pra 2026

| Antes (2025) | Agora (2026) |
|---|---|
| Prompt chaining com LLM node | **AI Agents autônomos** que raciocinam, auto-corrigem, delegam pra outro agent ou humano |
| n8n = "iPaaS open-source" | n8n = **camada de orquestração** entre CRM, ERP, DW, vector DB, LLM |
| 400 integrações | **9.107+ templates** oficiais (75% novos com IA/LLM) |
| Docker + SQLite | **Docker + Postgres + queue workers dedicados** (padrão prod) |
| WhatsApp Business API pesado | **6x mais conversão** que e-commerce tradicional (Chat Commerce 2025) |

---

## 1. Tendências centrais 2026

1. **Agentic AI** — agent com memória, tool access, raciocínio multi-step
2. **Multi-agent orchestration** — agent principal delega para specialistas (sales, suporte, dados)
3. **Self-hosted RAG** — vector store + document loader nativos, dados nunca saem do VPC
4. **Enterprise-scale** — regulados (financeiro, saúde) adotam n8n justamente pra data residency
5. **Human-in-the-loop** — agent hand-off pra humano quando incerto

---

## 2. Arquitetura AI Agent no n8n (6 camadas)

```
┌────────────────────────────────────────────────┐
│  1. INPUT       → Webhook / trigger / chat     │
│  2. ORCHESTR.   → AI Agent node (roteador)     │
│  3. REASONING   → LLM (Claude/GPT/Gemini/local)│
│  4. TOOL ACCESS → HTTP / DB / API / RAG        │
│  5. MEMORY      → Postgres / Redis / Vector    │
│  6. ACTION      → CRM / Slack / email / bot    │
└────────────────────────────────────────────────┘
```

**Nodes-chave:**
- `AI Agent` — o cérebro (suporta OpenAI, Anthropic Claude, Gemini, Ollama)
- `Vector Store` — Pinecone, Qdrant, Supabase pgvector, Weaviate
- `Document Loader` — PDF, Notion, Google Drive, sites
- `Memory` — buffer, window, summary

---

## 3. Self-hosted enterprise — stack Docker prod

**Compose mínimo produção:**
```yaml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - N8N_ENCRYPTION_KEY=<random-32-chars>
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - WEBHOOK_URL=https://n8n.exemplo.com/
    volumes: ["./n8n_data:/home/node/.n8n"]
  postgres:
    image: postgres:16
    environment: [POSTGRES_DB=n8n, POSTGRES_PASSWORD=<pwd>]
    volumes: ["./pg_data:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
  worker:
    image: docker.n8n.io/n8nio/n8n
    command: worker
    depends_on: [redis, postgres]
    deploy: { replicas: 3 }
```

**Custo real (VPS Hostinger/DO $20/mês):**
- ~50.000 execuções/mês tranquilo
- Zapier equivalente: ~$599/mês (Team)
- **Economia: 80-90%**

**Requisitos prod:**
- Postgres (nunca SQLite em prod)
- Redis pra queue (executions_mode=queue)
- Workers dedicados (replicas ≥ 2)
- HTTPS obrigatório (Traefik/Caddy/Nginx)
- Backup diário do volume Postgres

---

## 4. n8n vs Make vs Zapier — matriz de decisão

| Critério | n8n | Make | Zapier |
|---|---|---|---|
| Preço entrada | **$0 self-host** / $20 cloud | $9 | $19,99 |
| Modelo billing | Por execução | Por operação | **Por task** (caro) |
| 10k×10-step/mês | ~$20 | ~$50 | ~$500-800 |
| Apps | 400+ nativos | 1.700+ | **7.000+** |
| Self-hostable | **Sim (única)** | Não | Não |
| Code (JS/Python) | **Sim, first-class** | Limitado | Limitado |
| IA nativa | **Melhor** (agent+RAG) | Boa | Zapier Agents 2026 |
| Curva | Média | Fácil | **Muito fácil** |
| Data no seu servidor | **Sim** | Não | Não |

**Regra prática:**
- Não-técnico + poucos volumes → **Zapier**
- Visual + volumes médios → **Make**
- Volumes altos + IA + compliance → **n8n self-hosted** ✓ (perfil Pontual)

---

## 5. Integrações omnichannel — combo que gera venda

### WhatsApp (o mais importante — 6x conversão)
Duas rotas:
- **WhatsApp Business API oficial** (via Meta / 360Dialog / Twilio) — pesado, precisa aprovação
- **Evolution API / Baileys** (open-source) — não-oficial, funciona em número comum, risco de ban baixo se comportamento humano

Nodes n8n:
- `WhatsApp Business Cloud` (oficial)
- `HTTP Request` → Evolution API (não-oficial)

### Telegram
- `Telegram Trigger` + `Telegram Bot` nativos
- Bots ilimitados, sem custo, ideal pra alertas internos e VIP groups

### Instagram
- `Instagram Trigger` (webhooks Meta)
- Comentários, DMs, mentions → CRM
- Anti-spam Meta: cuidado com auto-DM (limite 20/dia)

### E-commerce
- Shopify, WooCommerce, Magento — nativos
- Mercado Livre, Amazon SP-API — via HTTP Request + OAuth
- Pagamentos: Stripe, PayPal, Mercado Pago, PagSeguro nativos

**Fluxo omnichannel típico:**
```
Trigger (WhatsApp/IG/site)
  → AI Agent classifica intenção
    → Se venda: cria pedido Shopify + envia link pagamento
    → Se suporte: RAG em base FAQ + resposta
    → Se lead frio: adiciona CRM + sequência email
  → Log tudo em Postgres/Sheets
```

---

## 6. LLMs suportados — quando usar cada

| LLM | Node n8n | Preço 1M tokens | Melhor pra |
|---|---|---|---|
| **Claude 3.5/4 Sonnet** | `Anthropic Claude` | $3 in / $15 out | Raciocínio complexo, análise texto longo, código |
| **GPT-4o** | `OpenAI` | $2,50 in / $10 out | Balanço geral, function calling |
| **GPT-4o-mini** | `OpenAI` | $0,15 in / $0,60 out | Alta escala, classificação, extração |
| **Gemini 2.0 Flash** | `Google Gemini` | $0,075 in / $0,30 out | **Mais barato**, contexto 1M tokens |
| **Ollama local** (Llama 3.3, Qwen) | `Ollama` | $0 | Privacidade total, no seu VPS |

**Estratégia custo/qualidade:**
1. Classificação rápida → **Gemini Flash** ou **GPT-4o-mini**
2. Resposta ao cliente → **Claude Sonnet** (mais educado, menos alucinação)
3. Extração dados estruturados → **GPT-4o** (function calling)
4. Dados sensíveis → **Ollama local**

---

## 7. Templates prontos — 3 fontes

| Fonte | Qtd | Foco | URL |
|---|---|---|---|
| **n8n.io oficial** | 9.107+ | Todos, 75% com IA | n8n.io/workflows |
| **awesome-n8n-templates (GitHub)** | 280+ | Curado, AI Agent + RAG | github.com/enescingoz/awesome-n8n-templates |
| **n8n-library** | 2.348+ | Marketing/vendas | n8n-library.com |
| **n8nresources.dev** | 5.600+ | Enterprise | n8nresources.dev |

**Top workflows pra automação total (baixa & adapta):**
1. **RAG chatbot** — sobe PDF → vector store → chat que responde com fonte
2. **Lead qualifier** — Instagram DM → IA classifica → HubSpot + WhatsApp
3. **Content pipeline** — pauta → IA gera → aprova humano → posta IG+FB+LinkedIn
4. **Customer support triage** — email → classifica urgência → roteia depto
5. **Data extraction** — nota fiscal PDF → OCR → JSON → ERP
6. **Multi-agent research** — pergunta → sub-agents pesquisam paralelo → consolida

---

## 8. Casos práticos que **fazem sentido pra Pontual/Rosilda**

| Cenário | Stack n8n | ROI estimado |
|---|---|---|
| Motorista manda foto de OS/canhoto WhatsApp → IA lê → salva no sistema | WhatsApp + OpenAI Vision + Postgres | Elimina digitação manual |
| Cliente pede status frete → bot IA responde em tempo real via SASCAR | WhatsApp + HTTP SASCAR + Claude | Reduz ligação central |
| Alerta abastecimento suspeito CTA → Telegram grupo gestão | Cron + CTA Smart + Telegram | Detecção fraude tempo real |
| Nota fiscal chega email → extrai dados → lança compras | Gmail + OCR + Postgres | Zero digitação NFe |
| Fim mês: gera fechamento motoristas → PDF → email | Cron + query PG + PDF + Gmail | Sábado livre |

---

## 9. Como estudar (ordem recomendada)

1. **Semana 1** — subir n8n local (Docker) + rodar 3 templates GitHub
2. **Semana 2** — 1º workflow real (ex: WhatsApp → Sheets)
3. **Semana 3** — adicionar IA (AI Agent + OpenAI/Claude)
4. **Semana 4** — RAG (subir PDF → chatbot responder)
5. **Semana 5** — multi-agent (roteador + specialistas)
6. **Semana 6** — deploy prod VPS com Postgres+Redis+workers

**Canais top pra estudar** (verificado na v1):
- Nate Herk (EN) — foco AI Agents
- Bart Slodyczka / Leon van Zyl — enterprise
- Comunidade oficial community.n8n.io — vale peso ouro

---

## Fontes (V2)

- [n8n AI Workflow Automation: Architecture Guide 2026 (AppScale)](https://appscale.blog/en/blog/n8n-ai-workflow-automation-architecture-agents-2026)
- [15 Practical AI Agent Examples 2026 (n8n Blog)](https://blog.n8n.io/ai-agents-examples/)
- [Complete n8n AI Workflow Guide 2026 (Hildi)](https://hildiconsulting.com/en/blog/n8n-ai-workflow-automation-guide)
- [Self-Hosting n8n Enterprise Guide 2026 (Finbyz)](https://finbyz.tech/n8n/insights/self-hosting-n8n-enterprise-guide)
- [Self-Hosted n8n Best Practices 2026 (n8nlab)](https://n8nlab.io/blog/self-hosted-n8n-best-practices-setup-checklist)
- [n8n vs Zapier vs Make Comparison 2026 (Parseur)](https://parseur.com/blog/zapier-n8n-make)
- [n8n vs Zapier vs Make Pricing 2026 (Cipher Projects)](https://www.cipherprojects.com/blog/posts/n8n-vs-zapier-vs-make-automation-comparison/)
- [Integração n8n WhatsApp CRM Loja (Serverspace BR)](https://serverspace.com.br/about/blog/como-integrar-n8n-com-whatsapp-crm-e-loja-virtual-para-vender-mais/)
- [Automação omnichannel n8n WhatsApp Telegram email 2026 (Hora de Codar)](https://horadecodar.com.br/automacao-omnichannel-n8n-whatsapp-telegram-email-2026/)
- [n8n Templates 2026: 8.300+ Workflow Examples (ConnectSafely)](https://connectsafely.ai/articles/n8n-templates-workflow-automation-examples)
- [awesome-n8n-templates (GitHub, 280+ templates)](https://github.com/enescingoz/awesome-n8n-templates)
- [Claude + OpenAI + n8n integração](https://n8n.io/integrations/claude/and/openai/)
- [n8n Brasil — Integrações completas (docs PT-BR)](https://n8n-brasil.github.io/n8n-Doc-PT-BR/integracoes)

---

*Documento produzido 2026-08-12 · complementa DOSSIE v1 sobre grupo de ofertas · foco: automação total genérica.*
