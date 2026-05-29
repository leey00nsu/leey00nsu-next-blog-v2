import { StudioLanding } from '@/widgets/studio-landing/ui/studio-landing'
import { SupportedLocale } from '@/shared/config/constants'

interface StudioPageProps {
  params: Promise<{ locale: string }>
}

export const dynamic = 'force-dynamic'

export default async function StudioPage({ params }: StudioPageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as SupportedLocale

  return <StudioLanding locale={locale} />
}
