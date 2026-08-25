# 🔴 AliExpress Portals Affiliate + API (grátis)

## Cadastro AliExpress Portals

1. Acessa: https://portals.aliexpress.com
2. **"Register Now"**
3. Escolhe **"Alibaba.com Affiliate"** (mesma coisa)
4. Preenche com email principal
5. Adiciona canal principal (Telegram URL)
6. Aprovação: **automática em 1-5 min**

**Painel:** https://portals.aliexpress.com/affiportals/web/portals.htm

**Você ganha:**
- `PID` (tracking ID) — ex: `9d5f9d5f9d5f9d5f`
- Ferramenta de link generator

---

## Formato do link AliExpress:

```
https://s.click.aliexpress.com/e/XXXXXXX
```

Encurtador oficial gerado no painel. **Nunca funciona link "cru"** sem passar pelo shortener deles.

---

## API AliExpress Open Platform (grátis, sem espera)

### Passos:
1. Acessa: https://openservice.aliexpress.com
2. Login com mesma conta
3. **"Console"** → **"App Management"** → **"Create App"**
4. Escolhe **"Affiliate API"**
5. Preenche formulário técnico:
   - App Name: `n8n-ecosistema`
   - Category: **Affiliate**
   - Callback URL: `http://localhost:5678/rest/oauth2-credential/callback`
6. Aprovação: **instantânea**

**Você ganha:**
- `App Key`
- `App Secret`

### Endpoints úteis:

**Super Deals (ofertas relâmpago):**
```
aliexpress.affiliate.hotproduct.query
```

**Buscar produto:**
```
aliexpress.affiliate.product.query
```

**Gerar link com seu PID:**
```
aliexpress.affiliate.link.generate
```

### Rate limit:
- **5.000 requests/dia grátis**
- Se ultrapassar, next day reseta

---

## Anotar credenciais:

```
ALIEXPRESS_PID=
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_TRACKING_ID=
```

---

## Comissões AliExpress

| Categoria | Comissão |
|---|---|
| Eletrônicos gadgets | 3-6% |
| Casa gadgets | 5-10% |
| Ferramentas | 5-9% |
| Moda | 8-12% |
| Beleza | 8-12% |
| **Super Deals** | **até 15%** |
| **Choice** (produtos selecionados) | **10-20%** |

---

## 🔥 SEGREDO Ali — Cookie 3 dias, última tag ganha

Mesmo esquema do ML — se cliente clicar no seu link **e comprar em até 3 dias** (qualquer coisa), você ganha.

Volume é rei. E é 100% conforme regras.

---

## 🚨 Truque para maior conversão

1. **Frete grátis** vira o argumento — muitos brasileiros abandonam por causa do frete Ali
2. **"Choice"** produtos: entrega em 7-10 dias, mesma vibe da Amazon Prime
3. **Cupons AliExpress**: aparecem no painel, replique em posts
