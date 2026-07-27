# 14 — Levantamento TMS · Logística operacional

[← Voltar para o índice](README.md)

> Inventário do que a área de **logística** precisa ter no sistema, comparado ao estado atual. Gerado em 2026-05-23 a pedido do Wesley.
>
> **Fora do escopo deste levantamento (confirmado):** CT-e, MDF-e, RBAC interno, financeiro/comercial puro.
> CT-e/MDF-e cobertos via Focus NFe quando necessário ([doc-mestre](../../../Desktop/TMS-estrutura-e-ferramentas.md) — Pontual emite só MDF-e da frota própria).

**Legenda de status:** ✅ pronto · 🚧 parcial · ❌ falta · ⛔ bloqueado externo · 🔮 só faz sentido na fase SaaS

---

## 1. Cadastros base

| Item | Status | Onde está / o que falta |
|---|---|---|
| Frota (cavalos) | ✅ | `/frota` — 38 cavalos |
| Carretas / dolly / tanques | 🚧 | Placas em c1/c2 do cavalo; falta cadastro próprio com chassi, lacre, dolly, INMETRO do tanque |
| Motoristas | ✅ | `/motoristas` — 67, CNH/MOPP/NR-20/NR-35 |
| **Clientes (destinos)** | ❌ | OC só tem campo texto livre. Falta cadastro com CNPJ, endereço, contato, janela de entrega, contrato |
| **Produtos (combustíveis)** | ❌ | OC tem "produto" texto livre. Falta cadastro: gasolina/diesel/etanol, classe ONU, densidade |
| Pontos de descarga (postos) | ❌ | Cadastro com lat/lng (alimentaria cerca automática + ETA) |
| Bases de carregamento | 🚧 | PONTUAL/REPLAN/OUTROS fixo. Falta cadastro com lat/lng |
| Rotas-padrão (origem→destino) | ❌ | Útil pra precificação, ETA, desvio |
| Transportadoras terceiras | ❌ | Desenho em [doc 13](13-modulo-terceiros.md). STANYTCHYL + LODI confirmados |

## 2. Planejamento pré-viagem

| Item | Status |
|---|---|
| Emissão de OC | ✅ |
| Atrelamento cavalo+carretas | ✅ |
| Bloquear OC se motorista de férias | ✅ |
| Bloquear OC se motorista com doc vencido (CNH/MOPP/NR/Tox) | 🚧 dado existe, `/oc` não checa |
| Bloquear OC se veículo com manutenção vencida (CIPP/CIV/CRLV/RNTRC) | ❌ |
| Roteirização (OpenRouteService grátis, perfil caminhão+hazmat) | ❌ |
| Janela de entrega do cliente | ❌ |
| Compatibilidade produto×compartimento | ❌ |
| Romaneio por compartimento (4-7 tanques + lacre) | ❌ |

## 3. Documentação operacional (sem CT-e/MDF-e)

| Item | Status |
|---|---|
| PDF da OC | ✅ html2pdf |
| **Ficha de Emergência (NBR 7503)** | ❌ obrigação legal carga perigosa |
| **Envelope para Transporte (NBR 7503)** | ❌ obrigação legal |
| Romaneio de carga por compartimento | 🚧 |
| Comprovante de entrega digital (canhoto) | ❌ foto + assinatura no app motorista |

## 4. Execução & rastreamento

| Item | Status |
|---|---|
| Posição em tempo real (38 caminhões, polling 30s) | ✅ |
| Trajeto histórico 24h (linha colorida no mapa) | ❌ no roadmap |
| Cercas eletrônicas (editor próprio) | ✅ |
| Cercas via SASCAR | ⛔ bloqueada (suporte pendente) |
| Alerta automático entrou/saiu cerca | 🚧 hook existe, alerta tempo real falta |
| Desvio de rota planejada | ❌ depende de rota planejada |
| Tempo parado/ocioso | ❌ calculável com dado SASCAR atual |
| OC ativa no popup do caminhão | ✅ |
| Bloqueio remoto pela UI | ⏸ API XML-RPC separada, sem doc |

## 5. Jornada & compliance motorista

| Item | Status |
|---|---|
| Jornada via tablet SasMDT | ✅ `/jornada` |
| Cálculo HE 50%/100% (regras Pontual) | ✅ |
| Direção contínua 4h | ✅ |
| Pausa 30min mínima | ✅ |
| PX (PJ) × Interno (CLT) | ✅ toggle na `/jornada` |
| Não iniciou jornada (folga vs falha) | ✅ card + lista + marca de desligado |
| Trajeto GPS por evento (Google Maps por ponto) | ✅ |
| Multi-jornada (ciclos manhã+tarde) | ✅ |
| Snapshot histórico mensal | ❌ bloqueado por Blaze (cron) |
| Cruzar com VDO (tacógrafo) | ⛔ bloqueado por API VDO |
| Exame toxicológico Lei 13.103 (bloqueia OC) | 🚧 cadastrado, não bloqueia |
| Multas/infrações de trânsito | ❌ |
| Score motorista (velocidade/infração/HE) | ❌ no roadmap |

## 6. Frota & manutenção

| Item | Status |
|---|---|
| 27 tipos documentais (CIV/CIPP/CRLV/RNTRC/Seguro/etc) | ✅ |
| Ordens de Serviço (OS mecânica) | ✅ |
| Pneus (vida útil, rodízio, sucateamento individual) | ❌ |
| Manutenção preventiva por km | ❌ depende do hodômetro SASCAR |
| Histórico de quebras/sinistros | ❌ |
| Checklist pré-viagem (motorista) | ❌ |
| Combustível por veículo (CTA Smart) | ❌ integração pendente |
| Consumo km/l | ❌ combustível + hodômetro |
| Anomalia de combustível (roubo/desvio) | ❌ |

