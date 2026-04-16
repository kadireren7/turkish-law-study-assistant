import { NextResponse } from 'next/server'
import { QUIZ_GENERATOR_SYSTEM_PROMPT } from '@/lib/quiz-prompt'
import { getLawDatabaseContext } from '@/lib/law-database'
import { buildSystemContentWithSources } from '@/lib/source-grounded'
import { DEFAULT_MEVZUAT_SOURCE_BLOCK } from '@/lib/source-metadata'
import { getQuizVariationHints, buildQuizVariationInstruction } from '@/lib/question-variation'
import { getOpenAI, getMissingKeyMessage, handleOpenAIError } from '@/lib/openai'
import { validateBodySize, validateTextLength, LIMITS } from '@/lib/validate-input'

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

function normalizeQuizQuestion(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqueQuizQuestions(input: QuizQuestion[]): QuizQuestion[] {
  const seen = new Set<string>()
  const out: QuizQuestion[] = []
  for (const q of input) {
    const key = normalizeQuizQuestion(q.question)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(q)
  }
  return out
}

export async function POST(request: Request) {
  const sizeCheck = validateBodySize(request)
  if (!sizeCheck.ok) return NextResponse.json({ error: sizeCheck.error }, { status: sizeCheck.status })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: getMissingKeyMessage() },
      { status: 503 }
    )
  }

  const openai = getOpenAI()

  try {
    const body = (await request.json()) as { topic?: string; count?: number; difficulty?: string }
    const { topic, count: requestedCount, difficulty: difficultyParam } = body
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Konu gerekli' }, { status: 400 })
    }
    const topicCheck = validateTextLength(topic, LIMITS.quizTopic, 'Konu')
    if (!topicCheck.ok) return NextResponse.json({ error: topicCheck.error }, { status: topicCheck.status })
    const count = Math.min(20, Math.max(3, Number(requestedCount) || 5))
    const difficulty = ['kolay', 'orta', 'zor', 'karisik'].includes(String(difficultyParam).toLowerCase())
      ? String(difficultyParam).toLowerCase()
      : 'karisik'

    const lawContext = await getLawDatabaseContext()
    const systemContent = buildSystemContentWithSources(
      QUIZ_GENERATOR_SYSTEM_PROMPT,
      lawContext,
      DEFAULT_MEVZUAT_SOURCE_BLOCK
    )

    const difficultyLine =
      difficulty === 'kolay'
        ? 'Zorluk: Kolay; temel kavramlar, net sorular.'
        : difficulty === 'orta'
          ? 'Zorluk: Orta; birkaç kural veya ayrım gerektirsin.'
          : difficulty === 'zor'
            ? 'Zorluk: Zor; tartışmalı noktalar veya birden fazla madde uygulaması.'
            : 'Zorluk: Karışık; kolay, orta ve zor sorulardan seç.'

    const questions: QuizQuestion[] = []
    let attempts = 0
    while (questions.length < count && attempts < 4) {
      attempts += 1
      const need = count - questions.length
      const batch = Math.min(need, 5)
      const variationHints = getQuizVariationHints()
      const variationBlock = buildQuizVariationInstruction(variationHints, batch)
      const avoidBlock = questions.length
        ? `Şu soru gövdelerine benzer soru üretme: ${questions.slice(-6).map((q) => q.question).join(' | ')}`
        : ''
      const userContent =
        `Şu hukuk konusu için ${batch} çoktan seçmeli soru üret: "${topic}". ${difficultyLine} ${variationBlock} ${avoidBlock} ` +
        'Kurallar: Her soru farklı olay/kural üstünden gelsin; tekrar kalıbı kullanma. Yalnızca JSON dizisi ver.'

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        temperature: 0.55,
        max_tokens: 2800,
      })

      const raw = completion.choices[0]?.message?.content?.trim() ?? ''
      if (!raw) continue
      let parsed: QuizQuestion[] = []
      try {
        parsed = parseQuizJson(raw, batch)
      } catch {
        continue
      }
      const merged = uniqueQuizQuestions([...questions, ...parsed])
      questions.length = 0
      questions.push(...merged.slice(0, count))
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: 'Model yanıtından sorular ayrıştırılamadı' }, { status: 502 })
    }

    return NextResponse.json({ questions })
  } catch (e) {
    console.error('Quiz API error:', e)
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: 'Model yanıtı geçersiz formatta' }, { status: 502 })
    }
    const { status, message } = handleOpenAIError(e)
    return NextResponse.json({ error: message }, { status })
  }
}
