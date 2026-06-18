import { describe, expect, it } from 'vitest'
import {
  CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS,
  CHAT_RETRIEVAL_EVALUATION_CASES,
  CHAT_RETRIEVAL_EVALUATION_CONTACT_PROFILE,
  CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS,
} from '@/features/chat/fixtures/chat-retrieval-evaluation'
import { resolveChatIntentRequest } from '@/features/chat/lib/resolve-chat-intent-request'
import { resolveChatEvidenceScope } from '@/features/chat/lib/chat-retrieval-scope'
import { selectFinalChatEvidence } from '@/features/chat/lib/select-final-chat-evidence'

describe('chat retrieval evaluation', () => {
  for (const evaluationCase of CHAT_RETRIEVAL_EVALUATION_CASES) {
    it(`${evaluationCase.id} intent를 기대한 근거 문서로 연결한다`, () => {
      const resolvedRequest = resolveChatIntentRequest({
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
      const combinedMatches = selectFinalChatEvidence({
        question: evaluationCase.intent.standaloneQuestion,
        locale: evaluationCase.locale,
        intent: evaluationCase.intent,
        evidenceScope: evidenceScope,
        lexicalMatches: resolvedRequest.matches,
        semanticMatches: evaluationCase.semanticMatches,
      })

      if (evaluationCase.expectedTopMatchUrl) {
        expect(combinedMatches[0]?.url).toBe(evaluationCase.expectedTopMatchUrl)
      }

      if (evaluationCase.expectedMatchUrls) {
        const combinedMatchUrlSet = new Set(
          combinedMatches.map((match) => match.url),
        )

        expect(
          evaluationCase.expectedMatchUrls.some((expectedMatchUrl) => {
            return combinedMatchUrlSet.has(expectedMatchUrl)
          }),
        ).toBe(true)
      }
    })
  }
})
