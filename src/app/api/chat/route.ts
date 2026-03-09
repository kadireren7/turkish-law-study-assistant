/**
 * AI Chat API route with local RAG.
 * POST /api/chat
 * Body: { message: string } or { messages: { role: 'user'|'assistant', content: string }[] }
 * Returns: { reply, sources, lowConfidence?, queryType?, confidence?, ... } or { error: string }
 * Uses query classification, source routing, and confidence levels. Fully Turkish, student-focused.
 */
import { NextResponse } from 'next/server'
import { LAW_ASSISTANT_SYSTEM_PROMPT } from '@/lib/law-assistant-prompt'
import { buildSystemContentWithSources, NO_LOCAL_SOURCES_INSTRUCTION, EXPLANATION_MODE_INSTRUCTIONS } from '@/lib/source-grounded'
import { getRetrievalResult, isFromGuncellemeler } from '@/lib/legal-brain'
import { getSourceMetadata, buildSourceTransparencyBlock, getRetrievalDate } from '@/lib/source-metadata'
import { getFreshnessWarnings } from '@/lib/freshness-warnings'
import { getLegalUpdatesSummary } from '@/lib/legal-updates'
import { classifyQuery } from '@/lib/query-classifier'
import { QUERY_TYPE_LABELS } from '@/lib/query-classifier'
import { TARTISMALI_KONU_CHAT_INSTRUCTION } from '@/lib/viewpoints-prompt'
import { LEGAL_REASONING_CHAT_PRACTICAL, getLegalReasoningInstruction } from '@/lib/legal-reasoning'
import {
  inferRelevantLawFromFacts,
  buildEnrichedQueryForRetrieval,
  formatInferenceForPrompt,
} from '@/lib/fact-to-law-inference'
import { confidenceFromRetrieval, stripConfidenceFromReplyContent, type ConfidenceLevel } from '@/lib/confidence'
import { getOpenAI, getMissingKeyMessage, handleOpenAIError, ERROR_MESSAGES } from '@/lib/openai'
import { validateBodySize, validateTextLength, LIMITS } from '@/lib/validate-input'
import { searchWeb, formatWebSearchContext, isWebSearchAvailable } from '@/lib/web-search'
import { shouldDoWebSearch, isChatOnlyMode } from '@/lib/chat-heuristics'

