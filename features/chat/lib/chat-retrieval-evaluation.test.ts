import { describe, expect, it } from 'vitest'
import {
  CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS,
  CHAT_RETRIEVAL_EVALUATION_CASES,
  CHAT_RETRIEVAL_EVALUATION_CONTACT_PROFILE,
  CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS,
  type ChatRetrievalEvaluationCase,
} from '@/features/chat/fixtures/chat-retrieval-evaluation'
import { fuseChatRetrievalMatches } from '@/features/chat/lib/chat-retrieval-fusion'
import { analyzeQuestion } from '@/features/chat/lib/question-analysis'
import { resolveChatRequest } from '@/features/chat/lib/resolve-chat-request'

function shouldRunHybridRetrieval(
  evaluationCase: ChatRetrievalEvaluationCase,
): boolean {
  return (
    evaluationCase.questionRouting.selector === 'retrieval' ||
    evaluationCase.questionRouting.selector === 'corpus'
  )
}

function collectPreferredSourceCategories(
  evaluationCase: ChatRetrievalEvaluationCase,
) {
  const questionAnalysis = analyzeQuestion(
    evaluationCase.question,
    evaluationCase.locale,
  )

  return [
    ...new Set(
      questionAnalysis.searchQueries.flatMap((searchQuery) => {
        return searchQuery.preferredSourceCategories
      }),
    ),
  ]
}

describe('chat retrieval evaluation', () => {
  for (const evaluationCase of CHAT_RETRIEVAL_EVALUATION_CASES) {
    it(`${evaluationCase.id} 질문을 기대한 근거 문서로 연결한다`, () => {
      const questionAnalysis = analyzeQuestion(
        evaluationCase.question,
        evaluationCase.locale,
      )
      const resolvedChatRequest = resolveChatRequest({
        question: evaluationCase.question,
        locale: evaluationCase.locale,
        blogRecords: CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS,
        curatedRecords: CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS,
        currentPostSlug: evaluationCase.currentPostSlug,
        questionAnalysis,
        contactProfile: CHAT_RETRIEVAL_EVALUATION_CONTACT_PROFILE,
        questionRouting: evaluationCase.questionRouting,
      })
      const combinedMatches = shouldRunHybridRetrieval(evaluationCase)
        ? fuseChatRetrievalMatches({
            lexicalMatches: resolvedChatRequest.matches,
            semanticMatches: evaluationCase.semanticMatches,
            preferredSourceCategories: collectPreferredSourceCategories(
              evaluationCase,
            ),
            currentPostSlug: evaluationCase.currentPostSlug,
          })
        : resolvedChatRequest.matches

      expect(resolvedChatRequest.directResponse).toBeUndefined()

      if (evaluationCase.expectedTopMatchUrl) {
        expect(combinedMatches[0]?.url).toBe(evaluationCase.expectedTopMatchUrl)
      }

      if (evaluationCase.expectedMatchUrls) {
        expect(combinedMatches.map((match) => match.url)).toEqual(
          expect.arrayContaining(evaluationCase.expectedMatchUrls),
        )
      }
    })
  }
})
