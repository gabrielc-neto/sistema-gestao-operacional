---
name: feedback-menu-blur-mapa-fix
description: "Ao abrir MenuNavegacao, aplicar blur+grayscale direto no .leaflet-container via JS (não CSS backdrop-filter — quebra em Edge InPrivate). Ver frontend/src/components/MenuNavegacao.jsx useEffect"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Regra

Quando o `MenuNavegacao.jsx` (drawer lateral direito) abre, precisa:

1. **Blur no mapa Leaflet ao fundo** — mapa fica sensível/nítido demais atrás do menu
2. **Legenda "Status" (`.mapa-legenda`) escondida** — tem stacking context próprio, vaza sobre o drawer
3. **Controles do Leaflet** (`.leaflet-control-container`) escondidos — mesmo motivo

**Solução:** JS direto no `useEffect` do MenuNavegacao — NÃO usar `backdrop-filter` do CSS.

```jsx
// dentro do useEffect quando open === true:
const mapas = document.querySelectorAll(".leaflet-container");
const antesMap = [];
mapas.forEach((el) => {
  antesMap.push([el, el.style.filter]);
  el.style.filter = "blur(4px) grayscale(0.4)";
  el.style.transition = "filter .2s ease";
});
// cleanup no return:
antesMap.forEach(([el, v]) => { el.style.filter = v; });
```

## Why

Descoberto em 2026-07-17 depois de várias iterações. User reclamou repetidamente "abre o menu e o mapa fica por cima/nítido". Tentei:

- `backdrop-filter: blur(8px) saturate(0.7)` no overlay CSS → **NÃO funcionou no Edge InPrivate** (browsers em modo privado desabilitam `backdrop-filter` por privacidade)
- Aumentar `background: rgba(...)` opacidade → funcionava só para "escurecer", não desfocar
- Solução final: aplicar `filter` DIRETO nos elementos via JS — funciona em qualquer browser desde 2015

Comprovado com Playwright headless: PNG antes 87KB vs PNG depois 44KB (blur reduz entropia = arquivo comprime melhor).

## How to apply

- **Nunca depender apenas de `backdrop-filter` CSS** para desfocar fundo — sempre ter fallback via JS
- Ao criar drawers/modals que sobrepõem mapas → aplicar `filter` direto no `.leaflet-container` no `useEffect`
- Salvar valor original de `style.filter` num array `antesMap` e restaurar no cleanup
- Valores testados que funcionam bem: `blur(4px) grayscale(0.4)` — se quiser mais intenso: `blur(6px) grayscale(0.6)`
- Legenda custom (`.mapa-legenda`) e controles Leaflet (`.leaflet-control-container`) → esconder via `visibility: hidden`

Ver também: [[feedback-nao-aplicar-moduleheader-telas-antigas]] · [[feedback-branch-supabase-nao-merge-tudo]]
