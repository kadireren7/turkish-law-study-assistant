/**
 * Konu anlatımı sonrası tartışma: kullanıcı soru sorar veya yorum yazar, ders metnine göre yanıt alır.
 * POST /api/lesson/discuss
 * Body: { lessonContent: string, userMessage: string, subject?: string, topic?: string }
 */
import { NextResponse } from 'next/server'
import { getOpenAI, getMissingKeyMessage, handleOpenAIError } from '@/lib/openai'
import { validateTextLength, LIMITS } from '@/lib/validate-input'

const MAX_LESSON_LENGTH = 50000
const MAX_MESSAGE_LENGTH = 2000

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: getMissingKeyMessage() }, { status: 503 })
  }

  try {
    const body = await request.json() as {
      lessonContent?: string
      userMessage?: string
      subject?: string
      topic?: string
    }
    const lessonContent = typeof body.lessonContent === 'string' ? body.lessonContent.slice(0, MAX_LESSON_LENGTH) : ''
    const userMessage = typeof body.userMessage === 'string' ? body.userMessage.trim() : ''
    const subject = typeof body.subject === 'string' ? body.subject : ''
    const topic = typeof body.topic === 'string' ? body.topic : ''

    if (!lessonContent || !userMessage) {
      return NextResponse.json(
        { error: 'lessonContent ve userMessage gerekli' },
        { status: 400 }
      )
    }
    const msgCheck = validateTextLength(userMessage, MAX_MESSAGE_LENGTH, 'Mesaj')
    if (!msgCheck.ok) {
      return NextResponse.json({ error: msgCheck.error }, { status: 400 })
    }

    const openai = getOpenAI()
    const systemContent = `Sen konu anlatımı sonrası tartışma asistanısın. Aşağıdaki ders metnine GÖRE kullanıcının sorusunu veya yorumunu yanıtla. Kaynakta olmayan madde veya karar uydurma. Türkçe, kısa ve net yanıt ver.
${subject || topic ? `\nKonu bağlamı: ${[subject, topic].filter(Boolean).join(' — ')}` : ''}

KAYNAK DERS METNİ:
${lessonContent}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    })

    const reply = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!reply) {
      return NextResponse.json({ error: 'Yanıt üretilemedi' }, { status: 502 })
    }

    return NextResponse.json({ reply })
  } catch (e) {
    console.error('Lesson discuss API error:', e)
    const { status, message } = handleOpenAIError(e)
    return NextResponse.json({ error: message }, { status })
  }
}
