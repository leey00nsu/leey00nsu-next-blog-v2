import { render, screen } from '@testing-library/react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EntranceMotionBlock } from '@/shared/ui/entrance-motion-block'

interface MotionDivMockProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  children?: ReactNode
  animate?: unknown
  initial?: unknown
  transition?: unknown
  variants?: unknown
}

vi.mock('motion/react', () => {
  return {
    motion: {
      div: ({
        children,
        initial,
        animate,
        variants,
        transition,
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

describe('EntranceMotionBlock', () => {
  it('애니메이션이 활성화되면 motion div로 내용을 감싼다', () => {
    render(<EntranceMotionBlock>content</EntranceMotionBlock>)

    expect(screen.getByTestId('motion-div')).toHaveTextContent('content')
  })

  it('애니메이션을 비활성화하면 일반 div로 렌더링한다', () => {
    render(<EntranceMotionBlock disabled>content</EntranceMotionBlock>)

    expect(screen.queryByTestId('motion-div')).not.toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
