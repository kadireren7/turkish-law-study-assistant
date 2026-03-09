/**
 * GET /api/law-coverage
 * Returns coverage audit: index article counts, mevzuat presence, weak areas.
 * For internal/admin use to improve the legal corpus systematically.
 */
import { NextResponse } from 'next/server'
import { getLawCoverageAudit } from '@/lib/law-coverage-audit'

export async function GET() {
  try {
    const audit = await getLawCoverageAudit()
    return NextResponse.json(audit)
  } catch (e) {
    console.error('Law coverage audit error:', e)
    return NextResponse.json(
      { error: 'Coverage audit çalıştırılamadı.' },
      { status: 500 }
    )
  }
}
