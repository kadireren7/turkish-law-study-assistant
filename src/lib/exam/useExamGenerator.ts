'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  generateExamQuestions,
  generateExamScenarioWithSubQuestions,
  evaluateExamAnswer,
  type ExamEvaluation,
  type ExamGenerateOptions,
} from '@/lib/api'
import { MAIN_TOPICS, getSubtopics, buildTopicLabel, QUESTION_STYLES, type MainTopicId } from '@/lib/pratik-topic-config'
import { savePracticeQuestion } from '@/lib/saved-practice-questions'
import {
  buildExamTopicString,
  loadExamPracticePrefs,
  saveExamPracticePrefs,
  buildMarkdownExport,
  copyTextToClipboard,
  downloadTextFile,
} from '@/lib/exam/exam.utils'
import type { ExamResultMode } from '@/lib/exam/exam.types'
import { QUESTION_TYPE_OPTIONS, DIFFICULTY_OPTIONS, type ExamPracticePrefs } from '@/lib/exam/exam.types'

function defaultPrefs(): ExamPracticePrefs {
  return {
    mainTopicId: 'ceza',
    subtopic: getSubtopics('ceza')[0]?.value ?? '',
    customTopic: '',
    useOnlyCustomTopic: false,
    questionStyle: 'tek_olay_tek_soru',
    questionType: 'olay',
    difficulty: 'karisik',
    questionCount: 5,
    professorStyle: false,
  }
}

function initialPrefs(): ExamPracticePrefs {
  const d = defaultPrefs()
  if (typeof window === 'undefined') return d
  const loaded = loadExamPracticePrefs()
  if (!loaded) return d
  return { ...d, ...loaded }
}

