/**
 * Yerel hukuk dosyaları için mtime tabanlı bellek önbelleği.
 * Aynı dosya için tekrar tekrar disk okumasını önler (API + RAG + Madde Ara).
 */
import fs from 'fs/promises'

type Entry = { mtimeMs: number; content: string }

const utf8Cache = new Map<string, Entry>()
let hits = 0
let misses = 0

const isDev = process.env.NODE_ENV === 'development'

export async function readFileCachedUtf8(absPath: string): Promise<string> {
  let stat
  try {
    stat = await fs.stat(absPath)
  } catch {
    throw new Error(`readFileCachedUtf8: missing ${absPath}`)
  }
  const prev = utf8Cache.get(absPath)
  if (prev && prev.mtimeMs === stat.mtimeMs) {
    hits++
    if (isDev && hits % 200 === 0) {
      console.debug(`[legalFileCache] hits=${hits} misses=${misses} size=${utf8Cache.size}`)
    }
    return prev.content
  }
  misses++
  const content = await fs.readFile(absPath, 'utf-8')
  utf8Cache.set(absPath, { mtimeMs: stat.mtimeMs, content })
  return content
}

export async function readJsonCached<T>(absPath: string): Promise<T> {
  const raw = await readFileCachedUtf8(absPath)
  return JSON.parse(raw) as T
}

export function getLegalFileCacheStats(): { hits: number; misses: number; entries: number } {
  return { hits, misses, entries: utf8Cache.size }
}

export function clearLegalFileCache(): void {
  utf8Cache.clear()
  hits = 0
  misses = 0
}
