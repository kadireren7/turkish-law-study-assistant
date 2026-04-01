import { NextResponse } from 'next/server'

export type ApiMeta = {
  requestId: string
  latencyMs: number
}

export type ApiSuccess<T> = {
  ok: true
  data: T
  meta: ApiMeta
}

export type ApiError = {
  ok: false
  error: string
  meta: ApiMeta
}

export function createRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function ok<T>(data: T, requestId: string, startedAt: number, status: number = 200) {
  const payload: ApiSuccess<T> = {
    ok: true,
    data,
    meta: {
      requestId,
      latencyMs: Date.now() - startedAt,
    },
  }
  return NextResponse.json(payload, { status })
}

export function err(message: string, requestId: string, startedAt: number, status: number = 400) {
  const payload: ApiError = {
    ok: false,
    error: message,
    meta: {
      requestId,
      latencyMs: Date.now() - startedAt,
    },
  }
  return NextResponse.json(payload, { status })
}

