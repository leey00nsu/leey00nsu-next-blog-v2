import type { About } from '@/entities/about/model/types'
import type { SupportedLocale } from '@/shared/config/constants'
import { selectPortfolioCoverContent } from '@/widgets/about/lib/select-portfolio-cover-content'
import { AboutDetail } from '@/widgets/about/ui/about-detail'

interface PortfolioPrintCoverProps {
  about: About
  locale: SupportedLocale
}

export function PortfolioPrintCover({
  about,
  locale,
}: PortfolioPrintCoverProps) {
  return (
    <AboutDetail
      about={{ ...about, content: selectPortfolioCoverContent(about.content) }}
      locale={locale}
      showDownloadButton={false}
      showProjectSection={false}
      enableBlockEntranceAnimation={false}
    />
  )
}
