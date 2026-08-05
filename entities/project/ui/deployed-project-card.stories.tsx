import type { Meta, StoryObj } from '@storybook/react'
import { DeployedProjectCard } from '@/entities/project/ui/deployed-project-card'
import type { DeployedProject } from '@/entities/project/model/types'

const DEPLOYED_PROJECT: DeployedProject = {
  slug: 'stock-aquarium',
  title: 'Stock Aquarium',
  summary:
    '실시간 주식 체결 데이터를 3D 수조 속 물고기로 표현한 데이터 시각화 서비스',
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
    coverImage: '/public/projects/stock-aquarium/stock-aquarium-icon.png',
  },
  content: 'Stock Aquarium project content',
  width: 512,
  height: 512,
}

const DEPLOYED_PROJECT_CARD_LABELS = {
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

const meta: Meta<typeof DeployedProjectCard> = {
  title: 'entities/project/DeployedProjectCard',
  component: DeployedProjectCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
}

export default meta
type Story = StoryObj<typeof DeployedProjectCard>

export const Default: Story = {
  args: {
    project: DEPLOYED_PROJECT,
    locale: 'ko',
    labels: DEPLOYED_PROJECT_CARD_LABELS,
  },
  render: (arguments_) => (
    <div className="w-[360px]">
      <DeployedProjectCard {...arguments_} />
    </div>
  ),
}
