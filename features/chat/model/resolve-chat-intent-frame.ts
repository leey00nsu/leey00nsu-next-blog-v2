import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import type { ChatIntentFrame } from '@/features/chat/model/chat-intent-frame'
import {
  ChatQuestionPlanSchema,
  type ChatQuestionPlan,
} from '@/features/chat/model/chat-question-plan'
import type { ChatQuestionAction } from '@/features/chat/model/chat-question-routing'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_INTENT_CLARIFICATION_RESPONSES = {
  ko: '답변에 필요한 대상을 조금 더 구체적으로 알려주세요.',
  en: 'Please specify the target needed to answer the question.',
} as const

const CHAT_INTENT_DOMAIN_SOURCE_CATEGORIES = {
  general: [],
  blog: ['blog'],
  profile: ['profile'],
  project: ['project'],
  assistant: ['assistant'],
} as const satisfies Record<
  ChatIntentFrame['domain'],
  readonly ChatSourceCategory[]
>

const CHAT_INTENT_OPERATION_ACTIONS = {
  answer: 'answer',
  summarize: 'summarize',
  explain: 'explain',
  recommend: 'recommend',
  compare: 'compare',
  social_reply: 'answer',
  contact: 'answer',
} as const satisfies Record<
  ChatIntentFrame['operation'],
  ChatQuestionAction
>

interface BuildChatQuestionPlanFromIntentFrameParams {
  intentFrame: ChatIntentFrame
  locale: SupportedLocale
}

function buildUniqueValues<Value>(values: readonly Value[]): Value[] {
  return [...new Set(values)]
}

function resolveRetrievalScope(
  intentFrame: ChatIntentFrame,
): ChatQuestionPlan['retrievalScope'] {
  if (intentFrame.evidenceScope !== 'none') {
    return intentFrame.evidenceScope
  }

  return intentFrame.target.kind === 'none' ? 'corpus' : 'entity'
}

export function buildChatQuestionPlanFromIntentFrame({
  intentFrame,
  locale,
}: BuildChatQuestionPlanFromIntentFrameParams): ChatQuestionPlan {
  const missingSlots = intentFrame.missingSlots.filter((missingSlot) => {
    const isCorpusChronologicalRequest =
      intentFrame.evidenceScope === 'corpus' &&
      intentFrame.temporalConstraint.order !== 'none'

    return !(
      isCorpusChronologicalRequest &&
      (missingSlot === 'target' || missingSlot === 'named_entity')
    )
  })
  const hasMissingSlots = missingSlots.length > 0
  const isSocialReply = intentFrame.operation === 'social_reply'
  const isContactRequest = intentFrame.operation === 'contact'
  const chronologicalDirectAction =
    intentFrame.temporalConstraint.order === 'latest'
      ? 'latest_post'
      : intentFrame.temporalConstraint.order === 'oldest'
        ? 'oldest_post'
        : 'none'
  const isDirectRequest =
    isSocialReply ||
    isContactRequest ||
    chronologicalDirectAction !== 'none'
  const route = hasMissingSlots
    ? 'clarify'
    : isDirectRequest
      ? 'direct'
      : 'retrieve'
  const directAction = hasMissingSlots
    ? 'none'
    : isSocialReply
      ? 'social_reply'
      : isContactRequest
        ? 'contact'
        : chronologicalDirectAction
  const preferredSourceCategories = buildUniqueValues([
    ...CHAT_INTENT_DOMAIN_SOURCE_CATEGORIES[intentFrame.domain],
    ...(intentFrame.target.sourceCategory
      ? [intentFrame.target.sourceCategory]
      : []),
  ])
  const additionalKeywords = buildUniqueValues([
    ...intentFrame.searchConcepts.required,
    ...intentFrame.searchConcepts.optional,
    ...(intentFrame.target.title ? [intentFrame.target.title] : []),
  ]).slice(0, 12)

  return ChatQuestionPlanSchema.parse({
    standaloneQuestion: intentFrame.standaloneQuestion,
    action: CHAT_INTENT_OPERATION_ACTIONS[intentFrame.operation],
    route,
    directAction,
    retrievalScope:
      route === 'retrieve' ? resolveRetrievalScope(intentFrame) : 'none',
    referenceTarget: intentFrame.target,
    preferredSourceCategories,
    additionalKeywords,
    clarificationQuestion: hasMissingSlots
      ? (intentFrame.clarificationQuestion ??
        CHAT_INTENT_CLARIFICATION_RESPONSES[locale])
      : null,
    reason: intentFrame.reason,
  })
}
