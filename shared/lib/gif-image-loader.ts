import type { ImageLoaderProps } from 'next/image'
import { IMAGE } from '@/shared/config/constants'

export function gifImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const q = Number.isFinite(quality as number)
    ? (quality as number)
    : IMAGE.DEFAULT_QUALITY
  const beforeQuery = typeof src === 'string' ? src.split('?')[0] : String(src)
  return `/api/image?src=${encodeURIComponent(beforeQuery)}&w=${width}&q=${q}`
}
