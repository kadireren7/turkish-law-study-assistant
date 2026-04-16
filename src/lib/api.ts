const API_BASE = '/api'

function unwrapApiPayload<T = any>(raw: any): T {
  if (raw && typeof raw === 'object' && raw.ok === true && raw.data) return raw.data as T
  return raw as T
}

function extractApiError(raw: any, fallback: string): string {
  if (raw && typeof raw === 'object') {
    if (typeof raw.error === 'string') return raw.error
    if (raw.ok === false && typeof raw.error === 'string') return raw.error
  }
  return fallback
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type ChatResponse = {
  reply: string
  sources: string[]
  sourceLabels?: string[]
  lastChecked?: string | null
  lowConfidence?: boolean
  warnings?: string[]
  /** Güven düzeyi: yuksek | orta | dusuk */
  confidence?: 'yuksek' | 'orta' | 'dusuk'
  /** Soru sınıfı (mevzuat_sorusu, olay_analizi, karar_analizi, vb.) */
  queryType?: string
  /** Sınıflandırma güveni: yuksek | orta | dusuk */
  classificationConfidence?: 'yuksek' | 'orta' | 'dusuk'
  /** Veri rotası: static | local (RAG) | live (web) */
  dataRoute?: 'static' | 'local' | 'live'
  freshnessClass?: 'requires_live_data' | 'static'
  requiresLiveData?: boolean
}

export type ExploreMode = 'law_search' | 'news' | 'event_analysis' | 'political_history'

export type PoliticalHistoryMode = 'timeline' | 'cause_effect' | 'practice'

export type ExploreResponse = {
  mode: ExploreMode
  freshnessClass?: 'requires_live_data' | 'static'
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

export async function sendChatMessage(messages: ChatMessage[], options?: { uyapMode?: boolean; explanationMode?: 'ogrenci' | 'uyap' }): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      uyapMode: options?.uyapMode ?? false,
      explanationMode: options?.explanationMode ?? (options?.uyapMode ? 'uyap' : 'ogrenci'),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = extractApiError(data, 'Sunucu tarafında bir hata oluştu. Lütfen tekrar deneyin.')
    throw new Error(typeof msg === 'string' ? msg : 'Sunucu tarafında bir hata oluştu. Lütfen tekrar deneyin.')
  }
  const payload = unwrapApiPayload<any>(data)
  return {
    reply: payload.reply ?? '',
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    sourceLabels: Array.isArray(payload.sourceLabels) ? payload.sourceLabels : undefined,
    lastChecked: typeof payload.lastChecked === 'string' ? payload.lastChecked : payload.lastChecked === null ? null : undefined,
    lowConfidence: Boolean(payload.lowConfidence),
    warnings: Array.isArray(payload.warnings) ? payload.warnings : undefined,
    confidence: payload.confidence === 'yuksek' || payload.confidence === 'orta' || payload.confidence === 'dusuk' ? payload.confidence : undefined,
    queryType: typeof payload.queryType === 'string' ? payload.queryType : undefined,
    classificationConfidence: payload.classificationConfidence === 'yuksek' || payload.classificationConfidence === 'orta' || payload.classificationConfidence === 'dusuk' ? payload.classificationConfidence : undefined,
    dataRoute: payload.dataRoute === 'static' || payload.dataRoute === 'local' || payload.dataRoute === 'live' ? payload.dataRoute : undefined,
    freshnessClass: payload.freshnessClass === 'requires_live_data' || payload.freshnessClass === 'static' ? payload.freshnessClass : undefined,
    requiresLiveData: typeof payload.requiresLiveData === 'boolean' ? payload.requiresLiveData : undefined,
  }
}

