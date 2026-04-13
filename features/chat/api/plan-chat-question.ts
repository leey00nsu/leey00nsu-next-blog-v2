import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'
import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import {
  ChatQuestionPlanSchema,
  type ChatQuestionPlan,
} from '@/features/chat/model/chat-question-plan'
import type { SupportedLocale } from '@/shared/config/constants'
import {
  normalizeChatQuery,
  normalizeQuestionText,
} from '@/features/chat/lib/chat-query-normalization'
import {
  buildChatQuestionContextSnapshot,
  buildPlannerConversationContextText,
} from '@/features/chat/lib/chat-question-context'
import {
  rewriteChatQuestionWithHistory,
  type ChatConversationHistoryItem,
} from '@/features/chat/lib/rewrite-chat-question'
import { CHAT_QUESTION_RULES } from '@/features/chat/config/question-rules'

const CHAT_QUESTION_PLANNER = {
  MAXIMUM_QUESTION_CHARACTERS: 300,
  MAXIMUM_PREFERRED_SOURCE_CATEGORY_COUNT: 4,
  MAXIMUM_ADDITIONAL_KEYWORD_COUNT: 12,
  PLANNER_MODEL_ID: 'gpt-5.4-mini',
  DETERMINISTIC_PATTERNS: {
    CONTACT: [
      '연락',
      '연락처',
      '연락 방법',
      'contact',
      'reach',
      'get in touch',
      'email',
      '이메일',
      'github',
      'linkedin',
    ],
    LATEST: [
      '최신',
      '최근',
      '마지막',
      '마지막 글',
      'latest',
      'recent',
      'last',
      'last post',
    ],
    OLDEST: [
      '오래된',
      '가장 오래된',
      '첫 글',
      '처음 글',
      'oldest',
      'first post',
    ],
    CURRENT_POST: [
      '이 글',
      '이 문서',
      '이 포스트',
      '이 페이지',
      '이거',
      '이건',
      '짧게 소개',
      '핵심',
    ],
    CORPUS: [
      '블로그 전체',
      '전체 글',
      '전체를 보면',
      '공통',
      '공통된',
      '관통',
      '반복되는',
      '여러 글',
      'across the blog',
      'across posts',
      'common patterns',
      'common philosophy',
    ],
    ACTION_SUMMARIZE: ['요약', '요약해', '요약해줘', 'summary', 'summarize'],
    ACTION_EXPLAIN: ['설명', '설명해', 'explain'],
    ACTION_RECOMMEND: ['추천', '추천해', '추천해줘', 'recommend'],
    ACTION_COMPARE: ['비교', 'compare'],
  },
  ASSISTANT_IDENTITY_PATTERNS: [
    '넌 누구야',
    '넌 뭐야',
    '너는 누구야',
    '너는 뭐야',
    'who are you',
    'what are you',
  ],
  PERSON_REFERENCE_PATTERNS: ['이 사람', '그 사람', 'that person', 'this person'],
  CLARIFICATION_QUESTIONS: {
    ko: '누구를 가리키는지 조금 더 구체적으로 적어주세요.',
    en: 'Please clarify who you mean a bit more specifically.',
  },
} as const

const CHAT_QUESTION_PLANNER_PROMPT = {
  SYSTEM: `You are a planner for a grounded blog chatbot.

Return a structured plan, not the final answer.

Fields:
- standaloneQuestion: rewrite the user question into a standalone question that keeps the real intent
- socialPreamble: true if the question starts with a greeting or social preamble
- action: answer | summarize | explain | recommend | compare
- scope: global | current_page
- deterministicAction: none | social_reply | contact | latest_post | oldest_post
- needsRetrieval: whether evidence retrieval should run
- retrievalMode: none | standard | corpus | current_post
- preferredSourceCategories: blog | profile | project | assistant
- additionalKeywords: short retrieval hints or entity terms
- needsClarification: true if the user reference is ambiguous and should be clarified
- clarificationQuestion: short follow-up question when clarification is required
- reason: one short sentence

Rules:
- Do not choose social_reply if there is any substantive question after a greeting.
- Questions about who the chatbot is or what evidence scope it answers from should usually still use retrieval with assistant/profile evidence.
- Use deterministicAction only for pure greetings, public contact questions, latest post questions, or oldest post questions.
- Use current_post only when currentPostContext is true and the user is clearly referring to the current page.
- Use corpus when the user asks about patterns or themes across multiple posts or the whole blog.
- If a pronoun or reference target is ambiguous, prefer clarification over guessing.
- Keep clarificationQuestion null unless needsClarification is true.`,
} as const

