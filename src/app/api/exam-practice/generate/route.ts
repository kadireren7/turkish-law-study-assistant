/**
 * POST /api/exam-practice/generate
 * Body: { topic: string, count?: number, questionType?, difficulty? }
 * Returns: { question: string } for count=1, or { questions: string[] } for count>1
 * Uses variation hints to reduce repetitive question patterns (fact pattern, conflict type, wording, depth).
 */
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { EXAM_QUESTION_GENERATOR_PROMPT } from '@/lib/exam-practice-prompt'
import { getLawDatabaseContextShort } from '@/lib/law-database'
import { buildSystemContentWithSources } from '@/lib/source-grounded'
import { DEFAULT_MEVZUAT_SOURCE_BLOCK } from '@/lib/source-metadata'
import { classifyQuery } from '@/lib/query-classifier'
import { getRandomVariationHints, buildVariationInstruction } from '@/lib/question-variation'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

const MAX_COUNT = 50
const BATCH_SIZE = 10 // max questions per single API call for speed

function getQuestionTypeInstruction(type: string): string {
  switch (type) {
    case 'olay':
      return 'Soru tipi: OLAY (vaka) sorusu; kısa senaryo + değerlendirme isteği.'
    case 'madde':
      return 'Soru tipi: MADDE sorusu; belirli kanun maddesinin açıklanması veya uygulanması.'
    case 'klasik':
      return 'Soru tipi: KLASİK (açık uçlu) soru; tanım, karşılaştırma veya kavram açıklaması.'
    case 'coktan':
      return 'Soru tipi: ÇOKTAN SEÇMELİ; soru metni + (A)(B)(C)(D) seçenekleri; doğru cevabı işaretle.'
    case 'dogruyanlis':
      return 'Soru tipi: DOĞRU / YANLIŞ; ifade ver, doğru mu yanlış mı değerlendirilsin.'
    case 'karma':
      return 'Soru tipi: KARMA; olay, madde ve klasik sorulardan karışık üret.'
    default:
      return 'Soru tipi: OLAY (vaka) sorusu.'
  }
}

function getDifficultyInstruction(diff: string): string {
  switch (diff) {
    case 'kolay':
      return 'Zorluk: Kolay; temel kavramlar, net olay.'
    case 'orta':
      return 'Zorluk: Orta; birkaç kural veya ayrım gerektirsin.'
    case 'zor':
      return 'Zorluk: Zor; öğretide tartışmalı veya birden fazla madde uygulaması gerektirsin.'
    case 'karisik':
    default:
      return 'Zorluk: Karışık; kolay, orta ve zor sorulardan seç.'
  }
}

function parseMultipleQuestions(text: string): string[] {
  const list: string[] = []
  const parts = text.split(/\n\s*(?:SORU\s*)?\d+[\.\):\s]+/i)
  for (const p of parts) {
    const trimmed = p.replace(/^SORU:\s*/i, '').trim()
    if (trimmed.length > 20) list.push(trimmed)
  }
  if (list.length > 0) return list
  // fallback: whole text as one question if no numbering
  const single = text.replace(/^SORU:\s*/i, '').trim()
  if (single.length > 20) return [single]
  return []
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
    const body = (await request.json()) as {
      topic?: string
      count?: number
      questionType?: string
      difficulty?: string
    }
    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    const count = Math.min(MAX_COUNT, Math.max(1, Math.floor(Number(body.count) || 1)))
    const questionType = (body.questionType ?? 'olay').toLowerCase()
    const difficulty = (body.difficulty ?? 'karisik').toLowerCase()

    if (!topic) {
      return NextResponse.json({ error: 'topic gerekli' }, { status: 400 })
    }

    const { queryType, confidence: classificationConfidence } = await classifyQuery(`Sınav sorusu üret: ${topic}`, openai)
    const lawContext = await getLawDatabaseContextShort()
    const systemContent = buildSystemContentWithSources(
      EXAM_QUESTION_GENERATOR_PROMPT,
      lawContext,
      DEFAULT_MEVZUAT_SOURCE_BLOCK
    )

    const typeInstruction = getQuestionTypeInstruction(questionType)
    const diffInstruction = getDifficultyInstruction(difficulty)
    const variationHints = getRandomVariationHints()
    const variationBlock = buildVariationInstruction(variationHints)

    if (count === 1) {
      const userContent = [
        `Şu konu için tek bir soru üret: "${topic}".`,
        typeInstruction,
        diffInstruction,
        `Varyasyon (bu soruda uygula): ${variationBlock}`,
        'Yanıtında sadece "SORU:" ile başlayıp soru metnini yaz.',
      ].join(' ')
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        temperature: 0.72,
        max_tokens: 1024,
      })

      let question = completion.choices[0]?.message?.content?.trim() ?? ''
      if (/^SORU:\s*/i.test(question)) question = question.replace(/^SORU:\s*/i, '').trim()
      if (!question) {
        return NextResponse.json({ error: 'Model soru üretemedi' }, { status: 502 })
      }
      return NextResponse.json({
        question,
        classification: { category: queryType, confidence: classificationConfidence },
      })
    }

    const allQuestions: string[] = []
    let remaining = count
    while (remaining > 0) {
      const want = Math.min(remaining, BATCH_SIZE)
      const batchVariation = getRandomVariationHints()
      const batchVariationBlock = buildVariationInstruction(batchVariation)
      const userContent = [
        `Şu konu için tam ${want} adet soru üret: "${topic}".`,
        typeInstruction,
        diffInstruction,
        `Önemli: Her soruda FARKLI olay türü, FARKLI hukuki çatışma ve FARKLI ifade tarzı kullan; tekrara düşme. Bu batch için örnek yön: ${batchVariationBlock}`,
        `Her soruyu "SORU 1:", "SORU 2:", ... diye numaralayıp sadece soru metnini yaz. Cevap veya açıklama ekleme.`,
      ].join(' ')
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        temperature: 0.78,
        max_tokens: want * 600,
      })

      const raw = completion.choices[0]?.message?.content?.trim() ?? ''
      const parsed = parseMultipleQuestions(raw)
      for (const q of parsed) {
        if (allQuestions.length < count) allQuestions.push(q)
      }
      remaining = count - allQuestions.length
      if (remaining <= 0 || parsed.length === 0) break
    }

    if (allQuestions.length === 0) {
      return NextResponse.json({ error: 'Model soru üretemedi' }, { status: 502 })
    }
    return NextResponse.json({
      questions: allQuestions.slice(0, count),
      topic,
      questionType,
      difficulty,
      classification: { category: queryType, confidence: classificationConfidence },
    })
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
