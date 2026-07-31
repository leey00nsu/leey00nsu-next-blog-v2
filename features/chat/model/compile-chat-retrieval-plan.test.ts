import { describe, expect, it } from 'vitest'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'
import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import type { ChatQueryPlan } from '@/features/chat/model/chat-query-plan'
import { compileChatRetrievalPlan } from '@/features/chat/model/compile-chat-retrieval-plan'

const LEEMAGE_CANDIDATE: ChatEntityCandidate = {
  entityId: 'project/leemage',
  kind: 'project',
  slug: 'leemage',
  title: 'Leemage',
  aliases: ['Leemage'],
  searchTerms: ['Presigned URL'],
  sourceCategory: 'project',
}

const OWNER_CANDIDATE: ChatEntityCandidate = {
  entityId: 'profile/about',
  kind: 'profile',
  slug: 'about',
  title: '이윤수',
  aliases: ['블로그 주인'],
  searchTerms: ['Vercel'],
  sourceCategory: 'profile',
}

const LEESFIELD_CANDIDATE: ChatEntityCandidate = {
  entityId: 'project/leesfield',
  kind: 'project',
  slug: 'leesfield',
  title: 'Leesfield',
  aliases: ['Leesfield'],
  searchTerms: ['Hugging Face'],
  sourceCategory: 'project',
}

const BASE_QUERY_PLAN: ChatQueryPlan = {
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
}

function compile(queryPlan: ChatQueryPlan) {
  return compileChatRetrievalPlan({
    queryPlan,
    candidates: [LEEMAGE_CANDIDATE, LEESFIELD_CANDIDATE, OWNER_CANDIDATE],
    previousState: EMPTY_CHAT_CONVERSATION_STATE,
    maximumEvidenceCount: 3,
  })
}

