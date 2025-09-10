import { auth } from '@/features/auth/lib/auth'
import { ROUTES } from '@/shared/config/constants'
import { NextResponse } from 'next/server'

export const middleware = auth((req) => {
  const { nextUrl } = req
  if (!nextUrl.pathname.startsWith(ROUTES.STUDIO)) return NextResponse.next()
  if (!req.auth) {
    const signInUrl = new URL(ROUTES.AUTH_SIGNIN, nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', nextUrl.href)
    return NextResponse.redirect(signInUrl)
  }
  return NextResponse.next()
})

export const config = {
  matcher: [`${ROUTES.STUDIO}/:path*`],
}
