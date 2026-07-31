import { describe, expect, it } from 'vitest'
import { ENGAGEMENT } from '@/features/engagement/config/constants'
import { engagementEventPayloadSchema } from '@/features/engagement/model/engagement-event-schema'
import { PDF } from '@/shared/config/constants'

const BASE_EVENT_PAYLOAD = {
  eventId: 'a451cda9-9304-41ef-a2f9-4d7d44f64a1b',
  locale: 'ko',
  pagePath: '/ko/about',
} as const

describe('engagementEventPayloadSchema', () => {
  it('이력서 다운로드 이벤트와 문서 종류의 조합을 검증한다', () => {
    const result = engagementEventPayloadSchema.safeParse({
      ...BASE_EVENT_PAYLOAD,
      eventName: ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
      documentKind: PDF.DOCUMENT_KIND.RESUME,
    })

    expect(result.success).toBe(true)
  })

  it('이벤트와 다른 PDF 문서 종류를 거부한다', () => {
    const result = engagementEventPayloadSchema.safeParse({
      ...BASE_EVENT_PAYLOAD,
      eventName: ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
      documentKind: PDF.DOCUMENT_KIND.PORTFOLIO,
    })

    expect(result.success).toBe(false)
  })

  it('이메일 대상이 지정된 연락 클릭 이벤트를 허용한다', () => {
    const result = engagementEventPayloadSchema.safeParse({
      ...BASE_EVENT_PAYLOAD,
      eventName: ENGAGEMENT.EVENT_NAME.CONTACT_CLICK,
      targetKind: ENGAGEMENT.TARGET_KIND.EMAIL,
    })

    expect(result.success).toBe(true)
  })

  it('글 슬러그가 지정된 블로그 글 조회 이벤트를 허용한다', () => {
    const result = engagementEventPayloadSchema.safeParse({
      ...BASE_EVENT_PAYLOAD,
      eventName: ENGAGEMENT.EVENT_NAME.BLOG_POST_VIEW,
      pagePath: '/ko/blog/why-use-react-query',
      contentSlug: 'why-use-react-query',
    })

    expect(result.success).toBe(true)
  })

  it('글 슬러그가 없는 블로그 글 조회 이벤트를 거부한다', () => {
    const result = engagementEventPayloadSchema.safeParse({
      ...BASE_EVENT_PAYLOAD,
      eventName: ENGAGEMENT.EVENT_NAME.BLOG_POST_VIEW,
      pagePath: '/ko/blog/why-use-react-query',
    })

    expect(result.success).toBe(false)
  })

  it('블로그 글 조회 외 이벤트에 지정된 글 슬러그를 거부한다', () => {
    const result = engagementEventPayloadSchema.safeParse({
      ...BASE_EVENT_PAYLOAD,
      eventName: ENGAGEMENT.EVENT_NAME.BLOG_LIST_VIEW,
      pagePath: '/ko/blog',
      contentSlug: 'why-use-react-query',
    })

    expect(result.success).toBe(false)
  })
})
