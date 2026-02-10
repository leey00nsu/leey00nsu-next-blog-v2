import { defineRouting } from 'next-intl/routing'
import { LOCALES } from '@/shared/config/constants'

export const routing = defineRouting({
  locales: LOCALES.SUPPORTED,
  defaultLocale: LOCALES.DEFAULT,
  localePrefix: 'always',
  localeCookie: {
    name: 'locale',
    sameSite: 'lax',
  },
})
