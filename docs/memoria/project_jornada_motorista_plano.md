---
name: project-jornada-motorista-plano
description: "Plano pra construir página /jornada na Pontual replicando o relatório \"Jornada & Extras\" do portal SASCAR (rotas.seg.br/torre1/frames/jornada.html). Usa Lei 13.103/2015 + CLT art. 58/59/71."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5ecc1bc2-6fdb-465e-bcfc-312ac32cd458
---

# Página /jornada — Plano em estudo

Status: **Fase A + Fase B ENTREGUES (2026-05-19).** Falta D (alerta tempo real). C (dashboard infrações da frota) parcialmente embutido nos KPIs/PDF da B.

## Arquivos criados/alterados
- `functions/src/sascar/soap.js` — método `obterEventosTempoDirecao`
- `functions/src/sascar/jornada.js` — `calcularJornadas`, `diasNoPeriodo`, `agregarJornadasPorMotorista`, `rangeUtcParaDiaLocal`
- `functions/index.js` — endpoints `jornadaDia(data)` e `jornadaPeriodo(dataInicio, dataFim)`
- `frontend/src/hooks/useJornada.js` — hook unificado (chama jornadaDia se 1 dia, jornadaPeriodo se múltiplos)
- `frontend/src/pages/Jornada.jsx` — página completa com presets, busca, KPIs clicáveis, export
- `frontend/src/utils/exportJornadaCsv.js` — CSV BOM-UTF8/separador `;` (abre direto Excel-PT)
- `frontend/src/utils/exportJornadaPdf.js` — PDF A4 landscape com html2pdf.js (já no projeto)
- `frontend/src/App.jsx` — rota `/jornada`
- `frontend/src/pages/Dashboard.jsx` — card azul "Jornada & Extras" + ícone Clock
- `scripts/test-jornada.mjs` — teste isolado 1 dia
- `scripts/test-jornada-periodo.mjs` — teste agregação multi-dia

## Regras de jornada PONTUAL (confirmadas Wesley 2026-05-19)
**ESTAS regras sobrescrevem CLT/Lei 13.103 padrão — são acordo da empresa, mais restritivo.**

| Dia | Jornada normal | Acima |
|---|---|---|
| **Segunda a sexta** | 9h30 (8h trabalho + 1h almoço + 30min pausa) | **TUDO acima = extra 50%** (nunca 100% na semana). Acima de 11h30 = INFRAÇÃO, mas pago 50% |
| **Sábado** | 4h | tudo acima = extra 50% |
| **Domingo** | 0 | **TODO** o tempo trabalhado = extra 100% |
| **Direção contínua (qualquer dia)** | máx 4h sem pausa | > 4h = **INFRAÇÃO** (regra Pontual; Lei 13.103 art. 67-C permite 5h30) |
| **Refeição mínima** | 1h | < 1h = INFRAÇÃO (CLT art. 71) |

⚠ **100% É EXCLUSIVO DE DOMINGO** (confirmado Wesley 2026-05-20). Na semana, mesmo passando de 11h30, a hora extra é paga 50% — só vira infração registrada, não muda o percentual. Erro anterior: o código marcava acima de 11h30 como 100%, corrigido em `jornada.js` (bloco `tipo === 'semana'`: `extra50 = excesso; extra100 = 0`).

Implementação em `functions/src/sascar/jornada.js`:
- `LIMITES.jornadaNormalSemana = 9*60+30` (570 min)
- `LIMITES.jornadaNormalSabado = 4*60` (240 min)
- `LIMITES.extraSeguroSemana = 2*60` (120 min, máximo de extra 50% na semana)
- `LIMITES.direcaoContinuaMax = 4*60` (240 min — **regra Pontual, não Lei 13.103**)
- `LIMITES.refeicaoMinima = 60`
- `LIMITES.pausaMinima = 30`
- Função `tipoDia(dataISO)` retorna 'semana' | 'sabado' | 'domingo' baseado em getUTCDay()
- Cada jornada calculada vem com `tipoDia` no JSON pro frontend mostrar badge SÁB/DOM

## Tipos de infração detectadas
- `REFEICAO_INSUFICIENTE` — refeição < 60min (CLT art. 71)
- `DIRECAO_CONTINUA_EXCESSIVA` — dirigir > 4h sem **NENHUMA pausa** (regra Pontual, mais restritiva que Lei 13.103 art. 67-C)
- `EXTRA_EXCESSIVA` — só na semana, quando passa de 11h30 (Lei 13.103 art. 235-C)

## Regra de "pausa informal" (confirmada Wesley 2026-05-19 tarde)

**Transição `Dirigindo → Jornada → Dirigindo`** é uma **pausa informal** — motorista parou o caminhão entre 2 períodos de direção sem marcar "Pausa" explicitamente no tablet.

**Qualquer pausa informal RESETA o contador de direção contínua**, independente da duração (5min, 11min, 24min — todas resetam).

**Why:** Wesley validou esse comportamento em 2026-05-19 olhando o caso do ADAM. ADAM teve direção 07:39→09:59 (2h21) + pausa de 11min + direção 10:10→12:58 (2h48). Sistema antigo somava em 5h16 (infração); novo trata como 2 blocos isolados (máx 2h48, sem infração).

