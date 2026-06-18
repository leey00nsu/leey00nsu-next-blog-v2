import { describe, expect, it } from 'vitest'
import {
  CHAT_PLANNER_EVALUATION_BLOG_RECORDS,
  CHAT_PLANNER_EVALUATION_CASES,
  CHAT_PLANNER_EVALUATION_CONTACT_PROFILE,
  CHAT_PLANNER_EVALUATION_CURATED_RECORDS,
  CHAT_PLANNER_GOLDEN_CASES,
} from '@/features/chat/fixtures/chat-planner-evaluation'
import { matchChatEntityCandidates } from '@/features/chat/lib/match-chat-entity-candidates'
import { resolveChatIntentRequest } from '@/features/chat/lib/resolve-chat-intent-request'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'
import { normalizeChatIntentPlan } from '@/features/chat/model/normalize-chat-intent-plan'
import { reduceChatConversationState } from '@/features/chat/model/reduce-chat-conversation-state'

describe('chat planner evaluation', () => {
  for (const evaluationCase of CHAT_PLANNER_EVALUATION_CASES) {
    it(`${evaluationCase.id} patch를 normalized intent로 실행한다`, () => {
      const entityCandidates: ChatEntityCandidate[] = [
        ...CHAT_PLANNER_EVALUATION_CURATED_RECORDS,
        ...CHAT_PLANNER_EVALUATION_BLOG_RECORDS.map((record) => ({
          ...record,
          sourceCategory: 'blog' as const,
        })),
      ].map((record) => ({
        entityId: `${record.sourceCategory}/${record.slug}`,
        kind:
          record.sourceCategory === 'blog'
            ? ('post' as const)
            : record.sourceCategory,
        slug: record.slug,
        title: record.title,
        aliases: [record.title, record.slug],
        searchTerms: record.searchTerms ?? [],
        sourceCategory: record.sourceCategory,
      }))
      const normalized = normalizeChatIntentPlan({
        intentPlan: evaluationCase.modelPlan,
        candidates: entityCandidates,
        previousState: evaluationCase.inputState,
        currentPostSlug: evaluationCase.currentPostSlug,
      })

      expect(normalized.ok).toBe(true)
      if (!normalized.ok) return

      const reduction = reduceChatConversationState({
        previousState: evaluationCase.inputState,
        contextAction: evaluationCase.modelPlan.contextAction,
        intent: normalized.intent,
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

describe('chat planner golden baseline', () => {
  const candidates: ChatEntityCandidate[] = [
    {
      entityId: 'project/lee-spec-kit',
      kind: 'project',
      slug: 'lee-spec-kit',
      title: 'lee-spec-kit',
      aliases: ['lee-spec-kit', 'lee spec kit'],
      searchTerms: ['AI'],
      sourceCategory: 'project',
    },
    {
      entityId: 'project/leemage',
      kind: 'project',
      slug: 'leemage',
      title: 'Leemage',
      aliases: ['Leemage', 'lee mage'],
      searchTerms: ['Presigned URL'],
      sourceCategory: 'project',
    },
  ]

  for (const goldenCase of CHAT_PLANNER_GOLDEN_CASES) {
    it(`${goldenCase.id}에서 target, scope, clarification을 보존한다`, () => {
      const matchingCandidates = matchChatEntityCandidates({
        question: goldenCase.question,
        candidates,
      })
      const normalized = normalizeChatIntentPlan({
        intentPlan: goldenCase.modelPlan,
        candidates: matchingCandidates,
        previousState: EMPTY_CHAT_CONVERSATION_STATE,
      })

      expect(normalized.ok).toBe(true)
      if (!normalized.ok) return

      expect(normalized.contextAction).toBe(
        goldenCase.expectedContextAction,
      )
      expect(normalized.intent.evidenceScope).toBe(
        goldenCase.expectedEvidenceScope,
      )
      expect(normalized.intent.requiredConcepts).toEqual(
        expect.arrayContaining(goldenCase.expectedRequiredConcepts),
      )
      expect(normalized.intent.missingSlots.length > 0).toBe(
        goldenCase.expectClarification,
      )
      expect(
        goldenCase.modelPlan.targetSelection.kind === 'candidate'
          ? goldenCase.modelPlan.targetSelection.entityId
          : null,
      ).toBe(goldenCase.expectedEntityId)
    })
  }
})
