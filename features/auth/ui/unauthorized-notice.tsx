'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/shared/ui/button'
import { ROUTES } from '@/shared/config/constants'

export function UnauthorizedNotice() {
  const t = useTranslations('auth.unauthorized')

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t('message')}</h1>
      <Link href={ROUTES.BLOG}>
        <Button>{t('backToHome')}</Button>
      </Link>
    </div>
  )
}
