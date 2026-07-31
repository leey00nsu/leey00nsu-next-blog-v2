import { createHmac, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { engagementEventPayloadSchema } from '@/features/engagement/model/engagement-event-schema'
import {
  consumeEngagementEventRateLimit,
  resolveEngagementEventClientAddress,
} from '@/features/engagement/model/engagement-event-rate-limit'
import {
  recordEngagementEvent,
  type EngagementDeviceCategory,
} from '@/features/engagement/model/engagement-events'

export const runtime = 'nodejs'

const ENGAGEMENT_EVENT_ROUTE = {
  COOKIE: {
    VISITOR_NAME: 'engagement_visitor',
    SESSION_NAME: 'engagement_session',
    VISITOR_MAXIMUM_AGE_SECONDS: 60 * 60 * 24 * 365,
    SESSION_MAXIMUM_AGE_SECONDS: 60 * 30,
    PATH: '/',
  },
  HEADER: {
    FORWARDED_PROTOCOL: 'x-forwarded-proto',
    CLIENT_HINT_MOBILE: 'sec-ch-ua-mobile',
    CONTENT_LENGTH: 'content-length',
    RETRY_AFTER: 'Retry-After',
    USER_AGENT: 'user-agent',
  },
  RATE_LIMIT: {
    WINDOW_MILLISECONDS: 60_000,
    MAXIMUM_REQUESTS_PER_WINDOW: 30,
    MAXIMUM_TRACKED_CLIENT_COUNT: 10_000,
  },
  MAXIMUM_REQUEST_BODY_BYTES: 4096,
  MILLISECONDS_PER_SECOND: 1000,
  CLIENT_HINT_MOBILE_VALUE: '?1',
  DEVICE_PATTERN: {
    TABLET: /ipad|tablet|android(?!.*mobile)/iu,
    MOBILE: /mobile|iphone|ipod|android/iu,
  },
  DEVELOPMENT_HASH_SECRET: 'development-only-engagement-hash-secret',
  ERROR_MESSAGE: {
    INVALID_ORIGIN: 'Cross-origin event logging is not allowed.',
    INVALID_PAYLOAD: 'Invalid engagement event payload.',
    PAYLOAD_TOO_LARGE: 'Engagement event payload is too large.',
    RATE_LIMIT_EXCEEDED: 'Too many engagement event requests.',
    DATABASE_UNAVAILABLE: 'Unable to store the engagement event.',
  },
} as const

const engagementEventRateLimitUsageMap = new Map<string, number[]>()

interface EngagementIdentity {
  visitorIdentifier: string
  sessionIdentifier: string
}

type LimitedRequestBodyResult =
  | { isTooLarge: true }
  | { isTooLarge: false; bodyText: string }

function getCookieIdentifier(request: NextRequest, cookieName: string): string {
  const cookieValue = request.cookies.get(cookieName)?.value

  return cookieValue && /^[\da-f-]{36}$/iu.test(cookieValue)
    ? cookieValue
    : randomUUID()
}

function hashIdentifier(identifier: string): string {
  const hashSecret =
    process.env.ENGAGEMENT_HASH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    ENGAGEMENT_EVENT_ROUTE.DEVELOPMENT_HASH_SECRET

  return createHmac('sha256', hashSecret).update(identifier).digest('hex')
}

function getEngagementIdentity(request: NextRequest): EngagementIdentity {
  return {
    visitorIdentifier: getCookieIdentifier(
      request,
      ENGAGEMENT_EVENT_ROUTE.COOKIE.VISITOR_NAME,
    ),
    sessionIdentifier: getCookieIdentifier(
      request,
      ENGAGEMENT_EVENT_ROUTE.COOKIE.SESSION_NAME,
    ),
  }
}

function determineDeviceCategory(
  request: NextRequest,
): EngagementDeviceCategory {
  if (
    request.headers.get(ENGAGEMENT_EVENT_ROUTE.HEADER.CLIENT_HINT_MOBILE) ===
    ENGAGEMENT_EVENT_ROUTE.CLIENT_HINT_MOBILE_VALUE
  ) {
    return 'mobile'
  }

  const userAgent =
    request.headers.get(ENGAGEMENT_EVENT_ROUTE.HEADER.USER_AGENT) ?? ''

  if (ENGAGEMENT_EVENT_ROUTE.DEVICE_PATTERN.TABLET.test(userAgent)) {
    return 'tablet'
  }

  if (ENGAGEMENT_EVENT_ROUTE.DEVICE_PATTERN.MOBILE.test(userAgent)) {
    return 'mobile'
  }

  return userAgent ? 'desktop' : 'unknown'
}

function isSecureRequest(request: NextRequest): boolean {
  const forwardedProtocol = request.headers.get(
    ENGAGEMENT_EVENT_ROUTE.HEADER.FORWARDED_PROTOCOL,
  )

  return forwardedProtocol
    ? forwardedProtocol === 'https'
    : request.nextUrl.protocol === 'https:'
}

function isAllowedOrigin(request: NextRequest): boolean {
  const requestOrigin = request.headers.get('origin')

  return requestOrigin === request.nextUrl.origin
}

function setEngagementIdentityCookies(params: {
  request: NextRequest
  response: NextResponse
  identity: EngagementIdentity
}): NextResponse {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecureRequest(params.request),
    path: ENGAGEMENT_EVENT_ROUTE.COOKIE.PATH,
  }

  params.response.cookies.set(
    ENGAGEMENT_EVENT_ROUTE.COOKIE.VISITOR_NAME,
    params.identity.visitorIdentifier,
    {
      ...cookieOptions,
      maxAge: ENGAGEMENT_EVENT_ROUTE.COOKIE.VISITOR_MAXIMUM_AGE_SECONDS,
    },
  )
  params.response.cookies.set(
    ENGAGEMENT_EVENT_ROUTE.COOKIE.SESSION_NAME,
    params.identity.sessionIdentifier,
    {
      ...cookieOptions,
      maxAge: ENGAGEMENT_EVENT_ROUTE.COOKIE.SESSION_MAXIMUM_AGE_SECONDS,
    },
  )

  return params.response
}

