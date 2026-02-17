const CACHE_MAX_ENTRIES = 200

const globalCache = globalThis.__lobbyiengApiCache || new Map()
if (!globalThis.__lobbyiengApiCache) {
  globalThis.__lobbyiengApiCache = globalCache
}

function pruneCacheIfNeeded() {
  if (globalCache.size <= CACHE_MAX_ENTRIES) return
  const entries = Array.from(globalCache.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt)
  const toDelete = entries.slice(0, globalCache.size - CACHE_MAX_ENTRIES)
  for (const [key] of toDelete) {
    globalCache.delete(key)
  }
}

export function buildCacheKey(prefix, params = {}) {
  const serialized = Object.entries(params)
    .map(([k, v]) => {
      if (Array.isArray(v)) return [k, v.join(",")]
      return [k, String(v ?? "")]
    })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&")

  return `${prefix}:${serialized}`
}

export async function getOrSetCache(key, ttlMs, producer) {
  const now = Date.now()
  const existing = globalCache.get(key)

  if (existing && existing.value !== undefined && existing.expiresAt > now) {
    return { value: existing.value, hit: true }
  }

  if (existing?.pendingPromise) {
    const value = await existing.pendingPromise
    return { value, hit: true }
  }

  const pendingPromise = Promise.resolve().then(producer)
  globalCache.set(key, {
    createdAt: now,
    expiresAt: now + ttlMs,
    pendingPromise
  })
  pruneCacheIfNeeded()

  try {
    const value = await pendingPromise
    globalCache.set(key, {
      createdAt: now,
      expiresAt: Date.now() + ttlMs,
      value
    })
    pruneCacheIfNeeded()
    return { value, hit: false }
  } catch (error) {
    globalCache.delete(key)
    throw error
  }
}

export function readCache(key) {
  const now = Date.now()
  const existing = globalCache.get(key)
  if (!existing) return undefined
  if (existing.value !== undefined && existing.expiresAt > now) return existing.value
  if (existing.expiresAt <= now) globalCache.delete(key)
  return undefined
}

export function writeCache(key, value, ttlMs) {
  globalCache.set(key, {
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    value
  })
  pruneCacheIfNeeded()
}
