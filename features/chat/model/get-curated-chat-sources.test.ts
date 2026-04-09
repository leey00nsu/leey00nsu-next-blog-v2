import { describe, expect, it } from 'vitest'
import { getCuratedChatSources } from '@/features/chat/model/get-curated-chat-sources'

describe('getCuratedChatSources', () => {
  it('ko 로케일은 영어 프로필 참조 source도 함께 포함한다', async () => {
    const curatedChatSources = await getCuratedChatSources('ko')

    const englishProfileReferenceSource = curatedChatSources.find((source) => {
      return source.sourceCategory === 'profile' && source.url === '/en/about'
    })

    expect(englishProfileReferenceSource).toBeDefined()
    expect(englishProfileReferenceSource?.locale).toBe('ko')
    expect(englishProfileReferenceSource?.content).toContain('Yoonsu Lee')
    expect(englishProfileReferenceSource?.searchTerms).toEqual(
      expect.arrayContaining(['영어 이름', 'english name']),
    )
  })
})
