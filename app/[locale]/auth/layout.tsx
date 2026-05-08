import type { ReactNode } from 'react'
import { Container } from '@/widgets/layout/ui/container'
import type { SupportedLocale } from '@/shared/config/constants'

interface AuthLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function AuthLayout({
  children,
  params,
}: AuthLayoutProps) {
  const { locale } = await params

  return <Container locale={locale as SupportedLocale}>{children}</Container>
}
