/**
 * Next.js proxy: güvenlik başlıkları ve API rate limiting.
 * Next 16'da middleware yerine proxy kullanılır.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 40

const apiRequestCounts = new Map<string, { count: number; resetAt: number }>()

function getClientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? 'unknown'
  return ip
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = apiRequestCounts.get(key)
  if (!entry) {
    apiRequestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (now >= entry.resetAt) {
    apiRequestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  entry.count += 1
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) return false
  return true
}

function cleanupRateLimitMap(): void {
  const now = Date.now()
  for (const [k, v] of apiRequestCounts.entries()) {
    if (now >= v.resetAt) apiRequestCounts.delete(k)
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitMap, 60 * 1000)
}

export function proxy(request: NextRequest) {
  const res = NextResponse.next()

  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/news-update')) {
    const key = getClientKey(request)
    if (!checkRateLimit(key)) {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen bir dakika sonra tekrar deneyin.' },
        { status: 429 }
      )
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