export type { ConfidenceLevel }

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
    const body = await request.json() as { message?: string; messages?: { role: 'user' | 'assistant'; content: string }[]; uyapMode?: boolean; explanationMode?: 'ogrenci' | 'uyap' }
    // Accept single "message" or full "messages" array for multi-turn
    let messages: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(body.messages) && body.messages.length > 0
      ? body.messages
      : typeof body.message === 'string' && body.message.trim()
        ? [{ role: 'user' as const, content: body.message.trim() }]
        : []
    const uyapMode = body.explanationMode === 'uyap' || Boolean(body.uyapMode)

    if (messages.length === 0) {
      return NextResponse.json({ error: 'message veya messages dizisi gerekli' }, { status: 400 })
    }

    const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content ?? ''
    const msgCheck = validateTextLength(lastUserMsg, LIMITS.chatMessage, 'Mesaj')
    if (!msgCheck.ok) return NextResponse.json({ error: msgCheck.error }, { status: msgCheck.status })

    // Keep last 10 messages to reduce token count and speed up response
    const MAX_MESSAGES = 10
    if (messages.length > MAX_MESSAGES) {
      messages = messages.slice(-MAX_MESSAGES)
    }

    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content ?? ''
    const { queryType, confidence: classificationConfidence } = await classifyQuery(lastUserMessage, openai)
    let retrieval: Awaited<ReturnType<typeof getRetrievalResult>>
    let inference: Awaited<ReturnType<typeof inferRelevantLawFromFacts>> | null = null
    if (queryType === 'olay_analizi') {
      inference = await inferRelevantLawFromFacts(lastUserMessage.slice(0, 2500), openai)
      const enrichedQuery = buildEnrichedQueryForRetrieval(lastUserMessage.slice(0, 2500), inference)
      retrieval = await getRetrievalResult(enrichedQuery, openai, 6, { queryType })
    } else {
      retrieval = await getRetrievalResult(lastUserMessage, openai, 6, { queryType })
    }
    let lawContext = retrieval.lowConfidence
      ? NO_LOCAL_SOURCES_INSTRUCTION
      : retrieval.context
    let webSearchAdded = false
    if (isWebSearchAvailable() && shouldDoWebSearch(lastUserMessage, queryType)) {
      const webResults = await searchWeb(lastUserMessage)
      if (webResults.length > 0) {
        const webBlock = formatWebSearchContext(webResults)
        lawContext = lawContext
          ? lawContext + '\n\n---\n\n' + webBlock
          : webBlock
        webSearchAdded = true
      }
    }
    let sourceTransparencyBlock = ''
    let metadata: Awaited<ReturnType<typeof getSourceMetadata>> = []
    if (!retrieval.lowConfidence && retrieval.sources.length > 0) {
      metadata = await getSourceMetadata(retrieval.sources)
      const fromGuncellemeler = isFromGuncellemeler(retrieval.sources)
      const retrievalDate = getRetrievalDate()
      sourceTransparencyBlock = buildSourceTransparencyBlock(metadata, fromGuncellemeler, retrievalDate)
    }
    let systemContent = buildSystemContentWithSources(
      LAW_ASSISTANT_SYSTEM_PROMPT,
      lawContext,
      sourceTransparencyBlock
    )
    const legalUpdates = await getLegalUpdatesSummary()
    if (legalUpdates) systemContent += legalUpdates
    const queryTypeLabel = QUERY_TYPE_LABELS[queryType] ?? queryType
    systemContent += `\n\nSORU SINIFI: ${queryTypeLabel}. Bu sınıfa uygun kaynak önceliği uygulandı.`
    const chatOnly = isChatOnlyMode(lastUserMessage, queryType)
    if (chatOnly) {
      systemContent += `

SOHBET MODU: Kullanıcı selamlaşıyor veya kısa sohbet ediyor. Kısa, samimi, doğal bir karşılık ver (bir iki cümle). Uzun hukuki cevap, madde listesi veya "Kullanılan kaynak" bölümü yazma. Güven düzeyi satırı yazma. Hukukla ilgili bir konu sorarsa yardımcı olabileceğini belirt.`
    }
    if (webSearchAdded) {
      systemContent += `

WEB ARAMASI (ZORUNLU): Yukarıdaki bağlamda "Web araması (2026)" bölümü var. Kullanıcının sorduğu şeyi bu web sonuçlarından araştır, anla ve öyle cevapla. Yanıtın %100 bu sonuçlara ve yerel kaynaklara dayansın; genel bilgiyle madde/karar uydurma. Mevzuat.gov.tr, LEXPERA, Resmî Gazete, orgTR, mahkeme siteleri gibi farklı sitelerden gelen bilgileri birleştir; açıklayıcı ve anlaşılır yaz. "Kullanılan kaynak" bölümünde sadece insan okunabilir kaynak adı yaz (örn. "Türk Ceza Kanunu (5237)", "LEXPERA Mevzuat"); asla dosya yolu (law-data/..., tck.md) veya ham URL yazma.`
    }
    if (queryType === 'guncel_gelisme') {
      systemContent += `

GÜNCEL GELİŞME SORUSU: Yanıtını yukarıdaki "Son mevzuat değişiklikleri özeti", "Son önemli kararlar özeti" ve "Güncel hukuk haberleri" bölümlerine dayandır. Genel model bilgisiyle güncel gelişme uydurma. Kaynakları insan okunabilir şekilde yaz: "Son mevzuat değişiklikleri özeti", "Son önemli kararlar özeti (Yargıtay / AYM)", "Güncel hukuk haberleri", kanun adları (örn. Türk Ceza Kanunu (5237)). Ham dosya yolu veya dosya adı (tck.md, law-data/...) gösterme. "Kullanılan kaynak" bölümünde Son kontrol tarihini belirt.`
    }
    if (queryType === 'karar_analizi') {
      systemContent += `

KARAR ANALİZİ: Kullanıcı mahkeme kararı veya özeti vermiş olabilir. Yanıtında (özetle) şunlara değin: **Kararın kısa özeti**, **Olay**, **Hukuki sorun**, **Mahkemenin yaklaşımı**, **Dayanılan kurallar**, **Karardan çıkarılabilecek ders**, **Sınavda nasıl kullanılabilir**, **Farklı yorum ihtimali** (varsa), **Kullanılan kaynak**. Metinde olmayan bilgi uydurma; öğrenciye karardan nasıl ders çıkarılacağını göster.`
    }
    if (queryType === 'tartismali_konu') {
      systemContent += `\n\n${TARTISMALI_KONU_CHAT_INSTRUCTION}`
    }
    if (queryType === 'olay_analizi') {
      systemContent += '\n\n' + (uyapMode ? getLegalReasoningInstruction({ formalMode: true }) : LEGAL_REASONING_CHAT_PRACTICAL)
      if (inference) {
        const inferenceBlock = formatInferenceForPrompt(inference)
        if (inferenceBlock) systemContent += '\n\n' + inferenceBlock
      }
    }
    systemContent += '\n\n' + EXPLANATION_MODE_INSTRUCTIONS[uyapMode ? 'uyap' : 'ogrenci']

    const openaiMessages = [
      { role: 'system' as const, content: systemContent },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.35,
      max_tokens: 1536,
    })

    let reply = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!reply) {
      return NextResponse.json({ error: ERROR_MESSAGES.server }, { status: 502 })
    }
    reply = stripConfidenceFromReplyContent(reply)

    const confidence = confidenceFromRetrieval(retrieval, queryType)

    const warnings = retrieval.sources.length > 0 ? await getFreshnessWarnings(retrieval.sources) : []
    const rawLabels = retrieval.sourceLabelsHuman.length > 0 ? retrieval.sourceLabelsHuman : metadata.map((m) => m.lawName)
    const sourceLabels = rawLabels.filter((l) => !/law-data|\.md|\.json|[\\/]/.test(l || ''))
    const lastChecked = metadata.length > 0 ? getRetrievalDate() : null

    return NextResponse.json({
      reply,
      sources: retrieval.sources,
      confidence,
      queryType,
      classificationConfidence: classificationConfidence,
      ...(sourceLabels.length > 0 && { sourceLabels }),
      ...(lastChecked != null && { lastChecked }),
      ...(retrieval.lowConfidence && { lowConfidence: true }),
      ...(warnings.length > 0 && { warnings }),
    })
  } catch (e) {
    console.error('Chat API error:', e)
    const { status, message } = handleOpenAIError(e)
    return NextResponse.json({ error: message }, { status })
  }
}
