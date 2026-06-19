import {
  CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS,
  CHAT_RETRIEVAL_EVALUATION_CASES,
  CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS,
} from '@/features/chat/fixtures/chat-retrieval-evaluation'
import { executeChatRetrievalPlan } from '@/features/chat/model/execute-chat-retrieval-plan'

function calcReciprocalRank(
  matchUrls: string[],
  expectedMatchUrls: string[],
): number {
  for (const expectedMatchUrl of expectedMatchUrls) {
    const foundIndex = matchUrls.indexOf(expectedMatchUrl)

    if (foundIndex !== -1) {
      return 1 / (foundIndex + 1)
    }
  }

  return 0
}

async function evaluateChatRetrieval() {
  const results = await Promise.all(
    CHAT_RETRIEVAL_EVALUATION_CASES.map(async (evaluationCase) => {
    const execution = await executeChatRetrievalPlan({
      plan: evaluationCase.retrievalPlan,
      locale: evaluationCase.locale,
      blogRecords: CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS,
      curatedRecords: CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS,
      retrieveSemanticMatches: async () => evaluationCase.semanticMatches,
    })
    const matchUrls = execution.matches.map((match) => match.url)
    const expectedMatchUrls =
      evaluationCase.expectedMatchUrls ??
      (evaluationCase.expectedTopMatchUrl
        ? [evaluationCase.expectedTopMatchUrl]
        : [])
    const recalls = [1, 3, 5].map((maximumMatchCount) => {
      return expectedMatchUrls.some((expectedMatchUrl) => {
        return matchUrls
          .slice(0, maximumMatchCount)
          .includes(expectedMatchUrl)
      })
    })

    return {
      id: evaluationCase.id,
      question: evaluationCase.retrievalPlan.standaloneQuestion,
      matchUrls,
      expectedMatchUrls,
      recallAt1: recalls[0],
      recallAt3: recalls[1],
      recallAt5: recalls[2],
      reciprocalRank: calcReciprocalRank(matchUrls, expectedMatchUrls),
    }
    }),
  )
  const totalCaseCount = results.length

  console.log(
    JSON.stringify(
      {
        summary: {
          totalCaseCount,
          recallAt1:
            results.filter((result) => result.recallAt1).length /
            totalCaseCount,
          recallAt3:
            results.filter((result) => result.recallAt3).length /
            totalCaseCount,
          recallAt5:
            results.filter((result) => result.recallAt5).length /
            totalCaseCount,
          meanReciprocalRank:
            results.reduce((sum, result) => {
              return sum + result.reciprocalRank
            }, 0) / totalCaseCount,
        },
        failures: results.filter((result) => !result.recallAt3),
      },
      null,
      2,
    ),
  )
}

// tsx loads this package as CommonJS, where top-level await is unavailable.
// eslint-disable-next-line unicorn/prefer-top-level-await
void evaluateChatRetrieval()
