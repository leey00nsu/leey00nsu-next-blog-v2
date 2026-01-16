import OpenAI from 'openai'
import {
  type AITextAction,
  AI_TEXT_PROMPTS,
  AI_TEXT_ACTIONS,
  wrapUserTextForAI,
} from '@/features/editor/config/constants'

export interface TransformTextParams {
  text: string
  action: AITextAction
  targetLocale?: string
}

export interface TransformTextResult {
  ok: boolean
  text?: string
  error?: string
}

/**
 * OpenAI를 사용하여 텍스트를 변환합니다.
 * 프롬프트 인젝션 방지를 위해 사용자 텍스트를 안전하게 래핑합니다.
 *
 * @param params - 변환 파라미터
 * @returns 변환 결과
 */
export async function transformTextWithOpenAI({
  text,
  action,
  targetLocale,
}: TransformTextParams): Promise<TransformTextResult> {
  if (!text.trim()) {
    return { ok: false, error: '텍스트가 비어있습니다.' }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'Missing OPENAI_API_KEY' }
  }

  const client = new OpenAI({ apiKey })

  // 번역 액션의 경우 타겟 언어를 프롬프트에 추가
  let systemPrompt = AI_TEXT_PROMPTS[action]
  if (action === AI_TEXT_ACTIONS.TRANSLATE && targetLocale) {
    systemPrompt = `${systemPrompt} Target language: ${targetLocale}.`
  }

  // 프롬프트 인젝션 방지를 위해 사용자 텍스트를 안전하게 래핑
  const wrappedUserText = wrapUserTextForAI(text)

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_EDITOR_MODEL ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: wrappedUserText },
      ],
    })

    const content = response.choices?.[0]?.message?.content
    if (!content) {
      return { ok: false, error: 'No content from OpenAI' }
    }

    return { ok: true, text: content }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { ok: false, error: message }
  }
}
