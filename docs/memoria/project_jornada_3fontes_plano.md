---
name: project-jornada-3fontes-plano
description: "Arquitetura de controle de jornada da Pontual cruzando 3 fontes — tablet SasMDT, GPS SASCAR e tacógrafo VDO (.DDD). Fase 1 entregue (tablet), Fases 2-4 mapeadas."
metadata: 
  node_type: memory
  type: project
  originSessionId: dad63364-1a18-4047-bcae-688259c317b0
---

# Controle de jornada — 3 fontes integradas

Status: **Fase 1 entregue. Fases 2-4 desenhadas, aguardando 5 respostas do Wesley pra iniciar Fase 2 (VDO).** Desenhado em 2026-05-19.

**Why:** Pontual tem 3 fontes que descrevem o mesmo evento (motorista trabalhando) por ângulos diferentes. Cruzar dá:
1. Prova legal pra ANTT (VDO oficial)
2. Tempo real pra operação (tablet + GPS)
3. Detecção de fraude/esquecimento (divergência entre fontes)

**How to apply:** Consultar antes de evoluir página /jornada. Manter hierarquia de confiança ao decidir qual fonte usa pra cada métrica.

## As 3 fontes (2 fornecedores diferentes!)

⚠️ **SASCAR e VDO são empresas DIFERENTES.** Contratos separados, APIs separadas, equipamentos separados.

| Fonte | Fornecedor | API/Acesso | Já integrada? |
|---|---|---|---|
| **Tablet SasMDT** | SASCAR (Michelin Connected Fleet) | `obterEventosTempoDirecao` — eventos Jornada/Dirigindo/Pausa/Refeição/Encerrar marcados pelo motorista | ✅ Fase 1 |
| **GPS rastreador** (LMU4230/MSC830) | SASCAR (Michelin Connected Fleet) | `obterPacotePosicoes(Motorista)` — lat/lng/velocidade/ignição a cada ~60s | ✅ Rastreamento |
| **Tacógrafo DTCO** | **VDO** (outra empresa, não SASCAR) | Arquivo `.DDD` — atividades minuto a minuto, prova legal ANTT/MTE | ❌ Fase 2 |

**Implicação prática:** Integração VDO **não passa pela API SASCAR**. É contrato separado, possivelmente outro portal/software. Confirmar com Wesley o fornecedor/integrador real do VDO antes da Fase 2.

## Hierarquia de confiança (qual fonte ganha quando divergem)

- **Fiscalização legal** → VDO > Tablet > GPS (tacógrafo é prova oficial)
- **Tempo real / alertas** → Tablet + GPS > VDO (VDO só baixa depois)
- **Auditoria interna** → 3 cruzados (divergência vira alerta)

## Tabela de responsabilidades por fonte

| O que medir | Tablet | GPS | VDO | Fonte primária |
|---|:---:|:---:|:---:|---|
| Início jornada | ✅ | — | ✅ | **Tablet** (tempo real) |
| Primeiro movimento | — | ✅ | ✅ | **GPS** |
| Tempo dirigindo | ~ | ~ | ✅ | **VDO** (legal) |
| Parado ligado | ~ | ✅ | ✅ | **GPS** (mostra onde) |
| Parado desligado | ~ | ✅ | ✅ | **GPS** + cerca |
| Refeição | ✅ | — | ✅ | **VDO** + tablet |
| Pausa 30min | ✅ | — | ✅ | **VDO** + tablet |
| Direção contínua > 4h | ~ | — | ✅ | **VDO** (oficial) |
| Velocidade acima limite | — | ✅ | ✅ | **VDO** (min a min) |
| Onde estava parado | — | ✅ | — | **GPS** único |
| Comprovação ANTT | — | — | ✅ | **VDO** único |

## Arquitetura de dados

