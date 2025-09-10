// 이미지 변환 + 디스크 캐시(WebP) 라우트
import { NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'
import fssync from 'node:fs'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { IMAGE, PATHS } from '@/shared/config/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CACHE_DIR = path.join(process.cwd(), PATHS.FS.IMAGE_CACHE_DIR)

function buildPublicAbsolutePath(rel: string): string {
  const publicDir = path.join(process.cwd(), PATHS.FS.PUBLIC_DIR)
  const stripped = rel.replace(/^\/?public\//, '').replace(/^\//, '')
  const normalized = path.posix.normalize(stripped)
  if (normalized.startsWith('..')) {
    throw new Error('Invalid path')
  }
  const abs = path.join(publicDir, normalized)
  if (!abs.startsWith(publicDir)) {
    throw new Error('Path traversal detected')
  }
  return abs
}

function cacheKey(src: string, width?: number, quality?: number) {
  const raw = `${src}|w=${width ?? ''}|q=${quality ?? ''}`
  return crypto.createHash('sha1').update(raw).digest('hex')
}

async function ensureDir(dir: string) {
  if (!fssync.existsSync(dir)) await fs.mkdir(dir, { recursive: true })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const src = url.searchParams.get('src')
  const w = url.searchParams.get('w')
  const q = url.searchParams.get('q')
  const rawWidth = w ? Number(w) : undefined
  const width =
    rawWidth && Number.isFinite(rawWidth) && rawWidth > 0
      ? Math.floor(rawWidth)
      : undefined
  const rawQuality = q ? Number(q) : IMAGE.DEFAULT_QUALITY
  const quality = Math.max(1, Math.min(100, Math.floor(rawQuality)))

  if (!src) return NextResponse.json({ error: 'src required' }, { status: 400 })

  // 1) 원본 파일 절대경로 구하기 (사용자 코드의 안전 체크 함수 재사용 권장)
  const filePath = buildPublicAbsolutePath(src)
  const stat = await fs.stat(filePath)

  // 2) 캐시 키/경로
  await ensureDir(CACHE_DIR)
  const key = cacheKey(src, width, quality)
  const cachedPath = path.join(CACHE_DIR, `${key}.webp`)

  // 3) 캐시 히트 & 유효성 (원본 mtime 보다 캐시 mtime이 최신이면 히트)
  if (fssync.existsSync(cachedPath)) {
    const cstat = await fs.stat(cachedPath)
    if (cstat.mtimeMs >= stat.mtimeMs) {
      const etag = `"${cstat.size}-${Math.floor(cstat.mtimeMs)}"`
      const ifNoneMatch = req.headers.get('if-none-match')
      if (ifNoneMatch === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: etag,
            'Cache-Control': IMAGE.CACHE_CONTROL,
            'X-Image-Cache': 'HIT',
          },
        })
      }
      const file = await fs.readFile(cachedPath)
      return new NextResponse(new Uint8Array(file), {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': IMAGE.CACHE_CONTROL,
          ETag: etag,
          'X-Image-Cache': 'HIT',
        },
      })
    }
  }

  // 4) 미스 → 변환
  const input = await fs.readFile(filePath)
  const image = sharp(input, { animated: true })
  const meta = await image.metadata()
  const isGif = meta.format === 'gif' || src.toLowerCase().endsWith('.gif')
  const isAnimated = (meta.pages ?? 1) > 1

  // GIF 애니메이션만 변환, 아니면 원본 그대로
  if (isGif && isAnimated) {
    const resized =
      width && Number.isFinite(width) ? image.resize({ width }) : image
    const out = await resized.webp({ quality }).toBuffer()

    // 5) 원자적 저장 (충돌 방지)
    const tmp = `${cachedPath}.tmp-${process.pid}-${Date.now()}`
    await fs.writeFile(tmp, out)
    await fs.rename(tmp, cachedPath)

    const cstat = await fs.stat(cachedPath)
    const etag = `"${cstat.size}-${Math.floor(cstat.mtimeMs)}"`
    return new NextResponse(new Uint8Array(out), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': IMAGE.CACHE_CONTROL,
        ETag: etag,
        'X-Image-Cache': 'MISS',
      },
    })
  } else {
    // 원본 반환 (원본도 ETag/304 지원 가능)
    const etag = `"${stat.size}-${Math.floor(stat.mtimeMs)}"`
    if (req.headers.get('if-none-match') === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': IMAGE.CACHE_CONTROL,
          'X-Image-Cache': 'HIT',
        },
      })
    }
    const file = await fs.readFile(filePath)
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': meta.format
          ? `image/${meta.format}`
          : 'application/octet-stream',
        'Cache-Control': IMAGE.CACHE_CONTROL,
        ETag: etag,
      },
    })
  }
}
