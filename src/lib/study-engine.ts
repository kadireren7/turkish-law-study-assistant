/**
 * Lightweight personalized study engine.
 * Tracks practice by subject, scores, missed points; suggests tekrar, pratik, zayıf alan, pekiştirme.
 * Data in localStorage only; no user account or server-side identity. Fully Turkish.
 */

const STORAGE_KEY = 'hukuk-study-profile'
const MAX_MISSED = 20
const WEAK_SCORE_THRESHOLD = 60
const MIN_PRACTICE_FOR_SUGGESTIONS = 1

export type SubjectKey = 'ceza' | 'medeni' | 'borclar' | 'anayasa' | 'idare' | 'karma' | 'genel'

export const SUBJECT_LABELS: Record<SubjectKey, string> = {
  ceza: 'Ceza Hukuku',
  medeni: 'Medeni Hukuk',
  borclar: 'Borçlar Hukuku',
  anayasa: 'Anayasa Hukuku',
  idare: 'İdare Hukuku',
  karma: 'Karışık / Karma',
  genel: 'Genel',
}

export type StudyProfile = {
  /** Her alanda kaç kez pratik/sözlü/olay yapıldı */
  subjectCount: Record<SubjectKey, number>
  /** Alan bazında toplam puan ve deneme sayısı (sadece Sınav Pratiği puanları) */
  subjectScores: Record<SubjectKey, { sum: number; n: number }>
  /** Son atlanan/eksik/hatalı noktalar (en fazla MAX_MISSED) */
  missedDistinctions: string[]
  /** Son aktivite zamanı (ISO string) */
  lastActivityAt: string | null
}

const DEFAULT_PROFILE: StudyProfile = {
  subjectCount: {
    ceza: 0,
    medeni: 0,
    borclar: 0,
    anayasa: 0,
    idare: 0,
    karma: 0,
    genel: 0,
  },
  subjectScores: {
    ceza: { sum: 0, n: 0 },
    medeni: { sum: 0, n: 0 },
    borclar: { sum: 0, n: 0 },
    anayasa: { sum: 0, n: 0 },
    idare: { sum: 0, n: 0 },
    karma: { sum: 0, n: 0 },
    genel: { sum: 0, n: 0 },
  },
  missedDistinctions: [],
  lastActivityAt: null,
}

function normalizeSubjectFromTopic(topic: string): SubjectKey {
  const t = topic.toLowerCase()
  if (t.includes('ceza')) return 'ceza'
  if (t.includes('medeni')) return 'medeni'
  if (t.includes('borç') || t.includes('borclar')) return 'borclar'
  if (t.includes('anayasa')) return 'anayasa'
  if (t.includes('idare')) return 'idare'
  if (t.includes('karışık') || t.includes('karma') || t.includes('mülkiyet') || t.includes('usul')) return 'karma'
  return 'genel'
}

function normalizeSubjectFromCategory(category: string | undefined): SubjectKey {
  if (!category) return 'genel'
  const c = category.toLowerCase()
  if (c.includes('ceza')) return 'ceza'
  if (c.includes('medeni')) return 'medeni'
  if (c.includes('borç') || c.includes('borclar')) return 'borclar'
  if (c.includes('anayasa')) return 'anayasa'
  if (c.includes('idare')) return 'idare'
  return 'genel'
}

export function getProfile(): StudyProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PROFILE, subjectCount: { ...DEFAULT_PROFILE.subjectCount }, subjectScores: { ...DEFAULT_PROFILE.subjectScores } }
    const parsed = JSON.parse(raw) as Partial<StudyProfile>
    const subjectCount = { ...DEFAULT_PROFILE.subjectCount, ...parsed.subjectCount }
    const subjectScores = { ...DEFAULT_PROFILE.subjectScores, ...parsed.subjectScores }
    const missedDistinctions = Array.isArray(parsed.missedDistinctions)
      ? parsed.missedDistinctions.slice(0, MAX_MISSED)
      : []
    return {
      subjectCount,
      subjectScores,
      missedDistinctions,
      lastActivityAt: typeof parsed.lastActivityAt === 'string' ? parsed.lastActivityAt : null,
    }
  } catch {
    return { ...DEFAULT_PROFILE, subjectCount: { ...DEFAULT_PROFILE.subjectCount }, subjectScores: { ...DEFAULT_PROFILE.subjectScores } }
  }
}

function saveProfile(p: StudyProfile): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      subjectCount: p.subjectCount,
      subjectScores: p.subjectScores,
      missedDistinctions: p.missedDistinctions.slice(0, MAX_MISSED),
      lastActivityAt: p.lastActivityAt,
    }))
  } catch {
    // ignore
  }
}

/** Sınav Pratiği: değerlendirme sonrası çağrılır */
export function recordPractice(params: {
  topic: string
  score: number
  improvePoints?: string[]
  missedPoints?: string[]
  legalErrors?: string[]
}): void {
  const profile = getProfile()
  const subject = normalizeSubjectFromTopic(params.topic)
  profile.subjectCount[subject] = (profile.subjectCount[subject] ?? 0) + 1
  const sc = profile.subjectScores[subject] ?? { sum: 0, n: 0 }
  profile.subjectScores[subject] = { sum: sc.sum + params.score, n: sc.n + 1 }
  const toAdd = [
    ...(params.improvePoints ?? []),
    ...(params.missedPoints ?? []),
    ...(params.legalErrors ?? []),
  ].filter(Boolean)
  const seen = new Set(profile.missedDistinctions.map((s) => s.slice(0, 80)))
  for (const s of toAdd) {
    const key = s.slice(0, 80)
    if (!seen.has(key)) {
      seen.add(key)
      profile.missedDistinctions.unshift(s)
    }
  }
  profile.missedDistinctions = profile.missedDistinctions.slice(0, MAX_MISSED)
  profile.lastActivityAt = new Date().toISOString()
  saveProfile(profile)
}

