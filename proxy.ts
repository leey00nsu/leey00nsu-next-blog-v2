import { auth } from '@/features/auth/lib/auth'
import {
  LOCALES,
  ROUTES,
  SupportedLocale,
  buildLocalizedRoutePath,
  stripLocalePrefix,
} from '@/shared/config/constants'
import { determineSupportedLocale } from '@/shared/lib/locale/determine-supported-locale'
import { NextResponse } from 'next/server'

const PROXY_SKIP_PATH_PREFIXES = ['/api', '/_next']
const PROXY_SKIP_EXACT_PATHS = new Set([
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image',
])

function hasSupportedLocalePrefix(pathname: string): SupportedLocale | null {
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

function shouldSkipProxy(pathname: string): boolean {
  if (PROXY_SKIP_EXACT_PATHS.has(pathname)) {
    return true
  }

  if (PROXY_SKIP_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true
  }

  return /\.[^/]+$/.test(pathname)
}

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

export const proxy = auth((req) => {
  const { nextUrl } = req
  const requestPathname = nextUrl.pathname

  if (shouldSkipProxy(requestPathname)) {
    return NextResponse.next()
  }

  const localeInPath = hasSupportedLocalePrefix(requestPathname)

  if (!localeInPath) {
    const localeFromCookie = req.cookies.get('locale')?.value ?? null
    const localeFromAcceptLanguage = parseLocaleFromAcceptLanguage(
      req.headers.get('accept-language'),
    )
    const selectedLocale = determineSupportedLocale([
      localeFromCookie,
      localeFromAcceptLanguage,
      LOCALES.DEFAULT,
    ])

    const redirectedPathname =
      requestPathname === ROUTES.ROOT ? ROUTES.BLOG : requestPathname
    const localizedPathname = buildLocalizedRoutePath(
      redirectedPathname,
      selectedLocale,
    )
    const redirectUrl = new URL(
      `${localizedPathname}${nextUrl.search}`,
      nextUrl.origin,
    )

    return NextResponse.redirect(redirectUrl)
  }

  const pathnameWithoutLocale = stripLocalePrefix(requestPathname)

  if (process.env.SKIP_AUTH !== 'true') {
    const isStudioRoute = pathnameWithoutLocale.startsWith(ROUTES.STUDIO)
    if (isStudioRoute && !req.auth) {
      const localizedSignInPath = buildLocalizedRoutePath(
        ROUTES.AUTH_SIGNIN,
        localeInPath,
      )
      const localizedCallbackPath = buildLocalizedRoutePath(
        pathnameWithoutLocale,
        localeInPath,
      )
      const signInUrl = new URL(localizedSignInPath, nextUrl.origin)
      signInUrl.searchParams.set(
        'callbackUrl',
        `${localizedCallbackPath}${nextUrl.search}`,
      )
      return NextResponse.redirect(signInUrl)
    }
  }

  const rewriteUrl = nextUrl.clone()
  rewriteUrl.pathname = pathnameWithoutLocale

  const rewrittenRequestHeaders = new Headers(req.headers)
  rewrittenRequestHeaders.set('x-locale', localeInPath)

  const response = NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: rewrittenRequestHeaders,
    },
  })
  response.cookies.set('locale', localeInPath)

  return response
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
