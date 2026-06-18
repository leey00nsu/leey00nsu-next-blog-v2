import { describe, expect, it } from 'vitest'
import { BlogChatRequestSchema } from './chat-schema'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'

describe('BlogChatRequestSchema', () => {
  it('질문 길이는 200자를 넘길 수 없다', () => {
    const result = BlogChatRequestSchema.safeParse({
      question: 'a'.repeat(201),
      locale: 'ko',
    })

    expect(result.success).toBe(false)
  })

  it('대화 상태가 없으면 빈 상태를 기본값으로 사용한다', () => {
    const result = BlogChatRequestSchema.parse({
      question: '안녕?',
      locale: 'ko',
    })

    expect(result.conversationState).toEqual(EMPTY_CHAT_CONVERSATION_STATE)
  })

  it('지원하지 않는 대화 상태 버전을 거부한다', () => {
    const result = BlogChatRequestSchema.safeParse({
      question: '안녕?',
      locale: 'ko',
      conversationState: {
        ...EMPTY_CHAT_CONVERSATION_STATE,
        version: 2,
      },
    })

    expect(result.success).toBe(false)
  })
})
