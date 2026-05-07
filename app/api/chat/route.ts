import { NextRequest, NextResponse } from 'next/server'
import { answerBlogChatQuestion } from '@/features/chat/model/answer-blog-chat-question'

export const runtime = 'nodejs'

const CHAT_ROUTE = {
  UNEXPECTED_ERROR_MESSAGE:
    '답변을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
} as const

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const result = await answerBlogChatQuestion({
      requestBody,
      requestHeaders: request.headers,
    })

    return NextResponse.json(result.body, {
      status: result.status,
    })
  } catch {
    return NextResponse.json(
      {
        error: CHAT_ROUTE.UNEXPECTED_ERROR_MESSAGE,
      },
      { status: 500 },
    )
  }
}
