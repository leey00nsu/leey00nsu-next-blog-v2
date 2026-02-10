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

const PROXY_SKIP_PATH_PREFIXES = ['/api', '/_next', '/print']
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

function parseLocaleFromRequestHeader(
  localeHeaderValue: string | null,
): SupportedLocale | null {
  if (!localeHeaderValue) {
    return null
  }

  const normalizedLocale = localeHeaderValue.trim().toLowerCase()
  if (!LOCALES.SUPPORTED.includes(normalizedLocale as SupportedLocale)) {
    return null
  }

  return normalizedLocale as SupportedLocale
}

function resolveRequestOrigin(
  requestHeaders: Headers,
  fallbackOrigin: string,
): string {
  const forwardedProtocolHeader =
    requestHeaders.get('x-forwarded-proto') ?? null
  const protocolCandidate = forwardedProtocolHeader?.split(',')[0]?.trim()
  const resolvedProtocol = protocolCandidate || 'http'

  const forwardedHostHeader = requestHeaders.get('x-forwarded-host') ?? null
  const hostHeader = requestHeaders.get('host') ?? null
  const hostCandidate =
    forwardedHostHeader?.split(',')[0]?.trim() ?? hostHeader?.trim() ?? ''

  if (!hostCandidate) {
    return fallbackOrigin
  }

  return `${resolvedProtocol}://${hostCandidate}`
}

export const proxy = auth((req) => {
  const { nextUrl } = req
  const requestPathname = nextUrl.pathname
  const requestOrigin = resolveRequestOrigin(req.headers, nextUrl.origin)

  if (shouldSkipProxy(requestPathname)) {
    return NextResponse.next()
  }

  const localeInPath = hasSupportedLocalePrefix(requestPathname)
  const localeFromRewrittenRequestHeader = parseLocaleFromRequestHeader(
    req.headers.get('x-locale'),
  )
  const resolvedLocale = localeInPath ?? localeFromRewrittenRequestHeader

  if (!resolvedLocale) {
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
      requestOrigin,
    )

    return NextResponse.redirect(redirectUrl)
  }

  const pathnameWithoutLocale = stripLocalePrefix(requestPathname)

  if (process.env.SKIP_AUTH !== 'true') {
    const isStudioRoute = pathnameWithoutLocale.startsWith(ROUTES.STUDIO)
    if (isStudioRoute && !req.auth) {
      const localizedSignInPath = buildLocalizedRoutePath(
        ROUTES.AUTH_SIGNIN,
        resolvedLocale,
      )
      const localizedCallbackPath = buildLocalizedRoutePath(
        pathnameWithoutLocale,
        resolvedLocale,
      )
      const signInUrl = new URL(localizedSignInPath, requestOrigin)
      signInUrl.searchParams.set(
        'callbackUrl',
        `${localizedCallbackPath}${nextUrl.search}`,
      )
      return NextResponse.redirect(signInUrl)
    }
  }

  const rewriteUrl = nextUrl.clone()
  rewriteUrl.pathname = pathnameWithoutLocale
  rewriteUrl.search = nextUrl.search
  const requestHostHeader = req.headers.get('host')?.trim() ?? ''
  if (requestHostHeader) {
    rewriteUrl.host = requestHostHeader
  }

  const rewrittenRequestHeaders = new Headers(req.headers)
  rewrittenRequestHeaders.set('x-locale', resolvedLocale)

  const response = NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: rewrittenRequestHeaders,
    },
  })
  response.cookies.set('locale', resolvedLocale)

  return response
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
