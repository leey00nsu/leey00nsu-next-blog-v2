'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type {
  ChatObservabilityLogPage,
  ChatObservabilityLogRecord,
} from '@/features/chat/model/chat-observability'
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
import {
  ROUTES,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'

const STUDIO_CHAT_LOG_TABLE = {
  FIRST_PAGE: 1,
  MINIMUM_PAGE_COUNT: 1,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  SORT_DIRECTIONS: {
    CREATED_AT_DESCENDING: 'created_at_desc',
    CREATED_AT_ASCENDING: 'created_at_asc',
  },
} as const

interface StudioChatLogTableProps {
  logPage: ChatObservabilityLogPage
  locale: SupportedLocale
  isDatabaseUnavailable?: boolean
}

function formatCreatedAt(createdAt: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(createdAt))
}

function buildStudioLogHref(params: {
  locale: SupportedLocale
  page: number
  pageSize: number
  sortDirection: string
}): Route {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortDirection: params.sortDirection,
  })

  return `${buildLocalizedRoutePath(ROUTES.STUDIO_LOGS, params.locale)}?${searchParams.toString()}` as Route
}

function renderTextList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '-'
}

function normalizeSortDirection(sortDirection: string): string {
  return Object.values(STUDIO_CHAT_LOG_TABLE.SORT_DIRECTIONS).includes(
    sortDirection as (typeof STUDIO_CHAT_LOG_TABLE.SORT_DIRECTIONS)[keyof typeof STUDIO_CHAT_LOG_TABLE.SORT_DIRECTIONS],
  )
    ? sortDirection
    : STUDIO_CHAT_LOG_TABLE.SORT_DIRECTIONS.CREATED_AT_DESCENDING
}

