import { fireEvent, render, screen } from '@testing-library/react'
import { ko } from 'date-fns/locale'
import { describe, expect, it } from 'vitest'
import { Calendar } from '@/shared/ui/calendar'

describe('Calendar', () => {
  it('좌우 탐색 버튼으로 표시 월을 변경한다', () => {
    render(
      <Calendar
        mode="single"
        locale={ko}
        defaultMonth={new Date(2026, 6, 1)}
      />,
    )

    expect(screen.getByText('2026년 7월')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Go to the Next Month' }),
    )
    expect(screen.getByText('2026년 8월')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Go to the Previous Month' }),
    )
    expect(screen.getByText('2026년 7월')).toBeInTheDocument()
  })
})
