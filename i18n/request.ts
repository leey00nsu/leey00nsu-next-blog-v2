import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { LOCALES, SupportedLocale } from '@/shared/config/constants'

function isSupportedLocale(locale: string | undefined): locale is SupportedLocale {
  if (!locale) {
    return false
  }

  return LOCALES.SUPPORTED.includes(locale as SupportedLocale)
}

export default getRequestConfig(async ({ requestLocale }) => {
  const store = await cookies()
  const cookieLocale = store.get('locale')?.value
  const requestedLocale = await requestLocale
  const localeCandidate = requestedLocale ?? cookieLocale ?? LOCALES.DEFAULT
  const locale = isSupportedLocale(localeCandidate)
    ? localeCandidate
    : LOCALES.DEFAULT

  const messagesModule = await import(`../messages/${locale}.json`)
  const messages = messagesModule.default

  return {
    locale,
    messages,
  }
})
