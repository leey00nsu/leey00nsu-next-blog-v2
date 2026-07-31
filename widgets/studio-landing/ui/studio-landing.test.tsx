import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StudioLanding } from '@/widgets/studio-landing/ui/studio-landing'

vi.mock('next-intl', () => {
  return {
    useTranslations: () => (translationKey: string) => translationKey,
  }
})

describe('StudioLanding', () => {
  it('에디터, 로그 관리, 이벤트 관리 카드를 제공한다', () => {
    render(<StudioLanding locale="ko" />)

    expect(
      screen.getByRole('link', { name: 'editor.action' }),
    ).toHaveAttribute('href', '/ko/studio/editor')
    expect(screen.getByRole('link', { name: 'logs.action' })).toHaveAttribute(
      'href',
      '/ko/studio/logs',
    )
    expect(screen.getByRole('link', { name: 'events.action' })).toHaveAttribute(
      'href',
      '/ko/studio/events',
    )
  })
})
