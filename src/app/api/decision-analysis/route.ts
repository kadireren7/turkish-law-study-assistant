/**
 * POST /api/decision-analysis
 * Body: { text: string }
 * Returns: structured court decision analysis + sourceLabels.
 * Uses shared legal pipeline (retrieval, source transparency). No silent failures.
 */
import { NextResponse } from 'next/server'
import { DECISION_ANALYSIS_SYSTEM_PROMPT } from '@/lib/decision-analysis-prompt'
import { getRetrievalResult } from '@/lib/legal-brain'
import { getLawDatabaseContext } from '@/lib/law-database'
import { buildSystemContentWithSources } from '@/lib/source-grounded'
import { getSourceMetadata, buildSourceTransparencyBlock, isFromGuncellemeler, getRetrievalDate } from '@/lib/source-metadata'
import { DEFAULT_MEVZUAT_SOURCE_BLOCK } from '@/lib/source-metadata'
import { confidenceFromRetrieval } from '@/lib/confidence'
import { getOpenAI, getMissingKeyMessage, handleOpenAIError } from '@/lib/openai'
import { validateBodySize, validateTextLength, LIMITS } from '@/lib/validate-input'

const MIN_TEXT_LENGTH = 40

const MAX_TEXT_LENGTH = LIMITS.decisionText

const SECTION_HEADINGS = [
  'KARARIN KISA ÖZETİ',
  'OLAY',
  'HUKUKİ SORUN',
  'MAHKEMENİN YAKLAŞIMI',
  'DAYANILAN HUKUK KURALLARI',
  'KARARIN ÖNEMİ',
  'KARARDAN ÇIKARILABİLECEK DERS',
  'SINAVDA NASIL KULLANILABİLİR',
  'FARKLI YORUM İHTİMALİ',
  'KULLANILAN KAYNAK',
] as const

/** Extract section content; allows optional numbering before **Heading** (e.g. "1) **KARARIN KISA ÖZETİ**"). */
function extractSection(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?:\\d+[.)]\\s*)?\\*\\*${escaped}\\*\\*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:\\d+[.)]\\s*)?\\*\\*|$)`, 'i')
  const m = text.match(re)
  return m ? m[1].trim() : ''
}

function sectionKey(heading: string): string {
  return heading
    .replace(/\s+/g, '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/Ö/g, 'o')
    .replace(/Ü/g, 'u')
    .replace(/Ğ/g, 'g')
    .replace(/Ş/g, 's')
    .replace(/Ç/g, 'c')
    .toLowerCase()
}

function parseStructuredSections(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const h of SECTION_HEADINGS) {
    const key = sectionKey(h)
    const val = extractSection(text, h)
    if (val) out[key] = val
  }
  return out
}

export async function POST(request: Request) {
  const sizeCheck = validateBodySize(request)
  if (!sizeCheck.ok) return NextResponse.json({ error: sizeCheck.error }, { status: sizeCheck.status })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: getMissingKeyMessage() },
      { status: 503 }
    )
  }

  const openai = getOpenAI()

  let body: { text?: unknown }
  try {
    body = (await request.json()) as { text?: unknown }
  } catch {
    return NextResponse.json(
      { error: 'Geçersiz istek. Lütfen karar metnini veya özetini "Karar / hukuki metin" alanına yapıştırıp tekrar deneyin.' },
      { status: 400 }
    )
  }

  const rawText = typeof body.text === 'string' ? body.text.trim() : ''
  if (!rawText) {
    return NextResponse.json(
      { error: 'Karar veya hukuki metin boş bırakılamaz. Lütfen analiz etmek istediğiniz metni yapıştırın.' },
      { status: 400 }
    )
  }
  if (rawText.length < MIN_TEXT_LENGTH) {
    return NextResponse.json(
      { error: 'Metin çok kısa. Analiz için en az birkaç cümle (yaklaşık 40 karakter) gerekir. Lütfen karar metnini veya özetini yapıştırın.' },
      { status: 400 }
    )
  }
  const textLenCheck = validateTextLength(rawText, MAX_TEXT_LENGTH, 'Karar metni')
  if (!textLenCheck.ok) return NextResponse.json({ error: textLenCheck.error }, { status: textLenCheck.status })
  const text = rawText.length > MAX_TEXT_LENGTH ? rawText.slice(0, MAX_TEXT_LENGTH) : rawText

  try {
    const queryForRetrieval = text.slice(0, 2000)
    const retrieval = await getRetrievalResult(queryForRetrieval, openai, 8, {
      queryType: 'karar_analizi',
    })
    const lawContext =
      retrieval.lowConfidence || retrieval.context.length < 200
        ? await getLawDatabaseContext()
        : retrieval.context
    let sourceBlock = DEFAULT_MEVZUAT_SOURCE_BLOCK
    let sourceLabels: string[] = []
    let lastChecked: string | null = null
    if (!retrieval.lowConfidence && retrieval.sources.length > 0) {
      const metadata = await getSourceMetadata(retrieval.sources)
      const retrievalDate = getRetrievalDate()
      sourceBlock = buildSourceTransparencyBlock(metadata, isFromGuncellemeler(retrieval.sources), retrievalDate)
      sourceLabels = retrieval.sourceLabelsHuman?.length ? retrieval.sourceLabelsHuman : metadata.map((m) => m.lawName)
      lastChecked = retrievalDate
    }

    const systemContent = buildSystemContentWithSources(
      DECISION_ANALYSIS_SYSTEM_PROMPT,
      lawContext,
      sourceBlock
    )

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        {
          role: 'user',
          content: `Aşağıdaki mahkeme kararı veya hukuki metni yukarıdaki yapıya göre analiz et. Metin eksik veya belirsizse bunu açıkça belirt.\n\n${text.slice(0, 12000)}`,
        },
      ],
      temperature: 0.25,
      max_tokens: 3072,
    })

    const analysis = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!analysis) {
      return NextResponse.json(
        { error: 'Analiz oluşturulamadı. Lütfen metni kontrol edip tekrar deneyin veya daha uzun bir karar özeti kullanın.' },
        { status: 502 }
      )
    }

    const parsed = parseStructuredSections(analysis)
    const confidence = confidenceFromRetrieval(retrieval, 'karar_analizi')
    const response: Record<string, unknown> = {
      analysis,
      kisaOzet: parsed['kararinkisaozeti'] ?? '',
      olay: parsed['olay'] ?? '',
      hukukiSorun: parsed['hukukisorun'] ?? '',
      mahkemeYaklasimi: parsed['mahkemeninyaklasimi'] ?? '',
      dayanilanKurallar: parsed['dayanilanhukukkurallari'] ?? '',
      kararinOnemi: parsed['kararinonemi'] ?? '',
      karardanCikarilabilecekDers: parsed['karardancikarilabilecekders'] ?? '',
      sinavdaNasilKullanilabilir: parsed['sinavdanasilkullanilabilir'] ?? '',
      farkliYorumIhtimali: parsed['farkliyorumihtimali'] ?? '',
      kullanilanKaynak: parsed['kullanilankaynak'] ?? '',
      confidence,
    }
    if (sourceLabels.length) response.sourceLabels = sourceLabels
    if (lastChecked) response.lastChecked = lastChecked
    return NextResponse.json(response)
  } catch (e) {
    console.error('Decision analysis API error:', e)
    const { status, message } = handleOpenAIError(e)
    return NextResponse.json({ error: message }, { status })
  }
}
