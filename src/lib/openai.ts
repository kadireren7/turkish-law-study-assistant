/**
 * Ortak OpenAI client ve API hata mesajları.
 * Tüm AI kullanan route'lar bu modülü kullanmalı; tutarlı hata metinleri ve tek client.
 */
import OpenAI from 'openai'

export const ERROR_MESSAGES = {
  missingKey: 'API anahtarı bulunamadı. .env.local dosyasını kontrol edin.',
  quota: 'OpenAI API kotası aşıldı veya projede kullanılabilir kredi bulunmuyor. Lütfen billing, usage ve API anahtarını kontrol edin.',
  server: 'Sunucu tarafında bir hata oluştu. Lütfen tekrar deneyin.',
} as const

let _client: OpenAI | null = null

/**
 * Ortak OpenAI client. API key yoksa boş string ile oluşturulur;
 * route içinde getOpenAIRequired() veya apiKey kontrolü yapın.
 */
export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })
  }
  return _client
}

/**
 * API key yoksa null, varsa client döner. Madde Ara gibi key olmadan da çalışan route'lar için.
 */
export function getOpenAIIfAvailable(): OpenAI | null {
  return process.env.OPENAI_API_KEY ? getOpenAI() : null
}

/**
 * API key zorunlu; yoksa 503 dönmek için kullanılacak hata mesajı.
 */
export function getMissingKeyMessage(): string {
  return ERROR_MESSAGES.missingKey
}

/**
 * OpenAI APIError'dan uygun HTTP status ve mesaj.
 */
export function handleOpenAIError(e: unknown): { status: number; message: string } {
  if (e instanceof OpenAI.APIError) {
    const status = e.status ?? 500
    const rawMessage = (e.message ?? '').toLowerCase()
    const isQuota =
      status === 429 ||
      rawMessage.includes('quota') ||
      rawMessage.includes('rate limit') ||
      rawMessage.includes('insufficient_quota') ||
      rawMessage.includes('billing')
    if (isQuota) return { status: 429, message: ERROR_MESSAGES.quota }
    if (status >= 500 || status === 429) return { status, message: ERROR_MESSAGES.server }
    return { status: status >= 400 ? status : 500, message: ERROR_MESSAGES.server }
  }
  return { status: 500, message: ERROR_MESSAGES.server }
}
