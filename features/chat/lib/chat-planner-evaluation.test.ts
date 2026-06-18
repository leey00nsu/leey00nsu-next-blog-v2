import { describe, expect, it } from 'vitest'
import {
  CHAT_PLANNER_EVALUATION_BLOG_RECORDS,
  CHAT_PLANNER_EVALUATION_CASES,
  CHAT_PLANNER_EVALUATION_CONTACT_PROFILE,
  CHAT_PLANNER_EVALUATION_CURATED_RECORDS,
} from '@/features/chat/fixtures/chat-planner-evaluation'
import { resolveChatIntentRequest } from '@/features/chat/lib/resolve-chat-intent-request'
import { reduceChatConversationState } from '@/features/chat/model/reduce-chat-conversation-state'

describe('chat planner evaluation', () => {
  for (const evaluationCase of CHAT_PLANNER_EVALUATION_CASES) {
    it(`${evaluationCase.id} patch를 normalized intent로 실행한다`, () => {
      const reduction = reduceChatConversationState({
        previousState: evaluationCase.inputState,
        intentPatch: evaluationCase.modelPatch,
      })

      expect(reduction.intent).toEqual(evaluationCase.expectedIntent)

      if (reduction.intent.missingSlots.length > 0) {
        expect(evaluationCase.expectedExecutionKind).toBe('direct')
        return
      }

      const resolvedRequest = resolveChatIntentRequest({
        intent: reduction.intent,
        locale: evaluationCase.locale,
        blogRecords: CHAT_PLANNER_EVALUATION_BLOG_RECORDS,
        curatedRecords: CHAT_PLANNER_EVALUATION_CURATED_RECORDS,
        currentPostSlug: evaluationCase.currentPostSlug,
        contactProfile: CHAT_PLANNER_EVALUATION_CONTACT_PROFILE,
      })
      const executionKind = resolvedRequest.directResponse ? 'direct' : 'model'

      expect(executionKind).toBe(evaluationCase.expectedExecutionKind)

      if (evaluationCase.expectedTopMatchUrl) {
        expect(resolvedRequest.matches[0]?.url).toBe(
          evaluationCase.expectedTopMatchUrl,
        )
      }
    })
  }
})
