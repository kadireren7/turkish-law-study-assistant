import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { FLASHCARDS_SYSTEM_PROMPT } from '@/lib/flashcards-prompt'
import { getLawDatabaseContext } from '@/lib/law-database'
import { buildSystemContentWithSources } from '@/lib/source-grounded'
import { DEFAULT_MEVZUAT_SOURCE_BLOCK } from '@/lib/source-metadata'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

export type Flashcard = { front: string; back: string }

function parseFlashcardsJson(raw: string): Flashcard[] {
  let text = raw.trim()
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) text = codeBlock[1].trim()
  const parsed = JSON.parse(text) as unknown
  if (!Array.isArray(parsed)) throw new Error('Expected JSON array')
  const result: Flashcard[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const c = item as Record<string, unknown>
    const front = typeof c.front === 'string' ? c.front.trim() : ''
    const back = typeof c.back === 'string' ? c.back.trim() : ''
    if (front && back) result.push({ front, back })
  }
  return result
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY tanımlı değil. .env.local dosyasına ekleyin.' },
      { status: 503 }
    )
  }

  try {
    const { topic } = (await request.json()) as { topic?: string }
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Konu gerekli' }, { status: 400 })
    }

    const lawContext = await getLawDatabaseContext()
    const systemContent = buildSystemContentWithSources(
      FLASHCARDS_SYSTEM_PROMPT,
      lawContext,
      DEFAULT_MEVZUAT_SOURCE_BLOCK
    )

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: `Şu hukuk konusu için soru-cevap flashcard'ları üret: "${topic}". Yanıtını sadece JSON dizisi olarak ver (her öğe {"front": "soru", "back": "cevap"}).` },
      ],
      temperature: 0.5,
      max_tokens: 4096,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!raw) {
      return NextResponse.json({ error: 'Model yanıt vermedi' }, { status: 502 })
    }

    const cards = parseFlashcardsJson(raw)
    if (cards.length === 0) {
      return NextResponse.json({ error: 'Model yanıtından kartlar ayrıştırılamadı' }, { status: 502 })
    }

    return NextResponse.json({ cards })
  } catch (e) {
    console.error('Flashcards API error:', e)
    if (e instanceof OpenAI.APIError) {
      const status = e.status ?? 500
      const message = e.message ?? 'OpenAI API hatası'
      return NextResponse.json({ error: message }, { status })
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: 'Model yanıtı geçersiz formatta' }, { status: 502 })
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
