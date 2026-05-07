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
})
