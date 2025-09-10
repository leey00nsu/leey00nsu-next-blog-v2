import { ImageResponse } from 'next/og'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { getPostBySlug } from '@/entities/post/lib/post'
import { SITE } from '@/shared/config/constants'

export const runtime = 'nodejs'

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // 슬러그로 포스트 조회 후 제목 도출
  const post = await getPostBySlug(slug)
  const title = post?.title ?? SITE.NAME

  // 로고를 파일 시스템에서 읽어 data URL로 변환
  const logoData = await readFile(
    join(process.cwd(), 'public', 'logo.png'),
    'base64',
  )
  const logoSrc = `data:image/png;base64,${logoData}`

  // Pretendard 폰트
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
          }}
        >
          {title}
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
