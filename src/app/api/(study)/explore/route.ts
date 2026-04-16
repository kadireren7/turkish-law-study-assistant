import { classifyQuery } from '@/lib/query-classifier'
import { searchLawArticle, parseLawQuery, getLawDisplayLabel } from '@/lib/law-search'
import { searchWeb, isWebSearchAvailable, formatWebSearchContext } from '@/lib/web-search'
import {
  LEGAL_EDUCATION_EPISTEMIC_CORE,
  LEGAL_EDUCATION_POLITICAL_HISTORY_AIDS,
  LEGAL_EDUCATION_TEACHING_PIPELINE,
} from '@/lib/legal-education-master-prompt'
import { getOpenAIIfAvailable, handleOpenAIError } from '@/lib/openai'
import type OpenAI from 'openai'
import { LIMITS, validateBodySize, validateTextLength } from '@/lib/validate-input'
import { classifyFreshnessNeed, requiresLiveData } from '@/lib/live-data-classifier'
import { classifyDataRoute } from '@/lib/data-route'
import { getRetrievalResult } from '@/lib/legal-brain'
import { createInMemoryRateLimiter, getRequestIp } from '@/lib/rate-limit'
import { createInMemoryQueryCache, normalizeQueryKey } from '@/lib/query-cache'
import { ok as okResponse, err as errResponse, createRequestId } from '@/lib/api-response'

type ExploreMode = 'law_search' | 'news' | 'event_analysis' | 'political_history'

type PoliticalHistoryMode = 'timeline' | 'cause_effect' | 'practice'

type ExploreData = {
  mode: ExploreMode
  freshnessClass: 'requires_live_data' | 'static'
  dataRoute?: 'static' | 'local' | 'live'
  politicalHistoryMode?: PoliticalHistoryMode
  shortAnswer: string
  structured: {
    title: string
    points: string[]
    practicalNote?: string
  }
  sources: string[]
  followUp?: string
  uncertainty?: string
}

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 24
const checkRateLimit = createInMemoryRateLimiter(MAX_PER_WINDOW, WINDOW_MS)

const WEB_CACHE_TTL = 2 * 60_000
const webCache = createInMemoryQueryCache<Awaited<ReturnType<typeof searchWeb>>>(WEB_CACHE_TTL)
const resultCache = createInMemoryQueryCache<ExploreData>(45_000)

async function cachedWebSearch(query: string) {
  const key = normalizeQueryKey(query)
  const hit = webCache.get(key)
  if (hit) return hit
  const data = await searchWeb(query)
  webCache.set(key, data)
  return data
}

function pickModeFromQueryType(queryType: string): 'law_search' | 'news' | 'event_analysis' {
  if (queryType === 'madde_arama' || queryType === 'mevzuat_sorusu') return 'law_search'
  if (queryType === 'guncel_gelisme') return 'news'
  return 'event_analysis'
}

async function buildLawResponse(query: string): Promise<ExploreData> {
  const freshnessClass = classifyFreshnessNeed(query)
  const parsed = parseLawQuery(query)
  if (!parsed) {
    return {
      mode: 'law_search',
      freshnessClass,
      shortAnswer: 'Sorguyu madde formatında algılayamadım.',
      structured: {
        title: 'Madde Arama',
        points: ['Örnek: TCK 81', 'Örnek: TBK 77', 'Örnek: Anayasa 10'],
      },
      sources: [],
      followUp: 'İsterseniz sorguyu kanun + madde numarası ile tekrar yazın.',
      uncertainty: 'Kesin madde numarası olmadan doğrudan metin veremiyorum.',
    }
  }

  const result = await searchLawArticle(parsed.code, parsed.article)
  if (result.found && result.maddeMetni) {
    return {
      mode: 'law_search',
      freshnessClass,
      shortAnswer: `${getLawDisplayLabel(parsed.code, parsed.article)} bulundu.`,
      structured: {
        title: `${result.lawLabel} m.${result.article}`,
        points: [
          result.maddeMetni.slice(0, 550),
          result.basitAciklama ?? 'Bu madde için açıklama metni bulunmuyor.',
          result.sinavdaDikkat ?? 'Sınavda kural-uygulama-sonuç düzeniyle yazın.',
        ],
        practicalNote: result.guncellikNotu ?? undefined,
      },
      sources: [getLawDisplayLabel(parsed.code, parsed.article)],
      followUp: 'Bu maddeyi kısa bir örnek olaya da uygulamamı ister misiniz?',
    }
  }

  const web = isWebSearchAvailable() ? await cachedWebSearch(`${result.lawLabel} Madde ${result.article}`) : []
  return {
    mode: 'law_search',
    freshnessClass,
    shortAnswer: result.message ?? 'Yerel kaynakta madde bulunamadı.',
    structured: {
      title: 'Madde Arama Sonucu',
      points: web.length > 0
        ? web.slice(0, 3).map((w) => `${w.title}: ${w.snippet}`)
        : ['Yerel kaynakta eşleşme bulunamadı.', 'Resmî metin için mevzuat.gov.tr kontrol edin.'],
    },
    sources: web.slice(0, 3).map((w) => w.url),
    uncertainty: 'Bu yanıtta yerel madde metni yerine ikincil arama sonuçları var.',
  }
}

