---
name: project-ui-ux-melhorias-2026-07-20
description: "4 melhorias UI/UX aplicadas via consulta à skill ui-ux-pro-max — cor laranja tracking, fonte Fira Sans/Code, bullet charts nos KPIs, mobile keyboards"
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Contexto

Sessão 20/07 — user pediu pra usar a skill `ui-ux-pro-max` (instalada mais cedo) pra sugerir melhorias no sistema. Como plugin não estava ativo na sessão, rodei o `search.py` da skill via CLI e apliquei as sugestões relevantes pra logística.

## 5 sugestões consultadas via ui-ux-pro-max

### 1. Cor laranja `#EA580C` pra "em movimento" ✅ APLICADO
Sugestão da skill (product = "Logistics/Delivery"): tracking blue #2563EB + delivery orange #EA580C + green delivered. Sistema usava verde `#16a34a` pra EM_MOVIMENTO, que se confundia com "OK/entregue".

**Alterado:**
- `frontend/src/components/MapaFrota.jsx` linha 105 — `STATUS.EM_MOVIMENTO.color: "#EA580C"`
- Mesmo arquivo, componente `<Legenda>` — cor da entrada "Em movimento" também laranja

### 2. Fonte Fira Sans + Fira Code (pairing "Dashboard Data") ✅ APLICADO
Recomendação da skill: Fira Code monospace pra números tabulares (placas, IDs, R$, KMs) + Fira Sans pra labels.

**Alterado:**
- `frontend/src/index.css` topo — `@import` Google Fonts + classe `.numero-tabular` com `font-variant-numeric: tabular-nums`
- Vars `--font`, `--font-display`, `--font-mono` atualizadas pra usar Fira

### 3. Bullet chart nos KPIs (Disponíveis/Movimento/Bloqueados) ✅ APLICADO
Padrão dashboards densos: valor + `/ total` + barra de progresso pequena.

**Alterado:**
- `frontend/src/pages/Dashboard.jsx` — `<KpiTile>` ganhou prop `total`
- 4 KPIs de topo agora mostram "36 / 38" com barra colorida embaixo (Disponíveis, Em movimento, Bloqueados, Sem comunicação)

### 4. Streaming Area Chart pro rastreamento ⏭️ PULADO
Recomendação era mostrar histórico de posições SASCAR num sparkline. Sistema hoje só armazena ponto ATUAL de cada veículo — não guarda time-series. Faz mais sentido implementar depois da migração pra Laravel/MySQL onde time-series é natural.

### 5. Mobile keyboards por tipo de input ✅ APLICADO
Cada input mobile deve abrir teclado apropriado.

**Alterado:**
- `Motoristas.jsx`:
  - Nome: `autoCapitalize="characters" autoComplete="name"`
  - CNH: `inputMode="numeric" pattern="[0-9]*" maxLength={11}` + regex strip não-dígitos
  - Categoria CNH: `autoCapitalize="characters"`
  - Telefone: `type="tel" inputMode="tel" autoComplete="tel"`
- `Frota.jsx`:
  - Placa: `autoCapitalize="characters" maxLength={7} spellCheck={false}`

## Como replicar consultas à skill

```bash
cd ~/.claude/plugins/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max
python -X utf8 scripts/search.py "logistics dashboard" --domain product
python -X utf8 scripts/search.py "fleet blue orange" --domain color
python -X utf8 scripts/search.py "dashboard KPI real-time" --domain chart
python -X utf8 scripts/search.py "dashboard data-dense" --domain typography
python -X utf8 scripts/search.py "dashboard tables mobile" --domain ux
```

**Domínios disponíveis:** product, style, typography, color, landing, chart, ux, icons, react, web, google-fonts, gsap
**Stacks:** react, nextjs, astro, vue, svelte, shadcn, etc.

## Playwright HEADED — controle Edge do user

Descoberto que dá pra abrir o Edge do PC dela (canal `msedge`) em modo visível + auto-login com Playwright:

```js
const browser = await chromium.launch({
  headless: false, channel: 'msedge',
  args: ['--start-maximized']
});
```

Útil pra ela **ver o resultado das mudanças em tempo real** sem precisar refresh manual. O script fica em `C:/Users/Logistica01/AppData/Local/Temp/pw-test/edge-live.mjs`.

Ver também: [[project-sessao-2026-07-20-skills-e-fixes]] · [[feedback-menu-blur-mapa-fix]] · [[project-migracao-laravel-hostinger]]
