---
name: project-sascar-api-paginacao-antigo-primeiro
description: "SASCAR SasIntegra API `obterPacotePosicoesMotorista` é fila — cada chamada retorna 3000 pacotes dos MAIS ANTIGOS primeiro. Precisa loop pra chegar em dados frescos. Mesmo padrão do CTA API."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Fato

**SASCAR SasIntegra API `obterPacotePosicoesMotorista` funciona como fila:**
- Cada chamada devolve N pacotes (max 3000) dos MAIS ANTIGOS primeiro
- Pra chegar em dados frescos, precisa consumir a fila em loop
- Rate limit: 1 requisição / 60 segundos
- Testado 2026-07-21: fila tinha ~7400 pacotes acumulados, precisou 3 chamadas pra chegar em posições de agora

**Sintoma quando ignorado:** Mapa `/rastreamento` mostra veículos com posição de madrugada/ontem mesmo com caminhões trabalhando NAGORA. Dashboard mostra "0 em movimento" quando na verdade há 5+ rodando.

## Why

**Root cause descoberto 2026-07-21 11:00 pela user Rosilda:** ela reclamou "não quero dado velho, onde já se viu, se é um rastreador?".

Rodei loop de 3 chamadas SASCAR sem cache — resultado prova:
- Call 1: 3000 pacotes de 01:06 → 06:09 (madrugada)
- Call 2: 3000 pacotes de 07:49 → 09:45
- Call 3: 1393 pacotes de 09:45 → 10:44 AGORA (MARCIO 63km/h, ANTONIO 68km/h EM_MOVIMENTO)

Backend original fazia 1 chamada só → pegava 3000 pacotes das 01h → cacheava por 5min → sistema "cego" a tudo que aconteceu depois.

## How to apply

**Fix aplicado em `functions/index.js:sascarPosicoes`:**
- Loop de até 4 chamadas `obterPacotePosicoesMotorista(quantidade=3000)`
- Sleep 65s entre chamadas (respeita rate limit SASCAR)
- Break se lote < 3000 (fila esvaziou)
- `timeoutSeconds: 300` (era default 60s — não cabia loop com sleeps)
- Cache mantido em 5min: primeira chamada leva ~3 min, próximas em cache

**Se aparecer bug parecido em outra função SASCAR:**
- `obterEventosTempoDirecao` também é fila? Verificar (usa `dataInicio`/`dataFim` — pode ser filtro real)
- `obterPosicoesUltimasDoRepasse` — se existir na SDK, prefere sobre `obterPacotePosicoesMotorista` (retorna só último por veículo, não fila)

**Pattern idêntico ao CTA API:** [[project-cta-api-paginacao-antigo-primeiro]] — mesma solução (loop até esvaziar fila).

**Regra:** Toda API "obter pacote" da SASCAR/CTA que trabalha com fila requer loop no backend, não uma chamada. Documentar no `docs/10-sascar-integracao.md` e `docs/11-cta-integracao.md`.

Ver também: [[reference-cta-smart-api]] · [[project-cta-api-paginacao-antigo-primeiro]] · [[feedback-primeira-msg-confirmar-skills]]
