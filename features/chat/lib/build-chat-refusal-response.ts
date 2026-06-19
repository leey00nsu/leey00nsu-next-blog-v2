import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

type ChatRefusalReason = NonNullable<BlogChatResponse['refusalReason']>

interface BuildChatRefusalResponseParams {
  locale: SupportedLocale
  refusalReason: ChatRefusalReason
}

const CHAT_REFUSAL_MESSAGES = {
  ko: {
    insufficient_search_match: '공개된 정보에서는 확인할 수 없어요.',
    insufficient_evidence: '공개된 정보에서는 확인할 수 없어요.',
    invalid_citations: '답변을 뒷받침할 근거를 확인할 수 없어요.',
    missing_api_key:
      '챗봇 설정이 아직 완전히 연결되지 않았어요. 잠시 후 다시 확인해주세요.',
    model_error: '답변을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
    rate_limited: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.',
    question_too_long: '질문이 너무 길어요. 조금 짧게 입력해주세요.',
    daily_limit_exceeded:
      '오늘 답변 가능 횟수를 모두 사용했어요. 내일 다시 시도해주세요.',
  },
  en: {
    insufficient_search_match:
      "I couldn't verify that from the public information.",
    insufficient_evidence:
      "I couldn't verify that from the public information.",
    invalid_citations: "I couldn't verify evidence supporting an answer.",
    missing_api_key:
      "The chatbot isn't fully configured yet. Please try again later.",
    model_error:
      'Something went wrong while preparing the answer. Please try again later.',
    rate_limited: 'There are too many requests. Please try again shortly.',
    question_too_long: 'The question is too long. Please shorten it.',
    daily_limit_exceeded:
      'The daily answer limit has been reached. Please try again tomorrow.',
  },
} as const satisfies Record<
  SupportedLocale,
  Record<ChatRefusalReason, string>
>

export function buildChatRefusalResponse({
  locale,
  refusalReason,
}: BuildChatRefusalResponseParams): BlogChatResponse {
  return {
    answer: CHAT_REFUSAL_MESSAGES[locale][refusalReason],
    citations: [],
    grounded: false,
    refusalReason,
  }
}
