import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { parseLawQuery, searchLawArticle } from '@/lib/law-search'
import { classifyQuery } from '@/lib/query-classifier'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q || typeof q !== 'string' || !q.trim()) {
    return NextResponse.json({ error: 'Sorgu gerekli (örn. TCK 81, TMK 472)' }, { status: 400 })
  }

  const trimmed = q.trim()
  const parsed = parseLawQuery(trimmed)

  let classification: { category: string; confidence: string } | undefined
  if (process.env.OPENAI_API_KEY) {
    try {
      const { queryType, confidence } = await classifyQuery(trimmed, openai)
      classification = { category: queryType, confidence }
    } catch {
      // optional: continue without classification
    }
  }

  if (!parsed) {
    return NextResponse.json({
      found: false,
      message: 'Sorgu tanınamadı. Örnek: TCK 81, TMK 472, TBK 77, Anayasa 10',
      ...(classification && { classification }),
    }, { status: 200 })
  }

  const result = await searchLawArticle(parsed.code, parsed.article)
  return NextResponse.json({
    ...result,
    ...(classification && { classification }),
  })
}