```
Tablet ──► obterEventosTempoDirecao ──┐
                                       │
GPS ────► obterPacotePosicoesMot ──────┼──► Cloud Functions
                                       │
VDO ────► upload .DDD ─────────────────┘
                       │
                       ▼
       Firestore: motoristas/{id}/jornadas/{YYYY-MM-DD}
         ├ fonte: 'tablet' | 'gps' | 'vdo' | 'consolidada'
         ├ inicio, fim
         ├ blocos[]: { tipo, inicio, fim, fonte, lat, lng }
         ├ totais: { dirigindo, parado, refeicao, pausa }
         ├ infracoes[]: { tipo, base, fonte, severidade }
         └ divergencias[]: { entre, descricao }
                       │
                       ▼
                Página /jornada
                (3 abas + timeline cruzada)
```

## Roadmap de implementação

### ✅ Fase 1 — Tablet SasMDT (entregue 2026-05-19)
- `/jornada` com regras Pontual (9h30 sem-sex, 4h sáb, 100% dom, 4h direção contínua)
- Cloud Functions `jornadaDia` + `jornadaPeriodo`
- Export CSV + PDF
- Ver [[project_jornada_motorista_plano]]

### ⬜ Fase 2 — VDO upload + parser (4-6h)
- Página `/vdo`: input file `.DDD`
- Cloud Function `vdoIngest` parseia binário
- Grava `motoristas/{id}/jornadas/{data}` fonte='vdo'
- Aba "VDO" na página /jornada
- **Depende de saber:** marca/modelo VDO + formato do .DDD usado

### ⬜ Fase 3 — Cruzamento das 3 fontes (3-4h)
- `consolidadorJornada()` em cron diário 04h
- Detector de divergência (>15min entre fontes)
- Timeline 3 trilhas no /jornada
- Badge "fonte" em cada infração

### ⬜ Fase 4 — Automação + folha (8h)
- Pasta watch OU API VDO Fleet (sem upload manual)
- Export pra folha de pagamento — **motorista é SASCAR (tablet+GPS+VDO)**, NÃO Sólides. Sólides é só ADM.
- Alerta tempo real (motorista 3h45 dirigindo → push)
- Relatório mensal automático por motorista (PDF)

## Tela /jornada — layout futuro (com 3 fontes)

```
┌───── Jornada & Extras ─────────────────────────────────────┐
│ [hoje][ontem][7d][custom]  Busca: [ ▾ ]  Fonte: [✓T][✓G][✓V]│
│ KPIs: motoristas | jornada total | média | infrações | div │
├────────────────────────────────────────────────────────────┤
│ Motorista │Placa│Início│Fim │Dir │Pausa│Extra│Status         │
│ JOÃO      │SEF1H│05:42 │17:50│6:12│0:30 │0:30 │⚠ 4h+dir       │
│   ▼ expande timeline:                                       │
│   [Tablet] ─J━━D━━━R━D━P━D━━━E                              │
│   [GPS]    ─○──mov──●parado○─mov─●parado○──mov──●           │
│   [VDO]    ─■═Dir═■=Disp=■═Dir═■=P=■═Dir═■=P=               │
│   Infração: 04h15 dirigindo sem pausa (fonte: VDO)          │
│   Divergência: refeição tablet 12-13h vs VDO 11h50-12h45    │
│   [ Abrir mapa ] [ Baixar .DDD ] [ PDF ]                    │
└────────────────────────────────────────────────────────────┘
```

## 5 perguntas em aberto pra Wesley (bloqueia Fase 2)

1. **Qual empresa fornece o VDO** pra Pontual? (VDO é marca de tacógrafo da Continental, mas o contrato/integrador pode ser outro — não é SASCAR, isso é certo)
2. **Marca/modelo do VDO** instalado nos 38 cavalos? (DTCO 1381, 3.0, 4.0e?)
3. **Como hoje é o download do .DDD?** Pen drive na cabine? Leitor central? Software já lê (Tachoscan, VDO Fleet, outro)?
4. **Quem na Pontual** roda esse download? (operacional, RH, motorista)
5. ~~Cruzar com Sólides~~ — **respondido 2026-05-19**: Sólides é só ADM. Motorista usa SASCAR. Tirar Sólides do escopo de motorista. Ver [[feedback_solides_so_adm]].

