import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DeployedProject } from '@/entities/project/model/types'
import { DeployedProjectCard } from '@/entities/project/ui/deployed-project-card'

vi.mock('@/shared/ui/custom-image', () => {
  return {
    CustomImage: ({ alt }: { alt: string }) => (
      <span role="img" aria-label={alt} />
    ),
  }
})

const STOCK_AQUARIUM_PROJECT: DeployedProject = {
  slug: 'stock-aquarium',
  title: 'Stock Aquarium',
  summary: '실시간 주식 체결 데이터를 3D 수조로 표현한 서비스',
  keyFeatures: [],
  links: {
    github: 'https://github.com/leey00nsu/stock-aquarium',
  },
  period: {
    start: '2026-07',
    end: '2026-07',
  },
  techStacks: ['Next.js', 'TypeScript', 'Three.js'],
  thumbnail: '/public/projects/stock-aquarium/stock-aquarium-icon.png',
  draft: true,
  type: 'solo',
  deployment: {
    status: 'active',
    kind: 'service',
    category: 'dataVisualization',
    url: 'https://aquarium.leey00nsu.com/',
    order: 2,
    coverImage: '/public/projects/stock-aquarium/stock-aquarium-screen.png',
  },
  content: 'Stock Aquarium project content',
  width: 512,
  height: 512,
}

const CARD_LABELS = {
  category: '데이터 시각화',
  primaryAction: '서비스 보기',
  primaryActionAriaLabel: 'Stock Aquarium 서비스 열기',
  detailAction: '자세히 보기',
  detailActionAriaLabel: 'Stock Aquarium 상세 페이지 열기',
  githubAction: 'GitHub',
  githubActionAriaLabel: 'Stock Aquarium GitHub 저장소 열기',
  coverImageAlt: 'Stock Aquarium 대표 화면',
  techStackAriaLabel: 'Stock Aquarium 기술 스택',
} as const

describe('DeployedProjectCard', () => {
  it('상세 페이지와 서비스, GitHub로 이동하는 경로를 제공한다', () => {
    render(
      <DeployedProjectCard
        project={STOCK_AQUARIUM_PROJECT}
        locale="ko"
        labels={CARD_LABELS}
      />,
    )

    const detailLinks = screen.getAllByRole('link', {
      name: /Stock Aquarium (상세 페이지 열기|대표 화면)/,
    })

    expect(detailLinks.length).toBeGreaterThanOrEqual(2)
    expect(
      detailLinks.every(
        (detailLink) =>
          detailLink.getAttribute('href') === '/ko/projects/stock-aquarium',
      ),
    ).toBe(true)
    expect(
      screen.getByRole('link', { name: 'Stock Aquarium 서비스 열기' }),
    ).toHaveAttribute('href', 'https://aquarium.leey00nsu.com/')
    expect(
      screen.getByRole('link', {
        name: 'Stock Aquarium GitHub 저장소 열기',
      }),
    ).toHaveAttribute('href', 'https://github.com/leey00nsu/stock-aquarium')
    expect(screen.getByText('데이터 시각화')).toBeInTheDocument()
    expect(screen.queryByText('운영 중')).not.toBeInTheDocument()
  })
})
