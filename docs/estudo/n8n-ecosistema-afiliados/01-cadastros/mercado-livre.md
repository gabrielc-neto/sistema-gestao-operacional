# 🟡 Mercado Livre Afiliados + API (grátis)

## Parte 1 — Cadastro Programa de Afiliados

1. Login na sua conta ML (comum, precisa ter conta)
2. Acessa: https://www.mercadolivre.com.br/afiliados
3. Preenche formulário rápido
4. Aprovação: **automática imediata**

**Você ganha acesso ao painel:**
https://www.mercadolivre.com.br/afiliados/panel

**Formato do link ML:**
```
https://mercadolivre.com/sec/XXXXXX
```
São links encurtados gerados pelo próprio painel (não dá pra montar manualmente sem API).

---

## Parte 2 — API de Desenvolvedor (grátis, sem limite prático)

### Criar aplicação

1. Acessa: https://developers.mercadolivre.com.br
2. Login com sua conta
3. **"Suas aplicações"** → **"Criar aplicação"**
4. Preenche:
   - **Nome**: `n8n-afiliados-ecosistema`
   - **Descrição**: `Bot de agregação de ofertas`
   - **Redirect URI**: `http://localhost:5678/rest/oauth2-credential/callback` (n8n padrão)
   - **Escopos**: `read` (só leitura, mais que suficiente)
5. Clica **Criar**

**Você ganha:**
- `Client ID` (App ID) — ex: `1234567890123456`
- `Client Secret` — ex: `AbCdEfGhIjKlMnOpQrStUvWxYz123456`

### Anotar credenciais:

```
ML_CLIENT_ID=
ML_CLIENT_SECRET=
ML_AFFILIATE_ID=
```

Pra pegar `ML_AFFILIATE_ID`, entra no painel de afiliados → **Suas Ferramentas** → aparece seu identificador único.

---

## Endpoints úteis (grátis, sem OAuth pra leitura pública)

### Ofertas do dia:
```
GET https://api.mercadolibre.com/sites/MLB/highlights/{category_id}
```

### Buscar produto:
```
GET https://api.mercadolibre.com/sites/MLB/search?q=iphone&sort=price_asc
```

### Detalhes de um item + preço atual:
```
GET https://api.mercadolibre.com/items/MLB1234567890
```

### Cupons ativos:
```
GET https://api.mercadolibre.com/coupons/api/v1/coupons/search
```

**Rate limit:** 
- Sem token: 10 req/min por IP
- Com token OAuth: 1.000 req/hora
- **Nunca reclama enquanto for razoável**

---

## Categorias que MAIS convertem no Brasil (ML)

| Cat | ID | Comissão |
|---|---|---|
| Eletrônicos | MLB1051 | 6-12% |
| Casa | MLB1574 | 6-10% |
| Moda | MLB1430 | 8-12% |
| Beleza | MLB1246 | 8-12% |
| Esportes | MLB1276 | 6-10% |
| Ferramentas | MLB1499 | 6-10% |

---

## 🔥 SEGREDO ML — Cookie Window de 60 dias

**O ML aceita última tag clicada** — se você postar seu link e o usuário comprar em **até 60 dias** (mesmo que compre outra coisa), você ganha comissão.

Isso significa: **quanto mais posts, mais chance**. Volume aqui **é rei**.

E é 100% conforme os termos deles — programa criado exatamente pra funcionar assim.