interface PlanChatQuestionParams {
  question: string
  locale: SupportedLocale
  conversationHistory?: ChatConversationHistoryItem[]
  currentPostSlug?: string
  assistantProfile?: ChatAssistantProfile | null
}

function trimQuestion(question: string): string {
  return question.slice(0, CHAT_QUESTION_PLANNER.MAXIMUM_QUESTION_CHARACTERS)
}

function includesAnyPattern(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern))
}

function escapeRegularExpression(pattern: string): string {
  return pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

function stripGreetingPreamble(question: string): {
  normalizedQuestion: string
  strippedQuestion: string
  socialPreamble: boolean
} {
  const normalizedQuestion = normalizeQuestionText(question)
  let strippedQuestion = normalizedQuestion
  let socialPreamble = false

  for (const greetingPattern of CHAT_QUESTION_RULES.GREETING_PATTERNS) {
    const greetingPatternExpression = new RegExp(
      String.raw`^${escapeRegularExpression(greetingPattern)}(?:\s+|$)`,
      'iu',
    )

    if (!greetingPatternExpression.test(strippedQuestion)) {
      continue
    }

    strippedQuestion = strippedQuestion.replace(greetingPatternExpression, '').trim()
    socialPreamble = true
  }

  return {
    normalizedQuestion,
    strippedQuestion,
    socialPreamble,
  }
}

function buildPlannerAction(normalizedQuestion: string): ChatQuestionPlan['action'] {
  if (
    includesAnyPattern(
      normalizedQuestion,
      CHAT_QUESTION_PLANNER.DETERMINISTIC_PATTERNS.ACTION_SUMMARIZE,
    )
  ) {
    return 'summarize'
  }

  if (
    includesAnyPattern(
      normalizedQuestion,
      CHAT_QUESTION_PLANNER.DETERMINISTIC_PATTERNS.ACTION_EXPLAIN,
    )
  ) {
    return 'explain'
  }

  if (
    includesAnyPattern(
      normalizedQuestion,
      CHAT_QUESTION_PLANNER.DETERMINISTIC_PATTERNS.ACTION_RECOMMEND,
    )
  ) {
    return 'recommend'
  }

  if (
    includesAnyPattern(
      normalizedQuestion,
      CHAT_QUESTION_PLANNER.DETERMINISTIC_PATTERNS.ACTION_COMPARE,
    )
  ) {
    return 'compare'
  }

  return 'answer'
}

function buildDeterministicAction(params: {
  normalizedQuestion: string
  strippedQuestion: string
}): ChatQuestionPlan['deterministicAction'] {
  if (
    params.strippedQuestion.length === 0 &&
    params.normalizedQuestion.length > 0
  ) {
    return 'social_reply'
  }

  if (
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_PLANNER.DETERMINISTIC_PATTERNS.CONTACT,
    )
  ) {
    return 'contact'
  }

  if (
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_PLANNER.DETERMINISTIC_PATTERNS.LATEST,
    )
  ) {
    return 'latest_post'
  }

  if (
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_PLANNER.DETERMINISTIC_PATTERNS.OLDEST,
    )
  ) {
    return 'oldest_post'
  }

  return 'none'
}

function buildStandaloneQuestion(params: {
  question: string
  conversationHistory?: ChatConversationHistoryItem[]
}): {
  standaloneQuestion: string
  socialPreamble: boolean
  normalizedQuestion: string
  strippedQuestion: string
} {
  const { normalizedQuestion, strippedQuestion, socialPreamble } =
    stripGreetingPreamble(params.question)
  const rewrittenQuestion = rewriteChatQuestionWithHistory({
    question: strippedQuestion || normalizedQuestion,
    conversationHistory: params.conversationHistory,
  })

  return {
    standaloneQuestion: normalizeQuestionText(rewrittenQuestion),
    socialPreamble,
    normalizedQuestion,
    strippedQuestion,
  }
}

function buildAssistantIdentityKeywords(params: {
  assistantProfile?: ChatAssistantProfile | null
}): string[] {
  if (!params.assistantProfile) {
    return ['assistant', 'chatbot', '챗봇']
  }

  return [
    params.assistantProfile.chatbotName,
    params.assistantProfile.ownerName,
    ...params.assistantProfile.aliases,
    'assistant',
    'chatbot',
    '챗봇',
    'profile',
  ]
}

