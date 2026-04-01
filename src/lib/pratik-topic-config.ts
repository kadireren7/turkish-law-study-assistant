/**
 * Sınav Pratiği: Ana konu ve alt konu seçimi (Türk hukuk fakültesi müfredatına göre).
 * Ana konu seçilince alt konular dinamik gösterilir; sorular yalnızca seçilen alt konu kapsamında üretilir.
 */

export type MainTopicId =
  | 'medeni'
  | 'borclar'
  | 'ceza'
  | 'anayasa'
  | 'siyasi_tarih'
  | 'idare'
  | 'cmk'
  | 'hmk'
  | 'karma'

export type SubtopicItem = { value: string; label: string }

export const MAIN_TOPICS: { id: MainTopicId; value: string; label: string }[] = [
  { id: 'medeni', value: 'Medeni Hukuk', label: 'Medeni Hukuk' },
  { id: 'borclar', value: 'Borçlar Hukuku', label: 'Borçlar Hukuku' },
  { id: 'ceza', value: 'Ceza Hukuku', label: 'Ceza Hukuku' },
  { id: 'anayasa', value: 'Anayasa Hukuku', label: 'Anayasa Hukuku' },
  { id: 'siyasi_tarih', value: 'Siyasi Tarih', label: 'Siyasi Tarih' },
  { id: 'idare', value: 'İdare Hukuku', label: 'İdare Hukuku' },
  { id: 'cmk', value: 'CMK', label: 'Ceza Muhakemesi Kanunu' },
  { id: 'hmk', value: 'HMK', label: 'Hukuk Muhakemeleri Kanunu' },
  { id: 'karma', value: 'Karma', label: 'Karma (çoklu dal)' },
]

