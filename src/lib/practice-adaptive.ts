export type PracticeDifficulty = 'kolay' | 'orta' | 'zor' | 'karisik'

export type MistakeTag =
  | 'issue_spotting'
  | 'wrong_rule'
  | 'misapplication'
  | 'weak_conclusion'
  | 'missing_counterview'
  | 'writing_clarity'

export function deriveMistakeTags(input: {
  improvePoints?: string[]
  legalErrors?: string[]
  missedPoints?: string[]
  score: number
}): MistakeTag[] {
  const pool = [
    ...(input.improvePoints ?? []),
    ...(input.legalErrors ?? []),
    ...(input.missedPoints ?? []),
  ].join(' ').toLowerCase()

  const tags = new Set<MistakeTag>()
  if (/\bsorun\b|tespit|issue|olaydaki sorun/.test(pool)) tags.add('issue_spotting')
  if (/\bmadde\b|kural|norm|yanlış madde|hatalı kural/.test(pool)) tags.add('wrong_rule')
  if (/\buygula|uygulama|eşleş|unsur|illiyet|değerlendir/.test(pool)) tags.add('misapplication')
  if (/\bsonuç\b|netice|hüküm/.test(pool)) tags.add('weak_conclusion')
  if (/\btartış|karşı görüş|baskın görüş|güvenli yazım/.test(pool)) tags.add('missing_counterview')
  if (/\byazım\b|ifade|dil|dağınık|anlaşılır/.test(pool)) tags.add('writing_clarity')

  if (tags.size === 0 && input.score < 60) tags.add('misapplication')
  if (tags.size === 0 && input.score < 75) tags.add('issue_spotting')
  return Array.from(tags)
}

export function inferNextDifficulty(score: number, current: PracticeDifficulty): PracticeDifficulty {
  const order: PracticeDifficulty[] = ['kolay', 'orta', 'zor']
  const idx = Math.max(0, order.indexOf(current === 'karisik' ? 'orta' : current))
  if (score >= 80) return order[Math.min(order.length - 1, idx + 1)]
  if (score < 50) return order[Math.max(0, idx - 1)]
  return current === 'karisik' ? 'orta' : current
}

export function buildAdaptiveFocusLine(tags: MistakeTag[]): string {
  if (tags.length === 0) return ''
  const map: Record<MistakeTag, string> = {
    issue_spotting: 'olaydaki hukuki sorunu net tespit etmeye zorlayan',
    wrong_rule: 'doğru norm/madde seçimini ölçen',
    misapplication: 'kuralın olaya uygulanmasını zorlayan',
    weak_conclusion: 'net ve kaynak-temelli sonuç kurduran',
    missing_counterview: 'tartışmalı konularda görüş ayrımını gerektiren',
    writing_clarity: 'yapılı, kısa ve sınav dilinde yazımı ölçen',
  }
  return `Adaptif odak: ${tags.slice(0, 3).map((t) => map[t]).join(', ')} soru üret.`
}

