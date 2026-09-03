import { cache } from 'react'
import { getAbout } from '@/entities/about/lib/about'
import {
  getAllProjects,
  getDeployedProjects,
  getPublishedAndDeployedProjects,
} from '@/entities/project/lib/project'
import type { DeployedProject, Project } from '@/entities/project/model/types'
import { CHAT_ASSISTANT } from '@/features/chat/config/chat-assistant'
import { buildCuratedChatSourceRecords } from '@/features/chat/lib/chat-curated-source-records'
import type {
  ChatEvidenceRecord,
  ChatEvidenceTime,
} from '@/features/chat/model/chat-evidence'
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
    '경력',
    '커리어',
    'experience',
    '경험',
    '활동',
    'education',
    '학력',
    '교육',
    'university',
    '대학교',
    '대학',
    'school',
    '학교',
    'major',
    '전공',
    '학점',
    'developer',
    'react',
    'next.js',
    'typescript',
  ],
  PROFILE_REFERENCE: ['profile', 'about', 'canonical-reference'],
  PROJECT: ['project', 'side project', 'portfolio'],
} as const

const CURATED_SOURCE_IDENTIFIER = {
  NAMESPACE: 'curated',
} as const

const CROSS_LOCALE_PROFILE_REFERENCE = {
  SEARCH_PHRASES: {
    ko: ['영어 이름', 'english name'],
    en: ['한국 이름', '한글 이름', 'korean name', 'hangul name'],
  },
} as const

const PROJECT_PERIOD_DATE = {
  PATTERN: /^\d{4}-(0[1-9]|1[0-2])$/,
  FIRST_DAY_SUFFIX: '-01T00:00:00.000Z',
} as const

const PROJECT_METADATA_LABELS = {
  ko: {
    period: '프로젝트 기간',
    github: 'GitHub',
    demo: 'Demo',
    npm: 'npm',
    deploymentStatus: '배포 상태',
    deploymentUrl: '배포 URL',
  },
  en: {
    period: 'Project period',
    github: 'GitHub',
    demo: 'Demo',
    npm: 'npm',
    deploymentStatus: 'Deployment status',
    deploymentUrl: 'Deployment URL',
  },
} as const

const DEPLOYED_PROJECT_SOURCE = {
  SLUG: 'projects',
  TITLE: {
    ko: '배포 프로젝트',
    en: 'Deployed Projects',
  },
  INTRODUCTION: {
    ko: '현재 배포하고 있는 서비스와 도구입니다.',
    en: 'Services and tools currently deployed.',
  },
  STATUS_LABELS: {
    ko: {
      active: '운영 중',
      maintained: '유지보수 중',
    },
    en: {
      active: 'Live',
      maintained: 'Maintained',
    },
  },
  CATEGORY_LABELS: {
    ko: {
      aiService: 'AI 서비스',
      infrastructure: '개발 인프라',
      developerTool: '개발자 도구',
      dataVisualization: '데이터 시각화',
      interactiveContent: '인터랙티브 콘텐츠',
      interactiveWeb: '인터랙티브 웹',
    },
    en: {
      aiService: 'AI Service',
      infrastructure: 'Developer Infrastructure',
      developerTool: 'Developer Tool',
      dataVisualization: 'Data Visualization',
      interactiveContent: 'Interactive Content',
      interactiveWeb: 'Interactive Web',
    },
  },
  SEARCH_TERMS: {
    ko: [
      '배포 프로젝트',
      '배포된 프로젝트',
      '운영 중인 프로젝트',
      '운영 중인 서비스',
      '현재 서비스',
      '사용 가능한 프로젝트',
    ],
    en: [
      'deployed projects',
      'live projects',
      'shipped projects',
      'live services',
      'currently available projects',
    ],
  },
} as const

