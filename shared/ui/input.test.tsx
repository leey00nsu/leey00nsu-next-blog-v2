import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './input'

describe('Input', () => {
    it('input 요소를 렌더링한다', () => {
        render(<Input data-testid="input" />)
        expect(screen.getByTestId('input')).toBeInTheDocument()
    })

    it('placeholder를 표시한다', () => {
        render(<Input placeholder="이메일을 입력하세요" />)
        expect(screen.getByPlaceholderText('이메일을 입력하세요')).toBeInTheDocument()
    })

    it('값을 입력할 수 있다', async () => {
        const user = userEvent.setup()
        render(<Input data-testid="input" />)

        const input = screen.getByTestId('input')
        await user.type(input, 'hello')

        expect(input).toHaveValue('hello')
    })

    it('onChange 이벤트를 처리한다', async () => {
        const handleChange = vi.fn()
        const user = userEvent.setup()

        render(<Input onChange={handleChange} data-testid="input" />)
        await user.type(screen.getByTestId('input'), 'a')

        expect(handleChange).toHaveBeenCalled()
    })

    it('disabled 상태에서는 입력이 불가능하다', () => {
        render(<Input disabled data-testid="input" />)
        expect(screen.getByTestId('input')).toBeDisabled()
    })

    it('type 속성을 전달한다', () => {
        render(<Input type="email" data-testid="input" />)
        expect(screen.getByTestId('input')).toHaveAttribute('type', 'email')
    })

    it('추가 className을 적용한다', () => {
        render(<Input className="custom-class" data-testid="input" />)
        expect(screen.getByTestId('input')).toHaveClass('custom-class')
    })

    it('ref를 전달한다', () => {
        const ref = vi.fn()
        render(<Input ref={ref} />)
        expect(ref).toHaveBeenCalled()
    })

    it('value와 onChange로 제어 컴포넌트로 사용할 수 있다', async () => {
        const handleChange = vi.fn()
        const user = userEvent.setup()

        render(
            <Input value="initial" onChange={handleChange} data-testid="input" />
        )

        const input = screen.getByTestId('input')
        expect(input).toHaveValue('initial')

        await user.type(input, 'x')
        expect(handleChange).toHaveBeenCalled()
    })
})
