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
  'iş ilişkisi / işçi işveren / kıdem',
  'kamu görevlisi / yetki aşımı / idari işlem',
  'miras paylaşımı / vasiyet / mal paylaşımı',
  'sözleşme öncesi / müzakere / ön sözleşme',
  'tüketici / satış / garanti / ayıplı mal',
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
  'Çok boyutlu: aynı olayda ceza + tazminat veya idari işlem + yargı yolu gibi iki dal.',
  'Sınır olayı: tartışmalı nitelendirme (kast/taksir, icap/kabul); iki görüş de savunulabilir.',
]

/** Medeni Hukuk: tek tip (haksız fiil/tazminat) senaryo yerine dönüşümlü kullanılacak temalar. */
export const MEDENI_THEME_HINTS = [
  'ehliyet / ayırt etme gücü / sınırlı ehliyet',
  'kişilik hakları / manevi tazminat / kişilik hakkının korunması',
  'yerleşim yeri / yerleşim yeri tespiti',
  'vesayet / vesayet altına alma / kısıtlılık',
  'aile hukuku: evlenme koşulları / butlan / mal rejimi',
  'aile hukuku: boşanma / velayet / nafaka',
  'nişanlanma / nişanın hükümleri / tazminat',
  'hısımlık / soybağı / evlat edinme',
  'eşya hukuku: mülkiyet / zilyetlik / tapu',
  'eşya hukuku: devir / teslim / ayni haklar',
  'miras hukuku: mirasçılık / saklı pay / tenkis',
  'miras hukuku: vasiyet / ölüme bağlı tasarruf',
  'başlangıç hükümleri / kanunun uygulama alanı / iyi niyet',
] as const

/** Medeni Hukuk seçiliyse bu oturumda kullanılacak tema (tek tip senaryo önleme). */
export function getMedeniDiversityHint(): string {
  return `Medeni Hukuk çeşitliliği: Bu soruda "${MEDENI_THEME_HINTS[Math.floor(Math.random() * MEDENI_THEME_HINTS.length)]}" temasını kullan. Haksız fiil / tazminat odaklı tek tip senaryo üretme.`
}

/** Çok boyutlu senaryo: aynı olayda hangi dallar/sorunlar bir arada işlensin. */
const MULTI_DIMENSION_HINTS = [
  'Ceza (unsur/kusur) + Borçlar (tazminat/haksız fiil)',
  'Medeni (ehliyet/aile/mülkiyet) + Usul (süre/yetki)',
  'İdare (idari işlem/yetki) + Anayasa (temel hak/sınırlama)',
  'Sözleşme (ifa/cayma) + Haksız fiil sınırı',
  'İki ayrı ceza veya iki ayrı medeni sorun aynı olayda',
  'Usul (HMK/CMK) + Esas (ceza/medeni/borçlar)',
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
  multiDimension?: string
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
    multiDimension: pick(MULTI_DIMENSION_HINTS),
  }
}

