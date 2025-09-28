import { cache } from 'react'
import {
  GeneratedProjectSerialized,
  GeneratedProjectsMap,
  Project,
  ProjectSchema,
} from '@/entities/project/model/types'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'
import { GENERATED_PROJECTS } from '@/entities/project/config/projects.generated'

const DEFAULT_LOCALE = LOCALES.DEFAULT

const GENERATED_PROJECTS_MAP: GeneratedProjectsMap = GENERATED_PROJECTS

function resolveGeneratedProject(
  slug: string,
  locale: SupportedLocale,
): GeneratedProjectSerialized | undefined {
  const localeEntries = GENERATED_PROJECTS_MAP[locale]
  const fallbackEntries = GENERATED_PROJECTS_MAP[DEFAULT_LOCALE]
  return localeEntries?.[slug] ?? fallbackEntries?.[slug]
}

function hydrateProject(
  record: GeneratedProjectSerialized | undefined,
): Project | null {
  if (!record) return null

  try {
    return ProjectSchema.parse(record)
  } catch (error) {
    console.error(`Error hydrating project for slug ${record.slug}:`, error)
    return null
  }
}

export const getProjectBySlug = async (
  slug: string,
  locale: SupportedLocale = DEFAULT_LOCALE,
): Promise<Project | null> => {
  const record = resolveGeneratedProject(slug, locale)
  return hydrateProject(record)
}

export const getAllProjects = cache(
  async (
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<Project[]> => {
    const localeEntries = GENERATED_PROJECTS_MAP[locale]
    const fallbackEntries = GENERATED_PROJECTS_MAP[DEFAULT_LOCALE]

    if (!localeEntries && !fallbackEntries) {
      return []
    }

    const mergedSlugs = new Set<string>([
      ...Object.keys(localeEntries ?? {}),
      ...Object.keys(fallbackEntries ?? {}),
    ])

    const projects: Project[] = []

    for (const slug of mergedSlugs) {
      const record = resolveGeneratedProject(slug, locale)
      const project = hydrateProject(record)
      if (!project || project.draft) continue
      projects.push(project)
    }

    return projects.sort((a, b) => {
      const aPeriod = a.period.start ?? ''
      const bPeriod = b.period.start ?? ''
      return bPeriod.localeCompare(aPeriod)
    })
  },
)
