import { NextResponse } from 'next/server'
import { requireAuth } from '@/shared/lib/auth/require-auth'
import { LeesFieldProvider } from '@/features/editor/lib/leesfield-provider'

export const runtime = 'nodejs'

interface GenerateImageRequestBody {
  prompt: string
  width?: number
  height?: number
}

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (!authResult.authorized) return authResult.response

  try {
    const body = (await request.json()) as GenerateImageRequestBody
    const { prompt, width, height } = body

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { ok: false, error: '프롬프트가 필요합니다.' },
        { status: 400 },
      )
    }

    const provider = new LeesFieldProvider()
    const results = await provider.generateImage(prompt.trim(), {
      width,
      height,
      imageCount: 1,
    })

    if (results.length === 0) {
      return NextResponse.json(
        { ok: false, error: '이미지 생성에 실패했습니다.' },
        { status: 500 },
      )
    }

    const image = results[0]
    return NextResponse.json({
      ok: true,
      imageUrl: image.url,
      width: image.width,
      height: image.height,
    })
  } catch (error) {
    console.error('Generate image API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
