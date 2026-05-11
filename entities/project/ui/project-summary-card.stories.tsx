import type { Meta, StoryObj } from '@storybook/react'
import type { Project } from '@/entities/project/model/types'
import { ProjectSummaryCardView } from '@/entities/project/ui/project-summary-card'

const PROJECT_SUMMARY_CARD_LABELS = {
  inProgressLabel: '진행 중',
  periodLabel: '프로젝트 기간',
  techStackLabel: '기술 스택',
  typeLabel: '프로젝트 유형',
  projectTypeLabel: '개인 프로젝트',
  githubAriaLabel: 'Leesfield GitHub로 이동',
  detailAriaLabel: 'Leesfield 상세 페이지로 이동',
} as const

const PROJECT: Project = {
  slug: 'leesfield',
  title: 'Leesfield',
  summary:
    'AI 기반 작문 피드백을 통해 영어 학습자가 글을 반복적으로 개선할 수 있도록 돕는 서비스입니다.',
  keyFeatures: [
    '작문 제출과 AI 피드백',
    '학습 기록 기반 대시보드',
    '세션 기반 인증과 사용자별 데이터 관리',
  ],
  links: {
    github: 'https://github.com/leey00nsu/leesfield',
  },
  period: {
    start: '2024.09',
    end: null,
  },
  techStacks: [
    'Next.js',
    'TypeScript',
    'Tailwind CSS',
    'Prisma',
    'PostgreSQL',
    'Hugging Face',
  ],
  thumbnail: '/public/projects/leesfield/logo.webp',
  draft: false,
  type: 'solo',
  content: 'Leesfield project content',
  width: 512,
  height: 512,
}

const meta: Meta<typeof ProjectSummaryCardView> = {
  title: 'entities/project/ProjectSummaryCard',
  component: ProjectSummaryCardView,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
}

export default meta
type Story = StoryObj<typeof ProjectSummaryCardView>

export const Default: Story = {
  args: {
    project: PROJECT,
    locale: 'ko',
    labels: PROJECT_SUMMARY_CARD_LABELS,
  },
  render: (args) => (
    <div className="w-[520px]">
      <ProjectSummaryCardView {...args} />
    </div>
  ),
}

export const GithubLink: Story = {
  args: {
    project: PROJECT,
    locale: 'ko',
    linkVariant: 'github',
    labels: PROJECT_SUMMARY_CARD_LABELS,
  },
  render: (args) => (
    <div className="w-[520px]">
      <ProjectSummaryCardView {...args} />
    </div>
  ),
}

export const WithoutThumbnail: Story = {
  args: {
    project: {
      ...PROJECT,
      thumbnail: null,
      width: 0,
      height: 0,
    },
    locale: 'ko',
    labels: PROJECT_SUMMARY_CARD_LABELS,
  },
  render: (args) => (
    <div className="w-[520px]">
      <ProjectSummaryCardView {...args} />
    </div>
  ),
}