const JSON_CONTRACT = `ÇIKTIYI SADECE JSON ver:
{
  "shortAnswer": "1-2 cümle",
  "title": "kısa başlık",
  "points": ["3-6 kısa madde"],
  "practicalNote": "sınav/öğrenme notu",
  "followUp": "tek kısa takip sorusu",
  "uncertainty": "gerekirse belirsizlik cümlesi, aksi halde boş"
}
Kural: Doğruluk yaratıcılıktan önce gelir. Emin değilsen uncertainty alanını doldur. Kısa yaz.`

async function synthesizeFromContext(
  query: string,
  mode: 'news' | 'event_analysis',
  freshnessClass: 'requires_live_data' | 'static',
  contextLabel: string,
  contextBody: string,
  sources: string[],
  openai: OpenAI
): Promise<ExploreData> {
  const sys = `${LEGAL_EDUCATION_EPISTEMIC_CORE}

${LEGAL_EDUCATION_TEACHING_PIPELINE}

${LEGAL_EDUCATION_POLITICAL_HISTORY_AIDS}

${JSON_CONTRACT}`

  const usr = `Kullanıcı sorusu: ${query}
Mod: ${mode === 'news' ? 'güncel gelişme' : 'olay analizi'}
${contextLabel}:
${contextBody}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.25,
    max_tokens: 650,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: usr },
    ],
  })

  const raw = res.choices[0]?.message?.content?.trim() ?? ''
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}') + 1
  if (start < 0 || end <= start) {
    return {
      mode,
      freshnessClass,
      dataRoute: classifyDataRoute(query, mode === 'news' ? 'guncel_gelisme' : 'olay_analizi'),
      shortAnswer: 'Yapılandırılmış özet üretilirken biçim hatası oldu.',
      structured: { title: 'Özet', points: [raw.slice(0, 650)] },
      sources,
      uncertainty: 'Model çıktısı beklenen JSON formatında gelmedi.',
    }
  }

  const parsed = JSON.parse(raw.slice(start, end)) as {
    shortAnswer?: string
    title?: string
    points?: string[]
    practicalNote?: string
    followUp?: string
    uncertainty?: string
  }

  return {
    mode,
    freshnessClass,
    dataRoute: classifyDataRoute(query, mode === 'news' ? 'guncel_gelisme' : 'olay_analizi'),
    shortAnswer: parsed.shortAnswer?.trim() || 'Kısa cevap üretilemedi.',
    structured: {
      title: parsed.title?.trim() || (mode === 'news' ? 'Güncel Gelişme' : 'Olay Analizi'),
      points: Array.isArray(parsed.points) && parsed.points.length > 0 ? parsed.points.slice(0, 6) : ['Yeterli madde üretilemedi.'],
      practicalNote: parsed.practicalNote?.trim() || undefined,
    },
    sources,
    followUp: parsed.followUp?.trim() || undefined,
    uncertainty: parsed.uncertainty?.trim() || undefined,
  }
}

/** Haber / canlı olay: kısa web → özet. Statik olay analizi: önce law-data RAG, web yalnızca güncellik sinyalinde. */
async function buildSynthesizedResponse(query: string, mode: 'news' | 'event_analysis'): Promise<ExploreData> {
  const freshnessClass = classifyFreshnessNeed(query)
  const openai = getOpenAIIfAvailable()
  const useWeb = mode === 'news' || (mode === 'event_analysis' && freshnessClass === 'requires_live_data')

  if (useWeb) {
    const shortQ = query.trim().slice(0, 200)
    const web = isWebSearchAvailable() ? await cachedWebSearch(shortQ) : []
    const sourceList = web.slice(0, 4).map((w) => w.url)
    if (!openai || web.length === 0) {
      return {
        mode,
        freshnessClass,
        dataRoute: classifyDataRoute(query, mode === 'news' ? 'guncel_gelisme' : 'olay_analizi'),
        shortAnswer: mode === 'news' ? 'Güncel gelişme özeti için web sonucu gerekli.' : 'Canlı bağlam için web sonucu gerekli.',
        structured: {
          title: mode === 'news' ? 'Güncel Gelişme' : 'Olay Analizi',
          points: web.length > 0
            ? web.slice(0, 3).map((w) => `${w.title}: ${w.snippet}`)
            : ['Yeterli kaynak verisi yok.'],
        },
        sources: sourceList,
        uncertainty: 'Kaynak veya model erişimi sınırlı olduğu için kısa fallback döndü.',
      }
    }
    const webContext = web.slice(0, 4).map((w, i) => `[${i + 1}] ${w.title}\n${w.snippet}\nKaynak: ${w.url}`).join('\n\n')
    return synthesizeFromContext(query, mode, freshnessClass, 'Web bağlamı (kısıtlı)', webContext, sourceList, openai)
  }

  if (!openai) {
    return {
      mode,
      freshnessClass,
      dataRoute: 'static',
      shortAnswer: 'Model kullanılamıyor.',
      structured: { title: 'Olay Analizi', points: ['OPENAI_API_KEY tanımlı değil.'] },
      sources: [],
      uncertainty: 'Yerel özet için API anahtarı gerekli.',
    }
  }

  const retrieval = await getRetrievalResult(query, openai, 6, { queryType: 'olay_analizi', topKOverride: 5 })
  const localBody = retrieval.lowConfidence
    ? 'Yerel law-data eşleşmesi zayıf; yanıtta kesin tarih/madde uydurma, belirsizlik belirt.'
    : retrieval.context.slice(0, 3800)
  const sources = retrieval.sources.slice(0, 12)
  return synthesizeFromContext(query, mode, freshnessClass, 'Yerel law-data bağlamı (öncelikli)', localBody, sources, openai)
}

async function buildPoliticalHistoryResponse(query: string, phMode: PoliticalHistoryMode, openai: OpenAI): Promise<ExploreData> {
  const freshnessClass = classifyFreshnessNeed(query)
  const retrieval = await getRetrievalResult(query, openai, 6, { queryType: 'konu_anlatimi', topKOverride: 6 })
  const sources = [...retrieval.sources]
  let localBody = retrieval.lowConfidence
    ? 'Yerel kaynakta sınırlı bilgi; genel çerçeve ver, kesin tarih uydurma.'
    : retrieval.context.slice(0, 3600)

  if (requiresLiveData(query) && isWebSearchAvailable()) {
    const web = await cachedWebSearch(`${query.trim().slice(0, 88)} Türkiye`)
    if (web.length > 0) {
      localBody += `\n\n---\n\n${formatWebSearchContext(web.slice(0, 2))}`
      sources.push(...web.slice(0, 2).map((w) => w.url))
    }
  }

  const modeInstr =
    phMode === 'timeline'
      ? 'Mod: ZAMAN ÇİZGİSİ. points: 5–8 kısa kronolojik madde (tarih/dönem + olay + anayasal/hukuki anlam, abartısız). Son madde: tek hafıza ipucu.'
      : phMode === 'cause_effect'
        ? 'Mod: NEDEN-SONUÇ. points: 4–7 madde; zincir A → çünkü B → sonuç C. Son madde: hafıza ipucu.'
        : 'Mod: PRATİK. points: [1] Tek sınav tarzı soru, [2–4] kısa ipuçları, [5] IRAC iskeleti örnek cevap, [6] mini kontrol sorusu.'

  const sys = `${LEGAL_EDUCATION_EPISTEMIC_CORE}

${LEGAL_EDUCATION_POLITICAL_HISTORY_AIDS}

${JSON_CONTRACT}

${modeInstr}`

  const usr = `Konu: ${query}

Yerel + (gerekirse) web bağlamı:
${localBody}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.28,
    max_tokens: 720,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: usr },
    ],
  })

  const raw = res.choices[0]?.message?.content?.trim() ?? ''
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}') + 1
  if (start < 0 || end <= start) {
    return {
      mode: 'political_history',
      politicalHistoryMode: phMode,
      freshnessClass,
      dataRoute: classifyDataRoute(query, 'konu_anlatimi'),
      shortAnswer: 'Siyasi tarih özeti biçimlendirilemedi.',
      structured: { title: 'Siyasi Tarih', points: [raw.slice(0, 650)] },
      sources,
      uncertainty: 'Model çıktısı JSON değil.',
    }
  }

  const parsed = JSON.parse(raw.slice(start, end)) as {
    shortAnswer?: string
    title?: string
    points?: string[]
    practicalNote?: string
    followUp?: string
    uncertainty?: string
  }

  return {
    mode: 'political_history',
    politicalHistoryMode: phMode,
    freshnessClass,
    dataRoute: classifyDataRoute(query, 'konu_anlatimi'),
    shortAnswer: parsed.shortAnswer?.trim() || 'Özet üretilemedi.',
    structured: {
      title: parsed.title?.trim() || 'Siyasi Tarih',
      points: Array.isArray(parsed.points) && parsed.points.length > 0 ? parsed.points.slice(0, 8) : ['Yeterli madde yok.'],
      practicalNote: parsed.practicalNote?.trim() || undefined,
    },
    sources,
    followUp: parsed.followUp?.trim() || undefined,
    uncertainty: parsed.uncertainty?.trim() || undefined,
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const requestId = createRequestId()
  const sizeCheck = validateBodySize(request)
  if (!sizeCheck.ok) return errResponse(sizeCheck.error, requestId, startedAt, sizeCheck.status)

  const ip = getRequestIp(request)
  const limit = checkRateLimit(ip)
  if (!limit.ok) {
    return errResponse('Çok fazla istek gönderildi. Lütfen kısa bir süre sonra tekrar deneyin.', requestId, startedAt, 429)
  }

  try {
    const body = await request.json() as {
      query?: string
      forceMode?: 'law_search' | 'news' | 'event_analysis'
      politicalHistoryMode?: PoliticalHistoryMode
    }
    const query = typeof body.query === 'string' ? body.query.trim() : ''
    if (!query) return errResponse('Sorgu zorunlu.', requestId, startedAt, 400)
    const check = validateTextLength(query, LIMITS.lawSearchQuery, 'Sorgu')
    if (!check.ok) return errResponse(check.error, requestId, startedAt, check.status)

    const ph = body.politicalHistoryMode
    const cacheKey = normalizeQueryKey(`${query}::f:${body.forceMode ?? 'auto'}::ph:${ph ?? ''}`)
    const cached = resultCache.get(cacheKey)
    if (cached) return okResponse(cached, requestId, startedAt)

    const openai = getOpenAIIfAvailable()

    if (ph === 'timeline' || ph === 'cause_effect' || ph === 'practice') {
      if (!openai) {
        return errResponse('Siyasi tarih modu için OPENAI_API_KEY gerekli.', requestId, startedAt, 503)
      }
      const data = await buildPoliticalHistoryResponse(query, ph, openai)
      resultCache.set(cacheKey, data)
      return okResponse(data, requestId, startedAt)
    }

    if (body.forceMode === 'law_search') {
      const data = await buildLawResponse(query)
      resultCache.set(cacheKey, data)
      return okResponse(data, requestId, startedAt)
    }
    if (body.forceMode === 'news') {
      const data = await buildSynthesizedResponse(query, 'news')
      resultCache.set(cacheKey, data)
      return okResponse(data, requestId, startedAt)
    }
    if (body.forceMode === 'event_analysis') {
      const data = await buildSynthesizedResponse(query, 'event_analysis')
      resultCache.set(cacheKey, data)
      return okResponse(data, requestId, startedAt)
    }

    const queryType = openai ? (await classifyQuery(query, openai)).queryType : parseLawQuery(query) ? 'madde_arama' : 'sohbet_genel'
    const freshnessClass = classifyFreshnessNeed(query)
    const mode =
      freshnessClass === 'requires_live_data' && queryType !== 'madde_arama' && queryType !== 'mevzuat_sorusu'
        ? 'news'
        : pickModeFromQueryType(queryType)

    const data = mode === 'law_search' ? await buildLawResponse(query) : await buildSynthesizedResponse(query, mode)
    resultCache.set(cacheKey, data)
    return okResponse(data, requestId, startedAt)
  } catch (e) {
    const { status, message } = handleOpenAIError(e)
    return errResponse(message, requestId, startedAt, status)
  }
}
