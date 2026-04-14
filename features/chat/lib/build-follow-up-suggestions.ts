import { BLOG_CHAT } from '@/features/chat/config/constants'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { BlogChatCitation } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

interface BuildFollowUpSuggestionsParams {
  locale: SupportedLocale
  citations: BlogChatCitation[]
  matches: ChatEvidenceRecord[]
}

const FOLLOW_UP_TEMPLATES = {
  ko: {
    BLOG_SUMMARY: '{title} 글의 핵심 내용을 요약해줘',
    BLOG_RECOMMENDATION: '{tag} 관련 글도 추천해줘',
    PROJECT_STACK: '{title} 프로젝트에서 사용한 기술 스택은 뭐야?',
    PROFILE_STACK: '이윤수의 주력 기술 스택은 뭐야?',
  },
  en: {
    BLOG_SUMMARY: 'Summarize the key point of {title}.',
    BLOG_RECOMMENDATION: 'Recommend more posts about {tag}.',
    PROJECT_STACK: 'What tech stack was used in the {title} project?',
    PROFILE_STACK: "What is Yoonsu Lee's main tech stack?",
  },
} as const

function pushUniqueSuggestion(
  suggestions: string[],
  nextSuggestion: string | undefined,
): void {
  if (!nextSuggestion) {
    return
  }

  if (suggestions.includes(nextSuggestion)) {
    return
  }

  suggestions.push(nextSuggestion)
}

export function buildFollowUpSuggestions({
  locale,
  citations,
  matches,
}: BuildFollowUpSuggestionsParams): string[] {
  const localizedTemplates = FOLLOW_UP_TEMPLATES[locale]
  const topCitation = citations[0]
  const topMatch = matches[0]
  const suggestions: string[] = []

  if (topCitation?.sourceCategory === 'blog') {
    pushUniqueSuggestion(
      suggestions,
      localizedTemplates.BLOG_SUMMARY.replace('{title}', topCitation.title),
    )
  }

  if (topCitation?.sourceCategory === 'project') {
    pushUniqueSuggestion(
      suggestions,
      localizedTemplates.PROJECT_STACK.replace('{title}', topCitation.title),
    )
  }

  if (
    topCitation?.sourceCategory === 'profile' ||
    topCitation?.sourceCategory === 'assistant'
  ) {
    pushUniqueSuggestion(suggestions, localizedTemplates.PROFILE_STACK)
  }

  const topTag = topMatch?.tags.find((tag) => {
    return tag.trim().length > 0
  })

  if (topTag) {
    pushUniqueSuggestion(
      suggestions,
      localizedTemplates.BLOG_RECOMMENDATION.replace('{tag}', topTag),
    )
  }

  return suggestions.slice(0, BLOG_CHAT.FOLLOW_UP.MAXIMUM_SUGGESTION_COUNT)
}
