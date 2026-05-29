import { StudioChatLogs } from '@/widgets/studio-logs/ui/studio-chat-logs'
import { SupportedLocale } from '@/shared/config/constants'

interface StudioLogsPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    page?: string
    pageSize?: string
    sortDirection?: string
  }>
}

const STUDIO_LOGS_PAGE = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
} as const

function parseIntegerSearchParameter(
  value: string | undefined,
  fallbackValue: number,
): number {
  if (!value) {
    return fallbackValue
  }

  const parsedValue = Number.parseInt(value, 10)

  return Number.isNaN(parsedValue) ? fallbackValue : parsedValue
}

export const dynamic = 'force-dynamic'

export default async function StudioLogsPage({
  params,
  searchParams,
}: StudioLogsPageProps) {
  const { locale: localeParam } = await params
  const { page, pageSize, sortDirection } = await searchParams
  const locale = localeParam as SupportedLocale

  return (
    <StudioChatLogs
      locale={locale}
      page={parseIntegerSearchParameter(page, STUDIO_LOGS_PAGE.DEFAULT_PAGE)}
      pageSize={parseIntegerSearchParameter(
        pageSize,
        STUDIO_LOGS_PAGE.DEFAULT_PAGE_SIZE,
      )}
      sortDirection={sortDirection}
    />
  )
}
