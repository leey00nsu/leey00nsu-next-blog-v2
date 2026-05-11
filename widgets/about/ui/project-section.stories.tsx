import type { Meta, StoryObj } from '@storybook/react'
import type { Project } from '@/entities/project/model/types'
import { ProjectSectionView } from '@/widgets/about/ui/project-section'

const PROJECTS: Project[] = [
  {
    slug: 'leesfield',
    title: 'Leesfield',
    summary:
      'AI 기반 작문 피드백을 통해 영어 학습자가 글을 반복적으로 개선할 수 있도록 돕는 서비스입니다.',
    keyFeatures: ['AI 피드백', '학습 기록', '사용자별 대시보드'],
    links: {
      github: 'https://github.com/leey00nsu/leesfield',
    },
    period: {
      start: '2024.09',
      end: null,
    },
    techStacks: ['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL'],
    thumbnail: '/public/projects/leesfield/logo.webp',
    draft: false,
    type: 'solo',
    content: 'Leesfield project content',
    width: 512,
    height: 512,
  },
  {
    slug: 'blog',
    title: 'Blog',
    summary:
      'MDX 기반 콘텐츠와 정적 생성, 블로그 챗봇을 함께 다루는 개인 기술 블로그입니다.',
    keyFeatures: ['MDX 콘텐츠', '정적 생성', '하이브리드 RAG 챗봇'],
    links: {},
    period: {
      start: '2025.01',
      end: null,
    },
    techStacks: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Storybook'],
    thumbnail: '/public/projects/blog/logo.webp',
    draft: false,
    type: 'solo',
    content: 'Blog project content',
    width: 512,
    height: 512,
  },
]

const meta: Meta<typeof ProjectSectionView> = {
  title: 'widgets/about/ProjectSection',
  component: ProjectSectionView,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
}

export default meta
type Story = StoryObj<typeof ProjectSectionView>

export const Default: Story = {
  args: {
    locale: 'ko',
    projects: PROJECTS,
    title: '프로젝트',
    description: '최근 진행한 프로젝트입니다.',
    buildProjectCardLabels: (project) => ({
      inProgressLabel: '진행 중',
      periodLabel: '프로젝트 기간',
      techStackLabel: '기술 스택',
      typeLabel: '프로젝트 유형',
      projectTypeLabel: project.type === 'solo' ? '개인 프로젝트' : '팀 프로젝트',
      githubAriaLabel: `${project.title} GitHub로 이동`,
      detailAriaLabel: `${project.title} 상세 페이지로 이동`,
    }),
  },
  render: (args) => (
    <div className="w-[640px]">
      <ProjectSectionView {...args} />
    </div>
  ),
}

export const Empty: Story = {
  args: {
    ...Default.args,
    projects: [],
  },
}