const SUBTOPICS: Record<MainTopicId, SubtopicItem[]> = {
  medeni: [
    { value: 'Başlangıç Hükümleri', label: 'Başlangıç Hükümleri' },
    { value: 'Kişiler Hukuku', label: 'Kişiler Hukuku' },
    { value: 'Kişilik Hakları', label: 'Kişilik Hakları' },
    { value: 'Yerleşim Yeri', label: 'Yerleşim Yeri' },
    { value: 'Vesayet', label: 'Vesayet' },
    { value: 'Aile Hukuku', label: 'Aile Hukuku' },
    { value: 'Nişanlanma ve Evlenme', label: 'Nişanlanma ve Evlenme' },
    { value: 'Eşya Hukuku', label: 'Eşya Hukuku' },
    { value: 'Zilyetlik ve Mülkiyet', label: 'Zilyetlik ve Mülkiyet' },
    { value: 'Miras Hukuku', label: 'Miras Hukuku' },
    { value: 'Hısımlık', label: 'Hısımlık' },
  ],
  borclar: [
    { value: 'Borç İlişkisi', label: 'Borç İlişkisi' },
    { value: 'Sözleşmeler', label: 'Sözleşmeler' },
    { value: 'İfa ve İfa Engelleri', label: 'İfa ve İfa Engelleri' },
    { value: 'Temerrüt', label: 'Temerrüt' },
    { value: 'İmkansızlık', label: 'İmkansızlık' },
    { value: 'Haksız Fiil', label: 'Haksız Fiil' },
    { value: 'Sebepsiz Zenginleşme', label: 'Sebepsiz Zenginleşme' },
    { value: 'Temsil', label: 'Temsil' },
    { value: 'İrade Sakatlıkları', label: 'İrade Sakatlıkları' },
    { value: 'Sorumluluk Halleri', label: 'Sorumluluk Halleri' },
  ],
  ceza: [
    { value: 'Kast ve Taksir', label: 'Kast ve Taksir' },
    { value: 'Teşebbüs', label: 'Teşebbüs' },
    { value: 'İştirak', label: 'İştirak' },
    { value: 'İçtima', label: 'İçtima' },
    { value: 'Suçun Unsurları', label: 'Suçun Unsurları' },
    { value: 'Suçun Maddi ve Manevi Unsurları', label: 'Suçun Maddi ve Manevi Unsurları' },
    { value: 'Meşru Savunma', label: 'Meşru Savunma' },
    { value: 'Hata Halleri', label: 'Hata Halleri' },
  ],
  anayasa: [
    { value: 'Temel Haklar ve Özgürlükler', label: 'Temel Haklar ve Özgürlükler' },
    { value: 'Devlet Organları', label: 'Devlet Organları' },
    { value: 'Anayasal Yargı', label: 'Anayasal Yargı' },
    { value: 'Olağanüstü Yönetim', label: 'Olağanüstü Yönetim' },
    { value: 'Siyasi Tarih ve Anayasal Dönüşüm', label: 'Siyasi Tarih ve Anayasal Dönüşüm' },
  ],
  siyasi_tarih: [
    { value: 'Osmanlıdan Cumhuriyete Geçiş', label: 'Osmanlıdan Cumhuriyete Geçiş' },
    { value: '1921-1924 Anayasal Düzen', label: '1921-1924 Anayasal Düzen' },
    { value: '1961-1982 Anayasa Karşılaştırması', label: '1961-1982 Anayasa Karşılaştırması' },
    { value: 'Demokratikleşme ve Reform Süreçleri', label: 'Demokratikleşme ve Reform Süreçleri' },
    { value: 'Zaman Çizelgesi ve Neden-Sonuç', label: 'Zaman Çizelgesi ve Neden-Sonuç' },
  ],
  idare: [
    { value: 'İdari İşlem', label: 'İdari İşlem' },
    { value: 'Yetki ve Görev', label: 'Yetki ve Görev' },
    { value: 'Kamu Hizmeti', label: 'Kamu Hizmeti' },
    { value: 'İdari Yargılama', label: 'İdari Yargılama' },
  ],
  cmk: [
    { value: 'Soruşturma', label: 'Soruşturma' },
    { value: 'Kovuşturma', label: 'Kovuşturma' },
    { value: 'Deliller', label: 'Deliller' },
    { value: 'Kanun Yolları', label: 'Kanun Yolları' },
  ],
  hmk: [
    { value: 'Dava Şartları', label: 'Dava Şartları' },
    { value: 'İspat', label: 'İspat' },
    { value: 'Tahkim', label: 'Tahkim' },
    { value: 'İcra ve İtiraz', label: 'İcra ve İtiraz' },
  ],
  karma: [
    { value: 'Ceza + Medeni', label: 'Ceza + Medeni' },
    { value: 'Borçlar + Usul', label: 'Borçlar + Usul' },
    { value: 'İdare + Anayasa', label: 'İdare + Anayasa' },
    { value: 'Genel Karma', label: 'Genel Karma' },
  ],
}

export function getSubtopics(mainTopicId: MainTopicId): SubtopicItem[] {
  return SUBTOPICS[mainTopicId] ?? []
}

/** Tam konu metni: ana alan + alt konu (generate prompt ve UI etiketinde kullanılır). */
export function buildTopicLabel(mainTopicId: MainTopicId, subtopicValue: string): string {
  const main = MAIN_TOPICS.find((m) => m.id === mainTopicId)
  const mainLabel = main?.label ?? mainTopicId
  if (!subtopicValue || mainTopicId === 'karma') return mainLabel
  return `${mainLabel} – ${subtopicValue}`
}

/** Soru tarzı seçenekleri (Sınav Pratiği). */
export const QUESTION_STYLES = [
  { value: 'tek_olay_tek_soru', label: 'Tek olay, tek soru' },
  { value: 'tek_olay_cok_soru', label: 'Tek olay, çok soru' },
  { value: 'karma_set', label: 'Karma pratik seti' },
  { value: 'kisa_olay', label: 'Kısa olay soruları' },
  { value: 'derin_analiz', label: 'Derin analiz vakası' },
] as const

export type QuestionStyleValue = (typeof QUESTION_STYLES)[number]['value']
