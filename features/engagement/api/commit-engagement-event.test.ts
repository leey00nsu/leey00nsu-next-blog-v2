import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  commitEngagementEvent,
  getDownloadEngagementEventName,
} from '@/features/engagement/api/commit-engagement-event'
import { ENGAGEMENT } from '@/features/engagement/config/constants'
import { PDF, ROUTES } from '@/shared/config/constants'

describe('commitEngagementEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('현재 경로와 UTM 값을 내부 이벤트 API에 전달한다', async () => {
    globalThis.history.pushState(
      {},
      '',
      '/ko/blog/why-use-react-query?utm_source=linkedin&utm_medium=social&utm_campaign=resume',
    )
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))

    await commitEngagementEvent({
      eventId: 'a451cda9-9304-41ef-a2f9-4d7d44f64a1b',
      eventName: ENGAGEMENT.EVENT_NAME.BLOG_POST_VIEW,
      locale: 'ko',
      contentSlug: 'why-use-react-query',
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, ROUTES.API.ENGAGEMENT_EVENTS, {
      method: 'HEAD',
      cache: 'no-store',
      credentials: 'same-origin',
      keepalive: true,
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      ROUTES.API.ENGAGEMENT_EVENTS,
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({
          eventId: 'a451cda9-9304-41ef-a2f9-4d7d44f64a1b',
          eventName: ENGAGEMENT.EVENT_NAME.BLOG_POST_VIEW,
          locale: 'ko',
          pagePath: '/ko/blog/why-use-react-query',
          contentSlug: 'why-use-react-query',
          documentKind: undefined,
          referrerHost: undefined,
          utmSource: 'linkedin',
          utmMedium: 'social',
          utmCampaign: 'resume',
        }),
      }),
    )
  })

  it('PDF 문서 종류를 다운로드 이벤트 이름으로 변환한다', () => {
    expect(getDownloadEngagementEventName(PDF.DOCUMENT_KIND.RESUME)).toBe(
      ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
    )
    expect(getDownloadEngagementEventName(PDF.DOCUMENT_KIND.PORTFOLIO)).toBe(
      ENGAGEMENT.EVENT_NAME.PORTFOLIO_DOWNLOAD,
    )
  })
})
