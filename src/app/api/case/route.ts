import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { CASE_ANALYSIS_SYSTEM_PROMPT } from '@/lib/case-analysis-prompt'
import { getRetrievalResult } from '@/lib/legal-brain'
import { getLawDatabaseContext } from '@/lib/law-database'
import { buildSystemContentWithSources, EXPLANATION_MODE_INSTRUCTIONS } from '@/lib/source-grounded'
import { getSourceMetadata, buildSourceTransparencyBlock, isFromGuncellemeler } from '@/lib/source-metadata'
import { DEFAULT_MEVZUAT_SOURCE_BLOCK } from '@/lib/source-metadata'
import { classifyQuery } from '@/lib/query-classifier'
import { confidenceFromRetrieval } from '@/lib/confidence'
import { TARTISMALI_KONU_CASE_INSTRUCTION } from '@/lib/viewpoints-prompt'
import { getLegalReasoningInstruction } from '@/lib/legal-reasoning'
import {
  inferRelevantLawFromFacts,
  buildEnrichedQueryForRetrieval,
  formatInferenceForPrompt,
} from '@/lib/fact-to-law-inference'

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
    const body = await request.json() as { caseText?: string; explanationMode?: 'ogrenci' | 'uyap' }
    const caseText = typeof body.caseText === 'string' ? body.caseText : ''
    const explanationMode = body.explanationMode === 'uyap' ? 'uyap' : 'ogrenci'

    if (!caseText.trim()) {
      return NextResponse.json({ error: 'Vaka metni gerekli' }, { status: 400 })
    }

    const queryForClassification = caseText.slice(0, 1500)
    const { queryType, confidence: classificationConfidence } = await classifyQuery(queryForClassification, openai)
    const caseSlice = caseText.slice(0, 3000)
    const inference = await inferRelevantLawFromFacts(caseSlice, openai)
    const enrichedQuery = buildEnrichedQueryForRetrieval(caseSlice, inference)
    const retrieval = await getRetrievalResult(enrichedQuery, openai, 10, { queryType })
    const lawContext =
      retrieval.lowConfidence || retrieval.context.length < 300
        ? await getLawDatabaseContext()
        : retrieval.context
    let sourceBlock = DEFAULT_MEVZUAT_SOURCE_BLOCK
    if (!retrieval.lowConfidence && retrieval.sources.length > 0) {
      const metadata = await getSourceMetadata(retrieval.sources)
      sourceBlock = buildSourceTransparencyBlock(metadata, isFromGuncellemeler(retrieval.sources))
    }
    let systemContent = buildSystemContentWithSources(
      CASE_ANALYSIS_SYSTEM_PROMPT,
      lawContext,
      sourceBlock
    )
    const inferenceBlock = formatInferenceForPrompt(inference)
    if (inferenceBlock) systemContent += '\n\n' + inferenceBlock
    systemContent += EXPLANATION_MODE_INSTRUCTIONS[explanationMode]
    if (explanationMode === 'uyap') {
      systemContent += '\n\n' + getLegalReasoningInstruction({ formalMode: true })
    }
    if (queryType === 'tartismali_konu') {
      systemContent += `\n\n${TARTISMALI_KONU_CASE_INSTRUCTION}`
    }

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

    const answerConfidence = confidenceFromRetrieval(retrieval, queryType)
    return NextResponse.json({
      analysis,
      confidence: answerConfidence,
      classification: { category: queryType, confidence: classificationConfidence },
    })
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
