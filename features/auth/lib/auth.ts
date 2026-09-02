import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { AUTH_PROVIDER_CONFIG } from '@/features/auth/config/constants'
import { ROUTES } from '@/shared/config/constants'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    GitHub({
      issuer: AUTH_PROVIDER_CONFIG.GITHUB_ISSUER,
    }),
  ],
  pages: {
    signIn: ROUTES.AUTH_SIGNIN,
    error: ROUTES.AUTH_UNAUTHORIZED,
  },
  callbacks: {
    // 허용된 GitHub 사용자만 로그인 허용
    async signIn({ profile, account }) {
      if (account?.provider !== 'github') return false
      const allowed = process.env.ALLOWED_GITHUB_USERNAME
      const login = (profile as Record<string, unknown> | null | undefined)?.[
        'login'
      ] as string | undefined
      if (!allowed) return false
      return login === allowed
    },
    // 미들웨어에서 사용: 인증 필요 경로는 세션 유무로 판정
    async authorized({ auth }) {
      return !!auth
    },
  },
})
