import { redirect } from 'next/navigation'
import {
  ROUTES,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'
import { getLocale } from 'next-intl/server'

export default async function Home() {
  const locale = (await getLocale()) as SupportedLocale
  redirect(buildLocalizedRoutePath(ROUTES.BLOG, locale))
}
