import type { Route } from 'next'
import {
  buildLocalizedRoutePath,
  type SupportedLocale,
} from '@/shared/config/constants'
import type { AnalyticsDateRange } from '@/shared/model/analytics'

interface BuildStudioListHrefParams {
  routePath: string
  locale: SupportedLocale
  page: number
  pageSize: number
  sortDirection: string
  dateRange: AnalyticsDateRange
  additionalSearchParameters?: Record<string, string | undefined>
}

export function buildStudioListHref(params: BuildStudioListHrefParams): Route {
  const searchParameters = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortDirection: params.sortDirection,
    startDate: params.dateRange.startDate,
    endDate: params.dateRange.endDate,
  })

  for (const [key, value] of Object.entries(
    params.additionalSearchParameters ?? {},
  )) {
    if (value) {
      searchParameters.set(key, value)
    }
  }

  return `${buildLocalizedRoutePath(params.routePath, params.locale)}?${searchParameters.toString()}` as Route
}