export function useExamGenerator() {
  const [init] = useState(() => initialPrefs())
  const [mainTopicId, setMainTopicId] = useState<MainTopicId>(init.mainTopicId)
  const [subtopic, setSubtopic] = useState(init.subtopic)
  const [customTopic, setCustomTopic] = useState(init.customTopic)
  const [useOnlyCustomTopic, setUseOnlyCustomTopic] = useState(init.useOnlyCustomTopic)
  const [questionStyle, setQuestionStyle] = useState(init.questionStyle)
  const [questionType, setQuestionType] = useState<NonNullable<ExamGenerateOptions['questionType']>>(init.questionType)
  const [difficulty, setDifficulty] = useState<NonNullable<ExamGenerateOptions['difficulty']>>(init.difficulty)
  const [questionCount, setQuestionCount] = useState(init.questionCount)
  const [professorStyle, setProfessorStyle] = useState(init.professorStyle)

  const [scenario, setScenario] = useState('')
  const [subQuestions, setSubQuestions] = useState<string[]>([])
  const [questions, setQuestions] = useState<string[]>([])
  const [currentIndex, setCurrentIndexState] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<ExamEvaluation | null>(null)

  const [loadingGenerate, setLoadingGenerate] = useState(false)
  const [loadingEvaluate, setLoadingEvaluate] = useState(false)
  const [error, setError] = useState('')

  const latestGenerateIdRef = useRef(0)
  const latestEvaluateIdRef = useRef(0)
  const abortGenerateRef = useRef<AbortController | null>(null)
  const abortEvaluateRef = useRef<AbortController | null>(null)
  const resultsRef = useRef<HTMLDivElement | null>(null)
  const prefsSavedRef = useRef(false)

  const topicLabel = useMemo(() => buildTopicLabel(mainTopicId, subtopic), [mainTopicId, subtopic])

  const topicForApi = useMemo(
    () => buildExamTopicString(mainTopicId, subtopic, customTopic, useOnlyCustomTopic),
    [mainTopicId, subtopic, customTopic, useOnlyCustomTopic]
  )

  /** Profesör tarzı, "tek olay çok soru" seçimini ezmez (API dalı sabit). */
  const effectiveQuestionStyle = useMemo(() => {
    if (questionStyle === 'tek_olay_cok_soru') return 'tek_olay_cok_soru'
    if (professorStyle) return 'derin_analiz'
    return questionStyle
  }, [professorStyle, questionStyle])

  const effectiveQuestionType = useMemo(() => {
    if (questionStyle === 'tek_olay_cok_soru') return questionType
    if (professorStyle) return 'olay'
    return questionType
  }, [professorStyle, questionStyle, questionType])

  const generateOptions = useMemo((): ExamGenerateOptions => {
    return {
      questionType: effectiveQuestionType,
      difficulty,
      questionStyle: effectiveQuestionStyle as ExamGenerateOptions['questionStyle'],
      mainTopic: mainTopicId,
      subtopic,
      customTopic,
      useOnlyCustomTopic,
    }
  }, [
    effectiveQuestionType,
    difficulty,
    effectiveQuestionStyle,
    mainTopicId,
    subtopic,
    customTopic,
    useOnlyCustomTopic,
  ])

  const resultMode: ExamResultMode = useMemo(() => {
    if (scenario && subQuestions.length > 0) return 'scenario'
    if (questions.length > 0) return 'list'
    return 'idle'
  }, [scenario, subQuestions.length, questions.length])

  const displayQuestion = useMemo(() => {
    if (resultMode === 'scenario') return subQuestions[currentIndex] ?? ''
    return questions[currentIndex] ?? ''
  }, [resultMode, subQuestions, questions, currentIndex])

  const hasResults = resultMode !== 'idle'

  const setCurrentIndex = useCallback((i: number) => {
    setCurrentIndexState(i)
    setEvaluation(null)
  }, [])

  const subtopics = useMemo(() => getSubtopics(mainTopicId), [mainTopicId])

  useEffect(() => {
    const first = subtopics[0]
    if (first && subtopics.every((s) => s.value !== subtopic)) setSubtopic(first.value)
  }, [mainTopicId, subtopics, subtopic])

  useEffect(() => {
    if (!prefsSavedRef.current) {
      prefsSavedRef.current = true
      return
    }
    const t = window.setTimeout(() => {
      saveExamPracticePrefs({
        mainTopicId,
        subtopic,
        customTopic,
        useOnlyCustomTopic,
        questionStyle,
        questionType,
        difficulty,
        questionCount,
        professorStyle,
      })
    }, 400)
    return () => window.clearTimeout(t)
  }, [
    mainTopicId,
    subtopic,
    customTopic,
    useOnlyCustomTopic,
    questionStyle,
    questionType,
    difficulty,
    questionCount,
    professorStyle,
  ])

  const scrollToResults = useCallback(() => {
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const generate = useCallback(async () => {
    if (!topicForApi.trim() || loadingGenerate) return

    abortGenerateRef.current?.abort()
    abortEvaluateRef.current?.abort()
    const ctrl = new AbortController()
    abortGenerateRef.current = ctrl
    const signal = ctrl.signal
    const reqId = ++latestGenerateIdRef.current

    setLoadingGenerate(true)
    setError('')
    setEvaluation(null)
    setUserAnswer('')
    setScenario('')
    setSubQuestions([])
    setQuestions([])
    setCurrentIndexState(0)

    const opts: ExamGenerateOptions = { ...generateOptions, signal }

    try {
      if (questionStyle === 'tek_olay_cok_soru') {
        const { scenario: sc, subQuestions: subs } = await generateExamScenarioWithSubQuestions(topicForApi.trim(), opts)
        if (reqId !== latestGenerateIdRef.current) return
        setScenario(sc)
        setSubQuestions(subs)
      } else {
        const list = await generateExamQuestions(
          topicForApi.trim(),
          Math.min(50, Math.max(1, questionCount)),
          opts
        )
        if (reqId !== latestGenerateIdRef.current) return
        setQuestions(list)
      }
      scrollToResults()
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      if (reqId !== latestGenerateIdRef.current) return
      setError(err instanceof Error ? err.message : 'Sorular oluşturulamadı.')
    } finally {
      if (reqId === latestGenerateIdRef.current) setLoadingGenerate(false)
    }
  }, [
    topicForApi,
    loadingGenerate,
    generateOptions,
    questionStyle,
    questionCount,
    scrollToResults,
  ])

  const evaluate = useCallback(async () => {
    if (!displayQuestion.trim() || !userAnswer.trim() || loadingEvaluate) return

    abortEvaluateRef.current?.abort()
    const ctrl = new AbortController()
    abortEvaluateRef.current = ctrl

    const reqId = ++latestEvaluateIdRef.current
    setLoadingEvaluate(true)
    setError('')
    setEvaluation(null)

    try {
      const result = await evaluateExamAnswer(displayQuestion, userAnswer.trim(), topicForApi || undefined, {
        scenario: resultMode === 'scenario' ? scenario : undefined,
        signal: ctrl.signal,
      })
      if (reqId !== latestEvaluateIdRef.current) return
      setEvaluation(result)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      if (reqId !== latestEvaluateIdRef.current) return
      setError(err instanceof Error ? err.message : 'Değerlendirme yapılamadı.')
    } finally {
      if (reqId === latestEvaluateIdRef.current) setLoadingEvaluate(false)
    }
  }, [
    displayQuestion,
    userAnswer,
    loadingEvaluate,
    topicForApi,
    resultMode,
    scenario,
  ])

  const buildFullCopyText = useCallback(() => {
    if (resultMode === 'scenario') {
      const parts = [`SENARYO\n\n${scenario}`, ...subQuestions.map((q, i) => `${i + 1}. ${q}`)]
      return parts.join('\n\n')
    }
    return questions.map((q, i) => `Soru ${i + 1}\n\n${q}`).join('\n\n---\n\n')
  }, [resultMode, scenario, subQuestions, questions])

  const copyAll = useCallback(async () => {
    if (!hasResults) return
    await copyTextToClipboard(buildFullCopyText())
  }, [hasResults, buildFullCopyText])

  const copyVisible = useCallback(async () => {
    const text =
      resultMode === 'scenario' && scenario.trim()
        ? `${scenario.trim()}\n\n${(subQuestions[currentIndex] ?? '').trim()}`
        : (questions[currentIndex] ?? '').trim()
    if (!text) return
    await copyTextToClipboard(text)
  }, [resultMode, scenario, subQuestions, questions, currentIndex])

  const exportMarkdown = useCallback(() => {
    if (!hasResults) return
    const qt = QUESTION_TYPE_OPTIONS.find((t) => t.value === effectiveQuestionType)?.label ?? effectiveQuestionType
    const df = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.label ?? difficulty
    const qs = QUESTION_STYLES.find((s) => s.value === effectiveQuestionStyle)?.label ?? effectiveQuestionStyle
    const md = buildMarkdownExport({
      title: 'Sınav Pratiği',
      topicLabel,
      questionTypeLabel: qt,
      difficultyLabel: df,
      questionStyleLabel: qs,
      scenario: resultMode === 'scenario' ? scenario : undefined,
      subQuestions: resultMode === 'scenario' ? subQuestions : undefined,
      questions: resultMode === 'list' ? questions : undefined,
    })
    const slug = topicLabel.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'sinav-pratik'
    downloadTextFile(`sinav-pratik-${slug}.md`, md, 'text/markdown')
  }, [
    hasResults,
    topicLabel,
    effectiveQuestionType,
    difficulty,
    effectiveQuestionStyle,
    resultMode,
    scenario,
    subQuestions,
    questions,
  ])

  const saveCurrent = useCallback(() => {
    if (!hasResults || !displayQuestion.trim()) return
    savePracticeQuestion({
      topic: topicLabel,
      question: displayQuestion,
      scenario: resultMode === 'scenario' ? scenario : undefined,
      subQuestions: resultMode === 'scenario' ? subQuestions : undefined,
    })
  }, [hasResults, displayQuestion, topicLabel, resultMode, scenario, subQuestions])

  return {
    // form
    mainTopicId,
    setMainTopicId,
    subtopic,
    setSubtopic,
    customTopic,
    setCustomTopic,
    useOnlyCustomTopic,
    setUseOnlyCustomTopic,
    questionStyle,
    setQuestionStyle,
    questionType,
    setQuestionType,
    difficulty,
    setDifficulty,
    questionCount,
    setQuestionCount,
    professorStyle,
    setProfessorStyle,
    mainTopics: MAIN_TOPICS,
    subtopics,
    questionStyles: QUESTION_STYLES,
    topicLabel,
    topicForApi,
    effectiveQuestionStyle,
    effectiveQuestionType,
    // result
    scenario,
    subQuestions,
    questions,
    currentIndex,
    setCurrentIndex,
    resultMode,
    displayQuestion,
    hasResults,
    userAnswer,
    setUserAnswer,
    evaluation,
    loadingGenerate,
    loadingEvaluate,
    error,
    setError,
    generate,
    evaluate,
    copyAll,
    copyVisible,
    exportMarkdown,
    saveCurrent,
    buildFullCopyText,
    resultsRef,
    scrollToResults,
  }
}

export { useExamGenerator as useExamPractice }
