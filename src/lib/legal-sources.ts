/**
 * Official Turkish legal sources configuration.
 * Used by the legal updates pipeline and referenced in README / source transparency.
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
  /** Optional URL for human reference (no automated fetch in current pipeline). */
  url?: string
}

/**
 * Official Turkish legal sources in priority order (lower number = higher priority).
 * Legislation and Resmî Gazete are primary for amendments; court DBs for decisions.
 */
export const LEGAL_SOURCES: LegalSource[] = [
  {
    id: 'resmi-gazete',
    name: 'Resmî Gazete',
    type: 'gazette',
    priority: 1,
    update_frequency: 'daily',
    notes: 'Kanun, KHK ve yönetmeliklerin yürürlüğe girdiği resmî yayın. Değişiklik tarihleri ve metinler burada yayımlanır.',
    url: 'https://www.resmigazete.gov.tr/',
  },
  {
    id: 'official-legislation',
    name: 'Resmî mevzuat (kanunlar)',
    type: 'legislation',
    priority: 2,
    update_frequency: 'weekly',
    notes: 'TBMM ve Cumhurbaşkanlığı mevzuat metinleri. Güncel kanun metinleri için mevzuat portalları kullanılır.',
    url: 'https://www.mevzuat.gov.tr/',
  },
  {
    id: 'uyap-emsal',
    name: 'UYAP Emsal Karar Arama',
    type: 'court_decisions',
    priority: 3,
    update_frequency: 'daily',
    notes: 'Ulusal Yargı Ağı Projesi (UYAP) üzerinden emsal karar arama. İçtihat taraması için kullanılır.',
    url: 'https://uyap.adalet.gov.tr/',
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

export function getLegalSourcesForAmendments(): LegalSource[] {
  return LEGAL_SOURCES.filter((s) => s.type === 'legislation' || s.type === 'gazette').sort((a, b) => a.priority - b.priority)
}

export function getLegalSourcesForDecisions(): LegalSource[] {
  return LEGAL_SOURCES.filter((s) => s.type === 'court_decisions').sort((a, b) => a.priority - b.priority)
}
