import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    getDownloadEngagementEventName: () => ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
  }
})

describe('DownloadPdfButton', () => {
  let downloadedFileNames: string[]

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-30T15:00:00Z'))
    downloadedFileNames = []
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
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFileNames.push(this.download)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it.each([
    ['resume', 'ko', 'downloadResume', '이윤수_이력서_2610.pdf'],
    ['portfolio', 'ko', 'downloadPortfolio', '이윤수_포트폴리오_2610.pdf'],
    ['resume', 'en', 'downloadResume', 'leeyoonsu_resume_2610.pdf'],
    ['portfolio', 'en', 'downloadPortfolio', 'leeyoonsu_portfolio_2610.pdf'],
  ] as const)(
    '%s %s: 버튼에서 언어별 이름과 다운로드 연월을 사용한다',
    async (documentKind, locale, buttonLabel, expectedFileName) => {
      render(<DownloadPdfButton locale={locale} documentKind={documentKind} />)

      fireEvent.click(screen.getByRole('button', { name: buttonLabel }))

      await waitFor(() => {
        expect(downloadedFileNames).toEqual([expectedFileName])
      })
    },
  )

  it('PDF 응답을 받은 뒤 이력서 다운로드 이벤트를 기록한다', async () => {
    render(
      <DownloadPdfButton locale="ko" documentKind={PDF.DOCUMENT_KIND.RESUME} />,
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
