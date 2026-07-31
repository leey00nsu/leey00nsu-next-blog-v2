'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Eye, RotateCw, X } from 'lucide-react'
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
const STUDIO_CHAT_LOG_DETAIL = {
  MAXIMUM_MATCH_PREVIEW_COUNT: 6,
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

function renderNullableText(value: string | null | undefined): string {
  return value && value.trim() ? value : '-'
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
      cell: ({ row: tableRow }) => (
        <span className="whitespace-nowrap">
          {formatCreatedAt(tableRow.original.createdAt, locale)}
        </span>
      ),
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
      accessorKey: 'intentOperation',
      header: t('columns.intentOperation'),
      cell: ({ row: tableRow }) => tableRow.original.intentOperation ?? '-',
    },
    {
      accessorKey: 'intentEvidenceScope',
      header: t('columns.intentEvidenceScope'),
      cell: ({ row: tableRow }) => tableRow.original.intentEvidenceScope ?? '-',
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
    {
      id: 'actions',
      header: t('columns.actions'),
      cell: ({ row: tableRow }) => (
        <StudioChatLogDetailDialog record={tableRow.original} locale={locale} />
      ),
    },
  ]
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table exposes instance methods by design.
  const table = useReactTable({
    data: logPage.records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <section className="min-w-0 space-y-4">
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
                value={
                  STUDIO_CHAT_LOG_TABLE.SORT_DIRECTIONS.CREATED_AT_ASCENDING
                }
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
          <table className="w-full min-w-[96rem] text-sm">
            <thead className="bg-muted/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      className="text-muted-foreground whitespace-nowrap px-4 py-3 text-left font-medium"
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

function StudioChatLogDetailDialog({
  record,
  locale,
}: {
  record: ChatObservabilityLogRecord
  locale: SupportedLocale
}) {
  const t = useTranslations('studio.logs')

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('detail.open')}
        >
          <Eye aria-hidden="true" className="size-4" />
          {t('detail.openShort')}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/45" />
        <Dialog.Content className="bg-background fixed top-1/2 left-1/2 z-[101] flex max-h-[min(46rem,calc(100vh-2rem))] w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0 space-y-1">
              <Dialog.Title className="text-lg font-semibold">
                {t('detail.title')}
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                {formatCreatedAt(record.createdAt, locale)}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('detail.close')}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto px-5 py-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-5">
                <StudioChatLogDetailTextBlock
                  title={t('detail.originalQuestion')}
                  value={record.originalQuestion}
                />
                <StudioChatLogDetailTextBlock
                  title={t('detail.answer')}
                  value={record.answer}
                />
                <StudioChatLogDetailTextBlock
                  title={t('detail.resolvedQuestion')}
                  value={renderNullableText(record.resolvedQuestion)}
                />
                <StudioChatLogDetailTextBlock
                  title={t('detail.normalizedQuestion')}
                  value={renderNullableText(record.normalizedQuestion)}
                />
              </div>

              <aside className="space-y-4">
                <StudioChatLogDetailMetaGrid record={record} locale={locale} />
                <StudioChatLogMatchSection
                  title={t('detail.citations')}
                  matches={record.citations}
                />
                <StudioChatLogMatchSection
                  title={t('detail.finalMatches')}
                  matches={record.finalMatches}
                />
              </aside>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function StudioChatLogDetailTextBlock({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="bg-muted/50 rounded-md border px-3 py-3 text-sm leading-6 whitespace-pre-wrap">
        {value || '-'}
      </p>
    </section>
  )
}

function StudioChatLogDetailMetaGrid({
  record,
  locale,
}: {
  record: ChatObservabilityLogRecord
  locale: SupportedLocale
}) {
  const t = useTranslations('studio.logs')
  const metaItems = [
    {
      label: t('columns.locale'),
      value: record.locale,
    },
    {
      label: t('columns.cacheKind'),
      value: record.cacheKind,
    },
    {
      label: t('columns.grounded'),
      value: record.grounded ? t('grounded.yes') : t('grounded.no'),
    },
    {
      label: t('columns.durationMilliseconds'),
      value: t('duration', {
        durationMilliseconds: record.durationMilliseconds,
      }),
    },
    {
      label: t('detail.currentPostSlug'),
      value: renderNullableText(record.currentPostSlug),
    },
    {
      label: t('columns.intentOperation'),
      value: renderNullableText(record.intentOperation),
    },
    {
      label: t('columns.intentEvidenceScope'),
      value: renderNullableText(record.intentEvidenceScope),
    },
    {
      label: t('detail.refusalReason'),
      value: renderNullableText(record.refusalReason),
    },
    {
      label: t('detail.createdAt'),
      value: formatCreatedAt(record.createdAt, locale),
    },
    {
      label: t('detail.reranked'),
      value: record.reranked ? t('detail.booleanYes') : t('detail.booleanNo'),
    },
  ]

  return (
    <dl className="grid gap-2 text-sm">
      {metaItems.map((metaItem) => (
        <div
          key={metaItem.label}
          className="grid grid-cols-[8rem_minmax(0,1fr)] gap-2 rounded-md border px-3 py-2"
        >
          <dt className="text-muted-foreground">{metaItem.label}</dt>
          <dd className="min-w-0 break-words">{metaItem.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function StudioChatLogMatchSection({
  title,
  matches,
}: {
  title: string
  matches: ChatObservabilityLogRecord['citations']
}) {
  const visibleMatches = matches.slice(
    0,
    STUDIO_CHAT_LOG_DETAIL.MAXIMUM_MATCH_PREVIEW_COUNT,
  )

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {visibleMatches.length > 0 ? (
        <ul className="space-y-2">
          {visibleMatches.map((match) => (
            <li key={`${title}-${match.url}`} className="rounded-md border p-3">
              <a
                href={match.url}
                className="hover:text-primary block text-sm font-medium"
              >
                {match.title}
              </a>
              <p className="text-muted-foreground mt-1 text-xs">
                {match.sourceCategory}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-md border px-3 py-2 text-sm">
          -
        </p>
      )}
    </section>
  )
}
