import { getAbout } from '@/entities/about/lib/about'
import { AboutDetail } from '@/widgets/about/ui/about-detail'
import { ComingSoon } from '@/shared/ui/coming-soon'
import { getLocale } from 'next-intl/server'
import { SupportedLocale } from '@/shared/config/constants'

export default async function AboutPage() {
  const locale = (await getLocale()) as SupportedLocale
  const about = getAbout(locale)

  if (!about) {
    return (
      <article className="prose prose-lg dark:prose-invert mx-auto">
        <ComingSoon />
      </article>
    )
  }

  return <AboutDetail about={about} locale={locale} />
}
