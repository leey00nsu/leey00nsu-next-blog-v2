import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EMPTY_CHAT_CONVERSATION_STATE,
  type ChatConversationState,
} from '@/features/chat/model/chat-conversation-state'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import { compileChatRetrievalPlan } from '@/features/chat/model/compile-chat-retrieval-plan'

const systemOneMock = vi.fn()

vi.mock('@typesafe-ai/sdk', () => ({
  TypeSafeClient: class {
    systemOne = systemOneMock
  },
}))

const CANDIDATE = {
  entityId: 'project/leemage',
  kind: 'project' as const,
  sourceCategory: 'project' as const,
  slug: 'leemage',
  title: 'Leemage',
  aliases: ['Leemage'],
  searchTerms: ['Presigned URL'],
}

function buildAnswers(overrides: Record<string, unknown> = {}) {
  return {
    route: { choice: 'llm_planner', confidence: 0.9 },
    contextAction: { choice: 'reset', confidence: 0.9 },
    target: { choice: 'none', confidence: 0.9 },
    operation: { choice: 'explain', confidence: 0.9 },
    comparisonInput: { choice: 'explicit_targets', confidence: 0.9 },
    sourceMode: { choice: 'all', confidence: 0.9 },
    sourceScope: { choice: 'unrestricted', confidence: 0.9 },
    temporal: { choice: 'none', confidence: 0.9 },
    referentKind: { choice: 'none', confidence: 0.9 },
    responseScope: { choice: 'single', confidence: 0.9 },
    catalogRequest: { choice: 'none', confidence: 0.9 },
    socialResponseKind: { choice: 'greeting', confidence: 0.9 },
    githubContact: { choice: 'unspecified', confidence: 0.9 },
    linkedinContact: { choice: 'unspecified', confidence: 0.9 },
    emailContact: { choice: 'unspecified', confidence: 0.9 },
    metadataField: { choice: 'content', confidence: 0.9 },
    needsClarification: { noul: 0.1 },
    ...overrides,
  }
}

