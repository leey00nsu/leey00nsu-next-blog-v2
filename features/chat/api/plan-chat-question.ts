import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { ChatIntentFrameSchema } from '@/features/chat/model/chat-intent-frame'
import {
  ChatQuestionPlanSchema,
  type ChatQuestionPlanResult,
} from '@/features/chat/model/chat-question-plan'
import { buildChatQuestionPlanFromIntentFrame } from '@/features/chat/model/resolve-chat-intent-frame'
import {
  buildChatQuestionContextSnapshot,
  buildPlannerConversationContextText,
} from '@/features/chat/lib/chat-question-context'
import type { ChatConversationHistoryItem } from '@/features/chat/model/chat-conversation-history'
import type { ChatQuestionPlan } from '@/features/chat/model/chat-question-plan'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_QUESTION_PLANNER_PROMPT = {
  SYSTEM: `You are a planner for a grounded blog chatbot.

Return a structured plan, not the final answer.

Fields:
- standaloneQuestion: rewrite the user question into a standalone question that keeps the real intent
- domain: general | blog | profile | project | assistant
- operation: answer | summarize | explain | recommend | compare | social_reply | contact
- target: the source or entity the user is referring to
- temporalConstraint.order: none | latest | oldest
- requestedFields: title | published_at | content | summary | contact_methods
- evidenceScope: none | current_source | entity | corpus
- searchConcepts.required: concepts that must remain in retrieval
- searchConcepts.optional: useful secondary retrieval concepts
- missingSlots: target | current_source | named_entity | comparison_target
- clarificationQuestion: short follow-up question when clarification is required
- confidence: confidence in the complete interpretation
- reason: one short sentence

Rules:
- If there is any substantive question after a greeting, do not use social_reply.
- Resolve short follow-up answers and pronouns from recentConversationTurns before choosing clarify.
- Use assistantOwnerName as an entity candidate when the user refers to the blog owner, author, or site owner.
- Put a slot in missingSlots only when the answer cannot be produced without it.
- Use temporalConstraint.order=latest or oldest for chronological requests regardless of wording.
- Include published_at in requestedFields when the user asks when something was posted.
- Use evidenceScope=current_source when the user clearly refers to the current page, this post, this project, here, or equivalent.
- Use evidenceScope=entity when the user asks about a specific person, project, assistant, or named item.
- Use evidenceScope=corpus when the user asks about patterns or themes across multiple posts/projects or the whole blog.
- Put product names, technologies, and named entities required by the question in searchConcepts.required.
- Keep clarificationQuestion null when missingSlots is empty.
- For target, use null for sourceCategory, slug, and title when kind=none.`,
} as const

const CHAT_CONFIRMATION_FOLLOW_UP = {
  AFFIRMATIVE_ANSWERS: [
    '그래',
    '네',
    '예',
    '응',
    '맞아',
    '맞아요',
    '맞습니다',
    'ㅇㅇ',
    '어',
    '그렇지',
    '그거야',
    'yes',
    'yeah',
    'yep',
    'correct',
    'right',
  ],
  QUESTION_MARKS: ['?', '？'],
  KOREAN_CLARIFICATION_ENDINGS: [
    '건가요',
    '인가요',
    '맞나요',
    '뜻하나요',
    '말인가요',
  ],
  USER_CONFIRMATION_SUFFIX: '사용자가 긍정했습니다.',
} as const

const CHAT_CHRONOLOGICAL_DIRECT_ROUTING = {
  LATEST_POST_PATTERNS: [
    '마지막 글',
    '최신 글',
    '최근 글',
    'latest post',
    'last post',
    'most recent post',
  ],
} as const

interface ConfirmedFollowUpContext {
  originalQuestion: string
  confirmedQuestion: string
  ownerName: string | null
}

interface PlanChatQuestionParams {
  question: string
  locale: SupportedLocale
  conversationHistory?: ChatConversationHistoryItem[]
  currentPostSlug?: string
  assistantProfile?: ChatAssistantProfile | null
}

