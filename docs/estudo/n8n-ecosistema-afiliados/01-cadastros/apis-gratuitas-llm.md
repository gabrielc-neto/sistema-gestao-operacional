# 🤖 APIs Gratuitas de IA (Gemini + Groq + Telegram Bot)

Isso aqui é o **cérebro** e o **megafone** do sistema. Tudo grátis.

---

## 1. Google Gemini API (o mais importante — cérebro principal)

### Cadastro (2 min):
1. Acessa: https://aistudio.google.com/apikey
2. Login com Google
3. Clica **"Create API Key"** → **"Create in new project"**
4. **Copia a chave** (formato: `AIzaSy...`)

**Você ganha:**
- Gemini 2.0 Flash: **1.500 requests/dia grátis**
- Gemini 2.0 Flash Thinking: **1.500 requests/dia grátis**
- Sem cartão de crédito
- Sem prazo pra expirar

### Anota:
```
GEMINI_API_KEY=
```

### Endpoint:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=SUACHAVE
```

**Body:**
```json
{
  "contents": [{
    "parts": [{
      "text": "Analise essa oferta e diga se é boa: iPhone 15 128GB por R$ 4.200 (preço médio 30d: R$ 4.500)"
    }]
  }]
}
```

**Uso no ecossistema:**
- Classifica se oferta é boa (desconto real vs falso)
- Reescreve título/descrição pra não plagiar
- Gera 3 variações de post
- Prevê se produto viraliza (baseado em keywords)

---

## 2. Groq API (backup ultra-rápido e generoso)

### Cadastro (1 min):
1. Acessa: https://console.groq.com
2. Login com Google/GitHub
3. **"API Keys"** → **"Create API Key"**
4. Copia (formato: `gsk_...`)

**Você ganha:**
- Llama 3.3 70B: **6.000 requests/min grátis**
- Llama 3.1 8B: **30.000 requests/min grátis**
- **20-30x mais rápido que OpenAI** (roda em chip especializado LPU)

### Anota:
```
GROQ_API_KEY=
```

**Uso no ecossistema:**
- Quando Gemini estourar limite diário → Groq assume
- Traduções rápidas (Ali chinês → PT)
- Análise em massa (1000 produtos em 5min)

---

## 3. Telegram Bot Token (o megafone principal)

### Criar Bot:
1. Abre Telegram → busca **@BotFather**
2. Manda `/newbot`
3. Escolhe nome: "Ofertas Wesley Bot" (pode qualquer)
4. Escolhe username: `wesley_ofertas_bot` (precisa terminar em `bot`)
5. BotFather te dá o **Token** (formato: `1234567890:AAHxxxxxxxxxxxx...`)

**Guarda seguro** — quem tem esse token controla o bot.

### Criar Canal do Telegram (grátis, público, ilimitado):
1. Telegram → menu → **Novo Canal**
2. Nome: "Ofertas do Wesley 🔥"
3. Descrição: "Melhores ofertas Amazon, ML, Shopee, Ali. Contém links de afiliado."
4. Tipo: **Público** (senão ninguém acha)
5. Link: `t.me/ofertaswesley` (escolhe seu)

### Adicionar Bot como Admin do Canal:
1. No canal → **Gerenciar canal** → **Administradores**
2. **Adicionar** → busca `@wesley_ofertas_bot` (o bot que criou)
3. Marca permissões: **Publicar mensagens** + **Editar mensagens** + **Excluir mensagens**

### Anota:
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=@ofertaswesley
```

---

## 4. Extras opcionais (grátis, mas não obrigatórios)

### 4a. Hugging Face (backup de IA)
- https://huggingface.co/settings/tokens
- 1.000 req/dia grátis em modelos hospedados

### 4b. Firecrawl (web scraper com IA)
- https://firecrawl.dev
- 500 páginas/mês grátis
- Bom pra scrapear páginas que Puppeteer trava

### 4c. OpenRouter (proxy para vários LLMs)
- https://openrouter.ai
- Alguns modelos grátis (Llama, Mistral)

### 4d. Cuponomia API
- https://cuponomia.com.br/desenvolvedores
- Free tier: 100 req/dia
- Pega cupons de 3000+ lojas

### 4e. Resend (email marketing)
- https://resend.com
- 3.000 emails/mês grátis
- Bom pra newsletter da lista de contatos que você vai coletar

---

## 📝 CHECKLIST FINAL DAS CHAVES

Copia isso pra um bloco de notas e preenche antes de subir Docker:

```env
# === PROGRAMAS DE AFILIADO ===
AMAZON_PARTNER_TAG=
AMAZON_ACCESS_KEY=
AMAZON_SECRET_KEY=

ML_CLIENT_ID=
ML_CLIENT_SECRET=
ML_AFFILIATE_ID=

SHOPEE_AFFILIATE_ID=
SHOPEE_APP_ID=
SHOPEE_APP_SECRET=

ALIEXPRESS_PID=
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=

# === IA ===
GEMINI_API_KEY=
GROQ_API_KEY=

# === TELEGRAM ===
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=@ofertaswesley

# === EXTRAS OPCIONAIS ===
HUGGINGFACE_TOKEN=
FIRECRAWL_API_KEY=
CUPONOMIA_API_KEY=
RESEND_API_KEY=
```

**Não perde essas chaves — guarda em 3 lugares** (bloco notas + arquivo `.env` + gerenciador senhas).
