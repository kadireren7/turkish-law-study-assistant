/**
 * Madde Ara API. Yerel law-data; bulunamazsa web araması yapılır ve AI ile kaynaklar
 * platform içinde özetlenir — kullanıcı dış linke çıkmak zorunda kalmaz.
 */
import { NextResponse } from 'next/server'
import { LEGAL_EDUCATION_EPISTEMIC_CORE } from '@/lib/legal-education-master-prompt'
import { parseLawQuery, searchLawArticle } from '@/lib/law-search'
import { withRouteTiming } from '@/lib/performance/routeTiming'
import { classifyQuery } from '@/lib/query-classifier'
import { getOpenAIIfAvailable } from '@/lib/openai'
import { validateTextLength, LIMITS } from '@/lib/validate-input'
import { searchWeb, isWebSearchAvailable } from '@/lib/web-search'
import OpenAI from 'openai'

function buildWebContext(webResults: { title: string; url: string; snippet: string }[]): string {
  return webResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`)
    .join('\n\n')
}

async function synthesizeFromWeb(
  openai: OpenAI,
  lawLabel: string,
  article: number,
  webContext: string
): Promise<{ maddeBasligi: string | null; maddeMetni: string; basitAciklama: string }> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `${LEGAL_EDUCATION_EPISTEMIC_CORE}

Sen Türk hukuku metinlerini özetleyen bir asistanısın. Verilen web arama sonuçlarına GÖRE ilgili kanun maddesinin metnini ve kısa açıklamasını çıkar. Uydurma yapma; sadece verilen metinlerdeki bilgiyi kullan. Yanıtı Türkçe ve yapılandırılmış ver. JSON ile yanıtla: {"maddeBasligi": "Madde başlığı veya null", "maddeMetni": "Madde metni (paragraflar (1) (2) vb. korunacak)", "basitAciklama": "2-4 cümle basit açıklama"}`,
      },
      {
        role: 'user',
        content: `Aşağıdaki web arama sonuçlarına göre ${lawLabel} Madde ${article} için madde metnini ve kısa açıklamayı çıkar. Sadece verilen metinlerdeki bilgiyi kullan.\n\n${webContext}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 1024,
  })
  const raw = res.choices[0]?.message?.content?.trim() ?? ''
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}') + 1
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end)) as { maddeBasligi?: string | null; maddeMetni?: string; basitAciklama?: string }
      return {
        maddeBasligi: parsed.maddeBasligi ?? null,
        maddeMetni: typeof parsed.maddeMetni === 'string' && parsed.maddeMetni.length > 0 ? parsed.maddeMetni : raw,
        basitAciklama: typeof parsed.basitAciklama === 'string' && parsed.basitAciklama.length > 0 ? parsed.basitAciklama : 'Web kaynaklarından derlenmiştir.',
      }
    }
  } catch {
    // fallback
  }
  return {
    maddeBasligi: null,
    maddeMetni: raw || 'Web kaynaklarından madde metni çıkarılamadı.',
    basitAciklama: 'Web kaynaklarından derlenmiştir.',
  }
}

export async function GET(request: Request) {
  return withRouteTiming('GET /api/law-search', async () => {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q || typeof q !== 'string' || !q.trim()) {
    return NextResponse.json({ error: 'Sorgu gerekli (örn. TCK 81, TMK 472)' }, { status: 400 })
  }

  const trimmed = (q ?? '').trim().replace(/\s+/g, ' ')
  const lenCheck = validateTextLength(trimmed, LIMITS.lawSearchQuery, 'Sorgu')
  if (!lenCheck.ok) return NextResponse.json({ error: lenCheck.error }, { status: lenCheck.status })

  const parsed = parseLawQuery(trimmed)

  const openai = getOpenAIIfAvailable()
  let classification: { category: string; confidence: string } | undefined
  if (openai) {
    try {
      const { queryType, confidence } = await classifyQuery(trimmed, openai)
      classification = { category: queryType, confidence }
    } catch {
      // Anahtar varsa bile sınıflandırma başarısız olursa devam et; madde aramayı döndür.
    }
  }

  if (!parsed) {
    return NextResponse.json({
      found: false,
      message: 'Sorgu tanınamadı. Örnek: TCK 81, TMK 472, TBK 77, Anayasa 10',
      ...(classification && { classification }),
    }, { status: 200 })
  }

  const result = await searchLawArticle(parsed.code, parsed.article)
  let webResults: Awaited<ReturnType<typeof searchWeb>> = []
  if (!result.found && isWebSearchAvailable()) {
    const searchQuery = result.lawLabel && result.article
      ? `${result.lawLabel} Madde ${result.article}`
      : trimmed
    webResults = await searchWeb(searchQuery)
  }

  if (!result.found && webResults.length > 0 && openai) {
    try {
      const webContext = buildWebContext(webResults)
      const synthesized = await synthesizeFromWeb(openai, result.lawLabel, result.article, webContext)
      return NextResponse.json({
        found: true,
        fromWeb: true,
        lawCode: result.lawCode,
        lawLabel: result.lawLabel,
        article: result.article,
        maddeBasligi: synthesized.maddeBasligi,
        maddeMetni: synthesized.maddeMetni,
        basitAciklama: synthesized.basitAciklama,
        maddeninAmaci: null,
        kisaOrnek: null,
        sinavdaDikkat: null,
        guncellikNotu: 'Bu özet web kaynaklarından platform içinde derlenmiştir. Resmî metin için mevzuat.gov.tr kontrol edin.',
        ...(classification && { classification }),
        webResults,
      })
    } catch {
      // AI başarısız olursa aşağıda web linkleriyle dönüyoruz
    }
  }

  if (result.found && isWebSearchAvailable()) {
    const searchQuery = result.lawLabel && result.article
      ? `${result.lawLabel} Madde ${result.article}`
      : trimmed
    webResults = await searchWeb(searchQuery)
  }

  return NextResponse.json({
    ...result,
    ...(classification && { classification }),
    ...(webResults.length > 0 && { webResults }),
  })
  })
}