**How to apply:** Em `functions/src/sascar/jornada.js:calcularJornadas()`, ao processar evento "Jornada":
- Se `prev` é "Dirigindo" E `next` é "Dirigindo" → pausa informal → sempre `direcaoContinua = 0`
- Senão → tempo vai pra bucket `totais.jornada` (jornada parada normal)

Pausas detalhadas vão no retorno como `pausasDetalhe: [{ inicio, fim, duracaoMin, duracao, suficiente }]`. Campo `suficiente` indica se foi ≥30min (informativo, não usado pra infração).

## Campos novos no retorno (2026-05-19 tarde)
- `encerrouJornada: boolean` — true se último evento = "Encerrar"
- `ultimoEventoTipo: string` — descrição do último evento (pra mostrar "em andamento")
- `pausasInformais: number` — quantidade de pausas Dirigindo→Jornada→Dirigindo detectadas
- `pausasDetalhe: array` — lista de cada pausa com horários e duração

## Testes unitários
`scripts/test-jornada-regras.mjs` valida as 3 regras com dados sintéticos — passa todos 6 cenários.

## Resultado validado em DADO REAL (sáb 17/05)
21 motoristas, 7 infrações detectadas corretamente, jornada média 7h49.

Referência visual: `https://rotas.seg.br/torre1/frames/jornada.html` (portal SASCAR, requer login)

## Por que dá pra fazer interno
**ACHADO 2026-05-18 (após investigar métodos SasIntegra):**
Existe método pronto `obterEventosTempoDirecao` que retorna eventos do TABLET SasMDT diretamente:
- 34 dos 66 motoristas (52%) já registram jornada certo no tablet
- 483 eventos retornados em 24h no fim de semana (Jornada/Dirigindo/Pausa/Refeição/Encerrar/Esperar/Trocar)
- Eventos têm: dataInicio, idMotorista, nomeMotorista, idVeiculo, placa, lat/lng, descrição
- NÃO precisa calcular heuristicamente, NÃO precisa iButton físico, NÃO precisa gravar histórico
- IDs evento: 1=Jornada, 2=Dirigindo, 3=Pausa, 4=Parada, 5=Refeição, 6=Esperar, 7=Encerrar, 8=Trocar
- Regra: Evento JORNADA com anterior=ENCERRAR = início efetivo. JORNADA com outro anterior = continuação.

Outros métodos investigados:
- `obterMotoristasVeiculos`: ❌ BLOQUEADO ("acesso não permitido") — pedir liberação à SASCAR
- `obterLayoutTecladoVeiculos`: retornou só 1 veículo (LAYOUT_SEQUENCIAMENTO_TD50) — método pouco útil
- `obterEventoTelemetriaIntegracao`: ✅ funciona, exige janela de 1 dia. Útil pra futuro (freadas, excesso velocidade).

## Colunas do relatório (igual SASCAR)
| Coluna | Significado | Base legal |
|---|---|---|
| Parado | Ignição on + velocidade 0 | Lei 13.103 art. 235-C §8º |
| Movimento até 8h | Dirigindo dentro da jornada normal | CLT art. 58 |
| Extra até 2h | 1ª faixa HE (50%) | CLT art. 59 |
| Extra > 2h | Excede limite — **infração** | Lei 13.103 |
| Almoço ≥ 1h | Intrajornada OK | CLT art. 71 |
| Almoço < 1h | Intrajornada insuficiente — **infração** | CLT art. 71 |

## Arquitetura (NOVA - simplificada após achar obterEventosTempoDirecao)
```
SASCAR obterEventosTempoDirecao(dataInicio, dataFim)
                    ↓
              Cloud Function jornadaDia(data)
              (cache 5min, agrupa por motorista)
                    ↓
              Resposta JSON pra frontend
              { motorista, jornadaTotal, dirigindo,
                refeicao, pausa, encerrou, infracoes[] }
                    ↓
              Página /jornada (tabela + filtros + export)
```
SEM gravação no Firestore necessária — SASCAR é fonte da verdade.

## Algoritmo (núcleo - SIMPLIFICADO)
1. Chamar `obterEventosTempoDirecao(dataInicio, dataFim)` — janela do dia
2. Agrupar eventos por idMotorista
3. Pra cada motorista: ordenar por dataInicio, calcular DELTA entre eventos consecutivos
4. Somar delta por descricaoEventoTempoDirecao (Jornada/Dirigindo/Pausa/Refeição/Encerrar/Esperar/Trocar)
5. Aplicar regras CLT:
   - Total (Jornada + Dirigindo + Refeição + Pausa) > 8h → excedente vira extra (até 2h = extra50, acima = extra100/infração)
   - Refeição < 1h → flag infração art. 71 CLT
   - Direção contínua (Dirigindo sem Pausa/Refeição) > 5h30 → flag infração Lei 13.103
6. Retornar como JSON pra tabela

## Fases
- **A** — Function `jornadaDia` + tela `/jornada` básica (motoristas do dia atual) — 2-3h
- **B** — Cálculo horas extras + flag infrações + filtros (motorista, período) — 2h
- **C** — Export Excel/PDF + dashboard de infrações da frota — 1-2h
- **D** — Alerta tempo real (>5h30 dirigindo sem pausa) — 2-3h

## Como retomar
Wesley diz "vamos pra fase A de jornada" → criar Cloud Function + página. Já tem base SASCAR rodando.

Relacionado: [[project_rastreamento_sascar_fase2]], [[project_sascar_cameras_plano]], [[reference_sascar_api]]

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
