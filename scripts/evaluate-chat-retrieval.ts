import {
  CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS,
  CHAT_RETRIEVAL_EVALUATION_CASES,
  CHAT_RETRIEVAL_EVALUATION_CONTACT_PROFILE,
  CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS,
} from '@/features/chat/fixtures/chat-retrieval-evaluation'
import { fuseChatRetrievalMatches } from '@/features/chat/lib/chat-retrieval-fusion'
import { analyzeQuestion } from '@/features/chat/lib/question-analysis'
import { resolveChatRequest } from '@/features/chat/lib/resolve-chat-request'

function collectPreferredSourceCategories(question: string, locale: 'ko' | 'en') {
  const questionAnalysis = analyzeQuestion(question, locale)

  return [
    ...new Set(
      questionAnalysis.searchQueries.flatMap((searchQuery) => {
        return searchQuery.preferredSourceCategories
      }),
    ),
  ]
}

function buildReciprocalRank(matchUrls: string[], expectedMatchUrls: string[]): number {
  for (const expectedMatchUrl of expectedMatchUrls) {
    const foundIndex = matchUrls.indexOf(expectedMatchUrl)

    if (foundIndex !== -1) {
      return 1 / (foundIndex + 1)
    }
  }

  return 0
}

const results = CHAT_RETRIEVAL_EVALUATION_CASES.map((evaluationCase) => {
  const questionAnalysis = analyzeQuestion(
    evaluationCase.question,
    evaluationCase.locale,
  )
  const lexicalResult = resolveChatRequest({
    question: evaluationCase.question,
    locale: evaluationCase.locale,
    blogRecords: CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS,
    curatedRecords: CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS,
    currentPostSlug: evaluationCase.currentPostSlug,
    questionAnalysis,
    contactProfile: CHAT_RETRIEVAL_EVALUATION_CONTACT_PROFILE,
    questionRouting: evaluationCase.questionRouting,
  })
  const fusedMatches = fuseChatRetrievalMatches({
    lexicalMatches: lexicalResult.matches,
    semanticMatches: evaluationCase.semanticMatches,
    preferredSourceCategories: collectPreferredSourceCategories(
      evaluationCase.question,
      evaluationCase.locale,
    ),
    currentPostSlug: evaluationCase.currentPostSlug,
  })
  const matchUrls = fusedMatches.map((match) => match.url)
  const expectedMatchUrls =
    evaluationCase.expectedMatchUrls ??
    (evaluationCase.expectedTopMatchUrl
      ? [evaluationCase.expectedTopMatchUrl]
      : [])
  const recallAt1 = expectedMatchUrls.some((expectedMatchUrl) => {
    return matchUrls.slice(0, 1).includes(expectedMatchUrl)
  })
  const recallAt3 = expectedMatchUrls.some((expectedMatchUrl) => {
    return matchUrls.slice(0, 3).includes(expectedMatchUrl)
  })
  const recallAt5 = expectedMatchUrls.some((expectedMatchUrl) => {
    return matchUrls.slice(0, 5).includes(expectedMatchUrl)
  })

  return {
    id: evaluationCase.id,
    question: evaluationCase.question,
    matchUrls,
    expectedMatchUrls,
    recallAt1,
    recallAt3,
    recallAt5,
    reciprocalRank: buildReciprocalRank(matchUrls, expectedMatchUrls),
  }
})

const totalCaseCount = results.length
const recallAt1 =
  results.filter((result) => result.recallAt1).length / totalCaseCount
const recallAt3 =
  results.filter((result) => result.recallAt3).length / totalCaseCount
const recallAt5 =
  results.filter((result) => result.recallAt5).length / totalCaseCount
const meanReciprocalRank =
  results.reduce((sum, result) => {
    return sum + result.reciprocalRank
  }, 0) / totalCaseCount

console.log(
  JSON.stringify(
    {
      summary: {
        totalCaseCount,
        recallAt1,
        recallAt3,
        recallAt5,
        meanReciprocalRank,
      },
      failures: results.filter((result) => !result.recallAt3),
    },
    null,
    2,
  ),
)
