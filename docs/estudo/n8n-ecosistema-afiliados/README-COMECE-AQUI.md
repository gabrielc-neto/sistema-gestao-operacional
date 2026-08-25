# 🚀 Ecossistema n8n Afiliados — Comece Aqui

**Objetivo:** montar em casa um sistema 100% grátis que:
1. Coleta ofertas de Amazon, Mercado Livre, Shopee, AliExpress
2. Monitora queda de preço + cupons em Pelando/Promobit/Cuponomia
3. Filtra com IA (Gemini grátis) — só oferta boa passa
4. Regera link com SEU código de afiliado
5. Distribui pra Telegram (canal grátis)
6. WhatsApp / Instagram opcional

**Custo mensal esperado:** R$ 0
**Tempo pra ter no ar:** 4-6 horas (1 tarde de sábado)

---

## 📋 ORDEM DE EXECUÇÃO — não pule etapas

### Passo 1 — Cadastros (2h, sem PC ligado, pode fazer no celular)
Ler cada arquivo em `01-cadastros/` **na ordem**:
1. `amazon-associates.md`
2. `mercado-livre.md`
3. `shopee.md`
4. `aliexpress.md`
5. `apis-gratuitas-llm.md` ← **muito importante, é o que faz IA funcionar de graça**
6. `06-agregadores-extras.md` ← **opcional (semana 2+)**: Méliuz, Reddit, RSSHub, Keepa, Zoom validator

No final, você vai ter:
- 4 códigos de afiliado (tag/sub_id) — Amazon, ML, Shopee, Ali
- 1 chave Gemini API + 1 Groq (backup)
- 1 bot Telegram criado
- **(extra sem 2)** Méliuz + Reddit + Keepa se quiser potencializar

### Passo 2 — Subir o stack Docker (30min)
1. Instalar Docker Desktop pro Windows: https://www.docker.com/products/docker-desktop/
2. Entrar na pasta `02-docker/`
3. Copiar `.env.example` → `.env` e preencher suas chaves
4. Abrir CMD/PowerShell nessa pasta
5. Rodar: `docker compose up -d`
6. Aguardar 2 min. Abrir http://localhost:5678 (n8n)
7. Criar conta admin no primeiro acesso

**Ou:** duplo clique em `04-scripts/INICIAR-STACK.bat` (faz tudo automático)

### Passo 3 — Importar workflows (20min)
No n8n aberto:
1. Menu esquerdo → **Workflows** → **Import from File**
2. Importar **os 7 workflows base** (01-07) na semana 1
3. Semana 2+: adiciona **4 extras** (08-11) conforme cadastra Méliuz/Reddit/Zoom
4. Em cada um, clicar no node com ⚠️ (credencial faltando) e colar sua chave
5. Ativar cada workflow (toggle top-right)

**Arquitetura — coleta rápido, posta seleto:**
```
COLETORES (5min) → SCORE ENGINE (3min) → ZOOM VALIDATOR (5min)
                                              ↓
                                        ┌─────┴─────┐
                                        ↓           ↓
                              URGENT DETECTOR   POSTER NORMAL
                                (3min, flash)     (5min, top 2 score>=70)
                                      ↓                ↓
                                   Telegram        Telegram
```

**Ordem dos workflows:**
| # | Workflow | Frequência | Semana | Prioridade |
|---|---|---|---|---|
| 01 | Mercado Livre Collector | 5min | 1 | ⭐⭐⭐ |
| 02 | Amazon PA-API Collector | 10min | 1 | ⭐⭐⭐ (só depois 3 vendas) |
| 03 | Shopee Flash Sale Scraper | 5min | 1 | ⭐⭐⭐ |
| 04 | AliExpress SuperDeals | 5min | 1 | ⭐⭐⭐ |
| 05 | Price Monitor (queda>15%) | 5min | 1 | ⭐⭐ |
| 06 | Cupom Aggregator | 5min | 1 | ⭐⭐ |
| 07 | **AI Filter + Post Telegram** | 5min | 1 | ⭐⭐⭐ |
| **08** | Méliuz Cashback | 5min | 2 | ⭐⭐⭐ |
| **09** | Reddit ofertas | 5min | 2 | ⭐⭐ |
| **10** | Telegram RSSHub (5 canais) | 5min | 3 | ⭐⭐⭐ |
| **11** | Zoom Price Validator | 5min | 3 | ⭐⭐ |
| **12** | **Score Engine (0-100)** | 3min | 1 | ⭐⭐⭐ |
| **13** | **Urgent Detector (relâmpago)** | 3min | 1 | ⭐⭐⭐ |
| **14** | **Trends Hot Collector** (Google Trends BR + ML Trends) | 1h | 1 | ⭐⭐⭐ |
| **15** ⭐NOVO | **Feedback Loop CTR** (sistema aprende com cliques via Kutt) | 30min | 1-2 | ⭐⭐⭐ |

