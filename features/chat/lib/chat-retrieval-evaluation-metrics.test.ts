import { describe, expect, it } from 'vitest'
import {
  evaluateChatRetrievalCase,
  summarizeChatRetrievalEvaluation,
  type ChatRetrievalCaseOutcome,
} from '@/features/chat/lib/chat-retrieval-evaluation-metrics'

const EXPECTED_URLS = ['/ko/blog/target#section']

function buildOutcome(
  overrides: Partial<ChatRetrievalCaseOutcome>,
): ChatRetrievalCaseOutcome {
  return {
    id: 'case',
    refused: false,
    matchUrls: EXPECTED_URLS,
    expectedMatchUrls: EXPECTED_URLS,
    expectRefusal: false,
    ...overrides,
  }
}

describe('evaluateChatRetrievalCase', () => {
  it('1순위로 기대 근거를 찾으면 recall과 순위 지표가 모두 최상이다', () => {
    expect(evaluateChatRetrievalCase(buildOutcome({}))).toMatchObject({
      recallAtOne: true,
      recallAtThree: true,
      reciprocalRank: 1,
      refusalCorrect: null,
    })
  })

  it('3순위로 밀리면 recall@1만 실패로 기록한다', () => {
    expect(
      evaluateChatRetrievalCase(
        buildOutcome({
          matchUrls: ['/ko/blog/other-1', '/ko/blog/other-2', ...EXPECTED_URLS],
        }),
      ),
    ).toMatchObject({
      recallAtOne: false,
      recallAtThree: true,
      reciprocalRank: 1 / 3,
    })
  })

  it('상위 3건 밖으로 밀리면 recall@3도 실패다', () => {
    expect(
      evaluateChatRetrievalCase(
        buildOutcome({
          matchUrls: [
            '/ko/blog/other-1',
            '/ko/blog/other-2',
            '/ko/blog/other-3',
            ...EXPECTED_URLS,
          ],
        }),
      ),
    ).toMatchObject({
      recallAtOne: false,
      recallAtThree: false,
      reciprocalRank: 0.25,
    })
  })

  it('기대 근거를 아예 찾지 못하면 순위가 0이다', () => {
    expect(
      evaluateChatRetrievalCase(
        buildOutcome({ matchUrls: ['/ko/blog/other-1'] }),
      ),
    ).toMatchObject({
      recallAtOne: false,
      recallAtThree: false,
      reciprocalRank: 0,
    })
  })

  it('거부를 기대한 케이스는 거부 여부만 본다', () => {
    expect(
      evaluateChatRetrievalCase(
        buildOutcome({
          refused: true,
          matchUrls: [],
          expectedMatchUrls: [],
          expectRefusal: true,
        }),
      ),
    ).toMatchObject({
      recallAtOne: null,
      recallAtThree: null,
      reciprocalRank: null,
      refusalCorrect: true,
    })
  })

  it('거부를 기대했는데 근거를 반환하면 실패로 기록한다', () => {
    expect(
      evaluateChatRetrievalCase(
        buildOutcome({
          refused: false,
          matchUrls: ['/ko/blog/other-1'],
          expectedMatchUrls: [],
          expectRefusal: true,
        }),
      ),
    ).toMatchObject({ refusalCorrect: false })
  })
})

describe('summarizeChatRetrievalEvaluation', () => {
  it('지표를 모아 계산하고 실패 케이스를 모은다', () => {
    const summary = summarizeChatRetrievalEvaluation({
      results: [
        evaluateChatRetrievalCase(buildOutcome({ id: 'hit-first' })),
        evaluateChatRetrievalCase(
          buildOutcome({
            id: 'hit-third',
            matchUrls: [
              '/ko/blog/other-1',
              '/ko/blog/other-2',
              ...EXPECTED_URLS,
            ],
          }),
        ),
        evaluateChatRetrievalCase(
          buildOutcome({ id: 'miss', matchUrls: ['/ko/blog/other-1'] }),
        ),
        evaluateChatRetrievalCase(
          buildOutcome({
            id: 'refusal',
            refused: true,
            matchUrls: [],
            expectedMatchUrls: [],
            expectRefusal: true,
          }),
        ),
      ],
      maximumFailedCaseCount: 0,
    })

    expect(summary).toMatchObject({
      totalCaseCount: 4,
      positiveCaseCount: 3,
      refusalCaseCount: 1,
      recallAtOne: 1 / 3,
      recallAtThree: 2 / 3,
      refusalAccuracy: 1,
      failedCaseIds: ['miss'],
      passed: false,
    })
    expect(summary.meanReciprocalRank).toBeCloseTo((1 + 1 / 3 + 0) / 3)
  })

  it('허용 실패 수 이하면 통과로 본다', () => {
    const results = [
      evaluateChatRetrievalCase(
        buildOutcome({ id: 'miss', matchUrls: ['/ko/blog/other-1'] }),
      ),
    ]

    expect(
      summarizeChatRetrievalEvaluation({
        results,
        maximumFailedCaseCount: 0,
      }).passed,
    ).toBe(false)
    expect(
      summarizeChatRetrievalEvaluation({
        results,
        maximumFailedCaseCount: 1,
      }).passed,
    ).toBe(true)
  })

  it('3순위 안에 든 케이스는 실패로 보지 않는다', () => {
    const summary = summarizeChatRetrievalEvaluation({
      results: [
        evaluateChatRetrievalCase(
          buildOutcome({
            id: 'hit-third',
            matchUrls: [
              '/ko/blog/other-1',
              '/ko/blog/other-2',
              ...EXPECTED_URLS,
            ],
          }),
        ),
      ],
      maximumFailedCaseCount: 0,
    })

    expect(summary.failedCaseIds).toEqual([])
    expect(summary.passed).toBe(true)
    expect(summary.recallAtOne).toBe(0)
  })
})
