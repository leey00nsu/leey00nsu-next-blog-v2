import { ImageResponse } from 'next/og'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { SITE } from '@/shared/config/constants'

export default async function OpenGraphImage() {
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
        }}
      >
        <img src={logoSrc} height="200" alt="logo" />
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: '#0f172a',
          }}
        >
          {SITE.NAME}
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
