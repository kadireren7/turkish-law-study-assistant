import type { MainTopicId } from '@/lib/pratik-topic-config'
import type { ExamGenerateOptions } from '@/lib/api'

export const EXAM_PRACTICE_PREFS_KEY = 'studylaw:exam-practice:prefs:v2'

export const QUESTION_COUNTS = [1, 5, 10, 15, 25, 50] as const

export const QUESTION_TYPE_OPTIONS = [
  { value: 'olay', label: 'Olay sorusu' },
  { value: 'madde', label: 'Madde sorusu' },
  { value: 'klasik', label: 'Klasik soru' },
  { value: 'coktan', label: 'Çoktan seçmeli' },
  { value: 'dogruyanlis', label: 'Doğru / Yanlış' },
  { value: 'karma', label: 'Karma' },
] as const

export const DIFFICULTY_OPTIONS = [
  { value: 'kolay', label: 'Kolay' },
  { value: 'orta', label: 'Orta' },
  { value: 'zor', label: 'Zor' },
  { value: 'karisik', label: 'Karışık' },
] as const

export type ExamPracticePrefs = {
  mainTopicId: MainTopicId
  subtopic: string
  customTopic: string
  useOnlyCustomTopic: boolean
  questionStyle: string
  questionType: NonNullable<ExamGenerateOptions['questionType']>
  difficulty: NonNullable<ExamGenerateOptions['difficulty']>
  questionCount: number
  professorStyle: boolean
}

export type ExamResultMode = 'idle' | 'scenario' | 'list'
