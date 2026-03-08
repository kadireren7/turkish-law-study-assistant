/**
 * POST /api/decision-analysis
 * Body: { text: string }
 * Returns: structured court decision analysis + sourceLabels when using shared pipeline.
 * Connects to shared legal source pipeline (retrieval, source transparency).
 */
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { DECISION_ANALYSIS_SYSTEM_PROMPT } from '@/lib/decision-analysis-prompt'
import { getRetrievalResult } from '@/lib/legal-brain'
import { getLawDatabaseContext } from '@/lib/law-database'
import { buildSystemContentWithSources } from '@/lib/source-grounded'
import { getSourceMetadata, buildSourceTransparencyBlock, isFromGuncellemeler, getRetrievalDate } from '@/lib/source-metadata'
import { DEFAULT_MEVZUAT_SOURCE_BLOCK } from '@/lib/source-metadata'
import { confidenceFromRetrieval } from '@/lib/confidence'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

const SECTION_HEADINGS = [
  'KARARIN KISA ÖZETİ',
  'OLAY',
  'HUKUKİ SORUN',
  'MAHKEMENİN YAKLAŞIMI',
  'DAYANILAN HUKUK KURALLARI',
  'KARARDAN ÇIKARILABİLECEK DERS',
  'SINAVDA NASIL KULLANILABİLİR',
  'FARKLI YORUM İHTİMALİ',
  'KULLANILAN KAYNAK',
] as const

function extractSection(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\*\\*${escaped}\\*\\*:?\\s*([\\s\\S]*?)(?=\\n\\s*\\*\\*|$)`, 'i')
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
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY tanımlı değil. .env.local dosyasına ekleyin.' },
      { status: 503 }
    )
  }

  try {
    const body = (await request.json()) as { text?: string }
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!text) {
      return NextResponse.json({ error: 'text alanı gerekli' }, { status: 400 })
    }

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
      return NextResponse.json({ error: 'Model analiz üretmedi' }, { status: 502 })
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
    if (e instanceof OpenAI.APIError) {
      const status = e.status ?? 500
      const message = e.message ?? 'OpenAI API hatası'
      return NextResponse.json({ error: message }, { status })
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
