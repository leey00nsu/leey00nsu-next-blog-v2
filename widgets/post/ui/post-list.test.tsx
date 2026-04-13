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
        ...properties
      }: MotionDivMockProps) => (
        <div data-testid="motion-div" {...properties}>
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
  it('motion 기반 리스트 래퍼와 카드별 애니메이션 래퍼를 렌더링한다', () => {
    render(<PostList posts={POSTS} locale="ko" />)

    expect(screen.getAllByTestId('motion-div')).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'First Post' })).toHaveAttribute(
      'href',
      '/ko/blog/first-post',
    )
  })
})
