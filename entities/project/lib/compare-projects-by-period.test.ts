import { describe, expect, it } from 'vitest'
import { compareProjectsByPeriod } from '@/entities/project/lib/compare-projects-by-period'
import { ProjectPeriodSchema } from '@/entities/project/model/types'

describe('compareProjectsByPeriod', () => {
  it.each([
    {
      description:
        '완료 프로젝트의 시작일이 더 최근이어도 진행 중 프로젝트가 먼저 온다',
      firstPeriod: { start: '2026-01', end: null },
      secondPeriod: { start: '2026-09', end: '2026-10' },
    },
    {
      description: '완료 프로젝트는 시작일보다 종료일을 우선한다',
      firstPeriod: { start: '2025-01', end: '2026-10' },
      secondPeriod: { start: '2026-09', end: '2026-09' },
    },
    {
      description: '종료일이 같으면 시작일이 최근인 프로젝트가 먼저 온다',
      firstPeriod: { start: '2026-09', end: '2026-10' },
      secondPeriod: { start: '2026-01', end: '2026-10' },
    },
    {
      description:
        '진행 중 프로젝트끼리는 시작일이 최근인 프로젝트가 먼저 온다',
      firstPeriod: { start: '2026-09', end: null },
      secondPeriod: { start: '2026-01', end: null },
    },
    {
      description: '완료 프로젝트의 기간이 같으면 slug 순서를 따른다',
      firstPeriod: { start: '2026-01', end: '2026-10' },
      secondPeriod: { start: '2026-01', end: '2026-10' },
    },
    {
      description: '진행 중 프로젝트의 시작일이 같으면 slug 순서를 따른다',
      firstPeriod: { start: '2026-01', end: null },
      secondPeriod: { start: '2026-01', end: null },
    },
  ])('$description', ({ firstPeriod, secondPeriod }) => {
    const firstProject = { slug: 'alpha', period: firstPeriod }
    const secondProject = { slug: 'beta', period: secondPeriod }

    expect(compareProjectsByPeriod(firstProject, secondProject)).toBeLessThan(0)
    expect(
      compareProjectsByPeriod(secondProject, firstProject),
    ).toBeGreaterThan(0)
    expect(compareProjectsByPeriod(firstProject, firstProject)).toBe(0)
  })

  it('종료일이 생략된 기간도 스키마 기본값을 통해 진행 중으로 정렬한다', () => {
    const ongoingProject = {
      slug: 'ongoing',
      period: ProjectPeriodSchema.parse({ start: '2026-01' }),
    }
    const completedProject = {
      slug: 'completed',
      period: { start: '2026-09', end: '2026-10' },
    }

    expect(
      compareProjectsByPeriod(ongoingProject, completedProject),
    ).toBeLessThan(0)
  })
})
