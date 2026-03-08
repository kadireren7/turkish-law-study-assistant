/**
 * Mini Sözlü Yoklama API.
 * POST /api/oral-exam
 * Body: { topic: string, messages: { role: 'user'|'assistant', content: string }[] }
 * Returns: { reply: string }
 * Professor-style short oral questions; corrects and asks next; uses retrieval for topic.
 */
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getOralExamSystemContent, ORAL_EXAM_TOPICS, type OralExamTopicId } from '@/lib/oral-exam-prompt'
import { getRetrievalResult } from '@/lib/legal-brain'
import { getLawDatabaseContext } from '@/lib/law-database'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

const VALID_TOPICS = new Set<string>(ORAL_EXAM_TOPICS.map((t) => t.id));

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY tanımlı değil. .env.local dosyasına ekleyin.' },
      { status: 503 }
    )
  }

  try {
    const body = (await request.json()) as {
      topic?: string
      messages?: { role: 'user' | 'assistant'; content: string }[]
    }
    const topic = typeof body.topic === 'string' ? body.topic.trim().toLowerCase() : ''
    const messages = Array.isArray(body.messages) ? body.messages : []

    if (!topic || !VALID_TOPICS.has(topic)) {
      return NextResponse.json(
        { error: 'Geçerli bir konu seçin: ceza, medeni, borclar, anayasa, idare, karma' },
        { status: 400 }
      )
    }

    const topicLabel = ORAL_EXAM_TOPICS.find((t) => t.id === topic)?.label ?? topic
    const queryForRetrieval = `${topicLabel} temel kavramlar kurallar sözlü sınav`
    const retrieval = await getRetrievalResult(queryForRetrieval, openai, 6, {
      queryType: 'konu_anlatimi',
    })
    const lawContext =
      retrieval.lowConfidence || retrieval.context.length < 200
        ? await getLawDatabaseContext()
        : retrieval.context

    const systemContent = getOralExamSystemContent(topic as OralExamTopicId, lawContext)

    const openaiMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      { role: 'system', content: systemContent },
    ]

    if (messages.length === 0) {
      openaiMessages.push({
        role: 'user',
        content: 'Mini sözlü yoklamaya başlayalım. Yalnızca tek bir ilk soru sor; kavram veya kısa uygulama türünde, temel seviyede başla.',
      })
    } else {
      for (const m of messages.slice(-14)) {
        openaiMessages.push({ role: m.role, content: m.content })
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.35,
      max_tokens: 1024,
    })

    const reply = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!reply) {
      return NextResponse.json({ error: 'Yanıt üretilemedi' }, { status: 502 })
    }

    return NextResponse.json({ reply })
  } catch (e) {
    console.error('Oral exam API error:', e)
    if (e instanceof OpenAI.APIError) {
      const status = e.status ?? 500
      const message = e.message ?? 'OpenAI API hatası'
      return NextResponse.json({ error: message }, { status })
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
