import { ImageResponse } from 'next/og'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { getProjectBySlug } from '@/entities/project/lib/project'
import { SITE, SupportedLocale } from '@/shared/config/constants'
import { getLocale } from 'next-intl/server'

export const runtime = 'nodejs'

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const locale = (await getLocale()) as SupportedLocale
  const project = await getProjectBySlug(slug, locale)
  const title = project?.title ?? SITE.NAME
  const description = project?.summary ?? SITE.DEFAULT_DESCRIPTION

  const logoData = await readFile(
    join(process.cwd(), 'public', 'logo.webp'),
    'base64',
  )
  const logoSrc = `data:image/png;base64,${logoData}`

  const pretendardSemiBold = await readFile(
    join(process.cwd(), 'public/static', 'Pretendard-SemiBold.otf'),
  )

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          padding: '48px',
        }}
      >
        <img src={logoSrc} height="160" alt="logo" />
        <div
          style={{
            marginTop: 24,
            fontSize: 44,
            fontWeight: 800,
            color: '#0f172a',
            textAlign: 'center',
            lineHeight: 1.2,
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 24,
            fontWeight: 500,
            color: '#0f172a',
            textAlign: 'center',
            lineHeight: 1.2,
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
          }}
        >
          {description}
        </div>
      </div>
    ),
    {
      fonts: [
        {
          name: 'PretendardSemiBold',
          data: pretendardSemiBold,
          style: 'normal',
          weight: 600,
        },
      ],
    },
  )
}
