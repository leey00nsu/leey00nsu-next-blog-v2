import { Button } from '@/shared/ui/button'
import Image from 'next/image'
import { cn } from '@/shared/lib/utils'
import Link from 'next/link'
import { Route } from 'next'

interface LogoProps {
  href?: Route
  className?: string
}

export function Logo({ href = '/blog', className }: LogoProps) {
  return (
    <Button
      asChild
      className={cn(
        'relative h-16 w-16 bg-transparent transition-all duration-200 hover:scale-110 hover:bg-transparent',
        className,
      )}
    >
      <Link href={href}>
        <Image src="/logo.png" alt="logo" fill sizes="64px" priority />
      </Link>
    </Button>
  )
}
