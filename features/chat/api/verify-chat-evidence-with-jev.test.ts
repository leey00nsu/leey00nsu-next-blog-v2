import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const systemOneMock = vi.fn()

vi.mock('@typesafe-ai/sdk', () => ({
  TypeSafeClient: class {
    systemOne = systemOneMock
  },
}))

const MATCH = {
  id: 'ko/blog/example',
  locale: 'ko' as const,
  slug: 'example',
  title: 'Example',
  url: '/ko/blog/example',
  excerpt: 'Example evidence',
  content: 'Example evidence',
  sectionTitle: null,
  tags: [],
  sourceCategory: 'blog' as const,
}

describe('verifyChatEvidenceWithJev', () => {
  beforeEach(() => {
    systemOneMock.mockReset()
    process.env.TYPESAFE_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.TYPESAFE_API_KEY
  })

  it('관련 없는 의미 검색 근거를 거절한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: { supportsAnswer: { noul: 0.1 } },
    })
    const { verifyChatEvidenceWithJev } = await import('./verify-chat-evidence-with-jev')

    expect(await verifyChatEvidenceWithJev({
      question: '다른 프로젝트 설명해줘',
      matches: [MATCH],
    })).toBe(false)
  })

  it('의미상 직접 관련된 근거를 허용한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: { supportsAnswer: { noul: 0.9 } },
    })
    const { verifyChatEvidenceWithJev } = await import('./verify-chat-evidence-with-jev')

    expect(await verifyChatEvidenceWithJev({
      question: 'Example 설명해줘',
      matches: [MATCH],
    })).toBe(true)
  })
})
