import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExpandableTagFilterList } from './expandable-tag-filter-list'

const MATCH_MEDIA_DESKTOP_QUERY = '(min-width: 1024px)'

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

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

function mockResponsiveEnvironment(params?: { isDesktop?: boolean }) {
  const isDesktop = params?.isDesktop ?? false

  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: isDesktop && query === MATCH_MEDIA_DESKTOP_QUERY,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

function mockTagRowIndexes(tagRowIndexes: Record<string, number>) {
  const originalOffsetTopDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetTop',
  )

  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get() {
      if (this.tagName !== 'LI') {
        return 0
      }

      const tagNameMatch = this.textContent?.match(/^#(.+?) \(\d+\)$/)
      const tagName = tagNameMatch?.[1] ?? ''
      const currentRowIndex = tagRowIndexes[tagName] ?? 0

      return currentRowIndex * 32
    },
  })

  return () => {
    if (originalOffsetTopDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'offsetTop',
        originalOffsetTopDescriptor,
      )
      return
    }

    delete (HTMLElement.prototype as Partial<HTMLElement>).offsetTop
  }
}

describe('ExpandableTagFilterList', () => {
  it('모바일에서는 접힌 상태에서 허용된 행 수 안의 태그를 노출하고 overlay를 표시한다', () => {
    mockResponsiveEnvironment()
    const restoreOffsetTop = mockTagRowIndexes({
      react: 0,
      typescript: 0,
      nextjs: 0,
      tailwind: 1,
      vitest: 1,
      playwright: 1,
      storybook: 2,
      nodejs: 2,
      zod: 2,
      zustand: 2,
    })

    render(
      <ExpandableTagFilterList
        basePath="/blog"
        tags={TAGS}
        counts={COUNTS}
        selectedTags={[]}
      />,
    )

    restoreOffsetTop()

    expect(screen.getByRole('link', { name: 'tag: react' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'tag: react' })).toHaveAttribute(
      'href',
      '/blog?tag=react',
    )
    expect(
      screen.getByRole('link', { name: 'tag: playwright' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'tag: storybook' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'tagFilter.showMore' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('collapsed-tag-filter-overlay')).toHaveClass('h-6')
  })

  it('더보기 버튼은 가운데 정렬되고 secondary 버튼 스타일을 사용한다', () => {
    mockResponsiveEnvironment()
    const restoreOffsetTop = mockTagRowIndexes({
      react: 0,
      typescript: 0,
      nextjs: 0,
      tailwind: 1,
      vitest: 1,
      playwright: 1,
      storybook: 2,
      nodejs: 2,
      zod: 2,
      zustand: 2,
    })

    render(
      <ExpandableTagFilterList
        basePath="/blog"
        tags={TAGS}
        counts={COUNTS}
        selectedTags={[]}
      />,
    )

    restoreOffsetTop()

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
    mockResponsiveEnvironment()
    const restoreOffsetTop = mockTagRowIndexes({
      react: 0,
      typescript: 0,
      nextjs: 0,
      tailwind: 1,
      vitest: 1,
      playwright: 1,
      storybook: 2,
      nodejs: 2,
      zod: 2,
      zustand: 2,
    })

    render(
      <ExpandableTagFilterList
        basePath="/blog"
        tags={TAGS}
        counts={COUNTS}
        selectedTags={['zustand']}
      />,
    )

    restoreOffsetTop()

    expect(
      screen.getByRole('link', { name: 'tag: zustand' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'tag: zod' })).not.toBeInTheDocument()
  })

  it('더보기 버튼을 누르면 모든 태그를 노출하고 접기 버튼으로 바뀐다', () => {
    mockResponsiveEnvironment()
    const restoreOffsetTop = mockTagRowIndexes({
      react: 0,
      typescript: 0,
      nextjs: 0,
      tailwind: 1,
      vitest: 1,
      playwright: 1,
      storybook: 2,
      nodejs: 2,
      zod: 2,
      zustand: 2,
    })

    render(
      <ExpandableTagFilterList
        basePath="/blog"
        tags={TAGS}
        counts={COUNTS}
        selectedTags={[]}
      />,
    )

    restoreOffsetTop()

    fireEvent.click(screen.getByRole('button', { name: 'tagFilter.showMore' }))

    expect(screen.getByRole('link', { name: 'tag: zod' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'tag: zustand' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'tagFilter.showLess' }),
    ).toBeInTheDocument()
  })

  it('데스크톱에서는 두 줄까지 노출하고 더 강한 gradient overlay로 하단 클릭을 막는다', () => {
    mockResponsiveEnvironment({ isDesktop: true })
    const restoreOffsetTop = mockTagRowIndexes({
      react: 0,
      typescript: 0,
      nextjs: 0,
      tailwind: 1,
      vitest: 1,
      playwright: 1,
      storybook: 2,
      nodejs: 2,
      zod: 2,
      zustand: 2,
    })

    render(
      <ExpandableTagFilterList
        basePath="/blog"
        tags={TAGS}
        counts={COUNTS}
        selectedTags={[]}
      />,
    )

    restoreOffsetTop()

    expect(screen.getByRole('link', { name: 'tag: react' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'tag: playwright' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'tag: storybook' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'tagFilter.showMore' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('collapsed-tag-filter-overlay')).toHaveClass('h-6')
    expect(screen.getByTestId('collapsed-tag-filter-overlay')).toHaveClass(
      'pointer-events-auto',
    )
  })
})
