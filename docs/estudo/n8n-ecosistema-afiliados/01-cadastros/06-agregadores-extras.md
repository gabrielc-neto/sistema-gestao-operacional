# 🎁 Agregadores EXTRAS — potencializa o ecossistema

Essas fontes **NÃO são obrigatórias**, mas cada uma que você adicionar aumenta volume de ofertas boas + valida preço + gera mais receita.

Ordem sugerida: adiciona **1 por semana** depois que o stack base já está rodando. Não tenta fazer tudo no 1º dia.

---

## 1. 💵 Méliuz — Cashback + Cupons + Afiliado bônus (PRIORIDADE MÁXIMA)

### Por que é diferente:
- Não é só cupom — dá **cashback em dinheiro** (você indica, referido usa, você ganha % do cashback dele **pra sempre**)
- API completa e grátis
- 3.000+ lojas parceiras (Amazon, ML, Shopee, Ali, Netshoes, tudo)

### Cadastro:
1. https://www.meliuz.com.br/
2. Cria conta comum
3. Vai em **"Convide amigos"** → pega seu link `meliuz.com.br/i/SEUCODIGO`
4. Cada indicado que ativa cashback → você ganha **R$ 5** + **20% do cashback dele por 1 ano**

### API pra integrar no n8n:
1. Acessa: https://developer.meliuz.com.br
2. Cria aplicação → recebe `client_id` + `client_secret`
3. Endpoint principal:
   ```
   GET https://api.meliuz.com.br/v2/stores
   GET https://api.meliuz.com.br/v2/coupons?store=amazon
   GET https://api.meliuz.com.br/v2/offers?category=electronics
   ```

### Anota:
```
MELIUZ_CLIENT_ID=
MELIUZ_CLIENT_SECRET=
MELIUZ_REFERRAL_CODE=SEUCODIGO
```

### Como ganhar dobrado no seu grupo:
Toda oferta que postar → 2 links:
- **Link 1 (afiliado direto)**: sua tag Amazon/ML/etc → comissão direta
- **Link 2 (Méliuz)**: "Ou clique aqui e ganhe cashback também" → você ganha % do cashback dele
- **Muitos usuários preferem cashback** = você fideliza + monetiza 2x

---

## 2. 📊 Zoom.com.br — Validador de preço REAL

Fundamental pra **não postar oferta falsa**. Zoom monitora preço de milhões de produtos há 10+ anos — tem histórico enorme.

### 2 formas de usar:

**A) Free (scraping)**
- Abre `https://www.zoom.com.br/BUSCA-DO-PRODUTO`
- Puppeteer pega gráfico histórico
- Determina "menor preço 30d" / "menor preço 90d"

**B) API paga (só se quiser garantia)**
- https://www.zoom.com.br/parceiros
- Plano "Starter" R$ 199/mês (500k requests) — só se seu grupo crescer muito

**Como usar como validador:**
1. Antes de postar qualquer oferta → busca produto no Zoom
2. Se preço atual >= menor preço 30d do Zoom → **NÃO POSTA** (é oferta fajuta)
3. Se preço atual < menor preço 30d → posta destacando "MENOR PREÇO EM MESES"

---

## 3. 📢 Ligadaoferta + outros canais Telegram (via RSSHub)

500k+ pessoas curando ofertas 24/7 na Ligadaoferta. Grátis pra você aproveitar.

### Truque: RSSHub converte canal Telegram público em RSS

RSSHub é open-source, tem instância pública grátis:
- `https://rsshub.app/telegram/channel/USERNAME`

Exemplos:
```
https://rsshub.app/telegram/channel/ligadaoferta
https://rsshub.app/telegram/channel/prime_ofertas_amazon
https://rsshub.app/telegram/channel/ali_br_ofertas
https://rsshub.app/telegram/channel/ofertaskabum
```

### Uso no n8n:
- Node HTTP Request GET → esses URLs
- Parse XML como fizemos no workflow 06
- IA filtra + regera link com sua tag → posta no seu canal

**Rate limit RSSHub público:** 60 req/hora por IP. Passar disso = subir instância própria (Docker `diygod/rsshub`, roda em 2min).

### Canais brasileiros TOP pra puxar:

