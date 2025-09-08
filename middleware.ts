import { auth } from '@/features/auth/lib/auth'
import { NextResponse } from 'next/server'

export const middleware = auth((req) => {
  const { nextUrl } = req
  if (!nextUrl.pathname.startsWith('/studio')) return NextResponse.next()
  if (!req.auth) {
    const signInUrl = new URL('/auth/signin', nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', nextUrl.href)
    return NextResponse.redirect(signInUrl)
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/studio/:path*'],
}
