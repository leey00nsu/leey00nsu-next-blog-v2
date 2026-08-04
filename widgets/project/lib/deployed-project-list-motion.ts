const DEPLOYED_PROJECT_LIST_MOTION = {
  FIRST_CARD_DELAY_SECONDS: 0.06,
  CARD_STAGGER_DELAY_SECONDS: 0.06,
} as const

export function calcDeployedProjectCardDelaySeconds(
  projectIndex: number,
): number {
  return (
    DEPLOYED_PROJECT_LIST_MOTION.FIRST_CARD_DELAY_SECONDS +
    projectIndex * DEPLOYED_PROJECT_LIST_MOTION.CARD_STAGGER_DELAY_SECONDS
  )
}
