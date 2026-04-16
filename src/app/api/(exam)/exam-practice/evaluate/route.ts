/**
 * POST /api/exam-practice/evaluate
 * Body: { question: string, userAnswer: string, topic?: string }
 * Returns: { score, feedback, confidence?, ... }
 * Uses retrieval on question for source-backed feedback and answer confidence.
 */
import { NextResponse } from 'next/server'
import { EXAM_EVALUATOR_PROMPT } from '@/lib/exam-practice-prompt'
import { IRAC_TEMPLATE } from '@/lib/legal-reasoning'
import { getRetrievalResult } from '@/lib/legal-brain'
import { getLawDatabaseContext } from '@/lib/law-database'
import { buildSystemContentWithSources, EXPLANATION_MODE_INSTRUCTIONS } from '@/lib/source-grounded'
import { getSourceMetadata, buildSourceTransparencyBlock, isFromGuncellemeler } from '@/lib/source-metadata'
import { DEFAULT_MEVZUAT_SOURCE_BLOCK } from '@/lib/source-metadata'
import { classifyQuery } from '@/lib/query-classifier'
import {
  inferRelevantLawFromFacts,
  buildEnrichedQueryForRetrieval,
  formatInferenceForPrompt,
} from '@/lib/fact-to-law-inference'
import { confidenceFromRetrieval } from '@/lib/confidence'
import { deriveMistakeTags, inferNextDifficulty, type PracticeDifficulty } from '@/lib/practice-adaptive'
import { getOpenAI, getMissingKeyMessage, handleOpenAIError } from '@/lib/openai'
import { validateBodySize, validateTextLength, LIMITS } from '@/lib/validate-input'
import { searchWeb, isWebSearchAvailable, formatWebSearchContext } from '@/lib/web-search'
import { requiresLiveData } from '@/lib/live-data-classifier'
import { isNonEvaluableAnswer } from '@/lib/answer-quality'

function parseEvaluation(text: string): {
  score: number
  feedback: string
  generalAssessment: string
  strongPoints: string[]
  improvePoints: string[]
  legalErrors: string[]
  missedPoints: string[]
  suggestionForHigherGrade: string
  exampleSkeleton: string
  problemIdentification: string
  ruleApplication: string
  howToImprove: string
  summary: string
} {
  const result = {
    score: 0,
    feedback: text,
    generalAssessment: '',
    strongPoints: [] as string[],
    improvePoints: [] as string[],
    legalErrors: [] as string[],
    missedPoints: [] as string[],
    suggestionForHigherGrade: '',
    exampleSkeleton: '',
    problemIdentification: '',
    ruleApplication: '',
    howToImprove: '',
    summary: '',
  }

  const puanMatch = text.match(/\*\*PUAN:\*\*\s*(\d+)/i)
  if (puanMatch) result.score = Math.min(100, Math.max(0, parseInt(puanMatch[1], 10)))

  const section = (heading: string): string => {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\*\\*${escaped}\\*\\*:?\\s*([\\s\\S]*?)(?=\\n\\s*\\*\\*|$)`, 'i')
    const m = text.match(re)
    return m ? m[1].trim() : ''
  }

  const sectionList = (heading: string): string[] => {
    const block = section(heading)
    if (!block) return []
    return block.split(/\n[-*•]\s*/).map((s) => s.trim()).filter(Boolean)
  }

  result.generalAssessment = section('GENEL DEĞERLENDİRME')
  result.strongPoints = sectionList('GÜÇLÜ YÖNLER')
  if (result.strongPoints.length === 0) {
    const alt = text.match(/\*\*DOĞRU NOKTALAR:\*\*[\s\S]*?(?=\*\*[A-ZĞİÖÜŞ]|$)/i)
    if (alt) {
      const block = alt[0].replace(/\*\*DOĞRU NOKTALAR:\*\*/gi, '').trim()
      result.strongPoints = block.split(/\n[-*•]\s*/).map((s) => s.trim()).filter(Boolean)
    }
  }

  result.improvePoints = sectionList('EKSİKLER')
  result.legalErrors = sectionList('HUKUKİ HATALAR')
  result.missedPoints = sectionList('ATLANAN NOKTALAR')
  result.suggestionForHigherGrade =
      section('SINAVDA DAHA YÜKSEK NOT İÇİN ÖNERİ') ||
      section('SINAVDA DAHA İYİ NASIL YAZILIR') ||
      section('SINAVDA DAHA YÜKSEK NOT İÇİN ÖNERİ / SINAVDA DAHA İYİ NASIL YAZILIR')
  result.exampleSkeleton =
    section('ÖRNEK GÜÇLÜ CEVAP İSKELETİ') || section('ÖRNEK DAHA İYİ CEVAP İSKELETİ')

  result.problemIdentification = section('HUKUKİ SORUN TESPİTİ')
  result.ruleApplication = section('DOĞRU KURAL UYGULAMASI')
  result.howToImprove = section('NASIL DAHA İYİ YAZILIR') || result.suggestionForHigherGrade
  result.summary = section('GENEL DEĞERLENDİRME') || section('KISA ÖZET')
  if (!result.summary && result.generalAssessment) result.summary = result.generalAssessment
  if (!result.summary) {
    const kisa = text.match(/\*\*KISA ÖZET:\*\*[\s\S]*?(?=\*\*|$)/i)
    if (kisa) result.summary = kisa[0].replace(/\*\*KISA ÖZET:\*\*/i, '').trim()
  }

  return result
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
    const body = await request.json() as {
      question?: string
      userAnswer?: string
      topic?: string
      explanationMode?: 'ogrenci' | 'uyap'
      scenario?: string
      currentDifficulty?: PracticeDifficulty
    }
    const question = typeof body.question === 'string' ? body.question.trim() : ''
    const userAnswer = typeof body.userAnswer === 'string' ? body.userAnswer.trim() : ''
    const explanationMode = body.explanationMode === 'uyap' ? 'uyap' : 'ogrenci'
    const scenario = typeof body.scenario === 'string' ? body.scenario.trim() : ''
    const currentDifficulty: PracticeDifficulty =
      body.currentDifficulty === 'kolay' || body.currentDifficulty === 'orta' || body.currentDifficulty === 'zor' || body.currentDifficulty === 'karisik'
        ? body.currentDifficulty
        : 'karisik'

    if (!question || !userAnswer) {
      return NextResponse.json(
        { error: 'question ve userAnswer gerekli' },
        { status: 400 }
      )
    }

    if (isNonEvaluableAnswer(userAnswer)) {
      const feedback = `**PUAN:** 0

**GENEL DEĞERLENDİRME:**
Bu metin hukuk sınavı cevabı olarak değerlendirilemez. Anlamlı Türkçe cümle, olay özeti veya IRAC (sorun–kural–uygulama–sonuç) yapısı görülmüyor; rastgele karakter veya anlamsız giriş olarak değerlendirildi.

**GÜÇLÜ YÖNLER:**
- Bu cevapta belirgin güçlü yön tespit edilmedi.

**EKSİKLER:**
- Soruya yönelik hukukî analiz yok.
- Yapı, kavram ve madde atfı yok.

**HUKUKİ HATALAR:**
- Değerlendirilebilir hukukî argüman üretilmemiş.

**ATLANAN NOKTALAR:**
- Sorunun gerektirdiği tüm unsurlar eksik.

**SINAVDA DAHA YÜKSEK NOT İÇİN ÖNERİ:**
Soruyu ve varsa senaryoyu okuyun; kısa olay özeti, hukuki sorun, ilgili kural (kaynaklı), uygulama ve sonuç yazın. Tek cümlede dahi olsa Türkçe ve hukuk terimleri kullanın.

**ÖRNEK GÜÇLÜ CEVAP İSKELETİ:**
1) Olay / sorun  2) İlgili norm  3) Olaya uygulama  4) Sonuç

