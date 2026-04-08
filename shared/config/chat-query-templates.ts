import { LOCALES, type SupportedLocale } from '@/shared/config/constants'

export const CHAT_QUERY_INTENTS = [
  'profile.name',
  'profile.identity',
  'project.summary',
  'project.tech-stack',
  'blog.topic',
] as const

export type ChatQueryIntent = (typeof CHAT_QUERY_INTENTS)[number]

interface BuildChatQueryTemplatesParams {
  locale: SupportedLocale
  queryIntent: ChatQueryIntent
  subjectTerms: string[]
}

type ChatQueryTemplateResolver = (subjectTerms: string[]) => string[]

const CHAT_QUERY_TEMPLATES: Record<
  SupportedLocale,
  Record<ChatQueryIntent, ChatQueryTemplateResolver>
> = {
  ko: {
    'profile.name': (subjectTerms) => {
      return subjectTerms.flatMap((subjectTerm) => {
        return [`${subjectTerm} 이름 뭐야`, `${subjectTerm} 누구야`]
      })
    },
    'profile.identity': (subjectTerms) => {
      return subjectTerms.flatMap((subjectTerm) => {
        return [`${subjectTerm} 어떤 사람이야`, `${subjectTerm} 소개해줘`]
      })
    },
    'project.summary': (subjectTerms) => {
      return subjectTerms.flatMap((subjectTerm) => {
        return [`${subjectTerm} 프로젝트 뭐야`, `${subjectTerm}는 뭐야`]
      })
    },
    'project.tech-stack': (subjectTerms) => {
      return subjectTerms.map((subjectTerm) => {
        return `${subjectTerm} 사용하는 프로젝트 뭐야`
      })
    },
    'blog.topic': (subjectTerms) => {
      return subjectTerms.flatMap((subjectTerm) => {
        return [`${subjectTerm} 글 뭐야`, `${subjectTerm} 글 추천해줘`]
      })
    },
  },
  en: {
    'profile.name': (subjectTerms) => {
      return subjectTerms.flatMap((subjectTerm) => {
        return [
          `what is the ${subjectTerm} name`,
          `who is the ${subjectTerm}`,
          'what is his name',
        ]
      })
    },
    'profile.identity': (subjectTerms) => {
      return subjectTerms.flatMap((subjectTerm) => {
        return [`who is the ${subjectTerm}`, `what kind of person is the ${subjectTerm}`]
      })
    },
    'project.summary': (subjectTerms) => {
      return subjectTerms.flatMap((subjectTerm) => {
        return [`what is ${subjectTerm}`, `what does ${subjectTerm} do`]
      })
    },
    'project.tech-stack': (subjectTerms) => {
      return subjectTerms.map((subjectTerm) => {
        return `which project uses ${subjectTerm}`
      })
    },
    'blog.topic': (subjectTerms) => {
      return subjectTerms.flatMap((subjectTerm) => {
        return [`what is ${subjectTerm}`, `post about ${subjectTerm}`]
      })
    },
  },
}

function normalizeTemplateResult(result: string[]): string[] {
  return [...new Set(result.map((value) => value.trim().toLowerCase()).filter(Boolean))]
}

export function buildChatQueryTemplates({
  locale,
  queryIntent,
  subjectTerms,
}: BuildChatQueryTemplatesParams): string[] {
  const resolver =
    CHAT_QUERY_TEMPLATES[locale]?.[queryIntent] ??
    CHAT_QUERY_TEMPLATES[LOCALES.DEFAULT][queryIntent]

  return normalizeTemplateResult(resolver(subjectTerms))
}
