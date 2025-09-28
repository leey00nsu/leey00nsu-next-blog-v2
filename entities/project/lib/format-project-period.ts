import { Project } from '@/entities/project/model/types'

const PERIOD_SEPARATOR = ' ~ ' as const

export function formatProjectPeriod(
  period: Project['period'],
  inProgressLabel: string,
): string {
  const startText = period.start
  const endText = period.end ?? inProgressLabel
  return `${startText}${PERIOD_SEPARATOR}${endText}`
}
