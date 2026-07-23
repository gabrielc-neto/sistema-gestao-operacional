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

export function invalidate(key) { store.delete(key); }
export function invalidateAll() { store.clear(); }
