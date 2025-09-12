'use client'

import { useTranslations } from 'next-intl'

export function ComingSoon() {
  const t = useTranslations('about')
  return <p>{t('comingSoon')}</p>
}
