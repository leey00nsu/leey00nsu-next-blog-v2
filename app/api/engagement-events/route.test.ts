import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ENGAGEMENT } from '@/features/engagement/config/constants'
import { PDF } from '@/shared/config/constants'

const recordEngagementEventMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/engagement/model/engagement-events', () => {
  return {
    recordEngagementEvent: recordEngagementEventMock,
  }
})

import { HEAD, POST } from '@/app/api/engagement-events/route'

const VALID_PAYLOAD = {
  eventId: 'a451cda9-9304-41ef-a2f9-4d7d44f64a1b',
  eventName: ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
  locale: 'ko',
  pagePath: '/ko/about',
  documentKind: PDF.DOCUMENT_KIND.RESUME,
} as const

function buildRequest(params?: {
  origin?: string
  body?: Record<string, unknown>
  clientAddress?: string
  forwardedProtocol?: string
  forwardedHost?: string
}) {
  return new NextRequest('http://localhost/api/engagement-events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: params?.origin ?? 'http://localhost',
      cookie:
        'engagement_visitor=1b554880-5ac5-4fe6-b5ba-635c2c90fbdb; engagement_session=7866fed2-d329-47e0-b608-2f6c49acfdd8',
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile',
      'x-forwarded-for': params?.clientAddress ?? '203.0.113.10',
      ...(params?.forwardedProtocol
        ? { 'x-forwarded-proto': params.forwardedProtocol }
        : {}),
      ...(params?.forwardedHost
        ? { 'x-forwarded-host': params.forwardedHost }
        : {}),
    },
    body: JSON.stringify(params?.body ?? VALID_PAYLOAD),
  })
}

describe('POST /api/engagement-events', () => {
  beforeEach(() => {
    recordEngagementEventMock.mockReset()
    recordEngagementEventMock.mockResolvedValue(null)
  })

  it('원본 식별자 대신 해시와 기기 분류를 저장한다', async () => {
    const response = await POST(buildRequest())

    expect(response.status).toBe(204)
    expect(recordEngagementEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ...VALID_PAYLOAD,
        anonymousVisitorIdHash: expect.stringMatching(/^[\da-f]{64}$/u),
        sessionIdHash: expect.stringMatching(/^[\da-f]{64}$/u),
        deviceCategory: 'mobile',
      }),
    )
    expect(response.headers.get('set-cookie')).toContain('engagement_visitor=')
  })

  it('이벤트 기록 전에 사용할 방문자와 세션 쿠키를 초기화한다', () => {
    const request = new NextRequest('http://localhost/api/engagement-events', {
      method: 'HEAD',
    })

    const response = HEAD(request)

    expect(response.status).toBe(204)
    expect(response.headers.get('set-cookie')).toContain('engagement_visitor=')
    expect(response.headers.get('set-cookie')).toContain('engagement_session=')
    expect(recordEngagementEventMock).not.toHaveBeenCalled()
  })

  it('다른 출처에서 전송한 요청을 거부한다', async () => {
    const response = await POST(
      buildRequest({ origin: 'https://untrusted.example' }),
    )

    expect(response.status).toBe(403)
    expect(recordEngagementEventMock).not.toHaveBeenCalled()
  })

  it('리버스 프록시가 전달한 공개 출처의 요청을 허용한다', async () => {
    const response = await POST(
      buildRequest({
        origin: 'https://blog2.leey00nsu.com',
        forwardedProtocol: 'https',
        forwardedHost: 'blog2.leey00nsu.com',
      }),
    )

    expect(response.status).toBe(204)
    expect(recordEngagementEventMock).toHaveBeenCalledOnce()
  })

  it('리버스 프록시 환경에서도 다른 출처의 요청을 거부한다', async () => {
    const response = await POST(
      buildRequest({
        origin: 'https://untrusted.example',
        forwardedProtocol: 'https',
        forwardedHost: 'blog2.leey00nsu.com',
      }),
    )

    expect(response.status).toBe(403)
    expect(recordEngagementEventMock).not.toHaveBeenCalled()
  })

  it('허용되지 않은 이벤트 payload를 거부한다', async () => {
    const response = await POST(
      buildRequest({
        body: {
          ...VALID_PAYLOAD,
          eventName: 'unknown_event',
        },
      }),
    )

    expect(response.status).toBe(400)
    expect(recordEngagementEventMock).not.toHaveBeenCalled()
  })

  it('최대 크기를 초과한 요청 본문을 DB 기록 전에 거부한다', async () => {
    const response = await POST(
      buildRequest({
        body: {
          ...VALID_PAYLOAD,
          pagePath: `/${'a'.repeat(5000)}`,
        },
      }),
    )

    expect(response.status).toBe(413)
    expect(recordEngagementEventMock).not.toHaveBeenCalled()
  })

  it('같은 클라이언트의 과도한 이벤트 요청을 제한한다', async () => {
    const maximumRequestsPerWindow = 30
    const clientAddress = '198.51.100.25'
    const allowedResponses = await Promise.all(
      Array.from({ length: maximumRequestsPerWindow }, () =>
        POST(buildRequest({ clientAddress })),
      ),
    )
    const rejectedResponse = await POST(buildRequest({ clientAddress }))

    expect(allowedResponses.every((response) => response.status === 204)).toBe(
      true,
    )
    expect(rejectedResponse.status).toBe(429)
    expect(rejectedResponse.headers.get('Retry-After')).not.toBeNull()
  })
})