function isAssistantIdentityQuestion(params: {
  normalizedQuestion: string
  assistantProfile?: ChatAssistantProfile | null
}): boolean {
  if (
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_PLANNER.ASSISTANT_IDENTITY_PATTERNS,
    )
  ) {
    return true
  }

  if (!params.assistantProfile) {
    return false
  }

  return params.assistantProfile.aliases.some((alias) => {
    return params.normalizedQuestion.includes(alias.toLowerCase())
  })
}

function buildClarificationQuestion(locale: SupportedLocale): string {
  return CHAT_QUESTION_PLANNER.CLARIFICATION_QUESTIONS[locale]
}

function limitPreferredSourceCategories(
  preferredSourceCategories: ChatSourceCategory[],
): ChatSourceCategory[] {
  return preferredSourceCategories.slice(
    0,
    CHAT_QUESTION_PLANNER.MAXIMUM_PREFERRED_SOURCE_CATEGORY_COUNT,
  )
}

function limitAdditionalKeywords(additionalKeywords: string[]): string[] {
  return additionalKeywords.slice(
    0,
    CHAT_QUESTION_PLANNER.MAXIMUM_ADDITIONAL_KEYWORD_COUNT,
  )
}

function buildContextPreferredSourceCategories(params: {
  normalizedQuestion: string
  contextSnapshot: ReturnType<typeof buildChatQuestionContextSnapshot>
}): ChatSourceCategory[] {
  const hasPersonReference = includesAnyPattern(
    params.normalizedQuestion,
    CHAT_QUESTION_PLANNER.PERSON_REFERENCE_PATTERNS,
  )

  if (!hasPersonReference) {
    return []
  }

  return [
    ...new Set(
      params.contextSnapshot.latestCitationSourceCategories.filter(
        (sourceCategory) => {
          return sourceCategory === 'profile' || sourceCategory === 'assistant'
        },
      ),
    ),
  ]
}

function shouldClarifyPersonReference(params: {
  normalizedQuestion: string
  contextSnapshot: ReturnType<typeof buildChatQuestionContextSnapshot>
}): boolean {
  const hasPersonReference = includesAnyPattern(
    params.normalizedQuestion,
    CHAT_QUESTION_PLANNER.PERSON_REFERENCE_PATTERNS,
  )

  if (!hasPersonReference) {
    return false
  }

  return !params.contextSnapshot.latestCitationSourceCategories.some(
    (sourceCategory) => {
      return sourceCategory === 'profile' || sourceCategory === 'assistant'
    },
  )
}

function buildFallbackQuestionPlan(params: PlanChatQuestionParams): ChatQuestionPlan {
  const contextSnapshot = buildChatQuestionContextSnapshot({
    conversationHistory: params.conversationHistory,
    currentPostSlug: params.currentPostSlug,
  })
  const {
    standaloneQuestion,
    socialPreamble,
    normalizedQuestion,
    strippedQuestion,
  } = buildStandaloneQuestion({
    question: params.question,
    conversationHistory: params.conversationHistory,
  })
  const action = buildPlannerAction(normalizedQuestion)
  const deterministicAction = buildDeterministicAction({
    normalizedQuestion,
    strippedQuestion,
  })
  const normalizedStandaloneQuestion = normalizeQuestionText(standaloneQuestion)
  const normalizedChatQuery = normalizeChatQuery({
    question: normalizedStandaloneQuestion,
    locale: params.locale,
  })
  const assistantIdentityQuestion = isAssistantIdentityQuestion({
    normalizedQuestion: normalizedStandaloneQuestion.toLowerCase(),
    assistantProfile: params.assistantProfile,
  })
  const contextPreferredSourceCategories = buildContextPreferredSourceCategories(
    {
      normalizedQuestion: normalizedStandaloneQuestion,
      contextSnapshot,
    },
  )
  const preferredSourceCategories: ChatSourceCategory[] = assistantIdentityQuestion
    ? ['assistant', 'profile']
    : limitPreferredSourceCategories([
        ...new Set([
          ...normalizedChatQuery.preferredSourceCategories,
          ...contextPreferredSourceCategories,
        ]),
      ])
  const additionalKeywords = assistantIdentityQuestion
    ? limitAdditionalKeywords(
        buildAssistantIdentityKeywords({
          assistantProfile: params.assistantProfile,
        }),
      )
    : limitAdditionalKeywords(normalizedChatQuery.additionalKeywords)
  const needsClarification =
    deterministicAction === 'none' &&
    shouldClarifyPersonReference({
      normalizedQuestion: normalizedStandaloneQuestion,
      contextSnapshot,
    })
  const retrievalMode =
    deterministicAction === 'none' && !needsClarification
      ? params.currentPostSlug &&
          includesAnyPattern(
            normalizedStandaloneQuestion,
            CHAT_QUESTION_PLANNER.DETERMINISTIC_PATTERNS.CURRENT_POST,
          )
        ? 'current_post'
        : includesAnyPattern(
              normalizedStandaloneQuestion,
              CHAT_QUESTION_PLANNER.DETERMINISTIC_PATTERNS.CORPUS,
            )
          ? 'corpus'
          : 'standard'
      : 'none'

  return {
    standaloneQuestion:
      strippedQuestion.length === 0 ? normalizedQuestion : normalizedStandaloneQuestion,
    socialPreamble,
    action,
    scope: retrievalMode === 'current_post' ? 'current_page' : 'global',
    deterministicAction,
    needsRetrieval:
      deterministicAction === 'none' && !needsClarification,
    retrievalMode,
    preferredSourceCategories,
    additionalKeywords,
    needsClarification,
    clarificationQuestion: needsClarification
      ? buildClarificationQuestion(params.locale)
      : null,
    reason:
      deterministicAction === 'none'
        ? needsClarification
          ? 'fallback clarification planner result'
          : 'fallback retrieval planner result'
        : 'fallback deterministic planner result',
  }
}

