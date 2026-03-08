/**
 * POST /api/quiz/export
 * Body: { topic: string, questions: { question: string, options: string[], correct: string, explanation?: string }[], includeAnswers?: boolean }
 * Returns: .docx file. Clean printable format; başlık, konu, tarih, soru listesi (A–D). Turkish preserved (UTF-8).
 */
import { NextResponse } from 'next/server'
import { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType } from 'docx'

const letters = ['A', 'B', 'C', 'D']

function formatExportDate(d: Date = new Date()): string {
  return d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function slugForFilename(topic: string, maxLen = 40): string {
  const slug = topic
    .trim()
    .slice(0, maxLen)
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
  return slug || 'test'
}

type QuizQuestion = {
  question: string
  options: string[]
  correct: string
  explanation?: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      topic?: string
      questions?: QuizQuestion[]
      includeAnswers?: boolean
    }
    const topic = typeof body.topic === 'string' ? body.topic.trim() : 'Konu'
    const questions = Array.isArray(body.questions) ? body.questions : []
    const includeAnswers = Boolean(body.includeAnswers)
    const dateStr = formatExportDate()

    const children: Paragraph[] = [
      new Paragraph({
        text: 'Çoktan Seçmeli Test',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 320 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Konu: ', bold: true }),
          new TextRun({ text: topic }),
        ],
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Tarih: ', bold: true }),
          new TextRun({ text: dateStr }),
        ],
        spacing: { after: 400 },
      }),
    ]

    questions.forEach((q, i) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Soru ${i + 1}.`, bold: true })],
          spacing: { before: 280, after: 80 },
        }),
        new Paragraph({
          text: q.question,
          spacing: { after: 120 },
        })
      )
      q.options.forEach((opt, j) => {
        const label = `${letters[j]}) `
        const isCorrect = opt === q.correct
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: label, bold: false }),
              new TextRun({
                text: opt + (includeAnswers && isCorrect ? ' ✓' : ''),
                bold: includeAnswers && isCorrect,
              }),
            ],
            indent: { left: 360 },
            spacing: { after: 60 },
          })
        )
      })
      if (includeAnswers && (q.correct || q.explanation)) {
        if (q.correct) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Doğru cevap: ', bold: true }),
                new TextRun({ text: q.correct }),
              ],
              spacing: { before: 80, after: 60 },
            })
          )
        }
        if (q.explanation) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Açıklama: ', bold: true }),
                new TextRun({ text: q.explanation }),
              ],
              spacing: { after: 200 },
            })
          )
        }
      }
    })

    const doc = new Document({
      sections: [{ properties: {}, children }],
    })

    const buffer = await Packer.toBuffer(doc)
    const slug = slugForFilename(topic)
    const dateSlug = dateStr.replace(/\./g, '-')
    const filename = `coktan-secmeli-${slug}-${dateSlug}.docx`
    const disposition = `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': disposition,
      },
    })
  } catch (e) {
    console.error('Quiz export error:', e)
    return NextResponse.json({ error: 'Dışa aktarma başarısız' }, { status: 500 })
  }
}
