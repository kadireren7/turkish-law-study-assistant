/**
 * Geliştirme ortamında route / async işlem süreleri (üretimde kapalı).
 */

const isDev = process.env.NODE_ENV === 'development'

export async function withRouteTiming<T>(routeName: string, fn: () => Promise<T>): Promise<T> {
  if (!isDev) return fn()
  const t0 = performance.now()
  try {
    return await fn()
  } finally {
    const ms = Math.round(performance.now() - t0)
    if (ms > 500) {
      console.warn(`[slow] ${routeName} ${ms}ms`)
    } else if (ms > 150) {
      console.debug(`[timing] ${routeName} ${ms}ms`)
    }
  }
}

export function devLogCache(label: string, detail: string): void {
  if (isDev) console.debug(`[cache] ${label} ${detail}`)
}
