export type FreshnessClass = 'requires_live_data' | 'static'

const LIVE_HINTS = [
  'son',
  'güncel',
  'guncel',
  'yeni',
  'değişti',
  'degisti',
  'yürürlük',
  'yururluk',
] as const

const STATIC_HINTS = [
  'nedir',
  'tanım',
  'tanim',
  'kavram',
  'tarihçe',
  'tarihce',
  'genel',
  'teori',
  'ilke',
] as const

/**
 * Sorunun güncellik ihtiyacını belirler.
 * Kural önceliği:
 * 1) Live kelime varsa -> requires_live_data
 * 2) Aksi halde historical/conceptual sinyal -> static
 * 3) Varsayılan -> static
 */
export function classifyFreshnessNeed(question: string): FreshnessClass {
  const q = question.trim().toLowerCase()
  if (!q) return 'static'

  if (LIVE_HINTS.some((k) => q.includes(k))) return 'requires_live_data'
  if (STATIC_HINTS.some((k) => q.includes(k))) return 'static'
  return 'static'
}

export function requiresLiveData(question: string): boolean {
  return classifyFreshnessNeed(question) === 'requires_live_data'
}