export async function sendExploreQuery(
  query: string,
  options?: {
    forceMode?: 'law_search' | 'news' | 'event_analysis'
    politicalHistoryMode?: PoliticalHistoryMode
  }
): Promise<ExploreResponse> {
  const res = await fetch(`${API_BASE}/explore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query.trim(),
      ...(options?.forceMode && { forceMode: options.forceMode }),
      ...(options?.politicalHistoryMode && { politicalHistoryMode: options.politicalHistoryMode }),
    }),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok || payload?.ok === false) {
    const msg = extractApiError(payload, 'Keşfet yanıtı alınamadı.')
    throw new Error(typeof msg === 'string' ? msg : 'Keşfet yanıtı alınamadı.')
  }
  const data = unwrapApiPayload<any>(payload) ?? {}
  return {
    mode:
      data.mode === 'law_search' || data.mode === 'news' || data.mode === 'event_analysis' || data.mode === 'political_history'
        ? data.mode
        : 'event_analysis',
    freshnessClass: data.freshnessClass === 'requires_live_data' || data.freshnessClass === 'static' ? data.freshnessClass : undefined,
    dataRoute: data.dataRoute === 'static' || data.dataRoute === 'local' || data.dataRoute === 'live' ? data.dataRoute : undefined,
    politicalHistoryMode:
      data.politicalHistoryMode === 'timeline' || data.politicalHistoryMode === 'cause_effect' || data.politicalHistoryMode === 'practice'
        ? data.politicalHistoryMode
        : undefined,
    shortAnswer: typeof data.shortAnswer === 'string' ? data.shortAnswer : '',
    structured: {
      title: typeof data?.structured?.title === 'string' ? data.structured.title : 'Sonuç',
      points: Array.isArray(data?.structured?.points) ? data.structured.points : [],
      practicalNote: typeof data?.structured?.practicalNote === 'string' ? data.structured.practicalNote : undefined,
    },
    sources: Array.isArray(data.sources) ? data.sources : [],
    followUp: typeof data.followUp === 'string' ? data.followUp : undefined,
    uncertainty: typeof data.uncertainty === 'string' ? data.uncertainty : undefined,
  }
}

export type CaseAnalysisResult = {
  analysis: string
  confidence?: import('@/lib/confidence').ConfidenceLevel
  classification?: { category: string; confidence: number }
}

export async function analyzeCase(
  caseText: string,
  options?: { explanationMode?: 'ogrenci' | 'uyap' }
): Promise<CaseAnalysisResult> {
  const res = await fetch(`${API_BASE}/case`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caseText: caseText.trim(),
      explanationMode: options?.explanationMode ?? 'ogrenci',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Olay analizi yapılamadı.'
    throw new Error(typeof msg === 'string' ? msg : 'Olay analizi yapılamadı.')
  }
  return {
    analysis: data.analysis ?? '',
    confidence: data.confidence,
    classification: data.classification,
  }
}

export async function generateQuiz(
  topic: string,
  count: number = 5,
  options?: { difficulty?: 'kolay' | 'orta' | 'zor' | 'karisik' }
): Promise<{
  questions: { question: string; options: string[]; correct: string; explanation: string }[]
}> {
  const res = await fetch(`${API_BASE}/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, count, difficulty: options?.difficulty ?? 'karisik' }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Test oluşturulamadı.'
    throw new Error(typeof msg === 'string' ? msg : 'Test oluşturulamadı.')
  }
  return data
}

