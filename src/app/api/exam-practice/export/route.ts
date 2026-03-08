/**
 * POST /api/exam-practice/export
 * Body: { topic: string, questionType: string, difficulty: string, questions: string[] }
 * Returns: .docx file (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
 * Clean printable format; heading, topic, difficulty, question type, date; Turkish preserved (UTF-8).
 */
import { NextResponse } from 'next/server'
import { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType } from 'docx'

const QUESTION_TYPE_LABELS: Record<string, string> = {
  olay: 'Olay sorusu',
  madde: 'Madde sorusu',
  klasik: 'Klasik soru',
  coktan: 'Çoktan seçmeli',
  dogruyanlis: 'Doğru / Yanlış',
  karma: 'Karma',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  kolay: 'Kolay',
  orta: 'Orta',
  zor: 'Zor',
  karisik: 'Karışık',
}

/** Format date for display and filename (tr-TR, Turkish-safe). */
function formatExportDate(d: Date = new Date()): string {
  return d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/** Safe filename slug: keep Turkish letters, replace other non-alphanumeric with dash. */
function slugForFilename(topic: string, maxLen: number = 40): string {
  const slug = topic
    .trim()
    .slice(0, maxLen)
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
  return slug || 'soru-seti'
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      title?: string
      topic?: string
      questionType?: string
      difficulty?: string
      questions?: string[]
    }
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Sınav Pratiği – Soru Seti'
    const topic = typeof body.topic === 'string' ? body.topic.trim() : 'Konu'
    const questionType = QUESTION_TYPE_LABELS[body.questionType ?? ''] ?? body.questionType ?? 'Olay'
    const difficulty = DIFFICULTY_LABELS[body.difficulty ?? ''] ?? body.difficulty ?? 'Karışık'
    const questions = Array.isArray(body.questions) ? body.questions : []
    const dateStr = formatExportDate()

    const children: Paragraph[] = [
      new Paragraph({
        text: title,
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
          new TextRun({ text: 'Soru tipi: ', bold: true }),
          new TextRun({ text: questionType }),
        ],
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Zorluk: ', bold: true }),
          new TextRun({ text: difficulty }),
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
          children: [
            new TextRun({ text: `Soru ${i + 1}.`, bold: true }),
          ],
          spacing: { before: 280, after: 80 },
        }),
        new Paragraph({
          text: q,
          spacing: { after: 200 },
        })
      )
    })

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)
    const slug = slugForFilename(topic)
    const dateSlug = dateStr.replace(/\./g, '-')
    const filename = `sinav-pratik-${slug}-${dateSlug}.docx`
    const disposition = `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': disposition,
      },
    })
  } catch (e) {
    console.error('Exam export error:', e)
    return NextResponse.json({ error: 'Dışa aktarma başarısız' }, { status: 500 })
  }
}
