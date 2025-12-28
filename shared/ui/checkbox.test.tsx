import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './checkbox'

describe('Checkbox', () => {
    it('체크박스를 렌더링한다', () => {
        render(<Checkbox aria-label="동의" />)
        expect(screen.getByRole('checkbox', { name: '동의' })).toBeInTheDocument()
    })

    it('클릭하면 체크 상태가 변경된다', async () => {
        const user = userEvent.setup()
        render(<Checkbox aria-label="동의" />)

        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).not.toBeChecked()

        await user.click(checkbox)
        expect(checkbox).toBeChecked()

        await user.click(checkbox)
        expect(checkbox).not.toBeChecked()
    })

    it('defaultChecked로 초기 체크 상태를 설정한다', () => {
        render(<Checkbox defaultChecked aria-label="동의" />)
        expect(screen.getByRole('checkbox')).toBeChecked()
    })

    it('disabled 상태에서는 클릭이 동작하지 않는다', async () => {
        const handleChange = vi.fn()
        const user = userEvent.setup()

        render(
            <Checkbox disabled onCheckedChange={handleChange} aria-label="동의" />
        )

        await user.click(screen.getByRole('checkbox'))
        expect(handleChange).not.toHaveBeenCalled()
    })

    it('onCheckedChange 콜백을 호출한다', async () => {
        const handleChange = vi.fn()
        const user = userEvent.setup()

        render(<Checkbox onCheckedChange={handleChange} aria-label="동의" />)
        await user.click(screen.getByRole('checkbox'))

        expect(handleChange).toHaveBeenCalledWith(true)
    })

    it('추가 className을 적용한다', () => {
        render(<Checkbox className="custom-class" aria-label="동의" />)
        expect(screen.getByRole('checkbox')).toHaveClass('custom-class')
    })

    it('checked prop으로 제어 컴포넌트로 사용할 수 있다', () => {
        const { rerender } = render(<Checkbox checked={false} aria-label="동의" />)
        expect(screen.getByRole('checkbox')).not.toBeChecked()

        rerender(<Checkbox checked={true} aria-label="동의" />)
        expect(screen.getByRole('checkbox')).toBeChecked()
    })
})
