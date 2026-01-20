import { auth } from '@/features/auth/lib/auth'
import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'

export type AuthResult =
  | { authorized: true; session: Session | null }
  | { authorized: false; response: NextResponse }

/**
 * API 라우트에서 인증을 확인하는 유틸리티
 *
 * @example
 * export async function POST(req: Request) {
 *   const authResult = await requireAuth()
 *   if (!authResult.authorized) return authResult.response
 *   // 인증된 사용자만 접근 가능
 * }
 */
export async function requireAuth(): Promise<AuthResult> {
  // 개발 편의를 위한 인증 우회 (SKIP_AUTH=true)
  if (process.env.SKIP_AUTH === 'true') {
    return { authorized: true, session: null }
  }

  const session = await auth()

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { authorized: true, session }
}
