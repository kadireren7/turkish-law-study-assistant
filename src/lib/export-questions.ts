/**
 * Export practice questions and test sets as PDF (print) and DOCX (API).
 * Turkish characters preserved (UTF-8). Clean printable formatting.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDateTR(long = true): string {
  return new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: long ? 'long' : '2-digit',
    day: long ? 'numeric' : '2-digit',
  })
}

export type PracticeExportMeta = {
  title: string
  topic: string
  questionType: string
  difficulty: string
  date: string
  questions: string[]
  /** Tek olay çok soru: senaryo metni (yazdırma/PDF’de sorulardan önce gösterilir). */
  scenario?: string
}

const PRINT_STYLES = `
body{font-family:'Segoe UI',system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:1.5rem;color:#1e293b;line-height:1.6;}
h1{font-size:1.35rem;margin-bottom:0.5rem;color:#0f172a;}
.meta{font-size:0.9rem;color:#475569;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #e2e8f0;}
.meta span{display:inline-block;margin-right:1.25rem;}
.q{margin:1.25rem 0;padding:0.75rem 0;border-bottom:1px solid #e2e8f0;}
.q strong{display:block;margin-bottom:0.35rem;color:#0f172a;}
.q .qtext{white-space:pre-wrap;}
.opt{margin:0.35rem 0 0 1rem;}
@media print{body{margin:1rem;max-width:100%;}.meta{color:#334155;}.q{break-inside:avoid;}}
`.replace(/\n/g, '')

/** Build HTML for practice set (Pratik Çöz / Sınav Pratiği) – PDF via print. */
export function buildPracticePrintHtml(meta: PracticeExportMeta): string {
  const { title, topic, questionType, difficulty, date, questions, scenario } = meta
  const metaHtml = [
    `<span><strong>Başlık:</strong> ${escapeHtml(title)}</span>`,
    `<span><strong>Konu:</strong> ${escapeHtml(topic)}</span>`,
    `<span><strong>Soru tipi:</strong> ${escapeHtml(questionType)}</span>`,
    `<span><strong>Zorluk:</strong> ${escapeHtml(difficulty)}</span>`,
    `<span><strong>Tarih:</strong> ${escapeHtml(date)}</span>`,
  ].join('')
  const scenarioHtml = scenario
    ? `<div class="q" style="background:#f1f5f9;padding:1rem;border-radius:0.5rem;margin-bottom:1rem;"><strong>Senaryo</strong><div class="qtext">${escapeHtml(scenario)}</div></div>`
    : ''
  const questionsHtml = questions
    .map(
      (q, i) =>
        `<div class="q"><strong>Soru ${i + 1}.</strong><div class="qtext">${escapeHtml(q)}</div></div>`
    )
    .join('')
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${escapeHtml(title)} – ${escapeHtml(topic)}</title>
<style>${PRINT_STYLES}</style></head><body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">${metaHtml}</div>
${scenarioHtml}
${questionsHtml}
</body></html>`
}

/** Open print dialog for practice set (user can choose "Save as PDF"). */
export function printPracticeSet(meta: PracticeExportMeta): void {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(buildPracticePrintHtml(meta))
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 300)
}

export type QuizQuestionExport = {
  question: string
  options: string[]
  correct: string
  explanation?: string
}

export type QuizExportMeta = {
  title: string
  topic: string
  date: string
  questions: QuizQuestionExport[]
  /** Include correct answers and explanations (e.g. for answer key). */
  showAnswers?: boolean
}

/** Build HTML for quiz/test set – PDF via print. */
export function buildQuizPrintHtml(meta: QuizExportMeta): string {
  const { title, topic, date, questions, showAnswers = false } = meta
  const letters = ['A', 'B', 'C', 'D']
  const metaHtml = [
    `<span><strong>Başlık:</strong> ${escapeHtml(title)}</span>`,
    `<span><strong>Konu:</strong> ${escapeHtml(topic)}</span>`,
    `<span><strong>Tarih:</strong> ${escapeHtml(date)}</span>`,
  ].join('')
  const questionsHtml = questions
    .map((q, i) => {
      const opts = q.options
        .map(
          (opt, j) =>
            `<div class="opt">${letters[j]}) ${escapeHtml(opt)}${showAnswers && opt === q.correct ? ' ✓' : ''}</div>`
        )
        .join('')
      const answerBlock =
        showAnswers && q.correct
          ? `<div class="opt" style="margin-top:0.5rem;color:#0d9488;"><strong>Doğru cevap:</strong> ${escapeHtml(q.correct)}</div>`
          : ''
      const explBlock =
        showAnswers && q.explanation
          ? `<div class="opt" style="margin-top:0.25rem;font-size:0.9em;color:#475569;">${escapeHtml(q.explanation)}</div>`
          : ''
      return `<div class="q"><strong>Soru ${i + 1}.</strong><div class="qtext">${escapeHtml(q.question)}</div>${opts}${answerBlock}${explBlock}</div>`
    })
    .join('')
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${escapeHtml(title)} – ${escapeHtml(topic)}</title>
<style>${PRINT_STYLES}</style></head><body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">${metaHtml}</div>
${questionsHtml}
</body></html>`
}

/** Open print dialog for quiz set (user can choose "Save as PDF"). */
export function printQuizSet(meta: QuizExportMeta): void {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(buildQuizPrintHtml(meta))
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 300)
}

/** Filename-safe slug (preserve Turkish letters). */
export function slugForFilename(topic: string, maxLen = 40): string {
  const slug = topic
    .trim()
    .slice(0, maxLen)
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
  return slug || 'soru-seti'
}

/** Date string for filename (e.g. 07-03-2025). */
export function dateSlugForFilename(): string {
  return formatDateTR(false).replace(/\./g, '-')
}
