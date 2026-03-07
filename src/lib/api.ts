const API_BASE = '/api'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type ChatResponse = {
  reply: string
  sources: string[]
  sourceLabels?: string[]
  lastChecked?: string | null
  lowConfidence?: boolean
  warnings?: string[]
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
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
  }
}

export async function analyzeCase(caseText: string): Promise<string> {
  const res = await fetch(`${API_BASE}/case`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseText }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Olay analizi yapılamadı.'
    throw new Error(typeof msg === 'string' ? msg : 'Olay analizi yapılamadı.')
  }
  return data.analysis ?? ''
}

export async function generateQuiz(topic: string): Promise<{
  questions: { question: string; options: string[]; correct: string; explanation: string }[]
}> {
  const res = await fetch(`${API_BASE}/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
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

export async function getLesson(subject: string, topic: string): Promise<string> {
  const res = await fetch(`${API_BASE}/lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject: subject.trim(), topic: topic.trim() }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Ders yüklenirken hata oluştu'
    throw new Error(typeof msg === 'string' ? msg : 'Ders yüklenirken hata oluştu')
  }
  return data.content ?? ''
}

export type ExamEvaluation = {
  score: number
  feedback: string
  strongPoints?: string[]
  improvePoints?: string[]
  howToImprove?: string
  summary?: string
}

export async function generateExamQuestion(topic: string): Promise<string> {
  const res = await fetch(`${API_BASE}/exam-practice/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: topic.trim() }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Soru oluşturulamadı'
    throw new Error(typeof msg === 'string' ? msg : 'Soru oluşturulamadı')
  }
  return data.question ?? ''
}

export async function evaluateExamAnswer(
  question: string,
  userAnswer: string,
  topic?: string
): Promise<ExamEvaluation> {
  const res = await fetch(`${API_BASE}/exam-practice/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: question.trim(),
      userAnswer: userAnswer.trim(),
      topic: topic?.trim(),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error ?? 'Değerlendirme yapılamadı'
    throw new Error(typeof msg === 'string' ? msg : 'Değerlendirme yapılamadı')
  }
  return data as ExamEvaluation
}
