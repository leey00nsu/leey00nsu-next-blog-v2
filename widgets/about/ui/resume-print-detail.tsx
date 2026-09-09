import type { About } from '@/entities/about/model/types'
import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'
import type { SupportedLocale } from '@/shared/config/constants'
import { splitResumeContent } from '@/widgets/about/lib/split-resume-content'
import { AboutProfileImage } from '@/widgets/about/ui/about-profile-image'
import { ProjectSection } from '@/widgets/about/ui/project-section'

interface ResumePrintDetailProps {
  about: About
  locale: SupportedLocale
}

export function ResumePrintDetail({ about, locale }: ResumePrintDetailProps) {
  const { introduction, careerAndEducation } = splitResumeContent(about.content)

  return (
    <div className="resume-print-root bg-white text-black">
      <section className="resume-print-introduction">
        <AboutProfileImage />
        <article className="about-profile-content prose prose-lg max-w-none">
          <MdxRenderer content={introduction} />
        </article>
      </section>
      <section className="resume-print-career">
        <article className="about-profile-content prose max-w-none">
          <MdxRenderer content={careerAndEducation} />
        </article>
      </section>
      <section className="resume-print-projects">
        <ProjectSection locale={locale} projectCardLinkVariant="github" />
      </section>
    </div>
  )
}