export async function generateFlashcards(topic: string): Promise<{ front: string; back: string }[]> {
  const res = await fetch(`${API_BASE}/flashcards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Bilgi kartları oluşturulamadı.'
    throw new Error(typeof msg === 'string' ? msg : 'Bilgi kartları oluşturulamadı.')
  }
  return data.cards ?? []
}

export type WebSearchItem = { title: string; url: string; snippet: string }

export type LawSearchResult = {
  found: boolean
  lawCode: string
  lawLabel: string
  article: number
  maddeBasligi: string | null
  maddeMetni: string | null
  basitAciklama: string | null
  maddeninAmaci: string | null
  kisaOrnek: string | null
  sinavdaDikkat: string | null
  guncellikNotu: string | null
  message?: string
  articleContent?: string | null
  explanation?: string | null
  example?: string | null
  /** Web aramasından gelen kaynaklar (Tavily/Serper); tüm kaynaklar birleştirilir. */
  webResults?: WebSearchItem[]
  /** true ise madde metni web kaynaklarından platform içinde AI ile derlendi; dış linke çıkmak gerekmez. */
  fromWeb?: boolean
}

export async function searchLawArticle(query: string, signal?: AbortSignal): Promise<LawSearchResult> {
  const res = await fetch(`${API_BASE}/law-search?q=${encodeURIComponent(query.trim())}`, { signal })
  const data = await res.json().catch(() => ({}))
  if (!res.ok && res.status !== 200) {
    const msg = data.error ?? 'Madde araması başarısız'
    throw new Error(typeof msg === 'string' ? msg : 'Madde araması başarısız')
  }
  return data as LawSearchResult
}

export type LessonResult = {
  content: string
  confidence?: import('@/lib/confidence').ConfidenceLevel
  classification?: { category: string; confidence: number }
}

export async function getLesson(
  subject: string,
  topic: string,
  options?: { explanationMode?: 'ogrenci' | 'uyap' }
): Promise<LessonResult> {
  const res = await fetch(`${API_BASE}/lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: subject.trim(),
      topic: topic.trim(),
      explanationMode: options?.explanationMode ?? 'ogrenci',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Ders yüklenirken hata oluştu'
    throw new Error(typeof msg === 'string' ? msg : 'Ders yüklenirken hata oluştu')
  }
  return {
    content: data.content ?? '',
    confidence: data.confidence,
    classification: data.classification,
  }
}

