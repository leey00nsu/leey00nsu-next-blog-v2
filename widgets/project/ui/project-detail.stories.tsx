import type { Meta, StoryObj } from '@storybook/react'
import type { Project } from '@/entities/project/model/types'
import { ProjectDetailView } from '@/widgets/project/ui/project-detail-view'

const PROJECT: Project = {
  slug: 'lee-spec-kit',
  title: 'lee-spec-kit',
  summary:
    'AI 에이전트 기반 개발 흐름을 spec, plan, task 단위로 정리해 반복 가능한 워크플로우로 만든 도구입니다.',
  keyFeatures: ['spec 기반 작업 정의', 'task 분해', 'AI 개발 루프 표준화'],
  links: {
    github: 'https://github.com/leey00nsu/lee-spec-kit',
  },
  period: {
    start: '2025.08',
    end: null,
  },
  techStacks: ['TypeScript', 'Node.js', 'CLI', 'Markdown'],
  thumbnail: '/public/projects/lee-spec-kit/logo.png',
  draft: false,
  type: 'solo',
  content: `
## 문제

반복되는 개발 준비 작업을 매번 새로 정리하는 대신, 요구사항과 작업 흐름을 문서 중심으로 고정하고 싶었습니다.

## 접근

- spec 문서로 목표와 제약을 먼저 정리합니다.
- plan 문서로 구현 방향을 좁힙니다.
- task 문서로 실행 단위를 나눕니다.

## 결과

작업 전환 비용을 줄이고 AI 에이전트에게 더 일관된 컨텍스트를 제공할 수 있었습니다.
`,
  width: 512,
  height: 512,
}

const PROJECT_DETAIL_LABELS = {
  inProgressLabel: '진행 중',
  periodLabel: '프로젝트 기간',
  techStackLabel: '기술 스택',
  typeLabel: '프로젝트 유형',
  projectTypeLabel: '개인 프로젝트',
} as const

const meta: Meta<typeof ProjectDetailView> = {
  title: 'widgets/project/ProjectDetail',
  component: ProjectDetailView,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof ProjectDetailView>

export const Default: Story = {
  args: {
    project: PROJECT,
    labels: PROJECT_DETAIL_LABELS,
    enableBlockEntranceAnimation: false,
  },
  render: (args) => (
    <div className="w-[760px]">
      <ProjectDetailView {...args}>
        <h2>문제</h2>
        <p>
          반복되는 개발 준비 작업을 매번 새로 정리하는 대신, 요구사항과
          작업 흐름을 문서 중심으로 고정하고 싶었습니다.
        </p>
        <h2>접근</h2>
        <ul>
          <li>spec 문서로 목표와 제약을 먼저 정리합니다.</li>
          <li>plan 문서로 구현 방향을 좁힙니다.</li>
          <li>task 문서로 실행 단위를 나눕니다.</li>
        </ul>
      </ProjectDetailView>
    </div>
  ),
}

export const WithoutThumbnail: Story = {
  args: {
    ...Default.args,
    project: {
      ...PROJECT,
      thumbnail: null,
      width: 0,
      height: 0,
    },
  },
  render: (args) => (
    <div className="w-[760px]">
      <ProjectDetailView {...args}>
        <h2>본문</h2>
        <p>썸네일이 없는 상세 화면의 헤더 정렬을 확인합니다.</p>
      </ProjectDetailView>
    </div>
  ),
}
