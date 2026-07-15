# 15 — Plano de Roteirização (rota + ETA + pedágio)

[← Voltar para o índice](README.md)

> **DESENHO** (2026-05-28). Plano para roteirização automática: o operador informa origem→destino e o sistema devolve a rota segura para caminhão (perfil HGV + carga perigosa), o tempo estimado (ETA) e o pedágio estimado por eixo. Estimativa de planejamento; o valor real do pedágio vem do extrato Veloe.
>
> **Escopo de pedágio:** só **frota interna** (tags Veloe). Terceiros pagam pedágio por conta deles — ver [[14-levantamento-logistica]] e memória `project-pedagio-veloe`.

**Legenda:** ✅ pronto · 🚧 parcial · ❌ falta · ⛔ bloqueado externo

---

## 1. Objetivo e o que destrava

Hoje a OC tem origem/destino em texto livre, sem rota, sem ETA, sem custo. Com roteirização:

- **ETA** real por viagem (quando o caminhão deve chegar)
- **Desvio de rota** (comparar trajeto SASCAR real × rota planejada)
- **Custo planejado** de pedágio e km por viagem
- Base para **OCs atrasadas**, **tempo médio por rota** e precificação de frete (fase comercial)

## 2. Pré-requisitos (Fase 0 — sem isso a roteirização não nasce)

| Pré-requisito | Status | Por quê |
|---|---|---|
| Cadastro de **clientes/destinos** com lat/lng | ❌ | É o "para onde". Sem coordenada não há rota |
| Cadastro de **bases de carregamento** (PONTUAL/REPLAN) com lat/lng | 🚧 | É o "de onde" |
| **Configuração de eixos** por veículo/atrelamento (nº eixos, eixos suspensos) | ❌ | Pedágio de caminhão é cobrado **por eixo** |
| Geocoding (CNPJ/CEP → lat/lng) | ✅ | Já usamos Nominatim + ViaCEP nas Cercas — reaproveitar |

> O **cadastro de clientes/destinos** já é o gap #1 do [[14-levantamento-logistica]]. Roteirização é mais um motivo pra fazê-lo primeiro.

## 3. Arquitetura (3 peças)

```
            origem (base) ─┐
                           ├─→ [OpenRouteService]  → rota segura caminhão + ETA  (grátis)
            destino (cliente)┘          │
                                         ▼
                                   geometria da rota
                                         │
                                         ▼
                            [API de pedágio]  → praças + valor por eixo  (pago, barato)
                                         │
                                         ▼
                       OC.rotaPlanejada { km, min, praças[], pedágioEstimado }
                                         │
                       (depois)          ▼
            trajeto real SASCAR  ──→  desvio de rota   |   extrato Veloe → pedágio REAL
```

### Peça 1 — Rota + ETA: OpenRouteService (grátis)
- Perfil `driving-hgv` com restrições de **carga perigosa** (`hazmat`), altura, peso, comprimento, peso por eixo.
- **Hazmat sempre ligado** — 100% da carga da Pontual é combustível (perigosa). Não há toggle "é perigosa?"; é constante. Ver memória `project-carga-perigosa`.
- Retorna: geometria (polyline), `distance` (km), `duration` (ETA), instruções.
- Limite free: ~2.000 req/dia, 40/min — folgado pro nosso volume (poucas OCs/dia).
- Roda como Cloud Function (esconde a chave ORS, igual fazemos com SASCAR).

### Peça 2 — Pedágio: decisão entre 2 caminhos

| Caminho | Como | Custo | Precisão | Manutenção |
|---|---|---|---|---|
| **A — API de pedágio** ⭐ | TollGuru (Brasil, caminhão, por eixo) recebe a rota e devolve praças + valor | Pago, free tier cobre nosso volume | Alta — já calcula por eixo | Quase zero (eles atualizam tarifa) |
| **B — DIY grátis** | Base própria de praças (lat/lng + tarifa/eixo) cruzada com a geometria da rota | R$ 0 | Média | Alta — nós atualizamos tarifa quando muda |

> **Recomendação: Caminho A (TollGuru).** Tarifa de pedágio muda por reajuste/ANTT; manter tabela na mão (Caminho B) vira dívida. Alternativa em call único: **Google Routes API** (`computeRoutes` + `extraComputations: TOLLS`) faz rota+pedágio junto, mas o roteamento de caminhão/hazmat dele é mais fraco que o ORS.

### Peça 3 — Eixos (a pegadinha brasileira)
Pedágio = `tarifa_praça × nº_de_eixos`. Cavalo+carreta tem 5–7 eixos; **eixo suspenso vazio não conta**. O cálculo lê `numeroEixos` do conjunto atrelado. A API de pedágio recebe esse número e devolve o valor certo.

