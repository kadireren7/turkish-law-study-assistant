/**
 * POST /api/exam-practice/evaluate
 * Body: { question: string, userAnswer: string, topic?: string }
 * Returns: { score: number, feedback: string, strongPoints?: string[], improvePoints?: string[], summary?: string }
 */
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { EXAM_EVALUATOR_PROMPT } from '@/lib/exam-practice-prompt'
import { getLawDatabaseContext } from '@/lib/law-database'
import { buildSystemContentWithSources } from '@/lib/source-grounded'
import { DEFAULT_MEVZUAT_SOURCE_BLOCK } from '@/lib/source-metadata'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

function parseEvaluation(text: string): {
  score: number
  feedback: string
  strongPoints: string[]
  improvePoints: string[]
  howToImprove: string
  summary: string
} {
  const result = {
    score: 0,
    feedback: text,
    strongPoints: [] as string[],
    improvePoints: [] as string[],
    howToImprove: '',
    summary: '',
  }

  const puanMatch = text.match(/\*\*PUAN:\*\*\s*(\d+)/i)
  if (puanMatch) result.score = Math.min(100, Math.max(0, parseInt(puanMatch[1], 10)))

  const strongMatch = text.match(/\*\*GÜÇLÜ YÖNLER:\*\*[\s\S]*?(?=\*\*[A-ZĞİÖÜŞ]|$)/i)
  if (strongMatch) {
    const block = strongMatch[0].replace(/\*\*GÜÇLÜ YÖNLER:\*\*/i, '').trim()
    result.strongPoints = block.split(/\n[-*•]\s*/).map((s) => s.trim()).filter(Boolean)
  }

  const improveMatch = text.match(/\*\*EKSİKLER[^*]*:?\s*\n([\s\S]*?)(?=\n\s*\*\*[A-ZĞİÖÜŞ]|$)/i)
  if (improveMatch && improveMatch[1]) {
    const block = improveMatch[1].trim()
    result.improvePoints = block.split(/\n[-*•]\s*/).map((s) => s.trim()).filter(Boolean)
  }

  const howMatch = text.match(/\*\*NASIL DAHA İYİ YAZILIR:\*\*[\s\S]*?(?=\n\s*\*\*[A-ZĞİÖÜŞ]|$)/i)
  if (howMatch) {
    result.howToImprove = howMatch[0].replace(/\*\*NASIL DAHA İYİ YAZILIR:\*\*/i, '').trim()
  }

  const summaryMatch = text.match(/\*\*KISA ÖZET:\*\*[\s\S]*?(?=\*\*|$)/i)
  if (summaryMatch) {
    result.summary = summaryMatch[0].replace(/\*\*KISA ÖZET:\*\*/i, '').trim()
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
    const body = await request.json() as { question?: string; userAnswer?: string; topic?: string }
    const question = typeof body.question === 'string' ? body.question.trim() : ''
    const userAnswer = typeof body.userAnswer === 'string' ? body.userAnswer.trim() : ''

    if (!question || !userAnswer) {
      return NextResponse.json(
        { error: 'question ve userAnswer gerekli' },
        { status: 400 }
      )
    }

    const lawContext = await getLawDatabaseContext()
    const systemContent = buildSystemContentWithSources(
      EXAM_EVALUATOR_PROMPT,
      lawContext,
      DEFAULT_MEVZUAT_SOURCE_BLOCK
    )

    const userContent = `SORU:\n${question}\n\nÖĞRENCİ CEVABI:\n${userAnswer}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!raw) {
      return NextResponse.json({ error: 'Model yanıt vermedi' }, { status: 502 })
    }

    const parsed = parseEvaluation(raw)
    return NextResponse.json({
      score: parsed.score,
      feedback: raw,
      strongPoints: parsed.strongPoints.length ? parsed.strongPoints : undefined,
      improvePoints: parsed.improvePoints.length ? parsed.improvePoints : undefined,
      howToImprove: parsed.howToImprove || undefined,
      summary: parsed.summary || undefined,
    })
  } catch (e) {
    console.error('Exam evaluate API error:', e)
    if (e instanceof OpenAI.APIError) {
      const status = e.status ?? 500
      const message = e.message ?? 'OpenAI API hatası'
      return NextResponse.json({ error: message }, { status })
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
