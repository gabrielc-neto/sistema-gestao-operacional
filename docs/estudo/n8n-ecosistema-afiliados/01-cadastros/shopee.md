# 🟠 Shopee Afiliados + API (grátis)

## Parte 1 — Cadastro Shopee Affiliate Program

1. Acessa: https://affiliate.shopee.com.br
2. Clica **"Junte-se"**
3. Login com conta Shopee (crie se não tem)
4. Escolhe tipo: **Content Creator** (Telegram/site)
5. Preenche:
   - Canal principal: seu Telegram/YouTube/Instagram
   - Nicho: escolhe categoria principal
6. Aprovação: **manual em 1-3 dias úteis**

**Você ganha:**
- **Painel:** https://affiliate.shopee.com.br/portal
- Ferramenta de geração de link no painel
- Chance de pedir API depois de 1º saque

---

## Parte 2 — Formato do link Shopee

```
https://s.shopee.com.br/AXXXXXX
```

Também é encurtador, gerado no painel.

**Você pode adicionar `sub_id` pra rastrear origem:**
```
https://s.shopee.com.br/AXXXXXX?sub_id=telegram-oferta-1
```

---

## Parte 3 — API Open Platform (Shopee Affiliate API)

**Requisito:** ter comissão acumulada ≥ R$ 100 no programa

### Passos (depois de habilitado):
1. Painel → **API Access** → **Apply for API**
2. Preenche formulário técnico
3. Aprovação: 5-10 dias úteis

**Você ganha:**
- `APP_ID` 
- `APP_SECRET`
- Endpoint GraphQL: `https://open-api.affiliate.shopee.com.br/graphql`

### Query GraphQL exemplo:
```graphql
query {
  productOfferV2(
    keyword: "smartphone"
    sortType: 3  # 3 = highest commission
    limit: 20
  ) {
    nodes {
      itemId
      productName
      priceMin
      priceDiscount
      commissionRate
      offerLink
    }
  }
}
```

---

## Alternativa: **Scraping direto (grátis, sem API)**

Enquanto API não sai, dá pra scrapear página de "Ofertas Relâmpago":

```
https://shopee.com.br/flash_sale
```

**Node n8n a usar:** HTTP Request + Puppeteer (headless browser). Vai nos workflows do pacote.

---

## Anotar credenciais:

```
SHOPEE_AFFILIATE_ID=
SHOPEE_APP_ID=
SHOPEE_APP_SECRET=
SHOPEE_SUB_ID_TELEGRAM=telegram
SHOPEE_SUB_ID_WHATSAPP=whatsapp
SHOPEE_SUB_ID_INSTAGRAM=instagram
```

**Dica:** cria 3-4 sub_ids diferentes (um por canal). Se um sub_id levantar suspeita antifraude, os outros continuam ativos.

---

## Comissões Shopee (bem generosas)

| Categoria | Comissão média |
|---|---|
| Eletrônicos | 5-8% |
| Moda | 10-15% |
| Casa | 8-12% |
| Beleza | 12-18% |
| Pets | 10-15% |
| Livros | 5-8% |
| **Ofertas Relâmpago** | **até 20%** |

**Estratégia:** foca em Ofertas Relâmpago + Beleza + Moda (maior comissão + alta conversão).

---

## 🚨 Regras Shopee (evita ban)

1. **Não pode fazer cashback disfarçado** ("compre pelo meu link e te devolvo 5%")
2. **Não pode fingir cupom exclusivo** que é público
3. **Rate limit**: máx 30 links/dia por sub_id (senão sub_id fica com flag)
4. **Rotação de sub_id** protege — se um cair, outros funcionam
