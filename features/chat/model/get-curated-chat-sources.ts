import { cache } from 'react'
import { getAbout } from '@/entities/about/lib/about'
import { getAllProjects } from '@/entities/project/lib/project'
import type { Project } from '@/entities/project/model/types'
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

const PROFILE_TECH_STACK_SOURCE = {
  SLUG: 'about',
  ID_SUFFIX: 'profile-tech-stack',
  SECTION_TITLE: {
    ko: '주력 기술 스택',
    en: 'Primary Tech Stack',
  },
  INTRODUCTION: {
    ko: '프로젝트 전체에서 반복적으로 쓰인 기술 스택입니다.',
    en: 'Tech stacks repeatedly used across projects.',
  },
  COMMON_TECH_STACK_LABEL: {
    ko: '공통/반복 기술',
    en: 'Common/repeated technologies',
  },
  SEARCH_TERMS: {
    ko: [
      '주력 기술 스택',
      '기술 스택',
      '주요 기술',
      '사용 기술',
      '이윤수 기술 스택',
      'tech stack',
      'primary tech stack',
    ],
    en: [
      'primary tech stack',
      'tech stack',
      'main technologies',
      'technology stack',
      'Yoonsu Lee tech stack',
      '주력 기술 스택',
      '기술 스택',
    ],
  },
} as const

function resolveAlternateLocales(locale: SupportedLocale): SupportedLocale[] {
  return LOCALES.SUPPORTED.filter((supportedLocale) => {
    return supportedLocale !== locale
  })
}

function collectUniqueTechStacks(projects: Project[]): string[] {
  const techStackMap = new Map<string, string>()

  for (const project of projects) {
    for (const techStack of project.techStacks) {
      const normalizedTechStack = techStack.toLowerCase()

      if (techStackMap.has(normalizedTechStack)) {
        continue
      }

      techStackMap.set(normalizedTechStack, techStack)
    }
  }

  return [...techStackMap.values()]
}

function buildProjectTechStackLines(projects: Project[]): string[] {
  return projects.map((project) => {
    return `- ${project.title}: ${project.techStacks.join(', ')}`
  })
}

function buildProfileTechStackSource(params: {
  locale: SupportedLocale
  aboutTitle: string
  projects: Project[]
}): ChatEvidenceRecord | null {
  if (params.projects.length === 0) {
    return null
  }

  const uniqueTechStacks = collectUniqueTechStacks(params.projects)
  const searchTerms = [
    ...PROFILE_TECH_STACK_SOURCE.SEARCH_TERMS[params.locale],
    ...uniqueTechStacks,
    ...uniqueTechStacks.map((techStack) => {
      return techStack.toLowerCase()
    }),
    ...params.projects.map((project) => {
      return project.title
    }),
  ]

  return {
    id: `${params.locale}/about/${PROFILE_TECH_STACK_SOURCE.ID_SUFFIX}`,
    locale: params.locale,
    slug: PROFILE_TECH_STACK_SOURCE.SLUG,
    title: params.aboutTitle,
    url: buildLocalizedRoutePath(ROUTES.ABOUT, params.locale),
    excerpt: [
      PROFILE_TECH_STACK_SOURCE.INTRODUCTION[params.locale],
      uniqueTechStacks.join(', '),
    ].join(' '),
    content: [
      PROFILE_TECH_STACK_SOURCE.SECTION_TITLE[params.locale],
      PROFILE_TECH_STACK_SOURCE.INTRODUCTION[params.locale],
      `${PROFILE_TECH_STACK_SOURCE.COMMON_TECH_STACK_LABEL[params.locale]}: ${uniqueTechStacks.join(', ')}`,
      ...buildProjectTechStackLines(params.projects),
    ].join('\n'),
    sectionTitle: PROFILE_TECH_STACK_SOURCE.SECTION_TITLE[params.locale],
    tags: [...new Set(searchTerms)],
    searchTerms: [...new Set(searchTerms)],
    sourceCategory: 'profile',
  }
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

      const profileTechStackSource = buildProfileTechStackSource({
        locale,
        aboutTitle: about.title,
        projects,
      })

      if (profileTechStackSource) {
        curatedSources.push(profileTechStackSource)
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
