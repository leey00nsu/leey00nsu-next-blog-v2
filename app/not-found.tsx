import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import {
  ROUTES,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'

const NOT_FOUND_MESSAGE = {
  ko: {
    title: '페이지를 찾을 수 없습니다.',
    description: '요청하신 페이지가 없거나 이동되었습니다.',
    action: '블로그 홈으로 이동',
  },
  en: {
    title: 'Page not found.',
    description: 'The page you requested does not exist or has moved.',
    action: 'Go to blog home',
  },
} as const

export default async function NotFound() {
  const locale = (await getLocale()) as SupportedLocale
  const message = NOT_FOUND_MESSAGE[locale]

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-2xl font-semibold">{message.title}</h1>
      <p className="text-muted-foreground text-sm">{message.description}</p>
      <Link
        href={buildLocalizedRoutePath(ROUTES.BLOG, locale)}
        className="text-primary text-sm font-medium underline underline-offset-4"
      >
        {message.action}
      </Link>
    </main>
  )
}
