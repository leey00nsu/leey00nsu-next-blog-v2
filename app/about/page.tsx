import { getAbout } from '@/entities/about/lib/about'
import { AboutDetail } from '@/widgets/about/ui/about-detail'

export default async function AboutPage() {
  const about = getAbout()

  if (!about) {
    return (
      <article className="prose prose-lg dark:prose-invert mx-auto">
        <p>준비 중입니다.</p>
      </article>
    )
  }

  return <AboutDetail about={about} />
}
