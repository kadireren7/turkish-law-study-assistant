/**
 * AI Chat API route with local RAG.
 * POST /api/chat
 * Body: { message: string } or { messages: { role: 'user'|'assistant', content: string }[] }
 * Returns: { reply: string, sources: string[], lowConfidence?: boolean } or { error: string }
 * Retrieves relevant chunks from law-data before calling OpenAI; answers from local sources only when found.
 */
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { LAW_ASSISTANT_SYSTEM_PROMPT } from '@/lib/law-assistant-prompt'
import { buildSystemContentWithSources, NO_LOCAL_SOURCES_INSTRUCTION } from '@/lib/source-grounded'
import { retrieveForQuery } from '@/lib/law-rag'
import { getSourceMetadata, buildSourceTransparencyBlock, isFromGuncellemeler } from '@/lib/source-metadata'
import { getFreshnessWarnings } from '@/lib/freshness-warnings'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

const ERROR_MESSAGES = {
  missingKey: 'API anahtarı bulunamadı. .env.local dosyasını kontrol edin.',
  quota: 'OpenAI API kotası aşıldı veya projede kullanılabilir kredi bulunmuyor. Lütfen billing, usage ve API anahtarını kontrol edin.',
  server: 'Sunucu tarafında bir hata oluştu. Lütfen tekrar deneyin.',
} as const

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.missingKey },
      { status: 503 }
    )
  }

  try {
    const body = await request.json() as { message?: string; messages?: { role: 'user' | 'assistant'; content: string }[] }
    // Accept single "message" or full "messages" array for multi-turn
    const messages: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(body.messages) && body.messages.length > 0
      ? body.messages
      : typeof body.message === 'string' && body.message.trim()
        ? [{ role: 'user' as const, content: body.message.trim() }]
        : []

    if (messages.length === 0) {
      return NextResponse.json({ error: 'message veya messages dizisi gerekli' }, { status: 400 })
    }

    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content ?? ''
    const rag = await retrieveForQuery(lastUserMessage, openai)
    const lawContext = rag.lowConfidence
      ? NO_LOCAL_SOURCES_INSTRUCTION
      : rag.context
    let sourceTransparencyBlock = ''
    let metadata: Awaited<ReturnType<typeof getSourceMetadata>> = []
    if (!rag.lowConfidence && rag.sources.length > 0) {
      metadata = await getSourceMetadata(rag.sources)
      const fromGuncellemeler = isFromGuncellemeler(rag.sources)
      sourceTransparencyBlock = buildSourceTransparencyBlock(metadata, fromGuncellemeler)
    }
    const systemContent = buildSystemContentWithSources(
      LAW_ASSISTANT_SYSTEM_PROMPT,
      lawContext,
      sourceTransparencyBlock
    )

    const openaiMessages = [
      { role: 'system' as const, content: systemContent },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.4,
      max_tokens: 2048,
    })

    const reply = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!reply) {
      return NextResponse.json({ error: ERROR_MESSAGES.server }, { status: 502 })
    }

    const warnings = rag.sources.length > 0 ? await getFreshnessWarnings(rag.sources) : []
    const sourceLabels = metadata.map((m) => m.lawName || m.fileName)
    const lastChecked = (() => {
      const dates = metadata.map((m) => m.last_checked?.trim()).filter(Boolean) as string[]
      if (dates.length === 0) return null
      dates.sort()
      return dates[0]
    })()

    return NextResponse.json({
      reply,
      sources: rag.sources,
      ...(sourceLabels.length > 0 && { sourceLabels }),
      ...(lastChecked != null && { lastChecked }),
      ...(rag.lowConfidence && { lowConfidence: true }),
      ...(warnings.length > 0 && { warnings }),
    })
  } catch (e) {
    console.error('Chat API error:', e)
    if (e instanceof OpenAI.APIError) {
      const status = e.status ?? 500
      const rawMessage = (e.message ?? '').toLowerCase()
      const isQuota =
        status === 429 ||
        rawMessage.includes('quota') ||
        rawMessage.includes('rate limit') ||
        rawMessage.includes('insufficient_quota') ||
        rawMessage.includes('billing')
      if (isQuota) {
        return NextResponse.json({ error: ERROR_MESSAGES.quota }, { status: 429 })
      }
      if (status >= 500 || status === 429) {
        return NextResponse.json({ error: ERROR_MESSAGES.server }, { status })
      }
      return NextResponse.json({ error: ERROR_MESSAGES.server }, { status: status >= 400 ? status : 500 })
    }
    return NextResponse.json({ error: ERROR_MESSAGES.server }, { status: 500 })
  }
}
