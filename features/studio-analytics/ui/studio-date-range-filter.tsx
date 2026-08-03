'use client'

import { useEffect, useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { enUS, ko } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import type { SupportedLocale } from '@/shared/config/constants'
import {
  getAnalyticsQuickDateRange,
  type AnalyticsQuickDateRange,
} from '@/shared/lib/analytics-date-range'
import type { AnalyticsDateRange } from '@/shared/model/analytics'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/calendar'
import { Label } from '@/shared/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

const STUDIO_DATE_RANGE_FILTER = {
  DATE_FORMAT: 'yyyy-MM-dd',
  QUICK_DATE_RANGES: [
    { value: 'last-seven-days', label: '7D' },
    { value: 'current-week', label: '1W' },
    { value: 'current-month', label: '1M' },
  ],
} as const

interface StudioDateRangeFilterLabels {
  startDate: string
  endDate: string
  description: string
  quickRanges: string
  lastSevenDays: string
  currentWeek: string
  currentMonth: string
}

interface StudioDateRangeFilterProps {
  action: string
  dateRange: AnalyticsDateRange
  labels: StudioDateRangeFilterLabels
  locale: SupportedLocale
  preservedSearchParameters: Record<string, string | undefined>
}

interface DateSelectorProps {
  date: string
  label: string
  locale: SupportedLocale
  maximumDate?: Date
  minimumDate?: Date
  onSelect: (date: Date) => void
}

function DateSelector({
  date,
  label,
  locale,
  maximumDate,
  minimumDate,
  onSelect,
}: DateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedDate = parseISO(date)
  const dateLocale = locale === 'ko' ? ko : enUS

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <Label className="shrink-0">{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-normal sm:w-40"
            aria-label={`${label}: ${date}`}
          >
            <CalendarDays aria-hidden="true" />
            {new Intl.DateTimeFormat(locale, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).format(selectedDate)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            locale={dateLocale}
            selected={selectedDate}
            defaultMonth={selectedDate}
            disabled={[
              ...(minimumDate ? [{ before: minimumDate }] : []),
              ...(maximumDate ? [{ after: maximumDate }] : []),
            ]}
            onSelect={(nextDate) => {
              if (!nextDate) {
                return
              }

              onSelect(nextDate)
              setIsOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function StudioDateRangeFilter({
  action,
  dateRange,
  labels,
  locale,
  preservedSearchParameters,
}: StudioDateRangeFilterProps) {
  const router = useRouter()
  const [selectedDateRange, setSelectedDateRange] = useState(dateRange)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setSelectedDateRange(dateRange)
  }, [dateRange])

  function handleDateRangeChange(nextDateRange: AnalyticsDateRange) {
    const searchParameters = new URLSearchParams()

    for (const [name, value] of Object.entries(preservedSearchParameters)) {
      if (value) {
        searchParameters.set(name, value)
      }
    }

    searchParameters.set('page', '1')
    searchParameters.set('startDate', nextDateRange.startDate)
    searchParameters.set('endDate', nextDateRange.endDate)
    setSelectedDateRange(nextDateRange)

    startTransition(() => {
      router.push(`${action}?${searchParameters.toString()}` as Route, {
        scroll: false,
      })
    })
  }

  function handleQuickDateRangeChange(quickDateRange: AnalyticsQuickDateRange) {
    handleDateRangeChange(getAnalyticsQuickDateRange(quickDateRange))
  }

  return (
    <section
      className="bg-card flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-end lg:justify-between"
      aria-busy={isPending}
    >
      <p className="flex items-center gap-2 self-start text-sm font-medium lg:self-center">
        <CalendarDays aria-hidden="true" className="size-4" />
        {labels.description}
      </p>

      <div
        className="flex flex-col gap-4 transition-opacity sm:flex-row sm:items-center sm:gap-6"
        data-pending={isPending || undefined}
      >
        <div
          className="flex h-9 items-center gap-2"
          aria-label={labels.quickRanges}
        >
          {STUDIO_DATE_RANGE_FILTER.QUICK_DATE_RANGES.map((quickDateRange) => {
            const quickDateRangeLabels = {
              'last-seven-days': labels.lastSevenDays,
              'current-week': labels.currentWeek,
              'current-month': labels.currentMonth,
            }

            const quickRange = getAnalyticsQuickDateRange(quickDateRange.value)
            const isSelected =
              quickRange.startDate === selectedDateRange.startDate &&
              quickRange.endDate === selectedDateRange.endDate

            return (
              <Button
                key={quickDateRange.value}
                type="button"
                variant={isSelected ? 'secondary' : 'outline'}
                size="sm"
                title={quickDateRangeLabels[quickDateRange.value]}
                onClick={() => handleQuickDateRangeChange(quickDateRange.value)}
                disabled={isPending}
              >
                {quickDateRange.label}
              </Button>
            )
          })}
        </div>

        <DateSelector
          date={selectedDateRange.startDate}
          label={labels.startDate}
          locale={locale}
          maximumDate={parseISO(selectedDateRange.endDate)}
          onSelect={(startDate) =>
            handleDateRangeChange({
              ...selectedDateRange,
              startDate: format(
                startDate,
                STUDIO_DATE_RANGE_FILTER.DATE_FORMAT,
              ),
            })
          }
        />
        <DateSelector
          date={selectedDateRange.endDate}
          label={labels.endDate}
          locale={locale}
          minimumDate={parseISO(selectedDateRange.startDate)}
          onSelect={(endDate) =>
            handleDateRangeChange({
              ...selectedDateRange,
              endDate: format(endDate, STUDIO_DATE_RANGE_FILTER.DATE_FORMAT),
            })
          }
        />
      </div>
    </section>
  )
}
