import { describe, expect, it } from 'vitest'
import { getChatAssistantProfile } from '@/features/chat/model/get-chat-assistant-profile'

describe('getChatAssistantProfile', () => {
  it('한국어 assistant 내부 MDX를 읽어 온다', () => {
    const result = getChatAssistantProfile('ko')

    expect(result).not.toBeNull()
    expect(result?.ownerName).toBe('이윤수')
    expect(result?.chatbotName).toBe('블로그 챗봇')
    expect(result?.identityAnswer).toContain('이윤수 님의 챗봇')
  })
})