| Canal | Membros | Nicho |
|---|---|---|
| @ligadaoferta | 500k+ | Geral |
| @ofertanaweb | 200k+ | Geral |
| @prime_ofertas_amazon | 150k+ | Amazon |
| @ali_br_ofertas | 100k+ | AliExpress |
| @ofertaskabum | 80k+ | Games/PC |
| @deuflashof | 60k+ | Flash sales |
| @ofertasrivotril | 40k+ | Meme + ofertas |

---

## 4. 🤖 Reddit — comunidades brasileiras de ofertas

Reddit tem API grátis, generosa, e comunidades bem ativas.

### Cadastro:
1. Cria conta Reddit
2. https://www.reddit.com/prefs/apps
3. **Create app** → **script**
4. Preenche:
   - Nome: `n8n-afiliados`
   - Redirect URI: `http://localhost:5678`
5. Copia `client_id` (embaixo do nome) + `secret`

### Anota:
```
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER=seuusuario
REDDIT_PASSWORD=suasenha
```

### Endpoints:
```
GET https://oauth.reddit.com/r/DealsBrazil/hot?limit=25
GET https://oauth.reddit.com/r/brasilofertas/new?limit=25
GET https://oauth.reddit.com/r/ofertasbrasil/hot?limit=25
```

**Rate limit:** 100 req/min (mais que suficiente)

---

## 5. 🐫 Keepa — histórico de preço Amazon global

Amazon histórico até 5 anos atrás. **A referência mundial**.

### Cadastro:
1. https://keepa.com/
2. Cria conta grátis
3. Extensão Chrome grátis pra usar navegando

### API:
1. https://keepa.com/#!api
2. Free tier: **100 tokens/dia** (cada busca = 1 token pra produto simples)
3. Plano pago: $15/mês (1M tokens) — só se escalar

**Uso no n8n:**
```
GET https://api.keepa.com/product?key=SEUKEY&domain=8&asin=B0XXXXXXXX
```
(domain=8 = Amazon Brasil)

Retorna gráfico completo de preço últimos 5 anos. **Valida se aquele "iPhone R$3999" é oferta real ou fajuta**.

### Anota:
```
KEEPA_API_KEY=
```

---

## 6. 🎨 Beruby — cashback alternativo

Menos popular que Méliuz mas paga direto no PIX.
- https://www.beruby.com/br
- Cadastro rápido
- Programa afiliado paga 10% por 6 meses

Adiciona só se quiser diversificar (recomendo focar no Méliuz primeiro).

---

## 7. 🔎 Google Shopping via Google Trends (grátis, sem API oficial)

**Truque avançado:** monitorar o que tá **em alta na busca** de compras Brasil.

Ferramenta: `pytrends` (Python)
- 100% grátis
- Sem chave API
- Roda no n8n via node "Execute Command"

**Uso:**
- Toda segunda, roda script → top 20 produtos mais buscados semana
- Cruza com sua base → se você tem oferta desse produto, **prioriza post**

---

## 📝 CHECKLIST DE ADIÇÃO PROGRESSIVA

**Semana 1:** só o stack base (workflows 01-07) — que já é o pacote atual
**Semana 2:** adiciona Méliuz (workflow 08) — potencializa receita
**Semana 3:** adiciona RSSHub Telegram (workflow 10) — 500k curadores humanos grátis
**Semana 4:** adiciona Reddit (workflow 09) + Zoom validator (workflow 11)
**Semana 5+:** experimenta Keepa + Beruby + Google Trends

Cada semana: 1 workflow novo, 1 dia testando, 6 dias rodando pra medir. **Não tenta fazer tudo junto** — vira caos e você não consegue medir o que está funcionando.

---

## Total das chaves extras a coletar

```env
# Méliuz
MELIUZ_CLIENT_ID=
MELIUZ_CLIENT_SECRET=
MELIUZ_REFERRAL_CODE=

# Reddit
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER=
REDDIT_PASSWORD=

# Keepa (opcional)
KEEPA_API_KEY=

# Zoom API (opcional)
ZOOM_API_KEY=

# Beruby (opcional)
BERUBY_REFERRAL=
```

Adicione no seu `.env` (existente) só as que forem usando.
