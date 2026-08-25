# 📱 Templates de Post — Telegram (que convertem)

Prompt pro Gemini já embutido no workflow 07, mas se quiser fine-tune, use estes moldes.

---

## Template 1 — Oferta Relâmpago (curto, urgência)

```
🔥 {{ produto }}

De R$ {{ preco_original }} por R$ {{ preco_atual }}
Economia de {{ desconto_pct }}% ({{ desconto_reais }})

⏳ Válido por tempo limitado

🛒 {{ link_afiliado }}

#ofertarelampago #{{ categoria }}
```

## Template 2 — Menor Preço Histórico (foca preço-alvo)

```
📉 MENOR PREÇO DOS ÚLTIMOS 30 DIAS

{{ produto }}

💰 R$ {{ preco_atual }} (média era R$ {{ media_30d }})
🎯 {{ desconto_real_pct }}% abaixo do normal

🔗 {{ link_afiliado }}

*Contém link afiliado
```

## Template 3 — Cupom Verificado (agrega valor)

```
🎟️ CUPOM {{ codigo }}

{{ produto }}
Aplicado: R$ {{ preco_final }}
Sem cupom: R$ {{ preco_original }}

Como usar:
1. Clica no link
2. Adiciona no carrinho
3. Cola cupom {{ codigo }} no checkout

🛒 {{ link_afiliado }}

Cupom válido até {{ valido_ate }}
```

## Template 4 — Comparativo (educativo, gera trust)

```
🆚 QUAL VALE MAIS A PENA?

{{ produto_A }}
👉 R$ {{ preco_A }} · {{ pontos_positivos_A }}
🔗 {{ link_A }}

{{ produto_B }}
👉 R$ {{ preco_B }} · {{ pontos_positivos_B }}
🔗 {{ link_B }}

Minha recomendação: {{ escolha }}
Motivo: {{ razao_curta }}
```

## Template 5 — Tesouro Escondido (produtos menos conhecidos)

```
💎 ACHADO DO DIA

Você provavelmente não conhece esse:
{{ produto }}

Por que vale:
✓ {{ beneficio_1 }}
✓ {{ beneficio_2 }}
✓ {{ beneficio_3 }}

Preço: R$ {{ preco }}
Avaliação: {{ estrelas }} ({{ num_reviews }} avaliações)

🛒 {{ link_afiliado }}
```

---

## Regras que TODO post deve seguir

1. **Emoji no início** (chama atenção no scroll)
2. **Preço em destaque** — linha própria com "R$"
3. **Link no fim** (não no meio — evita ser cortado no preview)
4. **Sem múltiplos links** por post (Telegram só faz preview do primeiro)
5. **Máximo 6 linhas** (post ideal cabe em 1 tela mobile)
6. **Disclosure discreto** — "*Contém link afiliado" ou "*link afil"

---

## Horários que MAIS convertem (Brasil)

| Faixa | Por quê |
|---|---|
| **09h-10h** | Café da manhã, gente vendo cel |
| **12h-13h** | Almoço |
| **18h-19h** | Volta do trabalho |
| **21h-22h** | Após novela, antes de dormir (**pico!**) |
| **11h Sábado** | Sábado de manhã tranquilo |

**Evitar:** madrugada (2-6h) e horário comercial rígido (14-16h).

Configure o workflow 07 pra rodar **só nesses horários** — economiza requisições Gemini e concentra em quando converte.

---

## Estrutura ideal do canal Telegram

Além do canal principal, cria **sub-canais/grupos**:

- `@ofertaswesley` — canal principal (tudo)
- `@ofertaswesley_tec` — só tecnologia
- `@ofertaswesley_casa` — só casa/cozinha
- `@ofertaswesley_moda` — só moda/beleza
- `@ofertaswesley_ali` — só AliExpress (frete grátis)

Assim usuário assina só o nicho que interessa → **muito menos unsubscribe**.

---

## Métricas que você deve trackear (SQL prontos)

```sql
-- Taxa de post por dia
SELECT DATE(postado_em), COUNT(*) FROM ofertas_validadas_ia WHERE postado GROUP BY 1 ORDER BY 1 DESC LIMIT 30;

-- Melhores categorias (por volume postado)
SELECT categoria, COUNT(*) FROM ofertas_validadas_ia WHERE postado GROUP BY categoria ORDER BY 2 DESC;

-- Menor preço histórico registrado
SELECT titulo, MIN(preco) as min_preco FROM ofertas_coletadas GROUP BY titulo ORDER BY 2 DESC LIMIT 20;
```

Cria dashboard rápido em **Metabase** (grátis, sobe em Docker) apontando pra mesmo Postgres.
