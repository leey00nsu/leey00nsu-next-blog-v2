import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'
import type { ChatContactProfile } from '@/features/chat/model/chat-contact'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'
import {
  retrieveBlogChatEvidenceByIntent,
  type RetrieveBlogChatEvidenceByIntentParams,
  type RetrieveBlogChatEvidenceByIntentResult,
} from '@/features/chat/model/retrieve-blog-chat-evidence'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

type RetrieveEvidence = (
  params: RetrieveBlogChatEvidenceByIntentParams,
) => Promise<RetrieveBlogChatEvidenceByIntentResult>

interface ExecuteChatIntentParams {
  intent: NormalizedChatIntent
  locale: SupportedLocale
  conversationHistoryCount: number
  assistantProfile?: ChatAssistantProfile | null
  contactProfile?: ChatContactProfile | null
  currentPostSlug?: string
  retrieveEvidence?: RetrieveEvidence
}

interface DirectChatIntentExecution {
  kind: 'direct'
  response: BlogChatResponse
  matches: ChatEvidenceRecord[]
  evidenceResult?: RetrieveBlogChatEvidenceByIntentResult
}

interface ModelChatIntentExecution {
  kind: 'model'
  question: string
  matches: ChatEvidenceRecord[]
  evidenceResult: RetrieveBlogChatEvidenceByIntentResult
}

interface RefusedChatIntentExecution {
  kind: 'refusal'
  refusalReason: 'insufficient_search_match' | 'model_error'
  failureKind?: 'unsupported_intent'
  evidenceResult: RetrieveBlogChatEvidenceByIntentResult
}

export type ExecuteChatIntentResult =
  | DirectChatIntentExecution
  | ModelChatIntentExecution
  | RefusedChatIntentExecution

const CHAT_INTENT_EXECUTION_RESPONSES = {
  ko: {
    CLARIFICATION: '답변에 필요한 대상을 조금 더 구체적으로 알려주세요.',
    SOCIAL_REPLY: '안녕하세요. 무엇을 찾고 계신가요?',
  },
  en: {
    CLARIFICATION: 'Please specify the target needed to answer the question.',
    SOCIAL_REPLY: 'Hi there. What are you looking for?',
  },
} as const

function buildClarificationResponse(params: {
  intent: NormalizedChatIntent
  locale: SupportedLocale
}): BlogChatResponse {
  return {
    answer:
      params.intent.clarificationQuestion ??
      CHAT_INTENT_EXECUTION_RESPONSES[params.locale].CLARIFICATION,
    citations: [],
    grounded: false,
  }
}

function buildSocialResponse(params: {
  locale: SupportedLocale
  assistantProfile?: ChatAssistantProfile | null
}): BlogChatResponse {
  return {
    answer:
      params.assistantProfile?.greetingAnswer ??
      CHAT_INTENT_EXECUTION_RESPONSES[params.locale].SOCIAL_REPLY,
    citations: [],
    grounded: false,
  }
}

export async function executeChatIntent({
  intent,
  locale,
  conversationHistoryCount,
  assistantProfile,
  contactProfile,
  currentPostSlug,
  retrieveEvidence = retrieveBlogChatEvidenceByIntent,
}: ExecuteChatIntentParams): Promise<ExecuteChatIntentResult> {
  if (intent.missingSlots.length > 0) {
    return {
      kind: 'direct',
      response: buildClarificationResponse({ intent, locale }),
      matches: [],
    }
  }

  if (intent.operation === 'social_reply') {
    return {
      kind: 'direct',
      response: buildSocialResponse({ locale, assistantProfile }),
      matches: [],
    }
  }

  const evidenceResult = await retrieveEvidence({
    intent,
    locale,
    contactProfile,
    currentPostSlug,
    conversationHistoryCount,
  })
  const resolvedChatRequest = evidenceResult.resolvedChatRequest

  if (resolvedChatRequest.directResponse) {
    return {
      kind: 'direct',
      response: resolvedChatRequest.directResponse,
      matches: evidenceResult.finalMatches,
      evidenceResult,
    }
  }

  if (
    resolvedChatRequest.shouldCallModel &&
    evidenceResult.finalMatches.length > 0
  ) {
    return {
      kind: 'model',
      question: intent.standaloneQuestion,
      matches: evidenceResult.finalMatches,
      evidenceResult,
    }
  }

  return {
    kind: 'refusal',
    refusalReason:
      resolvedChatRequest.refusalReason ?? 'insufficient_search_match',
    evidenceResult,
  }
}