## 7. Custos logísticos

| Item | Status |
|---|---|
| Diesel real (CTA Smart) | ❌ |
| Pedágio real (Veloe — frota interna) | ❌ |
| Custo por viagem (diesel + pedágio + km + HE) | ❌ depende dos 2 acima |
| Margem por OC | ❌ fase 5/comercial |

## 8. Pós-viagem

| Item | Status |
|---|---|
| Encerramento formal da OC | 🚧 sem fluxo de "fechar" |
| Ocorrências (atraso, sinistro, devolução, avaria) | ❌ |
| Comprovante entregue (assinado, foto) | ❌ |
| Conferência (litros entregues × esperado) | ❌ |
| Anomalia de viagem (parada longa, desvio de rota) | ❌ |

## 9. Indicadores logísticos

| Item | Status |
|---|---|
| KPIs dashboard (Frota Ativa, OCs Hoje, Bloqueados, Manutenções) | ✅ |
| OCs atrasadas | ❌ depende de ETA/janela |
| Tempo médio de viagem por rota | ❌ |
| Aproveitamento da frota (% caminhão rodando) | ❌ |
| Ranking motoristas (HE, infrações, score) | ❌ |
| Mapa de calor de entregas | ❌ |

## 10. Comunicação operacional

| Item | Status |
|---|---|
| WhatsApp motorista | ❌ Z-API, Blaze |
| Alerta SLA estourando | ❌ |
| Aviso cliente de chegada (ETA + WhatsApp) | ❌ |
| Push notification (motorista PWA) | ❌ FCM |
| App PWA motorista (foto canhoto, checklist, offline) | ❌ |

---

## Resumo executivo

### Já funciona 100% (núcleo logístico)
Cadastro frota+motoristas+cercas · OC com entregas múltiplas + PDF · Atrelamento com bloqueio férias · Manutenção 27 tipos + OS · Rastreamento ao vivo · Jornada completa com HE/PX×CLT/trajeto GPS

### Top 5 gaps — maior impacto × menor esforço
1. **Cadastro de clientes/destinos** — destrava ETA, janela, ranking, alertas
2. **Ficha de Emergência + Envelope NBR 7503** — obrigação legal (carga perigosa)
3. **CTA Smart + hodômetro SASCAR** — destrava custo/viagem, km/l, manutenção por km
4. **Ocorrências + canhoto digital** — fecha o ciclo da viagem
5. **Roteirização ORS (grátis)** — destrava desvio, ETA, custo planejado

### Top 5 bloqueadores externos
1. Suporte VDO liberar API (texto pronto, pendente Wesley enviar)
2. SASCAR liberar `obterPontosReferencia` (cercas oficiais)
3. SASCAR confirmar hodômetro/nível combustível na API
4. Wesley aprovar cartão Blaze (cron, snapshot diário, WhatsApp)
5. CTA Smart liberar API ou export CSV

---

## Apêndice — Cadastro de cliente × homologação SEFAZ

Pergunta recorrente: "pra cadastrar cliente no sistema, precisa estar homologado pela SEFAZ?". **Não.**

| O quê | Precisa SEFAZ? |
|---|---|
| Guardar cadastro de cliente (CNPJ, endereço, contato) | ❌ não |
| Validar se o CNPJ existe / tá ativo | ❌ não — consulta direto na Receita via BrasilAPI/ReceitaWS, grátis |
| Emitir OC interna pra esse cliente | ❌ não — OC é documento interno, não fiscal |
| Emitir MDF-e com esse cliente | ✅ sim, mas o Focus NFe já cuida da homologação |

**Por quê:**
- Homologação SEFAZ vale pra **emitir documento fiscal** (NF-e, CT-e, MDF-e). É o processo de ambiente de testes virar produção dentro da SEFAZ.
- **Cadastro de cliente é interno** — você pode cadastrar quantos quiser. É sua base de dados.
- Pra **não cadastrar lixo**, o sistema chama a **BrasilAPI** quando você digita o CNPJ → ela consulta a base pública da Receita Federal e devolve nome, situação cadastral, endereço, CNAE. Preenche automático e bloqueia se for CNPJ inexistente/baixado. Zero SEFAZ.

**Quando a SEFAZ entra (cenário Pontual):**
- Pontual hoje emite **MDF-e** via **Focus NFe** — Focus já é homologado, você só chama o REST.
- Pontual **NÃO emite CT-e** (não cobra frete — é frota própria entregando combustível próprio). O cliente final nem aparece em CT-e da Pontual; aparece no CT-e da REPLAN ou da terceira (STANYTCHYL/LODI).

**Fluxo prático pro cadastro:** input do CNPJ → BrasilAPI valida e preenche → grava no Firestore/Postgres → OC passa a usar dropdown de cliente. Quando emitir MDF-e que envolva esse cliente, Focus NFe consome o mesmo cadastro.

---

## Relacionado

- Anterior: [[13-modulo-terceiros]]
- Próximo: [[15-roteirizacao]]
- [[INDICE|🏠 Voltar ao índice]]
- [[CLAUDE|📖 Contexto do sistema]]
- [[MEMORY|🧠 Memórias]]
