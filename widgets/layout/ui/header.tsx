import Link from 'next/link'
import { Logo } from '@/shared/ui/logo'
import { ROUTES } from '@/shared/config/constants'
import { ThemeToggle } from '@/shared/ui/theme-toggle'
import { LocaleSelect } from '@/shared/ui/locale-select'

export async function Header() {
  return (
    <nav className="bg-background sticky top-0 z-50 grid grid-cols-4 md:grid-cols-1">
      <Logo className="block md:hidden" />
      <div className="col-span-2 flex h-16 items-center justify-center gap-8">
        <Link href={ROUTES.BLOG} className="hover:text-primary">
          Blog
        </Link>
        <Link href={ROUTES.ABOUT} className="hover:text-primary">
          About
        </Link>
        <Link href={ROUTES.STUDIO} className="hover:text-primary">
          Studio
        </Link>
      </div>
      <div className="flex items-center justify-end gap-2 p-2 md:hidden">
        <LocaleSelect />
        <ThemeToggle />
      </div>
    </nav>
  )
}
