/**
 * POST /api/exam-practice/generate
 * One request → one response. Body: topic?, mainTopic?, subtopic?, customTopic?, count?, questionType?, difficulty?, questionStyle?
 * questionType drives output format (olay/klasik/madde/coktan/dogruyanlis/karma). customTopic narrows focus when set.
 * Returns: { question } | { questions } | { scenario, subQuestions, mode: 'tek_olay_cok_soru' }
 */
import { NextResponse } from 'next/server'
import { EXAM_QUESTION_GENERATOR_PROMPT } from '@/lib/exam-practice-prompt'
import { getLawDatabaseContextShort } from '@/lib/law-database'
import { buildSystemContentWithSources } from '@/lib/source-grounded'
import { DEFAULT_MEVZUAT_SOURCE_BLOCK } from '@/lib/source-metadata'
import { classifyQuery } from '@/lib/query-classifier'
import { getRandomVariationHints, buildVariationInstruction, getSubtopicFocusInstruction, getMedeniDiversityHint } from '@/lib/question-variation'
import { buildTopicLabel, type MainTopicId } from '@/lib/pratik-topic-config'
import { getOpenAI, getMissingKeyMessage, handleOpenAIError } from '@/lib/openai'
import { validateBodySize, validateTextLength, LIMITS } from '@/lib/validate-input'
import { buildAdaptiveFocusLine, type MistakeTag, type PracticeDifficulty } from '@/lib/practice-adaptive'
import { searchWeb, isWebSearchAvailable, formatWebSearchContext } from '@/lib/web-search'
import { requiresLiveData } from '@/lib/live-data-classifier'

const MAX_COUNT = 50
const BATCH_SIZE = 10
const MAX_GENERATE_ROUNDS = 4

function normalizeQuestionForUniq(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/soru\s*\d+[:.)-]*/gi, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqueQuestions(input: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const q of input) {
    const key = normalizeQuestionForUniq(q)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(q.trim())
  }
  return out
}

function shouldUseWebForPractice(topic: string, questionType: string): boolean {
  if (requiresLiveData(topic)) return true
  if (questionType === 'guncel_gelisme') return true
  return /yeni|son|guncel|güncel|degis|değiş|yururluk|yürürlük/i.test(topic)
}

function getQuestionTypeInstruction(type: string): string {
  switch (type) {
    case 'olay':
      return 'Soru tipi: OLAY (vaka). Kısa senaryo + "…hukuki sonuçları/sorumluluğu değerlendiriniz." Çıktı: Sadece senaryo ve soru; seçenek veya ifade ekleme.'
    case 'madde':
      return 'Soru tipi: MADDE UYGULAMA. Belirli maddenin bu olayda nasıl uygulanacağı; madde ezberi değil uygulama. Çıktı: Olay + hangi madde uygulanır / nasıl uygulanır sorusu.'
    case 'klasik':
      return 'Soru tipi: KLASİK (açık uçlu). Karşılaştırma ("X ile Y farkı"), kavramın olayla ilişkisi veya kısa uygulama. "X nedir?" yerine "Bu olayda X nasıl uygulanır?" Çıktı: Sadece soru metni; seçenek yok.'
    case 'coktan':
      return 'Soru tipi: ÇOKTAN SEÇMELİ. Soru metni + mutlaka (A) (B) (C) (D) dört seçenek. Doğru cevabı parantez içinde belirt: (Doğru cevap: A). Çıktı: Soru + (A) ... (B) ... (C) ... (D) ...'
    case 'dogruyanlis':
      return 'Soru tipi: DOĞRU / YANLIŞ. Tek bir hukuki ifade ver; "Bu ifade doğru mu yanlış mı? Gerekçesiyle açıklayınız." Çıktı: Sadece ifade + değerlendirme isteği; seçenek listesi yok.'
    case 'karma':
      return 'Soru tipi: KARMA. Aynı konuda olay, klasik ve madde soruları karışık; her biri farklı yapıda.'
    default:
      return 'Soru tipi: OLAY (vaka). Kısa senaryo + değerlendirme isteği.'
  }
}

/** Soru tipine göre çıktı formatı (tek soru / batch). */
function getOutputFormatForType(type: string): string {
  switch (type) {
    case 'coktan':
      return 'Çıktı formatı: Soru metni + (A) ... (B) ... (C) ... (D) ... şeklinde dört seçenek; doğru cevabı belirt (örn. Doğru cevap: B).'
    case 'dogruyanlis':
      return 'Çıktı formatı: Bir hukuki ifade cümlesi + "Bu ifade doğru mu yanlış mı? Gerekçesiyle açıklayınız." Seçenek listesi yazma.'
    case 'olay':
      return 'Çıktı formatı: Kısa olay/senaryo + "…değerlendiriniz" tarzı tek soru. Seçenek ekleme.'
    case 'madde':
      return 'Çıktı formatı: Kısa olay veya durum + hangi madde uygulanır / nasıl uygulanır sorusu.'
    case 'klasik':
      return 'Çıktı formatı: Açık uçlu soru metni (karşılaştırma, kavram uygulaması vb.). Seçenek yok.'
    default:
      return ''
  }
}

