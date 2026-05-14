// Cache em memória com TTL — sobrevive entre invocações na mesma instância de função
// SASCAR tem rate limit de 1 chamada simultânea; cache reduz pressão e acelera dashboard

const store = new Map();

export async function cached(key, ttlMs, loader) {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && now - hit.t < ttlMs) {
    return { data: hit.data, age: now - hit.t, fresh: false };
  }
  const data = await loader();
  store.set(key, { data, t: now });
  return { data, age: 0, fresh: true };
}

export function clearCache(prefix) {
  if (!prefix) return store.clear();
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