**Önemli:** Geri bildirimde yalnızca yukarıdaki öğrenci metnine dayanın; metinde olmayan olay veya kişi uydurmayın.`
      return NextResponse.json({
        score: 0,
        feedback,
        generalAssessment: 'Cevap değerlendirmeye uygun değil (anlamsız veya çok eksik).',
        strongPoints: ['Bu cevapta belirgin güçlü yön tespit edilmedi.'],
        improvePoints: ['Hukukî analiz ve IRAC yapısı ekleyin.'],
        legalErrors: ['Değerlendirilebilir hukukî argüman yok.'],
        missedPoints: ['Sorunun tüm unsurları atlanmış.'],
        suggestionForHigherGrade: 'Somut olay özeti ve madde atıflı IRAC yazın.',
        exampleSkeleton: 'Olay → Hukuki sorun → Kural → Uygulama → Sonuç',
        problemIdentification: '',
        ruleApplication: '',
        howToImprove: 'Anlamlı Türkçe ile yeniden yazın.',
        summary: 'Puan 0: değerlendirilebilir cevap yok.',
        confidence: 'dusuk',
        mistakeTags: deriveMistakeTags({
          score: 0,
          improvePoints: ['Yapı ve içerik eksik'],
          legalErrors: ['Argüman yok'],
          missedPoints: ['Tümü'],
        }),
        nextDifficulty: inferNextDifficulty(0, currentDifficulty),
        classification: { category: 'sinav_pratigi', confidence: 'yuksek' },
      })
    }
    const qCheck = validateTextLength(question, LIMITS.examQuestion, 'Soru')
    if (!qCheck.ok) return NextResponse.json({ error: qCheck.error }, { status: qCheck.status })
    const aCheck = validateTextLength(userAnswer, LIMITS.examAnswer, 'Cevap')
    if (!aCheck.ok) return NextResponse.json({ error: aCheck.error }, { status: aCheck.status })
    if (scenario) {
      const sCheck = validateTextLength(scenario, LIMITS.examScenario, 'Senaryo')
      if (!sCheck.ok) return NextResponse.json({ error: sCheck.error }, { status: sCheck.status })
    }

    const { queryType, confidence: classificationConfidence } = await classifyQuery(question.slice(0, 600), openai)
    const questionSlice = question.slice(0, 2500)
    const inference = await inferRelevantLawFromFacts(questionSlice, openai)
    const enrichedQuery = buildEnrichedQueryForRetrieval(questionSlice, inference)
    const retrieval = await getRetrievalResult(enrichedQuery, openai, 6, { queryType: queryType ?? 'sinav_pratigi' })
    const lawContext =
      retrieval.lowConfidence || retrieval.context.length < 200
        ? await getLawDatabaseContext()
        : retrieval.context
    let sourceBlock = DEFAULT_MEVZUAT_SOURCE_BLOCK
    if (!retrieval.lowConfidence && retrieval.sources.length > 0) {
      const metadata = await getSourceMetadata(retrieval.sources)
      sourceBlock = buildSourceTransparencyBlock(metadata, isFromGuncellemeler(retrieval.sources))
    }
    let systemContent = buildSystemContentWithSources(
      EXAM_EVALUATOR_PROMPT,
      lawContext,
      sourceBlock
    )
    let sourcesUsed: string[] = []
    if (isWebSearchAvailable() && (requiresLiveData(question) || requiresLiveData(body.topic ?? ''))) {
      const webResults = await searchWeb(`${body.topic ?? ''} ${question}`.trim())
      if (webResults.length > 0) {
        systemContent += `\n\n${formatWebSearchContext(webResults)}\n\nWEB GÜNCELLİK KURALI: Değerlendirmede güncel iddiaları bu web bloklarıyla doğrula; doğrulanmayan güncel iddiaları "belirsiz" olarak işaretle.`
        sourcesUsed = webResults.slice(0, 5).map((w) => w.url)
      }
    }
    systemContent += `\n\nHUKUKİ MANTIK (değerlendirme referansı):\n${IRAC_TEMPLATE}\n\nÖğrenci cevabını yukarıdaki beş boyuta (sorun tespiti, kural seçimi, uygulama, sonuç, yazım gücü) ve IRAC sırasına göre değerlendir.`
    systemContent += EXPLANATION_MODE_INSTRUCTIONS[explanationMode]
    const inferenceBlock = formatInferenceForPrompt(inference)
    if (inferenceBlock) systemContent += '\n\n' + inferenceBlock
    systemContent += '\n\nGeri bildirim (GENEL DEĞERLENDİRME, GÜÇLÜ YÖNLER, EKSİKLER, HUKUKİ HATALAR, ATLANAN NOKTALAR, PUAN, SINAVDA DAHA YÜKSEK NOT İÇİN ÖNERİ, ÖRNEK GÜÇLÜ CEVAP İSKELETİ) yukarıdaki açıklama moduna göre ver: Öğrenci Dostu ise sade ve yapıcı dil; UYAP ise resmî, yapısal ifade. Soruda olaydan çıkarılan dallar ve normlar verildiyse, öğrencinin bu dalları ve normları doğru tespit edip uygulamasını puanlamada artı say; atlamasını eksiklik say.'

    const userContent = scenario
      ? `SENARYO (bağlam):\n${scenario.slice(0, 3000)}\n\nALT SORU:\n${question}\n\nÖĞRENCİ CEVABI:\n${userAnswer}`
      : `SORU:\n${question}\n\nÖĞRENCİ CEVABI:\n${userAnswer}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      temperature: 0.28,
      max_tokens: 1400,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!raw) {
      return NextResponse.json({ error: 'Model yanıt vermedi' }, { status: 502 })
    }

    const parsed = parseEvaluation(raw)
    const answerConfidence = confidenceFromRetrieval(retrieval, queryType)
    const mistakeTags = deriveMistakeTags({
      score: parsed.score,
      improvePoints: parsed.improvePoints,
      legalErrors: parsed.legalErrors,
      missedPoints: parsed.missedPoints,
    })
    const nextDifficulty = inferNextDifficulty(parsed.score, currentDifficulty)
    return NextResponse.json({
      score: parsed.score,
      feedback: raw,
      generalAssessment: parsed.generalAssessment || undefined,
      strongPoints: parsed.strongPoints.length ? parsed.strongPoints : undefined,
      improvePoints: parsed.improvePoints.length ? parsed.improvePoints : undefined,
      legalErrors: parsed.legalErrors.length ? parsed.legalErrors : undefined,
      missedPoints: parsed.missedPoints.length ? parsed.missedPoints : undefined,
      suggestionForHigherGrade: parsed.suggestionForHigherGrade || undefined,
      exampleSkeleton: parsed.exampleSkeleton || undefined,
      problemIdentification: parsed.problemIdentification || undefined,
      ruleApplication: parsed.ruleApplication || undefined,
      howToImprove: parsed.howToImprove || undefined,
      summary: parsed.summary || parsed.generalAssessment || undefined,
      confidence: answerConfidence,
      mistakeTags,
      nextDifficulty,
      ...(sourcesUsed.length > 0 && { sourcesUsed }),
      classification: { category: queryType, confidence: classificationConfidence },
    })
  } catch (e) {
    console.error('Exam evaluate API error:', e)
    const { status, message } = handleOpenAIError(e)
    return NextResponse.json({ error: message }, { status })
  }
}
