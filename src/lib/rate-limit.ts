type Entry = { count: number; resetAt: number }

export function createInMemoryRateLimiter(maxPerWindow: number, windowMs: number) {
  const map = new Map<string, Entry>()
  return function check(key: string): { ok: true } | { ok: false; retryAfter: number } {
    const now = Date.now()
    const cur = map.get(key)
    if (!cur || cur.resetAt <= now) {
      map.set(key, { count: 1, resetAt: now + windowMs })
      return { ok: true }
    }
    if (cur.count >= maxPerWindow) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)) }
    }
    cur.count += 1
    map.set(key, cur)
    return { ok: true }
  }
}

export function getRequestIp(request: Request): string {
  const xfwd = request.headers.get('x-forwarded-for')
  if (xfwd) return xfwd.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

