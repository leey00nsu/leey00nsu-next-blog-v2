import { describe, expect, it } from 'vitest'
import {
  CHAT_CONVERSATION_STATE_VERSION,
  ChatConversationStateSchema,
  EMPTY_CHAT_CONVERSATION_STATE,
} from '@/features/chat/model/chat-conversation-state'

describe('ChatConversationStateSchema', () => {
  it('version 2 최소 상태를 파싱한다', () => {
    const state = ChatConversationStateSchema.parse(
      EMPTY_CHAT_CONVERSATION_STATE,
    )

    expect(state).toEqual({
      version: 2,
      focusedTarget: null,
      lastQueryPlan: null,
      pendingClarification: null,
    })
    expect(CHAT_CONVERSATION_STATE_VERSION).toBe(2)
  })

  it('구 version 1 상태를 거부한다', () => {
    expect(() => {
      ChatConversationStateSchema.parse({
        ...EMPTY_CHAT_CONVERSATION_STATE,
        version: 1,
      })
    }).toThrow()
  })
})
