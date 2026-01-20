import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { requireAuth } from '@/shared/lib/auth/require-auth'

/**
 * 미리보기 세션 저장소 (메모리 기반)
 *
 * 프로덕션에서 다중 인스턴스 환경을 사용하는 경우
 * Redis 등 외부 저장소로 전환 필요
 */

interface PreviewSession {
  content: string
  title: string
  description: string
  writer: string
  date: string
  tags: string[]
  pendingImages: Record<string, string> // path -> base64 data URL
  createdAt: number
}

const previewSessions = new Map<string, PreviewSession>()
const SESSION_TTL_MILLISECONDS = 5 * 60 * 1000 // 5분

/**
 * 만료된 세션 정리
 */
function cleanupExpiredSessions() {
  const now = Date.now()
  for (const [id, session] of previewSessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MILLISECONDS) {
      previewSessions.delete(id)
    }
  }
}

/**
 * 미리보기 데이터 저장 스키마
 */
const previewRequestSchema = z.object({
  content: z.string(),
  title: z.string(),
  description: z.string().optional().default(''),
  writer: z.string().optional().default(''),
  date: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  pendingImages: z.record(z.string(), z.string()).optional().default({}),
})

/**
 * POST: 미리보기 데이터 저장 및 ID 발급
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.authorized) return authResult.response

  try {
    const body = await request.json()
    const parsed = previewRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다.', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // 만료 세션 정리
    cleanupExpiredSessions()

    const previewId = randomUUID()
    const session: PreviewSession = {
      content: parsed.data.content,
      title: parsed.data.title,
      description: parsed.data.description,
      writer: parsed.data.writer,
      date: parsed.data.date,
      tags: parsed.data.tags,
      pendingImages: parsed.data.pendingImages,
      createdAt: Date.now(),
    }

    previewSessions.set(previewId, session)

    return NextResponse.json({ id: previewId })
  } catch {
    return NextResponse.json(
      { error: '미리보기 데이터 저장 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}

/**
 * GET: 저장된 미리보기 데이터 조회
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.authorized) return authResult.response

  const { searchParams } = new URL(request.url)
  const previewId = searchParams.get('id')

  if (!previewId) {
    return NextResponse.json(
      { error: '미리보기 ID가 필요합니다.' },
      { status: 400 },
    )
  }

  // 만료 세션 정리
  cleanupExpiredSessions()

  const session = previewSessions.get(previewId)

  if (!session) {
    return NextResponse.json(
      { error: '미리보기 데이터를 찾을 수 없거나 만료되었습니다.' },
      { status: 404 },
    )
  }

  return NextResponse.json({
    content: session.content,
    title: session.title,
    description: session.description,
    writer: session.writer,
    date: session.date,
    tags: session.tags,
    pendingImages: session.pendingImages,
  })
}
