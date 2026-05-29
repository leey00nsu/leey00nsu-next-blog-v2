import { getTranslations } from 'next-intl/server'
import { getChatObservabilityLogPage } from '@/features/chat/model/chat-observability'
import { StudioChatLogTable } from '@/widgets/studio-logs/ui/studio-chat-log-table'
import { SupportedLocale } from '@/shared/config/constants'

const STUDIO_CHAT_LOGS = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  EMPTY_TOTAL_COUNT: 0,
} as const

interface StudioChatLogsProps {
  locale: SupportedLocale
  page?: number
  pageSize?: number
  sortDirection?: string
}

async function getStudioChatLogPageState(params: {
  page: number
  pageSize: number
  sortDirection?: string
}) {
  try {
    return {
      logPage: await getChatObservabilityLogPage(params),
      isDatabaseUnavailable: false,
    }
  } catch {
    return {
      logPage: {
        records: [],
        totalCount: STUDIO_CHAT_LOGS.EMPTY_TOTAL_COUNT,
        page: params.page,
        pageSize: params.pageSize,
        sortDirection: 'created_at_desc' as const,
      },
      isDatabaseUnavailable: true,
    }
  }
}

export async function StudioChatLogs({
  locale,
  page = STUDIO_CHAT_LOGS.DEFAULT_PAGE,
  pageSize = STUDIO_CHAT_LOGS.DEFAULT_PAGE_SIZE,
  sortDirection,
}: StudioChatLogsProps) {
  const t = await getTranslations('studio.logs')
  const { logPage, isDatabaseUnavailable } = await getStudioChatLogPageState({
    page,
    pageSize,
    sortDirection,
  })

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-normal">
            {t('title')}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            {t('description')}
          </p>
        </div>
      </div>

      <StudioChatLogTable
        logPage={logPage}
        locale={locale}
        isDatabaseUnavailable={isDatabaseUnavailable}
      />
    </main>
  )
}
