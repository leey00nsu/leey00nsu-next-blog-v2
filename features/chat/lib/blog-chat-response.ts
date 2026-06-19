import { buildChatRefusalResponse } from '@/features/chat/lib/build-chat-refusal-response'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import { validateChatCitations } from '@/features/chat/lib/validate-chat-citations'
import type {
  BlogChatModelDraft,
  BlogChatResponse,
} from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

interface FinalizeBlogChatResponseParams {
  draftAnswer: BlogChatModelDraft
  matches: ChatEvidenceRecord[]
  locale: SupportedLocale
}

const BLOG_CHAT_ANSWER_MARKDOWN_PATTERN = {
  CODE_FENCE: /```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g,
  IMAGE: /!\[([^\]]*)\]\([^)]+\)/g,
  LINK: /\[([^\]]+)\]\([^)]+\)/g,
  INLINE_CODE: /`([^`]+)`/g,
  HEADING: /^[ \t]{0,3}#{1,6}\s+/gm,
  LIST: /^[ \t]*([-*+]|\d+\.)\s+/gm,
  BLOCKQUOTE: /^[ \t]*>\s?/gm,
  STRIKETHROUGH: /~~(.*?)~~/g,
  STRONG: /\*\*(.*?)\*\*/g,
  EMPHASIS: /\*(.*?)\*/g,
  HTML_TAG: /<[^>]+>/g,
  TRAILING_WHITESPACE: /[ \t]+$/gm,
  EXCESSIVE_NEWLINE: /\n{3,}/g,
} as const

export function sanitizeBlogChatAnswerToPlainText(answer: string): string {
  return answer
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.CODE_FENCE, '$1')
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.IMAGE, '$1')
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.LINK, '$1')
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.INLINE_CODE, '$1')
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.HEADING, '')
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.LIST, '')
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.BLOCKQUOTE, '')
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.STRIKETHROUGH, '$1')
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.STRONG, '$1')
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.EMPHASIS, '$1')
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.HTML_TAG, '')
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.TRAILING_WHITESPACE, '')
    .replaceAll(BLOG_CHAT_ANSWER_MARKDOWN_PATTERN.EXCESSIVE_NEWLINE, '\n\n')
    .trim()
}

export function finalizeBlogChatResponse({
  draftAnswer,
  matches,
  locale,
}: FinalizeBlogChatResponseParams): BlogChatResponse {
  if (draftAnswer.refusalReason === 'insufficient_evidence') {
    return buildChatRefusalResponse({
      locale,
      refusalReason: 'insufficient_evidence',
    })
  }

  const citations = validateChatCitations({
    usedCitationUrls: draftAnswer.usedCitationUrls,
    matches,
  })

  if (citations.length === 0) {
    return buildChatRefusalResponse({
      locale,
      refusalReason: 'invalid_citations',
    })
  }

  return {
    answer: sanitizeBlogChatAnswerToPlainText(draftAnswer.answer),
    citations,
    grounded: true,
  }
}
