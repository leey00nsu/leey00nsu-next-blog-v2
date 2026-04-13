import { describe, expect, it } from 'vitest'
import {
  buildTocContainerVariants,
  calcTocHeadingIndent,
  calcTocScrollTargetTop,
} from '@/features/post/lib/toc-motion'

describe('buildTocContainerVariants', () => {
  it('모션이 허용되면 목차 컨테이너가 아래에서 위로 fade up 한다', () => {
    expect(buildTocContainerVariants(false).hidden).toEqual({
      opacity: 0,
      y: 12,
    })
  })

  it('reduced motion 환경에서는 정적인 variant를 반환한다', () => {
    expect(buildTocContainerVariants(true)).toEqual({
      hidden: {
        opacity: 1,
        y: 0,
      },
      visible: {
        opacity: 1,
        y: 0,
      },
    })
  })
})

describe('calcTocHeadingIndent', () => {
  it('heading depth 기준으로 들여쓰기 rem 값을 계산한다', () => {
    expect(calcTocHeadingIndent(2)).toBe('0rem')
    expect(calcTocHeadingIndent(3)).toBe('1rem')
    expect(calcTocHeadingIndent(4)).toBe('2rem')
  })
})

describe('calcTocScrollTargetTop', () => {
  it('고정 헤더 오프셋을 고려한 스크롤 목표 위치를 계산한다', () => {
    expect(calcTocScrollTargetTop(320, 100)).toBe(356)
  })
})
