/**
 * Official Turkish legal sources configuration.
 * Phase 1: Mevzuat Bilgi Sistemi (mevzuat.gov.tr) and Resmî Gazete (resmigazete.gov.tr).
 * Used by the legal updates pipeline and assistant source priority.
 * No UYAP or other system integration is claimed; only public official sources.
 */

export type LegalSourceType = 'legislation' | 'gazette' | 'court_decisions'

export type UpdateFrequency = 'realtime' | 'daily' | 'weekly' | 'manual'

export interface LegalSource {
  id: string
  name: string
  type: LegalSourceType
  priority: number
  update_frequency: UpdateFrequency
  notes: string
  /** Official URL for human reference and documentation. */
  url?: string
}

/**
 * Official Turkish legal sources in priority order (lower number = higher priority).
 * Phase 1 scope: Mevzuat Bilgi Sistemi and Resmî Gazete for legislation.
 */
export const LEGAL_SOURCES: LegalSource[] = [
  {
    id: 'mevzuat-bilgi-sistemi',
    name: 'Mevzuat Bilgi Sistemi',
    type: 'legislation',
    priority: 1,
    update_frequency: 'daily',
    notes: 'Cumhurbaşkanlığı Mevzuat Bilgi Sistemi. Güncel kanun, KHK ve yönetmelik metinleri.',
    url: 'https://www.mevzuat.gov.tr/',
  },
  {
    id: 'resmi-gazete',
    name: 'Resmî Gazete',
    type: 'gazette',
    priority: 2,
    update_frequency: 'daily',
    notes: 'Kanun, KHK ve yönetmeliklerin yürürlüğe girdiği resmî yayın. Değişiklik tarihleri ve metinler burada yayımlanır.',
    url: 'https://www.resmigazete.gov.tr/',
  },
  {
    id: 'official-legislation-alt',
    name: 'Resmî mevzuat (kanunlar)',
    type: 'legislation',
    priority: 3,
    update_frequency: 'weekly',
    notes: 'TBMM ve Cumhurbaşkanlığı mevzuat metinleri. Güncel kanun metinleri için mevzuat.gov.tr kullanılır.',
    url: 'https://www.mevzuat.gov.tr/',
  },
  {
    id: 'yargitay-karar',
    name: 'Yargıtay Karar Arama',
    type: 'court_decisions',
    priority: 4,
    update_frequency: 'daily',
    notes: 'Yargıtay kararları bilgi bankası. İstinaf ve temyiz kararları için resmî kaynak.',
    url: 'https://karararama.yargitay.gov.tr/',
  },
  {
    id: 'aym-kararlar',
    name: 'Anayasa Mahkemesi Kararlar Bilgi Bankası',
    type: 'court_decisions',
    priority: 5,
    update_frequency: 'daily',
    notes: 'AYM kararları ve iptal / itiraz sonuçları. Anayasa uyumluluk ve temel hak içtihatı.',
    url: 'https://karararama.anayasa.gov.tr/',
  },
]

const BY_ID = new Map(LEGAL_SOURCES.map((s) => [s.id, s]))

export function getLegalSourceById(id: string): LegalSource | undefined {
  return BY_ID.get(id)
}

export function getLegalSourcesByType(type: LegalSourceType): LegalSource[] {
  return LEGAL_SOURCES.filter((s) => s.type === type).sort((a, b) => a.priority - b.priority)
}

/** Sources used for legislation/amendment tracking (phase 1: mevzuat.gov.tr, resmigazete.gov.tr). */
export function getLegalSourcesForAmendments(): LegalSource[] {
  return LEGAL_SOURCES.filter(
    (s) => s.type === 'legislation' || s.type === 'gazette'
  ).sort((a, b) => a.priority - b.priority)
}

export function getLegalSourcesForDecisions(): LegalSource[] {
  return LEGAL_SOURCES.filter((s) => s.type === 'court_decisions').sort((a, b) => a.priority - b.priority)
}

/** Official legislation URLs for phase 1 (no UYAP). */
export const OFFICIAL_LEGISLATION_URLS = {
  mevzuat: 'https://www.mevzuat.gov.tr/',
  resmigazete: 'https://www.resmigazete.gov.tr/',
} as const

/** Mevzuat numarası ve yerel dosya eşlemesi – otomatik veri çekme (fetch-mevzuat) için. */
export const MEVZUAT_FETCH_LAWS = [
  { no: 2709, file: 'anayasa.md', label: 'Türkiye Cumhuriyeti Anayasası', legalArea: 'Anayasa Hukuku' },
  { no: 5237, file: 'tck.md', label: 'Türk Ceza Kanunu', legalArea: 'Ceza Hukuku' },
  { no: 4721, file: 'tmk.md', label: 'Türk Medeni Kanunu', legalArea: 'Medeni Hukuk' },
  { no: 6098, file: 'tbk.md', label: 'Türk Borçlar Kanunu', legalArea: 'Borçlar Hukuku' },
  { no: 5271, file: 'cmk.md', label: 'Ceza Muhakemesi Kanunu', legalArea: 'Ceza Muhakemesi Hukuku' },
  { no: 6100, file: 'hmk.md', label: 'Hukuk Muhakemeleri Kanunu', legalArea: 'Hukuk Muhakemeleri Hukuku' },
] as const
