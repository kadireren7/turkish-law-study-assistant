/**
 * POST /api/exam-practice/generate
 * Body: { topic: string }
 * Returns: { question: string }
 */
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { EXAM_QUESTION_GENERATOR_PROMPT } from '@/lib/exam-practice-prompt'
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
    const body = await request.json() as { topic?: string }
    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    if (!topic) {
      return NextResponse.json({ error: 'topic gerekli' }, { status: 400 })
    }

    const lawContext = await getLawDatabaseContext()
    const systemContent = buildSystemContentWithSources(
      EXAM_QUESTION_GENERATOR_PROMPT,
      lawContext,
      DEFAULT_MEVZUAT_SOURCE_BLOCK
    )

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: `Şu konu için tek bir sınav sorusu üret: "${topic}". Yanıtında sadece "SORU:" ile başlayıp soru metnini yaz.` },
      ],
      temperature: 0.6,
      max_tokens: 1024,
    })

    let question = completion.choices[0]?.message?.content?.trim() ?? ''
    const prefix = /^SORU:\s*/i
    if (prefix.test(question)) question = question.replace(prefix, '').trim()
    if (!question) {
      return NextResponse.json({ error: 'Model soru üretemedi' }, { status: 502 })
    }

    return NextResponse.json({ question })
  } catch (e) {
    console.error('Exam generate API error:', e)
    if (e instanceof OpenAI.APIError) {
      const status = e.status ?? 500
      const message = e.message ?? 'OpenAI API hatası'
      return NextResponse.json({ error: message }, { status })
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
