'use client'

import Link from 'next/link'
import { Logo } from '@/shared/ui/logo'
import {
  ROUTES,
  buildLocalizedRoutePath,
  type SupportedLocale,
} from '@/shared/config/constants'
import { ThemeToggle } from '@/shared/ui/theme-toggle'
import { LocaleSelect } from '@/shared/ui/locale-select'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'

interface HeaderProps {
  locale: SupportedLocale
  isFullWidth?: boolean
}

export function Header({ locale, isFullWidth = false }: HeaderProps) {
  const t = useTranslations('navigation')

  return (
    <nav
      className={cn(
        'bg-background sticky top-0 z-50 grid',
        isFullWidth
          ? 'grid-cols-4 border-b px-2 md:grid-cols-[auto_1fr_auto]'
          : 'grid-cols-4 md:grid-cols-1',
      )}
    >
      <Logo className={cn('block', !isFullWidth && 'md:hidden')} />
      <div
        className={cn(
          'flex h-16 items-center justify-center gap-3 text-sm sm:gap-6 sm:text-base md:gap-8',
          isFullWidth ? 'col-span-2 md:col-span-1' : 'col-span-2',
        )}
      >
        <Link
          href={buildLocalizedRoutePath(ROUTES.BLOG, locale)}
          className="hover:text-primary"
        >
          {t('blog')}
        </Link>
        <Link
          href={buildLocalizedRoutePath(ROUTES.ABOUT, locale)}
          className="hover:text-primary"
        >
          {t('about')}
        </Link>
        <Link
          href={buildLocalizedRoutePath(ROUTES.PROJECTS, locale)}
          className="hover:text-primary"
        >
          {t('projects')}
        </Link>
        <Link
          href={buildLocalizedRoutePath(ROUTES.STUDIO, locale)}
          className="hover:text-primary"
        >
          {t('studio')}
        </Link>
      </div>
      <div
        className={cn(
          'flex items-center justify-end gap-2 p-2',
          !isFullWidth && 'md:hidden',
        )}
      >
        <LocaleSelect />
        <ThemeToggle />
      </div>
    </nav>
  )
}
