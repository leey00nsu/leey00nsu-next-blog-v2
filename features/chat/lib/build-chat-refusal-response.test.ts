import { describe, expect, it } from 'vitest'
import { buildChatRefusalResponse } from '@/features/chat/lib/build-chat-refusal-response'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

const REFUSAL_REASONS = [
  'insufficient_search_match',
  'insufficient_evidence',
  'invalid_citations',
  'missing_api_key',
  'model_error',
  'rate_limited',
  'question_too_long',
  'daily_limit_exceeded',
] as const satisfies Array<NonNullable<BlogChatResponse['refusalReason']>>

describe('buildChatRefusalResponse', () => {
  it('공개 근거가 없는 질문을 사용자에게 명확히 알린다', () => {
    expect(
      buildChatRefusalResponse({
        locale: 'ko',
        refusalReason: 'insufficient_search_match',
      }),
    ).toEqual({
      answer: '공개된 정보에서는 확인할 수 없어요.',
      citations: [],
      grounded: false,
      refusalReason: 'insufficient_search_match',
    })
  })

  it.each(['ko', 'en'] as const)(
    '%s의 모든 refusal reason에 비어 있지 않은 답변을 제공한다',
    (locale: SupportedLocale) => {
      for (const refusalReason of REFUSAL_REASONS) {
        const response = buildChatRefusalResponse({ locale, refusalReason })

        expect(response.answer.trim()).not.toBe('')
        expect(response.refusalReason).toBe(refusalReason)
        expect(response.grounded).toBe(false)
        expect(response.citations).toEqual([])
      }
    },
  )
})