describe('compileChatRetrievalPlan', () => {
  it('최근 프로젝트 content 질문을 시간 우선 검색으로 컴파일한다', () => {
    const result = compile(BASE_QUERY_PLAN)

    expect(result).toMatchObject({
      ok: true,
      retrievalPlan: {
        executionKind: 'retrieve_and_generate',
        sourceStrategy: 'only',
        sourceCategories: ['project'],
        temporalStrategy: 'rank',
        temporalOrder: 'latest',
      },
    })
  })

  it('최신 블로그의 제목과 게시일 조회만 direct metadata로 컴파일한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      standaloneQuestion: '가장 최근 글의 제목과 날짜를 알려줘',
      operation: 'lookup',
      sourceSelection: { mode: 'only', categories: ['blog'] },
      temporalSelection: { mode: 'single', order: 'latest' },
      requestedFields: ['title', 'published_at'],
      requiredConcepts: [],
    })

    expect(result).toMatchObject({
      ok: true,
      retrievalPlan: {
        executionKind: 'direct_metadata',
        sourceStrategy: 'only',
        sourceCategories: ['blog'],
        temporalStrategy: 'single',
      },
    })
  })

  it('single content 조회는 모델 생성을 유지한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      operation: 'lookup',
      temporalSelection: { mode: 'single', order: 'latest' },
      requestedFields: ['content'],
    })

    expect(result).toMatchObject({
      ok: true,
      retrievalPlan: { executionKind: 'retrieve_and_generate' },
    })
  })

  it('가장 최근 프로젝트의 title 조회는 부가 content 필드가 있어도 직접 처리한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      standaloneQuestion: '가장 최근에 끝난 프로젝트 하나를 알려줘',
      operation: 'lookup',
      sourceSelection: { mode: 'only', categories: ['project'] },
      temporalSelection: { mode: 'single', order: 'latest' },
      requestedFields: ['title', 'summary', 'content'],
      requiredConcepts: [],
    })

    expect(result).toMatchObject({
      ok: true,
      retrievalPlan: { executionKind: 'direct_metadata' },
    })
  })

  it('candidate를 canonical target으로 변환하고 all source를 prefer로 승격한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      standaloneQuestion: 'Leemage에서 Presigned URL을 사용한 이유는?',
      targetSelection: {
        kind: 'candidate',
        entityId: LEEMAGE_CANDIDATE.entityId,
      },
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      requiredConcepts: ['Presigned URL'],
    })

    expect(result).toMatchObject({
      ok: true,
      retrievalPlan: {
        canonicalTargets: [
          {
            kind: 'named_entity',
            sourceCategory: 'project',
            slug: 'leemage',
            title: 'Leemage',
          },
        ],
        sourceStrategy: 'prefer',
        sourceCategories: ['project'],
      },
      nextConversationState: {
        focusedTarget: { slug: 'leemage' },
      },
    })
  })

  it('비교 질문에 명시된 모든 candidate를 canonical target으로 포함한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      standaloneQuestion: 'Leemage와 Leesfield를 비교해줘',
      targetSelection: {
        kind: 'candidate',
        entityId: LEEMAGE_CANDIDATE.entityId,
      },
      operation: 'compare',
      sourceSelection: { mode: 'only', categories: ['project'] },
      temporalSelection: { mode: 'none' },
      requestedFields: ['content'],
      requiredConcepts: ['Leesfield'],
    })

    expect(result).toMatchObject({
      ok: true,
      retrievalPlan: {
        canonicalTargets: [{ slug: 'leemage' }, { slug: 'leesfield' }],
        maximumEvidenceCount: 6,
      },
    })
  })

  it('추상적인 필수 개념을 선택 개념으로 내려 관련 근거를 버리지 않는다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      standaloneQuestion: 'Vercel을 더 이상 사용하지 않는 이유는?',
      sourceSelection: { mode: 'only', categories: ['blog'] },
      temporalSelection: { mode: 'none' },
      requiredConcepts: ['Vercel', '사용하지 않는 이유'],
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        requiredConcepts: ['Vercel'],
        optionalConcepts: ['사용하지 않는 이유'],
      },
    })
  })

  it('대상이 생략된 경력·학력 질문은 profile 근거로 제한한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      standaloneQuestion: '대외활동이나 동아리 경험을 알려줘',
      targetSelection: { kind: 'none' },
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      requiredConcepts: ['동아리 경험'],
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        sourceSelection: { mode: 'only', categories: ['profile'] },
      },
      retrievalPlan: {
        sourceStrategy: 'only',
        sourceCategories: ['profile'],
      },
    })
  })

  it('프로필 대상의 전체 기술 스택 질문은 profile 근거로 정규화한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      standaloneQuestion: '이윤수가 프로젝트에서 주로 쓰는 기술 스택은 뭐야?',
      targetSelection: {
        kind: 'candidate',
        entityId: OWNER_CANDIDATE.entityId,
      },
      sourceSelection: { mode: 'only', categories: ['project'] },
      temporalSelection: { mode: 'none' },
      requiredConcepts: [],
      optionalConcepts: ['기술 스택'],
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        sourceSelection: { mode: 'only', categories: ['profile'] },
      },
      retrievalPlan: {
        executionKind: 'direct_profile',
        canonicalTargets: [{ sourceCategory: 'profile', slug: 'about' }],
        sourceCategories: ['profile'],
      },
    })
  })

  it('최근 근무처 질문은 캐시와 생성 모델을 거치지 않는 profile 직접 실행으로 컴파일한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      standaloneQuestion: '최근 어디에서 일했어?',
      targetSelection: { kind: 'none' },
      operation: 'lookup',
      sourceSelection: { mode: 'only', categories: ['profile'] },
      temporalSelection: { mode: 'single', order: 'latest' },
      requestedFields: ['content'],
      requiredConcepts: [],
      optionalConcepts: ['career', 'workplace'],
    })

    expect(result).toMatchObject({
      ok: true,
      retrievalPlan: {
        executionKind: 'direct_profile',
        sourceCategories: ['profile'],
      },
    })
  })

  it('이전 문맥 없는 continue candidate를 새 주제 reset으로 정규화한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      contextAction: 'continue',
      targetSelection: {
        kind: 'candidate',
        entityId: LEEMAGE_CANDIDATE.entityId,
      },
    })

    expect(result).toMatchObject({
      ok: true,
      contextAction: 'reset',
      queryPlan: { contextAction: 'reset' },
    })
  })

  it('존재하지 않는 candidate를 거부한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      targetSelection: { kind: 'candidate', entityId: 'project/unknown' },
    })

    expect(result).toEqual({
      ok: false,
      failureKind: 'invalid_candidate',
      nextConversationState: EMPTY_CHAT_CONVERSATION_STATE,
    })
  })

  it('누락 slot은 검색하지 않고 clarification으로 컴파일한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      missingSlots: ['target'],
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
    })

    expect(result).toMatchObject({
      ok: true,
      retrievalPlan: { executionKind: 'clarification' },
      nextConversationState: {
        pendingClarification: {
          suspendedQueryPlan: { missingSlots: ['target'] },
        },
      },
    })
  })

  it('pending clarification 없는 resolve transition을 거부한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      contextAction: 'resolve_clarification',
    })

    expect(result).toEqual({
      ok: false,
      failureKind: 'invalid_transition',
      nextConversationState: EMPTY_CHAT_CONVERSATION_STATE,
    })
  })

  it('첫 턴의 clarification 요청은 잘못된 resolve action을 reset으로 정규화한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      contextAction: 'resolve_clarification',
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      missingSlots: ['target'],
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
    })

    expect(result).toMatchObject({
      ok: true,
      contextAction: 'reset',
      queryPlan: { contextAction: 'reset' },
      retrievalPlan: { executionKind: 'clarification' },
    })
  })

  it('clarification 답변으로 중단된 질문의 검색 의미를 재개한다', () => {
    const suspendedQueryPlan: ChatQueryPlan = {
      standaloneQuestion: '블로그 주인이 Vercel을 사용한 경험이 있나요?',
      contextAction: 'reset',
      targetSelection: { kind: 'none' },
      operation: 'lookup',
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      requestedFields: ['content'],
      requiredConcepts: ['Vercel'],
      optionalConcepts: ['배포'],
      missingSlots: ['target'],
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
      confidence: 'low',
      reason: 'Target is missing.',
    }
    const previousState: ChatConversationState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      pendingClarification: {
        clarificationQuestion: '누구를 가리키는지 알려주세요.',
        suspendedQueryPlan,
      },
    }
    const result = compileChatRetrievalPlan({
      queryPlan: {
        ...BASE_QUERY_PLAN,
        standaloneQuestion: '블로그 주인',
        contextAction: 'resolve_clarification',
        targetSelection: {
          kind: 'candidate',
          entityId: OWNER_CANDIDATE.entityId,
        },
        operation: 'lookup',
        sourceSelection: { mode: 'all' },
        temporalSelection: { mode: 'none' },
        requestedFields: ['content'],
        requiredConcepts: [],
      },
      candidates: [OWNER_CANDIDATE],
      previousState,
      maximumEvidenceCount: 3,
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        standaloneQuestion: '블로그 주인이 Vercel을 사용한 경험이 있나요?',
        requiredConcepts: ['Vercel'],
      },
      retrievalPlan: {
        canonicalTargets: [{ sourceCategory: 'profile', slug: 'about' }],
        requiredConcepts: ['Vercel'],
      },
      nextConversationState: { pendingClarification: null },
    })
  })

  it('대상 답변을 reset으로 분류해도 중단된 연락처 요청을 복원한다', () => {
    const suspendedQueryPlan: ChatQueryPlan = {
      standaloneQuestion: '이 사람 깃허브 주소 좀 알려줘',
      contextAction: 'reset',
      targetSelection: { kind: 'none' },
      operation: 'lookup',
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      requestedFields: ['contact_methods'],
      requiredConcepts: ['GitHub'],
      optionalConcepts: [],
      missingSlots: ['target'],
      clarificationQuestion: '어느 사람을 말하는지 알려주세요.',
      confidence: 'low',
      reason: 'Target is missing.',
    }
    const previousState: ChatConversationState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      pendingClarification: {
        clarificationQuestion: '어느 사람을 말하는지 알려주세요.',
        suspendedQueryPlan,
      },
    }
    const result = compileChatRetrievalPlan({
      queryPlan: {
        ...BASE_QUERY_PLAN,
        standaloneQuestion: '블로그 주인',
        contextAction: 'reset',
        targetSelection: {
          kind: 'candidate',
          entityId: OWNER_CANDIDATE.entityId,
        },
        operation: 'lookup',
        sourceSelection: { mode: 'all' },
        temporalSelection: { mode: 'none' },
        requestedFields: ['content'],
        requiredConcepts: [],
      },
      candidates: [OWNER_CANDIDATE],
      previousState,
      maximumEvidenceCount: 3,
    })

    expect(result).toMatchObject({
      ok: true,
      contextAction: 'resolve_clarification',
      queryPlan: {
        standaloneQuestion: suspendedQueryPlan.standaloneQuestion,
        requestedFields: ['contact_methods'],
        requiredConcepts: ['GitHub'],
      },
      retrievalPlan: {
        executionKind: 'contact',
        canonicalTargets: [{ sourceCategory: 'profile', slug: 'about' }],
      },
      nextConversationState: { pendingClarification: null },
    })
  })

  it('lookup으로 분류된 연락처 필드도 직접 contact 응답으로 컴파일한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      standaloneQuestion: '블로그 주인의 GitHub 주소를 알려줘',
      operation: 'lookup',
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      requestedFields: ['contact_methods'],
      requiredConcepts: ['GitHub'],
    })

    expect(result).toMatchObject({
      ok: true,
      retrievalPlan: { executionKind: 'contact' },
    })
  })

  it('pending clarification 중 들어온 별도 candidate 질문은 새 질문으로 유지한다', () => {
    const suspendedQueryPlan: ChatQueryPlan = {
      standaloneQuestion: '이 사람 깃허브 주소 좀 알려줘',
      contextAction: 'reset',
      targetSelection: { kind: 'none' },
      operation: 'lookup',
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      requestedFields: ['contact_methods'],
      requiredConcepts: ['GitHub'],
      optionalConcepts: [],
      missingSlots: ['target'],
      clarificationQuestion: '어느 사람을 말하는지 알려주세요.',
      confidence: 'low',
      reason: 'Target is missing.',
    }
    const previousState: ChatConversationState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      pendingClarification: {
        clarificationQuestion: '어느 사람을 말하는지 알려주세요.',
        suspendedQueryPlan,
      },
    }
    const result = compileChatRetrievalPlan({
      queryPlan: {
        ...BASE_QUERY_PLAN,
        standaloneQuestion: 'Leemage GitHub 주소를 알려줘',
        contextAction: 'reset',
        targetSelection: {
          kind: 'candidate',
          entityId: LEEMAGE_CANDIDATE.entityId,
        },
        operation: 'lookup',
        sourceSelection: { mode: 'only', categories: ['project'] },
        temporalSelection: { mode: 'none' },
        requestedFields: ['contact_methods'],
        requiredConcepts: ['GitHub'],
      },
      candidates: [LEEMAGE_CANDIDATE],
      previousState,
      maximumEvidenceCount: 3,
    })

    expect(result).toMatchObject({
      ok: true,
      contextAction: 'reset',
      queryPlan: {
        standaloneQuestion: 'Leemage GitHub 주소를 알려줘',
      },
      retrievalPlan: {
        executionKind: 'retrieve_and_generate',
        canonicalTargets: [{ slug: 'leemage' }],
      },
    })
  })

  it('별도 candidate 질문을 resolve clarification으로 분류해도 새 질문으로 정규화한다', () => {
    const suspendedQueryPlan: ChatQueryPlan = {
      standaloneQuestion: '이 사람 깃허브 주소 좀 알려줘',
      contextAction: 'reset',
      targetSelection: { kind: 'none' },
      operation: 'contact',
      sourceSelection: { mode: 'all' },
      temporalSelection: { mode: 'none' },
      requestedFields: ['contact_methods'],
      requiredConcepts: ['GitHub'],
      optionalConcepts: [],
      missingSlots: ['target'],
      clarificationQuestion: '어느 사람을 말하는지 알려주세요.',
      confidence: 'low',
      reason: 'Target is missing.',
    }
    const previousState: ChatConversationState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      pendingClarification: {
        clarificationQuestion: '어느 사람을 말하는지 알려주세요.',
        suspendedQueryPlan,
      },
    }
    const result = compileChatRetrievalPlan({
      queryPlan: {
        ...BASE_QUERY_PLAN,
        standaloneQuestion: 'Leemage는 비용을 어떻게 줄였어?',
        contextAction: 'resolve_clarification',
        targetSelection: {
          kind: 'candidate',
          entityId: LEEMAGE_CANDIDATE.entityId,
        },
        operation: 'explain',
        sourceSelection: { mode: 'only', categories: ['project'] },
        temporalSelection: { mode: 'none' },
        requestedFields: ['content'],
        requiredConcepts: [],
        optionalConcepts: ['비용 절감'],
      },
      candidates: [LEEMAGE_CANDIDATE],
      previousState,
      maximumEvidenceCount: 3,
    })

    expect(result).toMatchObject({
      ok: true,
      contextAction: 'reset',
      queryPlan: {
        standaloneQuestion: 'Leemage는 비용을 어떻게 줄였어?',
        operation: 'explain',
        requestedFields: ['content'],
      },
      retrievalPlan: {
        canonicalTargets: [{ slug: 'leemage' }],
      },
    })
  })

  it('프로젝트 연락처 요청은 블로그 주인 연락처로 직접 처리하지 않는다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      standaloneQuestion: 'Leemage GitHub 주소를 알려줘',
      targetSelection: {
        kind: 'candidate',
        entityId: LEEMAGE_CANDIDATE.entityId,
      },
      operation: 'lookup',
      sourceSelection: { mode: 'only', categories: ['project'] },
      temporalSelection: { mode: 'none' },
      requestedFields: ['contact_methods'],
      requiredConcepts: ['GitHub'],
    })

    expect(result).toMatchObject({
      ok: true,
      retrievalPlan: { executionKind: 'retrieve_and_generate' },
    })
  })

  it('근거 작업의 빈 requested fields를 거부한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      requestedFields: [],
    })

    expect(result).toEqual({
      ok: false,
      failureKind: 'invalid_query_plan',
      nextConversationState: EMPTY_CHAT_CONVERSATION_STATE,
    })
  })

  it('current_source를 현재 blog target으로 컴파일한다', () => {
    const result = compileChatRetrievalPlan({
      queryPlan: {
        ...BASE_QUERY_PLAN,
        standaloneQuestion: '이 글에서 구조가 중요한 이유는?',
        targetSelection: { kind: 'current_source' },
        sourceSelection: { mode: 'only', categories: ['blog'] },
        temporalSelection: { mode: 'none' },
      },
      candidates: [],
      previousState: EMPTY_CHAT_CONVERSATION_STATE,
      currentPostSlug: 'why-i-built-lee-spec-kit',
      maximumEvidenceCount: 3,
    })

    expect(result).toMatchObject({
      ok: true,
      retrievalPlan: {
        canonicalTargets: [
          {
            kind: 'current_source',
            sourceCategory: 'blog',
            slug: 'why-i-built-lee-spec-kit',
          },
        ],
      },
    })
  })

  it('current_source에 current post slug가 없으면 거부한다', () => {
    const result = compile({
      ...BASE_QUERY_PLAN,
      targetSelection: { kind: 'current_source' },
    })

    expect(result).toEqual({
      ok: false,
      failureKind: 'invalid_query_plan',
      nextConversationState: EMPTY_CHAT_CONVERSATION_STATE,
    })
  })

  it('동일 입력에 동일한 결과를 반환한다', () => {
    expect(compile(BASE_QUERY_PLAN)).toEqual(compile(BASE_QUERY_PLAN))
  })
})
