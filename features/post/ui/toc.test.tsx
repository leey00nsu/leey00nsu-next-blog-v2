import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TocHeading } from '@/shared/lib/toc'
import { Toc } from './toc'

interface MotionNavMockProps
  extends Omit<ComponentPropsWithoutRef<'nav'>, 'children'> {
  children?: ReactNode
  animate?: unknown
  initial?: unknown
  variants?: unknown
}

interface MotionSpanMockProps
  extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  children?: ReactNode
  layoutId?: string
}

const WINDOW_SCROLL_TO_MOCK = vi.fn()

const HEADINGS: TocHeading[] = [
  { depth: 2, text: 'Introduction', slug: 'introduction' },
  { depth: 3, text: 'Getting Started', slug: 'getting-started' },
]

vi.mock('next-intl', () => {
  return {
    useTranslations: () => {
      return (translationKey: string) =>
        translationKey === 'title' ? '목차' : translationKey
    },
  }
})

vi.mock('motion/react', () => {
  return {
    motion: {
      nav: ({
        children,
        initial,
        animate,
        variants,
        ...properties
      }: MotionNavMockProps) => (
        <nav data-testid="motion-nav" {...properties}>
          {children}
        </nav>
      ),
      span: ({ children, layoutId, ...properties }: MotionSpanMockProps) => (
        <span data-testid="motion-span" data-layout-id={layoutId} {...properties}>
          {children}
        </span>
      ),
    },
    useReducedMotion: () => false,
  }
})

describe('Toc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    Object.defineProperty(globalThis, 'scrollTo', {
      configurable: true,
      value: WINDOW_SCROLL_TO_MOCK,
      writable: true,
    })
    Object.defineProperty(globalThis, 'scrollY', {
      configurable: true,
      value: 100,
      writable: true,
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('목차 컨테이너를 motion nav로 렌더링한다', () => {
    render(<Toc headings={HEADINGS} />)

    expect(screen.getByTestId('motion-nav')).toBeInTheDocument()
    expect(screen.getByText('목차')).toBeInTheDocument()
  })

  it('목차 항목을 클릭하면 활성 인디케이터를 표시하고 부드럽게 스크롤한다', () => {
    const targetHeadingElement = document.createElement('section')
    targetHeadingElement.id = 'getting-started'
    targetHeadingElement.getBoundingClientRect = () =>
      ({
        top: 320,
      }) as DOMRect
    document.body.append(targetHeadingElement)

    render(<Toc headings={HEADINGS} />)

    fireEvent.click(screen.getByRole('link', { name: 'Getting Started' }))

    expect(WINDOW_SCROLL_TO_MOCK).toHaveBeenCalledWith({
      top: 356,
      behavior: 'smooth',
    })
    expect(screen.getByRole('link', { name: 'Getting Started' })).toHaveClass(
      'font-semibold',
    )
    expect(screen.getByTestId('motion-span')).toBeInTheDocument()
  })
})