function normalizePlannedQuestionPlan(params: {
  plannedQuestionPlan: ChatQuestionPlan
  plannerParams: PlanChatQuestionParams
}): ChatQuestionPlan {
  const fallbackQuestionPlan = buildFallbackQuestionPlan(params.plannerParams)

  if (fallbackQuestionPlan.needsClarification) {
    return {
      ...fallbackQuestionPlan,
      reason: params.plannedQuestionPlan.reason,
    }
  }

  if (fallbackQuestionPlan.deterministicAction !== 'none') {
    return {
      ...fallbackQuestionPlan,
      reason: params.plannedQuestionPlan.reason,
    }
  }

  if (
    fallbackQuestionPlan.preferredSourceCategories.includes('assistant') &&
    fallbackQuestionPlan.preferredSourceCategories.includes('profile')
  ) {
    return {
      ...fallbackQuestionPlan,
      reason: params.plannedQuestionPlan.reason,
    }
  }

  return {
    ...params.plannedQuestionPlan,
    standaloneQuestion: fallbackQuestionPlan.standaloneQuestion,
    socialPreamble:
      params.plannedQuestionPlan.socialPreamble ||
      fallbackQuestionPlan.socialPreamble,
    preferredSourceCategories: limitPreferredSourceCategories([
      ...new Set([
        ...params.plannedQuestionPlan.preferredSourceCategories,
        ...fallbackQuestionPlan.preferredSourceCategories,
      ]),
    ]),
    additionalKeywords: limitAdditionalKeywords([
      ...new Set([
        ...params.plannedQuestionPlan.additionalKeywords,
        ...fallbackQuestionPlan.additionalKeywords,
      ]),
    ]),
  }
}

export async function planChatQuestion(
  params: PlanChatQuestionParams,
): Promise<ChatQuestionPlan> {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackQuestionPlan(params)
  }

  try {
    const contextSnapshot = buildChatQuestionContextSnapshot({
      conversationHistory: params.conversationHistory,
      currentPostSlug: params.currentPostSlug,
    })
    const { output } = await generateText({
      model: openai(
        process.env.OPENAI_BLOG_CHAT_ROUTER_MODEL ??
          process.env.OPENAI_BLOG_CHAT_MODEL ??
          CHAT_QUESTION_PLANNER.PLANNER_MODEL_ID,
      ),
      temperature: 0,
      output: Output.object({
        schema: ChatQuestionPlanSchema,
      }),
      system: CHAT_QUESTION_PLANNER_PROMPT.SYSTEM,
      prompt: [
        `locale=${params.locale}`,
        `assistantChatbotName=${params.assistantProfile?.chatbotName ?? ''}`,
        `assistantOwnerName=${params.assistantProfile?.ownerName ?? ''}`,
        buildPlannerConversationContextText(contextSnapshot),
        `question=${trimQuestion(params.question)}`,
      ].join('\n'),
    })

    return normalizePlannedQuestionPlan({
      plannedQuestionPlan: output as ChatQuestionPlan,
      plannerParams: params,
    })
  } catch {
    return buildFallbackQuestionPlan(params)
  }
}