describe('planChatIntentWithJev', () => {
  beforeEach(() => {
    systemOneMock.mockReset()
    process.env.TYPESAFE_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.TYPESAFE_API_KEY
  })

  it('준비된 응답을 별도 LLM planner 없이 선택한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        route: { choice: 'identity', confidence: 0.95 },
      }),
    })
    const { planChatIntentWithJev } = await import(
      './plan-chat-intent-with-jev'
    )
    const result = await planChatIntentWithJev({
      question: '너 누구야?',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: { operation: 'identity', requestedFields: [] },
    })
    expect(systemOneMock).toHaveBeenCalledTimes(1)
  })

  it('Jev Choice의 최고 라벨을 임의 confidence 문턱값 없이 사용한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        route: { choice: 'public_contact', confidence: 0.4 },
      }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')

    expect(await planChatIntentWithJev({
      question: '링크드인 어디야?',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })).toMatchObject({
      ok: true,
      queryPlan: {
        operation: 'contact',
        requestedFields: ['contact_methods'],
      },
    })
  })

  it('연락 채널의 포함과 제외를 Jev 결과대로 적용한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        route: { choice: 'public_contact', confidence: 0.9 },
        githubContact: { choice: 'include', confidence: 0.9 },
        emailContact: { choice: 'exclude', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')
    const result = await planChatIntentWithJev({
      question: '이메일 말고 GitHub로 연락할 수 있을까?',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })
    expect(result).toMatchObject({
      ok: true,
      queryPlan: { operation: 'contact', contactChannels: ['github'] },
    })
  })

  it('연도 목록 요청은 해당 연도 전체 카탈로그로 계획한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({ catalogRequest: { choice: 'year', confidence: 0.9 } }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')
    const result = await planChatIntentWithJev({
      question: '2024년에 쓴 글만 보여줘.',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })
    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        catalogRequest: { kind: 'year', year: 2024 },
        sourceSelection: { mode: 'only', categories: ['blog'] },
      },
    })
  })

  it('사람 대명사를 프로젝트 focusedTarget으로 잘못 보존하지 않는다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        contextAction: { choice: 'continue', confidence: 0.9 },
        target: { choice: 'focused', confidence: 0.9 },
        referentKind: { choice: 'person', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')
    const result = await planChatIntentWithJev({
      question: '그 사람은 누구야?',
      locale: 'ko',
      conversationState: {
        ...EMPTY_CHAT_CONVERSATION_STATE,
        focusedTarget: {
          kind: 'named_entity', sourceCategory: 'project', slug: 'leemage', title: 'Leemage',
        },
      },
      entityCandidates: [],
    })
    expect(result).toMatchObject({
      ok: true,
      queryPlan: { targetSelection: { kind: 'none' }, missingSlots: ['target'] },
    })
  })

  it('프로젝트 후속 질문과 운영자 연락처 선택이 충돌하면 프로젝트 문맥을 유지한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        route: { choice: 'public_contact', confidence: 0.7 },
        contextAction: { choice: 'continue', confidence: 0.9 },
        target: { choice: 'focused', confidence: 0.9 },
        referentKind: { choice: 'project', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')
    const result = await planChatIntentWithJev({
      question: '그럼 GitHub는?',
      locale: 'ko',
      conversationState: {
        ...EMPTY_CHAT_CONVERSATION_STATE,
        focusedTarget: {
          kind: 'named_entity', sourceCategory: 'project', slug: 'leemage', title: 'Leemage',
        },
      },
      entityCandidates: [],
    })
    expect(result).toMatchObject({
      ok: true,
      queryPlan: { operation: 'explain', targetSelection: { kind: 'preserve' } },
    })
  })

  it('비공개 연락처 대신 공개 대안도 요청하면 공개 채널을 답한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        route: { choice: 'private_contact', confidence: 0.7 },
        publicContactPart: { choice: 'yes', confidence: 0.9 },
        githubContact: { choice: 'include', confidence: 0.9 },
        responseScope: { choice: 'multiple', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')
    const result = await planChatIntentWithJev({
      question: '전화번호가 없다면 GitHub라도 알려줘',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })
    expect(result).toMatchObject({
      ok: true,
      queryPlan: { operation: 'contact', contactChannels: ['github'] },
    })
  })

  it('개인 GitHub 주소와 저장소 전체 목록 판단이 충돌하면 단일 연락처 요청을 우선한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        route: { choice: 'llm_planner', confidence: 0.6 },
        publicContactPart: { choice: 'yes', confidence: 0.9 },
        githubContact: { choice: 'include', confidence: 0.9 },
        catalogRequest: { choice: 'repositories', confidence: 0.6 },
        responseScope: { choice: 'single', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')
    const result = await planChatIntentWithJev({
      question: '깃허브 주소 좀.',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })
    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        operation: 'contact',
        catalogRequest: { kind: 'none' },
        contactChannels: ['github'],
      },
    })
  })

  it('따옴표 속 비공개 정보 요청은 내용 검색으로 처리한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        route: { choice: 'private_contact', confidence: 0.7 },
        quotedContentLookup: { choice: 'yes', confidence: 0.9 },
        operation: { choice: 'lookup', confidence: 0.9 },
        sourceMode: { choice: 'only', confidence: 0.9 },
        sourceScope: { choice: 'blog', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')
    const result = await planChatIntentWithJev({
      question: '‘전화번호 알려줘’라는 문장이 들어간 글이 있어?',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })
    expect(result).toMatchObject({
      ok: true,
      queryPlan: { operation: 'lookup', sourceSelection: { mode: 'only', categories: ['blog'] } },
    })
  })

  it('운영자 이름과 경력을 함께 묻는 요청은 운영자 단답 경로로 자르지 않는다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        route: { choice: 'owner_identity', confidence: 0.7 },
        responseScope: { choice: 'multiple', confidence: 0.9 },
        ownerIdentityPart: { choice: 'yes', confidence: 0.9 },
        operation: { choice: 'lookup', confidence: 0.9 },
        sourceMode: { choice: 'only', confidence: 0.9 },
        sourceScope: { choice: 'profile', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')
    const result = await planChatIntentWithJev({
      question: '블로그 주인 이름이랑 최근 직장 알려줘.',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })
    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        operation: 'lookup',
        responseScope: 'multiple',
        responseFacets: ['owner_identity'],
      },
    })
  })

  it('공개 연락처와 글 추천을 함께 묻는 요청은 추천 검색을 유지한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        route: { choice: 'public_contact', confidence: 0.7 },
        responseScope: { choice: 'multiple', confidence: 0.9 },
        publicContactPart: { choice: 'yes', confidence: 0.9 },
        githubContact: { choice: 'include', confidence: 0.9 },
        operation: { choice: 'recommend', confidence: 0.9 },
        sourceScope: { choice: 'blog_profile', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')
    const result = await planChatIntentWithJev({
      question: '깃허브 주소 주고 읽을 만한 글도 추천해줘',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })
    expect(result).toMatchObject({
      ok: true,
      queryPlan: { operation: 'recommend', responseFacets: ['public_contact'] },
    })
  })

  it('블로그 글 최신 조회는 Jev의 출처와 대상 판단을 그대로 실행한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        operation: { choice: 'lookup', confidence: 0.9 },
        sourceMode: { choice: 'only', confidence: 0.9 },
        sourceScope: { choice: 'blog', confidence: 0.9 },
        temporal: { choice: 'latest_single', confidence: 0.9 },
        metadataField: { choice: 'title', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')
    const result = await planChatIntentWithJev({
      question: '블로그에서 가장 최근에 작성한 글은 뭐야?',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [
        {
          ...CANDIDATE,
          entityId: 'project/blog',
          slug: 'blog',
          title: '블로그',
          aliases: ['블로그'],
        },
      ],
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        targetSelection: { kind: 'none' },
        sourceSelection: { mode: 'only', categories: ['blog'] },
      },
    })
    if (!result.ok) throw new Error('Jev plan should be valid.')

    const compiled = compileChatRetrievalPlan({
      queryPlan: result.queryPlan,
      candidates: [],
      previousState: EMPTY_CHAT_CONVERSATION_STATE,
      maximumEvidenceCount: 3,
    })
    expect(compiled).toMatchObject({
      ok: true,
      retrievalPlan: {
        executionKind: 'direct_metadata',
        sourceStrategy: 'only',
        sourceCategories: ['blog'],
      },
    })
  })

  it('복합 출처 요청은 하나의 Jev 선택으로 두 출처를 보존한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        sourceMode: { choice: 'only', confidence: 0.9 },
        sourceScope: { choice: 'blog_project', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')
    const result = await planChatIntentWithJev({
      question: '프로젝트 소개와 관련 글을 함께 설명해줘',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        sourceSelection: { mode: 'only', categories: ['blog', 'project'] },
      },
    })
  })

  it('이전 대상에 대한 후속 질문을 검색 질문으로 만든다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        contextAction: { choice: 'continue', confidence: 0.9 },
        target: { choice: 'focused', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import(
      './plan-chat-intent-with-jev'
    )
    const conversationState: ChatConversationState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      focusedTarget: {
        kind: 'named_entity',
        sourceCategory: 'project',
        slug: 'leemage',
        title: 'Leemage',
      },
    }
    const result = await planChatIntentWithJev({
      question: '왜 그렇게 만들었어?',
      locale: 'ko',
      conversationState,
      entityCandidates: [],
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        standaloneQuestion: 'Leemage 왜 그렇게 만들었어?',
        contextAction: 'continue',
        targetSelection: { kind: 'preserve' },
      },
    })
  })

  it('Jev가 후속 대화로 보았으면 target 선택이 none이어도 이전 대상을 보존한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        contextAction: { choice: 'continue', confidence: 0.9 },
        target: { choice: 'none', confidence: 0.7 },
      }),
    })
    const { planChatIntentWithJev } = await import(
      './plan-chat-intent-with-jev'
    )
    const conversationState: ChatConversationState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      focusedTarget: {
        kind: 'named_entity',
        sourceCategory: 'project',
        slug: 'leemage',
        title: 'Leemage',
      },
    }
    const result = await planChatIntentWithJev({
      question: '그건 어디에 나와 있어?',
      locale: 'ko',
      conversationState,
      conversationHistory: [{
        question: 'Leemage에서 Presigned URL을 왜 사용했어?',
        answer: '서버 부하를 줄이기 위해 사용했습니다.',
        citations: [],
      }],
      entityCandidates: [],
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        targetSelection: { kind: 'preserve' },
        standaloneQuestion: 'Leemage 그건 어디에 나와 있어?',
      },
    })
  })

  it('보류된 질문에 대상이 제공되면 이어서 검색한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        contextAction: { choice: 'resolve_clarification', confidence: 0.9 },
        target: { choice: 'candidate_0', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import(
      './plan-chat-intent-with-jev'
    )
    const suspendedQueryPlan = {
      standaloneQuestion: '그 프로젝트 설명해줘',
      contextAction: 'reset' as const,
      targetSelection: { kind: 'none' as const },
      operation: 'explain' as const,
      sourceSelection: { mode: 'all' as const },
      temporalSelection: { mode: 'none' as const },
      requestedFields: ['content' as const],
      requiredConcepts: [],
      optionalConcepts: [],
      missingSlots: ['target' as const],
      clarificationQuestion: '어떤 프로젝트인지 알려주세요.',
      confidence: 'medium' as const,
      reason: 'Missing target.',
    }
    const conversationState: ChatConversationState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      pendingClarification: {
        clarificationQuestion: '어떤 프로젝트인지 알려주세요.',
        suspendedQueryPlan,
      },
    }
    const result = await planChatIntentWithJev({
      question: 'Leemage요',
      locale: 'ko',
      conversationState,
      entityCandidates: [CANDIDATE],
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        standaloneQuestion: 'Leemage 그 프로젝트 설명해줘 Leemage요',
        contextAction: 'reset',
        targetSelection: { kind: 'candidate', entityId: CANDIDATE.entityId },
        missingSlots: [],
      },
    })
  })

  it('대상 없는 비교 질문은 명확화를 요청한다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        operation: { choice: 'compare', confidence: 0.9 },
        comparisonInput: { choice: 'missing_targets', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import(
      './plan-chat-intent-with-jev'
    )
    const result = await planChatIntentWithJev({
      question: '프로젝트 두 개 비교해줘.',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        operation: 'compare',
        missingSlots: ['target'],
        clarificationQuestion: '비교할 두 대상을 알려주세요.',
      },
    })
  })

  it('비교 대상 답변이 오면 보류된 비교 작업을 이어간다', async () => {
    systemOneMock.mockResolvedValueOnce({
      answers: buildAnswers({
        contextAction: { choice: 'resolve_clarification', confidence: 0.9 },
        target: { choice: 'none', confidence: 0.9 },
        operation: { choice: 'compare', confidence: 0.9 },
        comparisonInput: { choice: 'missing_targets', confidence: 0.9 },
      }),
    })
    const { planChatIntentWithJev } = await import('./plan-chat-intent-with-jev')
    const candidates: ChatEntityCandidate[] = [
      {
        ...CANDIDATE,
        entityId: 'profile/about',
        kind: 'profile',
        sourceCategory: 'profile',
        slug: 'about',
        title: 'About Me',
        aliases: ['Leemage'],
      },
      {
        ...CANDIDATE,
        entityId: 'project/copysinger',
        slug: 'copysinger',
        title: 'Copysinger',
        aliases: ['Copysinger'],
      },
      CANDIDATE,
    ]
    const conversationState: ChatConversationState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      pendingClarification: {
        clarificationQuestion: '비교할 두 대상을 알려주세요.',
        suspendedQueryPlan: {
          standaloneQuestion: '프로젝트 두 개 비교해줘.',
          contextAction: 'reset',
          targetSelection: { kind: 'none' },
          operation: 'compare',
          sourceSelection: { mode: 'only', categories: ['project'] },
          temporalSelection: { mode: 'none' },
          requestedFields: ['content'],
          requiredConcepts: [],
          optionalConcepts: [],
          missingSlots: ['target'],
          clarificationQuestion: '비교할 두 대상을 알려주세요.',
          confidence: 'medium',
          reason: '대상 부족',
        },
      },
    }
    const result = await planChatIntentWithJev({
      question: 'Leemage와 Copysinger',
      locale: 'ko',
      conversationState,
      entityCandidates: candidates,
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        operation: 'compare',
        standaloneQuestion: 'Copysinger 프로젝트 두 개 비교해줘. Leemage와 Copysinger',
        sourceSelection: { mode: 'only', categories: ['project'] },
        missingSlots: [],
      },
    })

    if (!result.ok) throw new Error('Comparison plan should be valid.')

    const compiled = compileChatRetrievalPlan({
      queryPlan: result.queryPlan,
      candidates,
      previousState: conversationState,
      maximumEvidenceCount: 6,
    })

    expect(compiled.ok).toBe(true)
    if (!compiled.ok) throw new Error('Comparison retrieval should be valid.')

    expect(compiled.retrievalPlan.executionKind).toBe('retrieve_and_generate')
    expect(compiled.retrievalPlan.canonicalTargets.map((target) => target.slug)).toEqual([
      'copysinger',
      'leemage',
    ])
    expect(compiled.nextConversationState.pendingClarification).toBeNull()
  })
})
