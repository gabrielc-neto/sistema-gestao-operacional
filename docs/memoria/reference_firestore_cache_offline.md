---
name: reference-firestore-cache-offline
description: "Cache offline do Firestore está LIGADO no projeto logistica-ia (persistentLocalCache multi-tab). Como funciona, riscos, e pegadinha do Vite cache invalidando quando mexe em deps do Firebase"
metadata: 
  node_type: memory
  type: reference
  originSessionId: f5541ecf-d17a-405b-a9a4-57f01ecbea56
---

**Onde:** `frontend/src/firebase/config.js` — `db` é criado com `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`.

**Efeito:** A partir da 2ª visita a qualquer página que lê Firestore (Frota, Motoristas, Manutenção, OC, Férias, Cercas, Histórico, Usuários, Setores, Cargos, Permissões, Dashboard), a UI abre **instantâneo** do IndexedDB local. Sincronização com servidor acontece em background. Multi-tab seguro.

**Cuidados:**
- Em writes offline, mudanças ficam em fila local e só vão pro servidor quando reconectar. Pra sistema operacional 24/7 na rede da Pontual isso não é problema, mas evitar bulk-update offline.
- Se trocar `initializeFirestore` por `getFirestore` em qualquer hook/componente, vai estourar `FirebaseError: initializeFirestore() has already been called with different options`. Sempre importar `db` desse `config.js` — nunca chamar `getFirestore(app)` em outro lugar.
- HMR pode acusar esse mesmo erro depois de mudar `config.js` — full reload da aba resolve.

**Pegadinha Vite v8.0.11 (descoberta 2026-05-23):** após qualquer upgrade em deps do Firebase, react-leaflet ou mudança no `optimizeDeps`, o navegador pode acusar `TypeError: Failed to fetch dynamically imported module: .../Rastreamento.jsx` (tela branca, mas Vite serve HTTP 200 pra todos os módulos). Resolução:
```bash
# matar Vite
rm -rf "C:/Users/Logistica01/projetos/logistica-ia/frontend/node_modules/.vite"
npm run dev
```
Depois hard reload no navegador. Sintoma some no 1º reinício.

**Commits relacionados:** `56aa8a2` (perf cache offline + render parcial dashboard), `cd63464` (fixes mobile).
