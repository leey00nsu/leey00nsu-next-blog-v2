import { NextRequest, NextResponse } from 'next/server'
import { getChatObservabilityLogPage } from '@/features/chat/model/chat-observability'
import { requireAuth } from '@/shared/lib/auth/require-auth'

const STUDIO_CHAT_LOGS_ROUTE = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_QUERY_KEY: 'page',
  PAGE_SIZE_QUERY_KEY: 'pageSize',
  SORT_DIRECTION_QUERY_KEY: 'sortDirection',
  UNEXPECTED_ERROR_MESSAGE: 'Failed to load chat logs.',
} as const

function parseIntegerSearchParameter(
  request: NextRequest,
  searchParameterKey: string,
  fallbackValue: number,
): number {
  const searchParameterValue =
    request.nextUrl.searchParams.get(searchParameterKey)

  if (!searchParameterValue) {
    return fallbackValue
  }

  const parsedValue = Number.parseInt(searchParameterValue, 10)

  return Number.isNaN(parsedValue) ? fallbackValue : parsedValue
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()

  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const page = parseIntegerSearchParameter(
      request,
      STUDIO_CHAT_LOGS_ROUTE.PAGE_QUERY_KEY,
      STUDIO_CHAT_LOGS_ROUTE.DEFAULT_PAGE,
    )
    const pageSize = parseIntegerSearchParameter(
      request,
      STUDIO_CHAT_LOGS_ROUTE.PAGE_SIZE_QUERY_KEY,
      STUDIO_CHAT_LOGS_ROUTE.DEFAULT_PAGE_SIZE,
    )
    const logPage = await getChatObservabilityLogPage({
      page,
      pageSize,
      sortDirection:
        request.nextUrl.searchParams.get(
          STUDIO_CHAT_LOGS_ROUTE.SORT_DIRECTION_QUERY_KEY,
        ) ?? undefined,
    })

    return NextResponse.json(logPage)
  } catch {
    return NextResponse.json(
      {
        error: STUDIO_CHAT_LOGS_ROUTE.UNEXPECTED_ERROR_MESSAGE,
      },
      { status: 500 },
    )
  }
}
