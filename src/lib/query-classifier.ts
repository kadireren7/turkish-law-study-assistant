/**
 * Reusable query classification layer for the legal AI pipeline.
 * Classifies user input into question types before retrieval and answer generation.
 * Returns category + confidence. Fully Turkish; efficient single-call design.
 */
import type OpenAI from 'openai'

export const QUERY_TYPES = [
  'mevzuat_sorusu',
  'madde_arama',
  'olay_analizi',
  'sinav_pratigi',
  'konu_anlatimi',
  'guncel_gelisme',
  'karar_analizi',
  'tartismali_konu',
  'sohbet_genel',
] as const

export type QueryType = (typeof QUERY_TYPES)[number]

export const QUERY_TYPE_LABELS: Record<QueryType, string> = {
  mevzuat_sorusu: 'Mevzuat sorusu',
  madde_arama: 'Madde arama',
  olay_analizi: 'Olay analizi',
  sinav_pratigi: 'Sınav pratiği',
  konu_anlatimi: 'Konu anlatımı',
  guncel_gelisme: 'Güncel gelişme',
  karar_analizi: 'Karar analizi',
  tartismali_konu: 'Tartışmalı konu / Farklı görüşler',
  sohbet_genel: 'Sohbet / Genel çalışma desteği',
}

export const CONFIDENCE_LEVELS = ['yuksek', 'orta', 'dusuk'] as const
export type ClassificationConfidence = (typeof CONFIDENCE_LEVELS)[number]

const CLASSIFIER_SYSTEM = `Sen bir hukuk sorusu sınıflandırıcısısın. Kullanıcı girişini tek satırda şu formatta yanıtla: KATEGORI|GUVEN
- KATEGORI: aşağıdaki kodlardan tam biri.
- GUVEN: yuksek, orta veya dusuk (sınıflandırma güvenin).

Kategoriler:
- mevzuat_sorusu: Kanun/tüzük/yönetmelik nedir, nasıl uygulanır, hangi madde gibi mevzuat bilgisi.
- madde_arama: Belirli madde metni veya numara arama (TCK 21, TBK 77 vb.).
- olay_analizi: Olay/vaka anlatılmış, hukuki değerlendirme veya çözüm isteniyor.
- sinav_pratigi: Sınav sorusu üret, pratik yap, soru çöz, değerlendir talepleri.
- konu_anlatimi: Konu anlat, ders notu, özet, nasıl çalışılır talepleri.
- guncel_gelisme: Güncel değişiklik, yeni karar, son gelişme, güncelleme.
- karar_analizi: Mahkeme kararı veya hukuki metin verilmiş; analiz/özet isteniyor veya metin karar gibi.
- tartismali_konu: Öğretide tartışmalı konu, farklı görüşler, baskın/karşı görüş, doktrin.
- sohbet_genel: Genel sohbet, çalışma desteği, takip sorusu, net kategoride değil.

Örnek yanıt: mevzuat_sorusu|yuksek
Başka hiçbir şey yazma, sadece KATEGORI|GUVEN.`

export type ClassifyResult = {
  queryType: QueryType
  confidence: ClassificationConfidence
  raw: string
}

/**
 * Classify user message into one legal query type and return classification confidence.
 * Single LLM call, low temperature, minimal tokens. Use before retrieval and answer generation.
 */
export async function classifyQuery(
  userMessage: string,
  openai: OpenAI
): Promise<ClassifyResult> {
  const trimmed = userMessage.trim().slice(0, 600)
  if (!trimmed) {
    return { queryType: 'sohbet_genel', confidence: 'orta', raw: '' }
  }
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: CLASSIFIER_SYSTEM },
      { role: 'user', content: trimmed },
    ],
    temperature: 0.1,
    max_tokens: 40,
  })
  const raw = (res.choices[0]?.message?.content ?? '').trim().toLowerCase()
  const [catPart, confPart] = raw.split('|').map((s) => s.trim())
  const found = QUERY_TYPES.find((t) => catPart?.includes(t) || catPart === t)
  const queryType: QueryType = found ?? 'sohbet_genel'
  const conf = confPart === 'yuksek' || confPart === 'orta' || confPart === 'dusuk'
    ? confPart
    : 'orta'
  return { queryType, confidence: conf, raw }
}
