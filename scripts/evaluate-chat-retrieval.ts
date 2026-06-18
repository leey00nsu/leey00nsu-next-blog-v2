import {
  CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS,
  CHAT_RETRIEVAL_EVALUATION_CASES,
  CHAT_RETRIEVAL_EVALUATION_CONTACT_PROFILE,
  CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS,
} from '@/features/chat/fixtures/chat-retrieval-evaluation'
import { resolveChatIntentRequest } from '@/features/chat/lib/resolve-chat-intent-request'
import { resolveChatEvidenceScope } from '@/features/chat/lib/chat-retrieval-scope'
import { selectFinalChatEvidence } from '@/features/chat/lib/select-final-chat-evidence'

function buildReciprocalRank(
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

const results = CHAT_RETRIEVAL_EVALUATION_CASES.map((evaluationCase) => {
  const lexicalResult = resolveChatIntentRequest({
    intent: evaluationCase.intent,
    locale: evaluationCase.locale,
    blogRecords: CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS,
    curatedRecords: CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS,
    currentPostSlug: evaluationCase.currentPostSlug,
    contactProfile: CHAT_RETRIEVAL_EVALUATION_CONTACT_PROFILE,
  })
  const evidenceScope = resolveChatEvidenceScope({
    intent: evaluationCase.intent,
    currentPostSlug: evaluationCase.currentPostSlug,
  })
  const finalMatches = selectFinalChatEvidence({
    question: evaluationCase.intent.standaloneQuestion,
    locale: evaluationCase.locale,
    intent: evaluationCase.intent,
    evidenceScope,
    lexicalMatches: lexicalResult.matches,
    semanticMatches: evaluationCase.semanticMatches,
  })
  const matchUrls = finalMatches.map((match) => match.url)
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
    question: evaluationCase.intent.standaloneQuestion,
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
