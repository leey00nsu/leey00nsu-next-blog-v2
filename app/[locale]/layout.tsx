import { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { LOCALES, SupportedLocale } from '@/shared/config/constants'
import koMessages from '@/messages/ko.json'
import enMessages from '@/messages/en.json'

interface LocaleLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return LOCALES.SUPPORTED.includes(locale as SupportedLocale)
}

const MESSAGES = {
  ko: koMessages,
  en: enMessages,
} as const

export const dynamicParams = false
export const dynamic = 'force-static'

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

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      {children}
    </NextIntlClientProvider>
  )
}
