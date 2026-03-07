/**
 * Law lesson API: explains a topic in the chosen law subject (professor-style, simple language).
 * POST /api/lesson
 * Body: { subject: string, topic: string }
 * Returns: { content: string }
 */
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getLessonSystemPrompt } from '@/lib/lesson-prompt'
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
    const body = await request.json() as { subject?: string; topic?: string }
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''

    if (!subject || !topic) {
      return NextResponse.json(
        { error: 'subject ve topic alanları gerekli' },
        { status: 400 }
      )
    }

    const lawContext = await getLawDatabaseContext()
    const systemPrompt = getLessonSystemPrompt(subject)
    const systemContent = buildSystemContentWithSources(
      systemPrompt,
      lawContext,
      DEFAULT_MEVZUAT_SOURCE_BLOCK
    )

    const userContent = `Şu konuyu anlat: "${topic}". Yukarıdaki ders yapısına (Tanım, İlgili kanun maddesi, Açıklama, Örnek olay, Sınav notu) uygun, sade ve öğretici bir ders metni yaz.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 2048,
    })

    const content = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!content) {
      return NextResponse.json({ error: 'Model yanıt vermedi' }, { status: 502 })
    }

    return NextResponse.json({ content })
  } catch (e) {
    console.error('Lesson API error:', e)
    if (e instanceof OpenAI.APIError) {
      const status = e.status ?? 500
      const message = e.message ?? 'OpenAI API hatası'
      return NextResponse.json({ error: message }, { status })
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
