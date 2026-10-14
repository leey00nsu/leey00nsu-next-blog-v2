import type { Project } from '@/entities/project/model/types'

export function compareProjectsByPeriod(
  firstProject: Pick<Project, 'period' | 'slug'>,
  secondProject: Pick<Project, 'period' | 'slug'>,
): number {
  const firstProjectIsOngoing = firstProject.period.end === null
  const secondProjectIsOngoing = secondProject.period.end === null

  if (firstProjectIsOngoing !== secondProjectIsOngoing) {
    return firstProjectIsOngoing ? -1 : 1
  }

  // YYYY-MM dates sort chronologically with string comparison.
  const endComparison = (secondProject.period.end ?? '').localeCompare(
    firstProject.period.end ?? '',
  )
  const startComparison = secondProject.period.start.localeCompare(
    firstProject.period.start,
  )

  return (
    endComparison ||
    startComparison ||
    firstProject.slug.localeCompare(secondProject.slug)
  )
}
