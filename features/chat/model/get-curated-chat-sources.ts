import { cache } from 'react'
import { getAbout } from '@/entities/about/lib/about'
import { getAllProjects } from '@/entities/project/lib/project'
import { CHAT_ASSISTANT } from '@/features/chat/config/chat-assistant'
import { getChatAssistantProfile } from '@/features/chat/model/get-chat-assistant-profile'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import {
  buildLocalizedRoutePath,
  buildProjectHref,
  ROUTES,
  type SupportedLocale,
} from '@/shared/config/constants'
import { getSemanticSearchTerms } from '@/shared/lib/chat-semantic-map'
import { collectSearchTerms } from '@/shared/lib/search-terms'

const CURATED_SOURCE_TEXT = {
  MAXIMUM_EXCERPT_LENGTH: 180,
  MAXIMUM_CONTENT_LENGTH: 700,
} as const

const MARKDOWN_PATTERNS = {
  IMAGE: /!\[([^\]]*)\]\([^)]+\)/g,
  LINK: /\[([^\]]+)\]\([^)]+\)/g,
  INLINE_CODE: /`([^`]+)`/g,
  HTML_TAG: /<[^>]+>/g,
  MARKERS: /[*_>#~-]/g,
  WHITESPACE: /\s+/g,
} as const

function sanitizeMarkdownToSearchText(markdown: string): string {
  return markdown
    .replaceAll(MARKDOWN_PATTERNS.IMAGE, '$1')
    .replaceAll(MARKDOWN_PATTERNS.LINK, '$1')
    .replaceAll(MARKDOWN_PATTERNS.INLINE_CODE, '$1')
    .replaceAll(MARKDOWN_PATTERNS.HTML_TAG, ' ')
    .replaceAll(MARKDOWN_PATTERNS.MARKERS, ' ')
    .replaceAll(MARKDOWN_PATTERNS.WHITESPACE, ' ')
    .trim()
}

function trimText(text: string, maximumLength: number): string {
  if (text.length <= maximumLength) {
    return text
  }

  return `${text.slice(0, maximumLength - 1).trimEnd()}…`
}

export const getCuratedChatSources = cache(
  async (locale: SupportedLocale): Promise<ChatEvidenceRecord[]> => {
    const about = getAbout(locale)
    const assistantProfile = getChatAssistantProfile(locale)
    const projects = await getAllProjects(locale)
    const curatedSources: ChatEvidenceRecord[] = []

    if (assistantProfile) {
      const sanitizedAssistantContent = sanitizeMarkdownToSearchText(
        assistantProfile.content,
      )

      curatedSources.push({
        id: `${locale}/assistant/profile`,
        locale,
        slug: 'assistant-profile',
        title: assistantProfile.title,
        url: buildLocalizedRoutePath(ROUTES.ABOUT, locale),
        excerpt: trimText(
          assistantProfile.identityAnswer,
          CURATED_SOURCE_TEXT.MAXIMUM_EXCERPT_LENGTH,
        ),
        content: trimText(
          [
            assistantProfile.greetingAnswer,
            assistantProfile.identityAnswer,
            sanitizedAssistantContent,
          ].join(' '),
          CURATED_SOURCE_TEXT.MAXIMUM_CONTENT_LENGTH,
        ),
        sectionTitle: null,
        tags: [...CHAT_ASSISTANT.SEARCH.TAGS],
        searchTerms: collectSearchTerms({
          texts: [
            assistantProfile.title,
            assistantProfile.description ?? '',
            assistantProfile.greetingAnswer,
            assistantProfile.identityAnswer,
            sanitizedAssistantContent,
          ],
          phrases: [
            assistantProfile.chatbotName,
            assistantProfile.ownerName,
            ...assistantProfile.aliases,
            ...CHAT_ASSISTANT.SEARCH.TAGS,
          ],
        }),
        sourceCategory: 'assistant',
      })
    }

    if (about) {
      const sanitizedAboutContent = sanitizeMarkdownToSearchText(about.content)
      const profileSemanticSearchTerms = getSemanticSearchTerms({
        locale,
        slug: 'about',
        sourceCategory: 'profile',
      })

      curatedSources.push({
        id: `${locale}/about/profile`,
        locale,
        slug: 'about',
        title: about.title,
        url: buildLocalizedRoutePath(ROUTES.ABOUT, locale),
        excerpt: trimText(
          about.description ?? sanitizedAboutContent,
          CURATED_SOURCE_TEXT.MAXIMUM_EXCERPT_LENGTH,
        ),
        content: trimText(
          sanitizedAboutContent,
          CURATED_SOURCE_TEXT.MAXIMUM_CONTENT_LENGTH,
        ),
        sectionTitle: null,
        tags: [
          'profile',
          'about',
          'career',
          'experience',
          'education',
          'university',
          'school',
          'major',
          'developer',
          'react',
          'next.js',
          'typescript',
        ],
        searchTerms: collectSearchTerms({
          texts: [
            about.title,
            about.description ?? '',
            sanitizedAboutContent,
          ],
          phrases: [
            ...profileSemanticSearchTerms,
            about.title,
            about.description ?? '',
            'profile',
            'about',
            'career',
            'experience',
            'education',
            'university',
            'developer',
            'react',
            'next.js',
            'typescript',
          ],
        }),
        sourceCategory: 'profile',
      })
    }

    for (const project of projects) {
      const sanitizedProjectContent = sanitizeMarkdownToSearchText(project.content)
      const projectSemanticSearchTerms = getSemanticSearchTerms({
        locale,
        slug: project.slug,
        sourceCategory: 'project',
      })
      const combinedProjectContent = [
        project.summary,
        project.keyFeatures.join(' '),
        project.techStacks.join(' '),
        sanitizedProjectContent,
      ]
        .filter(Boolean)
        .join(' ')

      curatedSources.push({
        id: `${locale}/project/${project.slug}`,
        locale,
        slug: project.slug,
        title: project.title,
        url: buildProjectHref(project.slug, locale),
        excerpt: trimText(
          project.summary,
          CURATED_SOURCE_TEXT.MAXIMUM_EXCERPT_LENGTH,
        ),
        content: trimText(
          combinedProjectContent,
          CURATED_SOURCE_TEXT.MAXIMUM_CONTENT_LENGTH,
        ),
        sectionTitle: null,
        tags: [
          'project',
          'side project',
          'portfolio',
          ...project.techStacks.map((stack) => stack.toLowerCase()),
        ],
        searchTerms: collectSearchTerms({
          texts: [
            project.title,
            project.summary,
            project.keyFeatures.join(' '),
            project.techStacks.join(' '),
            sanitizedProjectContent,
          ],
          phrases: [
            ...projectSemanticSearchTerms,
            project.title,
            project.summary,
            ...project.keyFeatures,
            ...project.techStacks,
            'project',
            'side project',
            'portfolio',
          ],
        }),
        sourceCategory: 'project',
      })
    }

    return curatedSources
  },
)