function trimQuestion(question: string): string {
  return question.slice(0, BLOG_CHAT.PLANNER.MAXIMUM_QUESTION_CHARACTERS)
}

function normalizeConfirmationAnswer(question: string): string {
  return question
    .trim()
    .toLowerCase()
    .replaceAll(/[.!?？。~\s]/g, '')
}

function isAffirmativeFollowUpAnswer(question: string): boolean {
  const normalizedQuestion = normalizeConfirmationAnswer(question)

  return (
    CHAT_CONFIRMATION_FOLLOW_UP.AFFIRMATIVE_ANSWERS as readonly string[]
  ).includes(normalizedQuestion)
}

function isClarificationAnswer(answer: string): boolean {
  return (
    CHAT_CONFIRMATION_FOLLOW_UP.QUESTION_MARKS.some((questionMark) => {
      return answer.includes(questionMark)
    }) ||
    CHAT_CONFIRMATION_FOLLOW_UP.KOREAN_CLARIFICATION_ENDINGS.some(
      (clarificationEnding) => {
        return answer.includes(clarificationEnding)
      },
    )
  )
}

function buildConfirmedFollowUpContext(params: {
  question: string
  conversationHistory?: ChatConversationHistoryItem[]
  assistantProfile?: ChatAssistantProfile | null
}): ConfirmedFollowUpContext | null {
  if (!isAffirmativeFollowUpAnswer(params.question)) {
    return null
  }

  const latestConversationHistory = params.conversationHistory?.at(-1)

  if (
    !latestConversationHistory ||
    !isClarificationAnswer(latestConversationHistory.answer)
  ) {
    return null
  }

  const confirmedQuestion = trimQuestion(
    [
      latestConversationHistory.question,
      latestConversationHistory.answer,
      CHAT_CONFIRMATION_FOLLOW_UP.USER_CONFIRMATION_SUFFIX,
    ].join(' '),
  )

  return {
    originalQuestion: params.question,
    confirmedQuestion,
    ownerName:
      params.assistantProfile?.ownerName &&
      latestConversationHistory.answer.includes(params.assistantProfile.ownerName)
        ? params.assistantProfile.ownerName
        : null,
  }
}

function resolveConfirmedFollowUpQuestionPlan(params: {
  questionPlan: ChatQuestionPlan
  confirmedFollowUpContext: ConfirmedFollowUpContext | null
}): ChatQuestionPlan {
  if (!params.confirmedFollowUpContext) {
    return params.questionPlan
  }

  const shouldResolveRepeatedClarification =
    params.questionPlan.route === 'clarify'
  const shouldResolveOwnerAssistantTarget =
    Boolean(params.confirmedFollowUpContext.ownerName) &&
    (params.questionPlan.referenceTarget.kind === 'assistant' ||
      params.questionPlan.referenceTarget.sourceCategory === 'assistant')

  if (!shouldResolveRepeatedClarification && !shouldResolveOwnerAssistantTarget) {
    return params.questionPlan
  }

  const additionalKeywords = [
    ...new Set([
      ...params.questionPlan.additionalKeywords,
      ...(params.confirmedFollowUpContext.ownerName
        ? [params.confirmedFollowUpContext.ownerName]
        : []),
    ]),
  ]
  const preferredSourceCategories = [
    ...new Set([
      ...params.questionPlan.preferredSourceCategories,
      ...(params.confirmedFollowUpContext.ownerName
        ? (['profile', 'blog'] as const)
        : []),
    ]),
  ]

  return {
    ...params.questionPlan,
    standaloneQuestion:
      normalizeConfirmationAnswer(params.questionPlan.standaloneQuestion) ===
      normalizeConfirmationAnswer(params.confirmedFollowUpContext.originalQuestion)
        ? params.confirmedFollowUpContext.confirmedQuestion
        : params.questionPlan.standaloneQuestion,
    route: shouldResolveRepeatedClarification
      ? 'retrieve'
      : params.questionPlan.route,
    directAction: 'none',
    retrievalScope:
      params.questionPlan.retrievalScope === 'none'
        ? 'entity'
        : params.questionPlan.retrievalScope,
    referenceTarget: params.confirmedFollowUpContext.ownerName
      ? {
          kind: 'profile',
          sourceCategory: 'profile',
          slug: 'about',
          title: null,
          confidence: 'high',
        }
      : params.questionPlan.referenceTarget,
    preferredSourceCategories,
    additionalKeywords,
    clarificationQuestion: null,
  }
}

