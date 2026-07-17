---
name: reference-cta-smart-api
description: "API CTA Smart (bomba de combustível do pátio Pontual) — endpoint, token, formato XML, rate limit"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5ea08958-1f02-42f6-ba92-d591d7f7a51f
---

**Endpoint:** `https://ctasmart.com.br:8443/SvWebSincronizaAbastecimentos?token=<TOKEN>`

**Token atual:** `bEsu0JDwbL`

**Rate limit:** 1 requisição a cada 60 segundos por token. Estourou → status `017`.

**Formato:** XML `<CTAPLUS versao="1.0">` com `<STATUS>` + `<ABASTECIMENTOS>` (100 por chamada).

**Campos-chave por abastecimento:**
- `ID` (chave única CTA), `SEQUENCIAL`
- `DATA_INICIO`/`HORA_INICIO` e `DATA_FIM`/`HORA_FIM` — atenção: ano às vezes vem como `0018` em vez de `2018` (bug CTA — somar 2000 quando `<100`)
- `VOLUME_FIXED` — litros com vírgula decimal, 3 casas
- `ODOMETRO`, `DISTANCIA`, `MEDIA_KILOMETRO_LITRO`
- `CUSTO`, `CUSTO_UNITARIO`, `ENCERRANTE_FIXED`
- `VEICULO.PLACA` — bate com `veiculos.placa` do Firestore
- `MOTORISTA.NOME`/`CPF`/`CNH`
- `POSTO.NOME`/`CNPJ`/`UF` (`POSTO_COMERCIAL=true` diferencia externo vs pátio)
- `TELEMETRIA.LATITUDE`/`LONGITUDE`
- `EMPRESA.CODIGO=17321205` (PONTUAL PR — filial fixa)

Ver [[project-cta-smart-integracao]] pro contexto de negócio (abastecimento antes/depois da viagem, base pra CPK real).
