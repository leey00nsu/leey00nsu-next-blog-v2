import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calcTocActiveBoundaryRootMargin } from '@/features/post/lib/toc-motion'
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

interface MockIntersectionObserverInstance {
  callback: IntersectionObserverCallback
  elements: Set<Element>
  rootMargin?: string
}

const WINDOW_SCROLL_TO_MOCK = vi.fn()
const intersectionObserverInstances: MockIntersectionObserverInstance[] = []

const HEADINGS: TocHeading[] = [
  { depth: 2, text: 'Introduction', slug: 'introduction' },
  { depth: 3, text: 'Getting Started', slug: 'getting-started' },
]
const FOUR_STEP_HEADINGS: TocHeading[] = [
  { depth: 2, text: 'First', slug: 'first' },
  { depth: 2, text: 'Second', slug: 'second' },
  { depth: 2, text: 'Third', slug: 'third' },
  { depth: 2, text: 'Fourth', slug: 'fourth' },
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

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly scrollMargin = ''
  readonly thresholds = [0]
  disconnect = vi.fn(() => {
    this.elements.clear()
  })
  observe = vi.fn((element: Element) => {
    this.elements.add(element)
  })
  takeRecords = vi.fn(() => [])
  unobserve = vi.fn((element: Element) => {
    this.elements.delete(element)
  })

  private readonly callback: IntersectionObserverCallback
  private readonly elements = new Set<Element>()
  readonly rootMargin: string

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback
    this.rootMargin = options?.rootMargin ?? ''
    intersectionObserverInstances.push({
      callback,
      elements: this.elements,
      rootMargin: this.rootMargin,
    })
  }
}

function buildIntersectionObserverEntry(
  target: Element,
  isIntersecting: boolean,
): IntersectionObserverEntry {
  return {
    boundingClientRect: target.getBoundingClientRect(),
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: target.getBoundingClientRect(),
    isIntersecting,
    rootBounds: null,
    target,
    time: Date.now(),
  }
}

function emitIntersectionEntriesByRootMargin(params: {
  rootMargin: string
  entries: Array<{ target: Element; isIntersecting: boolean }>
}) {
  const { rootMargin, entries } = params

  for (const instance of intersectionObserverInstances.filter((observer) => {
    return observer.rootMargin === rootMargin
  })) {
    instance.callback(
      entries.map((entry) =>
        buildIntersectionObserverEntry(entry.target, entry.isIntersecting),
      ),
      {} as IntersectionObserver,
    )
  }
}

function emitVisibleEntries(
  entries: Array<{ target: Element; isIntersecting: boolean }>,
) {
  emitIntersectionEntriesByRootMargin({
    rootMargin: '',
    entries,
  })
}

function emitActiveBoundaryEntries(
  entries: Array<{ target: Element; isIntersecting: boolean }>,
) {
  emitIntersectionEntriesByRootMargin({
    rootMargin: calcTocActiveBoundaryRootMargin(globalThis.innerHeight),
    entries,
  })
}

