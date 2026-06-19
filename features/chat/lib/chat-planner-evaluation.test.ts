import { describe, expect, it } from 'vitest'
import {
  CHAT_PLANNER_EVALUATION_BLOG_RECORDS,
  CHAT_PLANNER_EVALUATION_CASES,
  CHAT_PLANNER_EVALUATION_CURATED_RECORDS,
  CHAT_PLANNER_GOLDEN_CASES,
} from '@/features/chat/fixtures/chat-planner-evaluation'
import { matchChatEntityCandidates } from '@/features/chat/lib/match-chat-entity-candidates'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import { compileChatRetrievalPlan } from '@/features/chat/model/compile-chat-retrieval-plan'

const MAXIMUM_EVIDENCE_COUNT = 3

function buildEvaluationCandidates(): ChatEntityCandidate[] {
  return [
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
}

describe('chat planner evaluation', () => {
  for (const evaluationCase of CHAT_PLANNER_EVALUATION_CASES) {
    it(`${evaluationCase.id} query plan을 retrieval plan으로 컴파일한다`, () => {
      const compiled = compileChatRetrievalPlan({
        queryPlan: evaluationCase.modelPlan,
        candidates: buildEvaluationCandidates(),
        previousState: evaluationCase.inputState,
        currentPostSlug: evaluationCase.currentPostSlug,
        maximumEvidenceCount: MAXIMUM_EVIDENCE_COUNT,
      })

      expect(compiled.ok).toBe(true)
      if (!compiled.ok) return

      expect(compiled.retrievalPlan).toMatchObject(
        evaluationCase.expectedRetrievalPlan,
      )
      expect(compiled.retrievalPlan.canonicalTargets[0]?.slug ?? null).toBe(
        evaluationCase.expectedTargetSlug,
      )
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
    it(`${goldenCase.id}에서 source, temporal, execution 계약을 보존한다`, () => {
      const matchingCandidates = matchChatEntityCandidates({
        question: goldenCase.question,
        candidates,
      })
      const compiled = compileChatRetrievalPlan({
        queryPlan: goldenCase.modelPlan,
        candidates: matchingCandidates,
        previousState: EMPTY_CHAT_CONVERSATION_STATE,
        maximumEvidenceCount: MAXIMUM_EVIDENCE_COUNT,
      })

      expect(compiled.ok).toBe(true)
      if (!compiled.ok) return

      expect(compiled.contextAction).toBe(goldenCase.expectedContextAction)
      expect(goldenCase.expectedOperations).toContain(
        compiled.queryPlan.operation,
      )
      expect(compiled.queryPlan.sourceSelection.mode).toBe(
        goldenCase.expectedSourceMode,
      )
      expect(compiled.retrievalPlan.sourceCategories).toEqual(
        goldenCase.expectedSourceCategories,
      )
      expect(compiled.queryPlan.temporalSelection.mode).toBe(
        goldenCase.expectedTemporalMode,
      )
      expect(compiled.retrievalPlan.temporalOrder).toBe(
        goldenCase.expectedTemporalOrder,
      )
      expect(
        goldenCase.expectedAnyRequestedFields.some((requestedField) => {
          return compiled.queryPlan.requestedFields.includes(requestedField)
        }),
      ).toBe(true)
      for (const forbiddenRequestedField of goldenCase.forbiddenRequestedFields ??
        []) {
        expect(compiled.queryPlan.requestedFields).not.toContain(
          forbiddenRequestedField,
        )
      }
      expect(compiled.queryPlan.requiredConcepts).toEqual(
        expect.arrayContaining(goldenCase.expectedRequiredConcepts),
      )
      expect(compiled.queryPlan.missingSlots.length > 0).toBe(
        goldenCase.expectClarification,
      )
      expect(compiled.retrievalPlan.executionKind).toBe(
        goldenCase.expectedExecutionKind,
      )
      expect(
        goldenCase.modelPlan.targetSelection.kind === 'candidate'
          ? goldenCase.modelPlan.targetSelection.entityId
          : null,
      ).toBe(goldenCase.expectedEntityId)
    })
  }
})
