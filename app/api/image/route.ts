import { NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { IMAGE, PATHS } from '@/shared/config/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function buildPublicAbsolutePath(rel: string): string {
  const publicDir = path.join(process.cwd(), PATHS.FS.PUBLIC_DIR)
  // 허용: '/public/...' 또는 '/...'
  const stripped = rel.replace(/^\/?public\//, '').replace(/^\//, '')
  // POSIX 정규화로 '..' 제거 시도 후 검사
  const normalized = path.posix.normalize(stripped)
  if (normalized.startsWith('..')) {
    throw new Error('Invalid path')
  }
  const abs = path.join(publicDir, normalized)
  // 디렉터리 탈출 방지
  if (!abs.startsWith(publicDir)) {
    throw new Error('Path traversal detected')
  }
  return abs
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const src = url.searchParams.get('src')
    if (!src) {
      return NextResponse.json({ error: 'src required' }, { status: 400 })
    }

    const widthParam = url.searchParams.get('w')
    const qualityParam = url.searchParams.get('q')

    const width = widthParam ? Number(widthParam) : undefined
    const quality = qualityParam ? Number(qualityParam) : IMAGE.DEFAULT_QUALITY

    const filePath = buildPublicAbsolutePath(src)
    const file = await fs.readFile(filePath)

    const image = sharp(file, { animated: true })
    const metadata = await image.metadata()
    const isGif =
      metadata.format === 'gif' || src.toLowerCase().endsWith('.gif')
    const isAnimated = (metadata.pages ?? 1) > 1

    if (isGif && isAnimated) {
      const resized =
        width && Number.isFinite(width) ? image.resize({ width }) : image
      const out = await resized.webp({ quality }).toBuffer()
      return new NextResponse(new Uint8Array(out), {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': IMAGE.CACHE_CONTROL,
        },
      })
    }

    // GIF이 아니거나 단일 프레임: 원본 반환
    const contentType = metadata.format
      ? `image/${metadata.format}`
      : 'application/octet-stream'
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': IMAGE.CACHE_CONTROL,
      },
    })
  } catch (error) {
    console.error(error)
    return new NextResponse('Bad Request', { status: 400 })
  }
}
