import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { GENERATED_BLOG_SEARCH_RECORDS } from '@/entities/post/config/blog-search-records.generated'
import { answerBlogQuestion } from '@/features/chat/api/answer-blog-question'
import {
  planChatIntent,
  type PlanChatIntentResult,
} from '@/features/chat/api/plan-chat-intent-patch'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { finalizeBlogChatResponse } from '@/features/chat/lib/blog-chat-response'
import { buildChatRefusalResponse } from '@/features/chat/lib/build-chat-refusal-response'
import { buildFollowUpSuggestions } from '@/features/chat/lib/build-follow-up-suggestions'
import { buildChatRetrievalPlanCacheKey } from '@/features/chat/lib/chat-intent-cache-key'
import { matchChatEntityCandidates } from '@/features/chat/lib/match-chat-entity-candidates'
import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'
import {
  getCachedBlogChatResponse,
  setCachedBlogChatResponse,
} from '@/features/chat/model/blog-chat-response-cache'
import type { ChatContactProfile } from '@/features/chat/model/chat-contact'
import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { ChatQueryPlan } from '@/features/chat/model/chat-query-plan'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'
import {
  findSemanticCachedBlogChatResponse,
  storeSemanticCachedBlogChatResponse,
} from '@/features/chat/model/chat-semantic-cache'
import {
  compileChatRetrievalPlan,
  type CompileChatRetrievalPlanFailureKind,
} from '@/features/chat/model/compile-chat-retrieval-plan'
import {
  executeChatRetrievalPlan,
  type ExecuteChatRetrievalPlanResult,
} from '@/features/chat/model/execute-chat-retrieval-plan'
import { getChatEntityCandidates } from '@/features/chat/model/get-chat-entity-candidates'
import { getCuratedChatSources } from '@/features/chat/model/get-curated-chat-sources'
import {
  BlogChatApplicationResponseSchema,
  BlogChatResponseSchema,
  type BlogChatApplicationResponse,
  type BlogChatModelDraft,
  type BlogChatRequest,
  type BlogChatResponse,
} from '@/features/chat/model/chat-schema'

interface PlanQueryDependencyParams {
  question: string
  locale: BlogChatRequest['locale']
  conversationState: BlogChatRequest['conversationState']
  conversationHistory: BlogChatRequest['conversationHistory']
  currentPostSlug?: string
  assistantProfile?: ChatAssistantProfile | null
  entityCandidates: ChatEntityCandidate[]
}

interface AnswerQuestionDependencyResult {
  ok: boolean
  draftAnswer?: BlogChatModelDraft
  refusalReason?: 'missing_api_key' | 'model_error'
}

interface ChatWorkflowDependencies {
  getEntityCandidates: typeof getChatEntityCandidates
  planQuery: (
    params: PlanQueryDependencyParams,
  ) => Promise<PlanChatIntentResult>
  executeRetrievalPlan: (params: {
    plan: ChatRetrievalPlan
    locale: BlogChatRequest['locale']
  }) => Promise<ExecuteChatRetrievalPlanResult>
  answerQuestion: (params: {
    question: string
    matches: ChatEvidenceRecord[]
  }) => Promise<AnswerQuestionDependencyResult>
  getCachedResponse: (cacheKey: string) => BlogChatResponse | null
  setCachedResponse: (params: {
    cacheKey: string
    responseData: BlogChatResponse
  }) => void
  findSemanticResponse: typeof findSemanticCachedBlogChatResponse
  storeSemanticResponse: typeof storeSemanticCachedBlogChatResponse
}

interface RunChatWorkflowParams {
  request: BlogChatRequest
  assistantProfile?: ChatAssistantProfile | null
  contactProfile?: ChatContactProfile | null
  dependencies?: Partial<ChatWorkflowDependencies>
}

export type ChatWorkflowFailureKind =
  | 'planner_unavailable'
  | 'invalid_intent_plan'
  | CompileChatRetrievalPlanFailureKind
  | 'answer_model_error'
  | 'ungrounded_answer'
  | 'workflow_error'