export async function sendLessonDiscuss(
  lessonContent: string,
  userMessage: string,
  options?: { subject?: string; topic?: string }
): Promise<{ reply: string }> {
  const res = await fetch(`${API_BASE}/lesson/discuss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lessonContent,
      userMessage: userMessage.trim(),
      subject: options?.subject,
      topic: options?.topic,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Yanıt alınamadı'
    throw new Error(typeof msg === 'string' ? msg : 'Yanıt alınamadı')
  }
  return { reply: data.reply ?? '' }
}

export type ExamEvaluation = {
  score: number
  feedback: string
  generalAssessment?: string
  strongPoints?: string[]
  improvePoints?: string[]
  legalErrors?: string[]
  missedPoints?: string[]
  suggestionForHigherGrade?: string
  exampleSkeleton?: string
  problemIdentification?: string
  ruleApplication?: string
  howToImprove?: string
  summary?: string
  /** Yanıtın kaynaklara dayanma güveni: Yüksek / Orta / Düşük güven */
  confidence?: import('@/lib/confidence').ConfidenceLevel
  mistakeTags?: import('@/lib/practice-adaptive').MistakeTag[]
  nextDifficulty?: import('@/lib/practice-adaptive').PracticeDifficulty
  sourcesUsed?: string[]
}

export type MainTopicId = import('@/lib/pratik-topic-config').MainTopicId
export type QuestionStyleValue = import('@/lib/pratik-topic-config').QuestionStyleValue

export type ExamGenerateOptions = {
  questionType?: 'olay' | 'madde' | 'klasik' | 'coktan' | 'dogruyanlis' | 'karma'
  difficulty?: 'kolay' | 'orta' | 'zor' | 'karisik'
  questionStyle?: QuestionStyleValue
  mainTopic?: MainTopicId
  subtopic?: string
  /** Kullanıcının yazdığı serbest konu/alt konu; ana+alt konu ile birleştirilir. */
  customTopic?: string
  /** true ise sadece customTopic kullanılır (ana/alt konu birleştirilmez). */
  useOnlyCustomTopic?: boolean
  adaptiveDifficulty?: import('@/lib/practice-adaptive').PracticeDifficulty
  focusMistakes?: import('@/lib/practice-adaptive').MistakeTag[]
  /** Önceki isteği iptal etmek için (fetch AbortSignal). */
  signal?: AbortSignal
}

export type ExamGenerateResult = {
  questions?: string[]
  question?: string
  scenario?: string
  subQuestions?: string[]
  sourcesUsed?: string[]
}

export async function generateExamQuestion(
  topic: string,
  options?: ExamGenerateOptions
): Promise<string> {
  const res = await fetch(`${API_BASE}/exam-practice/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options?.signal,
    body: JSON.stringify({
      topic: topic.trim(),
      count: 1,
      questionType: options?.questionType ?? 'olay',
      difficulty: options?.difficulty ?? 'karisik',
      questionStyle: options?.questionStyle ?? 'tek_olay_tek_soru',
      mainTopic: options?.mainTopic,
      subtopic: options?.subtopic,
      customTopic: options?.customTopic?.trim(),
      useOnlyCustomTopic: options?.useOnlyCustomTopic,
      adaptiveDifficulty: options?.adaptiveDifficulty,
      focusMistakes: options?.focusMistakes,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = extractApiError(data, 'Soru oluşturulamadı')
    throw new Error(typeof msg === 'string' ? msg : 'Soru oluşturulamadı')
  }
  const payload = unwrapApiPayload<any>(data)
  return payload.question ?? ''
}

export async function generateExamQuestions(
  topic: string,
  count: number,
  options?: ExamGenerateOptions
): Promise<string[]> {
  const res = await fetch(`${API_BASE}/exam-practice/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options?.signal,
    body: JSON.stringify({
      topic: topic.trim(),
      count: Math.min(50, Math.max(1, count)),
      questionType: options?.questionType ?? 'olay',
      difficulty: options?.difficulty ?? 'karisik',
      questionStyle: options?.questionStyle ?? 'tek_olay_tek_soru',
      mainTopic: options?.mainTopic,
      subtopic: options?.subtopic,
      customTopic: options?.customTopic?.trim(),
      useOnlyCustomTopic: options?.useOnlyCustomTopic,
      adaptiveDifficulty: options?.adaptiveDifficulty,
      focusMistakes: options?.focusMistakes,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = extractApiError(data, 'Sorular oluşturulamadı')
    throw new Error(typeof msg === 'string' ? msg : 'Sorular oluşturulamadı')
  }
  const payload = unwrapApiPayload<any>(data)
  if (count === 1 && payload.question) return [payload.question]
  return Array.isArray(payload.questions) ? payload.questions : []
}

export async function generateExamQuestionsDetailed(
  topic: string,
  count: number,
  options?: ExamGenerateOptions
): Promise<ExamGenerateResult> {
  const res = await fetch(`${API_BASE}/exam-practice/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options?.signal,
    body: JSON.stringify({
      topic: topic.trim(),
      count: Math.min(50, Math.max(1, count)),
      questionType: options?.questionType ?? 'olay',
      difficulty: options?.difficulty ?? 'karisik',
      questionStyle: options?.questionStyle ?? 'tek_olay_tek_soru',
      mainTopic: options?.mainTopic,
      subtopic: options?.subtopic,
      customTopic: options?.customTopic?.trim(),
      useOnlyCustomTopic: options?.useOnlyCustomTopic,
      adaptiveDifficulty: options?.adaptiveDifficulty,
      focusMistakes: options?.focusMistakes,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = extractApiError(data, 'Sorular oluşturulamadı')
    throw new Error(typeof msg === 'string' ? msg : 'Sorular oluşturulamadı')
  }
  const payload = unwrapApiPayload<any>(data)
  return {
    question: typeof payload.question === 'string' ? payload.question : undefined,
    questions: Array.isArray(payload.questions) ? payload.questions : undefined,
    scenario: typeof payload.scenario === 'string' ? payload.scenario : undefined,
    subQuestions: Array.isArray(payload.subQuestions) ? payload.subQuestions : undefined,
    sourcesUsed: Array.isArray(payload.sourcesUsed) ? payload.sourcesUsed : undefined,
  }
}

/** Tek olay çok soru: bir senaryo + aynı olaydan birden fazla alt soru. */
export async function generateExamScenarioWithSubQuestions(
  topic: string,
  options?: ExamGenerateOptions
): Promise<{ scenario: string; subQuestions: string[] }> {
  const res = await fetch(`${API_BASE}/exam-practice/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options?.signal,
    body: JSON.stringify({
      topic: topic.trim(),
      questionStyle: 'tek_olay_cok_soru',
      questionType: options?.questionType ?? 'olay',
      difficulty: options?.difficulty ?? 'karisik',
      mainTopic: options?.mainTopic,
      subtopic: options?.subtopic,
      customTopic: options?.customTopic?.trim(),
      useOnlyCustomTopic: options?.useOnlyCustomTopic,
      adaptiveDifficulty: options?.adaptiveDifficulty,
      focusMistakes: options?.focusMistakes,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = extractApiError(data, 'Senaryo oluşturulamadı')
    throw new Error(typeof msg === 'string' ? msg : 'Senaryo oluşturulamadı')
  }
  const payload = unwrapApiPayload<any>(data)
  if (payload.mode !== 'tek_olay_cok_soru' || !payload.scenario || !Array.isArray(payload.subQuestions)) {
    throw new Error('Tek olay çok soru yanıtı alınamadı')
  }
  return { scenario: payload.scenario, subQuestions: payload.subQuestions }
}

export async function evaluateExamAnswer(
  question: string,
  userAnswer: string,
  topic?: string,
  options?: {
    explanationMode?: 'ogrenci' | 'uyap'
    scenario?: string
    currentDifficulty?: import('@/lib/practice-adaptive').PracticeDifficulty
    signal?: AbortSignal
  }
): Promise<ExamEvaluation> {
  const res = await fetch(`${API_BASE}/exam-practice/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options?.signal,
    body: JSON.stringify({
      question: question.trim(),
      userAnswer: userAnswer.trim(),
      topic: topic?.trim(),
      explanationMode: options?.explanationMode ?? 'ogrenci',
      scenario: options?.scenario?.trim(),
      currentDifficulty: options?.currentDifficulty,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = extractApiError(data, 'Değerlendirme yapılamadı')
    throw new Error(typeof msg === 'string' ? msg : 'Değerlendirme yapılamadı')
  }
  return unwrapApiPayload<ExamEvaluation>(data)
}

export type DecisionAnalysisResult = {
  analysis: string
  kisaOzet?: string
  olay?: string
  hukukiSorun?: string
  mahkemeYaklasimi?: string
  dayanilanKurallar?: string
  kararinOnemi?: string
  karardanCikarilabilecekDers?: string
  sinavdaNasilKullanilabilir?: string
  farkliYorumIhtimali?: string
  kullanilanKaynak?: string
  sourceLabels?: string[]
  lastChecked?: string
  confidence?: import('@/lib/confidence').ConfidenceLevel
}

export type OralExamMessage = { role: 'user' | 'assistant'; content: string }

export async function sendOralExamMessage(
  topic: string,
  messages: OralExamMessage[]
): Promise<{ reply: string }> {
  const res = await fetch(`${API_BASE}/oral-exam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: topic.trim(), messages }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Sözlü yoklama yanıtı alınamadı.'
    throw new Error(typeof msg === 'string' ? msg : 'Sözlü yoklama yanıtı alınamadı.')
  }
  return { reply: data.reply ?? '' }
}

export async function analyzeDecision(text: string): Promise<DecisionAnalysisResult> {
  const res = await fetch(`${API_BASE}/decision-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.trim() }),
  })
  let data: { error?: string; analysis?: string } & Record<string, unknown> = {}
  try {
    data = await res.json()
  } catch {
    if (!res.ok) {
      throw new Error(res.status === 400 ? 'Metin eksik veya geçersiz. Lütfen karar metnini yapıştırın.' : 'Karar analizi yapılamadı. Lütfen tekrar deneyin.')
    }
    throw new Error('Sunucu yanıtı işlenemedi. Lütfen tekrar deneyin.')
  }
  if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Karar analizi yapılamadı. Lütfen metni kontrol edip tekrar deneyin.'
    throw new Error(msg)
  }
  return data as DecisionAnalysisResult
}
