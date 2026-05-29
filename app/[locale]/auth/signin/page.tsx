import { SignInForm } from '@/features/auth/ui/sign-in-form'
import {
  ROUTES,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'

interface SignInPageProps {
  params: Promise<{ locale: string }>
  // Next may pass searchParams as a Promise
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = 'force-dynamic'

export default async function SignInPage({
  params,
  searchParams,
}: SignInPageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as SupportedLocale
  const resolvedSearchParams = (await searchParams) ?? {}
  const allowedUsername = process.env.ALLOWED_GITHUB_USERNAME ?? ''
  const callbackUrlParam = resolvedSearchParams.callbackUrl
  const callbackUrl = Array.isArray(callbackUrlParam)
    ? callbackUrlParam[0]
    : (callbackUrlParam ?? buildLocalizedRoutePath(ROUTES.STUDIO, locale))

  return (
    <SignInForm allowedUsername={allowedUsername} callbackUrl={callbackUrl} />
  )
}