describe('Toc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    intersectionObserverInstances.length = 0
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
    Object.defineProperty(globalThis, 'innerHeight', {
      configurable: true,
      value: 800,
      writable: true,
    })
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      value: MockIntersectionObserver,
      writable: true,
    })
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2000,
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it('첫 heading 전 위치에서도 첫 목차를 활성 상태로 유지한다', () => {
    const firstHeadingElement = document.createElement('section')
    firstHeadingElement.id = 'introduction'
    firstHeadingElement.getBoundingClientRect = () =>
      ({
        top: 200,
      }) as DOMRect

    const secondHeadingElement = document.createElement('section')
    secondHeadingElement.id = 'getting-started'
    secondHeadingElement.getBoundingClientRect = () =>
      ({
        top: 420,
      }) as DOMRect

    document.body.append(firstHeadingElement, secondHeadingElement)

    render(<Toc headings={HEADINGS} />)

    act(() => {
      emitVisibleEntries([
        { target: firstHeadingElement, isIntersecting: false },
        { target: secondHeadingElement, isIntersecting: false },
      ])
    })

    expect(screen.getByRole('link', { name: 'Introduction' })).toHaveClass(
      'font-semibold',
    )
    expect(screen.getByTestId('motion-span')).toBeInTheDocument()
  })

  it('직접 스크롤로 heading이 active region에 들어오면 해당 목차를 활성 상태로 바꾼다', () => {
    const firstHeadingElement = document.createElement('section')
    firstHeadingElement.id = 'introduction'
    firstHeadingElement.getBoundingClientRect = () =>
      ({
        top: 20,
      }) as DOMRect

    const secondHeadingElement = document.createElement('section')
    secondHeadingElement.id = 'getting-started'
    secondHeadingElement.getBoundingClientRect = () =>
      ({
        top: 180,
      }) as DOMRect

    document.body.append(firstHeadingElement, secondHeadingElement)

    render(<Toc headings={HEADINGS} />)

    act(() => {
      emitActiveBoundaryEntries([
        { target: firstHeadingElement, isIntersecting: false },
        { target: secondHeadingElement, isIntersecting: true },
      ])
    })

    expect(screen.getByRole('link', { name: 'Getting Started' })).toHaveClass(
      'font-semibold',
    )
  })

  it('목차 클릭 후 부드러운 스크롤 중에는 이전 heading으로 하이라이트가 되돌아가지 않는다', () => {
    const firstHeadingElement = document.createElement('section')
    firstHeadingElement.id = 'introduction'
    firstHeadingElement.getBoundingClientRect = () =>
      ({
        top: 20,
      }) as DOMRect

    const secondHeadingElement = document.createElement('section')
    secondHeadingElement.id = 'getting-started'
    secondHeadingElement.getBoundingClientRect = () =>
      ({
        top: 180,
      }) as DOMRect

    document.body.append(firstHeadingElement, secondHeadingElement)
    Object.defineProperty(globalThis, 'scrollY', {
      configurable: true,
      value: 1200,
      writable: true,
    })
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2000,
      writable: true,
    })

    render(<Toc headings={HEADINGS} />)

    fireEvent.click(screen.getByRole('link', { name: 'Getting Started' }))
    act(() => {
      emitVisibleEntries([
        { target: firstHeadingElement, isIntersecting: false },
        { target: secondHeadingElement, isIntersecting: true },
      ])
    })

    expect(screen.getByRole('link', { name: 'Getting Started' })).toHaveClass(
      'font-semibold',
    )
  })

  it('같은 페이지에 TOC가 두 개 있어도 활성 인디케이터 layout id가 충돌하지 않는다', () => {
    const targetHeadingElement = document.createElement('section')
    targetHeadingElement.id = 'getting-started'
    targetHeadingElement.getBoundingClientRect = () =>
      ({
        top: 320,
      }) as DOMRect
    document.body.append(targetHeadingElement)

    render(
      <>
        <Toc headings={HEADINGS} />
        <Toc headings={HEADINGS} />
      </>,
    )

    const gettingStartedLinks = screen.getAllByRole('link', {
      name: 'Getting Started',
    })

    fireEvent.click(gettingStartedLinks[0])
    fireEvent.click(gettingStartedLinks[1])

    const layoutIds = screen
      .getAllByTestId('motion-span')
      .map((element) => element.dataset.layoutId)

    expect(new Set(layoutIds).size).toBe(2)
  })

  it('세 번째 목차를 클릭했을 때 네 번째 heading이 active region에 들어와도 세 번째를 유지한다', () => {
    const thirdHeadingElement = document.createElement('section')
    thirdHeadingElement.id = 'third'
    thirdHeadingElement.getBoundingClientRect = () =>
      ({
        top: 80,
      }) as DOMRect

    const fourthHeadingElement = document.createElement('section')
    fourthHeadingElement.id = 'fourth'
    fourthHeadingElement.getBoundingClientRect = () =>
      ({
        top: 120,
      }) as DOMRect

    document.body.append(thirdHeadingElement, fourthHeadingElement)

    render(<Toc headings={FOUR_STEP_HEADINGS} />)

    fireEvent.click(screen.getByRole('link', { name: 'Third' }))

    act(() => {
      emitVisibleEntries([
        { target: thirdHeadingElement, isIntersecting: true },
        { target: fourthHeadingElement, isIntersecting: true },
      ])
      emitActiveBoundaryEntries([
        { target: thirdHeadingElement, isIntersecting: true },
        { target: fourthHeadingElement, isIntersecting: true },
      ])
    })

    expect(screen.getByRole('link', { name: 'Third' })).toHaveClass(
      'font-semibold',
    )
    expect(screen.getByRole('link', { name: 'Fourth' })).not.toHaveClass(
      'font-semibold',
    )
  })
})
