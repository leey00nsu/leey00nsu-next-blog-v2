import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import { auth } from '@/features/auth/lib/auth'
import { routing } from '@/i18n/routing'
import {
  LOCALES,
  ROUTES,
  SupportedLocale,
  buildLocalizedRoutePath,
  stripLocalePrefix,
} from '@/shared/config/constants'
import { determineSupportedLocale } from '@/shared/lib/locale/determine-supported-locale'

const localeRoutingMiddleware = createMiddleware(routing)

function parseLocaleFromAcceptLanguage(
  acceptLanguageHeader: string | null,
): SupportedLocale | null {
  if (!acceptLanguageHeader) {
    return null
  }

  const languageTokens = acceptLanguageHeader.split(',')
  for (const token of languageTokens) {
    const localeToken = token.trim().split(';')[0]
    const normalizedLocaleToken = localeToken.toLowerCase()
    const localeBase = normalizedLocaleToken.split('-')[0]

    if (LOCALES.SUPPORTED.includes(localeBase as SupportedLocale)) {
      return localeBase as SupportedLocale
    }
  }

  return null
}

function parseSupportedLocaleFromPathname(
  pathname: string,
): SupportedLocale | null {
  const pathSegments = pathname.split('/')
  const localeCandidate = pathSegments[1]

  if (!localeCandidate) {
    return null
  }

  if (!LOCALES.SUPPORTED.includes(localeCandidate as SupportedLocale)) {
    return null
  }

  return localeCandidate as SupportedLocale
}

export const proxy = auth((request) => {
  if (request.nextUrl.pathname === ROUTES.ROOT) {
    const localeFromCookie = request.cookies.get('locale')?.value ?? null
    const localeFromAcceptLanguage = parseLocaleFromAcceptLanguage(
      request.headers.get('accept-language'),
    )
    const selectedLocale = determineSupportedLocale([
      localeFromCookie,
      localeFromAcceptLanguage,
      LOCALES.DEFAULT,
    ])

    const localizedBlogPath = buildLocalizedRoutePath(ROUTES.BLOG, selectedLocale)
    const redirectUrl = new URL(
      `${localizedBlogPath}${request.nextUrl.search}`,
      request.url,
    )

    return NextResponse.redirect(redirectUrl)
  }

  const localeRoutingResponse = localeRoutingMiddleware(request)

  if (process.env.SKIP_AUTH === 'true') {
    return localeRoutingResponse
  }

  const requestPathname = request.nextUrl.pathname
  const locale = parseSupportedLocaleFromPathname(requestPathname)

  if (!locale) {
    return localeRoutingResponse
  }

  const pathnameWithoutLocale = stripLocalePrefix(requestPathname)
  const isStudioRoute = pathnameWithoutLocale.startsWith(ROUTES.STUDIO)

  if (!isStudioRoute || request.auth) {
    return localeRoutingResponse
  }

  const localizedSignInPath = buildLocalizedRoutePath(ROUTES.AUTH_SIGNIN, locale)
  const localizedCallbackPath = buildLocalizedRoutePath(
    pathnameWithoutLocale,
    locale,
  )
  const signInUrl = new URL(localizedSignInPath, request.url)
  signInUrl.searchParams.set(
    'callbackUrl',
    `${localizedCallbackPath}${request.nextUrl.search}`,
  )

  return NextResponse.redirect(signInUrl)
})

export const config = {
  // eslint-disable-next-line unicorn/prefer-string-raw -- Next.js static analyzer requires a string literal here.
  matcher: ['/((?!api|print|_next|_vercel|.*\\..*).*)'],
}
