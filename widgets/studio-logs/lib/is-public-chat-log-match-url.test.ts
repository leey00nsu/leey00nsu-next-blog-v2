import { describe, expect, it } from 'vitest'
import { isPublicChatLogMatchUrl } from '@/widgets/studio-logs/lib/is-public-chat-log-match-url'

describe('isPublicChatLogMatchUrl', () => {
  it('내부 assistant 출처는 링크로 표시하지 않는다', () => {
    expect(
      isPublicChatLogMatchUrl({
        url: 'curated/ko/assistant/profile',
        title: '블로그 챗봇 안내',
        sourceCategory: 'assistant',
      }),
    ).toBe(false)
  })

  it('공개 페이지와 외부 HTTPS 출처는 링크로 표시한다', () => {
    expect(
      isPublicChatLogMatchUrl({
        url: '/ko/blog/chat',
        title: '챗봇 글',
        sourceCategory: 'blog',
      }),
    ).toBe(true)
    expect(
      isPublicChatLogMatchUrl({
        url: 'https://example.com/project',
        title: '프로젝트',
        sourceCategory: 'project',
      }),
    ).toBe(true)
  })

  it('상대 경로, 프로토콜 상대 URL, 실행 가능한 URL은 링크로 표시하지 않는다', () => {
    for (const url of [
      'curated/ko/profile',
      '//example.com',
      'javascript:alert(1)',
    ]) {
      expect(
        isPublicChatLogMatchUrl({
          url,
          title: '출처',
          sourceCategory: 'profile',
        }),
      ).toBe(false)
    }
  })
})
