'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { setLocale } from '@/features/i18n/model/set-locale'
import { Languages } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import {
  LOCALES,
  buildLocalizedRoutePath,
  stripLocalePrefix,
  SupportedLocale,
} from '@/shared/config/constants'
import { Route } from 'next'

const LOCALE_OPTIONS = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
] as const

export interface LocaleSelectProps {
  className?: string
}

export function LocaleSelect({ className }: LocaleSelectProps) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function isSupportedLocale(localeValue: string): localeValue is SupportedLocale {
    return LOCALES.SUPPORTED.includes(localeValue as SupportedLocale)
  }

  async function handleChange(nextLocale: string) {
    if (!isSupportedLocale(nextLocale)) {
      return
    }

    const pathnameWithoutLocale = stripLocalePrefix(pathname)
    const localizedPathname = buildLocalizedRoutePath(
      pathnameWithoutLocale,
      nextLocale,
    )
    const queryString = searchParams.toString()
    const localizedPathWithQueryString =
      queryString.length > 0
        ? (`${localizedPathname}?${queryString}` as Route)
        : (localizedPathname as Route)

    await setLocale(nextLocale)
    router.push(localizedPathWithQueryString)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Change language"
          className={className}
        >
          <Languages aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
          {LOCALE_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value}>
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
