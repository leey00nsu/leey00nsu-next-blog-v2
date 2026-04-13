import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Project } from '@/entities/project/model/types'
import { ProjectDetail } from '@/widgets/project/ui/project-detail'

vi.mock('next-intl/server', () => {
  return {
    getTranslations: async () => {
      return (translationKey: string) => translationKey
    },
  }
})

vi.mock('@/entities/project/lib/format-project-period', () => {
  return {
    formatProjectPeriod: () => '2024.01 ~ 2024.12',
  }
})

vi.mock('@/shared/ui/custom-image', () => {
  return {
    CustomImage: () => <div data-testid="project-image" />,
  }
})

vi.mock('@/features/mdx/ui/mdx-renderer', () => {
  return {
    MdxRenderer: ({ content }: { content: string }) => (
      <div data-testid="mdx-renderer">{content}</div>
    ),
  }
})

vi.mock('@/shared/ui/entrance-motion-block', () => {
  return {
    EntranceMotionBlock: ({
      children,
      disabled,
    }: {
      children?: React.ReactNode
      disabled?: boolean
    }) => (
      <div data-testid="entrance-block" data-disabled={disabled ? 'true' : 'false'}>
        {children}
      </div>
    ),
  }
})

const PROJECT: Project = {
  slug: 'sample-project',
  title: 'Sample Project',
  summary: 'summary',
  keyFeatures: [],
  links: {},
  period: {
    start: '2024.01',
    end: '2024.12',
  },
  techStacks: ['React', 'Next.js'],
  thumbnail: null,
  draft: false,
  type: 'team',
  content: 'project content',
  width: 0,
  height: 0,
}

describe('ProjectDetail', () => {
  it('프로젝트 소개 주요 블록을 공통 등장 애니메이션 래퍼로 감싼다', async () => {
    render(await ProjectDetail({ project: PROJECT, locale: 'ko' }))

    expect(screen.getAllByTestId('entrance-block')).toHaveLength(3)
    expect(screen.getByText('Sample Project')).toBeInTheDocument()
  })

  it('애니메이션을 비활성화하면 print 용 프로젝트 화면에서 래퍼를 정적으로 사용한다', async () => {
    render(
      await ProjectDetail({
        project: PROJECT,
        locale: 'ko',
        enableBlockEntranceAnimation: false,
      }),
    )

    expect(screen.getAllByTestId('entrance-block')).toHaveLength(3)
    expect(screen.getAllByTestId('entrance-block')[0]).toHaveAttribute(
      'data-disabled',
      'true',
    )
  })
})
