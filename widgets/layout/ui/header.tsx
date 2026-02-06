import Link from 'next/link'
import { Logo } from '@/shared/ui/logo'
import {
  ROUTES,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'
import { ThemeToggle } from '@/shared/ui/theme-toggle'
import { LocaleSelect } from '@/shared/ui/locale-select'
import { getTranslations } from 'next-intl/server'
import { getLocale } from 'next-intl/server'

export async function Header() {
  const locale = (await getLocale()) as SupportedLocale
  const t = await getTranslations('navigation')

  return (
    <nav className="bg-background sticky top-0 z-50 grid grid-cols-4 md:grid-cols-1">
      <Logo className="block md:hidden" />
      <div className="col-span-2 flex h-16 items-center justify-center gap-8">
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
          href={buildLocalizedRoutePath(ROUTES.STUDIO, locale)}
          className="hover:text-primary"
        >
          {t('studio')}
        </Link>
      </div>
      <div className="flex items-center justify-end gap-2 p-2 md:hidden">
        <LocaleSelect />
        <ThemeToggle />
      </div>
    </nav>
  )
}
