/**
 * Fact-to-law inference: from a factual scenario, infer relevant law branches,
 * legal concepts, and likely articles before retrieval and answer generation.
 * Improves retrieval targeting and forces the model to use and explain those rules.
 * Fully Turkish; exam-oriented.
 */

import type OpenAI from 'openai'

export type FactToLawInferenceResult = {
  /** Hukuk dalları (ceza, medeni, borçlar, usul, idare, anayasa vb.) */
  branches: string[]
  /** İlgili hukuki kavramlar (kast, taksir, ehliyet, yaralama, sözleşme vb.) */
  concepts: string[]
  /** Muhtemel ilgili normlar (TCK 86, TBK 77 vb.); law-data'da varsa kullanılacak */
  suggestedNorms: string[]
  /** Neden bu dallar ve kurallar olaya uygulanır – kısa eğitim amaçlı açıklama */
  relevanceExplanation: string
}

const INFERENCE_SYSTEM = `Sen Türk hukuku için olay–kural eşleştirme asistanısın. Verilen olay özetine göre yalnızca aşağıdaki formatta yanıt ver. Başka metin ekleme.

FORMAT (satır başları ve iki nokta üst üste aynen olsun):
BRANCHES: <hukuk dalları, noktalı virgülle ayrılmış; örn: ceza hukuku; medeni hukuk>
CONCEPTS: <hukuki kavramlar, noktalı virgülle ayrılmış; örn: kast; taksir; yaralama; ehliyet>
NORMS: <muhtemel kanun/madde, noktalı virgülle ayrılmış; örn: TCK 86; TCK 21; TBK 77>
RELEVANCE: <1-3 cümle: neden bu dallar ve kurallar bu olaya uygulanır>

KURALLAR:
- Bedensel zarar, yaralama, ölüm → ceza hukuku; TCK ilgili maddeler (örn. 86, 21, 22).
- Ehliyet, temsil, sözleşme geçerliliği, aile/miras → medeni hukuk; TMK, TBK.
- Borç, tazminat, sözleşme ifa, haksız fiil → borçlar hukuku; TBK.
- Yetki, süre, ispat, dava şartları → usul (CMK, HMK, idari yargılama).
- İdari işlem, kamu gücü, temel hak sınırı → idare hukuku / anayasa hukuku.
- Birden fazla dal ilgiliyse hepsini yaz; öncelik sırasına göre (ceza → medeni/borçlar → usul).
- NORMS kısmında sadece Türk mevzuatı (TCK, TBK, TMK, HMK, CMK, Anayasa vb.) madde numaraları ver; law-data'da olmayan madde uydurma, yaygın bilinen maddeleri yaz.
- RELEVANCE: Öğrenciye "bu olayda neden bu kural aranır" hissini ver; kısa ve net.`

/**
 * From a factual scenario text, infer relevant law branches, concepts, and likely norms.
 * Call this before getRetrievalResult so retrieval can be enriched and prompts can require using these rules.
 */
export async function inferRelevantLawFromFacts(
  factScenario: string,
  openai: OpenAI
): Promise<FactToLawInferenceResult> {
  const trimmed = factScenario.trim().slice(0, 4000)
  if (!trimmed) {
    return {
      branches: [],
      concepts: [],
      suggestedNorms: [],
      relevanceExplanation: 'Olay metni verilmedi.',
    }
  }

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: INFERENCE_SYSTEM },
        { role: 'user', content: `Aşağıdaki olay özetine göre ilgili hukuk dallarını, kavramları ve muhtemel normları çıkar:\n\n${trimmed}` },
      ],
      temperature: 0.2,
      max_tokens: 400,
    })
    const raw = (res.choices[0]?.message?.content ?? '').trim()
    return parseInferenceOutput(raw)
  } catch (e) {
    console.warn('Fact-to-law inference failed:', e)
    return {
      branches: [],
      concepts: [],
      suggestedNorms: [],
      relevanceExplanation: 'Çıkarım yapılamadı; yanıt genel kaynaklara dayanacak.',
    }
  }
}

function parseInferenceOutput(raw: string): FactToLawInferenceResult {
  const result: FactToLawInferenceResult = {
    branches: [],
    concepts: [],
    suggestedNorms: [],
    relevanceExplanation: '',
  }
  const branchMatch = raw.match(/BRANCHES?\s*:?\s*([\s\S]+?)(?=\n\s*CONCEPTS?|\n\s*NORMS?|\n\s*RELEVANCE|\n*$)/i)
  const conceptMatch = raw.match(/CONCEPTS?\s*:?\s*([\s\S]+?)(?=\n\s*NORMS?|\n\s*RELEVANCE|\n*$)/i)
  const normsMatch = raw.match(/NORMS?\s*:?\s*([\s\S]+?)(?=\n\s*RELEVANCE|\n*$)/i)
  const relevanceMatch = raw.match(/RELEVANCE\s*:?\s*([\s\S]+?)$/i)

  if (branchMatch) {
    result.branches = branchMatch[1]
      .split(/[;,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (conceptMatch) {
    result.concepts = conceptMatch[1]
      .split(/[;,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (normsMatch) {
    result.suggestedNorms = normsMatch[1]
      .split(/[;,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (relevanceMatch) {
    result.relevanceExplanation = relevanceMatch[1].trim().slice(0, 800)
  }
  return result
}

/**
 * Build an enriched query string for RAG: fact text + inferred branches and concepts.
 * Improves embedding similarity to relevant law-data chunks.
 */
export function buildEnrichedQueryForRetrieval(
  factText: string,
  inference: FactToLawInferenceResult
): string {
  const parts = [factText.trim().slice(0, 2800)]
  if (inference.branches.length) {
    parts.push(inference.branches.join(' '))
  }
  if (inference.concepts.length) {
    parts.push(inference.concepts.join(' '))
  }
  if (inference.suggestedNorms.length) {
    parts.push(inference.suggestedNorms.join(' '))
  }
  return parts.join('\n')
}

/**
 * Format inference result for injection into system prompt (educational; model must use and explain rules).
 */
export function formatInferenceForPrompt(inference: FactToLawInferenceResult): string {
  if (
    inference.branches.length === 0 &&
    inference.concepts.length === 0 &&
    inference.suggestedNorms.length === 0
  ) {
    return ''
  }
  const lines: string[] = [
    'OLAYDAN ÇIKARILAN HUKUKİ YÖNLENDİRME (yanıtında mutlaka kullan ve neden ilgili olduğunu açıkla):',
    `- İlgili hukuk dal(lar)ı: ${inference.branches.length ? inference.branches.join(', ') : 'Belirtilmedi'}`,
    `- İlgili kavramlar: ${inference.concepts.length ? inference.concepts.join(', ') : 'Belirtilmedi'}`,
    `- Aranacak / kullanılacak normlar (aşağıdaki kaynakta varsa atıf yap): ${inference.suggestedNorms.length ? inference.suggestedNorms.join(', ') : 'Kaynaktan seç'}`,
    `- Neden ilgili: ${inference.relevanceExplanation || 'Olaya uygun kuralları kaynaktan seç ve gerekçesini yaz.'}`,
    '',
    'Görevin: Bu dallar ve kavramları KANUN KAYNAK METİNLERİnde bul; ilgili maddeleri olaya uygula ve neden o kuralın bu olaya uygulandığını öğrenciye kısa açıkla.',
  ]
  return lines.join('\n')
}
