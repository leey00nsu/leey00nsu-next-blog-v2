import { describe, expect, it } from 'vitest'
import { areExactChatQuotesSupported } from '@/features/chat/lib/are-exact-chat-quotes-supported'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

const MATCH: ChatEvidenceRecord = {
  id: 'ko/blog/example',
  locale: 'ko',
  slug: 'example',
  title: '예시 글',
  url: '/ko/blog/example',
  excerpt: '공개된 연락 방법을 설명합니다.',
  content: '공개된 연락 방법을 설명합니다.',
  sectionTitle: null,
  tags: [],
  sourceCategory: 'blog',
}

describe('areExactChatQuotesSupported', () => {
  it('인용 문장의 실제 포함 여부를 묻는데 근거에 문장이 없으면 거절한다', () => {
    expect(areExactChatQuotesSupported({
      question: '‘전화번호 알려줘’라는 문장이 들어간 글이 있어?',
      matches: [MATCH],
    })).toBe(false)
  })

  it('인용 문장이 근거 본문에 있으면 허용한다', () => {
    expect(areExactChatQuotesSupported({
      question: '‘전화번호 알려줘’라는 문장이 들어간 글이 있어?',
      matches: [{ ...MATCH, content: '전화번호 알려줘 라는 표현을 예시로 들었습니다.' }],
    })).toBe(true)
  })

  it('인용 표현의 의미를 묻는 질문에는 정확한 문자열을 요구하지 않는다', () => {
    expect(areExactChatQuotesSupported({
      question: '‘프리사인 URL’이 무슨 뜻이야?',
      matches: [MATCH],
    })).toBe(true)
  })
})
