import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { About } from '@/entities/about/model/types'
import { AboutDetail } from '@/widgets/about/ui/about-detail'

vi.mock('@/features/mdx/ui/mdx-renderer', () => {
  return {
    MdxRenderer: ({ content }: { content: string }) => (
      <div data-testid="mdx-renderer">{content}</div>
    ),
  }
})

vi.mock('@/widgets/about/ui/project-section', () => {
  return {
    ProjectSection: () => <section data-testid="project-section">projects</section>,
  }
})

vi.mock('@/features/pdf/ui/download-pdf-button', () => {
  return {
    DownloadPdfButton: () => <button type="button">download</button>,
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

const ABOUT: About = {
  title: 'About',
  description: 'description',
  content: 'about content',
}

describe('AboutDetail', () => {
  it('소개 페이지 주요 블록을 공통 등장 애니메이션 래퍼로 감싼다', () => {
    render(<AboutDetail about={ABOUT} locale="ko" />)

    expect(screen.getAllByTestId('entrance-block')).toHaveLength(3)
  })

  it('애니메이션이 비활성화되면 print 용 소개 화면에서 래퍼를 정적으로 사용한다', () => {
    render(
      <AboutDetail
        about={ABOUT}
        locale="ko"
        showDownloadButton={false}
        enableBlockEntranceAnimation={false}
      />,
    )

    expect(screen.getAllByTestId('entrance-block')).toHaveLength(2)
    expect(screen.getAllByTestId('entrance-block')[0]).toHaveAttribute(
      'data-disabled',
      'true',
    )
  })
})
