import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TagList } from '@/features/post/ui/tag-list'

vi.mock('next/link', () => {
  return {
    default: ({
      href,
      children,
      ...properties
    }: {
      href: string
      children: ReactNode
      [key: string]: unknown
    }) => (
      <a data-testid="next-link" href={href} {...properties}>
        {children}
      </a>
    ),
  }
})

describe('TagList', () => {
  it('hrefBuilder가 있으면 next/link를 사용해 태그 링크를 렌더링한다', () => {
    render(
      <TagList
        tags={['react', 'typescript']}
        hrefBuilder={(tag) => `/blog?tag=${tag}`}
      />,
    )

    const tagLinks = screen.getAllByTestId('next-link')

    expect(tagLinks).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'tag: react' })).toHaveAttribute(
      'href',
      '/blog?tag=react',
    )
  })
})
