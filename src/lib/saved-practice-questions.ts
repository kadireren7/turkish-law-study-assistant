export type SavedPracticeItem = {
  id: string
  createdAt: number
  topic: string
  question: string
  scenario?: string
  subQuestions?: string[]
}

const STORAGE_KEY = 'studylaw:saved-questions:v1'
const MAX_ITEMS = 40

function genId(): string {
  return `sq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function loadSavedQuestions(): SavedPracticeItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedPracticeItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function savePracticeQuestion(item: Omit<SavedPracticeItem, 'id' | 'createdAt'>): SavedPracticeItem {
  const entry: SavedPracticeItem = {
    id: genId(),
    createdAt: Date.now(),
    ...item,
  }
  const prev = loadSavedQuestions()
  const next = [entry, ...prev.filter((p) => p.question !== entry.question)].slice(0, MAX_ITEMS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event('saved-questions-updated'))
  } catch {
    /* quota */
  }
  return entry
}

export function getSavedQuestionById(id: string): SavedPracticeItem | undefined {
  return loadSavedQuestions().find((q) => q.id === id)
}

export function deleteSavedQuestion(id: string): void {
  if (typeof window === 'undefined') return
  const next = loadSavedQuestions().filter((q) => q.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('saved-questions-updated'))
}
