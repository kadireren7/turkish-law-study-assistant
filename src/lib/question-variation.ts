/**
 * Lightweight variation hints for question generation.
 * Reduces repetitive patterns: legal facts, branch-specific issues, wording, complexity,
 * conflict types, issue-spotting patterns. Prioritizes realistic scenarios.
 */

const FACT_PATTERNS = [
  'günlük hayat (trafik, komşuluk, alışveriş, iş)',
  'aile / miras / kişisel ilişkiler',
  'ticari ilişki (sözleşme, ifa, cayma)',
  'fiziksel olay (yaralama, zarar, kaza)',
  'idari başvuru / kamu hizmeti / vergi',
  'mal veya hak üzerinde tasarruf / el atma',
  'sözlü anlaşma veya yazılı belge ihtilafı',
  'üçüncü kişi veya kurumun dahil olduğu durum',
  'mesleki veya özel güven ilişkisi',
  'taşınır/taşınmaz el atma veya zilyetlik',
]

const CONFLICT_TYPES = [
  'sorumluluk / kusur',
  'hakkın doğup doğmaması / geçerlilik',
  'tazminat veya edimin istenebilirliği',
  'idari işlemin hukuka uygunluğu',
  'unsur eksikliği veya fazlalığı (ceza)',
  'sebep-sonuç / illiyet',
  'süre / zamanaşımı / hak düşürücü süre',
  'ehliyet / temsil',
  'ispat yükü / delil',
  'yetki / görev',
  'şekil / geçerlilik koşulu',
]

const WORDING_STYLES = [
  'Doğrudan olay anlatımı; "A, B\'ye … yapmıştır."',
  'Diyalog veya beyan içeren kısa alıntı ile.',
  'Tarih ve yer belirterek somutlaştır.',
  'Önce durum, sonra eylem; "… olup A, …"',
  'Kısa paragraf; değerlendirme isteğini cümle sonunda ver.',
  'Sorunlu noktayı vurgulayan bir cümle ile başla.',
  'Üçüncü kişi anlatımı; "X, Y\'nin … yaptığını iddia etmektedir."',
]

const DEPTH_HINTS = [
  'Tek odak: tek hukuki sorun, net olay.',
  'İki bağlantılı nokta: ana sorun + yan soru (süre, ehliyet vb.).',
  'Birden fazla taraf veya iki farklı hukuki sorun.',
]

/** Issue-spotting angle: how the student is expected to approach the problem. */
const ISSUE_SPOTTING_PATTERNS = [
  'Tek ana sorun; öğrenci sorunu tespit edip kural–uygulama–sonuç yazsın.',
  'İki ayrı hukuki sorun; her biri için ayrı değerlendirme gereksin.',
  'Sınır olayı: tartışmalı nitelendirme (örn. kast/taksir sınırı); iki görüşü de kısaca değerlendir.',
  'Savunma veya istisna odaklı: unsurlar tamam mı, bir istisna/savunma gündeme gelir mi?',
  'Zamanlama veya usul noktası: süre, zamanaşımı, yetki veya usul kuralı da işe karışsın.',
]

/** Complexity: clarity of the scenario. */
const COMPLEXITY_HINTS = [
  'Net olay: olgular açık, tek bir hukuki sonuç ağır basar.',
  'Sınırda olay: iki sonuç da savunulabilir; öğrenci her iki görüşü de kısaca yazabilsin.',
  'Çoklu kural: birden fazla madde veya ilke uygulanabilir; öncelik veya birlikte uygulama gereksin.',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickTwo<T>(arr: T[]): [T, T] {
  const i = Math.floor(Math.random() * arr.length)
  let j = Math.floor(Math.random() * arr.length)
  while (j === i) j = Math.floor(Math.random() * arr.length)
  return [arr[i], arr[j]]
}

export type VariationHints = {
  factPattern: string
  conflictType: string
  wordingStyle: string
  depthHint: string
  issueSpotting?: string
  complexity?: string
  secondaryConflict?: string
}

export function getRandomVariationHints(): VariationHints {
  const [c1, c2] = pickTwo(CONFLICT_TYPES)
  return {
    factPattern: pick(FACT_PATTERNS),
    conflictType: c1,
    secondaryConflict: c2,
    wordingStyle: pick(WORDING_STYLES),
    depthHint: pick(DEPTH_HINTS),
    issueSpotting: pick(ISSUE_SPOTTING_PATTERNS),
    complexity: pick(COMPLEXITY_HINTS),
  }
}

/** Tek istek için varyasyon talimatı (Pratik Çöz / exam generate). */
export function buildVariationInstruction(hints: VariationHints): string {
  const parts = [
    `Olay türü: ${hints.factPattern}.`,
    `Hukuki çatışma odağı: ${hints.conflictType}.`,
    hints.secondaryConflict ? `İkinci odağı da düşün (örn. ${hints.secondaryConflict}).` : '',
    `Anlatım: ${hints.wordingStyle}`,
    `Derinlik: ${hints.depthHint}`,
    hints.issueSpotting ? `Sorun tespiti açısı: ${hints.issueSpotting}` : '',
    hints.complexity ? `Zorluk/kesinlik: ${hints.complexity}` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

/** Quiz: 5 soruda kullanılacak soru türü karışımı (tanım, olay, ayrım, madde, karşılaştırma). */
const QUIZ_QUESTION_STYLES = [
  'kavram tanımı (kısa, tek kavram)',
  'kısa olay / vaka uygulaması (sonuç veya kural sorusu)',
  'ayrım (X ile Y farkı; hangi durumda hangisi)',
  'madde uygulama (verilen durumda hangi madde/ilke)',
  'karşılaştırma veya unsurlar (doğru/yanlış ifade)',
]

export type QuizVariationHints = {
  styleMix: string[]
  factFocus: string
  conflictFocus: string
}

/** Her quiz isteğinde 5 soru için farklı tür karışımı ve odak. */
export function getQuizVariationHints(): QuizVariationHints {
  const shuffled = [...QUIZ_QUESTION_STYLES].sort(() => Math.random() - 0.5)
  return {
    styleMix: shuffled,
    factFocus: pick(FACT_PATTERNS),
    conflictFocus: pick(CONFLICT_TYPES),
  }
}

export function buildQuizVariationInstruction(hints: QuizVariationHints, questionCount: number = 5): string {
  const styleList = hints.styleMix.map((s, i) => `${i + 1}. ${s}`).join('; ')
  return `${questionCount} soruda farklı türler kullan: ${styleList}. Olay odaklı sorularda olay türü: ${hints.factFocus}; çatışma odağı: ${hints.conflictFocus}. Salt "X nedir?" tanım sorusunu en fazla 1–2 soruda kullan; geri kalanında olay, ayrım veya uygulama tercih et.`
}
