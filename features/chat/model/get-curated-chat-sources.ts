import { cache } from 'react'
import { getAbout } from '@/entities/about/lib/about'
import { getAllProjects } from '@/entities/project/lib/project'
import { CHAT_ASSISTANT } from '@/features/chat/config/chat-assistant'
import { buildCuratedChatSourceRecords } from '@/features/chat/lib/chat-curated-source-records'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import { getChatAssistantProfile } from '@/features/chat/model/get-chat-assistant-profile'
import {
  buildLocalizedRoutePath,
  buildProjectHref,
  LOCALES,
  ROUTES,
  type SupportedLocale,
} from '@/shared/config/constants'
import { getSemanticSearchTerms } from '@/shared/lib/chat-semantic-map'

const CURATED_SOURCE_TAGS = {
  PROFILE: [
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
  PROFILE_REFERENCE: ['profile', 'about', 'canonical-reference'],
  PROJECT: ['project', 'side project', 'portfolio'],
} as const

const CROSS_LOCALE_PROFILE_REFERENCE = {
  SEARCH_PHRASES: {
    ko: ['영어 이름', 'english name'],
    en: ['한국 이름', '한글 이름', 'korean name', 'hangul name'],
  },
} as const

function resolveAlternateLocales(locale: SupportedLocale): SupportedLocale[] {
  return LOCALES.SUPPORTED.filter((supportedLocale) => {
    return supportedLocale !== locale
  })
}

export const getCuratedChatSources = cache(
  async (locale: SupportedLocale): Promise<ChatEvidenceRecord[]> => {
    const about = getAbout(locale)
    const assistantProfile = getChatAssistantProfile(locale)
    const projects = await getAllProjects(locale)
    const curatedSources: ChatEvidenceRecord[] = []

    if (assistantProfile) {
      curatedSources.push(
        ...buildCuratedChatSourceRecords({
          idPrefix: `${locale}/assistant/profile`,
          locale,
          slug: 'assistant-profile',
          title: assistantProfile.title,
          baseUrl: buildLocalizedRoutePath(ROUTES.ABOUT, locale),
          introContent: [
            assistantProfile.greetingAnswer,
            assistantProfile.identityAnswer,
          ].join(' '),
          markdownContent: assistantProfile.content,
          tags: [...CHAT_ASSISTANT.SEARCH.TAGS],
          baseSearchPhrases: [
            assistantProfile.chatbotName,
            assistantProfile.ownerName,
            assistantProfile.title,
            assistantProfile.description ?? '',
            assistantProfile.greetingAnswer,
            assistantProfile.identityAnswer,
            ...assistantProfile.aliases,
            ...CHAT_ASSISTANT.SEARCH.TAGS,
          ],
          sourceCategory: 'assistant',
        }),
      )
    }

    if (about) {
      const profileSemanticSearchTerms = getSemanticSearchTerms({
        locale,
        slug: 'about',
        sourceCategory: 'profile',
      })

      curatedSources.push(
        ...buildCuratedChatSourceRecords({
          idPrefix: `${locale}/about/profile`,
          locale,
          slug: 'about',
          title: about.title,
          baseUrl: buildLocalizedRoutePath(ROUTES.ABOUT, locale),
          introContent: about.description ?? '',
          markdownContent: about.content,
          tags: [...CURATED_SOURCE_TAGS.PROFILE],
          baseSearchPhrases: [
            ...profileSemanticSearchTerms,
            about.title,
            about.description ?? '',
            ...CURATED_SOURCE_TAGS.PROFILE,
          ],
          sourceCategory: 'profile',
        }),
      )

      const alternateLocales = resolveAlternateLocales(locale)

      for (const alternateLocale of alternateLocales) {
        const alternateAbout = getAbout(alternateLocale)

        if (!alternateAbout) {
          continue
        }

        const alternateProfileSemanticSearchTerms = getSemanticSearchTerms({
          locale: alternateLocale,
          slug: 'about',
          sourceCategory: 'profile',
        })

        curatedSources.push(
          ...buildCuratedChatSourceRecords({
            idPrefix: `${locale}/about/profile-reference-${alternateLocale}`,
            locale,
            slug: 'about',
            title: alternateAbout.title,
            baseUrl: buildLocalizedRoutePath(ROUTES.ABOUT, alternateLocale),
            introContent: alternateAbout.description ?? '',
            markdownContent: alternateAbout.content,
            tags: [...CURATED_SOURCE_TAGS.PROFILE_REFERENCE],
            baseSearchPhrases: [
              ...CROSS_LOCALE_PROFILE_REFERENCE.SEARCH_PHRASES[locale],
              ...alternateProfileSemanticSearchTerms,
              alternateAbout.title,
              alternateAbout.description ?? '',
              ...CURATED_SOURCE_TAGS.PROFILE_REFERENCE,
            ],
            sourceCategory: 'profile',
          }),
        )
      }
    }

    for (const project of projects) {
      const projectSemanticSearchTerms = getSemanticSearchTerms({
        locale,
        slug: project.slug,
        sourceCategory: 'project',
      })
      const projectTags = [
        ...CURATED_SOURCE_TAGS.PROJECT,
        ...project.techStacks.map((stack) => stack.toLowerCase()),
      ]

      curatedSources.push(
        ...buildCuratedChatSourceRecords({
          idPrefix: `${locale}/project/${project.slug}`,
          locale,
          slug: project.slug,
          title: project.title,
          baseUrl: buildProjectHref(project.slug, locale),
          introContent: [
            project.summary,
            project.keyFeatures.join(' '),
            project.techStacks.join(' '),
          ]
            .filter(Boolean)
            .join(' '),
          markdownContent: project.content,
          tags: projectTags,
          baseSearchPhrases: [
            ...projectSemanticSearchTerms,
            project.title,
            project.summary,
            ...project.keyFeatures,
            ...project.techStacks,
            ...CURATED_SOURCE_TAGS.PROJECT,
          ],
          sourceCategory: 'project',
        }),
      )
    }

    return curatedSources
  },
)
