type CacheEntry<T> = { value: T; expiresAt: number }

export function createInMemoryQueryCache<T>(ttlMs: number) {
  const map = new Map<string, CacheEntry<T>>()
  return {
    get(key: string): T | null {
      const hit = map.get(key)
      if (!hit) return null
      if (hit.expiresAt <= Date.now()) {
        map.delete(key)
        return null
      }
      return hit.value
    },
    set(key: string, value: T) {
      map.set(key, { value, expiresAt: Date.now() + ttlMs })
    },
  }
}

export function normalizeQueryKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

