import { StudioContainer } from '@/widgets/layout/ui/studio-container'
import type { SupportedLocale } from '@/shared/config/constants'

interface StudioLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function StudioLayout({
  children,
  params,
}: StudioLayoutProps) {
  const { locale } = await params

  return (
    <StudioContainer locale={locale as SupportedLocale}>
      {children}
    </StudioContainer>
  )
}