export interface ChatWorkflowResult {
  applicationResponse: BlogChatApplicationResponse
  queryPlan: ChatQueryPlan | null
  retrievalPlan: ChatRetrievalPlan | null
  execution: ExecuteChatRetrievalPlanResult | null
  cacheKind: 'none' | 'exact' | 'semantic'
  failureKind: ChatWorkflowFailureKind | null
  graphPath: string[]
}

interface ChatWorkflowState {
  request: BlogChatRequest
  assistantProfile: ChatAssistantProfile | null
  contactProfile: ChatContactProfile | null
  entityCandidates: ChatEntityCandidate[]
  queryPlan: ChatQueryPlan | null
  retrievalPlan: ChatRetrievalPlan | null
  nextConversationState: ChatConversationState
  execution: ExecuteChatRetrievalPlanResult | null
  matches: ChatEvidenceRecord[]
  response: BlogChatResponse | null
  applicationResponse: BlogChatApplicationResponse | null
  cacheKey: string
  cacheKind: ChatWorkflowResult['cacheKind']
  failureKind: ChatWorkflowFailureKind | null
  shouldStoreCache: boolean
  graphPath: string[]
}

const CHAT_WORKFLOW_STATE = Annotation.Root({
  request: Annotation<BlogChatRequest>(),
  assistantProfile: Annotation<ChatAssistantProfile | null>(),
  contactProfile: Annotation<ChatContactProfile | null>(),
  entityCandidates: Annotation<ChatEntityCandidate[]>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => [],
  }),
  queryPlan: Annotation<ChatQueryPlan | null>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => null,
  }),
  retrievalPlan: Annotation<ChatRetrievalPlan | null>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => null,
  }),
  nextConversationState: Annotation<ChatConversationState>(),
  execution: Annotation<ExecuteChatRetrievalPlanResult | null>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => null,
  }),
  matches: Annotation<ChatEvidenceRecord[]>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => [],
  }),
  response: Annotation<BlogChatResponse | null>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => null,
  }),
  applicationResponse: Annotation<BlogChatApplicationResponse | null>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => null,
  }),
  cacheKey: Annotation<string>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => '',
  }),
  cacheKind: Annotation<ChatWorkflowResult['cacheKind']>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => 'none',
  }),
  failureKind: Annotation<ChatWorkflowFailureKind | null>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => null,
  }),
  shouldStoreCache: Annotation<boolean>({
    reducer: (_previousValue, nextValue) => nextValue,
    default: () => false,
  }),
  graphPath: Annotation<string[]>({
    reducer: (previousValue, nextValue) => [...previousValue, ...nextValue],
    default: () => [],
  }),
})

const CHAT_WORKFLOW_RESPONSES = {
  ko: {
    CLARIFICATION: '답변에 필요한 대상을 조금 더 구체적으로 알려주세요.',
    SOCIAL_REPLY: '안녕하세요. 무엇을 찾고 계신가요?',
    CONTACT_INTRO: '공개된 연락 채널은 다음과 같습니다.',
    CONTACT_OUTRO: '자세한 정보는 소개 페이지에서 확인할 수 있어요.',
  },
  en: {
    CLARIFICATION: 'Please specify the target needed to answer the question.',
    SOCIAL_REPLY: 'Hi there. What are you looking for?',
    CONTACT_INTRO: 'The public contact channels are:',
    CONTACT_OUTRO: 'You can find the details on the About page.',
  },
} as const

const DIRECT_CHAT_EXECUTION_KINDS = new Set<ChatRetrievalPlan['executionKind']>(
  ['clarification', 'social_reply', 'identity', 'contact'],
)

const CHAT_CONTACT_METHOD_ALIASES = {
  GitHub: ['github', '깃허브'],
  LinkedIn: ['linkedin', '링크드인'],
  Email: ['email', 'e-mail', '이메일', '메일'],
} as const

