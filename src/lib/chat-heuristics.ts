/**
 * Sohbet için kısa mesaj / selamlaşma tespiti.
 * Google araması yalnızca gerçek sorularda yapılsın; selamlaşma ve kısa sohbet doğal karşılansın.
 */

import type { QueryType } from '@/lib/query-classifier'

/** Selamlaşma veya anlamsız kısa metinler (web araması yapılmasın, kısa sohbet yanıtı verilsin). */
const SMALL_TALK_PATTERNS = [
  /^(hey|hi|hello|alo|merhaba|selam|selamun aleyküm|naber|napiyon|nasılsın|nasilsin|ne var ne yok|günaydın|iyi günler|iyi akşamlar|hoşça kal|görüşürüz)$/i,
  /^(evet|hayır|tamam|ok|olur|yok|var|sağol|teşekkür|thanks|thx)$/i,
  /^[?\s$€£.*#]+$/,  // ???, $$$, ...
  /^[a-zA-ZğüşıöçĞÜŞİÖÇ]{1,2}$/,  // tek/iki harf
]

/** En az bu uzunlukta ve soru/konu kokan mesajlar "gerçek soru" sayılır (web için). */
const MIN_CHARS_REAL_QUESTION = 20

export function isSmallTalk(message: string): boolean {
  const t = message.trim()
  if (t.length === 0) return true
  if (t.length > 80) return false
  if (SMALL_TALK_PATTERNS.some((p) => p.test(t))) return true
  if (t.length < 15 && !/[?mM]/.test(t)) return true
  return false
}

/**
 * Web araması yalnızca gerçek sorularda yapılsın.
 * Selamlaşma, kısa sohbet veya "sohbet_genel" sınıfındaki kısa mesajlarda arama yapma.
 */
export function shouldDoWebSearch(message: string, queryType: QueryType): boolean {
  const t = message.trim()
  if (!t || t.length < MIN_CHARS_REAL_QUESTION) return false
  if (isSmallTalk(t)) return false
  if (queryType === 'sohbet_genel') return false
  return true
}

/**
 * Kısa sohbet / selamlaşma modu: model kısa, samimi yanıt versin; uzun hukuki cevap ve kaynak listesi yazmasın.
 */
export function isChatOnlyMode(message: string, queryType: QueryType): boolean {
  return isSmallTalk(message.trim()) || (queryType === 'sohbet_genel' && message.trim().length < 50)
}
