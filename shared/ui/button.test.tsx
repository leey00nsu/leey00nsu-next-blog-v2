import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

describe('Button', () => {
    it('버튼을 렌더링한다', () => {
        render(<Button>클릭</Button>)
        expect(screen.getByRole('button', { name: '클릭' })).toBeInTheDocument()
    })

    it('클릭 이벤트를 처리한다', async () => {
        const handleClick = vi.fn()
        const user = userEvent.setup()

        render(<Button onClick={handleClick}>클릭</Button>)
        await user.click(screen.getByRole('button'))

        expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('disabled 상태에서는 클릭이 동작하지 않는다', async () => {
        const handleClick = vi.fn()
        const user = userEvent.setup()

        render(
            <Button onClick={handleClick} disabled>
                클릭
            </Button>
        )
        await user.click(screen.getByRole('button'))

        expect(handleClick).not.toHaveBeenCalled()
    })

    it('disabled 상태일 때 버튼이 비활성화된다', () => {
        render(<Button disabled>클릭</Button>)
        expect(screen.getByRole('button')).toBeDisabled()
    })

    it('variant prop을 적용한다', () => {
        render(<Button variant="destructive">삭제</Button>)
        const button = screen.getByRole('button')
        expect(button).toHaveClass('bg-destructive')
    })

    it('size prop을 적용한다', () => {
        render(<Button size="sm">작은 버튼</Button>)
        const button = screen.getByRole('button')
        expect(button).toHaveClass('h-8')
    })

    it('추가 className을 적용한다', () => {
        render(<Button className="custom-class">버튼</Button>)
        const button = screen.getByRole('button')
        expect(button).toHaveClass('custom-class')
    })

    it('children을 렌더링한다', () => {
        render(
            <Button>
                <span>아이콘</span>
                텍스트
            </Button>
        )
        expect(screen.getByText('아이콘')).toBeInTheDocument()
        expect(screen.getByText('텍스트')).toBeInTheDocument()
    })

    it('type 속성을 전달한다', () => {
        render(<Button type="submit">제출</Button>)
        expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
    })
})
