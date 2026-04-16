import type { MainTopicId } from '@/lib/pratik-topic-config'
import { buildTopicLabel } from '@/lib/pratik-topic-config'
import { EXAM_PRACTICE_PREFS_KEY, type ExamPracticePrefs } from './exam.types'

/** Konu metni: pratik-coz ile aynı birleştirme kuralı. */
export function buildExamTopicString(
  mainTopicId: MainTopicId,
  subtopic: string,
  customTopic: string,
  useOnlyCustomTopic: boolean
): string {
  const topicLabel = buildTopicLabel(mainTopicId, subtopic)
  if (useOnlyCustomTopic && customTopic.trim()) return customTopic.trim()
  if (customTopic.trim()) {
    return topicLabel ? `${topicLabel}; ${customTopic.trim()}` : customTopic.trim()
  }
  return topicLabel
}

export function loadExamPracticePrefs(): Partial<ExamPracticePrefs> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(EXAM_PRACTICE_PREFS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<ExamPracticePrefs>
  } catch {
    return null
  }
}

export function saveExamPracticePrefs(prefs: ExamPracticePrefs): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(EXAM_PRACTICE_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* quota */
  }
}

export function buildMarkdownExport(params: {
  title: string
  topicLabel: string
  questionTypeLabel: string
  difficultyLabel: string
  questionStyleLabel: string
  scenario?: string
  subQuestions?: string[]
  questions?: string[]
}): string {
  const lines: string[] = [
    `# ${params.title}`,
    '',
    `- **Konu:** ${params.topicLabel}`,
    `- **Soru tipi:** ${params.questionTypeLabel}`,
    `- **Zorluk:** ${params.difficultyLabel}`,
    `- **Tarz:** ${params.questionStyleLabel}`,
    `- **Tarih:** ${new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    '',
  ]
  if (params.scenario?.trim()) {
    lines.push('## Senaryo', '', params.scenario.trim(), '')
  }
  if (params.subQuestions?.length) {
    lines.push('## Sorular', '')
    params.subQuestions.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.trim()}`, '')
    })
  } else if (params.questions?.length) {
    lines.push('## Sorular', '')
    params.questions.forEach((q, i) => {
      lines.push(`### Soru ${i + 1}`, '', q.trim(), '')
    })
  }
  return lines.join('\n').trim() + '\n'
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Basit madde / kanun satırı vurgusu için sezgisel kontrol. */
export function looksLikeStatuteLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  if (/^(madde|m\.|tbk|tck|ttk|anayasa|cmk|hmk|mk|bk|ik|kvkk)/i.test(t)) return true
  if (/\b(m\.\s*\d+|madde\s*\d+)/i.test(t)) return true
  return false
}
