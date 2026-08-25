# 🛒 Amazon Associates + PA-API (grátis)

## Parte 1 — Cadastro Amazon Associates (30min)

1. Acessa: https://afiliados.amazon.com.br
2. Clica em **"Cadastre-se grátis"**
3. Preenche com dados do CPF (não precisa CNPJ)
4. Informa o canal (Telegram/site/blog)
   - Coloca URL do seu canal Telegram (pode criar depois: `t.me/seucanal`)
   - Aceita todos os termos
5. Descreve o site/canal ("Canal de ofertas de tecnologia e casa")
6. **Método de pagamento**: PIX (mais fácil), mín R$ 100 pra sacar
7. Aprovação: **automática** em ~15min

**Você ganha:**
- Sua **tag de afiliado**: `seunome-20` (será usada em todo link)
- Painel: https://afiliados.amazon.com.br/home
- Link SiteStripe: aparece em toda página Amazon logado

**Formato do link:**
```
https://www.amazon.com.br/dp/B0XXXXXXXX?tag=SEUNOME-20
```

Só precisa acrescentar `?tag=SEUNOME-20` no final de qualquer URL da Amazon.

---

## Parte 2 — Ativar PA-API (Product Advertising API) — GRÁTIS

**Requisito:** ter feito ≥3 vendas nos últimos 30 dias
**Se não tem venda ainda**, comece manual e ativa em 1-2 semanas depois.

### Passos (só faça depois de ter vendas):
1. Login em https://webservices.amazon.com.br/paapi5/
2. Acessa **"Manage Access Keys"**
3. Clica **"Create New Access Key"**
4. **GUARDA em local seguro:**
   - `Access Key ID` (ex: `AKIAIOSFODNN7EXAMPLE`)
   - `Secret Access Key` (ex: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
   - `Partner Tag`: `seunome-20`

### Endpoint Brasil:
```
webservices.amazon.com.br
Marketplace: www.amazon.com.br
```

### Limite grátis:
- **1 request/segundo** (base)
- **8.640 requests/dia**
- **+1 request/dia** por cada R$ 3 em vendas dos últimos 30 dias (se vender bem, aumenta)

---

## 📝 Anote suas credenciais aqui:

```
AMAZON_PARTNER_TAG=
AMAZON_ACCESS_KEY=
AMAZON_SECRET_KEY=
AMAZON_MARKETPLACE=www.amazon.com.br
```

**Salve nesse formato porque vamos colar direto no `.env` do Docker.**

---

## 🚨 Regras importantes Amazon (evita ban)

1. **Disclosure obrigatório** no canal: coloque na descrição do Telegram:
   > "Este canal contém links de afiliado Amazon. Como participante do Programa de Afiliados da Amazon, ganho comissão por compras qualificadas."
2. **Não redirecionar** ("Compre no meu link!" pode; "Clique aqui pra ganhar desconto" — cuidado se não tem desconto)
3. **Cookie**: 24h (usuário compra qualquer coisa em 24h depois de clicar, você ganha)
4. **Comissão média Brasil**: 3-8% dependendo da categoria

---

## 💡 Categorias que pagam mais

| Categoria | Comissão |
|---|---|
| Beleza | 8% |
| Alimentos | 8% |
| Livros | 8% |
| Roupas/moda | 8% |
| Casa | 6% |
| Cozinha | 6% |
| Eletrônicos | 3% |
| Games | 3% |
| Livros digitais/Kindle | 10% |

**Estratégia:** priorize eletrônicos (volume) + moda/casa (comissão) misturados.
