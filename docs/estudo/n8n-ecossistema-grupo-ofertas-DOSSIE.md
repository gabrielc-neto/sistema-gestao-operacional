# DOSSIÊ COMPLETO — Ecossistema n8n para Grupo de Ofertas Automatizado

**Compilado por Claude Code · 2026-08-11**
**Escopo:** cobre Amazon, Mercado Livre, Shopee, AliExpress, Magalu, Kabum e demais marketplaces principais do Brasil.
**Objetivo:** material de estudo estruturado para IA + operador humano.

---

## Sumário

1. [Visão geral e modelos de negócio](#1-visão-geral-e-modelos-de-negócio)
2. [Marketplaces cobertos — APIs e afiliação](#2-marketplaces-cobertos)
3. [Arquitetura do ecossistema n8n](#3-arquitetura-do-ecossistema-n8n)
4. [Componentes técnicos essenciais](#4-componentes-técnicos-essenciais)
5. [Playlist YouTube — trilha de estudo por tema](#5-playlist-youtube---trilha-de-estudo)
6. [Estratégias avançadas de operação](#6-estratégias-avançadas)
7. [Custos e modelos de monetização](#7-custos-e-monetização)
8. [Anti-ban e boas práticas](#8-anti-ban-e-boas-práticas)
9. [Templates n8n prontos (import direto)](#9-templates-n8n-prontos)
10. [Comunidades, canais e documentação](#10-comunidades-e-referências)
11. [Roadmap de implementação sugerido](#11-roadmap-de-implementação)

---

## 1. Visão geral e modelos de negócio

**O que é um "grupo de ofertas automatizado":** canal (WhatsApp/Telegram/Discord/Instagram) que publica automaticamente ofertas com desconto de marketplaces, usando links de afiliado do operador. A cada compra convertida via seu link, você recebe comissão (2-15% dependendo do marketplace e categoria).

**Por que n8n:**
- Open-source (grátis, sem limite de execuções se self-hosted)
- Interface visual drag-and-drop
- Integra com qualquer API REST via HTTP Request node
- Nodes prontos para: Telegram, WhatsApp (Evolution API), Google Sheets, Postgres, LLMs (OpenAI, Claude)
- Comunidade brasileira ativa

**Três modelos comuns:**

| Modelo | Como funciona | Ticket médio |
|---|---|---|
| **Grupo aberto (afiliação pura)** | Publica em canais/grupos públicos, ganha só comissão de afiliado | Depende de volume — 500-5000 compras/mês |
| **Grupo VIP pago** | Ofertas exclusivas + antecipação. Assinatura mensal R$ 9,90-29,90/membro | 100-500 membros = R$ 1k-15k/mês recorrente |
| **SaaS revenda** | Empacota o próprio bot como serviço e vende pra outros afiliados | R$ 47-197/mês por cliente |

---

## 2. Marketplaces cobertos

### 2.1 Amazon (Programa de Associados + PA-API)

| Item | Detalhe |
|---|---|
| **API** | Product Advertising API (PA-API) v5 |
| **Cadastro** | https://associados.amazon.com.br |
| **Comissão** | 1-10% conforme categoria (média 3-4%) |
| **Restrições** | PA-API exige mínimo de 3 vendas qualificadas em 180 dias pra manter acesso; cota baixa no início |
| **Alternativa quando cota é baixa** | Web scraping via BrightData/Scrapeless (n8n tem workflows prontos) |
| **Node n8n** | Não tem native — usar HTTP Request com AWS Signature v4 |

**Endpoint principal:** `webservices.amazon.com.br/paapi5/getitems`
**Docs:** https://webservices.amazon.com/paapi5/documentation/

### 2.2 Mercado Livre (Programa de Afiliados)

| Item | Detalhe |
|---|---|
| **API** | Mercado Livre Affiliate API |
| **Cadastro** | https://afiliados.mercadolivre.com.br |
| **Comissão** | 3-9% (varia por categoria e status do afiliado) |
| **Diferencial** | API generosa, sem cota inicial pequena; API pública p/ busca de produtos sem credencial |
| **Node n8n** | Não native — HTTP Request com OAuth 2.0 |

**Endpoint público (sem auth):** `https://api.mercadolibre.com/sites/MLB/search?q=<termo>`
**Docs:** https://developers.mercadolivre.com.br/

### 2.3 Shopee (Shopee Affiliate Program)

| Item | Detalhe |
|---|---|
| **API** | Shopee Affiliate Open API |
| **Cadastro** | https://affiliate.shopee.com.br/open_api |
| **Comissão** | 5-20% (uma das mais generosas do BR) |
| **Diferencial** | Endpoint específico pra campanhas sazonais (Black Friday, flash sales) |
| **Auth** | App ID + Secret via HMAC-SHA256 |
| **Node n8n** | HTTP Request com signature customizada |

**Docs oficiais:** https://affiliate.shopee.com.br/documentacao
**Portal:** https://www.affiliateshopee.com.br

### 2.4 AliExpress (AliExpress Portals)

| Item | Detalhe |
|---|---|
| **API** | AliExpress Portals Affiliate API |
| **Cadastro** | https://portals.aliexpress.com |
| **Comissão** | 2-10% (menor que BR, mas produtos baratos = volume) |
| **Node n8n** | **TEM node community pronto:** `n8n-nodes-aliexpress-affiliate` (GitHub: ofekb/n8n-nodes-aliexpress-affiliate) |
| **Template pronto n8n.io** | Sim — "Find AliExpress affiliate products via Telegram with OpenAI and Decodo" |

**Install node community:**
```bash
# no n8n → Settings → Community Nodes → npm package:
n8n-nodes-aliexpress-affiliate
```

### 2.5 Magazine Luiza (Magalu Ads)

| Item | Detalhe |
|---|---|
| **Programa** | Magalu Ads (Parceiro Magalu) |
| **Cadastro** | https://parceiromagalu.com.br |
| **Comissão** | 3-12% |
| **API** | Sem API pública robusta — geralmente usa **link builder** manual + monitor via scraping |
| **Alternativa** | Usar Awin (rede de afiliados) que revende programa Magalu com API |

### 2.6 Kabum (Programa Kabum Ads)

| Item | Detalhe |
|---|---|
| **Programa** | Kabum Afiliados |
| **Cadastro** | Via Awin ou Rakuten |
| **Comissão** | 2-5% (categoria hardware) |
| **API** | Via rede de afiliados (Awin) |

### 2.7 Outros (Americanas, Submarino, Shoptime, Nike, Centauro, Shein)

Todos geralmente acessados via **redes de afiliados** que agregam múltiplos programas com API única:
- **Awin** — https://www.awin.com (BR: awin.com/br)
- **Rakuten Advertising** — https://rakutenadvertising.com
- **Lomadee** — https://www.lomadee.com

---

## 3. Arquitetura do ecossistema n8n

### 3.1 Diagrama macro

```
┌─────────────────── FONTES DE DADOS ───────────────────┐
│                                                       │
│  Amazon PA-API      Mercado Livre    Shopee Open API │
│  AliExpress         Magalu (scrape)  Kabum (Awin)    │
│  Promobit RSS       Pelando RSS      Baixaki         │
│                                                       │
└──────────────────────────┬────────────────────────────┘
                           │
                           ▼
┌─────────────────── CÉREBRO N8N ───────────────────────┐
│                                                       │
│  1. TRIGGER      Cron / Webhook / Manual              │
│  2. COLETA       HTTP Request nodes                   │
│  3. NORMALIZA    Function node → JSON padrão          │
│  4. DEDUP        Postgres/SQLite → SKU + timestamp    │
│  5. FILTRA       % desconto mínimo, categoria         │
│  6. ENRIQUECE    Encurtador + tracking UTM            │
│  7. GERA LINK    Concatena código de afiliado         │
│  8. FORMATA      Template mensagem + emojis           │
│  9. PUBLICA      Telegram / WhatsApp / Instagram      │
│ 10. REGISTRA     Log clicks + vendas                  │
│                                                       │
└──────────────────────────┬────────────────────────────┘
                           │
                           ▼
┌─────────────────── CANAIS DE SAÍDA ───────────────────┐
│                                                       │
│  Telegram (bot)    WhatsApp (Evolution)   Instagram   │
│  Grupo público     Grupo VIP pago         Stories     │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 3.2 Fluxo de dados detalhado

```
[Cron 15min] → [HTTP Get Shopee] → [Function normalize]
     ↓                                     ↓
[HTTP Get ML] ────────────────→ [Merge] ← [HTTP Get Amazon]
     ↓
[Postgres SELECT deduped]
     ↓
[IF discount >= 30% AND category IN whitelist]
     ↓
[HTTP encurtador (bit.ly)]
     ↓
[String template com afiliado tag]
     ↓
[Telegram send] → [Wait 2s] → [Whatsapp send Evolution]
     ↓
[Postgres INSERT sent_log]
```

---

## 4. Componentes técnicos essenciais

### 4.1 Camada de envio de mensagens

| Ferramenta | Canal | Custo | Estabilidade | Observação |
|---|---|---|---|---|
| **Telegram Bot API** | Telegram | Grátis | ⭐⭐⭐⭐⭐ | Melhor opção — sem banimento se seguir regras |
| **Evolution API** | WhatsApp | Grátis (self-host) | ⭐⭐⭐ | Não-oficial; risco de banimento |
| **WPPConnect** | WhatsApp | Grátis | ⭐⭐⭐ | Alternativa ao Evolution, mesma base |
| **WhatsApp Cloud API (Meta)** | WhatsApp Oficial | Pago (por conversa) | ⭐⭐⭐⭐⭐ | Oficial, caro pra grupo de ofertas |
| **Z-API** | WhatsApp | R$ 49-149/mês | ⭐⭐⭐⭐ | SaaS BR, mais estável que Evolution |
| **Twilio** | WhatsApp/SMS | Pago | ⭐⭐⭐⭐⭐ | Oficial, caro |

**Recomendação inicial:** **Telegram Bot API** — grátis, estável, sem banimento. WhatsApp depois quando validar o modelo.

### 4.2 Banco de dados

| Uso | Ferramenta |
|---|---|
| Deduplicação de ofertas | SQLite (embutido no n8n) OU Postgres |
| Log de envios | Postgres |
| Cache de metadados | Redis (opcional) |
| Tracking de conversões | Postgres + link com Google Analytics |

### 4.3 Encurtador + tracking

- **Bit.ly** — API grátis até 100 links/mês
- **Cutt.ly** — API grátis até 500/dia
- **YOURLS** — self-hosted, ilimitado
- **UTM builder** — Function node interno

### 4.4 IA para curadoria

- **OpenAI GPT-4o-mini** — classificar oferta (é boa? é reembalada?)
- **Claude Haiku** — escrever descrição criativa da oferta
- **Local (Ollama)** — usar Llama 3 local sem custo

### 4.5 Monitoramento e analytics

- **Grafana + Prometheus** — dashboard de saúde
- **Google Analytics 4** — via UTM tags
- **Bitly Analytics** — clicks
- **PostHog** — self-hosted analytics

---

## 5. Playlist YouTube — trilha de estudo

Ordenados por sequência ideal de aprendizado (do básico ao avançado).

### 🎓 Nível 1 — Fundamentos n8n

1. [N8N + WhatsApp GRÁTIS: Automatize sem gastar (2025)](https://www.youtube.com/watch?v=SJuEeAuiuDE) — instalação zero-custo com Docker
2. [N8N + WhatsApp Grátis: Atualizado 2025](https://www.youtube.com/watch?v=FyQivMjb3_8) — Evolution API do zero
3. [Automação WhatsApp com N8N: Disparo em Massa Gratuito](https://www.youtube.com/watch?v=4R81YgzHcLQ) — mecânica básica de envio

### 🎯 Nível 2 — Grupos de ofertas — visão geral

4. [Como criar Grupos de Ofertas Automáticos no WhatsApp 100% Automatizado](https://www.youtube.com/watch?v=ThWeRwFwtFY) — **VIDEO CHAVE** — fluxo completo
5. [Afiliado, Como criar um GRUPO DE OFERTAS pelo whatsapp](https://www.youtube.com/watch?v=84gyzM6ssyU) — estratégia comercial

### 🛒 Nível 3 — Por marketplace

6. [Como automatizar grupos de afiliados Amazon e Shopee no WhatsApp (N8N + WPPConnect)](https://www.youtube.com/watch?v=AnI9-k0Ixv0) — Amazon + Shopee
7. [Automatizar Afiliados do Mercado Livre com N8N e WhatsApp | Ganhe Enquanto Dorme](https://www.youtube.com/watch?v=dNdDxnzjOhs) — Mercado Livre
8. [Mercado Livre: Automatize seus Links de Afiliado com n8n](https://www.youtube.com/watch?v=KKXOje5PEwk) — foco em geração de link
9. [AFILIADO SHOPEE: Como Encontrar e Postar Ofertas no Whatsapp e Telegram de Modo Automático 2026](https://www.youtube.com/watch?v=IX8agoCPRo4) — Shopee específico
10. [BOT DE OFERTAS no TELEGRAM com N8N: Afiliados Amazon...](https://www.youtube.com/watch?v=NadDpetjo2A) — Telegram-first (mais estável)

### 💰 Nível 4 — Monetização e escala

11. [N8N Tutorial + Evolution API — Grupo de WhatsApp Por Assinatura 🤑](https://www.youtube.com/watch?v=GWHfYoAf6P0) — modelo pago
12. [Integração Mercado Pago + n8n](https://www.youtube.com/watch?v=FtZ1lo0MIa4) — cobrar assinatura

### 🧠 Nível 5 — Canal @oaugustosgabriel (referência BR)

Canal focado em automação n8n em português. **Todos os workflows abertos no GitHub:** https://github.com/gabriel-g2n/workflows

---

## 6. Estratégias avançadas

### 6.1 Curadoria com IA

Em vez de postar toda oferta que passa no filtro %, usar LLM pra validar:
- "Essa oferta é realmente boa?" (compara preço com histórico)
- "Reescreve a descrição de forma persuasiva"
- "Classifica: HOT / OK / DESCARTAR"

**Custo estimado:** R$ 0,001-0,005 por oferta (GPT-4o-mini) = R$ 5-25/mês para 5000 ofertas.

### 6.2 Multi-canal com personalização

Cada canal (grupo Telegram VIP, grupo público, Instagram) recebe formato diferente:
- **VIP:** oferta 30 min antes + resumo com screenshot do preço
- **Público:** oferta simples + link
- **Instagram Stories:** cria imagem via API (Bannerbear, Placid) com preço + logo

### 6.3 Anti-repetição inteligente

Não basta deduplicar por SKU — usar embedding do título+preço pra detectar produtos "quase iguais" reembalados.

### 6.4 Precificação histórica

Guardar o preço de cada produto por dia — só posta se o preço atual for X% menor que a mediana dos últimos 30 dias. Evita "fake desconto" (marca inflaciona preço pra "botar em promoção").

**Fonte de dados grátis:** Zoom.com.br / Buscapé têm histórico público (scrape).

### 6.5 Segmentação de canais por nicho

Não misturar tudo — criar canais por vertical:
- 📱 Celulares e eletrônicos
- 👕 Moda
- 🏠 Casa e cozinha
- 🎮 Games
- 📚 Livros

Aumenta conversão porque público é mais qualificado.

### 6.6 A/B testing de mensagem

Testar 2 formatos de mensagem alternando 50/50 e ver qual gera mais clicks (via encurtador). Iterar.

### 6.7 Retargeting via lista

Quem clicou mas não comprou → cadastra em lista → 24h depois manda oferta relacionada.

---

## 7. Custos e monetização

### 7.1 Custo mensal operacional (self-hosted)

| Item | Custo |
|---|---|
| VPS (Contabo/Hostinger/Digital Ocean) | R$ 30-80/mês |
| Domínio (opcional) | R$ 40/ano |
| WhatsApp chip dedicado | R$ 20-50/mês |
| API OpenAI (curadoria com IA) | R$ 10-50/mês |
| Encurtador Bit.ly Basic (se ultrapassar grátis) | R$ 50/mês |
| **TOTAL mínimo** | **~R$ 90/mês** |

### 7.2 Estimativa de receita

Modelo grátis 5000 membros + 3% comissão média:

| Métrica | Valor |
|---|---|
| Ofertas postadas/dia | 30 |
| CTR médio | 5% |
| Cliques/mês | 22.500 |
| Conversão | 2% |
| Compras/mês | 450 |
| Ticket médio | R$ 120 |
| GMV/mês | R$ 54.000 |
| Comissão 3% | **R$ 1.620/mês** |

Modelo VIP 500 assinantes R$ 19,90:

| Métrica | Valor |
|---|---|
| Assinantes | 500 |
| Ticket | R$ 19,90 |
| Receita/mês | **R$ 9.950/mês** |
| + comissão afiliação | +R$ 1.620/mês |
| **TOTAL** | **~R$ 11.500/mês recorrente** |

---

## 8. Anti-ban e boas práticas

### 8.1 WhatsApp — regras críticas

| Regra | Detalhe |
|---|---|
| **Chip dedicado** | NUNCA usar o pessoal — chip novo, sem histórico |
| **Aquecimento** | 7-14 dias enviando pouco (10-30 mensagens/dia) antes de escalar |
| **Rate limit** | Máx 200-500 mensagens/dia por conta nova; 1000-2000 depois de aquecido |
| **Delay entre mensagens** | 2-8 segundos, aleatório |
| **Variação de texto** | Nunca mandar mesma mensagem literal — usar templates com variação |
| **Grupos** | Máx 5-10 grupos por conta; NÃO adicionar em massa |
| **Perfil humano** | Foto, nome, descrição — nunca deixar padrão |
| **Backup** | Ter 2-3 números de reserva |

### 8.2 Telegram — muito mais permissivo

- Rate limit: 30 mensagens/segundo pra 1 canal, sem cota diária
- Bot precisa ser adicionado como admin do canal/grupo
- Bots públicos podem ser bloqueados por spam denúncia — evitar palavras-chave agressivas

### 8.3 Scraping — legalidade

- **APIs oficiais > scraping** sempre
- Web scraping é área cinza no BR — vale se dado é público
- Respeitar `robots.txt`
- Não sobrecarregar (1 req a cada 2-5s por IP)
- Usar rotação de proxy pra sites hostis (BrightData, Bright Proxy)

### 8.4 LGPD

Se coletar dados de usuário (email pra newsletter, telefone pra WhatsApp):
- Consentimento explícito
- Política de privacidade publicada
- Direito ao esquecimento (deletar dados sob demanda)

---

## 9. Templates n8n prontos

### 9.1 Templates oficiais do n8n.io (import direto)

| Template | Link |
|---|---|
| Amazon affiliate marketing automation | https://n8n.io/workflows/7422 |
| Amazon product search scraper (BrightData+GPT4+Sheets) | https://n8n.io/workflows/3901 |
| Find AliExpress affiliate products via Telegram | https://n8n.io/workflows/12437 |
| Add affiliate to a program automatically | https://n8n.io/workflows/936 |
| Build your own N8N workflows MCP server | https://n8n.io/workflows/3770 |

### 9.2 GitHub — repositórios de referência

| Repo | Conteúdo |
|---|---|
| [gabriel-g2n/workflows](https://github.com/gabriel-g2n/workflows) | Workflows do canal BR @oaugustosgabriel |
| [ofekb/n8n-nodes-aliexpress-affiliate](https://github.com/ofekb/n8n-nodes-aliexpress-affiliate) | Node community AliExpress |
| [murilo813/Bot-Afiliado-Telegram](https://github.com/murilo813/Bot-Afiliado-Telegram) | Bot Telegram completo Python (referência) |
| [JulioBorges/8291d6cf...](https://gist.github.com/JulioBorges/8291d6cf8a32ace8099ce66d9ff26bd1) | Workflow n8n criação links afiliados |
| [allanchangcl/aliexapi](https://github.com/allanchangcl/aliexapi) | AliExpress Affiliate API wrapper |

### 9.3 Pacote 448 scripts n8n (Mercado Livre)

Existe um pacote comercial de 448 scripts prontos vendido em: https://www.mercadolivre.com.br/448-scripts-de-automacao-para-n8n--fluxos/up/MLBU3045475371

---

## 10. Comunidades e referências

### 10.1 Documentação oficial

- **n8n docs:** https://docs.n8n.io
- **n8n Community:** https://community.n8n.io
- **Amazon PA-API:** https://webservices.amazon.com/paapi5/documentation/
- **Mercado Livre Developers:** https://developers.mercadolivre.com.br
- **Shopee Affiliate:** https://www.affiliateshopee.com.br/documentacao
- **AliExpress Portals:** https://portals.aliexpress.com
- **Telegram Bot API:** https://core.telegram.org/bots/api
- **Evolution API:** https://doc.evolution-api.com

### 10.2 Comunidades BR

- **Grupo Facebook n8n Brasil:** https://www.facebook.com/groups/n8nbr
- **Canal YouTube @oaugustosgabriel** — workflows abertos
- **Hora de Codar:** https://horadecodar.com.br — tutoriais escritos em pt-BR

### 10.3 Blogs e guias

- [n8n Affiliate Automation: Complete 2026 Guide](https://www.usearticle.com/blog/n8n-affiliate-automation)
- [n8n for Affiliate Marketing: Ultimate Beginner Guide (AffMaven)](https://affmaven.com/n8n-affiliate-marketing/)
- [Tutorial automação vendas afiliados n8n SaaS completo (Hora de Codar)](https://horadecodar.com.br/tutorial-automacao-vendas-afiliados-n8n-saas/)
- [Automação n8n Mercado Livre, Magalu, Shopee, ERPs](https://horadecodar.com.br/automacao-n8n-integracao-mercado-livre-magalu-shopee-erps/)
- [Workflow de vendas WhatsApp n8n Evolution API: Guia 2025](https://horadecodar.com.br/workflow-vendas-whatsapp-n8n-evolution-api/)
- [Automação para Telegram: Guia Completo para Afiliados 2026 (FluxoPromo)](https://fluxopromo.com/automacao-telegram)
- [Bot para Afiliados: os 14 Melhores Bots de Ofertas Comparados (2026)](https://ofertasbot.com/blog/melhores-bots-de-ofertas-para-afiliados)
- [Como automatizar grupos de afiliados Amazon e Shopee no WhatsApp (Filipe Souza)](https://www.filipesouza.com.br/como-automatizar-grupos-de-afiliados-amazon-e-shopee-no-whatsapp-n8n-wppconnect/)
- [Amazon PA-API in 2026: Restrictions, Alternatives, Web Scraping](https://dev.to/agenthustler/amazon-product-api-pa-api-in-2026-restrictions-alternatives-and-web-scraping-4l35)

### 10.4 SaaS concorrentes (pra estudar UX/features)

- **AfiliTools** — https://trocalink.com.br (R$ 99/mês)
- **Afilira** — https://afilira.com/bot-telegram-afiliados
- **Pro Afiliados** — https://proafiliados.com
- **Shozap** — https://shozap.com.br
- **FluxoPromo** — https://fluxopromo.com
- **Divulga Links Pro** — https://pro.divulgalinks.com.br
- **Bot do Afiliado** — https://botdoafiliado.com

---

## 11. Roadmap de implementação

### Fase 0 — Setup (1-2 dias)
- [x] n8n rodando em Docker local (**JÁ FEITO 2026-08-11**)
- [x] n8n-mcp instalado no Claude Code (**JÁ FEITO 2026-08-11**)
- [ ] Criar conta owner do n8n em http://localhost:5678
- [ ] Gerar API key n8n → adicionar env vars no n8n-mcp

### Fase 1 — Cadastros nos programas (3-5 dias)
- [ ] Amazon Associados (aprovação leva 24-72h)
- [ ] Mercado Livre Afiliados
- [ ] Shopee Affiliate Open API (App ID + Secret)
- [ ] AliExpress Portals
- [ ] Magalu Ads / Awin
- [ ] Anotar todas credenciais em vault seguro

### Fase 2 — Primeiro workflow (protótipo) — 1 semana
- [ ] Criar bot Telegram @BotFather
- [ ] Criar canal Telegram teste
- [ ] Workflow: Cron 15min → busca Shopee (1 categoria) → filtra 30%+ → posta Telegram
- [ ] Rodar 3-7 dias observando

### Fase 3 — Expandir marketplaces — 2 semanas
- [ ] Adicionar Mercado Livre (mais fácil, API aberta)
- [ ] Adicionar Amazon (esperar aprovação PA-API)
- [ ] Adicionar AliExpress (usar node community)
- [ ] Deduplicação via Postgres

### Fase 4 — WhatsApp opcional — 1 semana
- [ ] Comprar chip dedicado
- [ ] Instalar Evolution API no VPS
- [ ] Aquecer conta 14 dias
- [ ] Criar grupo teste
- [ ] Duplicar fluxo Telegram → Whatsapp

### Fase 5 — Monetização — 2 semanas
- [ ] Integrar Mercado Pago (assinatura VIP)
- [ ] Fluxo pagamento → adiciona ao grupo VIP
- [ ] Grupo VIP recebe ofertas 30min antes do público
- [ ] Site simples de landing (Vercel/Netlify)

### Fase 6 — Escala e otimização — contínuo
- [ ] IA pra curadoria (GPT-4o-mini)
- [ ] Precificação histórica anti-fake-desconto
- [ ] Múltiplos canais por nicho
- [ ] A/B testing de mensagens
- [ ] Dashboard analytics
- [ ] Retargeting

---

## 12. Notas finais

- Este dossiê é vivo — atualizar conforme testar em produção
- Priorizar Telegram sobre WhatsApp no início (menos risco)
- Começar pequeno (1 marketplace, 1 canal, 1 nicho) e expandir
- Medir tudo desde o dia 1 (CTR, conversão, ROI)
- Comunidade BR n8n é ativa — não hesitar em perguntar

---

**Fonte:** compilação de 5 pesquisas web em 2026-08-11
**Contexto:** Wesley Pontual, projeto "montar em casa" (Kit-Casa-2026-08-11)
**Próxima ação sugerida:** assistir vídeo #4 (playlist Nível 2) enquanto n8n roda no PC de casa.
