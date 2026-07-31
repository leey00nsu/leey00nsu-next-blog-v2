import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ENGAGEMENT } from '@/features/engagement/config/constants'
import { DownloadPdfButton } from '@/features/pdf/ui/download-pdf-button'
import { PDF } from '@/shared/config/constants'

const commitEngagementEventMock = vi.hoisted(() => vi.fn())

vi.mock('next-intl', () => {
  return {
    useTranslations: () => (translationKey: string) => translationKey,
  }
})

vi.mock('sonner', () => {
  return {
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

vi.mock('@/features/engagement/api/commit-engagement-event', () => {
  return {
    commitEngagementEvent: commitEngagementEventMock,
    getDownloadEngagementEventName: () =>
      ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
  }
})

describe('DownloadPdfButton', () => {
  beforeEach(() => {
    commitEngagementEventMock.mockReset()
    commitEngagementEventMock.mockResolvedValue(null)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['resume']), { status: 200 }),
    )
    Object.defineProperty(globalThis.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:resume'),
    })
    Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('PDF 응답을 받은 뒤 이력서 다운로드 이벤트를 기록한다', async () => {
    render(
      <DownloadPdfButton
        locale="ko"
        documentKind={PDF.DOCUMENT_KIND.RESUME}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'downloadResume',
      }),
    )

    await waitFor(() => {
      expect(commitEngagementEventMock).toHaveBeenCalledWith({
        eventName: ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
        locale: 'ko',
        documentKind: PDF.DOCUMENT_KIND.RESUME,
      })
    })
  })
})
