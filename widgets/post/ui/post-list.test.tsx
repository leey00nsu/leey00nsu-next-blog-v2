import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Post } from '@/entities/post/model/types'
import { PostList } from '@/widgets/post/ui/post-list'

interface MotionDivMockProps extends Record<string, unknown> {
  children?: ReactNode
}

vi.mock('next/link', () => {
  return {
    default: ({
      href,
      children,
    }: {
      href: string
      children: ReactNode
    }) => <a href={href}>{children}</a>,
  }
})

vi.mock('@/entities/post/ui/post-card', () => {
  return {
    PostCard: ({ post }: { post: Post }) => (
      <article data-testid="post-card">{post.title}</article>
    ),
  }
})

vi.mock('motion/react', () => {
  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    motion: {
      div: ({
        children,
        layout,
        variants,
        initial,
        animate,
        exit,
        onAnimationComplete,
        ...properties
      }: MotionDivMockProps) => (
        <div
          data-testid="motion-div"
          data-initial={String(initial)}
          {...properties}
        >
          {children}
        </div>
      ),
    },
    useReducedMotion: () => false,
  }
})

const POSTS: Post[] = [
  {
    slug: 'first-post',
    date: new Date('2025-01-01'),
    title: 'First Post',
    description: 'First description',
    tags: ['react'],
    section: 'blog',
    series: null,
    thumbnail: null,
    draft: false,
    writer: 'lee',
    content: 'content',
    width: 1200,
    height: 630,
  },
  {
    slug: 'second-post',
    date: new Date('2025-01-02'),
    title: 'Second Post',
    description: 'Second description',
    tags: ['nextjs'],
    section: 'blog',
    series: null,
    thumbnail: null,
    draft: false,
    writer: 'lee',
    content: 'content',
    width: 1200,
    height: 630,
  },
]

describe('PostList', () => {
  it('최초 렌더에서만 리스트 진입 애니메이션을 실행한다', () => {
    const { unmount } = render(<PostList posts={POSTS} locale="ko" />)

    expect(screen.getAllByTestId('motion-div')).toHaveLength(3)
    expect(screen.getAllByTestId('motion-div')[0]).toHaveAttribute(
      'data-initial',
      'hidden',
    )
    expect(screen.getByRole('link', { name: 'First Post' })).toHaveAttribute(
      'href',
      '/ko/blog/first-post',
    )

    unmount()
    render(<PostList posts={POSTS} locale="ko" />)

    expect(screen.getAllByTestId('motion-div')[0]).toHaveAttribute(
      'data-initial',
      'false',
    )
  })
})
