import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { LOCALES } from '@/shared/config/constants'
import { determineSupportedLocale } from '@/shared/lib/locale/determine-supported-locale'

export default getRequestConfig(async () => {
  const store = await cookies()
  const requestHeaders = await headers()
  const headerLocale = requestHeaders.get('x-locale')
  const cookieLocale = store.get('locale')?.value
  const locale = determineSupportedLocale([
    headerLocale,
    cookieLocale,
    LOCALES.DEFAULT,
  ])

  const messagesModule = await import(`../messages/${locale}.json`)
  const messages = messagesModule.default

  return {
    locale,
    messages,
  }
})
