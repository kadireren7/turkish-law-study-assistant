import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { CASE_ANALYSIS_SYSTEM_PROMPT } from '@/lib/case-analysis-prompt'
import { getLawDatabaseContext } from '@/lib/law-database'
import { buildSystemContentWithSources } from '@/lib/source-grounded'
import { DEFAULT_MEVZUAT_SOURCE_BLOCK } from '@/lib/source-metadata'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY tanımlı değil. .env.local dosyasına ekleyin.' },
      { status: 503 }
    )
  }

  try {
    const { caseText } = await request.json() as { caseText?: string }
    if (!caseText || typeof caseText !== 'string') {
      return NextResponse.json({ error: 'Vaka metni gerekli' }, { status: 400 })
    }

    const lawContext = await getLawDatabaseContext()
    const systemContent = buildSystemContentWithSources(
      CASE_ANALYSIS_SYSTEM_PROMPT,
      lawContext,
      DEFAULT_MEVZUAT_SOURCE_BLOCK
    )

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: `Aşağıdaki olayı yukarıdaki formata göre analiz et:\n\n${caseText}` },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    })

    const analysis = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!analysis) {
      return NextResponse.json({ error: 'Model analiz üretmedi' }, { status: 502 })
    }

    return NextResponse.json({ analysis })
  } catch (e) {
    console.error('Case API error:', e)
    if (e instanceof OpenAI.APIError) {
      const status = e.status ?? 500
      const message = e.message ?? 'OpenAI API hatası'
      return NextResponse.json({ error: message }, { status })
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
