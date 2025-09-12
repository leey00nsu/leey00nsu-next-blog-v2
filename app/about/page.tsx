import { getAbout } from '@/entities/about/lib/about'
import { AboutDetail } from '@/widgets/about/ui/about-detail'
import { ComingSoon } from '@/shared/ui/coming-soon'

export default async function AboutPage() {
  const about = getAbout()

  if (!about) {
    return (
      <article className="prose prose-lg dark:prose-invert mx-auto">
        <ComingSoon />
      </article>
    )
  }

  return <AboutDetail about={about} />
}
