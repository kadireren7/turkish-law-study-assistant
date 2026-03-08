import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { QUIZ_GENERATOR_SYSTEM_PROMPT } from '@/lib/quiz-prompt'
import { getLawDatabaseContext } from '@/lib/law-database'
import { buildSystemContentWithSources } from '@/lib/source-grounded'
import { DEFAULT_MEVZUAT_SOURCE_BLOCK } from '@/lib/source-metadata'
import { getQuizVariationHints, buildQuizVariationInstruction } from '@/lib/question-variation'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

export type QuizQuestion = {
  question: string
  options: string[]
  correct: string
  explanation: string
}

function parseQuizJson(raw: string, maxQuestions: number): QuizQuestion[] {
  let text = raw.trim()
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) text = codeBlock[1].trim()
  const parsed = JSON.parse(text) as unknown
  if (!Array.isArray(parsed)) throw new Error('Expected JSON array')
  const result: QuizQuestion[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const q = item as Record<string, unknown>
    const question = typeof q.question === 'string' ? q.question : ''
    const options = Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === 'string') : []
    const correct = typeof q.correct === 'string' ? q.correct : ''
    const explanation = typeof q.explanation === 'string' ? q.explanation : ''
    if (question && options.length >= 2 && correct) {
      result.push({
        question,
        options: options.length === 4 ? options : [...options.slice(0, 4)],
        correct,
        explanation,
      })
    }
  }
  return result.slice(0, maxQuestions)
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
    const body = (await request.json()) as { topic?: string; count?: number }
    const { topic, count: requestedCount } = body
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Konu gerekli' }, { status: 400 })
    }
    const count = Math.min(20, Math.max(3, Number(requestedCount) || 5))

    const lawContext = await getLawDatabaseContext()
    const systemContent = buildSystemContentWithSources(
      QUIZ_GENERATOR_SYSTEM_PROMPT,
      lawContext,
      DEFAULT_MEVZUAT_SOURCE_BLOCK
    )

    const variationHints = getQuizVariationHints()
    const variationBlock = buildQuizVariationInstruction(variationHints, count)
    const userContent = `Şu hukuk konusu için ${count} çoktan seçmeli soru üret: "${topic}". ${variationBlock} Yanıtını sadece JSON dizisi olarak ver.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      temperature: 0.6,
      max_tokens: count <= 5 ? 4096 : count <= 10 ? 8192 : 16384,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!raw) {
      return NextResponse.json({ error: 'Model yanıt vermedi' }, { status: 502 })
    }

    const questions = parseQuizJson(raw, count)
    if (questions.length === 0) {
      return NextResponse.json({ error: 'Model yanıtından sorular ayrıştırılamadı' }, { status: 502 })
    }

    return NextResponse.json({ questions })
  } catch (e) {
    console.error('Quiz API error:', e)
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
