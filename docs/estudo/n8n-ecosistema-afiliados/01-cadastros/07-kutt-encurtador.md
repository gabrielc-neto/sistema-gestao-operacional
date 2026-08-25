# 🔗 Kutt — Encurtador próprio (fecha o feedback loop)

Kutt é open-source, self-hosted, roda no mesmo Docker do stack. **Não precisa cadastro externo.**

## Por que Kutt (e não bit.ly / TinyURL)?

| Fator | Kutt | bit.ly grátis |
|---|---|---|
| Custo | R$ 0 | Grátis limitado (10 links/mês) |
| Estatística de cliques | ✅ Detalhada | ✅ Básica |
| API pra ler stats | ✅ Livre | Paga ($9/mês pro API) |
| Roda no seu server | ✅ | ❌ |
| Vira `wesley.link/abc123` (com seu domínio) | ✅ | ❌ (só bit.ly/xxx) |

## Já vem no docker-compose.yml

Sobe automaticamente com `docker compose up -d`. Roda em `http://localhost:3010`.

## Setup em 3 passos (1º acesso)

### 1) Abre no navegador
```
http://localhost:3010
```

### 2) Cria conta admin
Só o email registrado em `KUTT_ADMIN_EMAIL` do `.env` consegue criar conta (registro público está desabilitado).

- Email: mesmo do `.env`
- Senha: qualquer forte

### 3) Gera API Key
1. Login → **Settings** → **API**
2. Copia a chave

### 4) Adiciona no `.env`:
```
KUTT_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxx
```

E reinicia n8n:
```bash
docker compose restart n8n n8n-worker
```

Pronto. Todo link postado pelos workflows 07 e 13 agora passa pelo Kutt e conta cliques automaticamente.

---

## Como usa domínio próprio depois (opcional)

Quando levar pra Oracle Cloud (ver `04-scripts/deploy-oracle-cloud.md`):

1. Registra domínio grátis em https://www.duckdns.org (ex: `wesleyof.duckdns.org`)
2. Aponta pro IP da VM
3. No `.env` atualiza:
```
KUTT_DOMAIN=wesleyof.duckdns.org
```
4. Reinicia Kutt

Todo link novo já sai como `https://wesleyof.duckdns.org/abc123` — muito mais confiança pra usuário clicar.

---

## Dashboards úteis

**Kutt:** `http://localhost:3010/settings` — lista tudo que você encurtou + cliques em tempo real

**Postgres (Metabase — instala depois):** dashboards por categoria, CTR, boost aplicado

---

## Fluxo do feedback loop (o que Kutt possibilita)

```
Workflow 07 posta:
   Amazon iPhone R$3999 → http://localhost:3010/aB3xY2
                          ↓
                   Kutt conta cada clique
                          ↓
Workflow 15 (roda 30min):
   Lê cliques últimos 7 dias por post
   Calcula CTR médio por categoria
   Atualiza tabela performance_categoria
                          ↓
Workflow 12 (score engine):
   Consulta boost por categoria
   Ajusta score de PRÓXIMAS ofertas
   Categoria com CTR 2x acima da média → +20 pts
   Categoria com CTR abaixo da média → -10 pts
```

## O que esperar de curva

| Fase | Duração | Comportamento |
|---|---|---|
| **Frio** | 0-7 dias | Sem dados. Boost = 0 em todas categorias. Sistema decide só por desconto+trending+fonte. |
| **Coletando** | 7-14 dias | Boost começa a aparecer (precisa 5+ posts por categoria). Ainda ruidoso. |
| **Aprendendo** | 14-30 dias | Categorias que convertem começam a se destacar. CTR do canal sobe 1.5-2x. |
| **Maduro** | 30+ dias | Sistema conhece seu público. CTR estabiliza em 2-4x acima da linha base. |

---

## Não esquece de adicionar a chave também no `.env`:

```env
# Kutt encurtador (feedback loop)
KUTT_ADMIN_EMAIL=seu-email@dominio.com
KUTT_JWT_SECRET=string-aleatoria-32-caracteres-ou-mais
KUTT_API_KEY=aparece-depois-que-vc-criar-conta-no-kutt
KUTT_DOMAIN=localhost:3010
```