const SUBJECT_KEYS: SubjectKey[] = ['ceza', 'medeni', 'borclar', 'anayasa', 'idare', 'karma', 'genel']

/** Mini Sözlü: her sözlü yanıt/round sonrası çağrılabilir */
export function recordOralTopic(topic: string): void {
  const profile = getProfile()
  const key: SubjectKey = SUBJECT_KEYS.includes(topic as SubjectKey) ? (topic as SubjectKey) : normalizeSubjectFromTopic(topic)
  profile.subjectCount[key] = (profile.subjectCount[key] ?? 0) + 1
  profile.lastActivityAt = new Date().toISOString()
  saveProfile(profile)
}

/** Olay Analizi: analiz sonrası çağrılır */
export function recordCaseAnalysis(category: string | undefined): void {
  const profile = getProfile()
  const subject = normalizeSubjectFromCategory(category)
  profile.subjectCount[subject] = (profile.subjectCount[subject] ?? 0) + 1
  profile.lastActivityAt = new Date().toISOString()
  saveProfile(profile)
}

export type StudySuggestions = {
  tekrarOnerileri: string[]
  pratikOnerileri: string[]
  zayifAlanOnerileri: string[]
  konuPekistirme: string[]
}

export function getSuggestions(profile?: StudyProfile): StudySuggestions {
  const p = profile ?? getProfile()
  const tekrarOnerileri: string[] = []
  const pratikOnerileri: string[] = []
  const zayifAlanOnerileri: string[] = []
  const konuPekistirme: string[] = []

  const totalPractice = Object.values(p.subjectCount).reduce((a, b) => a + b, 0)
  if (totalPractice < MIN_PRACTICE_FOR_SUGGESTIONS) {
    return { tekrarOnerileri: ['Daha fazla pratik yaptıkça burada kişiselleştirilmiş öneriler göreceksiniz.'], pratikOnerileri, zayifAlanOnerileri, konuPekistirme }
  }

  const subjects = (Object.keys(p.subjectCount) as SubjectKey[]).filter((k) => (p.subjectCount[k] ?? 0) > 0)
  const byCount = [...subjects].sort((a, b) => (p.subjectCount[b] ?? 0) - (p.subjectCount[a] ?? 0))

  if (byCount.length >= 1) {
    const top = byCount[0]
    tekrarOnerileri.push(`${SUBJECT_LABELS[top]} en çok çalıştığınız alan; tekrar için iyi bir seçim.`)
  }
  if (byCount.length >= 2) {
    tekrarOnerileri.push(`${SUBJECT_LABELS[byCount[1]]} ile birlikte düzenli tekrar yapabilirsiniz.`)
  }

  const weak: SubjectKey[] = []
  for (const k of Object.keys(p.subjectScores) as SubjectKey[]) {
    const s = p.subjectScores[k]
    if (s.n >= 1) {
      const avg = s.sum / s.n
      if (avg < WEAK_SCORE_THRESHOLD) weak.push(k)
    }
  }
  for (const k of weak) {
    zayifAlanOnerileri.push(`${SUBJECT_LABELS[k]} ortalaması düşük; bu alanda zayıf alan çalışması önerilir.`)
  }
  if (weak.length === 0 && totalPractice >= 2) {
    zayifAlanOnerileri.push('Puanlarınız genel olarak iyi görünüyor; zayıf gördüğünüz konulara odaklanabilirsiniz.')
  }

  const leastPracticed = byCount.length > 0 ? byCount[byCount.length - 1] : null
  if (leastPracticed && (p.subjectCount[leastPracticed] ?? 0) < (p.subjectCount[byCount[0]] ?? 0)) {
    pratikOnerileri.push(`${SUBJECT_LABELS[leastPracticed]} konusunda yeni pratik soru çözmeniz faydalı olabilir.`)
  }
  if (weak.length > 0) {
    pratikOnerileri.push(`Zayıf alanlarınızdan biri olan ${SUBJECT_LABELS[weak[0]]} için Sınav Pratiği veya Mini Sözlü kullanın.`)
  }
  if (pratikOnerileri.length === 0 && totalPractice >= 1) {
    pratikOnerileri.push('Sınav Pratiği veya Mini Sözlü Yoklama ile farklı konularda soru çözebilirsiniz.')
  }

  if (p.missedDistinctions.length > 0) {
    konuPekistirme.push('Atlanan veya eksik kalan noktaları tekrar gözden geçirin:')
    p.missedDistinctions.slice(0, 5).forEach((m) => konuPekistirme.push(`• ${m.slice(0, 120)}${m.length > 120 ? '…' : ''}`))
  }

  return { tekrarOnerileri, pratikOnerileri, zayifAlanOnerileri, konuPekistirme }
}

/** Toplam pratik sayısı (öneri bloğu göstermek için) */
export function getTotalPracticeCount(profile?: StudyProfile): number {
  const p = profile ?? getProfile()
  return Object.values(p.subjectCount).reduce((a, b) => a + b, 0)
}
