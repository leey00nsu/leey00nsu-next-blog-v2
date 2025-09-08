'use client'

import { Button } from '@/shared/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { signIn } from 'next-auth/react'

export interface SignInFormProps {
  allowedUsername: string
  callbackUrl: string
}

export function SignInForm({ allowedUsername, callbackUrl }: SignInFormProps) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-xl font-semibold">
        스튜디오에 접근하려면 로그인 해주세요
      </h1>

      <div className="flex items-center gap-3 rounded-2xl border p-4">
        <Avatar className="size-12">
          <AvatarImage
            alt={`${allowedUsername} avatar`}
            src={`https://github.com/${allowedUsername}.png?size=96`}
          />
          <AvatarFallback aria-label="허용 사용자 아바타">
            {allowedUsername ? allowedUsername[0]?.toUpperCase() : '?'}
          </AvatarFallback>
        </Avatar>
        <div className="text-left">
          <p className="text-muted-foreground text-sm">현재 인가된 사용자</p>
          <p className="font-medium">{allowedUsername || '—'}</p>
        </div>
      </div>

      <Button
        onClick={() => signIn('github', { redirectTo: callbackUrl })}
        aria-label="GitHub로 로그인"
      >
        GitHub로 로그인
      </Button>
    </main>
  )
}
