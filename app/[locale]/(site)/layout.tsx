import { Container } from '@/widgets/layout/ui/container'
import type { SupportedLocale } from '@/shared/config/constants'

interface SiteLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function SiteLayout({
  children,
  params,
}: SiteLayoutProps) {
  const { locale } = await params

  return <Container locale={locale as SupportedLocale}>{children}</Container>
}