interface RequestedContactMethodSelection {
  hasSpecificRequest: boolean
  methods: ChatContactProfile['methods']
}

function selectRequestedContactMethods(params: {
  question: string
  methods: ChatContactProfile['methods']
}): RequestedContactMethodSelection {
  const normalizedQuestion = params.question.toLowerCase()
  const requestedMethodLabels = Object.entries(
    CHAT_CONTACT_METHOD_ALIASES,
  ).flatMap(([methodLabel, aliases]) => {
    return aliases.some((alias) => normalizedQuestion.includes(alias))
      ? [methodLabel.toLowerCase()]
      : []
  })

  if (requestedMethodLabels.length === 0) {
    return {
      hasSpecificRequest: false,
      methods: params.methods,
    }
  }

  return {
    hasSpecificRequest: true,
    methods: params.methods.filter((method) => {
      const normalizedMethod = `${method.label} ${method.url}`.toLowerCase()

      return requestedMethodLabels.some((requestedMethodLabel) => {
        return normalizedMethod.includes(requestedMethodLabel)
      })
    }),
  }
}

function buildContactResponse(params: {
  request: BlogChatRequest
  contactProfile: ChatContactProfile | null
  retrievalPlan: ChatRetrievalPlan
}): BlogChatResponse {
  const contactProfile = params.contactProfile

  if (!contactProfile || contactProfile.methods.length === 0) {
    return buildChatRefusalResponse({
      locale: params.request.locale,
      refusalReason: 'insufficient_search_match',
    })
  }

  const responses = CHAT_WORKFLOW_RESPONSES[params.request.locale]
  const contactMethodSelection = selectRequestedContactMethods({
    question: params.retrievalPlan.standaloneQuestion,
    methods: contactProfile.methods,
  })

  if (
    contactMethodSelection.hasSpecificRequest &&
    contactMethodSelection.methods.length === 0
  ) {
    return buildChatRefusalResponse({
      locale: params.request.locale,
      refusalReason: 'insufficient_search_match',
    })
  }

  return {
    answer: [
      responses.CONTACT_INTRO,
      ...contactMethodSelection.methods.map((method) => {
        return `- ${method.label}: ${method.url}`
      }),
      '',
      responses.CONTACT_OUTRO,
    ].join('\n'),
    grounded: true,
    citations: [
      {
        title: contactProfile.title,
        url: contactProfile.aboutUrl,
        sectionTitle: null,
        sourceCategory: 'profile',
      },
    ],
  }
}

async function executeDefaultRetrievalPlan(params: {
  plan: ChatRetrievalPlan
  locale: BlogChatRequest['locale']
}): Promise<ExecuteChatRetrievalPlanResult> {
  const blogRecords: ChatEvidenceRecord[] = (
    GENERATED_BLOG_SEARCH_RECORDS[params.locale] ?? []
  ).map((record) => {
    return {
      ...record,
      sourceCategory: 'blog' as const,
      evidenceTime: record.publishedAt
        ? { kind: 'published' as const, value: record.publishedAt }
        : undefined,
    }
  })
  const curatedRecords = await getCuratedChatSources(params.locale)

  return executeChatRetrievalPlan({
    plan: params.plan,
    locale: params.locale,
    blogRecords,
    curatedRecords,
  })
}

const DEFAULT_DEPENDENCIES: ChatWorkflowDependencies = {
  getEntityCandidates: getChatEntityCandidates,
  planQuery: planChatIntent,
  executeRetrievalPlan: executeDefaultRetrievalPlan,
  answerQuestion: answerBlogQuestion,
  getCachedResponse: getCachedBlogChatResponse,
  setCachedResponse: setCachedBlogChatResponse,
  findSemanticResponse: findSemanticCachedBlogChatResponse,
  storeSemanticResponse: storeSemanticCachedBlogChatResponse,
}

