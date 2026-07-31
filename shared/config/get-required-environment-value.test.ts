import { describe, expect, it } from 'vitest'
import { getRequiredEnvironmentValue } from '@/shared/config/get-required-environment-value'

const ENVIRONMENT_VARIABLE_NAMES = {
  PRIMARY: 'PRIMARY_MODEL',
  FALLBACK: 'FALLBACK_MODEL',
} as const

describe('getRequiredEnvironmentValue', () => {
  it('첫 번째로 설정된 값을 반환한다', () => {
    expect(
      getRequiredEnvironmentValue({
        variableNames: Object.values(ENVIRONMENT_VARIABLE_NAMES),
        values: ['primary-model', 'fallback-model'],
      }),
    ).toBe('primary-model')
  })

  it('빈 값을 건너뛰고 다음 설정값을 반환한다', () => {
    expect(
      getRequiredEnvironmentValue({
        variableNames: Object.values(ENVIRONMENT_VARIABLE_NAMES),
        values: ['  ', 'fallback-model'],
      }),
    ).toBe('fallback-model')
  })

  it('설정된 값이 없으면 환경변수 이름이 포함된 오류를 발생시킨다', () => {
    expect(() =>
      getRequiredEnvironmentValue({
        variableNames: Object.values(ENVIRONMENT_VARIABLE_NAMES),
        values: [undefined, ''],
      }),
    ).toThrow('PRIMARY_MODEL or FALLBACK_MODEL is required.')
  })
})
