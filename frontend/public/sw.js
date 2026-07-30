/* Pontual Logística — service worker STUB (v2 — força hard reload)
   Motivo: cada deploy novo tava cacheando versão antiga → tela branca.
   Este SW se auto-remove e limpa todos os caches. */

const SW_VERSION = "2026-07-30-force-reload-2";
self.addEventListener("install", () => { self.skipWaiting(); });

self.addEventListener("activate", async (e) => {
  e.waitUntil((async () => {
    // Limpa TODOS os caches
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
    // Auto-desregistra
    const regs = await self.registration.unregister();
    // Força reload de todos os clientes pra pegar HTML novo
    const clients = await self.clients.matchAll();
    clients.forEach((c) => c.navigate(c.url));
  })());
});

// NÃO intercepta fetch — deixa browser ir direto na rede
