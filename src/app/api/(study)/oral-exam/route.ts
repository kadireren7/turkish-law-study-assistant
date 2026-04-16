/**
 * Mini Sözlü Yoklama API.
 * POST /api/oral-exam
 * Body: { topic: string, messages: { role: 'user'|'assistant', content: string }[] }
 * Returns: { reply: string }
 * Professor-style short oral questions; corrects and asks next; uses retrieval for topic.
 */
import { NextResponse } from 'next/server'
import { getOralExamSystemContent, ORAL_EXAM_TOPICS, type OralExamTopicId } from '@/lib/oral-exam-prompt'
import { getRetrievalResult } from '@/lib/legal-brain'
import { getLawDatabaseContext } from '@/lib/law-database'
import { getOpenAI, getMissingKeyMessage, handleOpenAIError } from '@/lib/openai'
import { validateBodySize, validateTextLength, LIMITS } from '@/lib/validate-input'

const VALID_TOPICS = new Set<string>(ORAL_EXAM_TOPICS.map((t) => t.id))

/** İlk soru için çeşitli talimatlar; her başlangıçta rastgele biri seçilir, aynı iki soruyla başlamaz. */
const FIRST_QUESTION_PROMPTS = [
  'Mini sözlü yoklamaya başlayalım. Yalnızca tek bir ilk soru sor; bir KAVRAM TANIMI veya unsur sorusu ile başla (örn. X nedir, X’in unsurları nelerdir).',
  'Mini sözlü yoklamaya başlayalım. Yalnızca tek bir ilk soru sor; bir AYRIM sorusu ile başla (X ile Y nasıl ayrılır, farkı nedir).',
  'Mini sözlü yoklamaya başlayalım. Yalnızca tek bir ilk soru sor; kısa bir UYGULAMA / mini olay sorusu ile başla (şu durumda hangi kural, nasıl sonuç).',
  'Mini sözlü yoklamaya başlayalım. Yalnızca tek bir ilk soru sor; bir İLKE veya madde özeti sorusu ile başla (hangi ilke uygulanır, bu madde ne düzenler).',
  'Mini sözlü yoklamaya başlayalım. Yalnızca tek bir ilk soru sor; doğru/yanlış veya “bu ifade neden doğru/yanlış” tarzı bir soru ile başla.',
  'Mini sözlü yoklamaya başlayalım. Yalnızca tek bir ilk soru sor; konunun farklı bir alt alanından (tanım, ayrım veya kısa uygulama) rastgele bir soru seç ve sor.',
]

function pickRandomFirstPrompt(): string {
  const i = Math.floor(Math.random() * FIRST_QUESTION_PROMPTS.length)
  return FIRST_QUESTION_PROMPTS[i] ?? FIRST_QUESTION_PROMPTS[0]
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
      messages?: { role: 'user' | 'assistant'; content: string }[]
    }
    const topic = typeof body.topic === 'string' ? body.topic.trim().toLowerCase() : ''
    const messages = Array.isArray(body.messages) ? body.messages : []

    if (!topic || !VALID_TOPICS.has(topic)) {
      return NextResponse.json(
        { error: 'Geçerli bir konu seçin: ceza, medeni, borclar, anayasa, idare, karma' },
        { status: 400 }
      )
    }
    const topicCheck = validateTextLength(topic, LIMITS.oralExamTopic, 'Konu')
    if (!topicCheck.ok) return NextResponse.json({ error: topicCheck.error }, { status: topicCheck.status })
    const totalContentLen = messages.reduce((s, m) => s + (m?.content?.length ?? 0), 0)
    if (totalContentLen > LIMITS.oralExamMessagesContent) {
      return NextResponse.json(
        { error: `Mesajlar toplamı en fazla ${LIMITS.oralExamMessagesContent} karakter olabilir.` },
        { status: 400 }
      )
    }

    const topicLabel = ORAL_EXAM_TOPICS.find((t) => t.id === topic)?.label ?? topic
    const queryForRetrieval = `${topicLabel} temel kavramlar kurallar sözlü sınav`
    const retrieval = await getRetrievalResult(queryForRetrieval, openai, 6, {
      queryType: 'konu_anlatimi',
    })
    const lawContext =
      retrieval.lowConfidence || retrieval.context.length < 200
        ? await getLawDatabaseContext()
        : retrieval.context

    const systemContent = getOralExamSystemContent(topic as OralExamTopicId, lawContext)

    const openaiMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      { role: 'system', content: systemContent },
    ]

    if (messages.length === 0) {
      openaiMessages.push({
        role: 'user',
        content: pickRandomFirstPrompt(),
      })
    } else {
      for (const m of messages.slice(-14)) {
        openaiMessages.push({ role: m.role, content: m.content })
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.5,
      max_tokens: 1024,
    })

    const reply = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!reply) {
      return NextResponse.json({ error: 'Yanıt üretilemedi' }, { status: 502 })
    }

    return NextResponse.json({ reply })
  } catch (e) {
    console.error('Oral exam API error:', e)
    const { status, message } = handleOpenAIError(e)
    return NextResponse.json({ error: message }, { status })
  }
}
