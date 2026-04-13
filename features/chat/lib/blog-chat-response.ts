import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type {
  BlogChatCitation,
  BlogChatModelDraft,
  BlogChatResponse,
} from '@/features/chat/model/chat-schema'

interface FinalizeBlogChatResponseParams {
  draftAnswer: BlogChatModelDraft
  matches: ChatEvidenceRecord[]
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

function buildCitationLookup(
  matches: ChatEvidenceRecord[],
): Map<string, ChatEvidenceRecord> {
  return new Map(matches.map((match) => [match.url, match]))
}

function buildCitations(
  citationUrls: string[],
  citationLookup: Map<string, ChatEvidenceRecord>,
): BlogChatCitation[] {
  const uniqueCitationUrls = [...new Set(citationUrls)]

  return uniqueCitationUrls.flatMap((citationUrl) => {
    const matchedRecord = citationLookup.get(citationUrl)

    if (!matchedRecord) {
      return []
    }

    return [
      {
        title: matchedRecord.title,
        url: matchedRecord.url,
        sectionTitle: matchedRecord.sectionTitle,
        sourceCategory: matchedRecord.sourceCategory,
      },
    ]
  })
}

function buildRefusalResponse(
  refusalReason: BlogChatResponse['refusalReason'],
): BlogChatResponse {
  return {
    answer: '',
    citations: [],
    grounded: false,
    refusalReason,
  }
}

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
}: FinalizeBlogChatResponseParams): BlogChatResponse {
  if (draftAnswer.refusalReason === 'insufficient_evidence') {
    return buildRefusalResponse('insufficient_evidence')
  }

  const citationLookup = buildCitationLookup(matches)
  const citations = buildCitations(draftAnswer.usedCitationUrls, citationLookup)

  if (citations.length === 0) {
    return buildRefusalResponse('invalid_citations')
  }

  return {
    answer: sanitizeBlogChatAnswerToPlainText(draftAnswer.answer),
    citations,
    grounded: true,
  }
}
