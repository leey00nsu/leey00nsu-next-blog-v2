'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  ENGAGEMENT,
  type EngagementEventName,
} from '@/features/engagement/config/constants'
import type {
  EngagementEventPage,
  EngagementEventRecord,
} from '@/features/engagement/model/engagement-events'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { buildStudioListHref } from '@/features/studio-analytics/lib/build-studio-list-href'
import { ROUTES, type SupportedLocale } from '@/shared/config/constants'
import type { AnalyticsDateRange } from '@/shared/model/analytics'

const STUDIO_ENGAGEMENT_EVENT_TABLE = {
  FIRST_PAGE: 1,
  MINIMUM_PAGE_COUNT: 1,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  VISITOR_HASH_PREVIEW_LENGTH: 8,
} as const

interface StudioEngagementEventTableProps {
  eventPage: EngagementEventPage
  locale: SupportedLocale
  isDatabaseUnavailable?: boolean
}

function formatCreatedAt(createdAt: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(createdAt))
}

function buildStudioEventHref(params: {
  locale: SupportedLocale
  page: number
  pageSize: number
  sortDirection: string
  eventName?: EngagementEventName
  dateRange: AnalyticsDateRange
}) {
  return buildStudioListHref({
    routePath: ROUTES.STUDIO_EVENTS,
    locale: params.locale,
    page: params.page,
    pageSize: params.pageSize,
    sortDirection: params.sortDirection,
    dateRange: params.dateRange,
    additionalSearchParameters: {
      eventName: params.eventName,
    },
  })
}

function renderNullableText(value: string | null | undefined): string {
  return value && value.trim() ? value : '-'
}

function formatVisitorHash(visitorHash: string): string {
  return visitorHash.slice(
    0,
    STUDIO_ENGAGEMENT_EVENT_TABLE.VISITOR_HASH_PREVIEW_LENGTH,
  )
}

