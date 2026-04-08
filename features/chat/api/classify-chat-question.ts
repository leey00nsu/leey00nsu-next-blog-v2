import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { ChatQuestionType } from '@/features/chat/lib/question-analysis'
import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'
import {
  ChatQuestionRoutingResultSchema,
  type ChatQuestionRoutingResult,
} from '@/features/chat/model/chat-question-routing'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_QUESTION_ROUTING = {
  MAXIMUM_QUESTION_CHARACTERS: 300,
  ROUTER_MODEL_ID: 'gpt-5.4-mini',
  FALLBACK_PATTERNS: {
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
    LATEST: ['최신', '최근', 'latest', 'recent'],
    OLDEST: ['오래된', '가장 오래된', '첫 글', '처음 글', 'oldest', 'first post'],
    CURRENT_POST: [
      '이 글',
      '이 문서',
      '이 포스트',
      '이 페이지',
      '이거',
      '이건',
      '요약',
      '요약해줘',
      '짧게 소개',
      '핵심',
    ],
  },
} as const

const CHAT_QUESTION_ROUTING_PROMPT = {
  SYSTEM: `Classify each user question for a blog chatbot into exactly one handling type.

Handling types:
- direct_greeting: greetings, small talk, simple pleasantries
- direct_assistant_identity: asking who the chatbot is, what relationship it has to the author, what scope it answers from
- direct_contact: asking how to contact the author or where public contact channels are
- direct_latest: asking for the latest or most recent post
- direct_oldest: asking for the oldest or first post
- direct_current_post: asking about the currently viewed post or page when currentPostContext is true
- grounded_retrieval: normal factual questions that need evidence from blog posts, public profile, or projects
- corpus_synthesis: questions asking for themes, philosophies, common patterns, or summaries across multiple posts or the whole blog

Rules:
- Prefer direct_greeting for short social messages like hello.
- Prefer direct_assistant_identity for "who are you", "what are you", or "what is your relationship to the author".
- Prefer direct_contact for questions about how to contact the author or where GitHub/LinkedIn/contact links are.
- Prefer direct_latest/direct_oldest only for chronological questions about posts.
- Prefer direct_current_post only when currentPostContext=true and the user is clearly asking about the currently viewed post or page.
- Prefer corpus_synthesis only when the user asks about the whole blog or repeated patterns across multiple writings.
- Everything else should be grounded_retrieval.
- Return concise reasoning in one sentence.`,
} as const

function includesAnyPattern(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern))
}

function escapeRegularExpression(pattern: string): string {
  return pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function includesTokenBoundedPattern(text: string, pattern: string): boolean {
  const normalizedPattern = pattern.trim().toLowerCase()
  const boundedPattern = new RegExp(
    `(^|\\s)${escapeRegularExpression(normalizedPattern)}($|\\s)`,
    'u',
  )

  return boundedPattern.test(text)
}

function isAssistantIdentityFallbackQuestion(params: {
  normalizedQuestion: string
  assistantProfile?: ChatAssistantProfile | null
}): boolean {
  if (!params.assistantProfile) {
    return false
  }

  const assistantIdentityPatterns = [
    params.assistantProfile.chatbotName,
    ...params.assistantProfile.aliases,
  ]

  return assistantIdentityPatterns.some((pattern) => {
    return includesTokenBoundedPattern(params.normalizedQuestion, pattern)
  })
}

function buildFallbackRoutingResult(params: {
  normalizedQuestion: string
  fallbackQuestionType: ChatQuestionType
  assistantProfile?: ChatAssistantProfile | null
  hasCurrentPostContext: boolean
}): ChatQuestionRoutingResult {
  if (params.fallbackQuestionType === 'greeting') {
    return {
      handlingType: 'direct_greeting',
      reason: 'fallback greeting classification',
    }
  }

  if (
    params.fallbackQuestionType === 'assistant-identity' ||
    isAssistantIdentityFallbackQuestion({
      normalizedQuestion: params.normalizedQuestion,
      assistantProfile: params.assistantProfile,
    })
  ) {
    return {
      handlingType: 'direct_assistant_identity',
      reason: 'fallback assistant identity classification',
    }
  }

  if (
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.CONTACT,
    )
  ) {
    return {
      handlingType: 'direct_contact',
      reason: 'fallback contact classification',
    }
  }

  if (
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.LATEST,
    )
  ) {
    return {
      handlingType: 'direct_latest',
      reason: 'fallback chronological latest classification',
    }
  }

  if (
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.OLDEST,
    )
  ) {
    return {
      handlingType: 'direct_oldest',
      reason: 'fallback chronological oldest classification',
    }
  }

  if (
    params.hasCurrentPostContext &&
    includesAnyPattern(
      params.normalizedQuestion,
      CHAT_QUESTION_ROUTING.FALLBACK_PATTERNS.CURRENT_POST,
    )
  ) {
    return {
      handlingType: 'direct_current_post',
      reason: 'fallback current post classification',
    }
  }

  return {
    handlingType: 'grounded_retrieval',
    reason: 'fallback grounded retrieval classification',
  }
}

function trimQuestion(question: string): string {
  return question.slice(0, CHAT_QUESTION_ROUTING.MAXIMUM_QUESTION_CHARACTERS)
}

export async function classifyChatQuestion(params: {
  question: string
  locale: SupportedLocale
  normalizedQuestion: string
  fallbackQuestionType: ChatQuestionType
  assistantProfile?: ChatAssistantProfile | null
  hasCurrentPostContext: boolean
}): Promise<ChatQuestionRoutingResult> {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackRoutingResult({
      normalizedQuestion: params.normalizedQuestion,
      fallbackQuestionType: params.fallbackQuestionType,
      assistantProfile: params.assistantProfile,
      hasCurrentPostContext: params.hasCurrentPostContext,
    })
  }

  try {
    const { output } = await generateText({
      model: openai(
        process.env.OPENAI_BLOG_CHAT_ROUTER_MODEL ??
          process.env.OPENAI_BLOG_CHAT_MODEL ??
          CHAT_QUESTION_ROUTING.ROUTER_MODEL_ID,
      ),
      temperature: 0,
      output: Output.object({
        schema: ChatQuestionRoutingResultSchema,
      }),
      system: CHAT_QUESTION_ROUTING_PROMPT.SYSTEM,
      prompt: [
        `locale=${params.locale}`,
        `currentPostContext=${params.hasCurrentPostContext}`,
        `question=${trimQuestion(params.question)}`,
      ].join('\n'),
    })

    return output as ChatQuestionRoutingResult
  } catch {
    return buildFallbackRoutingResult({
      normalizedQuestion: params.normalizedQuestion,
      fallbackQuestionType: params.fallbackQuestionType,
      assistantProfile: params.assistantProfile,
      hasCurrentPostContext: params.hasCurrentPostContext,
    })
  }
}