**⚠️ Novo componente no stack: KUTT** (encurtador self-hosted)
- Sobe automático com `docker compose up -d` na porta 3010
- Cada link postado vira `http://localhost:3010/abc123`
- Kutt conta os cliques → workflow 15 lê → Score Engine (12) aplica boost
- **Setup obrigatório**: 5min em `01-cadastros/07-kutt-encurtador.md` (criar conta admin + copiar API key pro `.env`)

**Regra do sistema:** coletores buscam TUDO (rápido, 5min), mas só **score >= 70** vira post.
- Score < 70 → fica no banco, não posta (não vira spam)
- Score >= 60 + palavra-chave urgente → posta IMEDIATO com tag ⚡RELÂMPAGO⚡ (workflow 13)
- Score >= 70 + qualidade alta → entra fila do poster normal (workflow 07)
- Anti-duplicata: se produto já foi postado nos últimos 7 dias, ignora

### Passo 4 — Testar (10min)
1. Abrir o Telegram, entrar no seu canal
2. No n8n, abrir `07-ai-filter-distribute` → clicar **Execute Workflow**
3. Se aparecer post no canal em 30s → **tá funcionando**

### Passo 5 — Deixar rodar 24/7
Duas opções:
- **PC em casa ligado** → nada a fazer, stack já roda
- **Migrar pra Oracle Cloud grátis** → ver `04-scripts/deploy-oracle-cloud.md`

---

## 🎯 O QUE ESPERAR NOS PRIMEIROS 90 DIAS

| Semana | Membros | Vendas | Comissão |
|---|---|---|---|
| 1-2 | 50-200 (você convida amigos + grupos WhatsApp) | 0-5 | R$ 0-50 |
| 3-4 | 200-500 (bocaboca + posts próprios em grupos) | 5-15 | R$ 50-300 |
| 5-8 | 500-1500 (indicações + IG divulgação) | 20-60 | R$ 300-1200 |
| 9-12 | 1500-3000 | 60-150 | R$ 1000-3000 |
| **6 meses** | 3000-8000 | 150-400 | **R$ 2000-6000/mês** |

*Numeros baseados em canais reais brasileiros (2025-2026).*

---

## 🔥 ATALHOS NUCLEARES DE CRESCIMENTO

1. **Bot de convite reverso** — quem convida 3 pessoas ganha acesso a "canal ouro" (mesma ideia, só mais volume)
2. **Cross-post no Grupo WhatsApp Família + amigos** — 3-5 grupos = 300-500 pessoas grátis
3. **Reels/Shorts com produto** — pega top 5 ofertas do dia, cria vídeo 15s com IA (Runway free tier ou HeyGen)
4. **Comentar em posts de reclamação de preço** ("olha que achei X mais barato aqui: [link canal]")

---

## 🛑 O QUE NÃO FAZER (evita ban)

Já discutido. Resumo técnico:

| Programa | Rate limit humano |
|---|---|
| Amazon | ≤ 20 posts/dia por canal, misturar com produtos próprios |
| ML | Sem limite prático — programa permite última tag |
| Shopee | ≤ 30 posts/dia, rotacionar 3 sub_ids |
| AliExpress | Sem limite prático |
| Telegram | ≤ 50 msgs/hora por bot, senão trava temporário |

---

## 📁 ESTRUTURA DESTE PACOTE

```
n8n-ecosistema-afiliados/
├── README-COMECE-AQUI.md        ← você está aqui
├── FAQ.md                       ← dúvidas comuns
├── 01-cadastros/                ← 6 guias (semanas 1+2)
├── 02-docker/                   ← stack pra rodar (30min)
├── 03-workflows/                ← 11 fluxos n8n prontos
├── 04-scripts/                  ← automações .bat/.sh
├── 05-templates-post/           ← modelos de post que convertem
├── DOSSIE-v1-grupo-ofertas.md   ← teoria + estratégia (v1)
└── DOSSIE-v2-automacao-total.md ← teoria completa (v2)
```

---

## ⚡ SUPORTE / DÚVIDAS

- FAQ: `FAQ.md` (perguntas comuns respondidas)
- Comunidade n8n Brasil: https://n8n-brasil.github.io/n8n-Doc-PT-BR/
- Comunidade oficial: https://community.n8n.io/

Boa sorte. Fecha os cadastros, sobe stack, importa workflow — em 6h tá no ar.