/** Tek istek için varyasyon talimatı (Sınav Pratiği / exam generate). */
export function buildVariationInstruction(hints: VariationHints): string {
  const parts = [
    `Olay türü: ${hints.factPattern}.`,
    `Hukuki çatışma odağı: ${hints.conflictType}.`,
    hints.secondaryConflict ? `İkinci odağı da düşün (örn. ${hints.secondaryConflict}).` : '',
    `Anlatım: ${hints.wordingStyle}`,
    `Derinlik: ${hints.depthHint}`,
    hints.issueSpotting ? `Sorun tespiti açısı: ${hints.issueSpotting}` : '',
    hints.complexity ? `Zorluk/kesinlik: ${hints.complexity}` : '',
    hints.multiDimension ? `Çok boyut (tercih): ${hints.multiDimension}.` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

/** Alt konu odaklı kısa talimat: verilen ana konu + alt konu için üretimde kullanılacak. */
export function getSubtopicFocusInstruction(mainTopicId: string, subtopicValue: string): string {
  if (!subtopicValue || mainTopicId === 'karma') return ''
  const key = `${mainTopicId}:${subtopicValue}`.toLowerCase()
  const hints: Record<string, string> = {
    'ceza:kast ve taksir': 'Alt konu: Kast ve Taksir. Bilinçli taksir, olası kast, dolaylı kast, basit taksir ayrımlarını senaryoda kullan; tekrara düşme.',
    'ceza:teşebbüs': 'Alt konu: Teşebbüs. Tamamlanmamış suç, elverişli hareket, gönüllü vazgeçme gibi kavramlara odaklan.',
    'ceza:iştirak': 'Alt konu: İştirak. Faillik, azmettirme, yardım etme ayrımı; birden fazla fail/yardımcı senaryoları.',
    'ceza:içtima': 'Alt konu: İçtima. Zincirleme suç, fikri içtima, gerçek içtima gibi durumlara uygun olay kur.',
    'ceza:suçun unsurları': 'Alt konu: Suçun unsurları. Maddi/mani unsurlar, hukuka uygunluk nedenleri; olayda unsurları tartıştır.',
    'ceza:suçun maddi ve manevi unsurları': 'Alt konu: Suçun maddi ve manevi unsurları. Tipiklik, illiyet, kusur türleri; olayda unsurları tartıştır.',
    'ceza:meşru savunma': 'Alt konu: Meşru savunma. Saldırı, orantı, sınırlar; hukuka uygunluk nedeni odaklı senaryo.',
    'ceza:hata halleri': 'Alt konu: Hata halleri. Fiil hatası, hukuk hatası; kusur ve bilinç odaklı.',
    'medeni:başlangıç hükümleri': 'Alt konu: YALNIZCA Başlangıç Hükümleri (TMK 1–7, kanunun uygulama alanı, iyi niyet, dürüstlük kuralı, hukuki işlemler, hakların kullanılması). Bu alt konu dışına çıkma: nişanlanma, evlenme, aile, miras, eşya konularına girme.',
    'medeni:aile hukuku': 'Alt konu: Aile Hukuku. Evlilik, mal rejimi, boşanma, velayet, nafaka gibi konulara özgü senaryo.',
    'medeni:eşya hukuku': 'Alt konu: Eşya Hukuku. Mülkiyet, zilyetlik, tapu, devir; ayni haklar odaklı.',
    'medeni:zilyetlik ve mülkiyet': 'Alt konu: Zilyetlik ve Mülkiyet. Zilyetlik türleri, mülkiyetin korunması, tapu.',
    'medeni:miras hukuku': 'Alt konu: Miras Hukuku. Mirasçılık, miras payı, tenkis, vasiyet gibi kavramlara odaklan.',
    'medeni:kişiler hukuku': 'Alt konu: Kişiler Hukuku. Ehliyet, temsil, vesayet.',
    'medeni:kişilik hakları': 'Alt konu: Kişilik hakları. Kişilik hakkının korunması, manevi tazminat.',
    'medeni:yerleşim yeri': 'Alt konu: Yerleşim yeri. Yerleşim yeri kavramı, tespit, hukuki sonuçları.',
    'medeni:vesayet': 'Alt konu: Vesayet. Vesayet altına alma, vesayet organları, vesayet kaldırma.',
    'medeni:nişanlanma ve evlenme': 'Alt konu: Nişanlanma ve evlenme. Nişanlılık, evlenme koşulları, butlan.',
    'medeni:hısımlık': 'Alt konu: Hısımlık. Kan hısımlığı, kayın hısımlığı, hukuki sonuçları.',
    'borclar:borç ilişkisi': 'Alt konu: Borç ilişkisi. Borcun kaynakları, edim, alacaklı-borçlu.',
    'borclar:sözleşmeler': 'Alt konu: Sözleşmeler. İcap-kabul, ifa, cayma, sebepsiz zenginleşme sınırı.',
    'borclar:haksız fiil': 'Alt konu: Haksız Fiil. Kusur, illiyet, zarar; TBK haksız fiil hükümlerine uygun olay.',
    'borclar:sebepsiz zenginleşme': 'Alt konu: Sebepsiz Zenginleşme. İade, sebep yokluğu; sözleşme/haksız fiil ile sınır.',
    'borclar:ifa ve ifa engelleri': 'Alt konu: İfa ve İfa Engelleri. İfa, temerrüt, mücbir sebep, kısmi ifa.',
    'borclar:temerrüt': 'Alt konu: Temerrüt. Borçlunun temerrüdü, alacaklının temerrüdü, sonuçları.',
    'borclar:imkansızlık': 'Alt konu: İmkansızlık. Objektif/sübjektif imkansızlık, ifanın sona ermesi.',
    'borclar:temsil': 'Alt konu: Temsil. Yetkili yetkisiz temsil, açıklama, sonuçları.',
    'borclar:irade sakatlıkları': 'Alt konu: İrade sakatlıkları. Hata, hile, korku; iptal, tazminat.',
    'borclar:sorumluluk halleri': 'Alt konu: Sorumluluk halleri. Kusur sorumluluğu, sebep sorumluluğu, kusursuz sorumluluk.',
    'idare:idari işlem': 'Alt konu: İdari İşlem. İşlem türü, yetki, şekil, idari yargı yolu.',
    'idare:yetki ve görev': 'Alt konu: Yetki ve Görev. Görevli makam, yetki aşımı, yetki gaspı.',
    'anayasa:temel haklar ve özgürlükler': 'Alt konu: Temel Haklar. Sınırlama ölçüsü, ölçülülük; somut olayda hak ihlali iddiası.',
    'hmk:dava şartları': 'Alt konu: Dava şartları. Görev, yetki, süre, dava ehliyeti.',
    'hmk:ispat': 'Alt konu: İspat. İspat yükü, deliller, karine.',
    'cmk:soruşturma': 'Alt konu: Soruşturma. Şüpheli, zorla getirme, arama, el koyma.',
    'cmk:deliller': 'Alt konu: Deliller. Toplama, değerlendirme, dinleme.',
  }
  return hints[key] ?? `Alt konu: ${subtopicValue}. Bu alt konuya özgü kavram ve maddeleri kullan; konu dışına çıkma.`
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
