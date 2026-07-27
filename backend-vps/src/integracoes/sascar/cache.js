// Cache em memória com TTL + stale-while-revalidate.
// Se o cache está fresco (< ttl), devolve na hora.
// Se está velho mas não expirado (< ttl*3), devolve o velho e revalida em background — usuário nunca espera.
// Só passa do ttl*3 é que bloqueia esperando o SOAP.

const store = new Map();
const inFlight = new Map();

export async function cached(key, ttlMs, loader) {
  const hit = store.get(key);
  const now = Date.now();
  const staleMax = ttlMs * 3;

  // Fresh
  if (hit && now - hit.t < ttlMs) {
    return { data: hit.data, age: now - hit.t, fresh: false };
  }

  // Stale mas ainda usável — devolve velho e dispara refresh em background
  if (hit && now - hit.t < staleMax) {
    if (!inFlight.has(key)) {
      inFlight.set(key, loader().then(data => {
        store.set(key, { data, t: Date.now() });
      }).catch(e => {
        console.warn(`[cache] refresh em background falhou (${key}):`, e?.message || e);
      }).finally(() => {
        inFlight.delete(key);
      }));
    }
    return { data: hit.data, age: now - hit.t, fresh: false, stale: true };
  }

  // Expirado — bloqueia
  if (inFlight.has(key)) {
    // Se já tem outra request buscando, aguarda essa
    await inFlight.get(key);
    const fresh = store.get(key);
    if (fresh) return { data: fresh.data, age: Date.now() - fresh.t, fresh: false };
  }
  const p = loader();
  inFlight.set(key, p.finally(() => inFlight.delete(key)));
  const data = await p;
  store.set(key, { data, t: now });
  return { data, age: 0, fresh: true };
}

export function clearCache(prefix) {
  if (!prefix) return store.clear();
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