const PROFILE_TECH_STACK_SOURCE = {
  SLUG: 'about',
  ID_SUFFIX: 'profile-tech-stack',
  MINIMUM_PROJECT_USAGE_COUNT: 2,
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

function collectRepeatedTechStacks(projects: Project[]): string[] {
  const techStackUsageMap = new Map<
    string,
    { displayName: string; usageCount: number }
  >()

  for (const project of projects) {
    for (const techStack of new Set(project.techStacks)) {
      const normalizedTechStack = techStack.toLowerCase()
      const currentUsage = techStackUsageMap.get(normalizedTechStack)

      techStackUsageMap.set(normalizedTechStack, {
        displayName: currentUsage?.displayName ?? techStack,
        usageCount: (currentUsage?.usageCount ?? 0) + 1,
      })
    }
  }

  return [...techStackUsageMap.values()]
    .filter((techStackUsage) => {
      return (
        techStackUsage.usageCount >=
        PROFILE_TECH_STACK_SOURCE.MINIMUM_PROJECT_USAGE_COUNT
      )
    })
    .toSorted((leftUsage, rightUsage) => {
      return rightUsage.usageCount - leftUsage.usageCount
    })
    .map((techStackUsage) => techStackUsage.displayName)
}

function buildProjectTechStackLines(projects: Project[]): string[] {
  return projects.map((project) => {
    return `- ${project.title}: ${project.techStacks.join(', ')}`
  })
}

function buildProjectMetadataLines(params: {
  locale: SupportedLocale
  project: Project
}): string[] {
  const labels = PROJECT_METADATA_LABELS[params.locale]
  const periodEnd = params.project.period.end ?? 'present'
  const linkLines = Object.entries(params.project.links).flatMap(
    ([linkKind, linkUrl]) => {
      if (!linkUrl) {
        return []
      }

      const label = labels[linkKind as keyof typeof params.project.links]

      return label ? [`${label}: ${linkUrl}`] : []
    },
  )
  const deploymentLines = params.project.deployment
    ? [
        `${labels.deploymentStatus}: ${DEPLOYED_PROJECT_SOURCE.STATUS_LABELS[params.locale][params.project.deployment.status]}`,
        `${labels.deploymentUrl}: ${params.project.deployment.url}`,
      ]
    : []

  return [
    `${labels.period}: ${params.project.period.start} ~ ${periodEnd}`,
    ...linkLines,
    ...deploymentLines,
  ]
}

function buildDeployedProjectOverviewSource(params: {
  locale: SupportedLocale
  projects: DeployedProject[]
}): ChatEvidenceRecord | null {
  if (params.projects.length === 0) {
    return null
  }

  const title = DEPLOYED_PROJECT_SOURCE.TITLE[params.locale]
  const introduction = DEPLOYED_PROJECT_SOURCE.INTRODUCTION[params.locale]
  const projectLines = params.projects.map((project) => {
    const status =
      DEPLOYED_PROJECT_SOURCE.STATUS_LABELS[params.locale][
        project.deployment.status
      ]
    const category =
      DEPLOYED_PROJECT_SOURCE.CATEGORY_LABELS[params.locale][
        project.deployment.category
      ]

    return `- ${project.title} (${status}, ${category}): ${project.summary} ${project.deployment.url}`
  })
  const searchTerms = [
    ...DEPLOYED_PROJECT_SOURCE.SEARCH_TERMS[params.locale],
    ...params.projects.flatMap((project) => [
      project.title,
      project.summary,
      ...project.techStacks,
    ]),
  ]

  return {
    id: `${CURATED_SOURCE_IDENTIFIER.NAMESPACE}/${params.locale}/project/deployed-overview`,
    locale: params.locale,
    slug: DEPLOYED_PROJECT_SOURCE.SLUG,
    title,
    url: buildLocalizedRoutePath(ROUTES.PROJECTS, params.locale),
    excerpt: introduction,
    content: [title, introduction, ...projectLines].join('\n'),
    sectionTitle: title,
    tags: [...new Set([...CURATED_SOURCE_TAGS.PROJECT, ...searchTerms])],
    searchTerms: [...new Set(searchTerms)],
    sourceCategory: 'project',
  }
}

function toProjectEvidenceTime(project: Project): ChatEvidenceTime | null {
  const representativePeriod = project.period.end ?? project.period.start

  if (!PROJECT_PERIOD_DATE.PATTERN.test(representativePeriod)) {
    return null
  }

  return {
    kind: project.period.end ? 'project_ended' : 'project_started',
    value: `${representativePeriod}${PROJECT_PERIOD_DATE.FIRST_DAY_SUFFIX}`,
  }
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
  const repeatedTechStacks = collectRepeatedTechStacks(params.projects)
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
    id: `${CURATED_SOURCE_IDENTIFIER.NAMESPACE}/${params.locale}/about/${PROFILE_TECH_STACK_SOURCE.ID_SUFFIX}`,
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
      `${PROFILE_TECH_STACK_SOURCE.COMMON_TECH_STACK_LABEL[params.locale]}: ${repeatedTechStacks.join(', ')}`,
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
    const [publishedProjects, deployedProjects, projects] = await Promise.all([
      getAllProjects(locale),
      getDeployedProjects(locale),
      getPublishedAndDeployedProjects(locale),
    ])
    const curatedSources: ChatEvidenceRecord[] = []

    if (assistantProfile) {
      curatedSources.push(
        ...buildCuratedChatSourceRecords({
          idPrefix: `${CURATED_SOURCE_IDENTIFIER.NAMESPACE}/${locale}/assistant/profile`,
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
          idPrefix: `${CURATED_SOURCE_IDENTIFIER.NAMESPACE}/${locale}/about/profile`,
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
            idPrefix: `${CURATED_SOURCE_IDENTIFIER.NAMESPACE}/${locale}/about/profile-reference-${alternateLocale}`,
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
        projects: publishedProjects,
      })

      if (profileTechStackSource) {
        curatedSources.push(profileTechStackSource)
      }
    }

    const deployedProjectOverviewSource = buildDeployedProjectOverviewSource({
      locale,
      projects: deployedProjects,
    })

    if (deployedProjectOverviewSource) {
      curatedSources.push(deployedProjectOverviewSource)
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
        ...(project.deployment
          ? DEPLOYED_PROJECT_SOURCE.SEARCH_TERMS[locale]
          : []),
      ]
      const projectMetadataLines = buildProjectMetadataLines({
        locale,
        project,
      })

      curatedSources.push(
        ...buildCuratedChatSourceRecords({
          idPrefix: `${CURATED_SOURCE_IDENTIFIER.NAMESPACE}/${locale}/project/${project.slug}`,
          locale,
          slug: project.slug,
          title: project.title,
          baseUrl: buildProjectHref(project.slug, locale),
          introContent: [
            project.summary,
            project.keyFeatures.join(' '),
            project.techStacks.join(' '),
            ...projectMetadataLines,
            ...(project.deployment
              ? DEPLOYED_PROJECT_SOURCE.SEARCH_TERMS[locale]
              : []),
          ]
            .filter(Boolean)
            .join(' '),
          markdownContent: project.content,
          evidenceTime: toProjectEvidenceTime(project),
          tags: projectTags,
          baseSearchPhrases: [
            ...projectSemanticSearchTerms,
            project.title,
            project.summary,
            ...project.keyFeatures,
            ...project.techStacks,
            ...projectMetadataLines,
            'GitHub 주소',
            'repository URL',
            'npm 주소',
            'package URL',
            ...CURATED_SOURCE_TAGS.PROJECT,
          ],
          sourceCategory: 'project',
        }),
      )
    }

    return curatedSources
  },
)