## Visão operacional — como vai parecer rodando

### Hardware no caminhão (1 dos 38) — 2 fornecedores diferentes
- **Tablet SasMDT** (SASCAR) na cabine — motorista bate Jornada/Refeição/Pausa/Encerrar, identifica por iButton
- **GPS LMU4230/MSC830** (SASCAR) — pacote lat/lng/velocidade/ignição a cada ~60s
- **Tacógrafo DTCO** (**VDO**, fornecedor separado da SASCAR) no painel — cartão motorista, grava .DDD ao vivo, validação ANTT oficial

### Streams chegando no servidor
- Tablet → `obterEventosTempoDirecao` → `jornadaDia()` (tempo real)
- GPS → `obterPacotePosicoes` → Firestore `sascar_posicoes` (polling 30s)
- VDO → upload `.DDD` (pen drive ou VDO Fleet) → `vdoIngest()` (diário)

Tudo converge em `motoristas/{id}/jornadas/{data}` + `sascar_posicoes` + `ordens_carregamento`.

### 5 telas pra 5 personas

| Persona | Tela | Fonte primária mostrada |
|---|---|---|
| Despachador (torre) | `/rastreamento` | GPS ao vivo + tablet (status motorista) |
| RH/operacional | `/jornada` | Tablet + cruzamento com VDO (timeline 3 trilhas) |
| Diretoria (Wesley) | Dashboard semanal | Agregado 3 fontes — top infratores, HE total |
| Motorista | Tablet na cabine | Tablet (alerta "pausa em 15min") |
| Fiscal ANTT | PDF sob demanda | VDO (.DDD anexado) + GPS + tablet |

### Cenários reais que o cruzamento resolve

| Cenário | Como cada fonte contribui |
|---|---|
| **Caminhão sumiu do mapa** | GPS off, mas tablet diz que está trabalhando + VDO confirma cartão inserido = só perdeu sinal |
| **Motorista esqueceu de marcar refeição no tablet** | Tablet acusa infração; GPS mostra parado em posto; VDO confirma "Pausa" → infração ignorada |
| **Auditoria de HE** | Tablet + VDO calculam jornada real; sistema aplica regra Pontual (9h30 + extras) |
| **Cliente reclama atraso** | GPS prova horário de chegada; tablet + VDO provam tempo de espera real |

### Regras de ouro (qual fonte ganha quando discordam)

| Caso de uso | Fonte primária |
|---|---|
| Operação tempo real (mapa, alerta) | **GPS + Tablet** |
| Cálculo HE / folha | **VDO** (Tablet como reforço) |
| Prova legal ANTT | **VDO** único válido |
| Onde estava? | **GPS** único com lat/lng |
| Detectar fraude/esquecimento | Cruzar os **3** |

### Ganho consolidado (antes × depois)

| Antes (só GPS) | Com 3 fontes |
|---|---|
| Sabe onde o caminhão está | Sabe onde + quem dirige + por quanto tempo + prova legal |
| Não calcula jornada | HE automático, infração detectada, regra Pontual aplicada |
| Sem prova pra ANTT | .DDD anexável a qualquer relatório |
| Esquecimento de motorista vira erro | 3 fontes cruzando → esquecimento detectado e corrigido |
| Cliente reclama sem evidência | 3 fontes confirmam horário chegada e espera |
| HE no chute | Cálculo automático com pizza de evidência |

## Como retomar

Wesley diz "vamos pra fase 2 da jornada" ou "VDO" → revisar respostas das 5 perguntas + iniciar `vdoIngest` + página `/vdo`.

Relacionado: [[project_jornada_motorista_plano]], [[reference_sascar_api]], [[project_rastreamento_sascar_fase2]], [[project_sascar_ibutton_diagnostico]], [[project_logistica_rastreamento_levantamento]], [[feedback_solides_so_adm]]
