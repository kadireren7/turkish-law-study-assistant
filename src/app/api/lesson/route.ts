/**
 * Law lesson API: explains a topic in the chosen law subject (professor-style, Konu Anlatımı).
 * Uses shared legal-brain retrieval so only relevant sources are injected.
 * POST /api/lesson
 * Body: { subject: string, topic: string }
 * Returns: { content: string }
 */
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getLessonSystemPrompt } from '@/lib/lesson-prompt'
import { getRetrievalResult } from '@/lib/legal-brain'
import { getLawDatabaseContext } from '@/lib/law-database'
import { buildSystemContentWithSources, EXPLANATION_MODE_INSTRUCTIONS } from '@/lib/source-grounded'
import { getSourceMetadata, buildSourceTransparencyBlock, isFromGuncellemeler } from '@/lib/source-metadata'
import { classifyQuery } from '@/lib/query-classifier'
import { confidenceFromRetrieval } from '@/lib/confidence'
import { TARTISMALI_KONU_LESSON_INSTRUCTION } from '@/lib/viewpoints-prompt'
import { IRAC_TEMPLATE, LEGAL_REASONING_NO_FABRICATION } from '@/lib/legal-reasoning'

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
    const body = await request.json() as { subject?: string; topic?: string; explanationMode?: 'ogrenci' | 'uyap' }
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    const explanationMode = body.explanationMode === 'uyap' ? 'uyap' : 'ogrenci'

    if (!subject || !topic) {
      return NextResponse.json(
        { error: 'subject ve topic alanları gerekli' },
        { status: 400 }
      )
    }

    const query = `${subject} ${topic}`
    const { queryType, confidence: classificationConfidence } = await classifyQuery(query, openai)
    const retrieval = await getRetrievalResult(query, openai, 6, { queryType })
    const lawContext = retrieval.lowConfidence || retrieval.context.length < 200
      ? await getLawDatabaseContext()
      : retrieval.context
    const systemPrompt = getLessonSystemPrompt(subject)
    let sourceBlock = ''
    if (!retrieval.lowConfidence && retrieval.sources.length > 0) {
      const metadata = await getSourceMetadata(retrieval.sources)
      sourceBlock = buildSourceTransparencyBlock(metadata, isFromGuncellemeler(retrieval.sources))
    }
    let systemContent = buildSystemContentWithSources(
      systemPrompt,
      lawContext,
      sourceBlock || undefined
    )
    systemContent += EXPLANATION_MODE_INSTRUCTIONS[explanationMode]
    systemContent += `\n\nSINAVDA NASIL YAZILIR BÖLÜMÜ İÇİN REFERANS (IRAC usulü):\n${IRAC_TEMPLATE}\n${LEGAL_REASONING_NO_FABRICATION}`
    if (queryType === 'tartismali_konu') {
      systemContent += `\n\n${TARTISMALI_KONU_LESSON_INSTRUCTION}`
    }

    const toneHint = explanationMode === 'uyap'
      ? 'UYAP/Resmî: "ilgili", "madde uyarınca" ile resmî hitap; I-II-III veya 1. 2. 3. numaralı başlıklar; madde atıfı tam (örn. 6098 sayılı Kanun m. 49 uyarınca). Günlük dil ve "sen" kullanma.'
      : 'Öğrenci dostu: "sen" hitabı, "dikkat et", "sınavda şöyle yaz", "yani" ile sade Türkçe; kısa cümleler, örneklerle açıklama.'
    const userContent = `Şu konuyu anlat: "${topic}". Yukarıdaki zorunlu konu anlatımı yapısına tam ve sırayla uygun bir ders metni yaz. Başlıklar: (1) Konunun özeti, (2) Temel kavramlar, (3) Kurallar / ilkeler, (4) Önemli ayrımlar, (5) Örnek olay, (6) Sınavda nasıl yazılır, (7) Farklı bakış açıları / öğretide farklı görüşler, (8) Kullanılan kaynak. Dil: ${toneHint}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    })

    const content = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!content) {
      return NextResponse.json({ error: 'Model yanıt vermedi' }, { status: 502 })
    }

    const answerConfidence = confidenceFromRetrieval(retrieval, queryType)
    return NextResponse.json({
      content,
      confidence: answerConfidence,
      classification: { category: queryType, confidence: classificationConfidence },
    })
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