function buildChatWorkflow(dependencies: ChatWorkflowDependencies) {
  return new StateGraph(CHAT_WORKFLOW_STATE)
    .addNode('resolve-context', async (state) => {
      const allCandidates = await dependencies.getEntityCandidates(
        state.request.locale,
      )

      return {
        entityCandidates: matchChatEntityCandidates({
          question: state.request.question,
          candidates: allCandidates,
        }),
        graphPath: ['resolve-context'],
      }
    })
    .addNode('plan-query', async (state) => {
      const plannerResult = await dependencies.planQuery({
        question: state.request.question,
        locale: state.request.locale,
        conversationState: state.request.conversationState,
        conversationHistory: state.request.conversationHistory,
        currentPostSlug: state.request.currentPostSlug,
        assistantProfile: state.assistantProfile,
        entityCandidates: state.entityCandidates,
      })

      if (!plannerResult.ok) {
        return {
          response: buildChatRefusalResponse({
            locale: state.request.locale,
            refusalReason: plannerResult.refusalReason,
          }),
          failureKind: plannerResult.failureKind,
          graphPath: ['plan-query'],
        }
      }

      return {
        queryPlan: plannerResult.queryPlan,
        graphPath: ['plan-query'],
      }
    })
    .addNode('compile-plan', (state) => {
      if (!state.queryPlan) {
        return { graphPath: ['compile-plan'] }
      }

      const compileResult = compileChatRetrievalPlan({
        queryPlan: state.queryPlan,
        candidates: state.entityCandidates,
        previousState: state.request.conversationState,
        currentPostSlug: state.request.currentPostSlug,
        maximumEvidenceCount: BLOG_CHAT.SEARCH.TOP_K,
      })

      if (!compileResult.ok) {
        return {
          response: buildChatRefusalResponse({
            locale: state.request.locale,
            refusalReason: 'model_error',
          }),
          failureKind: compileResult.failureKind,
          nextConversationState: compileResult.nextConversationState,
          graphPath: ['compile-plan'],
        }
      }

      return {
        queryPlan: compileResult.queryPlan,
        retrievalPlan: compileResult.retrievalPlan,
        nextConversationState: compileResult.nextConversationState,
        graphPath: ['compile-plan'],
      }
    })
    .addNode('cache-lookup', async (state) => {
      if (!state.retrievalPlan) {
        return { graphPath: ['cache-lookup'] }
      }

      const cacheKey = buildChatRetrievalPlanCacheKey({
        locale: state.request.locale,
        retrievalPlan: state.retrievalPlan,
        currentPostSlug: state.request.currentPostSlug,
        evidenceVersion: BLOG_CHAT.EVIDENCE_VERSION,
      })
      const exactResponse = dependencies.getCachedResponse(cacheKey)

      if (exactResponse) {
        return {
          cacheKey,
          cacheKind: 'exact' as const,
          response: exactResponse,
          graphPath: ['cache-lookup'],
        }
      }

      const semanticResponse = await dependencies.findSemanticResponse({
        locale: state.request.locale,
        question: state.retrievalPlan.standaloneQuestion,
        currentPostSlug: state.request.currentPostSlug,
        intentCacheKey: cacheKey,
      })

      return semanticResponse
        ? {
            cacheKey,
            cacheKind: 'semantic' as const,
            response: semanticResponse,
            graphPath: ['cache-lookup'],
          }
        : { cacheKey, graphPath: ['cache-lookup'] }
    })
    .addNode('execute-direct', async (state) => {
      const retrievalPlan = state.retrievalPlan

      if (!retrievalPlan) {
        return { graphPath: ['execute-direct'] }
      }

      if (retrievalPlan.executionKind === 'clarification') {
        return {
          response: {
            answer:
              state.queryPlan?.clarificationQuestion ??
              CHAT_WORKFLOW_RESPONSES[state.request.locale].CLARIFICATION,
            citations: [],
            grounded: false,
          },
          graphPath: ['execute-direct'],
        }
      }

      if (retrievalPlan.executionKind === 'social_reply') {
        return {
          response: {
            answer:
              state.assistantProfile?.greetingAnswer ??
              CHAT_WORKFLOW_RESPONSES[state.request.locale].SOCIAL_REPLY,
            citations: [],
            grounded: false,
          },
          graphPath: ['execute-direct'],
        }
      }

      if (retrievalPlan.executionKind === 'identity') {
        return {
          response: {
            answer:
              state.assistantProfile?.identityAnswer ??
              CHAT_WORKFLOW_RESPONSES[state.request.locale].SOCIAL_REPLY,
            citations: [],
            grounded: false,
          },
          graphPath: ['execute-direct'],
        }
      }

      if (retrievalPlan.executionKind === 'contact') {
        return {
          response: buildContactResponse({
            request: state.request,
            contactProfile: state.contactProfile,
            retrievalPlan,
          }),
          graphPath: ['execute-direct'],
        }
      }

      const execution = await dependencies.executeRetrievalPlan({
        plan: retrievalPlan,
        locale: state.request.locale,
      })

      return {
        execution,
        matches: execution.matches,
        response:
          execution.kind === 'direct'
            ? execution.response
            : buildChatRefusalResponse({
                locale: state.request.locale,
                refusalReason: 'insufficient_search_match',
              }),
        graphPath: ['execute-direct'],
      }
    })
    .addNode('retrieve-evidence', async (state) => {
      if (!state.retrievalPlan) {
        return { graphPath: ['retrieve-evidence'] }
      }

      const execution = await dependencies.executeRetrievalPlan({
        plan: state.retrievalPlan,
        locale: state.request.locale,
      })

      return {
        execution,
        matches: execution.matches,
        response:
          execution.kind === 'refusal'
            ? buildChatRefusalResponse({
                locale: state.request.locale,
                refusalReason: execution.refusalReason,
              })
            : execution.kind === 'direct'
              ? execution.response
              : null,
        graphPath: ['retrieve-evidence'],
      }
    })
    .addNode('generate-answer', async (state) => {
      if (!state.retrievalPlan || state.matches.length === 0) {
        return { graphPath: ['generate-answer'] }
      }

      const answerResult = await dependencies.answerQuestion({
        question: state.retrievalPlan.standaloneQuestion,
        matches: state.matches,
      })

      if (!answerResult.ok || !answerResult.draftAnswer) {
        return {
          response: buildChatRefusalResponse({
            locale: state.request.locale,
            refusalReason: answerResult.refusalReason ?? 'model_error',
          }),
          failureKind: 'answer_model_error' as const,
          graphPath: ['generate-answer'],
        }
      }

      return {
        response: finalizeBlogChatResponse({
          draftAnswer: answerResult.draftAnswer,
          matches: state.matches,
          locale: state.request.locale,
        }),
        graphPath: ['generate-answer'],
      }
    })
    .addNode('validate-response', (state) => {
      const parsedResponse = BlogChatResponseSchema.safeParse(state.response)

      if (!parsedResponse.success) {
        return {
          response: buildChatRefusalResponse({
            locale: state.request.locale,
            refusalReason: 'model_error',
          }),
          failureKind: 'ungrounded_answer' as const,
          shouldStoreCache: false,
          graphPath: ['validate-response'],
        }
      }

      const response = parsedResponse.data
      const validatedResponse =
        response.grounded && response.citations.length > 0
          ? BlogChatResponseSchema.parse({
              ...response,
              followUpSuggestions: buildFollowUpSuggestions({
                locale: state.request.locale,
                citations: response.citations,
                matches: state.matches,
              }),
            })
          : response

      return {
        response: validatedResponse,
        shouldStoreCache:
          validatedResponse.grounded && validatedResponse.citations.length > 0,
        failureKind:
          state.execution?.kind === 'evidence' && !validatedResponse.grounded
            ? ('ungrounded_answer' as const)
            : state.failureKind,
        graphPath: ['validate-response'],
      }
    })
    .addNode('store-cache', async (state) => {
      if (!state.response || !state.cacheKey) {
        return { graphPath: ['store-cache'] }
      }

      dependencies.setCachedResponse({
        cacheKey: state.cacheKey,
        responseData: state.response,
      })
      await dependencies.storeSemanticResponse({
        locale: state.request.locale,
        question: state.retrievalPlan?.standaloneQuestion ?? '',
        currentPostSlug: state.request.currentPostSlug,
        intentCacheKey: state.cacheKey,
        response: state.response,
      })

      return { graphPath: ['store-cache'] }
    })
    .addNode('finalize', (state) => {
      const response =
        state.response ??
        buildChatRefusalResponse({
          locale: state.request.locale,
          refusalReason: 'model_error',
        })

      return {
        applicationResponse: BlogChatApplicationResponseSchema.parse({
          response,
          conversationState: state.nextConversationState,
        }),
        graphPath: ['finalize'],
      }
    })
    .addEdge(START, 'resolve-context')
    .addEdge('resolve-context', 'plan-query')
    .addConditionalEdges('plan-query', (state) => {
      return state.queryPlan ? 'compile-plan' : 'finalize'
    })
    .addConditionalEdges('compile-plan', (state) => {
      if (!state.retrievalPlan) {
        return 'finalize'
      }

      return DIRECT_CHAT_EXECUTION_KINDS.has(state.retrievalPlan.executionKind)
        ? 'execute-direct'
        : 'cache-lookup'
    })
    .addConditionalEdges('cache-lookup', (state) => {
      if (state.response) {
        return 'finalize'
      }

      return state.retrievalPlan?.executionKind === 'direct_metadata'
        ? 'execute-direct'
        : 'retrieve-evidence'
    })
    .addEdge('execute-direct', 'validate-response')
    .addConditionalEdges('retrieve-evidence', (state) => {
      return state.execution?.kind === 'evidence'
        ? 'generate-answer'
        : 'validate-response'
    })
    .addEdge('generate-answer', 'validate-response')
    .addConditionalEdges('validate-response', (state) => {
      return state.shouldStoreCache ? 'store-cache' : 'finalize'
    })
    .addEdge('store-cache', 'finalize')
    .addEdge('finalize', END)
    .compile()
}

