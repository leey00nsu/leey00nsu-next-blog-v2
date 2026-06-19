import { describe, expect, it } from 'vitest'
import {
  CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS,
  CHAT_RETRIEVAL_EVALUATION_CASES,
  CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS,
} from '@/features/chat/fixtures/chat-retrieval-evaluation'
import { executeChatRetrievalPlan } from '@/features/chat/model/execute-chat-retrieval-plan'

describe('chat retrieval evaluation', () => {
  for (const evaluationCase of CHAT_RETRIEVAL_EVALUATION_CASES) {
    it(`${evaluationCase.id} plan을 기대한 근거 문서로 연결한다`, async () => {
      const execution = await executeChatRetrievalPlan({
        plan: evaluationCase.retrievalPlan,
        locale: evaluationCase.locale,
        blogRecords: CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS,
        curatedRecords: CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS,
        retrieveSemanticMatches: async () => evaluationCase.semanticMatches,
      })
      const matches = execution.matches

      if (evaluationCase.expectedTopMatchUrl) {
        expect(matches[0]?.url).toBe(evaluationCase.expectedTopMatchUrl)
      }

      if (evaluationCase.expectedMatchUrls) {
        const matchUrlSet = new Set(matches.map((match) => match.url))

        expect(
          evaluationCase.expectedMatchUrls.some((expectedMatchUrl) => {
            return matchUrlSet.has(expectedMatchUrl)
          }),
        ).toBe(true)
      }
    })
  }
})
