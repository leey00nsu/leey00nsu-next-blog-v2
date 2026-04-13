import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExpandableTagFilterList } from './expandable-tag-filter-list'

vi.mock('next-intl', () => {
  return {
    useTranslations: () => {
      return (translationKey: string) => translationKey
    },
  }
})

const TAGS = [
  'react',
  'typescript',
  'nextjs',
  'tailwind',
  'vitest',
  'playwright',
  'storybook',
  'nodejs',
  'zod',
  'zustand',
]

const COUNTS = Object.fromEntries(TAGS.map((tag) => [tag, 1]))

describe('ExpandableTagFilterList', () => {
  it('기본 상태에서는 일부 태그만 먼저 노출한다', () => {
    render(
      <ExpandableTagFilterList
        basePath="/blog"
        tags={TAGS}
        counts={COUNTS}
        selectedTags={[]}
      />,
    )

    expect(screen.getByRole('link', { name: 'tag: react' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'tag: react' })).toHaveAttribute(
      'href',
      '/blog?tag=react',
    )
    expect(
      screen.getByRole('link', { name: 'tag: nodejs' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'tag: zustand' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'tagFilter.showMore' }),
    ).toBeInTheDocument()
  })

  it('더보기 버튼은 가운데 정렬되고 secondary 버튼 스타일을 사용한다', () => {
    render(
      <ExpandableTagFilterList
        basePath="/blog"
        tags={TAGS}
        counts={COUNTS}
        selectedTags={[]}
      />,
    )

    const toggleButton = screen.getByRole('button', {
      name: 'tagFilter.showMore',
    })

    expect(toggleButton).toHaveClass('bg-secondary')
    expect(toggleButton).toHaveClass('text-secondary-foreground')
    expect(toggleButton.parentElement).toHaveClass('flex')
    expect(toggleButton.parentElement).toHaveClass('w-full')
    expect(toggleButton.parentElement).toHaveClass('justify-center')
  })

  it('접힌 상태에서도 선택된 태그는 계속 노출한다', () => {
    render(
      <ExpandableTagFilterList
        basePath="/blog"
        tags={TAGS}
        counts={COUNTS}
        selectedTags={['zustand']}
      />,
    )

    expect(
      screen.getByRole('link', { name: 'tag: zustand' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'tag: zod' })).not.toBeInTheDocument()
  })

  it('더보기 버튼을 누르면 모든 태그를 노출하고 접기 버튼으로 바뀐다', () => {
    render(
      <ExpandableTagFilterList
        basePath="/blog"
        tags={TAGS}
        counts={COUNTS}
        selectedTags={[]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'tagFilter.showMore' }))

    expect(screen.getByRole('link', { name: 'tag: zod' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'tag: zustand' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'tagFilter.showLess' }),
    ).toBeInTheDocument()
  })
})
