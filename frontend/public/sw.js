/* Pontual Logística — service worker mínimo pra PWA
   Estratégia: network-first (pega sempre versão nova do sistema).
   Fallback pra cache só se offline. */

const CACHE_NAME = "pontual-v1";
const CACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.svg",
  "/pontual-logo.png",
  "/pontual-logo-white.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(CACHE_ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Skip requests não-GET e cross-origin de API
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Nunca cachear API do Firebase/SASCAR/CTA
  if (
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("cloudfunctions.net") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("ctasmart.com.br") ||
    url.pathname.startsWith("/pontual-logistica/") // proxy Vite pra emulator
  ) return;

  event.respondWith(
    fetch(request)
      .then((resp) => {
        // Cacheia respostas ok pra fallback offline
        if (resp.ok && (request.destination === "document" || request.destination === "script" || request.destination === "style" || request.destination === "image")) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match("/")))
  );
});
