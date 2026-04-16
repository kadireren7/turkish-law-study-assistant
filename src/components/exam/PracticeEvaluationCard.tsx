'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import type { ExamEvaluation } from '@/lib/api'

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-teal-600 dark:text-teal-400'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

type PracticeEvaluationCardProps = {
  evaluation: ExamEvaluation
}

function PracticeEvaluationCardInner({ evaluation }: PracticeEvaluationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-premium space-y-4 p-5 sm:p-6 dark:bg-slate-800/90"
    >
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Değerlendirme</h3>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Puan:</span>
        <span className={`text-2xl font-bold ${getScoreColor(evaluation.score)}`}>{evaluation.score}/100</span>
      </div>
      {(evaluation.generalAssessment || evaluation.summary) && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Genel değerlendirme</h4>
          <p className="mt-1 border-l-4 border-teal-200 py-1 pl-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap dark:border-teal-800 dark:text-slate-300">
            {evaluation.generalAssessment || evaluation.summary}
          </p>
        </div>
      )}
      {evaluation.problemIdentification && (
        <div>
          <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400">Hukuki sorun tespiti</h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap dark:text-slate-300">
            {evaluation.problemIdentification}
          </p>
        </div>
      )}
      {evaluation.ruleApplication && (
        <div>
          <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400">Doğru kural uygulaması</h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap dark:text-slate-300">
            {evaluation.ruleApplication}
          </p>
        </div>
      )}
      {evaluation.strongPoints && evaluation.strongPoints.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400">Güçlü yönler</h4>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-700 dark:text-slate-300">
            {evaluation.strongPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {evaluation.improvePoints && evaluation.improvePoints.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Eksikler</h4>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-700 dark:text-slate-300">
            {evaluation.improvePoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {evaluation.legalErrors && evaluation.legalErrors.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">Hukuki hatalar</h4>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-700 dark:text-slate-300">
            {evaluation.legalErrors.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {evaluation.missedPoints && evaluation.missedPoints.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Atlanan noktalar</h4>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-700 dark:text-slate-300">
            {evaluation.missedPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {(evaluation.suggestionForHigherGrade || evaluation.howToImprove) && (
        <div>
          <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400">Sınavda daha yüksek not için öneri</h4>
          <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
            {evaluation.suggestionForHigherGrade || evaluation.howToImprove}
          </div>
        </div>
      )}
      {evaluation.exampleSkeleton && (
        <div>
          <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400">Örnek güçlü cevap iskeleti</h4>
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-200">
            {evaluation.exampleSkeleton}
          </div>
        </div>
      )}
      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          Tüm geri bildirim metni
        </summary>
        <div
          className="mt-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
          dangerouslySetInnerHTML={{
            __html: evaluation.feedback.replace(/\n/g, '<br />'),
          }}
        />
      </details>
    </motion.div>
  )
}

export const PracticeEvaluationCard = memo(PracticeEvaluationCardInner)
