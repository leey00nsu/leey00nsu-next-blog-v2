import type { ImageProps } from 'next/image'

export function toZoomImageSource(src: ImageProps['src']): string {
  if (typeof src === 'string') return src
  if ('src' in src) return src.src
  return src.default.src
}
