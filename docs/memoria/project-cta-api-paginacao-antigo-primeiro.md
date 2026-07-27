---
name: project-cta-api-paginacao-antigo-primeiro
description: "CRÍTICO — API CTA retorna 100 abastecimentos por chamada ORDENADOS DO MAIS ANTIGO. Se pedir 30 dias, sempre volta os 100 antigos já sincronizados. Fix aplicado em functions/src/cta/sincronizar.js linha 139 (30d → 7d)"
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Descoberta (2026-07-20)

**Bug do sync CTA:** buffer sempre retornava os MESMOS 100 abastecimentos antigos (2018-2020) que já estavam no Firestore. Nunca chegava nos novos.

## Causa

API CTA Smart (`https://ctasmart.com.br:8443/SvWebSincronizaAbastecimentos`):

- Retorna 100 abastecimentos por chamada
- **Ordenados do MAIS ANTIGO pro mais novo**
- Aceita `data_inicio=DD/MM/YYYY` como filtro mínimo
- Rate limit: 1 chamada / 60s por token
- Se `data_inicio` for muito antigo (30 dias), buffer priorizará abastecimentos velhos (2018-2020) que somem uns 500+ pacotes históricos

## Fix aplicado

**`functions/src/cta/sincronizar.js` linha 138-141:**

```diff
- if (!dataInicio) {
-   const d = new Date(Date.now() - 30 * 24 * 3600 * 1000);
-   dataInicio = ...
- }
+ if (!dataInicio) {
+   // API retorna 100 do mais antigo primeiro. Se pedirmos 30 dias, volta buffer antigo.
+   // 7 dias = 100 pacotes cobrem uma semana inteira de operação.
+   const d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
+   dataInicio = ...
+ }
```

## Como validar

```bash
# Chamada direta CTA com data_inicio=HOJE
curl "https://ctasmart.com.br:8443/SvWebSincronizaAbastecimentos?token=***&data_inicio=20/07/2026" | grep -c "<ABASTECIMENTO>"
# Resposta: 22  ← existem 22 abastecimentos DE HOJE
```

## Rate limit — cuidado

Fazer >1 chamada / 60s cai em `<CODIGO>017</CODIGO> Somente uma requisição é permitida a cada 60 segundos`.

Se fizer muitas seguidas testando, o rate limit acumula — pode levar 3-5 min pra desbloquear tudo.

**Uso correto pra sync bulk:** rodar `--loop` (interval 65s) e deixar rodando. Cada iteração puxa 100 novos, avança cursor via `confirmar=true`.

## Como aplicar em produção

Deploy da Cloud Function que chama isso periodicamente (scheduled). Ou cron do Hostinger na migração Laravel (ver [[project-migracao-laravel-hostinger]]).

Ver também: [[reference-cta-smart-api]] · [[project-cta-smart-integracao]] · [[project-cta-externo-lancamento-manual]]
