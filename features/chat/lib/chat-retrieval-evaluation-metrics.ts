export interface ChatRetrievalCaseOutcome {
  id: string
  refused: boolean
  matchUrls: string[]
  expectedMatchUrls: string[]
  expectRefusal: boolean
}

export interface ChatRetrievalCaseResult {
  id: string
  matchUrls: string[]
  expectedMatchUrls: string[]
  recallAtOne: boolean | null
  recallAtThree: boolean | null
  reciprocalRank: number | null
  refusalCorrect: boolean | null
}

export interface ChatRetrievalEvaluationSummary {
  totalCaseCount: number
  positiveCaseCount: number
  refusalCaseCount: number
  recallAtOne: number
  recallAtThree: number
  meanReciprocalRank: number
  refusalAccuracy: number
  failedCaseIds: string[]
  passed: boolean
}

export const CHAT_RETRIEVAL_RECALL_WINDOWS = {
  AT_ONE: 1,
  AT_THREE: 3,
} as const

function hasExpectedMatchWithinTop(params: {
  matchUrls: string[]
  expectedMatchUrls: string[]
  maximumMatchCount: number
}): boolean {
  const topMatchUrlSet = new Set(
    params.matchUrls.slice(0, params.maximumMatchCount),
  )

  return params.expectedMatchUrls.some((expectedMatchUrl) => {
    return topMatchUrlSet.has(expectedMatchUrl)
  })
}

function calcReciprocalRank(params: {
  matchUrls: string[]
  expectedMatchUrls: string[]
}): number {
  const firstRelevantMatchIndex = params.matchUrls.findIndex((matchUrl) => {
    return params.expectedMatchUrls.includes(matchUrl)
  })

  return firstRelevantMatchIndex === -1 ? 0 : 1 / (firstRelevantMatchIndex + 1)
}

function calcRate(values: boolean[]): number {
  if (values.length === 0) {
    return 0
  }

  return values.filter(Boolean).length / values.length
}

function isFailedCase(result: ChatRetrievalCaseResult): boolean {
  // 답변 모델은 상위 3건을 근거 컨텍스트로 받는다. 기대 근거가 그 안에 없으면 근거를 놓친 것으로 본다.
  // recall@1과 MRR은 순위 품질을 보여주는 지표로만 남기고 통과 여부에는 쓰지 않는다.
  return result.recallAtThree === false || result.refusalCorrect === false
}

export function evaluateChatRetrievalCase(
  outcome: ChatRetrievalCaseOutcome,
): ChatRetrievalCaseResult {
  if (outcome.expectRefusal) {
    return {
      id: outcome.id,
      matchUrls: outcome.matchUrls,
      expectedMatchUrls: outcome.expectedMatchUrls,
      recallAtOne: null,
      recallAtThree: null,
      reciprocalRank: null,
      refusalCorrect: outcome.refused,
    }
  }

  return {
    id: outcome.id,
    matchUrls: outcome.matchUrls,
    expectedMatchUrls: outcome.expectedMatchUrls,
    recallAtOne: hasExpectedMatchWithinTop({
      matchUrls: outcome.matchUrls,
      expectedMatchUrls: outcome.expectedMatchUrls,
      maximumMatchCount: CHAT_RETRIEVAL_RECALL_WINDOWS.AT_ONE,
    }),
    recallAtThree: hasExpectedMatchWithinTop({
      matchUrls: outcome.matchUrls,
      expectedMatchUrls: outcome.expectedMatchUrls,
      maximumMatchCount: CHAT_RETRIEVAL_RECALL_WINDOWS.AT_THREE,
    }),
    reciprocalRank: calcReciprocalRank({
      matchUrls: outcome.matchUrls,
      expectedMatchUrls: outcome.expectedMatchUrls,
    }),
    refusalCorrect: null,
  }
}

export function summarizeChatRetrievalEvaluation(params: {
  results: ChatRetrievalCaseResult[]
  maximumFailedCaseCount: number
}): ChatRetrievalEvaluationSummary {
  const positiveResults = params.results.filter((result) => {
    return result.reciprocalRank !== null
  })
  const refusalResults = params.results.filter((result) => {
    return result.refusalCorrect !== null
  })
  const failedCaseIds = params.results
    .filter((result) => {
      return isFailedCase(result)
    })
    .map((result) => result.id)

  return {
    totalCaseCount: params.results.length,
    positiveCaseCount: positiveResults.length,
    refusalCaseCount: refusalResults.length,
    recallAtOne: calcRate(
      positiveResults.map((result) => {
        return result.recallAtOne ?? false
      }),
    ),
    recallAtThree: calcRate(
      positiveResults.map((result) => {
        return result.recallAtThree ?? false
      }),
    ),
    meanReciprocalRank:
      positiveResults.reduce((totalRank, result) => {
        return totalRank + (result.reciprocalRank ?? 0)
      }, 0) / (positiveResults.length || 1),
    refusalAccuracy: calcRate(
      refusalResults.map((result) => {
        return result.refusalCorrect ?? false
      }),
    ),
    failedCaseIds,
    passed: failedCaseIds.length <= params.maximumFailedCaseCount,
  }
}