function resolveChronologicalDirectQuestionPlan(params: {
  originalQuestion: string
  questionPlan: ChatQuestionPlan
}): ChatQuestionPlan {
  const normalizedQuestion = params.originalQuestion.trim().toLowerCase()
  const isLatestPostQuestion =
    CHAT_CHRONOLOGICAL_DIRECT_ROUTING.LATEST_POST_PATTERNS.some((pattern) => {
      return normalizedQuestion.includes(pattern)
    })

  if (!isLatestPostQuestion) {
    return params.questionPlan
  }

  return {
    ...params.questionPlan,
    route: 'direct',
    directAction: 'latest_post',
    retrievalScope: 'none',
    referenceTarget: {
      kind: 'none',
      sourceCategory: null,
      slug: null,
      title: null,
      confidence: 'high',
    },
    preferredSourceCategories: ['blog'],
    clarificationQuestion: null,
  }
}

function buildQuestionPlanFromPlannerOutput(params: {
  output: unknown
  locale: SupportedLocale
  originalQuestion: string
  confirmedFollowUpContext: ConfirmedFollowUpContext | null
}): ChatQuestionPlan {
  const parsedIntentFrame = ChatIntentFrameSchema.safeParse(params.output)

  if (parsedIntentFrame.success) {
    return buildChatQuestionPlanFromIntentFrame({
      intentFrame: parsedIntentFrame.data,
      locale: params.locale,
    })
  }

  const legacyQuestionPlan = ChatQuestionPlanSchema.parse(params.output)

  return resolveChronologicalDirectQuestionPlan({
    originalQuestion: params.originalQuestion,
    questionPlan: resolveConfirmedFollowUpQuestionPlan({
      questionPlan: legacyQuestionPlan,
      confirmedFollowUpContext: params.confirmedFollowUpContext,
    }),
  })
}

export async function planChatQuestion(
  params: PlanChatQuestionParams,
): Promise<ChatQuestionPlanResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      refusalReason: 'missing_api_key',
    }
  }

  try {
    const contextSnapshot = buildChatQuestionContextSnapshot({
      conversationHistory: params.conversationHistory,
      currentPostSlug: params.currentPostSlug,
    })
    const confirmedFollowUpContext = buildConfirmedFollowUpContext({
      question: params.question,
      conversationHistory: params.conversationHistory,
      assistantProfile: params.assistantProfile,
    })
    const { output } = await generateText({
      model: openai(BLOG_CHAT.PLANNER.MODEL_ID),
      temperature: 0,
      output: Output.object({
        schema: ChatIntentFrameSchema,
      }),
      system: CHAT_QUESTION_PLANNER_PROMPT.SYSTEM,
      prompt: [
        `locale=${params.locale}`,
        `assistantChatbotName=${params.assistantProfile?.chatbotName ?? ''}`,
        `assistantOwnerName=${params.assistantProfile?.ownerName ?? ''}`,
        buildPlannerConversationContextText(contextSnapshot),
        `originalQuestion=${trimQuestion(params.question)}`,
        `question=${confirmedFollowUpContext?.confirmedQuestion ?? trimQuestion(params.question)}`,
      ].join('\n'),
    })
    const questionPlan = buildQuestionPlanFromPlannerOutput({
      output,
      locale: params.locale,
      originalQuestion: params.question,
      confirmedFollowUpContext,
    })

    return {
      ok: true,
      questionPlan,
    }
  } catch {
    return {
      ok: false,
      refusalReason: 'model_error',
    }
  }
}
