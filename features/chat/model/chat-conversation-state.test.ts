import { describe, expect, it } from 'vitest'
import {
  CHAT_CONVERSATION_STATE_VERSION,
  ChatConversationStateSchema,
  EMPTY_CHAT_CONVERSATION_STATE,
} from '@/features/chat/model/chat-conversation-state'

describe('ChatConversationStateSchema', () => {
  it('현재 버전의 빈 상태를 파싱한다', () => {
    const state = ChatConversationStateSchema.parse(
      EMPTY_CHAT_CONVERSATION_STATE,
    )

    expect(state.version).toBe(CHAT_CONVERSATION_STATE_VERSION)
    expect(state.pendingClarification).toBeNull()
  })

  it('지원하지 않는 상태 버전을 거부한다', () => {
    expect(() => {
      ChatConversationStateSchema.parse({
        ...EMPTY_CHAT_CONVERSATION_STATE,
        version: 2,
      })
    }).toThrow()
  })

  it('허용 개수를 넘는 필수 개념을 거부한다', () => {
    expect(() => {
      ChatConversationStateSchema.parse({
        ...EMPTY_CHAT_CONVERSATION_STATE,
        requiredConcepts: Array.from(
          { length: 9 },
          (_, conceptIndex) => `concept-${conceptIndex}`,
        ),
      })
    }).toThrow()
  })
})
