import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Post } from '@/entities/post/model/types'
import { PostDetail } from '@/widgets/post/ui/post-detail'

vi.mock('@/features/mdx/ui/mdx-renderer', () => {
  return {
    MdxRenderer: ({ content }: { content: string }) => (
      <div data-testid="mdx-renderer">{content}</div>
    ),
  }
})

vi.mock('@/features/post/ui/toc', () => {
  return {
    Toc: () => <nav data-testid="toc">toc</nav>,
  }
})

vi.mock('@/features/post/ui/toc-register', () => {
  return {
    TocRegister: () => null,
  }
})

vi.mock('@/features/post/ui/giscus-comments', () => {
  return {
    GiscusComments: () => <div data-testid="comments">comments</div>,
  }
})

vi.mock('@/features/post/ui/tag-list', () => {
  return {
    TagList: () => <div data-testid="tag-list">tags</div>,
  }
})

vi.mock('@/features/post/ui/share-button', () => {
  return {
    ShareButton: () => <button type="button">share</button>,
  }
})

vi.mock('@/shared/ui/json-ld', () => {
  return {
    JsonLd: () => null,
  }
})

vi.mock('@/shared/ui/entrance-motion-block', () => {
  return {
    EntranceMotionBlock: ({
      children,
    }: {
      children?: React.ReactNode
    }) => <div data-testid="entrance-block">{children}</div>,
  }
})

const POST: Post = {
  slug: 'sample-post',
  date: new Date('2025-01-01'),
  title: 'Sample Post',
  description: 'description',
  tags: ['react'],
  section: 'blog',
  series: null,
  thumbnail: null,
  draft: false,
  writer: 'lee',
  content: 'post content',
  width: 1200,
  height: 630,
}

describe('PostDetail', () => {
  it('게시글 주요 블록을 공통 등장 애니메이션 래퍼로 감싼다', () => {
    render(<PostDetail post={POST} locale="ko" />)

    expect(screen.getAllByTestId('entrance-block')).toHaveLength(3)
    expect(screen.getByTestId('comments')).toBeInTheDocument()
  })
})
