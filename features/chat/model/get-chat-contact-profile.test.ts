import { describe, expect, it } from 'vitest'
import { getChatContactProfile } from '@/features/chat/model/get-chat-contact-profile'

describe('getChatContactProfile', () => {
  it('소개 페이지의 공개 연락 채널을 추출한다', () => {
    const contactProfile = getChatContactProfile('ko')

    expect(contactProfile).not.toBeNull()
    expect(contactProfile?.aboutUrl).toBe('/ko/about')
    expect(contactProfile?.methods).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'GitHub',
          url: 'https://github.com/leey00nsu',
        }),
        expect.objectContaining({
          label: 'LinkedIn',
          url: 'https://www.linkedin.com/in/leey00nsu',
        }),
      ]),
    )
  })
})
