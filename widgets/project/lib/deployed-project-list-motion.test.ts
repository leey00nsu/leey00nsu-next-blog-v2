import { describe, expect, it } from 'vitest'
import { calcDeployedProjectCardDelaySeconds } from '@/widgets/project/lib/deployed-project-list-motion'

const PROJECT_CARD_INDEX = {
  FIRST: 0,
  SECOND: 1,
  SIXTH: 5,
} as const

describe('calcDeployedProjectCardDelaySeconds', () => {
  it('프로젝트 카드 순서에 따라 등장 지연 시간을 증가시킨다', () => {
    expect(calcDeployedProjectCardDelaySeconds(PROJECT_CARD_INDEX.FIRST)).toBe(
      0.06,
    )
    expect(calcDeployedProjectCardDelaySeconds(PROJECT_CARD_INDEX.SECOND)).toBe(
      0.12,
    )
    expect(
      calcDeployedProjectCardDelaySeconds(PROJECT_CARD_INDEX.SIXTH),
    ).toBeCloseTo(0.36)
  })
})
