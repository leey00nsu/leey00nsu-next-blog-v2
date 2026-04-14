import { describe, expect, it } from 'vitest'
import {
  buildTocContainerVariants,
  calcTocActiveBoundaryRootMargin,
  calcTocHeadingIndent,
  calcTocScrollTargetTop,
  isTocScrollNearBottom,
  resolveActiveTocHeadingId,
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

describe('calcTocActiveBoundaryRootMargin', () => {
  it('active heading 감지를 위한 좁은 상단 band root margin을 계산한다', () => {
    expect(calcTocActiveBoundaryRootMargin(800)).toBe('-64px 0px -320px 0px')
  })
})

describe('isTocScrollNearBottom', () => {
  it('문서 하단 근처 스크롤 위치를 감지한다', () => {
    expect(isTocScrollNearBottom(900, 400, 1300)).toBe(true)
    expect(isTocScrollNearBottom(800, 400, 1300)).toBe(false)
  })
})

describe('resolveActiveTocHeadingId', () => {
  const headings = [
    { depth: 2, text: 'Introduction', slug: 'introduction' },
    { depth: 3, text: 'Getting Started', slug: 'getting-started' },
  ]

  it('기준선을 지난 heading 중 마지막 항목을 활성 상태로 선택한다', () => {
    expect(
      resolveActiveTocHeadingId({
        headings,
        activeBoundaryHeadingSlugSet: new Set(['introduction']),
        visibleHeadingSlugSet: new Set(['introduction', 'getting-started']),
        currentActiveHeadingSlug: null,
        isNearBottom: false,
      }),
    ).toBe('introduction')
  })

  it('하단 근처에서는 보이는 heading 중 마지막 항목을 활성 상태로 선택한다', () => {
    expect(
      resolveActiveTocHeadingId({
        headings,
        activeBoundaryHeadingSlugSet: new Set(),
        visibleHeadingSlugSet: new Set(['introduction', 'getting-started']),
        currentActiveHeadingSlug: null,
        isNearBottom: true,
      }),
    ).toBe('getting-started')
  })

  it('아직 기준선을 지난 heading이 없으면 첫 항목을 활성 상태로 유지한다', () => {
    expect(
      resolveActiveTocHeadingId({
        headings,
        activeBoundaryHeadingSlugSet: new Set(),
        visibleHeadingSlugSet: new Set(['introduction']),
        currentActiveHeadingSlug: null,
        isNearBottom: false,
      }),
    ).toBe('introduction')
  })

  it('active region에 해당 heading이 없어도 현재 보이는 active heading은 유지한다', () => {
    expect(
      resolveActiveTocHeadingId({
        headings,
        activeBoundaryHeadingSlugSet: new Set(),
        visibleHeadingSlugSet: new Set(['getting-started']),
        currentActiveHeadingSlug: 'getting-started',
        isNearBottom: false,
      }),
    ).toBe('getting-started')
  })

  it('현재 active가 없고 한 개의 heading만 보이면 그 heading을 활성 상태로 선택한다', () => {
    expect(
      resolveActiveTocHeadingId({
        headings,
        activeBoundaryHeadingSlugSet: new Set(),
        visibleHeadingSlugSet: new Set(['getting-started']),
        currentActiveHeadingSlug: null,
        isNearBottom: false,
      }),
    ).toBe('getting-started')
  })
})