async function readLimitedRequestBody(
  request: NextRequest,
): Promise<LimitedRequestBodyResult> {
  const contentLength = Number(
    request.headers.get(ENGAGEMENT_EVENT_ROUTE.HEADER.CONTENT_LENGTH),
  )

  if (
    Number.isFinite(contentLength) &&
    contentLength > ENGAGEMENT_EVENT_ROUTE.MAXIMUM_REQUEST_BODY_BYTES
  ) {
    return { isTooLarge: true }
  }

  if (!request.body) {
    return { isTooLarge: false, bodyText: '' }
  }

  const bodyReader = request.body.getReader()
  const bodyChunks: Uint8Array[] = []
  let receivedBodyByteCount = 0

  while (true) {
    const bodyChunk = await bodyReader.read()

    if (bodyChunk.done) {
      break
    }

    receivedBodyByteCount += bodyChunk.value.byteLength

    if (
      receivedBodyByteCount > ENGAGEMENT_EVENT_ROUTE.MAXIMUM_REQUEST_BODY_BYTES
    ) {
      await bodyReader.cancel().catch(() => null)
      return { isTooLarge: true }
    }

    bodyChunks.push(bodyChunk.value)
  }

  const combinedBody = new Uint8Array(receivedBodyByteCount)
  let bodyChunkOffset = 0

  for (const bodyChunk of bodyChunks) {
    combinedBody.set(bodyChunk, bodyChunkOffset)
    bodyChunkOffset += bodyChunk.byteLength
  }

  return {
    isTooLarge: false,
    bodyText: new TextDecoder().decode(combinedBody),
  }
}

function consumeRequestRateLimit(request: NextRequest) {
  const clientAddress = resolveEngagementEventClientAddress(request.headers)

  return consumeEngagementEventRateLimit({
    usageMap: engagementEventRateLimitUsageMap,
    clientKey: hashIdentifier(`rate-limit:${clientAddress}`),
    windowMilliseconds: ENGAGEMENT_EVENT_ROUTE.RATE_LIMIT.WINDOW_MILLISECONDS,
    maximumRequestsPerWindow:
      ENGAGEMENT_EVENT_ROUTE.RATE_LIMIT.MAXIMUM_REQUESTS_PER_WINDOW,
    maximumTrackedClientCount:
      ENGAGEMENT_EVENT_ROUTE.RATE_LIMIT.MAXIMUM_TRACKED_CLIENT_COUNT,
  })
}

export function HEAD(request: NextRequest) {
  return setEngagementIdentityCookies({
    request,
    response: new NextResponse(null, { status: 204 }),
    identity: getEngagementIdentity(request),
  })
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: ENGAGEMENT_EVENT_ROUTE.ERROR_MESSAGE.INVALID_ORIGIN },
      { status: 403 },
    )
  }

  const rateLimitResult = consumeRequestRateLimit(request)

  if (!rateLimitResult.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (rateLimitResult.resetAt - Date.now()) /
          ENGAGEMENT_EVENT_ROUTE.MILLISECONDS_PER_SECOND,
      ),
    )

    return NextResponse.json(
      { error: ENGAGEMENT_EVENT_ROUTE.ERROR_MESSAGE.RATE_LIMIT_EXCEEDED },
      {
        status: 429,
        headers: {
          [ENGAGEMENT_EVENT_ROUTE.HEADER.RETRY_AFTER]:
            String(retryAfterSeconds),
        },
      },
    )
  }

  const requestBodyResult = await readLimitedRequestBody(request)

  if (requestBodyResult.isTooLarge) {
    return NextResponse.json(
      { error: ENGAGEMENT_EVENT_ROUTE.ERROR_MESSAGE.PAYLOAD_TOO_LARGE },
      { status: 413 },
    )
  }

  let requestBody: unknown

  try {
    requestBody = JSON.parse(requestBodyResult.bodyText || 'null')
  } catch {
    requestBody = null
  }

  const parsedPayload = engagementEventPayloadSchema.safeParse(requestBody)

  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: ENGAGEMENT_EVENT_ROUTE.ERROR_MESSAGE.INVALID_PAYLOAD },
      { status: 400 },
    )
  }

  const identity = getEngagementIdentity(request)

  try {
    await recordEngagementEvent({
      ...parsedPayload.data,
      anonymousVisitorIdHash: hashIdentifier(identity.visitorIdentifier),
      sessionIdHash: hashIdentifier(identity.sessionIdentifier),
      deviceCategory: determineDeviceCategory(request),
    })
  } catch {
    return setEngagementIdentityCookies({
      request,
      response: NextResponse.json(
        { error: ENGAGEMENT_EVENT_ROUTE.ERROR_MESSAGE.DATABASE_UNAVAILABLE },
        { status: 503 },
      ),
      identity,
    })
  }

  return setEngagementIdentityCookies({
    request,
    response: new NextResponse(null, { status: 204 }),
    identity,
  })
}
