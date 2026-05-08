import { redirect } from 'next/navigation'
import {
  ROUTES,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'

interface HomeProps {
  params: Promise<{ locale: SupportedLocale }>
}

export default async function Home({ params }: HomeProps) {
  const { locale } = await params
  redirect(buildLocalizedRoutePath(ROUTES.BLOG, locale))
}
