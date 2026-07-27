// Cache in-memory simples com TTL. Substitui o `cached` do Firebase Functions.
const store = new Map();

export async function cached(key, ttlMs, computer) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && (now - hit.ts) < ttlMs) {
    return { data: hit.data, age: now - hit.ts, fresh: false };
  }
  const data = await computer();
  store.set(key, { data, ts: now });
  return { data, age: 0, fresh: true };
}

// Escreve direto no cache (usado pelo cron pra popular sem passar por `cached`).
export function setCache(key, data) {
  store.set(key, { data, ts: Date.now() });
}

// Lê sem TTL (só devolve o que tem, mesmo velho).
export function getCache(key) {
  const hit = store.get(key);
  if (!hit) return null;
  return { data: hit.data, age: Date.now() - hit.ts };
}

export function invalidate(key) { store.delete(key); }
export function invalidateAll() { store.clear(); }
