'use client'

import { Button } from '@/shared/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'

export interface SignInFormProps {
  allowedUsername: string
  callbackUrl: string
}

export function SignInForm({ allowedUsername, callbackUrl }: SignInFormProps) {
  const t = useTranslations('auth.signIn')
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-xl font-semibold">{t('title')}</h1>

      <div className="flex items-center gap-3 rounded-2xl border p-4">
        <Avatar className="size-12">
          <AvatarImage
            alt={`${allowedUsername} avatar`}
            src={`https://github.com/${allowedUsername}.png?size=96`}
          />
          <AvatarFallback aria-label={t('allowedUserAvatar')}>
            {allowedUsername ? allowedUsername[0]?.toUpperCase() : '?'}
          </AvatarFallback>
        </Avatar>
        <div className="text-left">
          <p className="text-muted-foreground text-sm">{t('roleAdmin')}</p>
          <p className="font-medium">{allowedUsername || '—'}</p>
        </div>
      </div>

      <Button
        onClick={() => signIn('github', { redirectTo: callbackUrl })}
        aria-label={t('signInWithGitHub')}
      >
        {t('signInWithGitHub')}
      </Button>
    </div>
  )
}
