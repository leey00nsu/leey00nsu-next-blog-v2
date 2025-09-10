import { SignInForm } from '@/features/auth/ui/sign-in-form'
import { ROUTES } from '@/shared/config/constants'

interface SignInPageProps {
  // Next may pass searchParams as a Promise
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = (await searchParams) ?? {}
  const allowedUsername = process.env.ALLOWED_GITHUB_USERNAME ?? ''
  const callbackUrlParam = params['callbackUrl']
  const callbackUrl = Array.isArray(callbackUrlParam)
    ? callbackUrlParam[0]
    : (callbackUrlParam ?? ROUTES.STUDIO)

  return (
    <SignInForm allowedUsername={allowedUsername} callbackUrl={callbackUrl} />
  )
}
