import Link from 'next/link'
import { FilePenLine, ListChecks } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import {
  ROUTES,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'

interface StudioLandingProps {
  locale: SupportedLocale
}

const STUDIO_LANDING_OPTIONS = [
  {
    translationKey: 'editor',
    href: ROUTES.STUDIO_EDITOR,
    icon: FilePenLine,
  },
  {
    translationKey: 'logs',
    href: ROUTES.STUDIO_LOGS,
    icon: ListChecks,
  },
] as const

export function StudioLanding({ locale }: StudioLandingProps) {
  const t = useTranslations('studio.landing')

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col justify-center px-4 py-12">
      <div className="mb-8 space-y-3">
        <p className="text-muted-foreground text-sm font-medium">
          {t('eyebrow')}
        </p>
        <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
          {t('title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base">
          {t('description')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {STUDIO_LANDING_OPTIONS.map((option) => {
          const Icon = option.icon
          const href = buildLocalizedRoutePath(option.href, locale)

          return (
            <Card key={option.translationKey} className="rounded-lg">
              <CardHeader>
                <div className="bg-muted mb-4 flex size-11 items-center justify-center rounded-md">
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <CardTitle className="text-xl">
                  {t(`${option.translationKey}.title`)}
                </CardTitle>
                <CardDescription>
                  {t(`${option.translationKey}.description`)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {t(`${option.translationKey}.meta`)}
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href={href}>{t(`${option.translationKey}.action`)}</Link>
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </main>
  )
}