export function StudioEngagementEventTable({
  eventPage,
  locale,
  isDatabaseUnavailable = false,
}: StudioEngagementEventTableProps) {
  const translate = useTranslations('studio.events')
  const router = useRouter()
  const pageCount = Math.max(
    STUDIO_ENGAGEMENT_EVENT_TABLE.MINIMUM_PAGE_COUNT,
    Math.ceil(eventPage.totalCount / eventPage.pageSize),
  )
  const previousPage = Math.max(
    STUDIO_ENGAGEMENT_EVENT_TABLE.FIRST_PAGE,
    eventPage.page - 1,
  )
  const nextPage = Math.min(pageCount, eventPage.page + 1)
  const eventFilterValue = eventPage.eventName ?? ENGAGEMENT.FILTER.ALL_EVENTS
  const columns: ColumnDef<EngagementEventRecord>[] = [
    {
      accessorKey: 'createdAt',
      header: translate('columns.createdAt'),
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {formatCreatedAt(row.original.createdAt, locale)}
        </span>
      ),
    },
    {
      accessorKey: 'eventName',
      header: translate('columns.eventName'),
      cell: ({ row }) => (
        <Badge variant="secondary" className="whitespace-nowrap">
          {translate(`eventNames.${row.original.eventName}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'locale',
      header: translate('columns.locale'),
    },
    {
      accessorKey: 'pagePath',
      header: translate('columns.pagePath'),
      cell: ({ row }) => (
        <span className="block max-w-[18rem] truncate">
          {row.original.pagePath}
        </span>
      ),
    },
    {
      accessorKey: 'contentSlug',
      header: translate('columns.contentSlug'),
      cell: ({ row }) => (
        <span className="block max-w-[18rem] truncate">
          {renderNullableText(row.original.contentSlug)}
        </span>
      ),
    },
    {
      accessorKey: 'documentKind',
      header: translate('columns.documentKind'),
      cell: ({ row }) => renderNullableText(row.original.documentKind),
    },
    {
      accessorKey: 'referrerHost',
      header: translate('columns.referrerHost'),
      cell: ({ row }) => renderNullableText(row.original.referrerHost),
    },
    {
      id: 'campaign',
      header: translate('columns.campaign'),
      cell: ({ row }) =>
        renderNullableText(
          [
            row.original.utmSource,
            row.original.utmMedium,
            row.original.utmCampaign,
          ]
            .filter(Boolean)
            .join(' / '),
        ),
    },
    {
      accessorKey: 'deviceCategory',
      header: translate('columns.deviceCategory'),
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {translate(`deviceCategories.${row.original.deviceCategory}`)}
        </span>
      ),
    },
    {
      accessorKey: 'anonymousVisitorIdHash',
      header: translate('columns.visitor'),
      cell: ({ row }) => formatVisitorHash(row.original.anonymousVisitorIdHash),
    },
  ]
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table exposes instance methods by design.
  const table = useReactTable({
    data: eventPage.records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })
  const handlePageSizeChange = (nextPageSize: string) => {
    router.push(
      buildStudioEventHref({
        locale,
        page: STUDIO_ENGAGEMENT_EVENT_TABLE.FIRST_PAGE,
        pageSize: Number(nextPageSize),
        sortDirection: eventPage.sortDirection,
        eventName: eventPage.eventName,
        dateRange: eventPage.dateRange,
      }),
    )
  }
  const handleSortDirectionChange = (nextSortDirection: string) => {
    router.push(
      buildStudioEventHref({
        locale,
        page: STUDIO_ENGAGEMENT_EVENT_TABLE.FIRST_PAGE,
        pageSize: eventPage.pageSize,
        sortDirection: nextSortDirection,
        eventName: eventPage.eventName,
        dateRange: eventPage.dateRange,
      }),
    )
  }
  const handleEventFilterChange = (nextEventName: string) => {
    router.push(
      buildStudioEventHref({
        locale,
        page: STUDIO_ENGAGEMENT_EVENT_TABLE.FIRST_PAGE,
        pageSize: eventPage.pageSize,
        sortDirection: eventPage.sortDirection,
        eventName:
          nextEventName === ENGAGEMENT.FILTER.ALL_EVENTS
            ? undefined
            : (nextEventName as EngagementEventName),
        dateRange: eventPage.dateRange,
      }),
    )
  }

  return (
    <section className="min-w-0 space-y-6">
      {isDatabaseUnavailable ? (
        <div
          role="status"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {translate('databaseUnavailable')}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <p className="text-muted-foreground text-sm">
          {translate('listSummary', {
            totalCount: eventPage.totalCount,
            currentPage: eventPage.page,
            pageCount,
          })}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={eventFilterValue}
            onValueChange={handleEventFilterChange}
          >
            <SelectTrigger
              aria-label={translate('filter.label')}
              className="w-full sm:w-[12rem]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ENGAGEMENT.FILTER.ALL_EVENTS}>
                {translate('filter.all')}
              </SelectItem>
              {Object.values(ENGAGEMENT.EVENT_NAME).map((eventName) => (
                <SelectItem key={eventName} value={eventName}>
                  {translate(`eventNames.${eventName}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(eventPage.pageSize)}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger
              aria-label={translate('pageSize.label')}
              className="w-full sm:w-[9.5rem]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STUDIO_ENGAGEMENT_EVENT_TABLE.PAGE_SIZE_OPTIONS.map(
                (pageSizeOption) => (
                  <SelectItem
                    key={pageSizeOption}
                    value={String(pageSizeOption)}
                  >
                    {translate('pageSize.option', {
                      pageSize: pageSizeOption,
                    })}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Select
            value={eventPage.sortDirection}
            onValueChange={handleSortDirectionChange}
          >
            <SelectTrigger
              aria-label={translate('sort.label')}
              className="w-full sm:w-[11rem]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value={ENGAGEMENT.SORT_DIRECTION.CREATED_AT_DESCENDING}
              >
                {translate('sort.createdAtDescending')}
              </SelectItem>
              <SelectItem
                value={ENGAGEMENT.SORT_DIRECTION.CREATED_AT_ASCENDING}
              >
                {translate('sort.createdAtAscending')}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm">
            <Link
              href={buildStudioEventHref({
                locale,
                page: eventPage.page,
                pageSize: eventPage.pageSize,
                sortDirection: eventPage.sortDirection,
                eventName: eventPage.eventName,
                dateRange: eventPage.dateRange,
              })}
            >
              <RotateCw aria-hidden="true" className="size-4" />
              {translate('refresh')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[90rem] text-sm">
            <thead className="bg-muted/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      className="text-muted-foreground px-4 py-3 text-left font-medium whitespace-nowrap"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((tableRow) => (
                  <tr key={tableRow.id} className="border-t">
                    {tableRow.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-top">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="text-muted-foreground px-4 py-10 text-center"
                    colSpan={columns.length}
                  >
                    {translate('empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          asChild
          variant="outline"
          size="sm"
          className={cn(
            eventPage.page <= STUDIO_ENGAGEMENT_EVENT_TABLE.FIRST_PAGE &&
              'pointer-events-none opacity-50',
          )}
        >
          <Link
            aria-disabled={
              eventPage.page <= STUDIO_ENGAGEMENT_EVENT_TABLE.FIRST_PAGE
            }
            href={buildStudioEventHref({
              locale,
              page: previousPage,
              pageSize: eventPage.pageSize,
              sortDirection: eventPage.sortDirection,
              eventName: eventPage.eventName,
              dateRange: eventPage.dateRange,
            })}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            {translate('previous')}
          </Link>
        </Button>
        <span className="text-muted-foreground text-sm">
          {translate('pageIndicator', {
            currentPage: eventPage.page,
            pageCount,
          })}
        </span>
        <Button
          asChild
          variant="outline"
          size="sm"
          className={cn(
            eventPage.page >= pageCount && 'pointer-events-none opacity-50',
          )}
        >
          <Link
            aria-disabled={eventPage.page >= pageCount}
            href={buildStudioEventHref({
              locale,
              page: nextPage,
              pageSize: eventPage.pageSize,
              sortDirection: eventPage.sortDirection,
              eventName: eventPage.eventName,
              dateRange: eventPage.dateRange,
            })}
          >
            {translate('next')}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
