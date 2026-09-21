import { describe, expect, it } from 'vitest'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import { validateChatCitations } from '@/features/chat/lib/validate-chat-citations'

const MATCHES: ChatEvidenceRecord[] = [
  {
    id: 'profile',
    locale: 'ko',
    slug: 'about',
    title: 'About Me',
    url: '/ko/about',
    excerpt: '소개',
    content: '소개',
    sectionTitle: null,
    tags: ['profile'],
    sourceCategory: 'profile',
  },
  {
    id: 'assistant-profile',
    locale: 'ko',
    slug: 'assistant-profile',
    title: '블로그 챗봇 안내',
    url: 'curated/ko/assistant/profile/응답-원칙',
    excerpt: '응답 원칙',
    content: '항상 챗봇으로서 답합니다.',
    sectionTitle: '응답 원칙',
    tags: ['assistant'],
    sourceCategory: 'assistant',
  },
]

describe('validateChatCitations', () => {
  it('검색 근거에 포함된 URL만 citation으로 변환한다', () => {
    expect(
      validateChatCitations({
        usedCitationUrls: ['/ko/about'],
        matches: MATCHES,
      }),
    ).toEqual([
      {
        title: 'About Me',
        url: '/ko/about',
        sectionTitle: null,
        sourceCategory: 'profile',
      },
    ])
  })

  it('검색 근거에 없는 URL은 citation에서 제외한다', () => {
    expect(
      validateChatCitations({
        usedCitationUrls: ['/ko/about', '/ko/private'],
        matches: MATCHES,
      }),
    ).toHaveLength(1)
  })

  it('내부 assistant 근거는 citation으로 변환하지 않는다', () => {
    expect(
      validateChatCitations({
        usedCitationUrls: ['curated/ko/assistant/profile/응답-원칙'],
        matches: MATCHES,
      }),
    ).toEqual([])
  })
})
