import { NextResponse } from 'next/server'
import { transformTextWithOpenAI } from '@/features/editor/api/transform-text'
import {
  AI_TEXT_ACTIONS,
  type AITextAction,
} from '@/features/editor/config/constants'

export const runtime = 'nodejs'

const VALID_ACTIONS = new Set(Object.values(AI_TEXT_ACTIONS))

interface TransformRequestBody {
  text: string
  action: string
  targetLocale?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TransformRequestBody
    const { text, action, targetLocale } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { ok: false, error: '텍스트가 필요합니다.' },
        { status: 400 },
      )
    }

    if (!action || !VALID_ACTIONS.has(action as AITextAction)) {
      return NextResponse.json(
        { ok: false, error: '유효하지 않은 액션입니다.' },
        { status: 400 },
      )
    }

    const result = await transformTextWithOpenAI({
      text,
      action: action as AITextAction,
      targetLocale,
    })

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, text: result.text })
  } catch (error) {
    console.error('Transform API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
