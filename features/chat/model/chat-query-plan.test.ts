import { describe, expect, it } from 'vitest'
import { ChatQueryPlanSchema } from '@/features/chat/model/chat-query-plan'

const BASE_QUERY_PLAN = {
  standaloneQuestion: '최근 프로젝트에서 AI를 어떻게 활용해?',
  contextAction: 'reset',
  targetSelection: { kind: 'none' },
  operation: 'explain',
  sourceSelection: { mode: 'only', categories: ['project'] },
  temporalSelection: { mode: 'rank', order: 'latest' },
  requestedFields: ['content'],
  requiredConcepts: ['AI'],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'Cross-project explanation.',
} as const

describe('ChatQueryPlanSchema', () => {
  it('구조화된 source와 temporal 선택을 허용한다', () => {
    expect(ChatQueryPlanSchema.safeParse(BASE_QUERY_PLAN).success).toBe(true)
  })

  it('all source에 categories를 추가한 잘못된 조합을 거부한다', () => {
    expect(
      ChatQueryPlanSchema.safeParse({
        ...BASE_QUERY_PLAN,
        sourceSelection: { mode: 'all', categories: ['project'] },
      }).success,
    ).toBe(false)
  })

  it('none temporal에 order를 추가한 잘못된 조합을 거부한다', () => {
    expect(
      ChatQueryPlanSchema.safeParse({
        ...BASE_QUERY_PLAN,
        temporalSelection: { mode: 'none', order: 'latest' },
      }).success,
    ).toBe(false)
  })

  it('only source의 빈 categories를 거부한다', () => {
    expect(
      ChatQueryPlanSchema.safeParse({
        ...BASE_QUERY_PLAN,
        sourceSelection: { mode: 'only', categories: [] },
      }).success,
    ).toBe(false)
  })

  it('source categories의 중복을 거부한다', () => {
    expect(
      ChatQueryPlanSchema.safeParse({
        ...BASE_QUERY_PLAN,
        sourceSelection: {
          mode: 'prefer',
          categories: ['project', 'project'],
        },
      }).success,
    ).toBe(false)
  })

  it('현재 페이지 근거를 current_source target으로 표현한다', () => {
    expect(
      ChatQueryPlanSchema.safeParse({
        ...BASE_QUERY_PLAN,
        standaloneQuestion: '현재 글에서 구조가 중요한 이유는?',
        targetSelection: { kind: 'current_source' },
        sourceSelection: { mode: 'only', categories: ['blog'] },
        temporalSelection: { mode: 'none' },
      }).success,
    ).toBe(true)
  })
})