## 4. Estimado × Real (Veloe)
- O cálculo automático é **estimativa de planejamento** ("essa viagem ~R$ X de pedágio").
- O **valor real** vem do **extrato/fatura Veloe** (frota interna).
- Tela mostra os dois lado a lado, igual diesel planejado × real. Reconciliação é Fase 4.

## 5. Modelo de dados (Firestore)

**OC ganha bloco `rotaPlanejada`:**
```js
ordens_carregamento/{id}.rotaPlanejada = {
  origem:   { nome, lat, lng },
  destino:  { nome, lat, lng },
  distanciaKm: 412.7,
  duracaoMin:  340,            // ETA
  geometria:   "<polyline>",   // desenha no mapa
  numeroEixos: 6,
  pracas: [ { nome, rodovia, km, tarifaEixo, valor } ],
  pedagioEstimado: 248.50,
  calculadoEm: <timestamp>,
  provedor: "ORS+TollGuru"
}
```

**Cadastro de veículo/atrelamento ganha:**
```js
veiculos/{id}.numeroEixos        // do cavalo
atrelamentos/{id}.eixosTotais    // cavalo + carretas atreladas
```

**Só no Caminho B (DIY):** coleção `pracas_pedagio { lat, lng, nome, concessionaria, rodovia, tarifaPorEixo, vigenciaDe }`.

## 6. Fases de implementação

| Fase | Entrega | Depende de | Custo | Esforço |
|---|---|---|---|---|
| **0** | Cadastro clientes/destinos + bases com lat/lng + nº eixos na frota | — | R$ 0 | ~4h (parte do gap #1) |
| **1 — MVP** | Rota + ETA via ORS, desenha no mapa, salva km/min na OC. **Sem pedágio** | Fase 0 | R$ 0 | ~5h |
| **2** | Pedágio estimado (API), lista praças + valor por eixo na OC | Fase 1 + nº eixos | API (free tier) | ~4h |
| **3** | Custo planejado consolidado (pedágio + diesel estimado + km + HE) | Fase 2 + CTA Smart | — | ~3h |
| **4** | Desvio de rota (SASCAR real × planejado) + pedágio real Veloe | Fase 2 + extrato Veloe | — | ~6h |

> **Fase 1 já entrega valor sozinha** (ETA + rota no mapa, grátis). Pedágio é incremento na Fase 2.

## 7. Integrações externas

| Serviço | Uso | Custo | Bloqueia? |
|---|---|---|---|
| OpenRouteService | Rota + ETA caminhão/hazmat | Grátis (chave gratuita) | Não |
| TollGuru (ou Google Routes) | Pedágio por eixo | Free tier cobre; precisa cadastrar chave | Não, mas precisa criar conta |
| Veloe (extrato) | Pedágio REAL (Fase 4) | — | Depende de export/API Veloe — ⛔ a confirmar |
| CTA Smart | Diesel estimado (Fase 3) | — | ⛔ integração pendente |

## 8. Telas / UX
- Na **OC**: botão "Calcular rota" → escolhe base (origem) + cliente (destino) → mapa mostra traçado, card com **km / ETA / pedágio estimado / praças**.
- No **Rastreamento** (Fase 4): rota planejada como linha tracejada por baixo do trajeto real; destaca onde desviou.

## 9. Riscos / pontos de atenção
- **Coordenada do destino:** se o cliente não tiver lat/lng boa, a rota fica torta. Geocoding por CNPJ/CEP ajuda, mas alguns destinos (posto em estrada) podem precisar de pin manual no mapa.
- **Eixos variáveis:** o mesmo cavalo muda de carreta → nº de eixos muda por viagem. Ler do **atrelamento da OC**, não fixo no cavalo.
- **Hazmat no ORS:** restrição de carga perigosa pode alongar a rota (evita túnel/centro urbano) — é o comportamento correto, mas o operador precisa entender por que a rota não é a "mais curta".
- **Estimativa ≠ cobrado:** deixar claro na UI que pedágio é estimado até bater com Veloe.

## 10. Decisão pendente do Wesley
1. **Caminho A (API paga barata) ou B (grátis, manutenção na mão)** pro pedágio? → recomendo A.
2. Começar pela **Fase 0+1** (rota+ETA grátis) agora, ou esperar o cadastro de clientes entrar primeiro? (são a mesma base — dá pra fazer junto)

Relacionado: [[14-levantamento-logistica]], [[13-modulo-terceiros]], `project-pedagio-veloe`, [[09-rastreamento]]

---

## Relacionado

- Anterior: [[14-levantamento-logistica]]
- [[INDICE|🏠 Voltar ao índice]]
- [[CLAUDE|📖 Contexto do sistema]]
- [[MEMORY|🧠 Memórias]]
