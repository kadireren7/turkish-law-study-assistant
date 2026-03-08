const API_BASE = '/api'

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
    const msg = data.error ?? 'Sunucu tarafında bir hata oluştu. Lütfen tekrar deneyin.'
    throw new Error(typeof msg === 'string' ? msg : 'Sunucu tarafında bir hata oluştu. Lütfen tekrar deneyin.')
  }
  return {
    reply: data.reply ?? '',
    sources: Array.isArray(data.sources) ? data.sources : [],
    sourceLabels: Array.isArray(data.sourceLabels) ? data.sourceLabels : undefined,
    lastChecked: typeof data.lastChecked === 'string' ? data.lastChecked : data.lastChecked === null ? null : undefined,
    lowConfidence: Boolean(data.lowConfidence),
    warnings: Array.isArray(data.warnings) ? data.warnings : undefined,
    confidence: data.confidence === 'yuksek' || data.confidence === 'orta' || data.confidence === 'dusuk' ? data.confidence : undefined,
    queryType: typeof data.queryType === 'string' ? data.queryType : undefined,
    classificationConfidence: data.classificationConfidence === 'yuksek' || data.classificationConfidence === 'orta' || data.classificationConfidence === 'dusuk' ? data.classificationConfidence : undefined,
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

export async function generateQuiz(topic: string, count: number = 5): Promise<{
  questions: { question: string; options: string[]; correct: string; explanation: string }[]
}> {
  const res = await fetch(`${API_BASE}/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, count }),
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
}

export async function searchLawArticle(query: string): Promise<LawSearchResult> {
  const res = await fetch(`${API_BASE}/law-search?q=${encodeURIComponent(query.trim())}`)
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
}

export async function generateExamQuestion(
  topic: string,
  options?: ExamGenerateOptions
): Promise<string> {
  const res = await fetch(`${API_BASE}/exam-practice/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: topic.trim(),
      count: 1,
      questionType: options?.questionType ?? 'olay',
      difficulty: options?.difficulty ?? 'karisik',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Soru oluşturulamadı'
    throw new Error(typeof msg === 'string' ? msg : 'Soru oluşturulamadı')
  }
  return data.question ?? ''
}

export type ExamGenerateOptions = {
  questionType?: 'olay' | 'madde' | 'klasik' | 'coktan' | 'dogruyanlis' | 'karma'
  difficulty?: 'kolay' | 'orta' | 'zor' | 'karisik'
}

export async function generateExamQuestions(
  topic: string,
  count: number,
  options?: ExamGenerateOptions
): Promise<string[]> {
  const res = await fetch(`${API_BASE}/exam-practice/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: topic.trim(),
      count: Math.min(50, Math.max(1, count)),
      questionType: options?.questionType ?? 'olay',
      difficulty: options?.difficulty ?? 'karisik',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Sorular oluşturulamadı'
    throw new Error(typeof msg === 'string' ? msg : 'Sorular oluşturulamadı')
  }
  if (count === 1 && data.question) return [data.question]
  return Array.isArray(data.questions) ? data.questions : []
}

export async function evaluateExamAnswer(
  question: string,
  userAnswer: string,
  topic?: string,
  options?: { explanationMode?: 'ogrenci' | 'uyap' }
): Promise<ExamEvaluation> {
  const res = await fetch(`${API_BASE}/exam-practice/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: question.trim(),
      userAnswer: userAnswer.trim(),
      topic: topic?.trim(),
      explanationMode: options?.explanationMode ?? 'ogrenci',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Değerlendirme yapılamadı'
    throw new Error(typeof msg === 'string' ? msg : 'Değerlendirme yapılamadı')
  }
  return data as ExamEvaluation
}

export type DecisionAnalysisResult = {
  analysis: string
  kisaOzet?: string
  olay?: string
  hukukiSorun?: string
  mahkemeYaklasimi?: string
  dayanilanKurallar?: string
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
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Karar analizi yapılamadı.'
    throw new Error(typeof msg === 'string' ? msg : 'Karar analizi yapılamadı.')
  }
  return data as DecisionAnalysisResult
}