function getQuestionStyleInstruction(style: string): string {
  switch (style) {
    case 'tek_olay_cok_soru':
      return 'Soru tarzı: TEK OLAY ÇOK SORU. Tek bir senaryo yaz; aynı olaydan 4-5 alt soru üret (ceza, medeni, usul, kavram uygulaması, tartışma gibi farklı açılardan). Her alt soru farklı hukuki boyutu incelesin.'
    case 'karma_set':
      return 'Soru tarzı: KARMA PRATİK SETİ. Farklı olaylardan oluşan set; her soru farklı senaryo ve çatışma.'
    case 'kisa_olay':
      return 'Soru tarzı: KISA OLAY SORULARI. Kısa olay paragrafları; net sorun tespiti, tek odak.'
    case 'derin_analiz':
      return 'Soru tarzı: DERİN ANALİZ VAKASI. Uzun vaka; birden fazla hukuki sorun, tartışmalı noktalar.'
    case 'tek_olay_tek_soru':
    default:
      return 'Soru tarzı: TEK OLAY TEK SORU. Tek senaryo, tek değerlendirme sorusu.'
  }
}

function parseScenarioAndSubQuestions(raw: string): { scenario: string; subQuestions: string[] } {
  const normalized = raw.replace(/\r\n/g, '\n').trim()
  // Senaryo: accept "SENARYO:", "Senaryo:", "SENARYO :" and content until first numbered question
  const scenarioMatch = normalized.match(/\bSENARYO\s*:\s*([\s\S]*?)(?=\n\s*(?:SORU\s*)?\d+[\.\):\s]|$)/i)
  let scenario = scenarioMatch ? scenarioMatch[1].trim() : ''
  // Split by "SORU 1", "SORU 2", "1.", "2.", "1)", "1:" etc.
  const parts = normalized.split(/\n\s*(?:SORU\s*)?(\d+)[\.\):\s]+/i)
  const subQuestions: string[] = []
  for (let i = 1; i < parts.length; i += 2) {
    const text = (parts[i + 1] ?? parts[i] ?? '').trim().replace(/^SORU\s*\d*\s*[\.\):\s]*/i, '').trim()
    if (text.length > 15) subQuestions.push(text)
  }
  if (subQuestions.length === 0) {
    const withoutScenario = normalized.replace(/^\s*SENARYO\s*:\s*/i, '').trim()
    const fallbackParts = withoutScenario.split(/\n\s*(?=\d+[\.\)]\s|\d+\)\s|SORU\s*\d)/i)
    const first = fallbackParts[0]?.trim() ?? ''
    const rest = fallbackParts.slice(1).map((s) => s.replace(/^(?:SORU\s*)?\d+[\.\):\s]+/i, '').trim()).filter((s) => s.length > 15)
    if (rest.length >= 2) {
      return { scenario: first.length > 20 ? first : scenario, subQuestions: rest }
    }
  }
  if (!scenario && normalized.length > 100) {
    const firstBlock = normalized.split(/\n\s*(?:SORU\s*)?1[\.\):\s]+/i)[0]?.trim() ?? ''
    if (firstBlock.length > 50) scenario = firstBlock.replace(/^\s*SENARYO\s*:\s*/i, '').trim()
  }
  return { scenario, subQuestions }
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
    const body = (await request.json()) as {
      topic?: string
      mainTopic?: MainTopicId
      subtopic?: string
      customTopic?: string
      useOnlyCustomTopic?: boolean
      count?: number
      questionType?: string
      difficulty?: string
      questionStyle?: string
      adaptiveDifficulty?: PracticeDifficulty
      focusMistakes?: MistakeTag[]
    }
    const mainTopic = body.mainTopic && ['medeni', 'borclar', 'ceza', 'anayasa', 'siyasi_tarih', 'idare', 'cmk', 'hmk', 'karma'].includes(body.mainTopic) ? body.mainTopic : null
    const subtopic = typeof body.subtopic === 'string' ? body.subtopic.trim() : ''
    const customTopic = typeof body.customTopic === 'string' ? body.customTopic.trim() : ''
    const useOnlyCustomTopic = Boolean(body.useOnlyCustomTopic) && !!customTopic
    const topicFromSelection = mainTopic ? buildTopicLabel(mainTopic, subtopic) : ''
    const topicRaw = typeof body.topic === 'string' ? body.topic.trim() : topicFromSelection
    const topic = topicRaw || customTopic
    const count = Math.min(MAX_COUNT, Math.max(1, Math.floor(Number(body.count) || 1)))
    const questionType = (body.questionType ?? 'olay').toLowerCase()
    const difficulty = (body.adaptiveDifficulty ?? body.difficulty ?? 'karisik').toLowerCase()
    const questionStyle = (body.questionStyle ?? 'tek_olay_tek_soru').toLowerCase()

    if (!topic) {
      return NextResponse.json({ error: 'Konu veya ana konu gerekli' }, { status: 400 })
    }
    const topicCheck = validateTextLength(topic, LIMITS.examQuestion + LIMITS.examScenario, 'Konu')
    if (!topicCheck.ok) return NextResponse.json({ error: topicCheck.error }, { status: topicCheck.status })
    if (customTopic) {
      const customCheck = validateTextLength(customTopic, LIMITS.examQuestion, 'Özel konu')
      if (!customCheck.ok) return NextResponse.json({ error: customCheck.error }, { status: customCheck.status })
    }

    const { queryType, confidence: classificationConfidence } = await classifyQuery(`Sınav sorusu üret: ${topic}`, openai)
    const lawContext = await getLawDatabaseContextShort()
    let systemContent = buildSystemContentWithSources(
      EXAM_QUESTION_GENERATOR_PROMPT,
      lawContext,
      DEFAULT_MEVZUAT_SOURCE_BLOCK
    )
    let sourcesUsed: string[] = []
    if (isWebSearchAvailable() && shouldUseWebForPractice(topic, questionType)) {
      const webResults = await searchWeb(`${topic} hukuk güncel değişiklik yürürlük`)
      if (webResults.length > 0) {
        systemContent += `\n\n${formatWebSearchContext(webResults)}\n\nWEB GÜNCELLİK KURALI: Soru üretirken yukarıdaki güncel kaynak bloklarını dikkate al. Kaynakta net olmayan bir güncel iddia üretme.`
        sourcesUsed = webResults.slice(0, 5).map((w) => w.url)
      }
    }

    const typeInstruction = getQuestionTypeInstruction(questionType)
    const diffInstruction = getDifficultyInstruction(difficulty)
    const styleInstruction = getQuestionStyleInstruction(questionStyle)
    const variationHints = getRandomVariationHints()
    const variationBlock = buildVariationInstruction(variationHints)
    const focusMistakes = Array.isArray(body.focusMistakes) ? body.focusMistakes : []
    const adaptiveFocusLine = buildAdaptiveFocusLine(focusMistakes)
    const subtopicInstruction = mainTopic && subtopic ? getSubtopicFocusInstruction(mainTopic, subtopic) : ''
    const multiDimensionRequired =
      questionStyle === 'tek_olay_cok_soru' ||
      questionStyle === 'tek_olay_tek_soru' ||
      difficulty === 'orta' ||
      difficulty === 'zor' ||
      mainTopic === 'karma'
    const multiDimensionLine = multiDimensionRequired
      ? 'Senaryo en az iki hukuki boyut veya iki ayrı sorun içersin (tek izlek yasak); fakülte sınav pratiğine yakın olsun.'
      : ''

    const customTopicLine = useOnlyCustomTopic
      ? `Kullanıcı sadece şu konuyu istiyor (ana/alt konu birleştirme yok); tüm odak burada olsun: "${customTopic}".`
      : customTopic
        ? `Kullanıcı odak konu (mutlaka dikkate al): ${customTopic}.`
        : ''
    // Alt konu seçildiyse rastgele medeni tema ekleme (örn. Başlangıç Hükümleri seçilmişken nişanlanma konusu üretilmesin).
    const medeniDiversityLine = mainTopic === 'medeni' && !subtopic ? getMedeniDiversityHint() : ''

    const strictScopeLine = mainTopic && subtopic
      ? `Konu sınırı: Soru SADECE "${topic}" kapsamında olsun. Bu alt konu dışındaki konulara (aynı dersin başka ünitesi veya başka ders) hiç girme.`
      : ''
    if (questionStyle === 'tek_olay_cok_soru') {
      const userContent = [
        `Şu konu için TEK OLAY ÇOK SORU üret: "${topic}".`,
        strictScopeLine,
        customTopicLine,
        medeniDiversityLine,
        subtopicInstruction,
        typeInstruction,
        styleInstruction,
        diffInstruction,
        multiDimensionLine,
        adaptiveFocusLine,
        `Varyasyon: ${variationBlock}`,
        'Önce tam olarak "SENARYO:" yazıp alt satırda tek bir olay/senaryo yaz. Sonra mutlaka "SORU 1:", "SORU 2:", "SORU 3:", "SORU 4:" (veya 5) şeklinde numaralayıp her biri için aynı olaydan bir alt soru yaz. Her alt soru farklı hukuki açıdan olsun. Yanıtında sadece SENARYO: metni ve SORU 1:, SORU 2:, ... metinlerini ver; başka açıklama ekleme.',
      ].filter(Boolean).join(' ')
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        temperature: 0.35,
        max_tokens: 2400,
      })
      const raw = completion.choices[0]?.message?.content?.trim() ?? ''
      if (!raw) {
        return NextResponse.json({ error: 'Model senaryo üretemedi' }, { status: 502 })
      }
      const { scenario, subQuestions } = parseScenarioAndSubQuestions(raw)
      if (!scenario || subQuestions.length === 0) {
        return NextResponse.json({ error: 'Tek olay çok soru formatı ayrıştırılamadı' }, { status: 502 })
      }
      return NextResponse.json({
        scenario,
        subQuestions: subQuestions.slice(0, 8),
        mode: 'tek_olay_cok_soru',
        topic,
        questionStyle,
        ...(sourcesUsed.length > 0 && { sourcesUsed }),
        classification: { category: queryType, confidence: classificationConfidence },
      })
    }

    if (count === 1) {
      const outputFormat = getOutputFormatForType(questionType)
      const isDogruYanlis = questionType === 'dogruyanlis'
      const stylePart = isDogruYanlis
        ? 'Sadece tek bir hukuki ifade cümlesi ver; olay veya senaryo yazma. İfadeden sonra "Bu ifade doğru mu yanlış mı? Gerekçesiyle açıklayınız." ekle.'
        : styleInstruction
      const userContent = [
        `Şu konu için tek bir soru üret: "${topic}".`,
        strictScopeLine,
        customTopicLine,
        medeniDiversityLine,
        subtopicInstruction,
        typeInstruction,
        outputFormat,
        diffInstruction,
        stylePart,
        multiDimensionLine,
        adaptiveFocusLine,
        `Varyasyon (bu soruda uygula): ${variationBlock}`,
        'Yanıtında sadece "SORU:" ile başlayıp soru metnini yaz. Cevap veya açıklama ekleme.',
      ].filter(Boolean).join(' ')
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        temperature: 0.32,
        max_tokens: 800,
      })

      let question = completion.choices[0]?.message?.content?.trim() ?? ''
      if (/^SORU:\s*/i.test(question)) question = question.replace(/^SORU:\s*/i, '').trim()
      if (!question) {
        return NextResponse.json({ error: 'Model soru üretemedi' }, { status: 502 })
      }
      return NextResponse.json({
        question,
        ...(sourcesUsed.length > 0 && { sourcesUsed }),
        classification: { category: queryType, confidence: classificationConfidence },
      })
    }

    const allQuestions: string[] = []
    let remaining = count
    let round = 0
    while (remaining > 0 && round < MAX_GENERATE_ROUNDS) {
      round += 1
      const want = Math.min(remaining, BATCH_SIZE)
      const batchVariation = getRandomVariationHints()
      const batchVariationBlock = buildVariationInstruction(batchVariation)
      const outputFormat = getOutputFormatForType(questionType)
      const bannedList = uniqueQuestions(allQuestions)
        .slice(-8)
        .map((q, i) => `${i + 1}) ${q}`)
        .join('\n')
      const userContent = [
        `Şu konu için tam ${want} adet soru üret: "${topic}".`,
        strictScopeLine,
        customTopicLine,
        medeniDiversityLine,
        subtopicInstruction,
        typeInstruction,
        outputFormat,
        diffInstruction,
        styleInstruction,
        multiDimensionLine,
        adaptiveFocusLine,
        `Önemli: Her soruda FARKLI olay türü, FARKLI hukuki çatışma ve FARKLI ifade tarzı kullan; tekrara düşme. Bu batch için örnek yön: ${batchVariationBlock}`,
        bannedList ? `Aşağıdaki önceki sorulara BENZER soru üretme:\n${bannedList}` : '',
        `Her soruyu "SORU 1:", "SORU 2:", ... diye numaralayıp sadece soru metnini yaz. Cevap veya açıklama ekleme.`,
      ].filter(Boolean).join(' ')
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        temperature: 0.36,
        max_tokens: Math.min(2400, want * 420),
      })

      const raw = completion.choices[0]?.message?.content?.trim() ?? ''
      const parsed = parseMultipleQuestions(raw)
      for (const q of uniqueQuestions(parsed)) {
        if (allQuestions.length < count) allQuestions.push(q)
      }
      const deduped = uniqueQuestions(allQuestions)
      allQuestions.length = 0
      allQuestions.push(...deduped)
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
      ...(sourcesUsed.length > 0 && { sourcesUsed }),
      classification: { category: queryType, confidence: classificationConfidence },
    })
  } catch (e) {
    console.error('Exam generate API error:', e)
    const { status, message } = handleOpenAIError(e)
    return NextResponse.json({ error: message }, { status })
  }
}
