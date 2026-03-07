import { NextResponse } from 'next/server'
import { parseLawQuery, searchLawArticle } from '@/lib/law-search'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q || typeof q !== 'string' || !q.trim()) {
    return NextResponse.json({ error: 'Sorgu gerekli (örn. TCK 81, TMK 472)' }, { status: 400 })
  }

  const parsed = parseLawQuery(q.trim())
  if (!parsed) {
    return NextResponse.json({
      found: false,
      message: 'Sorgu tanınamadı. Örnek: TCK 81, TMK 472, TBK 77, Anayasa 10',
    }, { status: 200 })
  }

  const result = await searchLawArticle(parsed.code, parsed.article)
  return NextResponse.json(result)
}
