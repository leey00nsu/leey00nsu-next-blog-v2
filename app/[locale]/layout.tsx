import { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { LOCALES, SupportedLocale } from '@/shared/config/constants'

interface LocaleLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return LOCALES.SUPPORTED.includes(locale as SupportedLocale)
}

export function generateStaticParams() {
  return LOCALES.SUPPORTED.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params

  if (!isSupportedLocale(locale)) {
    notFound()
  }

  setRequestLocale(locale)

  return children
}
