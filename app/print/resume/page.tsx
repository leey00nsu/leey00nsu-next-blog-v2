import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getAbout } from '@/entities/about/lib/about'
import { ResumePrintDetail } from '@/widgets/about/ui/resume-print-detail'
import { determineSupportedLocale } from '@/shared/lib/locale/determine-supported-locale'

export default async function ResumePrintPage() {
  const store = await cookies()
  const localeCookie = store.get('locale')?.value ?? null
  const locale = determineSupportedLocale([localeCookie])

  const about = getAbout(locale)
  if (!about) {
    notFound()
  }

  return <ResumePrintDetail about={about} locale={locale} />
}
