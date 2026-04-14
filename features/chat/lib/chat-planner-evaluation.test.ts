import { describe, expect, it } from 'vitest'
import {
  CHAT_PLANNER_EVALUATION_BLOG_RECORDS,
  CHAT_PLANNER_EVALUATION_CASES,
  CHAT_PLANNER_EVALUATION_CONTACT_PROFILE,
  CHAT_PLANNER_EVALUATION_CURATED_RECORDS,
} from '@/features/chat/fixtures/chat-planner-evaluation'
import { fuseChatRetrievalMatches } from '@/features/chat/lib/chat-retrieval-fusion'
import {
  applyQuestionPlanToAnalysis,
  buildQuestionRoutingFromPlan,
  shouldRunHybridRetrieval,
} from '@/features/chat/lib/chat-question-plan-routing'
import { analyzeQuestion } from '@/features/chat/lib/question-analysis'
import { resolveChatRequest } from '@/features/chat/lib/resolve-chat-request'

describe('chat planner evaluation', () => {
  for (const evaluationCase of CHAT_PLANNER_EVALUATION_CASES) {
    it(`${evaluationCase.id} 질문을 planner rag 경로로 처리한다`, async () => {
      const questionPlan = evaluationCase.questionPlan

      expect(questionPlan.needsRetrieval).toBe(evaluationCase.expectedRetrieval)

      if (evaluationCase.expectedClarificationQuestion) {
        expect(questionPlan.needsClarification).toBe(true)
        expect(questionPlan.clarificationQuestion).toBe(
          evaluationCase.expectedClarificationQuestion,
        )

        return
      }

      const questionAnalysis = applyQuestionPlanToAnalysis({
        questionAnalysis: analyzeQuestion(
          questionPlan.standaloneQuestion,
          evaluationCase.locale,
        ),
        questionPlan,
        locale: evaluationCase.locale,
      })
      const questionRouting = buildQuestionRoutingFromPlan(questionPlan)
      const resolvedChatRequest = resolveChatRequest({
        question: questionPlan.standaloneQuestion,
        locale: evaluationCase.locale,
        blogRecords: CHAT_PLANNER_EVALUATION_BLOG_RECORDS,
        curatedRecords: CHAT_PLANNER_EVALUATION_CURATED_RECORDS,
        currentPostSlug: evaluationCase.currentPostSlug,
        questionAnalysis,
        contactProfile: CHAT_PLANNER_EVALUATION_CONTACT_PROFILE,
        questionRouting,
      })
      const combinedMatches = shouldRunHybridRetrieval(questionPlan)
        ? fuseChatRetrievalMatches({
            lexicalMatches: resolvedChatRequest.matches,
            semanticMatches: evaluationCase.semanticMatches ?? [],
            preferredSourceCategories: [
              ...new Set(
                questionAnalysis.searchQueries.flatMap((searchQuery) => {
                  return searchQuery.preferredSourceCategories
                }),
              ),
            ],
            currentPostSlug: evaluationCase.currentPostSlug,
          })
        : resolvedChatRequest.matches

      expect(questionRouting.selector).toBe(evaluationCase.expectedSelector)
      expect(resolvedChatRequest.directResponse).toBeUndefined()

      if (evaluationCase.expectedPreferredSourceCategories) {
        expect(questionAnalysis.searchQueries[0]?.preferredSourceCategories).toEqual(
          expect.arrayContaining(evaluationCase.expectedPreferredSourceCategories),
        )
      }

      if (evaluationCase.expectedTopMatchUrl) {
        expect(combinedMatches[0]?.url).toBe(evaluationCase.expectedTopMatchUrl)
      }
    })
  }
})
