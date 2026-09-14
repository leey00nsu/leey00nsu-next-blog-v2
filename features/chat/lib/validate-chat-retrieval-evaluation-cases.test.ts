import { describe, expect, it } from 'vitest'
import {
  collectChatRetrievalCaseReferenceIssues,
  formatChatRetrievalCaseReferenceIssue,
} from '@/features/chat/lib/validate-chat-retrieval-evaluation-cases'
import type { SupportedLocale } from '@/shared/config/constants'

const CORPUS_URLS_BY_LOCALE = new Map<SupportedLocale, Set<string>>([
  ['ko', new Set(['/ko/blog/existing#section'])],
  ['en', new Set(['/en/blog/existing#section'])],
])

describe('collectChatRetrievalCaseReferenceIssues', () => {
  it('기대 근거가 코퍼스에 있으면 문제로 보지 않는다', () => {
    expect(
      collectChatRetrievalCaseReferenceIssues({
        cases: [
          {
            id: 'valid-case',
            locale: 'ko',
            expectedMatchUrls: ['/ko/blog/existing#section'],
          },
        ],
        corpusUrlsByLocale: CORPUS_URLS_BY_LOCALE,
      }),
    ).toEqual([])
  })

  it('코퍼스에 없는 기대 근거를 모아 돌려준다', () => {
    expect(
      collectChatRetrievalCaseReferenceIssues({
        cases: [
          {
            id: 'stale-case',
            locale: 'ko',
            expectedMatchUrls: ['/ko/blog/removed#solution'],
          },
        ],
        corpusUrlsByLocale: CORPUS_URLS_BY_LOCALE,
      }),
    ).toEqual([
      {
        caseId: 'stale-case',
        expectedMatchUrl: '/ko/blog/removed#solution',
      },
    ])
  })

  it('다른 로케일의 근거를 기대하면 문제로 본다', () => {
    expect(
      collectChatRetrievalCaseReferenceIssues({
        cases: [
          {
            id: 'wrong-locale-case',
            locale: 'en',
            expectedMatchUrls: ['/ko/blog/existing#section'],
          },
        ],
        corpusUrlsByLocale: CORPUS_URLS_BY_LOCALE,
      }),
    ).toHaveLength(1)
  })
})

describe('formatChatRetrievalCaseReferenceIssue', () => {
  it('케이스 id와 기대 근거를 한 줄로 설명한다', () => {
    expect(
      formatChatRetrievalCaseReferenceIssue({
        caseId: 'stale-case',
        expectedMatchUrl: '/ko/blog/removed#solution',
      }),
    ).toBe('stale-case: 코퍼스에 없는 기대 근거 /ko/blog/removed#solution')
  })
})