export function StudioChatLogTable({
  logPage,
  locale,
  isDatabaseUnavailable = false,
}: StudioChatLogTableProps) {
  const t = useTranslations('studio.logs')
  const router = useRouter()
  const sortDirection = normalizeSortDirection(logPage.sortDirection)
  const pageCount = Math.max(
    STUDIO_CHAT_LOG_TABLE.MINIMUM_PAGE_COUNT,
    Math.ceil(logPage.totalCount / logPage.pageSize),
  )
  const previousPage = Math.max(
    STUDIO_CHAT_LOG_TABLE.FIRST_PAGE,
    logPage.page - 1,
  )
  const nextPage = Math.min(pageCount, logPage.page + 1)
  const handlePageSizeChange = (nextPageSize: string) => {
    router.push(
      buildStudioLogHref({
        locale,
        page: STUDIO_CHAT_LOG_TABLE.FIRST_PAGE,
        pageSize: Number(nextPageSize),
        sortDirection,
      }),
    )
  }
  const handleSortDirectionChange = (nextSortDirection: string) => {
    router.push(
      buildStudioLogHref({
        locale,
        page: STUDIO_CHAT_LOG_TABLE.FIRST_PAGE,
        pageSize: logPage.pageSize,
        sortDirection: nextSortDirection,
      }),
    )
  }
  const columns: ColumnDef<ChatObservabilityLogRecord>[] = [
    {
      accessorKey: 'createdAt',
      header: t('columns.createdAt'),
      cell: ({ row: tableRow }) =>
        formatCreatedAt(tableRow.original.createdAt, locale),
    },
    {
      accessorKey: 'locale',
      header: t('columns.locale'),
      cell: ({ row: tableRow }) => (
        <Badge variant="secondary">{tableRow.original.locale}</Badge>
      ),
    },
    {
      accessorKey: 'originalQuestion',
      header: t('columns.originalQuestion'),
      cell: ({ row: tableRow }) => (
        <span className="line-clamp-2 max-w-[22rem]">
          {tableRow.original.originalQuestion}
        </span>
      ),
    },
    {
      accessorKey: 'answer',
      header: t('columns.answer'),
      cell: ({ row: tableRow }) => (
        <span className="line-clamp-3 max-w-[26rem]">
          {tableRow.original.answer || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'cacheKind',
      header: t('columns.cacheKind'),
      cell: ({ row: tableRow }) => tableRow.original.cacheKind,
    },
    {
      accessorKey: 'plannerAction',
      header: t('columns.plannerAction'),
      cell: ({ row: tableRow }) => tableRow.original.plannerAction ?? '-',
    },
    {
      accessorKey: 'preferredSourceCategories',
      header: t('columns.sourceCategories'),
      cell: ({ row: tableRow }) =>
        renderTextList(tableRow.original.preferredSourceCategories),
    },
    {
      accessorKey: 'citations',
      header: t('columns.citations'),
      cell: ({ row: tableRow }) => String(tableRow.original.citations.length),
    },
    {
      accessorKey: 'grounded',
      header: t('columns.grounded'),
      cell: ({ row: tableRow }) => (
        <Badge variant={tableRow.original.grounded ? 'default' : 'outline'}>
          {tableRow.original.grounded ? t('grounded.yes') : t('grounded.no')}
        </Badge>
      ),
    },
    {
      accessorKey: 'durationMilliseconds',
      header: t('columns.durationMilliseconds'),
      cell: ({ row: tableRow }) =>
        t('duration', {
          durationMilliseconds: tableRow.original.durationMilliseconds,
        }),
    },
  ]
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table exposes instance methods by design.
  const table = useReactTable({
    data: logPage.records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <section className="space-y-4">
      {isDatabaseUnavailable ? (
        <div
          role="status"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {t('databaseUnavailable')}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          {t('summary', {
            totalCount: logPage.totalCount,
            currentPage: logPage.page,
            pageCount,
          })}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={String(logPage.pageSize)}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger
              aria-label={t('pageSize.label')}
              className="w-full sm:w-[9.5rem]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STUDIO_CHAT_LOG_TABLE.PAGE_SIZE_OPTIONS.map((pageSizeOption) => (
                <SelectItem key={pageSizeOption} value={String(pageSizeOption)}>
                  {t('pageSize.option', { pageSize: pageSizeOption })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sortDirection}
            onValueChange={handleSortDirectionChange}
          >
            <SelectTrigger
              aria-label={t('sort.label')}
              className="w-full sm:w-[11rem]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value={
                  STUDIO_CHAT_LOG_TABLE.SORT_DIRECTIONS.CREATED_AT_DESCENDING
                }
              >
                {t('sort.createdAtDescending')}
              </SelectItem>
              <SelectItem
                value={STUDIO_CHAT_LOG_TABLE.SORT_DIRECTIONS.CREATED_AT_ASCENDING}
              >
                {t('sort.createdAtAscending')}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm">
            <Link
              href={buildStudioLogHref({
                locale,
                page: logPage.page,
                pageSize: logPage.pageSize,
                sortDirection,
              })}
            >
              <RotateCw aria-hidden="true" className="size-4" />
              {t('refresh')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[72rem] text-sm">
            <thead className="bg-muted/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      className="text-muted-foreground px-4 py-3 text-left font-medium"
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
                    {t('empty')}
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
            logPage.page <= STUDIO_CHAT_LOG_TABLE.FIRST_PAGE &&
              'pointer-events-none opacity-50',
          )}
        >
          <Link
            aria-disabled={logPage.page <= STUDIO_CHAT_LOG_TABLE.FIRST_PAGE}
            href={buildStudioLogHref({
              locale,
              page: previousPage,
              pageSize: logPage.pageSize,
              sortDirection,
            })}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            {t('previous')}
          </Link>
        </Button>
        <span className="text-muted-foreground text-sm">
          {t('pageIndicator', {
            currentPage: logPage.page,
            pageCount,
          })}
        </span>
        <Button
          asChild
          variant="outline"
          size="sm"
          className={cn(
            logPage.page >= pageCount && 'pointer-events-none opacity-50',
          )}
        >
          <Link
            aria-disabled={logPage.page >= pageCount}
            href={buildStudioLogHref({
              locale,
              page: nextPage,
              pageSize: logPage.pageSize,
              sortDirection,
            })}
          >
            {t('next')}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