function buildWorkflowResult(state: ChatWorkflowState): ChatWorkflowResult {
  return {
    applicationResponse:
      state.applicationResponse ??
      BlogChatApplicationResponseSchema.parse({
        response: buildChatRefusalResponse({
          locale: state.request.locale,
          refusalReason: 'model_error',
        }),
        conversationState: state.request.conversationState,
      }),
    queryPlan: state.queryPlan,
    retrievalPlan: state.retrievalPlan,
    execution: state.execution,
    cacheKind: state.cacheKind,
    failureKind: state.failureKind,
    graphPath: state.graphPath,
  }
}

export async function runChatWorkflow({
  request,
  assistantProfile = null,
  contactProfile = null,
  dependencies: dependencyOverrides = {},
}: RunChatWorkflowParams): Promise<ChatWorkflowResult> {
  const dependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...dependencyOverrides,
  }

  try {
    const workflow = buildChatWorkflow(dependencies)
    const state = await workflow.invoke({
      request,
      assistantProfile,
      contactProfile,
      nextConversationState: request.conversationState,
    })

    return buildWorkflowResult(state as ChatWorkflowState)
  } catch {
    return {
      applicationResponse: BlogChatApplicationResponseSchema.parse({
        response: buildChatRefusalResponse({
          locale: request.locale,
          refusalReason: 'model_error',
        }),
        conversationState: request.conversationState,
      }),
      queryPlan: null,
      retrievalPlan: null,
      execution: null,
      cacheKind: 'none',
      failureKind: 'workflow_error',
      graphPath: [],
    }
  }
}
