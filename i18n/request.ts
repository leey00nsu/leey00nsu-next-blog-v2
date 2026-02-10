import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { LOCALES } from '@/shared/config/constants'
import { determineSupportedLocale } from '@/shared/lib/locale/determine-supported-locale'

export default getRequestConfig(async ({ requestLocale }) => {
  const store = await cookies()
  const localeFromRequest = await requestLocale
  const cookieLocale = store.get('locale')?.value
  const locale = determineSupportedLocale([
    localeFromRequest,
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
