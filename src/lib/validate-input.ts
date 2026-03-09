/**
 * API istekleri için ortak input/body validasyonu.
 * Body boyutu ve metin alanı uzunluk sınırları; erken red (400/413) ile kaynak tasarrufu.
 */

/** Varsayılan maksimum request body boyutu (bytes). ~500 KB */
export const MAX_BODY_BYTES = 500 * 1024

/** Metin alanları için makul üst sınırlar (karakter). */
export const LIMITS = {
  chatMessage: 50_000,
  caseText: 30_000,
  decisionText: 50_000,
  examQuestion: 10_000,
  examAnswer: 30_000,
  examScenario: 15_000,
  lessonSubject: 200,
  lessonTopic: 500,
  quizTopic: 500,
  flashcardsTopic: 500,
  oralExamTopic: 100,
  oralExamMessagesContent: 20_000,
  lawSearchQuery: 500,
} as const

export type ValidationResult = { ok: true } | { ok: false; status: number; error: string }

/**
 * Request body boyutunu kontrol eder (Content-Length varsa).
 * Body çok büyükse 413 döndürmek için kullanılır.
 */
export function validateBodySize(request: Request, maxBytes: number = MAX_BODY_BYTES): ValidationResult {
  const contentLength = request.headers.get('content-length')
  if (contentLength === null) return { ok: true }
  const size = parseInt(contentLength, 10)
  if (Number.isNaN(size) || size <= 0) return { ok: true }
  if (size > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `İstek boyutu çok büyük. Maksimum ${Math.round(maxBytes / 1024)} KB.`,
    }
  }
  return { ok: true }
}

/**
 * Metin uzunluğu sınırı; aşarsa 400 ve mesaj.
 */
export function validateTextLength(
  value: string,
  maxLength: number,
  fieldName: string = 'Metin'
): ValidationResult {
  if (value.length <= maxLength) return { ok: true }
  return {
    ok: false,
    status: 400,
    error: `${fieldName} en fazla ${maxLength} karakter olabilir.`,
  }
}
