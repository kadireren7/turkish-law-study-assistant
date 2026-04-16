/**
 * Ingest / transform scriptleri için ortak log ve süre ölçümü.
 */

export type PipelineStep = 'fetch' | 'normalize' | 'split' | 'index' | 'validate' | 'write'

export function logPipelineEvent(
  source: string,
  step: PipelineStep,
  message: string,
  extra?: Record<string, unknown>
): void {
  const ts = new Date().toISOString()
  const base = `[pipeline] ${ts} [${source}] ${step}: ${message}`
  if (extra && Object.keys(extra).length) {
    console.log(base, extra)
  } else {
    console.log(base)
  }
}

export async function withTiming<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now()
  try {
    const out = await fn()
    console.log(`[pipeline] ${label} OK ${Date.now() - t0}ms`)
    return out
  } catch (e) {
    console.error(`[pipeline] ${label} FAIL ${Date.now() - t0}ms`, e)
    throw e
  }
}
