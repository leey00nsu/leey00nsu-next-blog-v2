import { Button } from '@/shared/ui/button'
import Image from 'next/image'
import { cn } from '@/shared/lib/utils'
import Link from 'next/link'
import { Route } from 'next'
import {
  LOCALES,
  ROUTES,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'

interface LogoProps {
  href?: Route
  className?: string
}

export function Logo({
  href = buildLocalizedRoutePath(ROUTES.BLOG, LOCALES.DEFAULT),
  className,
}: LogoProps) {
  return (
    <Button
      asChild
      variant="link"
      className={cn(
        'relative h-16 w-16 bg-transparent transition-all duration-200 hover:scale-110 hover:bg-transparent',
        className,
      )}
    >
      <Link href={href}>
        <Image src="/logo.webp" alt="logo" fill sizes="64px" priority />
      </Link>
    </Button>
  )
}
