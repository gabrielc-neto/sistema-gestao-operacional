---
name: feedback-smoke-test-antes-de-commit
description: "Ao editar código React com useMemo/useEffect/useCallback e helpers `const` no mesmo escopo, SEMPRE rodar smoke test (Playwright headless OU pedir F5 no browser) antes de commitar. Erros TDZ são silenciosos em compilação — só quebram em runtime como tela branca."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2026-07-21-batch-manutencao-9-features
---

## Regra

Após qualquer edição em componente React que:
- Introduz uso de variável/função dentro de useMemo, useCallback, useEffect
- Reorganiza declarações `const` no mesmo escopo do componente
- Modifica ordem de hooks

**DEVO rodar smoke test antes de commitar/reportar:**
1. Se dev server tá up: fetch da URL da página modificada + parse body
2. Melhor: Playwright headless com login + navegação + capture pageerror
3. Body <200 chars = tela branca. Verificar console.

## Why

**Bug 2026-07-21 (commit `3a23ae0` → fix `7af36ec`):** editei `alertaCount` (useMemo linha 1404) pra chamar helper `normP()`, mas declaração `const normP = ...` estava na linha 1411 — depois. TypeScript/Vite compila sem erro (não é erro sintático), mas runtime dá:

```
Cannot access 'normP' before initialization
```

React não consegue renderizar o componente inteiro → **tela branca no /manutencao**. User precisou reportar. Perdi 5 min de crédito e ela abriu commit prod com bug.

**Custo do smoke test:** 30 seg de Playwright ou 5s de curl + parse body.
**Custo de tela branca em prod:** user reporta + fix urgente + revert de credibilidade.

## How to apply

**Padrão de smoke test pós-edição React:**

```javascript
// scripts/smoke-test-page.mjs
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext()).newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGE: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CON: ' + m.text().slice(0, 300)); });
// login + navega pra rota modificada
await p.goto('http://localhost:5175/rota-editada');
await p.waitForTimeout(3000);
const body = await p.locator('body').textContent();
if ((body?.length || 0) < 200) console.log('❌ tela branca — body <200 chars');
if (errs.length) errs.forEach(e => console.log(e));
await b.close();
```

**Quando aplicar:**
- ✅ Toda edição em `useMemo/useCallback/useEffect`
- ✅ Toda reordenação de declarações no escopo do componente
- ✅ Antes de commitar batch com >2 arquivos frontend

**Quando pular (custo > benefício):**
- ❌ Edição só de string (labels, textos)
- ❌ Edição só de CSS inline
- ❌ Componente novo isolado (não integra com estado existente)

Ver também: [[project-log-sessoes-detalhado-instrucoes]] · [[feedback-abertura-sessao-consultar-contexto]]
